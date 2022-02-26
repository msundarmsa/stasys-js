{
	"targets": [{
		"target_name": "opencv4nodejs",
		"defines": [
			"OPENCV4NODEJS_FOUND_LIBRARY_CORE",
			"OPENCV4NODEJS_FOUND_LIBRARY_HIGHGUI",
			"OPENCV4NODEJS_FOUND_LIBRARY_IMGCODECS",
			"OPENCV4NODEJS_FOUND_LIBRARY_IMGPROC",
			"OPENCV4NODEJS_FOUND_LIBRARY_FEATURES2D",
			"OPENCV4NODEJS_FOUND_LIBRARY_VIDEOIO",
		],
		"include_dirs" : [
			"<!@(node opencvDir.js include)",
			"cc",
			"cc/core",
			"<!(node -e \"require('nan')\")",
			"<!(node -e \"require('native-node-utils')\")"
		],
		"library_dirs": [
			"<!@(node opencvDir.js libDir)",
		],
		"libraries": [
			"<!@(node opencvDir.js libs)",
		],
		"sources": [
			"cc/opencv4nodejs.cc",
			"cc/CustomMatAllocator.cc",
			"cc/ExternalMemTracking.cc",
			"cc/core/core.cc",
			"cc/core/coreConstants.cc",
			"cc/core/HistAxes.cc",
			"cc/core/Mat.cc",
			"cc/core/Point.cc",
			"cc/core/Vec.cc",
			"cc/core/Size.cc",
			"cc/core/Rect.cc",
			"cc/core/RotatedRect.cc",
			"cc/core/TermCriteria.cc",
			"cc/imgproc/imgproc.cc",
			"cc/imgproc/imgprocConstants.cc",
			"cc/imgproc/MatImgproc.cc",
			"cc/imgproc/Contour.cc",
			"cc/imgproc/Moments.cc",
			"cc/io/io.cc",
			"cc/io/ioConstants.cc",
			"cc/io/VideoCapture.cc",
			"cc/io/VideoWriter.cc",
			"cc/features2d/features2d.cc",
			"cc/features2d/KeyPoint.cc",
			"cc/features2d/KeyPointMatch.cc",
			"cc/features2d/DescriptorMatch.cc",
			"cc/features2d/BFMatcher.cc",
			"cc/features2d/FeatureDetector.cc",
			"cc/features2d/descriptorMatching.cc",
			"cc/features2d/descriptorMatchingKnn.cc",
			"cc/features2d/detectors/AGASTDetector.cc",
			"cc/features2d/detectors/AKAZEDetector.cc",
			"cc/features2d/detectors/BRISKDetector.cc",
			"cc/features2d/detectors/FASTDetector.cc",
			"cc/features2d/detectors/GFTTDetector.cc",
			"cc/features2d/detectors/KAZEDetector.cc",
			"cc/features2d/detectors/MSERDetector.cc",
			"cc/features2d/detectors/ORBDetector.cc",
			"cc/features2d/detectors/SimpleBlobDetector.cc",
			"cc/features2d/detectors/SimpleBlobDetectorParams.cc",
			"cc/highgui/highgui.cc",
			"cc/highgui/highguiConstants.cc",
		],

		"cflags" : [
			"-std=c++14"
		],
		"cflags!" : [
			"-fno-exceptions"
		],
		"cflags_cc!": [
			"-fno-rtti",
			"-fno-exceptions"
		],
		"ldflags" : [
			"-Wl,-rpath,'$$ORIGIN'"
		],
		"xcode_settings": {
			"OTHER_CFLAGS": [
				"-std=c++14",
				"-stdlib=libc++"
			],
			"GCC_ENABLE_CPP_EXCEPTIONS": "YES",
			"MACOSX_DEPLOYMENT_TARGET": "12.0"
		},

		"conditions": [
			[ "OS==\"win\"", {
				"cflags": [
					"-Wall"
				],
				"defines": [
					"WIN",
					"_HAS_EXCEPTIONS=1"
				],
				"msvs_settings": {
					"VCCLCompilerTool": {
						"ExceptionHandling": "2",
						"RuntimeLibrary": "2"
					}
				}
			}],
	        ["OS==\"mac\"",
	          {
	            "link_settings": {
	              "libraries": [
					"-Wl,-rpath,@loader_path/../../../opencv-build/opencv/build/lib"
	              ],
	            }
	          }
	        ]
		],

		"configurations": {
			"Debug": {
				"cflags": ["--coverage"],
				"ldflags": ["--coverage"]
			},
    }

	}]
}
