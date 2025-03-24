import * as core from "@actions/core";
import colors from "ansi-colors";

async function run() {
  /** Read packages inputs */
  const packages = JSON.parse(core.getInput("packages", { required: true }));
  // const token = core.getInput("token", { required: true });
  const dockerHubUsername = core.getInput("docherhub-username", {
    required: true,
  });
  const dockerHubPassword = core.getInput("docherhub-password", {
    required: true,
  });
  const dockerhubNamespace = core.getInput("dockerhub-namespace", {
    required: true,
  });
  const stageDirectory = core.getInput("stage-directory") || "";
  const stageFilePrefix = core.getInput("stage-file-prefix") || "";
  const stageFileSuffix = core.getInput("stage-file-suffix") || "";
  core.info("dockerhubNamespace: " + dockerhubNamespace);
  core.info("dockerHubUsername: " + dockerHubUsername);
  core.info("dockerhubNamespace: " + dockerhubNamespace);
  core.info("stageDirectory: " + stageDirectory);
  core.info("stageFilePrefix: " + stageFilePrefix);
  core.info("stageFileSuffix: " + stageFileSuffix);

  try {
    /** Login to docker */
    core.info(colors.yellow(`🔐 Logging into dockerhub..`));
    const r = await fetch(`https://hub.docker.com/v2/users/login/`, {
      body: JSON.stringify({
        username: dockerHubUsername,
        password: dockerHubPassword,
      }),
    });
    const token = (await r.json()).token;
    core.info("token: " + token);

    for (const pkg of packages) {
      if (!pkg.isDockerApp) continue;

      core.info(`🧪 Updating stage file for ` + colors.magenta(pkg.name));
      const imageName = sanitizePackageName(pkg.name);
      const stageFile = `${dockerhubNamespace}/${stageFilePrefix}${imageName}${stageFileSuffix}`;
      const imageUrl = `${dockerhubNamespace}/${imageName}:${pkg.version}`;
      core.info("stageFile: " + stageFile);
      core.info("imageUrl: " + imageUrl);

      // /** Publish package */
      // core.info(
      //   `🧪 Building docker image ` +
      //     colors.magenta(fullImageName + ":" + pkgJson.version),
      // );
      // await execSync(
      //   `docker buildx build --platform ${dockerPlatforms}` +
      //     ` --build-arg GITHUB_TOKEN=${token} ` +
      //     ` -t  ${fullImageName}:${pkgJson.version}` +
      //     ` -t  ${fullImageName}:latest` +
      //     " --push .",
      //   {
      //     cwd: pkgDir,
      //     stdio: "inherit",
      //   },
      // );
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
