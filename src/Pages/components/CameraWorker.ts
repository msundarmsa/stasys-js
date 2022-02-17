const ctx: Worker = self as any;

import * as cv from "opencv-bindings";
import { THRESH_TOZERO_INV } from "opencv-bindings";
import { TracePoint } from "../../ShotUtils";

// OpenCV test
console.log(
  "OpenCV Version: " +
    cv.version.major +
    "." +
    cv.version.minor +
    "." +
    cv.version.revision
);

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

  return params
};

// state variables
let video: cv.VideoCapture | null = null;
let threshs: number[] | null = null;
let showThreshs = false;
let detectCircle = false;
const params = getDefaultParameters();
let detector = new cv.SimpleBlobDetector(params);
let mode = "";
let startTime = 0;
let triggerTime = -1;
const trace: TracePoint[] = [];
let testTriggers: number[] = [];
let frameId = 0;

// process commands from main thread
ctx.onmessage = (event) => {
  if (event.data.cmd == "START_CAMERA") {
    if (video != null) {
      // video already started
      return;
    }

    frameId = 0;

    mode = event.data.mode;
    const fps = mode != "DISPLAY" ? 1000 : 30;

    testTriggers = event.data.testTriggers;

    startCamera(event.data.cameraId, fps);
  } else if (event.data.cmd == "STOP_CAMERA") {
    if (video) {
      video.release();
      video = null;
    }

    ctx.postMessage({ cmd: "STOPPED_CAMERA" });
  } else if (event.data.cmd == "TRIGGER") {
    triggerTime = event.data.time;
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
    detectCircle = event.data.showCircle;
  }
};

const startCamera = (cameraId: number, fps: number) => {
  // const intervalMs = 1000 / fps;
  const intervalMs = 1;

  video = new cv.VideoCapture("/Users/msundarmsa/stasys/300820/1/shot.mp4");
  // video = new cv.VideoCapture(cameraId);

  (function loop() {
    setTimeout(function () {
      if (!video) {
        // video closed
        return;
      }

      // grab frame and process
      if (grabFrame(video.read())) {
        // recurse only if grab frame was a success
        loop();
      }
    }, intervalMs);
  })();
}

const grabFrame = (frame: cv.Mat): boolean => {
  const currTime = Date.now();
  if (frameId == 0) {
    startTime = currTime;
  }
  frameId += 1;
  if (testTriggers.includes(frameId)) {
    triggerTime = currTime;
  }

  if (mode == "DISPLAY") {
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
  } else if (mode == "CALIBRATE") {
    const keypoints = detectCircles(frame);
    if (frameId % 100 == 0) {
      const state = {
        time: (currTime - startTime) / 1000,
        frameId: frameId,
        keypoints: keypoints.length,
        triggerTime: triggerTime,
        testTriggers: testTriggers,
        test: testTriggers.includes(frameId)
      }
      console.log(state)
    }
    if (keypoints.length != 1) {
      if (currTime - startTime > 6000) {
        ctx.postMessage({ cmd: 'CALIBRATION_FINISHED', success: 'FAIL', errorMsg: 'Target was not detecting for 1min' });
        return false; // stop grabbing frames
      }

      return true; // continue to next frame
    }

    if (currTime - startTime > 120000) {
      ctx.postMessage({ cmd: 'CALIBRATION_FINISHED', success: 'FAIL', errorMsg: 'Calibrating for more than 2mins' });
      return false; // stop grabbing frames
    }

    trace.push({ x: keypoints[0].pt.x, y: keypoints[0].pt.y, r: keypoints[0].size, time: currTime});

    if (triggerTime != -1) {
      console.log(`Trigger received at ${currTime - startTime}s`);
      // received trigger
      const calibratePoint = calibrate();
      if (calibratePoint.r > 0) {
        ctx.postMessage({ cmd: 'CALIBRATION_FINISHED', success: true, calibratePoint: calibratePoint });
      } else {
        ctx.postMessage({ cmd: 'CALIBRATION_FINISHED', success: false, errorMsg: 'Shot too quickly'});
      }

      triggerTime = -1;
      return false; // stop grabbing frames
    }
  }

  return true; // continue to next frame
};

// process the frame for displaying video to user
const processDisplay = (frame: cv.Mat): cv.Mat => {
  let grayFrame = frame;
  if (frame.channels == 3) {
    grayFrame = frame.cvtColor(cv.COLOR_BGR2GRAY);
  }

  if (showThreshs && threshs) {
    const threshImg = grayFrame.threshold(
      threshs[0],
      255,
      cv.THRESH_TOZERO
    );
    frame = threshImg.threshold(threshs[1], 255, THRESH_TOZERO_INV);
  }

  // convert frame back to BGR for displaying
  if (frame.channels == 1) {
    frame = frame.cvtColor(cv.COLOR_GRAY2BGR);
  }

  if (detectCircle) {
    detectCircles(grayFrame).forEach((kp) => {
      frame.drawCircle(
        kp.pt,
        kp.size / 2,
        new cv.Vec3(0, 0, 255),
        cv.FILLED
      );
    });
  }

  return frame;
}

// analyse trace to get calibration circle
const calibrate = (): TracePoint => {
  let calibratePoint: TracePoint = { x: 0, y: 0, r: -1, time: 0 };
  let bestMeanDist = -1;
  let points: TracePoint[] = [];

  for (let i = trace.length - 1; i >= 0; i--) {
    const currTP = trace[i];
    if (points.length == 0) {
      points.push(currTP);
    } else {
      const duration = points[0].time - currTP.time;
      if ((duration > 1033 && duration < 1066) || (i == trace.length - 1 && duration > 533)) {
          // there has been 1s worth of data
          // or 500ms of data and this is the last data point

          // calculate average position and radius of detected circle in points
          const avgCircle: TracePoint = {x: 0, y: 0, r: 0, time: 0};
          for (let i = 0; i < points.length; i++) {
            avgCircle.x += points[i].x / points.length;
            avgCircle.y += points[i].y / points.length;
            avgCircle.r += points[i].r / points.length;
          }

          // calculate mean distance from points to average position
          let meanDist = 0;
          for (let i = 0; i < points.length; i++) {
            const delX = points[i].x - avgCircle.x;
            const delY = points[i].y - avgCircle.y;
            const dist = Math.sqrt(delX * delX + delY * delY);
            meanDist += dist / points.length;
          }

          if (bestMeanDist == -1 || meanDist < bestMeanDist) {
              bestMeanDist = meanDist;
              calibratePoint = avgCircle;
          }

          points = [];
      } else {
          points.push(currTP);
      }
    }
  }

  return calibratePoint;
}

// detect circles using detector
const detectCircles = (frame: cv.Mat): cv.KeyPoint[] => {
  // if frame is not grayscale, convert it
  let grayFrame = frame;
  if (grayFrame.channels == 3) {
    grayFrame = grayFrame.cvtColor(cv.COLOR_BGR2GRAY);
  }

  grayFrame = cv.gaussianBlur(grayFrame, new cv.Size(9, 9), 0);
  return detector.detect(grayFrame);
}