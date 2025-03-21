import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import * as github from "@actions/github";
import colors from "ansi-colors";

async function run() {
  const personelAccessToken = core.getInput("token", { required: true });

  core.startGroup("Publishing npm packages");

  const rootDir = process.env.GITHUB_WORKSPACE;
  const artifactsDir = path.join(rootDir, "__artifacts__");
  if (!fs.existsSync(artifactsDir)) {
    core.setFailed("__artifacts__ directory do not exists");
    return;
  }

  const projects = JSON.parse(
    fs.readFileSync(path.join(artifactsDir, "projects.json"), "utf-8"),
  );
  console.log(projects);

  for (const pkg of projects) {
    if (!pkg.isNpmPackage) continue;

    if (await fetchVersionFromNpm(pkg.name + "@" + pkg.version)) {
      core.info(
        `Package ${colors.magenta(pkg.name)}@${colors.magenta(
          pkg.version,
        )} already exists on npm. Skipping`,
      );
      continue;
    }

    core.info(
      `Publishing ${colors.magenta(pkg.name)}@${colors.magenta(pkg.version)}`,
    );
    try {
      const npmrcContent = `
@${github.context.repo.owner}:registry=https://npm.pkg.github.com/:_authToken=${personelAccessToken}
`;
      fs.appendFileSync(
        path.join(artifactsDir, pkg.directory, ".npmrc"),
        npmrcContent,
        "utf-8",
      );

      execSync("npm publish", {
        cwd: path.join(artifactsDir, pkg.directory),
        stdio: "inherit",
      });
    } catch (error) {
      core.setFailed(error);
      return;
    }
  }
  core.endGroup();
}

export async function fetchVersionFromNpm(packageName) {
  try {
    return execSync('npm show "' + packageName + '" version')
      .toString()
      .trim();
  } catch (error) {
    console.error("Error fetching version from npm repository:", error);
  }
}

run().catch((error) => {
  core.setFailed(error);
});
