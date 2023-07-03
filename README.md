# WorkersHBS

This is meant to be a drop-in replacement for [handlebars.js](https://github.com/handlebars-lang/handlebars.js) that does not need `eval()` or `Function.apply()`.

This is _nowhere near_ as performant as handlebars.js, but it does work in environments where dynamically generated javascript is not allowed. The intended use case of this library is that templates are rendered once (or when data changes) and the output is cached.

## Installing

```bash
npm i workers-hbs
```

## Usage

Mostly you'll only need the `.render()` function, but the other functions you may be familiar with when using handlebars.js are also included for drop-in-replacement-ness. When running in a worker you'll also need the `--node-compat` flag (or `node_compat = true` in wrangler.toml file) due to handlebar's assumption of needing a `fs` module, even though it is not used.

```javascript
// main.js
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
```

then run with

```bash
npx wrangler dev main.js --node-compat
```

## Testing

This passes the handlebars.js test suite (partially included, slightly modified) as well as a different set of `comprehensive.test.js` that is meant to be a one stop shop for functionality testing of both handlebars and workers-hbs.

```
npm test
```

## TODO

While this does output an `index.d.ts` so that this library can be used with typescript, WorkersHBS is not written in typescript. This was because the first pass was easiest to write by mostly stealing from [@handlebars/parser printer example](https://github.com/handlebars-lang/handlebars-parser/blob/master/lib/printer.js), which is javascript. Version 2 of this library will be ported to javascript.

I'd also like to use `@handlebars/parser` as the only dependency which would also remove the need for `--node-compat`, but that would mean including quite a lot of the supporting `Utils` from the main handlebars library.

## License

WorkersHBS is released under the MIT license.
