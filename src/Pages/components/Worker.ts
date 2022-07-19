const ctx: Worker = self as any;

import * as cv from "opencv-bindings";

// default parameters for detection
const getDefaultParameters = (): cv.SimpleBlobDetectorParams => {
  const params = new cv.SimpleBlobDetectorParams();
  params.minThreshold = 120;
  params.maxThreshold = 150;

  params.filterByArea = true;
  params.minArea = 450;
  params.maxArea = 10000;

  params.filterByCircularity = true;
  params.minCircularity = 0.7;

  params.filterByInertia = true;
  params.minInertiaRatio = 0.85;

  return params;
};

// state variables
let video: cv.VideoCapture | null = null;
const params = getDefaultParameters();
let detector = new cv.SimpleBlobDetector(params);
let threshs: number[] = [params.minThreshold, params.maxThreshold];
let showThreshs = false;
let showCircle = true;
let upDown = true;
let mode = "";
let startTime = 0;
let frameId = 0;

const resetState = () => {
  // reset state vars
  startTime = 0;
  frameId = 0;
  video = null;
};

// process commands from main thread
ctx.onmessage = (event) => {
  console.log(event.data.cmd);
  if (event.data.cmd == "START_CAMERA") {
    if (video != null) {
      // video already started
      return;
    }

    // mode will always be "DISPLAY"
    mode = event.data.mode;
    const fps = 30;
    const cameraId = event.data.cameraId;

    console.log({ mode, threshs, upDown });

    startCamera(cameraId, fps);
  } else if (event.data.cmd == "STOP_CAMERA") {
    if (video) {
      video.release();
    }

    resetState();
    ctx.postMessage({ cmd: "STOPPED_CAMERA" });
  } else if (event.data.cmd == "SET_THRESHS") {
    threshs = event.data.threshs;
    if (threshs) {
      params.minThreshold = threshs[0];
      params.maxThreshold = threshs[1];
    }

    detector = new cv.SimpleBlobDetector(params);
  } else if (event.data.cmd == "SET_SHOW_THRESHS") {
    showThreshs = event.data.showThreshs;
  } else if (event.data.cmd == "SET_SHOW_CIRCLE") {
    showCircle = event.data.showCircle;
  } else if (event.data.cmd == "SET_UPDOWN") {
    upDown = event.data.upDown;
  } else if (event.data.cmd == "GET_PARAMS") {
    ctx.postMessage({
      cmd: "PARAMS",
      threshs,
      upDown,
      showCircle,
      showThreshs,
    });
  }
};

const startCamera = (cameraId: string | number, fps: number) => {
  const intervalMs = 1000 / fps;

  try {
    video = new cv.VideoCapture(cameraId);
  } catch (error) {
    resetState();
    console.log(`Could not open webcam ${cameraId}`);
    ctx.postMessage({ cmd: 'VIDEO_STOPPED', fps: 0 });
    return;
  }

  (function loop() {
    setTimeout(function () {
      if (!video) {
        // video closed
        const fps = frameId / (Date.now() - startTime) * 1000;
        resetState();
        ctx.postMessage({ cmd: 'VIDEO_STOPPED', fps: fps });
        return;
      }

      // grab frame and process
      if (grabFrame(video.read())) {
        // recurse only if grab frame was a success
        loop();
      }
    }, intervalMs);
  })();
};

const grabFrame = (frame: cv.Mat): boolean => {
  if (frame.empty) {
    // video closed
    const fps = frameId / (Date.now() - startTime) * 1000;
    resetState();
    ctx.postMessage({ cmd: 'VIDEO_STOPPED', fps: fps });
    return false;
  }

  const currTime = Date.now();
  if (frameId == 0) {
    startTime = currTime;
  }
  frameId += 1;

  // mode will always be "DISPLAY"
  // process frame
  frame = processDisplay(frame);

  // convert frame to image data
  const matRGBA =
    frame.channels === 1
      ? frame.cvtColor(cv.COLOR_GRAY2RGBA)
      : frame.cvtColor(cv.COLOR_BGR2RGBA);

  // create new ImageData from raw mat data
  const imgData = new ImageData(
    new Uint8ClampedArray(matRGBA.getData()),
    frame.cols,
    frame.rows
  );

  // send image data to main process
  ctx.postMessage({
    cmd: "GRABBED_FRAME",
    frame: imgData,
    height: frame.rows,
    width: frame.cols,
  });

  return true; // continue to next frame
};

// process the frame for displaying video to user
const processDisplay = (frame: cv.Mat): cv.Mat => {
  let grayFrame = frame;
  if (frame.channels == 3) {
    grayFrame = frame.cvtColor(cv.COLOR_BGR2GRAY);
  }

  if (showThreshs && threshs) {
    const threshImg = grayFrame.threshold(threshs[0], 255, cv.THRESH_TOZERO);
    frame = threshImg.threshold(threshs[1], 255, cv.THRESH_TOZERO_INV);
  }

  // convert frame back to BGR for displaying
  if (frame.channels == 1) {
    frame = frame.cvtColor(cv.COLOR_GRAY2BGR);
  }

  if (showCircle) {
    detectCircles(grayFrame).forEach((kp) => {
      frame.drawCircle(kp.pt, kp.size / 2, new cv.Vec3(0, 0, 255), cv.FILLED);
    });
  }

  return frame;
};

// detect circles using detector
const detectCircles = (frame: cv.Mat): cv.KeyPoint[] => {
  // if frame is not grayscale, convert it
  let grayFrame = frame;
  if (grayFrame.channels == 3) {
    grayFrame = grayFrame.cvtColor(cv.COLOR_BGR2GRAY);
  }

  grayFrame = cv.gaussianBlur(grayFrame, new cv.Size(9, 9), 0);
  return detector.detect(grayFrame);
};
