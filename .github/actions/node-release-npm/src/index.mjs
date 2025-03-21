import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
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

    const npmrcContent = `
//npm.pkg.github.com/:_authToken=${personelAccessToken}
`;
    console.log("**** .npmrc content:\n\n", npmrcContent, "\n***********\n");
    fs.appendFileSync(
      path.join(artifactsDir, pkg.directory, ".npmrc"),
      npmrcContent,
      "utf-8",
    );

    if (await fetchVersionFromNpm(pkg.name + "@" + pkg.version)) {
      core.info(
        `Package ${colors.magenta(pkg.name)}@${colors.magenta(
          pkg.version,
        )} already exists on npm. Skipping`,
      );
      continue;
    }
    if (process.exitCode) return;

    core.info(
      `Publishing ${colors.magenta(pkg.name)}@${colors.magenta(pkg.version)}`,
    );
    try {
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
    core.setFailed(
      "Error fetching version from npm repository:" + error.message,
    );
  }
}

run().catch((error) => {
  core.setFailed(error);
});
