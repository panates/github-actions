import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import colors from "ansi-colors";
import yaml from "yaml";

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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: dockerHubUsername,
        password: dockerHubPassword,
      }),
    });
    if (!r.ok) {
      const errorText = await r.text();
      core.setFailed(`Docker login failed: ${r.status} - ${errorText}`);
      return;
    }

    const { token } = await r.json();
    core.info("token: " + token);

    for (const pkg of packages) {
      if (!pkg.isDockerApp) continue;

      core.info(`🧪 Updating stage file for ` + colors.magenta(pkg.name));
      const imageName = sanitizePackageName(pkg.name);
      const stageFile = path.join(
        stageDirectory || "./",
        `${stageFilePrefix}${imageName}${stageFileSuffix}`,
      );
      const imageUrl = `${dockerhubNamespace}/${imageName}:${pkg.version}`;
      core.info("stageFile: " + stageFile);
      core.info("imageUrl: " + imageUrl);

      const stageFileContent = fs.readFileSync(stageFile, "utf-8");
      core.info("stageFileContent: \n" + stageFileContent);

      const doc = yaml.parseDocument(stageFileContent);
      // Traverse & update
      yaml.visit(doc, {
        Pair(_, pair) {
          if (
            String(pair.key) === "image" &&
            String(pair.value).startsWith(dockerhubNamespace + "/")
          ) {
            pair.value = imageUrl;
          }
        },
      });

      core.info("stageFileContent: \n" + String(doc));

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
