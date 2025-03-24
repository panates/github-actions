import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import colors from "ansi-colors";

async function run() {
  /** Read packages inputs */
  const packages = JSON.parse(core.getInput("packages", { required: true }));
  const token = core.getInput("token", { required: true });
  const rootDir = core.getInput("workspace") || process.cwd();
  const dockerHubUsername = core.getInput("docherhub-username", {
    required: true,
  });
  const dockerHubPassword = core.getInput("docherhub-password", {
    required: true,
  });
  const dockerPlatforms = core.getInput("platforms", { required: true });

  try {
    /** Login to docker */
    core.info(colors.yellow(`🔐 Logging into docker..`));
    await execSync(
      `echo "${dockerHubPassword}" | docker login --username ${dockerHubUsername} --password-stdin`,
      { stdio: "inherit" },
    );
    core.info(colors.yellow(`🔧 One-time setup if buildx isn’t initialized`));
    await execSync("docker buildx create --use || true", {
      stdio: "inherit",
    });

    for (const pkg of packages) {
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
  } catch (error) {
    core.setFailed(error);
  }
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

run().catch((error) => {
  core.setFailed(error);
});
