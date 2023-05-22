module.exports = function isEmpty(value) {
	if (!value && value !== 0) {
		return true;
	} else if (Array.isArray(value) && value.length === 0) {
		return true;
	} else {
		return false;
	}
};
