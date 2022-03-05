#!/bin/bash
if [ $(uname) == 'Darwin' ]; then
    # macos
    BREW_FOLDER=$(dirname $(dirname $(which brew)))
    APP_TYPE=$(arch)
    if [ $APP_TYPE == 'i386' ]; then
        APP_TYPE='x64'
    fi
    echo ""
    echo "=> patching $APP_TYPE app"
    echo "=> homebrew is installed to $BREW_FOLDER"

    APP_FOLDER=out/STASYS-darwin-$APP_TYPE/STASYS.app/Contents
    ## fix worker not recognizing opencv native module
    sed -i '' 's/require.*"opencv4nodejs.node"/require("..\/native_modules\/opencv4nodejs.node"/g' \
        $APP_FOLDER/Resources/app/.webpack/renderer/Worker/index.worker.js

    ## fix errors in dynamic linking for opencv native module
    FRAMEWORK=$APP_FOLDER/Frameworks/OpenCV.framework
    mkdir -p $FRAMEWORK
    for LIB in opencv-bindings/prebuilt-opencv/mac-$APP_TYPE/*.dylib
    do
        LIB_BASENAME=$(basename $LIB)
        LIB_NAME="${LIB_BASENAME%.*}"
        cp $LIB $FRAMEWORK/
        install_name_tool -change "$BREW_FOLDER/opt/opencv/lib/$LIB_NAME.4.5.dylib" \
            "../../../../../Frameworks/OpenCV.framework/$LIB_BASENAME" \
            $APP_FOLDER/Resources/app/.webpack/renderer/native_modules/opencv4nodejs.node
        install_name_tool -change "$BREW_FOLDER/opt/opencv/lib/$LIB_NAME.4.5.dylib" \
            "../../../../../Frameworks/OpenCV.framework/$LIB_BASENAME" \
            $APP_FOLDER/Resources/app/.webpack/main/native_modules/opencv4nodejs.node
        echo "=> patched $LIB_NAME"
    done

    ## recursively find and import dependencies
    sudo python patch_scripts/dependency_walker.py $APP_TYPE $APP_FOLDER $BREW_FOLDER
    echo "=> finished dependency walk"

    echo "=> complete"
else
    # windows
    echo ""
    echo "=> patching win32-x64 app"

    APP_FOLDER=out/STASYS-win32-x64
    ## fix worker not recognizing opencv native module
    sed -i '' 's/require.*"opencv4nodejs.node"/require("..\/native_modules\/opencv4nodejs.node"/g' \
        $APP_FOLDER/resources/app/.webpack/renderer/Worker/index.worker.js

    for LIB in opencv-bindings/prebuilt-opencv/win-intel64/*.dll
    do
        LIB_BASENAME=$(basename $LIB)
        LIB_NAME="${LIB_BASENAME%.*}"
        cp $LIB $APP_FOLDER/
        echo "=> patched $LIB_NAME"
    done
    echo "=> complete"
fi