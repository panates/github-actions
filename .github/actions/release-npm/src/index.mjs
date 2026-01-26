import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import colors from "ansi-colors";
import {
  coerceToArray,
  npmExists,
  readNpmrc,
  setNpmrcValue,
} from "./utils.mjs";

async function run() {
  /** Read packages inputs */
  const packages = JSON.parse(core.getInput("packages", { required: true }));
  let ignorePackages = coerceToArray(core.getInput("ignore-packages"));

  const npmPackages = packages.filter(
    (p) => p.isNpmPackage && !ignorePackages.includes(p.name),
  );
  ignorePackages = ignorePackages.filter((p) => npmPackages.includes(p));
  if (ignorePackages.length)
    core.info("Ignored Npm Packages: " + ignorePackages);
  if (packages.length === 0) {
    core.info("No npm packages to publish. Skipping");
    return;
  }

  const token = core.getInput("token");
  const npmToken = core.getInput("npm-token");
  const rootDir = core.getInput("workspace") || process.cwd();
  const githubNamespaces = coerceToArray(core.getInput("github-registries"));

  try {
    core.info(
      colors.yellow(
        `Publishing ${npmPackages.length} packages to npm repository`,
      ),
    );
    for (const pkg of npmPackages) {
      if (ignorePackages.includes(pkg.name)) {
        core.info(`Package "${pkg.name}" is ignored. Skipping`);
        continue;
      }
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
      if (token && githubNamespaces.length) {
        setNpmrcValue("//npm.pkg.github.com/:_authToken", token, {
          cwd: buildDir,
        });
      }

      if (npmToken)
        setNpmrcValue("//registry.npmjs.org/:_authToken", npmToken, {
          cwd: buildDir,
        });

      core.debug("NODE_AUTH_TOKEN:" + process.env.NODE_AUTH_TOKEN);
      core.debug("NPM_TOKEN:" + process.env.NPM_TOKEN);
      core.debug("npmrc content: \n" + readNpmrc({ cwd: buildDir }));

      /** Check if package exists in repository */
      core.info(
        `Checking if ${colors.magenta(
          pkgJson.name + "@" + pkgJson.version,
        )} exists in npm registry`,
      );
      if (
        await npmExists(pkgJson.name, {
          version: pkgJson.version,
          registry: pkgJson.publishConfig?.registry,
          cwd: buildDir,
        })
      ) {
        core.info(
          `Package ${colors.magenta(
            pkgJson.name + "@" + pkgJson.version,
          )} already exists in npm repository. Skipping.`,
        );
        continue;
      }
      /** Publish package */
      core.info(
        `Publishing ${colors.magenta(pkgJson.name + "@" + pkgJson.version)}`,
      );

      const ns = /(@\w+\/)?(.+)/.exec(pkgJson.name);
      core.debug("ns: " + ns[1]);
      core.debug("githubNamespaces: " + githubNamespaces);
      const args = ["--no-workspaces"];

      const command = "npm publish " + args.join(" ");
      core.debug("command: " + command);

      execSync(command, {
        cwd: buildDir,
        stdio: "inherit",
      });
      core.info(
        colors.green(
          `Package ${colors.magenta(
            pkgJson.name + "@" + pkgJson.version,
          )} published`,
        ),
      );
    }
  } catch (error) {
    core.setFailed(error);
  }
}

run().catch((error) => {
  core.setFailed(error);
});
