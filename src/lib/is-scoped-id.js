module.exports = function (path) {
	return /^\.|this\b/.test(path?.original);
};
