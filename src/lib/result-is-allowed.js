module.exports = function (obj, name) {
	// TODO more sanity/safety checks
	return obj && obj.hasOwnProperty(name);
};
