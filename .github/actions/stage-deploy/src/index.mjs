import { execSync } from "node:child_process";
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
  core.info("dockerhubNamespace: " + dockerhubNamespace);
  core.info("dockerHubUsername: " + dockerHubUsername);
  core.info("dockerhubNamespace: " + dockerhubNamespace);

  try {
    /** Login to docker */
    core.info(colors.yellow(`🔐 Logging into docker..`));
    await execSync(
      `echo "${dockerHubPassword}" | docker login --username ${dockerHubUsername} --password-stdin`,
      { stdio: "inherit" },
    );
    // await execSync("docker buildx create --use || true", {
    //   stdio: "inherit",
    // });

    for (const pkg of packages) {
      if (!pkg.isDockerApp) continue;
      // const pkgDir = path.join(rootDir, pkg.directory);
      // const buildDir = path.join(pkgDir, pkg.buildDir || "./");
      //
      // /** Read package.json */
      // const pkgJson = JSON.parse(
      //   fs.readFileSync(path.join(buildDir, "package.json"), "utf-8"),
      // );
      //
      // const imageName = sanitizePackageName(pkgJson.name);
      // const fullImageName = `${dockerHubUsername}/${imageName}`;
      //
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
//
// function sanitizePackageName(name, replacement = "-") {
//   return (
//     name
//       // eslint-disable-next-line no-control-regex
//       .replace(/[<>:"/\\|?*\x00-\x1F]/g, replacement)
//       .replace(/[@]/g, "")
//       .trim()
//   );
// }

run().catch((error) => {
  core.setFailed(error);
});
