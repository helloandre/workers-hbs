import { render } from './src/index';

export default {
	fetch() {
		const template = `hello {{first}}`;
		const context = { first: 'world' };
		const resp = render(template, context);
		const headers = { 'content-type': 'text/plain' };
		return new Response(resp, { headers });
	},
};
