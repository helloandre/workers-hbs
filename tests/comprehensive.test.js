const equals = require('./lib/equals');
const expectTemplate = require('./lib/expect-template');

describe('Comprehensive', function () {
	describe('SubExpression', function () {
		describe('ambiguous', function () {
			describe('exists', function () {
				describe('non-function', function () {
					test('string', function () {
						expectTemplate('{{foo}}').withInput({ foo: 'bar' }).toCompileTo('bar');
					});

					test('boolean, true', function () {
						expectTemplate('{{foo}}').withInput({ foo: true }).toCompileTo('true');
					});

					test('boolean, false', function () {
						expectTemplate('{{foo}}').withInput({ foo: false }).toCompileTo('false');
					});

					test('@data', function () {
						expectTemplate('{{@foo}}')
							// .debug()
							// .useHandlebars()
							.withRuntimeOptions({ data: { foo: 'bar' } })
							.toCompileTo('bar');
					});

					test('@data is a function', function () {
						expectTemplate('{{@foo}}')
							// .debug()
							// .useHandlebars()
							.withRuntimeOptions({
								data: {
									foo: function () {
										return 'baz';
									},
								},
							})
							.toCompileTo('baz');
					});
				});

				describe('function', function () {
					test('returns string', function () {
						expectTemplate('{{foo}}')
							.withInput({
								foo: function () {
									return 'bar';
								},
							})
							.toCompileTo('bar');
					});

					test('returns true', function () {
						expectTemplate('{{foo}}')
							.withInput({
								foo: function () {
									return true;
								},
							})
							.toCompileTo('true');
					});

					test('returns false', function () {
						expectTemplate('{{foo}}')
							.withInput({
								foo: function () {
									return false;
								},
							})
							.toCompileTo('false');
					});

					test('returns input context, using this.', function () {
						expectTemplate('{{foo}}')
							.withInput({
								foo: function () {
									return this.bar;
								},
								bar: 'baz',
							})
							.toCompileTo('baz');
					});

					test('exists on input, missingHelper is not called, correct options passed', function () {
						const called = {
							foo: false,
							helperMissing: false,
							blockHelperMissing: false,
						};
						expectTemplate('{{foo}}')
							// .debug()
							// .useHandlebars()
							.withInput({
								fizz: 'buzz',
								bar: 'baz',
								foo: function (options) {
									equals(options.name, 'foo');
									equals(options.data.root.bar, 'baz');
									equals(options.fn, undefined);
									equals(options.inverse, undefined);
									called.foo = true;
									return `${this.fizz} ${this.bar}`;
								},
							})
							.withHelpers({
								helperMissing: function () {
									called.helperMissing = true;
								},
								blockHelperMissing: function () {
									called.blockHelperMissing = true;
								},
							})
							.toCompileTo('buzz baz');

						expect(called.foo).toBe(true);
						expect(called.helperMissing).toBe(false);
						expect(called.blockHelperMissing).toBe(false);
					});
				});

				describe('declared helper', function () {
					test('this contains current context, no arguments', function () {
						expectTemplate('{{foo}}')
							// .debug()
							// .useHandlebars()
							.withInput({ bar: 'baz' })
							.withHelpers({
								foo: function (options) {
									equals(options.name, 'foo');
									equals(options.data.root.bar, 'baz');
									equals(options.fn, undefined);
									equals(options.inverse, undefined);
									return this.bar;
								},
							})
							.toCompileTo('baz');
					});
				});
			});

			describe('missing', function () {
				test('helperMissing to be called', function () {
					const called = {
						helperMissing: false,
						blockHelperMissing: false,
					};
					expectTemplate('{{foo}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							bar: 'baz',
						})
						.withHelpers({
							helperMissing: function (options) {
								equals(options.name, 'foo');
								equals(options.data.root.bar, 'baz');
								equals(options.fn, undefined);
								equals(options.inverse, undefined);
								called.helperMissing = true;
							},
							blockHelperMissing: function () {
								called.blockHelperMissing = true;
							},
						})
						.toCompileTo('');

					expect(called.helperMissing).toBe(true);
					expect(called.blockHelperMissing).toBe(false);
				});

				test('not overridden helperMissing', function () {
					expectTemplate('{{foo}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							bar: 'baz',
						})
						.toCompileTo('');
				});
			});
		});

		describe('helper', function () {
			describe('declared', function () {
				test('this contains current context', function () {
					expectTemplate('{{foo bar}}')
						// .debug()
						// .useHandlebars()
						.withInput({ bar: 'baz' })
						.withHelpers({
							foo: function (context, options) {
								equals(options.name, 'foo');
								equals(options.data.root.bar, 'baz');
								equals(options.fn, undefined);
								equals(options.inverse, undefined);
								return context;
							},
						})
						.toCompileTo('baz');
				});

				test('multiple parameters', function () {
					expectTemplate('{{foo "one" "two"}}')
						// .debug()
						// .useHandlebars()
						.withInput({ bar: 'baz' })
						.withHelpers({
							foo: function (one, two, options) {
								equals(options.name, 'foo');
								equals(options.data.root.bar, 'baz');
								equals(options.fn, undefined);
								equals(options.inverse, undefined);
								return `${one} ${two}`;
							},
						})
						.toCompileTo('one two');
				});

				test('with hash', function () {
					expectTemplate('{{foo one=bar}}')
						// .debug()
						// .useHandlebars()
						.withInput({ bar: 'baz' })
						.withHelpers({
							foo: function (options) {
								return options.hash.one;
							},
						})
						.toCompileTo('baz');
				});

				test('parameter is function', function () {
					expectTemplate('{{foo bar}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							bar: function () {
								return 'baz';
							},
						})
						.withHelpers({
							foo: function (arg, options) {
								equals(options.name, 'foo');
								equals(options.fn, undefined);
								equals(options.inverse, undefined);
								return arg();
							},
						})
						.toCompileTo('baz');
				});
			});

			describe('not declared', function () {
				test('non-function declared, error thrown, no helpers called', function () {
					const called = {
						helperMissing: false,
						blockHelperMissing: false,
					};
					expectTemplate('{{foo fizz one=bar}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							fizz: 'buzz',
							bar: 'baz',
							foo: 'bar',
						})
						.withHelpers({
							helperMissing: function () {
								called.helperMissing = true;
							},
							blockHelperMissing: function () {
								called.blockHelperMissing = true;
							},
						})
						.toThrow(/is not a function$/);

					expect(called.helperMissing).toBe(false);
					expect(called.blockHelperMissing).toBe(false);
				});

				test('helperMissing to be called', function () {
					const called = {
						helperMissing: false,
						blockHelperMissing: false,
					};
					expectTemplate('{{foo bar}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							bar: 'baz',
						})
						.withHelpers({
							helperMissing: function (context, options) {
								equals(context, 'baz');
								equals(options.name, 'foo');
								equals(options.data.root.bar, 'baz');
								equals(options.fn, undefined);
								equals(options.inverse, undefined);
								called.helperMissing = true;
							},
							blockHelperMissing: function () {
								called.blockHelperMissing = true;
							},
						})
						.toCompileTo('');

					expect(called.helperMissing).toBe(true);
					expect(called.blockHelperMissing).toBe(false);
				});

				test('helperMissing to be called, via hash', function () {
					const called = {
						helperMissing: false,
						blockHelperMissing: false,
					};
					expectTemplate('{{foo one=bar}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							bar: 'baz',
						})
						.withHelpers({
							helperMissing: function (options) {
								equals(options.name, 'foo');
								equals(options.data.root.bar, 'baz');
								equals(options.hash.one, 'baz');
								equals(options.fn, undefined);
								equals(options.inverse, undefined);
								called.helperMissing = true;
							},
							blockHelperMissing: function () {
								called.blockHelperMissing = true;
							},
						})
						.toCompileTo('');

					expect(called.helperMissing).toBe(true);
					expect(called.blockHelperMissing).toBe(false);
				});

				test('helperMissing not overridden', function () {
					expectTemplate('{{foo bar}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							bar: 'baz',
						})
						.toThrow('Missing helper: "foo"');
				});

				test('exists in root input, missingHelper is not called', function () {
					const called = {
						foo: false,
						helperMissing: false,
						blockHelperMissing: false,
					};
					expectTemplate('{{foo fizz one=bar}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							fizz: 'buzz',
							bar: 'baz',
							foo: function (arg1, options) {
								called.foo = true;
								return `${arg1} ${options.hash.one}`;
							},
						})
						.withHelpers({
							helperMissing: function () {
								called.helperMissing = true;
							},
							blockHelperMissing: function () {
								called.blockHelperMissing = true;
							},
						})
						.toCompileTo('buzz baz');

					expect(called.foo).toBe(true);
					expect(called.helperMissing).toBe(false);
					expect(called.blockHelperMissing).toBe(false);
				});

				test('exists in nested input, missingHelper not is called', function () {
					const called = {
						helperMissing: false,
					};
					expectTemplate('{{foo.bar "one" one=cat}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							fizz: 'buzz',
							cat: 'dog',
							foo: {
								bar: function (arg1, options) {
									return `${this.fizz} ${arg1} ${options.hash.one}`;
								},
							},
						})
						.withHelpers({
							helperMissing: function () {
								called.helperMissing = true;
							},
						})
						.toCompileTo('buzz one dog');

					expect(called.helperMissing).toBe(false);
				});

				test('scoped with arg, inputFoo is called not helperFoo, helperMissing is not called', function () {
					const called = {
						inputFoo: false,
						helperFoo: false,
						helperMissing: false,
					};
					expectTemplate('{{./foo "one"}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							bar: 'baz',
							foo: function (arg1, options) {
								called.inputFoo = true;
								equals(options.name, './foo');
								equals(options.data.root.bar, 'baz');
								equals(options.fn, undefined);
								equals(options.inverse, undefined);
								return arg1;
							},
						})
						.withHelpers({
							foo: function () {
								called.helperFoo = true;
								return 'baz';
							},
							helperMissing: function () {
								called.helperMissing = true;
							},
						})
						.toCompileTo('one');

					expect(called.inputFoo).toBe(true);
					expect(called.helperFoo).toBe(false);
					expect(called.helperMissing).toBe(false);
				});

				// TODO
				test('scoped with hash, inputFoo is called not helperFoo, helperMissing is not called', function () {
					const called = {
						inputFoo: false,
						helperFoo: false,
						helperMissing: false,
					};
					expectTemplate('{{./foo one=bar}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							bar: 'baz',
							foo: function (options) {
								called.inputFoo = true;
								equals(options.name, './foo');
								equals(options.data.root.bar, 'baz');
								equals(options.fn, undefined);
								equals(options.inverse, undefined);
								return options.hash.one;
							},
						})
						.withHelpers({
							foo: function () {
								called.helperFoo = true;
								return 'bar';
							},
							helperMissing: function () {
								called.helperMissing = true;
							},
						})
						.toCompileTo('baz');

					expect(called.inputFoo).toBe(true);
					expect(called.helperFoo).toBe(false);
					expect(called.helperMissing).toBe(false);
				});

				test('scoped with arg, helperFoo is not called, helperMissing is called', function () {
					const called = {
						helperFoo: false,
						helperMissing: false,
					};
					expectTemplate('{{./foo "one"}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							bar: 'baz',
						})
						.withHelpers({
							foo: function (arg1) {
								called.helperFoo = true;
								return arg1;
							},
							helperMissing: function () {
								called.helperMissing = true;
							},
						})
						.toCompileTo('');

					expect(called.helperFoo).toBe(false);
					expect(called.helperMissing).toBe(true);
				});
			});
		});

		describe('simple', function () {
			describe('exists', function () {
				describe('non-function', function () {
					test('string', function () {
						expectTemplate('{{foo.bar}}')
							// .debug()
							.withInput({ foo: { bar: 'baz' } })
							.toCompileTo('baz');
					});

					test('scoped string', function () {
						expectTemplate('{{./foo.bar}}')
							// .debug()
							.withInput({ foo: { bar: 'baz' } })
							.toCompileTo('baz');
					});
				});

				describe('function', function () {
					test('helperMissing is not called, this. context passed, options is not', function () {
						const called = {
							helperMissing: false,
						};
						expectTemplate('{{foo.bar}}')
							// .debug()
							// .useHandlebars()
							.withInput({
								fizz: 'buzz',
								foo: {
									bar: function (options) {
										equals(options, undefined);
										return this.fizz;
									},
								},
							})
							.withHelpers({
								helperMissing: function () {
									called.helperMissing = true;
								},
							})
							.toCompileTo('buzz');

						expect(called.helperMissing).toBe(false);
					});

					test('scoped, this. context passed, options is not', function () {
						const called = {
							helperMissing: false,
						};
						expectTemplate('{{./foo}}')
							// .debug()
							// .useHandlebars()
							.withInput({
								fizz: 'buzz',
								foo: function (options) {
									equals(options, undefined);
									return this.fizz;
								},
							})
							.withHelpers({
								helperMissing: function () {
									called.helperMissing = true;
								},
							})
							.toCompileTo('buzz');

						expect(called.helperMissing).toBe(false);
					});

					test('scoped, helper of same name is not called', function () {
						const called = {
							inputFoo: false,
							helperFoo: false,
						};
						expectTemplate('{{./foo}}')
							// .debug()
							// .useHandlebars()
							.withInput({
								foo: function () {
									called.inputFoo = true;
									return 'bar';
								},
							})
							.withHelpers({
								foo: function () {
									called.helperFoo = false;
									return 'baz';
								},
							})
							.toCompileTo('bar');

						expect(called.inputFoo).toBe(true);
						expect(called.helperFoo).toBe(false);
					});
				});
			});

			describe('missing', function () {
				test('nested, helperMissing not called', function () {
					const called = {
						helperMissing: false,
					};
					expectTemplate('{{foo.bar}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							fizz: 'buzz',
						})
						.withHelpers({
							helperMissing: function () {
								called.helperMissing = true;
							},
						})
						.toCompileTo('');

					expect(called.helperMissing).toBe(false);
				});

				test('scoped, helperMissing not called', function () {
					const called = {
						helperMissing: false,
					};
					expectTemplate('{{./foo}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							fizz: 'buzz',
						})
						.withHelpers({
							helperMissing: function () {
								called.helperMissing = true;
							},
						})
						.toCompileTo('');

					expect(called.helperMissing).toBe(false);
				});
			});
		});
	});

	describe('BlockExpression', function () {
		describe('non-nested', function () {
			describe('ambigious', function () {
				describe('program', function () {
					describe('declared as helper', function () {
						test('options are passed correctly, no missing helpers are called, return value used', function () {
							const called = {
								helperMissing: false,
								blockHelperMissing: false,
							};
							expectTemplate('{{#foo}}inner {{.}} {{fizz}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									fizz: 'buzz',
								})
								.withHelpers({
									foo: function (options) {
										equals(this.fizz, 'buzz');
										equals(options.name, 'foo');
										equals(options.data.root.fizz, 'buzz');
										equals(Object.keys(options.hash).length, 0);
										equals(typeof options.fn, 'function');
										equals(typeof options.inverse, 'function');
										equals(options.fn.blockParams, 0);
										return 'bar';
									},
									helperMissing: function () {
										called.helperMissing = true;
									},
									blockHelperMissing: function () {
										called.blockHelperMissing = true;
									},
								})
								.toCompileTo('bar');

							expect(called.helperMissing).toBe(false);
							expect(called.blockHelperMissing).toBe(false);
						});

						test('options.fn is rendered correctly', function () {
							const called = {
								helperMissing: false,
								blockHelperMissing: false,
							};
							expectTemplate('{{#foo}}inner {{fizz}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									fizz: 'buzz',
								})
								.withHelpers({
									foo: function (options) {
										return options.fn(this);
									},
									helperMissing: function () {
										called.helperMissing = true;
									},
									blockHelperMissing: function () {
										called.blockHelperMissing = true;
									},
								})
								.toCompileTo('inner buzz');

							expect(called.helperMissing).toBe(false);
							expect(called.blockHelperMissing).toBe(false);
						});

						test('completely different context sent to options.fn', function () {
							const called = {
								helperMissing: false,
								blockHelperMissing: false,
							};
							expectTemplate('{{#foo}}inner {{fizz}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									fizz: 'buzz',
								})
								.withHelpers({
									foo: function (options) {
										return options.fn({ fizz: 'baz' });
									},
									helperMissing: function () {
										called.helperMissing = true;
									},
									blockHelperMissing: function () {
										called.blockHelperMissing = true;
									},
								})
								.toCompileTo('inner baz');

							expect(called.helperMissing).toBe(false);
							expect(called.blockHelperMissing).toBe(false);
						});

						test('both input and helper declared, helper takes precedence', function () {
							const called = {
								inputFoo: false,
								helperFoo: false,
								helperMissing: false,
								blockHelperMissing: false,
							};
							expectTemplate('{{#foo}}inner {{fizz}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									fizz: 'buzz',
									foo: function () {
										called.inputFoo = true;
									},
								})
								.withHelpers({
									foo: function () {
										called.helperFoo = true;
									},
									helperMissing: function () {
										called.helperMissing = true;
									},
									blockHelperMissing: function () {
										called.blockHelperMissing = true;
									},
								})
								.toCompileTo('');

							expect(called.inputFoo).toBe(false);
							expect(called.helperFoo).toBe(true);
							expect(called.helperMissing).toBe(false);
							expect(called.blockHelperMissing).toBe(false);
						});
					});

					describe('declared as input', function () {
						describe('non-function', function () {
							test('string, blockHelperMissing to be called, helperMissing to not be called', function () {
								const called = {
									helperMissing: false,
									blockHelperMissing: false,
								};
								expectTemplate('{{#foo}}inner {{.}}{{/foo}}')
									// .debug()
									// .useHandlebars()
									.withInput({ foo: 'bar' })
									.withHelpers({
										helperMissing: function () {
											called.helperMissing = true;
										},
										blockHelperMissing: function (context, options) {
											equals(this.foo, 'bar');
											equals(context, 'bar');
											equals(options.name, 'foo');
											equals(options.data.root.foo, 'bar');
											equals(Object.keys(options.hash).length, 0);
											equals(typeof options.fn, 'function');
											equals(typeof options.inverse, 'function');
											equals(options.fn.blockParams, 0);
											called.blockHelperMissing = true;
										},
									})
									.toCompileTo('');

								expect(called.helperMissing).toBe(false);
								expect(called.blockHelperMissing).toBe(true);
							});

							test('string', function () {
								expectTemplate('{{#foo}}inner {{.}}{{/foo}}')
									// .debug()
									// .useHandlebars()
									.withInput({ foo: 'bar' })
									.toCompileTo('inner bar');
							});

							test('boolean, true', function () {
								expectTemplate('{{#foo}}inner {{foo}}{{/foo}}')
									// .debug()
									// .useHandlebars()
									.withInput({ foo: true })
									.toCompileTo('inner true');
							});

							test('boolean, false', function () {
								expectTemplate('{{#foo}}inner {{.}}{{/foo}}')
									// .debug()
									// .useHandlebars()
									.withInput({ foo: false })
									.toCompileTo('');
							});

							test('array', function () {
								expectTemplate('{{#foo}}inner {{.}}{{/foo}}')
									// .debug()
									// .useHandlebars()
									.withInput({ foo: ['bar', 'baz'] })
									.toCompileTo('inner barinner baz');
							});
						});

						describe('function', function () {
							test('blockHelperMissing to be called, helperMissing to not be called, options are passed to the function', function () {
								const called = {
									helperMissing: false,
									blockHelperMissing: false,
								};
								expectTemplate('{{#foo}}inner {{.}}{{/foo}}')
									// .debug()
									// .useHandlebars()
									.withInput({
										foo: function (options) {
											equals(typeof this.foo, 'function');
											equals(options.name, 'foo');
											equals(typeof options.data.root.foo, 'function');
											equals(Object.keys(options.hash).length, 0);
											equals(typeof options.fn, 'function');
											equals(typeof options.inverse, 'function');
											equals(options.fn.blockParams, 0);
											return 'bar';
										},
									})
									.withHelpers({
										helperMissing: function () {
											called.helperMissing = true;
										},
										blockHelperMissing: function (context, options) {
											equals(typeof this.foo, 'function');
											equals(context, 'bar');
											equals(options.name, 'foo');
											equals(typeof options.data.root.foo, 'function');
											equals(Object.keys(options.hash).length, 0);
											equals(typeof options.fn, 'function');
											equals(typeof options.inverse, 'function');
											equals(options.fn.blockParams, 0);
											called.blockHelperMissing = true;
										},
									})
									.toCompileTo('');

								expect(called.helperMissing).toBe(false);
								expect(called.blockHelperMissing).toBe(true);
							});

							test('should output double inner if options.fn called', function () {
								expectTemplate('{{#foo}}inner {{.}}{{/foo}}')
									// .debug()
									// .useHandlebars()
									.withInput({
										foo: function (options) {
											return options.fn('bar');
										},
									})
									.toCompileTo('inner inner bar');
							});

							test('should output inner with correct context', function () {
								expectTemplate('{{#foo}}inner {{.}}{{/foo}}')
									// .debug()
									// .useHandlebars()
									.withInput({
										foo: function () {
											return 'bar';
										},
									})
									.toCompileTo('inner bar');
							});
						});
					});

					// we're basically just testing blockHelperMissing
					describe('missing', function () {
						test('helperMissing and blockHelperMissing called', function () {
							const called = {
								helperMissing: false,
								blockHelperMissing: false,
							};
							expectTemplate('{{#foo}}inner {{.}} {{fizz}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									fizz: 'buzz',
								})
								.withHelpers({
									helperMissing: function () {
										called.helperMissing = true;
									},
									blockHelperMissing: function () {
										called.blockHelperMissing = true;
									},
								})
								.toCompileTo('');

							expect(called.helperMissing).toBe(true);
							expect(called.blockHelperMissing).toBe(true);
						});

						test('no overrides', function () {
							expectTemplate('{{#foo}}inner {{fizz}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									fizz: 'buzz',
								})
								.toCompileTo('');
						});

						test('inverse gets rendered', function () {
							expectTemplate('{{#foo}}inner {{fizz}}{{else}}inverse {{fizz}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									fizz: 'buzz',
								})
								.toCompileTo('inverse buzz');
						});
					});
				});

				// we're basically just testing blockHelperMissing
				describe('inverse', function () {
					test('missing', function () {
						expectTemplate('{{^foo}}inner {{bar}}{{/foo}}')
							// .debug()
							// .useHandlebars()
							.withInput({ bar: 'baz' })
							.toCompileTo('inner baz');
					});

					test('via else', function () {
						expectTemplate('{{#foo}}{{else}}inner {{bar}}{{/foo}}')
							// .debug()
							// .useHandlebars()
							.withInput({ bar: 'baz' })
							.toCompileTo('inner baz');
					});

					test('via options.inverse', function () {
						expectTemplate('{{#foo}}{{else}}inner {{bar}}{{/foo}}')
							// .debug()
							// .useHandlebars()
							.withInput({ bar: 'baz' })
							.withHelpers({
								foo: function (options) {
									return options.inverse(this);
								},
							})
							.toCompileTo('inner baz');
					});
				});

				describe('blockParam', function () {
					test('passed correctly', function () {
						expectTemplate('{{#foo as |bar|}}inner {{bar.baz}}{{/foo}}')
							// .debug()
							// .useHandlebars()
							.withInput({
								fizz: 'buzz',
							})
							.withHelpers({
								foo: function (options) {
									equals(options.fn.blockParams, 1);
									return options.fn(this, { blockParams: [{ baz: 'inga' }] });
								},
							})
							.toCompileTo('inner inga');
					});
				});
			});

			describe('helper', function () {
				describe('program', function () {
					describe('declared as helper', function () {
						test('args are passed', function () {
							expectTemplate('{{#foo bar "two"}}inner {{.}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({ bar: 'baz' })
								.withHelpers({
									foo: function (arg1, arg2, options) {
										equals(arg1, 'baz');
										equals(arg2, 'two');
										equals(options.name, 'foo');
										equals(options.data.root.bar, 'baz');
										equals(typeof options.fn, 'function');
										equals(typeof options.inverse, 'function');
										return options.fn(arg1);
									},
								})
								.toCompileTo('inner baz');
						});

						test('passes new @data context', function () {
							expectTemplate('{{#foo bar}}{{@baz}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({ bar: 'baz' })
								.withHelpers({
									foo: function (context, options) {
										return options.fn(context, { data: { baz: 'inga' } });
									},
								})
								.toCompileTo('inga');
						});

						test('whatever string is returned is rendered', function () {
							expectTemplate('{{#foo bar}}inner {{.}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({ bar: 'baz' })
								.withHelpers({
									foo: function () {
										return 'buzz';
									},
								})
								.toCompileTo('buzz');
						});

						test('hash is passed', function () {
							expectTemplate('{{#foo one=bar}}inner {{.}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({ bar: 'baz' })
								.withHelpers({
									foo: function (options) {
										equals(options.hash.one, 'baz');
										return options.fn('buzz');
									},
								})
								.toCompileTo('inner buzz');
						});

						test('both input and helper declared, helper wins', function () {
							const called = {
								inputFoo: false,
								helperFoo: false,
							};
							expectTemplate('{{#foo bar}}inner {{.}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									bar: 'baz',
									foo: function (arg1, options) {
										called.inputFoo = true;
										return 'inputFoo';
									},
								})
								.withHelpers({
									foo: function (arg1, options) {
										called.helperFoo = true;
										return 'helperFoo';
									},
								})
								.toCompileTo('helperFoo');

							expect(called.inputFoo).toBe(false);
							expect(called.helperFoo).toBe(true);
						});
					});

					describe('declared as input', function () {
						test('args are passed, helperMissing is not called, blockHelperMissing is not called', function () {
							const called = {
								helperMissing: false,
								blockHelperMissing: false,
							};
							expectTemplate('{{#foo bar "two"}}inner {{.}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									bar: 'baz',
									foo: function (arg1, arg2, options) {
										equals(arg2, 'two');
										return options.fn(arg1);
									},
								})
								.withHelpers({
									helperMissing: function () {
										called.helperMissing = true;
									},
									blockHelperMissing: function () {
										called.blockHelperMissing = true;
									},
								})
								.toCompileTo('inner baz');

							expect(called.helperMissing).toBe(false);
							expect(called.blockHelperMissing).toBe(false);
						});

						test('hash is passed', function () {
							expectTemplate('{{#foo one=bar}}inner {{.}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									bar: 'baz',
									foo: function (options) {
										equals(options.hash.one, 'baz');
										return options.fn('buzz');
									},
								})
								.toCompileTo('inner buzz');
						});
					});

					describe('missing', function () {
						test('helperMissing and blockHelperMissing called', function () {
							const called = {
								helperMissing: false,
								blockHelperMissing: false,
							};
							expectTemplate('{{#foo "one"}}inner {{.}} {{fizz}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									fizz: 'buzz',
								})
								.withHelpers({
									helperMissing: function () {
										called.helperMissing = true;
									},
									blockHelperMissing: function () {
										called.blockHelperMissing = true;
									},
								})
								.toCompileTo('');

							expect(called.helperMissing).toBe(true);
							expect(called.blockHelperMissing).toBe(true);
						});

						test('helperMissing ONLY called with hash', function () {
							const called = {
								helperMissing: false,
								blockHelperMissing: false,
							};
							expectTemplate('{{#foo one=fizz}}inner {{.}} {{fizz}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									fizz: 'buzz',
								})
								.withHelpers({
									helperMissing: function () {
										called.helperMissing = true;
									},
									blockHelperMissing: function () {
										called.blockHelperMissing = true;
									},
								})
								.toCompileTo('');

							expect(called.helperMissing).toBe(true);
							expect(called.blockHelperMissing).toBe(false);
						});

						test('no overrides', function () {
							expectTemplate('{{#foo "one"}}inner {{fizz}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									fizz: 'buzz',
								})
								.toThrow('Missing helper: "foo"');
						});

						test('argbitrary number of args', function () {
							expectTemplate('{{#foo "one" "two"}}inner {{fizz}}{{else}}inverse {{fizz}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									fizz: 'buzz',
								})
								.toThrow('Missing helper: "foo"');
						});

						// HASH MAKES THINGS WEIRD
						test('with hash', function () {
							expectTemplate('{{#foo one=fizz}}inner {{fizz}}{{else}}inverse {{fizz}}{{/foo}}')
								// .debug()
								// .useHandlebars()
								.withInput({
									fizz: 'buzz',
								})
								.toCompileTo('');
						});

						// BUT NOT HERE?!?
						test('with hash + params', function () {
							expectTemplate(
								'{{#foo "one" "two" one=fizz}}inner {{fizz}}{{else}}inverse {{fizz}}{{/foo}}'
							)
								// .debug()
								// .useHandlebars()
								.withInput({
									fizz: 'buzz',
								})
								.toThrow('Missing helper: "foo"');
						});
					});
				});

				describe('inverse', function () {
					test('missing', function () {
						expectTemplate('{{^foo "one"}}inner {{bar}}{{/foo}}')
							// .debug()
							// .useHandlebars()
							.withInput({ bar: 'baz' })
							.toThrow('Missing helper: "foo"');
					});

					test('via else', function () {
						expectTemplate('{{#foo "one"}}{{else}}inner {{bar}}{{/foo}}')
							// .debug()
							// .useHandlebars()
							.withInput({ bar: 'baz' })
							.toThrow('Missing helper: "foo"');
					});

					test('via options.inverse', function () {
						expectTemplate('{{#foo "one"}}{{else}}inner {{bar}}{{/foo}}')
							// .debug()
							// .useHandlebars()
							.withInput({ bar: 'baz' })
							.withHelpers({
								foo: function (arg1, options) {
									equals(arg1, 'one');
									return options.inverse(this);
								},
							})
							.toCompileTo('inner baz');
					});
				});
			});

			describe('simple', function () {
				describe('function', function () {
					test('scoped, function is called, blockHelperMissing is called, helperMissing is not called', function () {
						const called = {
							inputFoo: false,
							helperMissing: false,
							blockHelperMissing: false,
						};
						expectTemplate('{{#./foo}}inner {{fizz}}{{/./foo}}')
							// .debug()
							// .useHandlebars()
							.withInput({
								fizz: 'buzz',
								foo: function (options) {
									equals(options, undefined);
									called.inputFoo = true;
									return this;
								},
							})
							.withHelpers({
								helperMissing: function () {
									called.helperMissing = true;
								},
								blockHelperMissing: function () {
									called.blockHelperMissing = true;
								},
							})
							.toCompileTo('');

						expect(called.inputFoo).toBe(true);
						expect(called.helperMissing).toBe(false);
						expect(called.blockHelperMissing).toBe(true);
					});

					test('scoped, function return is used as new context', function () {
						expectTemplate('{{#./foo}}inner {{fizz}}{{/./foo}}')
							// .debug()
							// .useHandlebars()
							.withInput({
								fizz: 'buzz',
								foo: function (options) {
									equals(options, undefined);
									return { fizz: 'bar' };
								},
							})
							.toCompileTo('inner bar');
					});

					test('nested, function return is used as new context', function () {
						expectTemplate('{{#foo.bar}}inner {{fizz}}{{/foo.bar}}')
							// .debug()
							// .useHandlebars()
							.withInput({
								fizz: 'buzz',
								foo: {
									bar: function (options) {
										equals(options, undefined);
										return this;
									},
								},
							})
							.toCompileTo('inner buzz');
					});
				});

				describe('non-function', function () {
					test('string', function () {
						expectTemplate('{{#foo.bar}}inner {{.}}{{/foo.bar}}')
							// .debug()
							// .useHandlebars()
							.withInput({ foo: { bar: 'baz' } })
							.toCompileTo('inner baz');
					});

					test('boolean true, root context passed', function () {
						expectTemplate('{{#foo.bar}}inner {{foo.bar}}{{/foo.bar}}')
							// .debug()
							// .useHandlebars()
							.withInput({ foo: { bar: true } })
							.toCompileTo('inner true');
					});

					test('boolean false inverse rendered', function () {
						expectTemplate('{{#foo.bar}}inner {{foo.bar}}{{else}}inverse {{foo.bar}}{{/foo.bar}}')
							// .debug()
							// .useHandlebars()
							.withInput({ foo: { bar: false } })
							.toCompileTo('inverse false');
					});
				});

				describe('missing', function () {
					test('blockHelperMissing called, helperMissing not called', function () {
						const called = {
							helperMissing: false,
							blockHelperMissing: false,
						};
						expectTemplate('{{#foo.bar}}inner {{.}} {{fizz}}{{/foo.bar}}')
							// .debug()
							// .useHandlebars()
							.withInput({
								fizz: 'buzz',
							})
							.withHelpers({
								helperMissing: function () {
									called.helperMissing = true;
								},
								blockHelperMissing: function () {
									called.blockHelperMissing = true;
								},
							})
							.toCompileTo('');

						expect(called.helperMissing).toBe(false);
						expect(called.blockHelperMissing).toBe(true);
					});

					test('no overrides', function () {
						expectTemplate('{{#foo.bar}}inner {{fizz}}{{/foo.bar}}')
							// .debug()
							// .useHandlebars()
							.withInput({
								fizz: 'buzz',
							})
							.toCompileTo('');
					});

					test('inverse gets rendered', function () {
						expectTemplate('{{#foo.bar}}inner {{fizz}}{{else}}inverse {{fizz}}{{/foo.bar}}')
							// .debug()
							// .useHandlebars()
							.withInput({
								fizz: 'buzz',
							})
							.toCompileTo('inverse buzz');
					});
				});
			});
		});

		describe('nested', function () {
			describe('ambiguous', function () {
				test('string, blockHelperMissing to be called, helperMissing to not be called all with correct context', function () {
					const called = {
						helperMissing: false,
						blockHelperMissing: false,
					};
					expectTemplate('{{#with foo}}{{#bar}}inner {{baz}}{{/bar}}{{/with}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							foo: {
								baz: 'inga',
								bar: function (options) {
									equals(this.foo, undefined);
									equals(this.baz, 'inga');
									equals(options.name, 'bar');
									equals(typeof options.data.root.foo.bar, 'function');
									equals(Object.keys(options.hash).length, 0);
									equals(typeof options.fn, 'function');
									equals(typeof options.inverse, 'function');
									equals(options.fn.blockParams, 0);
									return 'bar';
								},
							},
						})
						.withHelpers({
							helperMissing: function () {
								called.helperMissing = true;
							},
							blockHelperMissing: function (context, options) {
								equals(this.foo, undefined);
								equals(this.baz, 'inga');
								equals(options.name, 'bar');
								equals(typeof options.data.root.foo.bar, 'function');
								equals(Object.keys(options.hash).length, 0);
								equals(typeof options.fn, 'function');
								equals(typeof options.inverse, 'function');
								equals(options.fn.blockParams, 0);
								called.blockHelperMissing = true;
							},
						})
						.toCompileTo('');

					expect(called.helperMissing).toBe(false);
					expect(called.blockHelperMissing).toBe(true);
				});

				test('string, with correct context', function () {
					expectTemplate('{{#with foo}}{{#bar}}inner {{baz}}{{/bar}}{{/with}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							foo: {
								baz: 'inga',
								bar: function (options) {
									equals(this.foo, undefined);
									equals(this.baz, 'inga');
									equals(options.name, 'bar');
									equals(typeof options.data.root.foo.bar, 'function');
									equals(Object.keys(options.hash).length, 0);
									equals(typeof options.fn, 'function');
									equals(typeof options.inverse, 'function');
									equals(options.fn.blockParams, 0);
									return { baz: 'buzz' };
								},
							},
						})
						.toCompileTo('inner buzz');
				});

				test('parent context (..) works correctly', function () {
					expectTemplate(
						'{{#with newContext}}{{#foo one=..}}inner {{one.bar}}{{bar}}{{/foo}}{{/with}}'
					)
						// .debug()
						// .useHandlebars()
						.withInput({
							bar: 'baz',
							newContext: {
								bar: 'inga',
							},
						})
						.withHelpers({
							foo: function (options) {
								equals(options.hash.one.bar, 'baz');
								return options.fn({ ...this, ...options.hash });
							},
						})
						.toCompileTo('inner bazinga');
				});
			});
		});
	});

	describe('PartialStatement', function () {
		describe('missing', function () {
			test('not registered', function () {
				expectTemplate('{{> foo }}')
					// .debug()
					// .useHandlebars()
					.toThrow('The partial foo could not be found');
			});

			test('unknown', function () {
				expectTemplate('{{> (lookup . "foo") }}')
					// .debug()
					// .useHandlebars()
					.withInput({ foo: 'bar' })
					.withPartials({
						fizz: 'baz',
					})
					.toThrow('The partial bar could not be found');
			});
		});

		describe('exists', function () {
			describe('without context', function () {
				test('referred to directly', function () {
					expectTemplate('{{> foo }}')
						// .debug()
						// .useHandlebars()
						.withPartials({
							foo: 'baz',
						})
						.toCompileTo('baz');
				});

				test('referenced by subexpression, string', function () {
					expectTemplate('{{> (foo) }}')
						// .debug()
						// .useHandlebars()
						.withInput({ foo: 'bar' })
						.withPartials({
							bar: 'baz',
						})
						.toThrow(/is not a function$/);
				});

				test('referenced by subexpression, string via lookup', function () {
					expectTemplate('{{> (lookup . "foo") }}')
						// .debug()
						// .useHandlebars()
						.withInput({ foo: 'bar' })
						.withPartials({
							bar: 'baz',
						})
						.toCompileTo('baz');
				});

				test('referenced by subexpression, function', function () {
					expectTemplate('{{> (foo) }}')
						// .debug()
						// .useHandlebars()
						.withInput({
							foo: function () {
								return 'bar';
							},
						})
						.withPartials({
							bar: 'baz',
						})
						.toCompileTo('baz');
				});

				test('uses correct context', function () {
					expectTemplate('{{> foo }}')
						// .debug()
						// .useHandlebars()
						.withInput({
							fizz: 'buzz',
						})
						.withPartials({
							foo: '{{fizz}}',
						})
						.toCompileTo('buzz');
				});

				test('additional runtimeOptions.data preserved from parent block', function () {
					expectTemplate('{{#outside}}{{#inside}}{{> foo }}{{/inside}}{{/outside}}')
						// .debug()
						// .useHandlebars()
						.withRuntimeOptions({
							data: {
								bar: 'baz',
							},
						})
						.withHelpers({
							outside: function (options) {
								const data = { bar: 'inga' };
								return options.fn(this, { data });
							},
							inside: function (options) {
								return options.fn(this, { data: options.data });
							},
						})
						.withPartials({
							foo: '{{@bar}}',
						})
						.toCompileTo('inga');
				});
			});

			describe('with custom context', function () {
				it('string', function () {
					expectTemplate('{{> foo "bar"}}')
						// .debug()
						// .useHandlebars()
						.withPartial('foo', '{{.}}')
						.toCompileTo('bar');
				});

				it('string plus hash', function () {
					expectTemplate('{{> foo "bar" baz="inga"}}')
						// .debug()
						// .useHandlebars()
						.withPartial('foo', '{{.}}{{baz}}')
						// lol
						.toCompileTo('[object Object]inga');
				});

				test('passes on new context, completely nukes context stack', function () {
					expectTemplate('{{> foo ./newContext}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							fizz: 'buzz',
							newContext: {
								fizz: 'inga',
							},
						})
						.withPartials({
							foo: '{{fizz}}{{../fizz}}',
						})
						.toCompileTo('inga');
				});

				test('passes on new context, but @data stays the same', function () {
					expectTemplate('{{> foo ./newContext}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							fizz: 'buzz',
							newContext: {
								fizz: 'inga',
							},
						})
						.withRuntimeOptions({
							data: {
								bar: 'baz',
							},
						})
						.withPartials({
							foo: '{{fizz}}{{@bar}}',
						})
						.toCompileTo('ingabaz');
				});

				test('new context can never be a helper', function () {
					expectTemplate('{{> foo ./newContext}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							fizz: 'buzz',
							newContext: {
								fizz: 'inga',
							},
						})
						.withHelpers({
							newContext: function () {
								return 'baz';
							},
						})
						.withPartials({
							foo: '{{fizz}}',
						})
						.toCompileTo('inga');
				});

				test('inside a block gets the correct context, cannot pass boundary', function () {
					expectTemplate('{{#with newContext}}{{> foo }}{{/with}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							fizz: 'buzz',
							newContext: {
								fizz: 'inga',
							},
						})
						.withHelpers({
							newContext: function () {
								return 'baz';
							},
						})
						.withPartials({
							foo: '{{fizz}}{{../fizz}}',
						})
						.toCompileTo('inga');
				});

				test('can use a helper, helper gets correct context', function () {
					expectTemplate('{{> foo newContext }}')
						// .debug()
						// .useHandlebars()
						.withInput({
							fizz: 'buzz',
							newContext: {
								fizz: 'inga',
							},
						})
						.withHelpers({
							bar: function () {
								return this.fizz;
							},
						})
						.withPartials({
							foo: '{{bar}}',
						})
						.toCompileTo('inga');
				});

				test('hash parameter', function () {
					expectTemplate('{{> foo newContext one=fizz}}')
						// .debug()
						// .useHandlebars()
						.withInput({
							fizz: 'buzz',
							newContext: {
								fizz: 'inga',
							},
						})
						.withPartials({
							foo: '{{one}}{{fizz}}',
						})
						.toCompileTo('buzzinga');
				});
			});
		});
	});

	describe('PartialBlockStatement', function () {
		describe('exists', function () {
			test('non-default rendered', function () {
				expectTemplate('{{#> foo }}default{{/foo}}')
					// .debug()
					// .useHandlebars()
					.withPartials({
						foo: 'bar',
					})
					.toCompileTo('bar');
			});

			test('correct context passed', function () {
				expectTemplate('{{#> foo }}default{{/foo}}')
					// .debug()
					// .useHandlebars()
					.withInput({
						fizz: 'buzz',
					})
					.withPartials({
						foo: '{{fizz}}',
					})
					.toCompileTo('buzz');
			});

			test('hash parameter', function () {
				expectTemplate('{{#> foo newContext one=fizz}}{{fizz}}{{/foo}}')
					// .debug()
					// .useHandlebars()
					.withInput({
						fizz: 'buzz',
						newContext: {
							fizz: 'inga',
						},
					})
					.withPartials({
						foo: '{{one}}{{fizz}}',
					})
					.toCompileTo('buzzinga');
			});

			test('can be a function, passed correct options', function () {
				expectTemplate('{{#> foo }}default{{/foo}}')
					// .debug()
					// .useHandlebars()
					.withInput({
						fizz: 'buzz',
					})
					.withPartials({
						foo: function (context, options) {
							// also i have no idea what "this." should be
							// options should equal:
							// {
							// 	name: 'foo',
							// 	fn: [Function: prog] { program: 1, depth: 0, blockParams: 0 },
							// 	inverse: [Function: noop],
							// 	data: {
							// 		root: { fizz: 'buzz' },
							// 		_parent: { root: [Object] },
							// 		'partial-block': [Function: partialBlockWrapper]
							// 	},
							// 	helpers: {
							// 		each: [Function: wrapper],
							// 		if: [Function: wrapper],
							// 		unless: [Function: wrapper],
							// 		log: [Function: wrapper],
							// 		lookup: [Function: wrapper],
							// 		with: [Function: wrapper]
							// 	},
							// 	partials: { foo: [Function: foo] },
							// 	decorators: { inline: [Function (anonymous)] },
							// 	hooks: {
							// 		helperMissing: [Function: wrapper],
							// 		blockHelperMissing: [Function: wrapper]
							// 	},
							// 	protoAccessControl: {
							// 		properties: { whitelist: [Object: null prototype], defaultValue: undefined },
							// 		methods: { whitelist: [Object: null prototype], defaultValue: undefined }
							// 	},
							// 	partial: true
							// }
							// don't need this yet, so not implementing
							// equals(options, undefined);
							return `fn ${context.fizz}`;
						},
					})
					.toCompileTo('fn buzz');
			});
		});

		describe('missing', function () {
			test('default rendered', function () {
				expectTemplate('{{#> foo }}default{{/foo}}')
					// .debug()
					// .useHandlebars()
					.toCompileTo('default');
			});

			test('default rendered with correct context', function () {
				expectTemplate('{{#> foo }}{{fizz}}{{/foo}}')
					// .debug()
					// .useHandlebars()
					.withInput({
						fizz: 'buzz',
					})
					.toCompileTo('buzz');
			});

			test('default rendered with correct context, new context', function () {
				expectTemplate('{{#> foo newContext}}{{fizz}}{{/foo}}')
					// .debug()
					// .useHandlebars()
					.withInput({
						fizz: 'buzz',
						newContext: {
							fizz: 'inga',
						},
					})
					.toCompileTo('inga');
			});
		});

		describe('@partial-block', function () {
			test('default rendered via @partial-block', function () {
				expectTemplate('{{#> foo }}default{{/foo}}')
					// .debug()
					// .useHandlebars()
					.withPartials({
						foo: 'inner {{> @partial-block }}',
					})
					.toCompileTo('inner default');
			});

			test('@partial-block does not exist inside @partial-block', function () {
				expectTemplate('{{#> foo }}{{ @partial-block }}{{/foo}}')
					// .debug()
					// .useHandlebars()
					.withPartials({
						foo: 'inner {{> @partial-block }}',
					})
					.toCompileTo('inner ');
			});

			test('default rendered via @partial-block, custom context', function () {
				expectTemplate('{{#> foo newContext}}{{ fizz }}{{/foo}}')
					// .debug()
					// .useHandlebars()
					.withInput({
						fizz: 'buzz',
						newContext: {
							fizz: 'inga',
						},
					})
					.withPartials({
						foo: 'inner {{> @partial-block }}',
					})
					.toCompileTo('inner inga');
			});

			test('@partial-block gets the context of the outer context', function () {
				expectTemplate(
					'{{#each people as |person|}}{{#> childEntry ../newContext}}{{person.firstName}}{{/childEntry}}{{/each}}'
				)
					// .debug()
					// .useHandlebars()
					.withInput({
						newContext: { person: { firstName: 'three' } },
						people: [{ firstName: 'one' }, { firstName: 'two' }],
					})
					.withPartials({
						childEntry: '{{person.firstName}} {{> @partial-block }}',
					})
					.toCompileTo('three onethree two');
			});

			test('@partial-block gets the context of the outer context, missing partial', function () {
				expectTemplate(
					'{{#each people as |person|}}{{#> childEntry ../newContext}}{{person.firstName}}{{/childEntry}}{{/each}}'
				)
					// .debug()
					// .useHandlebars()
					.withInput({
						people: [{ firstName: 'one' }, { firstName: 'two' }],
					})
					.toCompileTo('onetwo');
			});

			test('@partial-block at different nested levels for different partial blocks', function () {
				expectTemplate('<4>{{#> outer }}<6>{{fizz}}</6>{{/outer}}</4>')
					// .debug()
					// .useHandlebars()
					.withInput({
						fizz: 5,
					})
					.withPartials({
						nested: '<1>{{> @partial-block}}</1>',
						outer:
							'<2>{{#> nested }}<3>{{> @partial-block }}</3>{{/nested}}{{> @partial-block}}</2>',
					})
					.toCompileTo('<4><2><1><3><6>5</6></3></1><6>5</6></2></4>');
			});

			it('@partial-block is "lazily rendered" with the context its given at the time', function () {
				expectTemplate('{{#> dude}}{{value}}{{/dude}}')
					// .debug()
					// .useHandlebars()
					.withInput({ value: 'foo', context: { value: 'bar' } })
					.withPartials({
						dude: '{{> @partial-block }}{{#with context}}{{> @partial-block }}{{/with}}',
					})
					.toCompileTo('foobar');
			});
		});
	});

	describe('Decorators', function () {
		describe('inline partials', function () {
			describe('exists', function () {
				test('literally from the docs', function () {
					expectTemplate(
						`{{#*inline "myPartial"}}My Content{{/inline}}{{#each people}}{{> myPartial}}{{/each}}`
					)
						// .debug()
						// .useHandlebars()
						.withInput({
							people: [{ firstname: 'Nils' }, { firstname: 'Yehuda' }],
						})
						.toCompileTo(`My ContentMy Content`);
				});
			});
		});
	});
});
