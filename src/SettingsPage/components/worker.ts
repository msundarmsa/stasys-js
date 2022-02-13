const ctx: Worker = self as any;

import * as cv from 'opencv-bindings';
console.log('OpenCV Version: ' + cv.version.major + '.' + cv.version.minor + '.' + cv.version.revision);

let video: cv.VideoCapture | null = null;
let interval: NodeJS.Timer | null = null;
ctx.onmessage = event => {
    console.log(`Received command: ${event.data.cmd}`);
    if (event.data.cmd == 'START_CAMERA') {
        if (video != null) {
            // video already started
            return;
        }
        // const video = new cv.VideoCapture('/Users/msundarmsa/stasys/300820/1/shot.mp4');
        video = new cv.VideoCapture(event.data.cameraId);
        const fps = 30;
        const intervalMs = 1000 / fps;
        console.log(`Starting frame grabbing...`);
        interval = setInterval(() => {
            if (!video) {
                // video possible closed
                return;
            }

            // grab frame
            const img = video.read();
            // console.log(`grabbed frame`);

            // convert to image data
            const matRGBA = img.channels === 1
                ? img.cvtColor(cv.COLOR_GRAY2RGBA)
                : img.cvtColor(cv.COLOR_BGR2RGBA);

            // create new ImageData from raw mat data
            const imgData = new ImageData(
                new Uint8ClampedArray(matRGBA.getData()),
                    img.cols,
                    img.rows
                );

            // send image data to main process
            ctx.postMessage({ 'cmd': 'GRABBED_FRAME', 'frame': imgData, 'height': img.rows, 'width': img.cols });
        }, intervalMs);
    } else if (event.data.cmd == 'STOP_CAMERA') {
        if (interval) {
            clearInterval(interval);
        }

        if (video) {
            video.release();
            video = null;
        }

        ctx.postMessage({ 'cmd': 'STOPPED_CAMERA' });
    }
};
