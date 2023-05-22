module.exports = function equals(a, b, msg) {
	if (a !== b) {
		throw new Error("'" + a + "' should === '" + b + "'" + (msg ? ': ' + msg : ''));
	}
};
