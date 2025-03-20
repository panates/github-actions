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

  const infoFile = [];
  for (const pkg of packages) {
    core.info("Preparing", colors.magenta(`${pkg.name}`));
    const packageDir = path.join(rootDir, pkg.directory);
    pkg.buildDir = "src";
    const buildDir = path.join(packageDir, pkg.buildDir || "./");
    if (!fs.existsSync(buildDir)) {
      core.warning("build directory do not exists. Skipping");
      continue;
    }
    const pkgDir = sanitizeFilename(pkg.name);
    infoFile.push({
      ...pkg,
      directory: pkgDir,
      buildDir: undefined,
    });

    /** Copy build files to artifacts dir */
    fs.cpSync(buildDir, path.join(artifactsDir, pkgDir), { recursive: true });
  }
  /** Write package info to json file same basename with zip file */
  fs.writeFileSync(
    path.join(artifactsDir, "packages.json"),
    JSON.stringify(infoFile, null, 2),
  );
  /** Copy COMMIT_CHANGELOG.md to artifacts dir */
  fs.cpSync(
    path.join(rootDir, "COMMIT_CHANGELOG.md"),
    path.join(artifactsDir, "COMMIT_CHANGELOG.md"),
  );
  core.endGroup();
}

function sanitizeFilename(filename, replacement = "_") {
  // eslint-disable-next-line no-control-regex
  return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, replacement).trim();
}

run().catch((error) => {
  core.setFailed(error);
});
