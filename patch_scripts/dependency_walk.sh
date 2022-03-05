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

    LIBS_FOLDER=opencv-bindings/prebuilt-opencv/mac-$APP_TYPE/all_deps

    # delete previous folder if it exists
    rm -rf $LIBS_FOLDER
    mkdir $LIBS_FOLDER

    # copy base opencv libraries
    cp opencv-bindings/prebuilt-opencv/mac-$APP_TYPE/*.dylib $LIBS_FOLDER

    ## recursively find and import dependencies
    sudo python patch_scripts/dependency_walker.py $APP_TYPE $LIBS_FOLDER $BREW_FOLDER
    echo "=> finished dependency walk"
fi
