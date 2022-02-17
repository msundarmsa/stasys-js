const ctx: Worker = self as any;

import * as cv from "opencv-bindings";
import { SEVEN_RING_SIZE, TARGET_SIZE, TracePoint } from "../../ShotUtils";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Spline from "cubic-spline";

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

  return params;
};

// state variables
let video: cv.VideoCapture | null = null;
let threshs: number[] | null = null;
let showThreshs = false;
let detectCircle = false;
let upDown = true;
let preTrace: TracePoint[] = [];
const params = getDefaultParameters();
let detector = new cv.SimpleBlobDetector(params);
let mode = "";
let startTime = 0;
let triggerTime = -1;
let shotStarted = false;
let shotStartTime = 0;
let circleDetectedTime = 0;
let beforeTrace: TracePoint[] = [];
let shotPoint: TracePoint | null = null;
let afterTrace: TracePoint[] = [];
let RATIO1 = 1; // px to mm
let calibratePoint: TracePoint = { x: 0, y: 0, r: 0, time: 0 };
let fineAdjust: TracePoint = { x: 0, y: 0, r: 0, time: 0 };
let testTriggers: number[] = [];
let frameId = 0;

// process commands from main thread
ctx.onmessage = (event) => {
  console.log(`Received command: ${event.data.cmd}`);
  if (event.data.cmd == "START_CAMERA") {
    if (video != null) {
      // video already started
      return;
    }

    mode = event.data.mode;
    let fps = mode == "SHOOT" ? 120 : 30;
    let cameraId = event.data.cameraId;

    if (process.env.ELECTRON_ENV == "DEV") {
      fps = mode != "DISPLAY" ? 1000 : 30;
      testTriggers = [312, 1754, 3295, 5116, 6506, 7589, 9914, 11104, 12424, 14422, 15713, 17499, 21796, 23156, 24537, 26312, 27402, 28559, 29944, 31059, 32233, 33654, 34582, 35775, 37593, 38745, 40029, 41795, 43269, 44616];
      cameraId = "/Users/msundarmsa/stasys/300820/1/shot.mp4";
    }

    startCamera(cameraId, fps);
  } else if (event.data.cmd == "STOP_CAMERA") {
    if (video) {
      video.release();
    }

    // reset state vars
    startTime = 0;
    triggerTime = -1;
    shotStarted = false;
    shotStartTime = 0;
    circleDetectedTime = 0;
    preTrace = [];
    beforeTrace = [];
    shotPoint = null;
    afterTrace = [];
    calibratePoint = { x: 0, y: 0, r: 0, time: 0 };
    fineAdjust = { x: 0, y: 0, r: 0, time: 0 };
    testTriggers = [];
    frameId = 0;
    video = null;

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
  } else if (event.data.cmd == "SET_UPDOWN") {
    upDown = event.data.upDown;
  } else if (event.data.cmd == "SET_CALIBRATE_POINT") {
    calibratePoint = event.data.calibratePoint;
    RATIO1 = SEVEN_RING_SIZE / calibratePoint.r;
  } else if (event.data.cmd == "SET_FINE_ADJUST") {
    fineAdjust = event.data.fineAdjust;
  }
};

const startCamera = (cameraId: string | number, fps: number) => {
  const intervalMs = 1000 / fps;

  video = new cv.VideoCapture(cameraId);

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
};

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
    if (keypoints.length != 1) {
      if (currTime - startTime > 6000) {
        ctx.postMessage({
          cmd: "CALIBRATION_FINISHED",
          success: "FAIL",
          errorMsg: "Target was not detecting for 1min",
        });
        return false; // stop grabbing frames
      }

      return true; // continue to next frame
    }

    if (currTime - startTime > 120000) {
      ctx.postMessage({
        cmd: "CALIBRATION_FINISHED",
        success: "FAIL",
        errorMsg: "Calibrating for more than 2mins",
      });
      return false; // stop grabbing frames
    }

    beforeTrace.push({
      x: keypoints[0].pt.x,
      y: keypoints[0].pt.y,
      r: keypoints[0].size,
      time: currTime,
    });

    if (triggerTime != -1) {
      // received trigger
      const calibratePoint = calibrate();
      if (calibratePoint.r > 0) {
        ctx.postMessage({
          cmd: "CALIBRATION_FINISHED",
          success: true,
          calibratePoint: calibratePoint,
        });
      } else {
        ctx.postMessage({
          cmd: "CALIBRATION_FINISHED",
          success: false,
          errorMsg: "Shot too quickly",
        });
      }

      triggerTime = -1;
      return false; // stop grabbing frames
    }
  } else if (mode == "SHOOT") {
    const timeSinceShotStart = currTime - shotStartTime;

    if (shotStarted) {
      // shot has started i.e. the aim has went past the top edge and came back down
      const timeSinceCircleDetected = currTime - circleDetectedTime;
      if (timeSinceCircleDetected > 2000) {
        // reset shot if shot has started but aim is not within the target/cannot be found
        // for 2s
        shotStarted = false;
        beforeTrace = [];
        shotPoint = { x: 0, y: 0, r: 0, time: 0 };
        afterTrace = [];
        ctx.postMessage({ cmd: "CLEAR_TRACE" });
        // delay_read = 1000 / idle_fps;
      } else {
        if (timeSinceShotStart > 60000 && shotPoint == null) {
          // reset trace if shot has started but trigger has not been pulled for 60s
          beforeTrace = [];
          shotPoint = { x: 0, y: 0, r: 0, time: 0 };
          afterTrace = [];
          ctx.postMessage({ cmd: "CLEAR_TRACE" });

          // but update the start time to the current time
          shotStartTime = currTime;
        } else if (
          shotPoint != null &&
          timeSinceShotStart >= shotPoint.time + 1000
        ) {
          // 1s after trigger is pulled, shot is finished. create new object for this shot
          // and draw the x-t and y-t graph
          ctx.postMessage({
            cmd: "SHOT_FINISHED",
            beforeTrace: beforeTrace,
            afterTrace: afterTrace,
          });

          // reset shot
          shotStarted = false;
          beforeTrace = [];
          shotPoint = { x: 0, y: 0, r: 0, time: 0 };
          afterTrace = [];

          // delay_read = 1000 / idle_fps;
        }
      }
    }

    frame = cropFrame(frame);
    const keypoints = detectCircles(frame);
    const detectedCircle = keypoints.length == 1;

    if (detectedCircle) {
      const circle = keypoints[0];
      // ramp up back to 120fps
      // delay_read = 0;

      // aim i.e. black circle was found
      // flip & rotate the x, y to fit camera
      const x = (-circle.pt.y + frame.rows / 2) * RATIO1 + fineAdjust.x;
      const y = (circle.pt.x - frame.cols / 2) * RATIO1 + fineAdjust.y;
      const center: TracePoint = {
        x: x,
        y: y,
        r: circle.size,
        time: currTime - shotStartTime,
      };

      if (
        x >= -TARGET_SIZE / 2 &&
        x <= TARGET_SIZE / 2 &&
        y >= -TARGET_SIZE / 2 &&
        y <= TARGET_SIZE / 2
      ) {
        // aim is found and within the target
        circleDetectedTime = currTime;
      }

      if (!shotStarted) {
        if (upDown) {
          // if up/down detection is enabled, detect aim going up and down
          preTrace.push(center);

          if (preTrace.length == 2) {
            // shot is started if the aim went past the edge (preTrace[0].y > TARGET_SIZE / 2)
            // and came back down after that (preTrace[1].y < TARGET_SIZE / 2)
            shotStarted =
              preTrace[0].y > TARGET_SIZE / 2 &&
              preTrace[1].y < TARGET_SIZE / 2;
          }
        } else {
          // else shot is started from the frame the circle is detected
          shotStarted = true;
        }

        if (shotStarted) {
          // new shot started
          // reset traces
          beforeTrace = [];
          shotPoint = { x: 0, y: 0, r: 0, time: 0 };
          afterTrace = [];
          preTrace = [];
          ctx.postMessage({ cmd: "CLEAR_TRACE" });

          shotStartTime = currTime;
        } else if (upDown) {
          // move pretrace window down
          preTrace.shift();
        }
      } else {
        if (shotPoint == null) {
          if (triggerTime != 0) {
            // trigger has just been pulled
            if (triggerTime > currTime) {
              // trigger was after frame was taken
              // add current position to before trace
              beforeTrace.push(center);
              ctx.postMessage({ cmd: "ADD_BEFORE", center: center });
            } else {
              // trigger was before frame was taken
              // add current position to after trace
              afterTrace.push(center);
            }
          } else {
            beforeTrace.push(center);
            ctx.postMessage({ cmd: "ADD_BEFORE", center: center });
          }

          shotPoint = center;
        } else {
          if (afterTrace.length < 2) {
            afterTrace.push(center);
          } else if (afterTrace.length == 2) {
            afterTrace.push(center);

            const X: number[] = [];
            const Y: number[] = [];
            const T: number[] = [];
            for (let i = beforeTrace.length - 3; i < beforeTrace.length; i++) {
              X.push(beforeTrace[i].x);
              Y.push(beforeTrace[i].y);
              T.push(beforeTrace[i].time);
            }

            for (let i = 0; i < 3; i++) {
              X.push(afterTrace[i].x);
              Y.push(afterTrace[i].y);
              T.push(afterTrace[i].time);
            }

            const sx = new Spline(X, T);
            const sy = new Spline(Y, T);

            const triggerTimeFromShotStart = triggerTime - shotStartTime;
            const interpX = sx.at(triggerTimeFromShotStart);
            const interpY = sy.at(triggerTimeFromShotStart);

            shotPoint = {
              x: interpX,
              y: interpY,
              r: shotPoint.r,
              time: triggerTimeFromShotStart,
            };

            ctx.postMessage({ cmd: "ADD_BEFORE", shotPoint });
            ctx.postMessage({ cmd: "ADD_AFTER", shotPoint });
            ctx.postMessage({ cmd: "ADD_SHOT", shotPoint });

            triggerTime = -1;
          } else {
            afterTrace.push(center);
            ctx.postMessage({ cmd: "ADD_AFTER", center });
          }
        }
      }
    }
    if (!shotStarted) {
      // eitherways reset triggered value
      // if shot has not been started
      triggerTime = 0;
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
    const threshImg = grayFrame.threshold(threshs[0], 255, cv.THRESH_TOZERO);
    frame = threshImg.threshold(threshs[1], 255, cv.THRESH_TOZERO_INV);
  }

  // convert frame back to BGR for displaying
  if (frame.channels == 1) {
    frame = frame.cvtColor(cv.COLOR_GRAY2BGR);
  }

  if (detectCircle) {
    detectCircles(grayFrame).forEach((kp) => {
      frame.drawCircle(kp.pt, kp.size / 2, new cv.Vec3(0, 0, 255), cv.FILLED);
    });
  }

  return frame;
};

// analyse trace to get calibration circle
const calibrate = (): TracePoint => {
  let calibratePoint: TracePoint = { x: 0, y: 0, r: -1, time: 0 };
  let bestMeanDist = -1;
  let points: TracePoint[] = [];

  for (let i = beforeTrace.length - 1; i >= 0; i--) {
    const currTP = beforeTrace[i];
    if (points.length == 0) {
      points.push(currTP);
    } else {
      const duration = points[0].time - currTP.time;
      if (
        (duration > 1033 && duration < 1066) ||
        (i == beforeTrace.length - 1 && duration > 533)
      ) {
        // there has been 1s worth of data
        // or 500ms of data and this is the last data point

        // calculate average position and radius of detected circle in points
        const avgCircle: TracePoint = { x: 0, y: 0, r: 0, time: 0 };
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

const cropFrame = (frame: cv.Mat): cv.Mat => {
  // clip 1.75x size of card around aim center
  let width = (1.75 * TARGET_SIZE) / RATIO1;
  let height = width;
  let x = calibratePoint.x - width / 2;
  let y = calibratePoint.y - height / 2;

  // clip x, y, width, height to be within the bounds of the frame
  x = x < 0 ? 0 : x;
  y = y < 0 ? 0 : y;
  width = x + width > frame.cols ? frame.cols - x : width;
  height = y + height > frame.rows ? frame.rows - y : height;

  const croppedFrame = new cv.Mat(width, height, frame.type);
  for (let i = x; i < x + width; i++) {
    for (let j = y; j < y + height; y++) {
      croppedFrame.set(j - y, i - x, frame.at(j, i));
    }
  }

  return croppedFrame;
};
