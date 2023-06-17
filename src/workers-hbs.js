const Handlebars = require('handlebars');
const resultIsAllowed = require('./lib/result-is-allowed');
const extend = require('./lib/extend');
const isObject = require('./lib/is-object');
const isScopedId = require('./lib/is-scoped-id');
const isHelperExpression = require('./lib/is-helper-expression');
const isSimpleId = require('./lib/is-simple-id');

// helpers
const registerBlockHelperMissing = require('./helpers/block-helper-missing');
const registerHelperMissing = require('./helpers/helper-missing');
const registerEach = require('./helpers/each');
const registerWith = require('./helpers/with');
const registerIf = require('./helpers/if');
const registerLookup = require('./helpers/lookup');
const registerLog = require('./helpers/log');
const registerInline = require('./decorators/inline');

function NOOP() {}

module.exports = WorkersHbs;

const DEFAULTS = {
	compileOptions: {
		blockParams: [],
		knownHelpers: {
			helperMissing: true,
			blockHelperMissing: true,
			each: true,
			if: true,
			unless: true,
			with: true,
			log: true,
			lookup: true,
		},
	},
	runtimeOptions: {
		helpers: {},
		partials: {},
		decorators: {},
	},
};

function WorkersHbs() {
	this.hbs = Handlebars.create();
	this.compileOptions = {};
	this.contextStack = [];
	this.blockParams = [];
	this.partialBlocks = [];
	this.runtimeOptions = {};
	this.helpers = {};
	this.partials = {};
	this.decorators = {};
	this._debug = false;

	// default helpers
	registerBlockHelperMissing(this);
	registerHelperMissing(this);
	registerEach(this);
	registerWith(this);
	registerIf(this);
	registerLookup(this);
	registerLog(this);
	registerInline(this);

	return this;
}

WorkersHbs.prototype = {
	render: function (template, context, runtimeOptions, compileOptions) {
		this.compileOptions = { ...DEFAULTS.compileOptions, ...compileOptions };
		this.runtimeOptions = { ...DEFAULTS.runtimeOptions, ...runtimeOptions };
		this.stack('contextStack', context, { ...runtimeOptions?.data, root: context });

		// to be api compatible with Handlebars
		Object.keys(this.runtimeOptions.helpers || {}).forEach(name =>
			this.registerHelper(name, runtimeOptions.helpers[name])
		);
		Object.keys(runtimeOptions?.partials || {}).forEach(name =>
			this.registerPartial(name, runtimeOptions.partials[name])
		);
		Object.keys(runtimeOptions?.decorators || {}).forEach(name =>
			this.registerDecorator(name, runtimeOptions.decorators[name])
		);

		const ast = this.hbs.parse(template);
		const ret = this.accept(ast);

		// clean up after ourselves in case this instance is reused
		this.unstack('contextStack');
		return ret;
	},

	registerHelper(name, fn) {
		if (isObject(name)) {
			if (fn) {
				throw new Error('Arg not supported with multiple helpers');
			}
			extend(this.helpers, name);
		} else {
			this.helpers[name] = fn;
		}
	},
	unregisterHelper(name) {
		delete this.helpers[name];
	},

	registerDecorator(name, fn) {
		if (isObject(name)) {
			if (fn) {
				throw new Error('Arg not supported with multiple decorators');
			}
			extend(this.decorators, name);
		} else {
			this.decorators[name] = fn;
		}
	},
	unregisterDecorator: function (name) {
		delete this.decorators[name];
	},

	registerPartial: function (name, partial) {
		if (isObject(name)) {
			Object.keys(name).forEach(key => {
				this.registerPartial(key, name[key]);
			});
		} else {
			if (partial === undefined) {
				throw new Error(`Attempting to register a partial called "${name}" as undefined`);
			}
			this.partials[name] = typeof partial === 'function' ? partial : this.hbs.parse(partial);
		}
	},
	unregisterPartial: function (name) {
		delete this.partials[name];
	},
	registerInlinePartial: function (name, partial) {
		this.contextStack[0].partials = extend({}, this.contextStack[0].partials, { [name]: partial });
	},

	// Visitor methods
	Program: function (program) {
		this.debug('Program', program);
		const ret = program.body.map(b => this.accept(b));
		this.debug('Program ret', ret);
		return ret.join('');
	},

	MustacheStatement: function (mustache) {
		this.debug('MustacheStatement', mustache);
		const ret = this.SubExpression(mustache);

		return mustache.escaped && !this.compileOptions.noEscape
			? Handlebars.escapeExpression(ret)
			: ret;
	},

	SubExpression: function (sexpr) {
		transformLiteralToPath(sexpr);
		let type = this.classifySexpr(sexpr);
		this.debug('SubExpression', sexpr, type);

		switch (type) {
			case 'simple':
				return this.simpleSexpr(sexpr);
			case 'helper':
				return this.helperSexpr(sexpr, false);
			case 'ambiguous':
				return this.ambiguousSexpr(sexpr, false);
			default:
				return '';
		}
	},

	ContentStatement: function (content) {
		this.debug('ContentStatement', content);
		if (this.compileOptions.ignoreStandalone && content.original === '\n') {
			return content.original;
		}
		return content.value ?? '';
	},

	BlockStatement: function (block) {
		transformLiteralToPath(block);
		let type = this.classifySexpr(block);
		this.debug('BlockStatement', block, type);

		switch (type) {
			case 'simple':
				return this.simpleSexpr(block, true);
			case 'ambiguous':
				return this.ambiguousSexpr(block, true);
			case 'helper':
				return this.helperSexpr(block, true);
		}
	},

	PartialStatement: function (node) {
		this.debug('PartialStatement', node);
		if (node.name.original === '@partial-block') {
			const partialBlock = this.partialBlocks[0].context;
			this.debug('@partial-block', partialBlock, { level: this.contextStack.length });
			// if we've changed context from when we first rendered the "fallback"
			// then we need to re-render it with the current context
			// there's probably a gooder way to do this
			const now = this.contextStack[0].context;
			const orig = this.contextStack[this.contextStack.length - partialBlock.atLevel].context;
			if (now !== orig) {
				return this.accept(partialBlock.program);
			} else {
				return partialBlock.fallback;
			}
		}

		const partial = this.lookupPartial(node);
		if (!partial) {
			const name =
				node.name.type === 'PathExpression' ? node.name.original : this.accept(node.name);
			throw new Error(`The partial ${name} could not be found`);
		}

		this._stackPartialContext(node);

		if (!this.compileOptions.compat) {
			this.addStackBoundary();
		}

		this.debug('partial', partial);
		const ret =
			typeof partial === 'function' ? partial.apply(null, [this._context()]) : this.accept(partial);

		this.unstack('contextStack');

		return ret;
	},

	PartialBlockStatement: function (node) {
		this.debug('PartialBlockStatement', node);

		this._stackPartialContext(node);
		this.stack('blockParams');

		const fallback = this.accept(node.program);
		this.stack('partialBlocks', {
			fallback,
			program: node.program,
			atLevel: this.contextStack.length,
		});

		if (!this.compileOptions.compat) {
			this.addStackBoundary();
		}

		const partial = this.lookupPartial(node);
		const ret = partial
			? typeof partial === 'function'
				? partial.apply(null, [this._context()])
				: this.accept(partial)
			: fallback;

		this.unstack('contextStack', 'partialBlocks', 'blockParams');

		return ret;
	},

	PathExpression: function (path) {
		const ret = this.lookup(path, true);
		this.debug('PathExpression', path, ret);

		return ret;
	},

	/**
	 * Since these are deprecated, only enough functionality to get decorators/inline
	 * working has been implemented
	 */
	DecoratorBlock: function (block) {
		this.debug('DecoratorBlock', block);

		// we're gonna make a heap load of assumptions here and hardcode the rest
		if (!this.decorators[block.path.original]) {
			throw new Error(`missing decorator ${block.path.original}`);
		}

		// decorators don't return anything
		const args = this._params(block, true);
		const options = args.pop();
		options.args = args;
		this.decorators[block.path.original](() => {}, {}, {}, options);
	},

	Hash(node) {
		this.debug('Hash', node);
		return node.pairs.reduce((acc, pair) => {
			const { key, value } = this.accept(pair);
			acc[key] = value;
			return acc;
		}, {});
	},

	HashPair(pair) {
		this.debug('HashPair', pair);
		return {
			key: pair.key,
			value: this.accept(pair.value),
		};
	},

	NumberLiteral: function (num) {
		return num.value;
	},
	UndefinedLiteral: function () {
		return undefined;
	},
	NullLiteral: function () {
		return null;
	},
	CommentStatement: function () {
		return '';
	},
	BooleanLiteral: function (bool) {
		return bool.value;
	},
	StringLiteral: function (str) {
		return str.value;
	},

	// private methods
	stack: function (type, context, data) {
		this[type].unshift({
			context: context === undefined ? {} : context,
			data: data === undefined ? {} : data,
		});
	},
	unstack: function (...type) {
		type.forEach(type => this[type].shift());
	},
	addStackBoundary: function () {
		this.contextStack[0].boundary = true;
		if (this.blockParams[0] !== undefined) {
			this.blockParams[0].boundary = true;
		}
	},

	accept: function (node) {
		if (node === undefined) {
			return node;
		}

		if (!this[node.type]) {
			throw new Error('Unknown type: ' + node.type, node);
		}

		return this[node.type](node);
	},

	lookup: function (id, neverHelper = false) {
		// TODO idea - cache results for every context
		// will need to reset cache on every context change
		// MAYBE? cache results per-context, so keep around every context?
		// so we'd have a .context .data and .cache in the stack?
		this.debug('lookup', id);

		// PRIORITY
		// 1 isScopedId
		// 2 blockParam (unless in a partial)
		// 3 helper (unless a PathStatement)
		// 4 context

		// 1
		// scopedIds can only be simple (i.e. found in contextStack, not helper or blockParams)
		// even if a helper is defined, but called via scoped, we ignore it
		if (isScopedId(id)) {
			this.debug('scoped');
			// we want the full context, arbitrarily depth'd
			if (id.parts?.length === 0) {
				return this._context(id);
			}

			return findOrUndefined(this._current(id), id.parts);
		}

		// 2
		if (this.blockParams.length) {
			const current = findInStack(this.blockParams, 0, id.parts[0], 'context');

			if (current !== undefined) {
				this.debug('blockparameter');
				return findOrUndefined(current, id.parts);
			}
		}

		// 3
		// for partials we don't want to be so try-hard with looking for helpers first
		if (this.helpers.hasOwnProperty(id.original) && !neverHelper) {
			this.debug('helper');

			// @see helpers.test.js "Unknown helper in knownHelpers only mode should be passed as undefined"
			if (this.compileOptions.knownHelpersOnly && !this.compileOptions.knownHelpers[id.original]) {
				return undefined;
			}
			return this.helpers[id.original];
		}

		// 4
		const ret = findOrUndefined(this._current(id), id.parts);
		this.debug('lookup ret', ret);
		return ret;
	},
	_current: function (id) {
		// .compat allows going up the stack
		return this.compileOptions.compat && (id?.parts || []).length
			? findInStack(this.contextStack, id.depth, id.parts[0], id.data ? 'data' : 'context')
			: this._context(id);
	},
	_context: function (id) {
		if (!id) {
			return this.contextStack[0].context;
		}

		if (hasBoundary(this.contextStack, id.depth)) {
			return {};
		}

		const obj = id.data ? 'data' : 'context';
		return id.depth < this.contextStack.length
			? this.contextStack.slice(id.depth || 0)[0][obj]
			: {};
	},

	classifySexpr(sexpr) {
		const name = sexpr.path.parts[0];
		const isSimple = isSimpleId(sexpr.path);

		const isBlockParam =
			isSimple &&
			findOrUndefined((this.blockParams[0] || {}).context, sexpr.path.parts) !== undefined;

		// a mustache is an eligible helper if:
		// * its id is simple (a single part, not `this` or `..`)
		let isHelper = !isBlockParam && isHelperExpression(sexpr);

		// if a mustache is an eligible helper but not a definite
		// helper, it is ambiguous, and will be resolved in a later
		// pass or at runtime.
		let isEligible = !isBlockParam && (isHelper || isSimple);

		// if ambiguous, we can possibly resolve the ambiguity now
		// An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
		if (isEligible && !isHelper) {
			if (this.compileOptions.knownHelpers[name]) {
				isHelper = true;
			} else if (this.compileOptions.knownHelpersOnly) {
				isEligible = false;
			}
		}

		if (isHelper) {
			return 'helper';
		} else if (isEligible) {
			return 'ambiguous';
		} else {
			return 'simple';
		}
	},

	simpleSexpr: function (sexpr, block) {
		this.debug('simpleSexpr', sexpr);

		const path = this.accept(sexpr.path);
		const context = typeof path === 'function' ? path.apply(this._context()) : path;

		return block ? this._helperMissing(sexpr, true, context) : context;
	},

	ambiguousSexpr: function (sexpr, block) {
		const path = this.lookup(sexpr.path);
		this.debug('ambiguousSexpr', path, this._context());

		if (typeof path === 'function') {
			const context = path.apply(this._context(), this._params(sexpr, block));
			return block && !this.helpers.hasOwnProperty(sexpr.path.parts[0])
				? this._helperMissing(sexpr, block, context)
				: context;
		} else if (path !== undefined) {
			return block ? this._helperMissing(sexpr, block, path) : path;
		}

		return this._helperMissing(sexpr, block);
	},

	helperSexpr: function (sexpr, block) {
		this.debug('helperSexpr', sexpr, { block });

		const helper = this.lookup(sexpr.path);

		if (helper !== undefined) {
			if (typeof helper !== 'function') {
				// the actually comes from the compiler in handlebars, but here we are
				throw new Error(`${sexpr.path.parts[0]} is not a function`);
			}
			return helper.apply(this._context(), this._params(sexpr, block));
		}

		return this._helperMissing(sexpr, block);
	},

	_helperMissing: function (sexpr, block, context) {
		this.debug('_helperMissing', sexpr, { block, context });
		// man, i dunno
		if (this.lookup(sexpr.path) === undefined && this.classifySexpr(sexpr) !== 'simple') {
			// @TODO sometimes this is expected to return?
			const ret = this.helpers.helperMissing.apply(this._context(), this._params(sexpr, false));

			// MAN, I DON'T KNOW
			if (ret !== undefined || sexpr.hash !== undefined) {
				return ret;
			}
		}

		if (block) {
			// the context is not assigned to "this.", but rather passed as the first parameter
			return this.helpers.blockHelperMissing.apply(
				this._context(),
				[context].concat(this._params(sexpr, true))
			);
		}
	},

	_params: function (sexpr, block) {
		this.debug('_params', sexpr, { block });
		return (sexpr.params || [])
			.map(p => this.accept(p))
			.concat({
				lookupProperty: (o, n) => (resultIsAllowed(o, n) ? o[n] : undefined),
				name: sexpr.path.original,
				hash: this.accept(sexpr.hash) || {},
				fn: block ? this._optionsFn(sexpr.program) : undefined,
				inverse: block ? this._optionsFn(sexpr.inverse) : undefined,
				data: {
					root: this.contextStack[this.contextStack.length - 1].context || {},
					...(this.contextStack[0].data || {}),
				},
				// blockParams: [],
				// loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 57 } }
			});
	},

	_optionsFn: function (program) {
		this.debug('_optionsFn', program);
		if (!program) {
			return NOOP;
		}

		return this._execWithContext(program);
	},

	_execWithContext: function (program) {
		const fn = (context, runtimeOptions) => {
			this.debug('_execWithContext', context, runtimeOptions);
			if (context !== undefined) {
				this.stack('contextStack', context, runtimeOptions?.data);
			}
			if (program.blockParams && runtimeOptions?.blockParams) {
				this.stack('blockParams', zip(program.blockParams, runtimeOptions.blockParams));
			}
			const ret = this.accept(program);
			if (context !== undefined) {
				this.unstack('contextStack');
			}
			if (program.blockParams && runtimeOptions?.blockParams) {
				this.unstack('blockParams');
			}
			return ret;
		};
		fn.blockParams = (program.blockParams || []).length;

		return fn;
	},

	lookupPartial: function (node) {
		this.debug('lookupPartial', node);
		const name = node.name.type === 'PathExpression' ? node.name.original : this.accept(node.name);

		// priority
		// 1 context (including parents)
		// 2 global (this.partials)

		// assuming that partials can't use depths?
		const context = findInStack(this.contextStack, 0, name, 'partials');
		this.debug('context', name, context);
		return context ? context[name] : this.partials[name];
	},
	_stackPartialContext: function (node) {
		if (node.params.length > 1) {
			throw new Error(`Unsupported number of partial arguments: ${node.params.length}`);
		}

		const context = node.params.length
			? this.accept(node.params[0])
			: this.compileOptions.explicitPartialContext
			? {}
			: this._context();
		const hash = node.hash ? this.accept(node.hash) : {};

		this.stack(
			'contextStack',
			// yup, this will result in causing strings to be weird, but this tracks with handlebar's behavior
			// @see test Comprehensive › PartialStatement › exists › with custom context › string plus hash
			node.hash === undefined ? context : { ...context, ...hash },
			this.contextStack[0].data
		);

		this.debug('stackPartialContext', this.contextStack[0]);
	},

	debug: function (...args) {
		if (this._debug) {
			console.log.apply(console, args);
		}
	},
};

function transformLiteralToPath(sexpr) {
	if (!sexpr.path.parts) {
		let literal = sexpr.path;
		// Casting to string here to make false and 0 literal values play nicely with the rest
		// of the system.
		sexpr.path = {
			type: 'PathExpression',
			data: false,
			depth: 0,
			parts: [literal.original + ''],
			original: literal.original + '',
			loc: literal.loc,
		};
	}
}

function zip(keys, values) {
	const ret = {};

	keys.forEach((key, idx) => {
		ret[key] = values[idx];
	});

	return ret;
}

function findInStack(stack, startingDepth, name, obj) {
	const slicedStack = stack.slice(startingDepth);

	// if any of the stacks we skipped had a boundary
	if (hasBoundary(stack, startingDepth) && obj !== 'partials') {
		return undefined;
	}

	for (let i = 0; i < slicedStack.length; i++) {
		const data = slicedStack[i][obj];
		if (resultIsAllowed(data, name)) {
			return data;
		}
		// for instance, with partials, we don't want to allow going back up the stack
		// regardless of far up the stack we're attempting to go
		// BUT we want to allow arbitrarily nested partials themselves
		if (slicedStack[i].boundary && obj !== 'partials') {
			return undefined;
		}
	}
}

function findOrUndefined(current, parts) {
	for (let i = 0; i < parts.length; i++) {
		if (resultIsAllowed(current, parts[i])) {
			current = current[parts[i]];
		} else {
			return undefined;
		}
	}

	return current;
}

function hasBoundary(stack, startingDepth) {
	return startingDepth !== 0 && stack.slice(0, startingDepth).some(s => s.boundary);
}
