import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import colors from "ansi-colors";

async function run() {
  /** Read packages inputs */
  const packages = JSON.parse(core.getInput("packages", { required: true }));
  const dockerPackages = packages.filter((p) => p.isDockerApp);
  if (dockerPackages.length === 0) {
    core.info("No docker packages found. Skipping");
    return;
  }

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
    /** Login to docker in terminal */
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
    for (const pkg of dockerPackages) {
      if (!imageFilesMap[pkg.name]) {
        core.setFailed(`No image file mapping found for ${pkg.name}`);
        return;
      }
    }

    /** Build docker images */
    for (const pkg of dockerPackages) {
      const pkgDir = path.join(rootDir, pkg.directory);
      const buildDir = path.join(pkgDir, pkg.buildDir || "./");
      core.debug(`  pkgDir: ${pkgDir}\n  buildDir: ${buildDir}\n`);

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

    /** Login to docker and get token */
    core.info(colors.yellow(`🔐 Logging into dockerhub..`));
    let r = await refetch(`https://hub.docker.com/v2/users/login/`, {
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

    const dockerHubToken = (await r.json()).token;

    /** Update DockerHub descriptions */
    for (const pkg of dockerPackages) {
      const pkgDir = path.join(rootDir, pkg.directory);
      const buildDir = path.join(pkgDir, pkg.buildDir || "./");

      /** Read package.json */
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(buildDir, "package.json"), "utf-8"),
      );

      const readmeFile = path.join(pkgDir, "DOCKER_README.md");
      if (fs.existsSync(readmeFile)) {
        const imageName = imageFilesMap[pkg.name];
        core.info(
          colors.yellow(
            `Updating dockerhub repository description for ${dockerhubNamespace}/${imageName} ..`,
          ),
        );
        const readme = fs.readFileSync(readmeFile, "utf-8");
        r = await refetch(
          `https://hub.docker.com/v2/repositories/${dockerhubNamespace}/${imageName}/`,
          {
            method: "PATCH",
            body: JSON.stringify({
              description: pkgJson.description,
              full_description: readme,
            }),
            headers: {
              Authorization: "JWT " + dockerHubToken,
              "Content-Type": "application/json",
            },
          },
        );
        if (r.ok)
          core.info(
            colors.green(
              "DockerHub repository description updated successfully",
            ),
          );
        else {
          const errorText = await r.text();
          core.setFailed(
            `Update description failed: ${r.status} - ${errorText}`,
          );
          return;
        }
      }
    }
  } catch (error) {
    core.setFailed(error.message + "\n" + error.stack);
  }
}

async function refetch(url, options = {}, retry = 0) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (error) {
    if (retry++ > 5) throw error;
    core.info("Fetch failed. retrying..");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return refetch(url, options, retry);
  }
  return res;
}

run().catch((error) => {
  core.setFailed(error);
});
