require("esbuild")
  .build({
    entryPoints: [__dirname + "/src/index.mjs"],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: __dirname + "/dist/index.js",
    // Fix for https://github.com/evanw/esbuild/pull/2067
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
  })
  .catch(() => process.exit(1));
