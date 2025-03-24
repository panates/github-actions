import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import colors from "ansi-colors";
import yaml from "yaml";

async function run() {
  /** Read packages inputs */
  const packages = JSON.parse(core.getInput("packages", { required: true }));
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
  core.info("stageDirectory: " + stageDirectory);
  core.info("stageFilePrefix: " + stageFilePrefix);
  core.info("stageFileSuffix: " + stageFileSuffix);

  try {
    /** Login to docker */
    core.info(colors.yellow(`🔐 Logging into dockerhub..`));
    let r = await fetch(`https://hub.docker.com/v2/users/login/`, {
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

    const failItems = [];
    const okItems = [];

    for (const pkg of packages) {
      if (!pkg.isDockerApp) continue;

      const imageName = sanitizePackageName(pkg.name);
      const stageFile = path.join(
        stageDirectory || "./",
        `${stageFilePrefix}${imageName}${stageFileSuffix}`,
      );
      const imageUrl = `${dockerhubNamespace}/${imageName}:${pkg.version}`;
      core.info("stageFile: " + stageFile);
      core.info("imageUrl: " + imageUrl);

      core.info(colors.yellow(`🔍 Checking if image exists in DockerHub..`));
      r = await fetch(
        `https://hub.docker.com/v2/repositories/${dockerhubNamespace}/${imageName}/tags/${pkg.version}/`,
        {
          method: "GET",
          headers: {
            Authorization: "JWT " + token,
          },
        },
      );
      if (!r.ok) {
        const errorText = await r.text();
        core.setFailed(`${r.status} - ${errorText}`);
        failItems.push(pkg.name);
        continue;
      }

      core.info(
        colors.yellow(`🧪 Updating stage file for `) + colors.magenta(pkg.name),
      );
      const stageFileContent = fs.readFileSync(stageFile, "utf-8");
      const doc = yaml.parseDocument(stageFileContent);
      let updated = false;
      // Traverse & update
      yaml.visit(doc, {
        Pair(_, pair) {
          if (
            String(pair.key) === "image" &&
            String(pair.value).startsWith(dockerhubNamespace + "/")
          ) {
            updated = true;
            pair.value = imageUrl;
          }
        },
      });
      if (updated) okItems.push(pkg.name);
      else failItems.push(pkg.name);

      fs.writeFileSync(stageFile, doc.toString());
    }
    if (failItems.length > 0) {
      core.setFailed(`Failed to update stage file for ${failItems.join(", ")}`);
      return;
    }
    core.info("Committing and pushing changes..");
    execSync("git config --global user.name 'GitHub Actions'", {
      stdio: "inherit",
    });
    execSync("git config --global user.email 'actions@github.com'", {
      stdio: "inherit",
    });
    execSync("git add .", {
      stdio: "inherit",
    });
    execSync(
      `git diff --staged --quiet || git commit -m "Updated stage files (${okItems.join(", ")})"`,
      {
        stdio: "inherit",
      },
    );
    execSync("git push", {
      stdio: "inherit",
    });
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
