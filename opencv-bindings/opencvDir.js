const dirType = process.argv[2];
let OPENCV_ROOT = __dirname + '/prebuilt-opencv/';
if ('OPENCV_ROOT' in process.env) {
	OPENCV_ROOT = process.env.OPENCV_ROOT;
}

if (dirType == 'include') {
	// include path is same for all OSes
	console.log(OPENCV_ROOT + '/include/');
	process.exit(0);
}

let libDir = "";
if (process.platform == "darwin") {
	// macOS
	if (process.arch == "x64") {
		// intel
		libDir =  OPENCV_ROOT + '/mac-x64/all_deps/';
	} else {
		// m1
		libDir =  OPENCV_ROOT + '/mac-arm64/';
	}
} else {
	// windows
	libDir =  OPENCV_ROOT + '/win-intel64/';
}

if (dirType == 'libDir') {
	console.log(libDir);
	process.exit(0);
}

// dirType is libs
if (process.platform === "darwin") {
	// macOS
	const libs = ["-lopencv_core", "-lopencv_highgui", "-lopencv_imgcodecs",
		"-lopencv_imgproc", "-lopencv_features2d", "-lopencv_videoio",
		"-Wl,-rpath,"];

	// append libDir to last entry
	libs[libs.length - 1] += libDir;
	console.log(libs.join(' '));
} else {
	// windows
	console.log('-lopencv_world455');
}
