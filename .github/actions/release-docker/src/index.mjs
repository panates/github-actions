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
  const dockerhubNamespace = core.getInput("dockerhub-namespace", {
    required: true,
  });
  const dockerPlatforms = core.getInput("platforms", { required: true });

  core.info("imageFiles");
  const imageFilesMap = core
    .getInput("image-files", {
      required: true,
    })
    .trim()
    .split(/\s*\n\s*/)
    .reduce((acc, item) => {
      const a = item.split(/\s*=\s*/);
      acc[a[0]] = a[1];
      core.info("  " + colors.yellow(a[0]) + " = " + colors.magenta(a[1]));
      return acc;
    }, {});

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

    /** Validate image files mapping */
    for (const pkg of packages) {
      if (!pkg.isDockerApp) continue;
      if (!imageFilesMap[pkg.name]) {
        core.setFailed(`No image file mapping found for ${pkg.name}`);
        return;
      }
    }

    for (const pkg of packages) {
      if (!pkg.isDockerApp) continue;
      const pkgDir = path.join(rootDir, pkg.directory);
      const buildDir = path.join(pkgDir, pkg.buildDir || "./");

      /** Read package.json */
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(buildDir, "package.json"), "utf-8"),
      );

      const imageName = imageFilesMap[pkg.name];
      const fullImageName = `${dockerhubNamespace}/${imageName}`;

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

run().catch((error) => {
  core.setFailed(error);
});
