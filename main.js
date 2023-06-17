// import { Compiler } from './src/compiler';
// import { parse } from 'handlebars';
// import { RenderVisitor2 } from './src/visitor2';
// import { render } from './src/index';

export default {
	fetch() {
		const template = `hello {{first}}`;
		const context = { first: 'world' };
		return new Response(JSON.stringify(render(template, context), null, 2), {
			headers: {
				'content-type': 'text/plain',
			},
		});
	},
};
