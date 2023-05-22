const isScopedId = require('./is-scoped-id');

module.exports = function (path) {
	return path.parts.length === 1 && !isScopedId(path) && !path.depth;
};
