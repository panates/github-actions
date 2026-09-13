import { execSync } from "node:child_process";
import fs from "node:fs";
import * as core from "@actions/core";
import colors from "ansi-colors";
import yaml from "yaml";

async function run() {
  /** Read packages input - "rman list --json" output */
  const packages = JSON.parse(core.getInput("packages", { required: true }));
  const dockerPackages = packages.filter(
    (p) => p.publishTargets?.includes("docker") && p.docker?.image,
  );
  if (dockerPackages.length === 0) {
    core.info("No docker packages found. Skipping");
    return;
  }

  const dockerHubUsername = core.getInput("docherhub-username", {
    required: true,
  });
  const dockerHubPassword = core.getInput("docherhub-password", {
    required: true,
  });
  const dockerhubNamespace = core.getInput("dockerhub-namespace", {
    required: true,
  });
  core.info("stageFiles:");
  const stageFilesMap = core
    .getInput("stage-files", {
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

  /** Same bare-vs-namespaced rule DockerPublishService itself uses - a "docker.image" already
   *  containing a "/" is a full reference, used verbatim; a bare name is prefixed with the shared
   *  dockerhub-namespace. */
  function resolveImageRef(image) {
    return image.includes("/") ? image : `${dockerhubNamespace}/${image}`;
  }

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

    const dockerHubToken = (await r.json()).token;

    const okItems = [];

    for (const pkg of dockerPackages) {
      const stageFile = stageFilesMap[pkg.name];
      if (!stageFile) {
        core.setFailed(`No stage file mapping found for ${pkg.name}`);
        continue;
      }

      const imageRef = resolveImageRef(pkg.docker.image);
      const slashIdx = imageRef.indexOf("/");
      const imageNamespace = imageRef.slice(0, slashIdx);
      const imageName = imageRef.slice(slashIdx + 1);
      const imageUrl = `${imageRef}:${pkg.version}`;
      core.info("stageFile: " + stageFile);
      core.info("imageUrl: " + imageUrl);

      core.info(colors.yellow(`🔍 Checking if image exists in DockerHub..`));
      r = await fetch(
        `https://hub.docker.com/v2/repositories/${imageNamespace}/${imageName}/tags/${pkg.version}/`,
        {
          method: "GET",
          headers: {
            Authorization: "JWT " + dockerHubToken,
          },
        },
      );
      if (!r.ok) {
        if (r.status === 404) {
          core.setFailed(`Image ${imageUrl} not found in DockerHub`);
        } else {
          const errorText = await r.text();
          core.setFailed(`${r.status} - ${errorText}`);
        }
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
      else {
        core.setFailed(
          '"image" key with dockerhub namespace not found in ' + stageFile,
        );
        continue;
      }

      fs.writeFileSync(stageFile, doc.toString());
    }
    if (process.exitCode) {
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

run().catch((error) => {
  core.setFailed(error);
});
