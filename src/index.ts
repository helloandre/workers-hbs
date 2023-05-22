import Handlebars from 'handlebars';
import { PrecompileOptions, CompileOptions, RenderVisitor } from './visitor';

export function render<T = any>(
	template: string,
	context: T,
	runtimeOptions?: Handlebars.RuntimeOptions,
	compileOptions?: CompileOptions
) {
	return new RenderVisitor().render(template, context, runtimeOptions, compileOptions);
}

export function compile(template: string, compileOptions?: CompileOptions) {
	return new RenderVisitor().compile(template, compileOptions);
}

export function precompile(template: string, precompileOptions?: PrecompileOptions) {
	return new RenderVisitor().precompile(template, precompileOptions);
}

export default RenderVisitor;
export { RenderVisitor } from './visitor';
export { escapeExpression, SafeString } from 'handlebars';
