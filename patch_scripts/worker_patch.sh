#!/bin/bash
## fix worker not recognizing native_modules
if [ $(uname) == 'Darwin' ]; then
    sed -i '' 's/require.*"opencv4nodejs.node"/require("..\/native_modules\/opencv4nodejs.node"/g' \
        out/STASYS-darwin-arm64/STASYS.app/Contents/Resources/app/.webpack/renderer/Worker/index.worker.js
fi