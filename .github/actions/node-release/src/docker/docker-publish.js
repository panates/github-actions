import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import colors from "ansi-colors";

/**
 *
 * @param args
 * @param {string} args.rootDir
 * @param {object} args.pkg
 * @param {object} args.pkg.directory
 * @param {object} args.pkg.buildDir
 * @param {string} args.token
 * @returns {Promise<void>}
 */
export async function dockerPublish(args) {
  const { token, rootDir, pkg, dockerHubUsername, dockerPlatforms } = args;
  const pkgDir = path.join(rootDir, pkg.directory);
  const buildDir = path.join(pkgDir, pkg.buildDir || "./");

  /** Read package.json */
  const pkgJson = JSON.parse(
    fs.readFileSync(path.join(buildDir, "package.json"), "utf-8"),
  );

  const imageName = sanitizePackageName(pkgJson.name);
  const fullImageName = `${dockerHubUsername}/${imageName}`;

  /** Publish package */
  core.info(
    `🧪 Building docker image ` +
      colors.magenta(fullImageName + ":" + pkgJson.version),
  );
  await execSync(
    `docker buildx build --platform ${dockerPlatforms}` +
      ` --build-arg GITHUB_TOKEN=${token} ` +
      ` -t  ${fullImageName}:${pkgJson.version}` +
      ` -t  ${fullImageName}:latest` +
      " --push .",
    {
      cwd: pkgDir,
      stdio: "inherit",
    },
  );
}

function sanitizePackageName(name, replacement = "-") {
  return (
    name
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, replacement)
      .replace(/[@]/g, "")
      .trim()
  );
}
