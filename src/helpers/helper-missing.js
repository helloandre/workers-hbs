module.exports = function (instance) {
	instance.registerHelper('helperMissing', function (/* [args, ]options */) {
		instance.debug('helperMissing', this, arguments);
		if (arguments.length === 1) {
			// A missing field in a {{foo}} construct.
			return undefined;
		} else {
			// Someone is actually trying to call something, blow up.
			throw new Error('Missing helper: "' + arguments[arguments.length - 1].name + '"');
		}
	});
};
