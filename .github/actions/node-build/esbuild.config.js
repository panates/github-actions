require("esbuild")
  .build({
    entryPoints: [__dirname + "/src/index.mjs"],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: __dirname + "/dist/index.js",
  })
  .catch(() => process.exit(1));
