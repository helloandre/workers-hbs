const extend = require('../lib/extend');

module.exports = function (instance) {
	instance.registerDecorator('inline', function (fn, props, container, options) {
		instance.debug('*inine', { fn, props, container, options });
		instance.registerInlinePartial(options.args[0], options.fn);
	});
};
