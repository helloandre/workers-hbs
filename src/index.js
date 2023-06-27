const WorkersHbs = require('./workers-hbs');
const Handlebars = require('handlebars');

function render(template, context, runtimeOptions, compileOptions) {
	return new WorkersHbs().render(template, context, runtimeOptions, compileOptions);
}

function compile(template, compileOptions) {
	return new WorkersHbs().compile(template, compileOptions);
}

function precompile(template, precompileOptions) {
	return new WorkersHbs().precompile(template, precompileOptions);
}

module.exports = {
	render,
	compile,
	precompile,
	WorkersHbs,
	Handlebars,
};
