import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import colors from "ansi-colors";
import { npmExists } from "./npm-check.js";
import { setNpmrcValue } from "./npmrc-utils.js";

async function run() {
  const token = core.getInput("token", { required: true });

  const rootDir = process.env.GITHUB_WORKSPACE;
  const artifactsDir = path.join(rootDir, "__artifacts__");
  if (!fs.existsSync(artifactsDir)) {
    core.setFailed("__artifacts__ directory do not exists");
    return;
  }

  const projects = JSON.parse(
    fs.readFileSync(path.join(artifactsDir, "projects.json"), "utf-8"),
  );

  for (const pkg of projects) {
    if (!pkg.isNpmPackage) continue;
    const pkgDir = path.join(artifactsDir, pkg.directory);

    setNpmrcValue("//npm.pkg.github.com/:_authToken", token, pkgDir);

    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(pkgDir, "package.json"), "utf-8"),
    );

    /** Check if package exists in repository */
    if (
      await npmExists(pkg.name, {
        version: pkg.version,
        registry: pkgJson.publishConfig?.registry,
        cwd: pkgDir,
      })
    ) {
      core.info(
        `Package ${colors.magenta(
          pkg.name + "@" + pkg.version,
        )} already exists in npm repository. Skipping.`,
      );
      continue;
    }

    /** Publish package */
    core.info(`Publishing ${colors.magenta(pkg.name + "@" + pkg.version)}`);
    try {
      execSync("npm publish", {
        cwd: pkgDir,
        stdio: "pipe",
      });
    } catch (error) {
      const msg = error.stderr.toString();
      core.setFailed(msg);
      return;
    }
  }
}

run().catch((error) => {
  core.setFailed(error);
});
