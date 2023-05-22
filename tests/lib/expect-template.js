const { compile } = require('handlebars');
const WorkersHbs = require('../../src/workers-hbs');

module.exports = function (template) {
	return new ExpectTemplate(template);
};

function ExpectTemplate(templateAsString) {
	this.templateAsString = templateAsString;
	this.helpers = {};
	this.partials = {};
	this.decorators = {};
	this.input = {};
	this.message = 'Template' + templateAsString + ' does not evaluate to expected output';
	this.compileOptions = {};
	this.runtimeOptions = {};
}

ExpectTemplate.prototype.useHandlebars = function () {
	this._useHandlebars = true;
	return this;
};

ExpectTemplate.prototype.debug = function () {
	this._debug = true;
	return this;
};

ExpectTemplate.prototype.withInput = function (input) {
	this.input = input;
	return this;
};

ExpectTemplate.prototype.withHelper = function (name, helperFunction) {
	this.helpers[name] = helperFunction;
	return this;
};

ExpectTemplate.prototype.withHelpers = function (helperFunctions) {
	var self = this;
	Object.keys(helperFunctions).forEach(function (name) {
		self.withHelper(name, helperFunctions[name]);
	});
	return this;
};

ExpectTemplate.prototype.withPartial = function (name, partialAsString) {
	this.partials[name] = partialAsString;
	return this;
};

ExpectTemplate.prototype.withPartials = function (partials) {
	var self = this;
	Object.keys(partials).forEach(function (name) {
		self.withPartial(name, partials[name]);
	});
	return this;
};

ExpectTemplate.prototype.withDecorator = function (name, decoratorFunction) {
	this.decorators[name] = decoratorFunction;
	return this;
};

ExpectTemplate.prototype.withDecorators = function (decorators) {
	var self = this;
	Object.keys(decorators).forEach(function (name) {
		self.withDecorator(name, decorators[name]);
	});
	return this;
};

ExpectTemplate.prototype.withCompileOptions = function (compileOptions) {
	this.compileOptions = compileOptions;
	return this;
};

ExpectTemplate.prototype.withRuntimeOptions = function (runtimeOptions) {
	this.runtimeOptions = runtimeOptions;
	return this;
};

ExpectTemplate.prototype.withMessage = function (message) {
	this.message = message;
	return this;
};

ExpectTemplate.prototype.toCompileTo = function (expectedOutputAsString) {
	expect(this._compileAndExecute()).toBe(expectedOutputAsString); //, this.message);
};

// see chai "to.throw" (https://www.chaijs.com/api/bdd/#method_throw)
ExpectTemplate.prototype.toThrow = function (errMsgMatcher) {
	var self = this;
	expect(function () {
		self._compileAndExecute();
	}).toThrow(errMsgMatcher);
};

ExpectTemplate.prototype._compileAndExecute = function () {
	var combinedRuntimeOptions = this._combineRuntimeOptions();

	if (this._useHandlebars) {
		var template = compile(this.templateAsString, this.compileOptions);
		return template(this.input, combinedRuntimeOptions);
		// return Printer(parse(this.templateAsString));
	} else {
		const hbs = new WorkersHbs();
		hbs._debug = this._debug;
		return hbs.render(
			this.templateAsString,
			this.input,
			combinedRuntimeOptions,
			this.compileOptions
		);
	}
};

ExpectTemplate.prototype._combineRuntimeOptions = function () {
	var self = this;
	var combinedRuntimeOptions = {};
	Object.keys(this.runtimeOptions).forEach(function (key) {
		combinedRuntimeOptions[key] = self.runtimeOptions[key];
	});
	combinedRuntimeOptions.helpers = this.helpers;
	combinedRuntimeOptions.partials = this.partials;
	combinedRuntimeOptions.decorators = this.decorators;
	return combinedRuntimeOptions;
};
