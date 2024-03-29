module.exports = function extend(obj /** ...rest */) {
	for (let i = 1; i < arguments.length; i++) {
		for (let key in arguments[i]) {
			if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
				obj[key] = arguments[i][key];
			}
		}
	}

	return obj;
};
