import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";

async function run() {
  const packagesString = core.getInput("packages", {
    trimWhitespace: true,
    required: true,
  });
  const packages = JSON.parse(packagesString);
  for (const pkg of packages) {
    const packageDir = path.join(process.env.GITHUB_WORKSPACE, pkg.directory);
    const buildDir = path.join(packageDir, pkg.buildDir);
    console.log("buildDir: ", buildDir);
    if (fs.existsSync(buildDir)) {
      console.log("buildDir exists");
    } else console.log("buildDir do not exists");
  }
  console.log(packages);
}

run().catch((error) => {
  core.setFailed(error);
});
