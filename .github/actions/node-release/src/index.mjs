import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import colors from "ansi-colors";
import { dockerPublish } from "./docker/docker-publish.js";
import { npmPublish } from "./npm/npm-publish.js";
import { execCmd } from "./utils/exec-cmd.js";

async function run() {
  const token = core.getInput("token", { required: true });
  const packagesString = core.getInput("packages", { required: true });

  /** Read packages info array */
  let packages;
  try {
    packages = JSON.parse(packagesString);
  } catch (error) {
    core.setFailed('Error parsing "packages" input value. ' + error.message);
    return;
  }

  const rootDir = process.env.GITHUB_WORKSPACE || process.cwd();

  try {
    /** Validate package directories */
    const validatedPackages = packages.filter((pkg) => {
      const pkgDir = path.join(rootDir, pkg.directory);
      const buildDir = path.join(pkgDir, pkg.buildDir || "./");
      if (!fs.existsSync(buildDir)) {
        core.warning("build directory do not exists. Skipping");
        return false;
      }
      return true;
    });

    const npmPackages = validatedPackages.filter((p) => p.isNpmPackage);
    const dockerApps = validatedPackages.filter((p) => p.isDockerApp);
    let dockerHubUsername;
    let dockerHubPassword;
    let dockerPlatforms;
    if (dockerApps.length) {
      dockerHubUsername = core.getInput("dockerhub-username", {
        required: true,
      });
      dockerHubPassword = core.getInput("dockerhub-password", {
        required: true,
      });
      dockerPlatforms =
        core.getInput("docker-platforms") || "linux/amd64,linux/arm64";
      /** Login to docker */
      core.info(colors.yellow(`🔐 Logging into docker..`));
      await execCmd(
        `docker login --username ${dockerHubUsername} --password ${dockerHubPassword}`,
      );
    }

    const ctx = {
      token,
      rootDir,
    };

    if (npmPackages.length) {
      core.info(colors.yellow(`Publishing npm packages..`));
      for (const pkg of npmPackages) {
        await npmPublish({
          ...ctx,
          pkg,
        });
      }
    }

    if (dockerApps.length) {
      core.info(colors.yellow(`Creating and publishing docker images..`));
      for (const pkg of npmPackages) {
        await dockerPublish({
          ...ctx,
          pkg,
          dockerHubUsername,
          dockerPlatforms,
        });
      }
    }
  } catch (error) {
    core.setFailed(error);
  }
}

run().catch((error) => {
  core.setFailed(error);
});
