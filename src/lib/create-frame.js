const extend = require('./extend');

module.exports = function createFrame(object) {
	let frame = extend({}, object);
	frame._parent = object;
	return frame;
};
