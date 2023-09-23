//	this task is needed to adapt typescript-like imports to the proper ESM format.
//	ok, it just adds .ts extension and bundles everything into a single file

import * as esbuild from "https://deno.land/x/esbuild@v0.19.3/mod.js";

const build = await esbuild.build({
	stdin: {
		contents: `import './main.ts'`,
		loader: 'ts',
		resolveDir: '.',
	},
	bundle: true,
	format: 'esm',
	outfile: './bundle.js',
});

console.log(build);
esbuild.stop();
