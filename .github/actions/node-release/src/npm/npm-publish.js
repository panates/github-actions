import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import colors from "ansi-colors";
import { execCmd } from "../utils/exec-cmd.js";
import { npmExists } from "./npm-exists.js";
import { setNpmrcValue } from "./npmrc-utils.js";

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
export async function npmPublish(args) {
  const { rootDir, pkg, token } = args;
  const pkgDir = path.join(rootDir, pkg.directory);
  const buildDir = path.join(pkgDir, pkg.buildDir || "./");

  /** Read package.json */
  const pkgJson = JSON.parse(
    fs.readFileSync(path.join(buildDir, "package.json"), "utf-8"),
  );

  /** Set npm credentials for "npm.pkg.github.com" registry */
  setNpmrcValue("//npm.pkg.github.com/:_authToken", token, buildDir);

  /** Check if package exists in repository */
  core.info(
    `Checking if ${colors.magenta(
      pkgJson.name + "@" + pkgJson.version,
    )} exists in npm registry`,
  );
  if (
    await npmExists(pkg.name, {
      version: pkgJson.version,
      registry: pkgJson.publishConfig?.registry,
      cwd: buildDir,
    })
  ) {
    core.info(
      `Package ${colors.magenta(
        pkg.name + "@" + pkgJson.version,
      )} already exists in npm repository. Skipping.`,
    );
    return;
  }
  /** Publish package */
  core.info(
    `Publishing ${colors.magenta(pkgJson.name + "@" + pkgJson.version)}`,
  );
  await execCmd("npm publish", {
    cwd: buildDir,
  });
}
