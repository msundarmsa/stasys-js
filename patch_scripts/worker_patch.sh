#!/bin/bash
## fix worker not recognizing native_modules 
if [ $(uname) == 'Darwin' ]; then
    sed -i '' 's/require.*"opencv4nodejs.node"/require("..\/native_modules\/opencv4nodejs.node"/g' \
        out/stasys-js-darwin-arm64/stasys-js.app/Contents/Resources/app/.webpack/renderer/CameraWorker/index.worker.js
fi