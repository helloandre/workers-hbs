const isEmpty = require('../lib/is-empty');

module.exports = function (instance) {
	instance.registerHelper('with', function (context, options) {
		if (arguments.length != 2) {
			throw new Error('#with requires exactly one argument');
		}
		if (typeof context === 'function') {
			context = context.call(this);
		}

		let fn = options.fn;

		if (!isEmpty(context)) {
			let data = options.data;

			return fn(context, {
				data: data,
				blockParams: [context],
			});
		} else {
			return options.inverse(this);
		}
	});
};
