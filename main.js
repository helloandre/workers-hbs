// import { Compiler } from './src/compiler';
// import { parse } from 'handlebars';
import { RenderVisitor2 } from './src/visitor2';

export default {
	fetch() {
		const template = `hello {{first}}`;
		const context = { first: 'world' };
		return new Response(JSON.stringify(new RenderVisitor2().render(template, context), null, 2), {
			headers: {
				'content-type': 'text/plain',
			},
		});
	},
};
