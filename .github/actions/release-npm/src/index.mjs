import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import colors from "ansi-colors";
import { npmExists } from "./npm-exists.js";
import { setNpmrcValue } from "./npmrc-utils.js";

async function run() {
  /** Read packages inputs */
  const packages = JSON.parse(core.getInput("packages", { required: true }));
  const npmPackages = packages.filter((p) => p.isNpmPackage);
  if (packages.length === 0) {
    core.info("No npm packages found. Skipping");
    return;
  }

  const token = core.getInput("token", { required: true });
  const rootDir = core.getInput("workspace") || process.cwd();

  try {
    for (const pkg of npmPackages) {
      const pkgDir = path.join(rootDir, pkg.directory);
      const buildDir = path.join(pkgDir, pkg.buildDir || "./");
      if (!fs.existsSync(buildDir)) {
        core.warning("build directory do not exists. Skipping");
        continue;
      }

      /** Read package.json */
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(buildDir, "package.json"), "utf-8"),
      );

      /** Set npm credentials for "npm.pkg.github.com" registry */
      setNpmrcValue("//npm.pkg.github.com/:_authToken", token, {
        cwd: buildDir,
      });

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

      try {
        return execSync("npm publish", {
          cwd: buildDir,
          stdio: "pipe",
        });
      } catch (error) {
        const msg = error.stderr?.toString();
        core.setFailed(msg);
        return;
      }
    }
  } catch (error) {
    core.setFailed(error);
  }
}

run().catch((error) => {
  core.setFailed(error);
});
