// eslint-disable-next-line @typescript-eslint/no-var-requires
const cv = require("opencv-bindings");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Spline = require("cubic-spline");

// sizes in mm
const TARGET_SIZE = 170.0;
const SEVEN_RING_SIZE = 29.75;

// default parameters for detection
const getDefaultParameters = () => {
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
let video = null;
const params = getDefaultParameters();
let detector = new cv.SimpleBlobDetector(params);
let threshs = [params.minThreshold, params.maxThreshold];
let upDown = true;
let preTrace = [];
let mode = "";
let startTime = 0;
let triggerTime = -1;
let shotStarted = false;
let shotStartTime = 0;
let circleDetectedTime = 0;
let beforeTrace = [];
let shotPoint = null;
let afterTrace = [];
let RATIO1 = 1; // px to mm
let calibratePoint = { x: 0, y: 0, r: 0, time: 0 };
let fineAdjust = { x: 0, y: 0, r: 0, time: 0 };
let testTriggers = [];
let frameId = 0;

const resetState = () => {
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
  testTriggers = [];
  frameId = 0;
  video = null;
};

const log = (message) => {
    console.log(`[CameraProcess] ${message}`);
};

// send message to renderer thread
const sendMessage = (message) => {
    if (process.send) {
        process.send(message);
    } else {
        log("ERR: process send null");
    }
};

log("Hello World");
// process commands from renderer thread
process.on('message', (message) => {
  log(message.cmd);
  if (message.cmd == "START_CAMERA") {
    if (video != null) {
      // video already started
      return;
    }

    mode = message.mode;
    const fps = mode == "SHOOT" ? 200 : 30;
    let cameraId = message.cameraId;

    if ('test' in message && message.test) {
      cameraId = message.testVidPath;
      testTriggers = message.testTriggers;
      calibratePoint = message.testCalibratePoint;
      log(`Testing video: ${cameraId}`);
    }

    log(`mode: ${mode}, threshs: ${threshs}, upDown: ${upDown}, RATIO1: ${RATIO1}, calibratePoint: {x: ${calibratePoint.x}, y: ${calibratePoint.y}, r: ${calibratePoint.r}}, fineAdjust: {x: ${fineAdjust.x}, y: ${fineAdjust.y}, r: ${fineAdjust.r}}`);

    startCamera(cameraId, fps);
  } else if (message.cmd == "STOP_CAMERA") {
    if (video) {
      video.release();
    }

    resetState();
    sendMessage({ cmd: "STOPPED_CAMERA" });
  } else if (message.cmd == "TRIGGER") {
    triggerTime = message.time;
  } else if (message.cmd == "SET_THRESHS") {
    threshs = message.threshs;
    if (threshs) {
      params.minThreshold = threshs[0];
      params.maxThreshold = threshs[1];
    }

    detector = new cv.SimpleBlobDetector(params);
  } else if (message.cmd == "SET_UPDOWN") {
    upDown = message.upDown;
  } else if (message.cmd == "SET_CALIBRATE_POINT") {
    calibratePoint = message.calibratePoint;
    RATIO1 = SEVEN_RING_SIZE / calibratePoint.r;
  } else if (message.cmd == "SET_FINE_ADJUST") {
    fineAdjust = message.fineAdjust;
  } else if (message.cmd == "GET_PARAMS") {
    sendMessage({
      cmd: "PARAMS",
      threshs,
      upDown,
    });
  }
});

const startCamera = (cameraId, fps) => {
  const intervalMs = 1000 / fps;

  try {
    video = new cv.VideoCapture(cameraId);
  } catch (error) {
    resetState();
    log(`Could not open webcam ${cameraId}`);
    sendMessage({ cmd: 'VIDEO_STOPPED', fps: 0 });
    return;
  }

  (function loop() {
    setTimeout(function () {
      if (!video) {
        // video closed
        const fps = frameId / (Date.now() - startTime) * 1000;
        resetState();
        sendMessage({ cmd: 'VIDEO_STOPPED', fps: fps });
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

const grabFrame = (frame) => {
  if (frame.empty) {
    // video closed
    const fps = frameId / (Date.now() - startTime) * 1000;
    resetState();
    sendMessage({ cmd: 'VIDEO_STOPPED', fps: fps });
    return false;
  }

  const currTime = Date.now();
  if (frameId == 0) {
    startTime = currTime;
  }
  frameId += 1;
  if (testTriggers.includes(frameId)) {
    triggerTime = currTime;
  }

  if (mode == "CALIBRATE") {
    const keypoints = detectCircles(frame);
    if (keypoints.length != 1) {
      // circle not detected properly
      if (currTime - startTime > 60000) {
        sendMessage({
          cmd: "CALIBRATION_FINISHED",
          success: false,
          errorMsg: "Target was not detecting for 1min",
        });
        return false; // stop grabbing frames
      }

      return true; // continue to next frame
    }

    if (currTime - startTime > 120000) {
      // timeout
      sendMessage({
        cmd: "CALIBRATION_FINISHED",
        success: false,
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
      const currCalibratePoint = calibrate();
      if (currCalibratePoint.r > 0) {
        sendMessage({
          cmd: "CALIBRATION_FINISHED",
          success: true,
        });
        calibratePoint = currCalibratePoint;
        RATIO1 = SEVEN_RING_SIZE / currCalibratePoint.r;
        log(calibratePoint);
      } else {
        sendMessage({
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
        shotPoint = null;
        afterTrace = [];
        sendMessage({ cmd: "CLEAR_TRACE" });
        // delay_read = 1000 / idle_fps;
      } else {
        if (timeSinceShotStart > 60000 && shotPoint == null) {
          // reset trace if shot has started but trigger has not been pulled for 60s
          beforeTrace = [];
          shotPoint = null;
          afterTrace = [];
          sendMessage({ cmd: "CLEAR_TRACE" });

          // but update the start time to the current time
          shotStartTime = currTime;
        } else if (
          shotPoint != null &&
          timeSinceShotStart >= shotPoint.time + 1000
        ) {
          // 1s after trigger is pulled, shot is finished. create new object for this shot
          // and draw the x-t and y-t graph
          sendMessage({
            cmd: "SHOT_FINISHED",
            beforeTrace: beforeTrace,
            afterTrace: afterTrace,
            shotTime: shotPoint.time,
          });

          // reset shot
          shotStarted = false;
          beforeTrace = [];
          shotPoint = null;
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
      const center = {
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
          if (preTrace.length == 0) {
            preTrace = [center];
          } else if (preTrace.length == 1) {
            preTrace = [preTrace[0], center];
          } else {
            preTrace = [preTrace[1], center];
          }

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
          shotPoint = null;
          afterTrace = [];
          preTrace = [];
          sendMessage({ cmd: "CLEAR_TRACE" });

          shotStartTime = currTime;
        }
      } else {
        if (shotPoint == null) {
          if (triggerTime != -1) {
            // trigger has just been pulled
            if (triggerTime > currTime) {
              // trigger was after frame was taken
              // add current position to before trace
              beforeTrace.push(center);
              sendMessage({ cmd: "ADD_BEFORE", center: center });
            } else {
              // trigger was before frame was taken
              // add current position to after trace
              afterTrace.push(center);
              sendMessage({ cmd: "ADD_AFTER", center: center });
            }
            shotPoint = center;
          } else {
            beforeTrace.push(center);
            sendMessage({ cmd: "ADD_BEFORE", center: center });
          }
        } else {
          if (afterTrace.length < 2) {
            afterTrace.push(center);
          } else if (afterTrace.length == 2) {
            afterTrace.push(center);

            const X = [];
            const Y = [];
            const T = [];
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

            const sx = new Spline(T, X);
            const sy = new Spline(T, Y);

            const triggerTimeFromShotStart = triggerTime - shotStartTime;
            const interpX = sx.at(triggerTimeFromShotStart);
            const interpY = sy.at(triggerTimeFromShotStart);

            shotPoint = {
              x: interpX,
              y: interpY,
              r: shotPoint.r,
              time: triggerTimeFromShotStart,
            };

            sendMessage({ cmd: "ADD_BEFORE", center: shotPoint });
            sendMessage({ cmd: "ADD_AFTER", center: shotPoint });
            sendMessage({ cmd: "ADD_SHOT", center: shotPoint });

            triggerTime = -1;
          } else {
            afterTrace.push(center);
            sendMessage({ cmd: "ADD_AFTER", center });
          }
        }
      }
    }
    if (!shotStarted) {
      // eitherways reset triggered value
      // if shot has not been started
      triggerTime = -1;
    }
  }

  return true; // continue to next frame
};

// analyse trace to get calibration circle
const calibrate = () => {
  let calibratePoint = { x: 0, y: 0, r: -1, time: 0 };
  let bestMeanDist = -1;
  let points = [];

  for (let i = beforeTrace.length - 1; i >= 0; i--) {
    const currTP = beforeTrace[i];
    if (points.length == 0) {
      points.push(currTP);
    } else {
      const duration = points[0].time - currTP.time;
      if (duration > 1033 && duration < 1066) {
        // there has been 1s worth of data

        // calculate average position and radius of detected circle in points
        const avgCircle = { x: 0, y: 0, r: 0, time: 0 };
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
const detectCircles = (frame) => {
  // if frame is not grayscale, convert it
  let grayFrame = frame;
  if (grayFrame.channels == 3) {
    grayFrame = grayFrame.cvtColor(cv.COLOR_BGR2GRAY);
  }

  grayFrame = cv.gaussianBlur(grayFrame, new cv.Size(9, 9), 0);
  return detector.detect(grayFrame);
};

const cropFrame = (frame) => {
  // clip 1.75x size of card around aim center
  let width = Math.floor((1.75 * TARGET_SIZE) / RATIO1);
  let height = width;
  let x = calibratePoint.x - width / 2;
  let y = calibratePoint.y - height / 2;

  // clip x, y, width, height to be within the bounds of the frame
  x = x < 0 ? 0 : x;
  y = y < 0 ? 0 : y;
  width = x + width > frame.cols ? frame.cols - x : width;
  height = y + height > frame.rows ? frame.rows - y : height;

  return frame.getRegion(new cv.Rect(x, y, width, height));
};
