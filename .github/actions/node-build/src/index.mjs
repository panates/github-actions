import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import colors from "ansi-colors";

async function run() {
  const packages = JSON.parse(process.env.PACKAGES);
  // core.debug(packages);
  core.info(packages);

  core.startGroup("Preparing directories");

  const rootDir = process.env.GITHUB_WORKSPACE;
  const artifactsDir = path.join(rootDir, "__artifacts__");
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.cpSync(
    path.join(rootDir, "COMMIT_CHANGELOG.md"),
    path.join(artifactsDir, "COMMIT_CHANGELOG.md"),
  );

  for (const pkg of packages) {
    core.info("Preparing", colors.magenta(`${pkg.name}`));
    const packageDir = path.join(rootDir, pkg.directory);
    pkg.buildDir = "src";
    const buildDir = path.join(packageDir, pkg.buildDir || "./");
    if (fs.existsSync(buildDir)) {
      core.warning("build directory do not exists. Skipping");
      continue;
    }
    const pkgFilename = sanitizeFilename(pkg.name);

    fs.writeFileSync(
      path.join(artifactsDir, pkgFilename + "json"),
      JSON.stringify(pkg, null, 2),
    );

    fs.cpSync(buildDir, artifactsDir, { recursive: true });
    // core.debug("Zip file crated: " + colors.magenta(pkgFilename + ".zip"));
    // if (pkg.isNpmPackage) {
    //   if (pkg.version === pkg.npmPublishedVersion) {
    //     core.info("Version is the same as published. Skipping");
    //   } else {
    //     core.debug("Copying files to __npm_packages__");
    //     fs.cpSync(buildDir, npmPackagesRoot, { recursive: true });
    //   }
    // }
    // if (pkg.isDockerApp) {
    //   core.debug("Copying files to __docker_packages__");
    //   fs.cpSync(buildDir, dockerPackagesRoot, { recursive: true });
    // }
  }
  core.endGroup();
}

function sanitizeFilename(filename, replacement = "_") {
  // eslint-disable-next-line no-control-regex
  return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, replacement).trim();
}

run().catch((error) => {
  core.setFailed(error);
});
