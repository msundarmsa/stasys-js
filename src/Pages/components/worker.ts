const ctx: Worker = self as any;

import * as cv from 'opencv-bindings';
import { THRESH_TOZERO_INV } from 'opencv-bindings';
console.log('OpenCV Version: ' + cv.version.major + '.' + cv.version.minor + '.' + cv.version.revision);

let video: cv.VideoCapture | null = null;
let threshs: number[] | null = null;
let showThreshs = false;
let showCircle = false;
let params: cv.SimpleBlobDetectorParams | null = null;
let detector: cv.SimpleBlobDetector | null = null;

ctx.onmessage = event => {
    if (event.data.cmd == 'START_CAMERA') {
        if (video != null) {
            // video already started
            return;
        }
        video = new cv.VideoCapture('/Users/msundarmsa/stasys/300820/1/shot.mp4');
        // video = new cv.VideoCapture(event.data.cameraId);
        const fps = 30;
        const intervalMs = 1000 / fps;

        (function loop(){
            setTimeout(function() {
                // Your logic here
                if (!video) {
                    // video closed
                    return;
                }

                // grab frame
                let frame = video.read();

                let grayFrame: cv.Mat;
                if (frame.channels == 3) {
                    grayFrame = frame.cvtColor(cv.COLOR_BGR2GRAY);
                } else {
                    grayFrame = frame;
                    frame = grayFrame.cvtColor(cv.COLOR_GRAY2BGR);
                }

                if (showThreshs && threshs) {
                    let threshImg = grayFrame.threshold(threshs[0], 255,
                        cv.THRESH_TOZERO);
                    threshImg = threshImg.threshold(threshs[1], 255,
                        THRESH_TOZERO_INV);

                    frame = threshImg;
                }

                if (frame.channels == 1) {
                    frame = frame.cvtColor(cv.COLOR_GRAY2BGR);
                }

                if (showCircle && detector) {
                    grayFrame = cv.gaussianBlur(grayFrame, new cv.Size(9, 9), 0);
                    const keypoints = detector.detect(grayFrame);

                    keypoints.forEach((kp) => {
                        frame.drawCircle(kp.pt, kp.size / 2,
                            new cv.Vec3(0, 0, 255), cv.FILLED);
                    });
                }

                // convert to image data
                const matRGBA = frame.channels === 1
                    ? frame.cvtColor(cv.COLOR_GRAY2RGBA)
                    : frame.cvtColor(cv.COLOR_BGR2RGBA);

                // create new ImageData from raw mat data
                const imgData = new ImageData(
                    new Uint8ClampedArray(matRGBA.getData()),
                        frame.cols,
                        frame.rows
                    );

                // send image data to main process
                ctx.postMessage({ 'cmd': 'GRABBED_FRAME', 'frame': imgData, 
                'height': frame.rows, 'width': frame.cols });

                // recurse
                loop();
           }, intervalMs);
        })();
    } else if (event.data.cmd == 'STOP_CAMERA') {
        if (video) {
            video.release();
            video = null;
        }

        ctx.postMessage({ 'cmd': 'STOPPED_CAMERA' });
    } else if (event.data.cmd == 'SET_THRESHS') {
        threshs = event.data.threshs;

        params = new cv.SimpleBlobDetectorParams();
        if (threshs) {
            params.minThreshold = threshs[0];
            params.maxThreshold = threshs[1];
        }

        params.filterByArea = true;
        params.minArea = 450;
        params.maxArea = 10000;

        params.filterByCircularity = true;
        params.minCircularity = 0.7;

        params.filterByInertia = true;
        params.minInertiaRatio = 0.85;

        detector = new cv.SimpleBlobDetector(params);
    } else if (event.data.cmd == 'SET_SHOW_THRESHS') {
        showThreshs = event.data.showThreshs;
    } else if (event.data.cmd == 'SET_SHOW_CIRCLE') {
        showCircle = event.data.showCircle;
    }
};
