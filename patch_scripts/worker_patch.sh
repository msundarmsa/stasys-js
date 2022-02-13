#!/bin/bash
## fix worker not recognizing native_modules 
if [ $(uname) == 'Darwin' ]; then
    sed -i '' 's/r.ab+"opencv4nodejs.node"/"..\/native_modules\/opencv4nodejs.node"/g' \
        out/stasys-js-darwin-arm64/stasys-js.app/Contents/Resources/app/.webpack/renderer/Worker/index.worker.js
fi