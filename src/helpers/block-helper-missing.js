module.exports = function (instance) {
	instance.registerHelper('blockHelperMissing', function (context, options) {
		instance.debug('BLOCKHELPERMISSING', this, { context, options });
		let inverse = options.inverse,
			fn = options.fn;

		if (context === true) {
			return fn(this);
		} else if (context === false || context == null) {
			return inverse(this);
		} else if (Array.isArray(context)) {
			if (context.length > 0) {
				return instance.helpers.each(context, options);
			} else {
				return inverse(this);
			}
		} else {
			return fn(context, options);
		}
	});
};
