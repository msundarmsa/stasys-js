const opencvRoot = process.env['OPENCV_ROOT'];
if (opencvRoot == '') {
	throw new Error('OPENCV_ROOT environment variable not set!');
}
console.log(opencvRoot);
