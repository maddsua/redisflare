//	bundles everything into a single js file so Deno won't complain about missing .ts extensions

import * as esbuild from "https://deno.land/x/esbuild@v0.19.3/mod.js";

const build = await esbuild.build({
	stdin: {
		contents: `import './main.ts'`,
		loader: 'ts',
		resolveDir: '.',
	},
	bundle: true,
	format: 'esm',
	outfile: './server.deno.js',
});

console.log(build);
esbuild.stop();
