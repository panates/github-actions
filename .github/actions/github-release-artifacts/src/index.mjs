import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import colors from "ansi-colors";
import { Zip } from "zip-lib";

async function run() {
  core.startGroup("Preparing release artifacts");

  const rootDir = process.env.GITHUB_WORKSPACE;
  const artifactsDir = path.join(rootDir, "__artifacts__");
  if (!fs.existsSync(artifactsDir)) {
    core.setFailed("__artifacts__ directory do not exists");
    return;
  }
  const releaseDir = path.join(rootDir, "__release__");
  fs.mkdirSync(releaseDir, { recursive: true });

  const projects = JSON.parse(
    fs.readFileSync(path.join(artifactsDir, "projects.json"), "utf-8"),
  );
  console.log(projects);

  for (const pkg of projects) {
    core.info(`Creating ${colors.magenta(pkg.directory + ".zip")}`);
    const zip = new Zip();
    zip.addFolder(path.join(artifactsDir, pkg.directory));
    await zip.archive(path.join(releaseDir, `${pkg.directory}.zip`));
  }
  core.endGroup();
}

run().catch((error) => {
  core.setFailed(error);
});
