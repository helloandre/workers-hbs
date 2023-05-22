import hbs, { render, compile, precompile, RenderVisitor } from './index';

describe.skip('index', function () {
	describe('default', function () {
		test('is RenderVisitor', function () {
			const rv = new hbs();
			expect(rv.__render_visitor).toBe(true);
		});
	});

	describe('RenderVisitor', function () {
		test('is RenderVisitor', function () {
			const rv = new RenderVisitor();
			expect(rv.__render_visitor).toBe(true);
		});
	});

	describe('render', function () {
		test('simple variables', function () {
			expect(
				render('{{ firstName }} {{ lastName }}', {
					firstName: 'Hello',
					lastName: 'World',
				})
			).toBe('Hello World');
		});
	});

	describe('compile', function () {
		test('returns callable template function', function () {
			const fn = compile('{{ firstName }} {{ lastName }}');
			expect(
				fn({
					firstName: 'Hello',
					lastName: 'World',
				})
			).toBe('Hello World');
		});
	});

	describe('precompile', function () {
		test('returns callable template function', function () {
			const fn = precompile('{{ firstName }} {{ lastName }}');
			expect(
				// @ts-ignore-next
				fn({
					firstName: 'Hello',
					lastName: 'World',
				})
			).toBe('Hello World');
		});

		test('returns object with callable template function', function () {
			const pc = precompile('{{ firstName }} {{ lastName }}', { srcName: 'example' });
			expect(
				// @ts-ignore-next
				pc.code({
					firstName: 'Hello',
					lastName: 'World',
				})
			).toBe('Hello World');
		});
	});
});
