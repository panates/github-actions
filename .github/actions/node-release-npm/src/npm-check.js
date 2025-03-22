import { execSync } from "node:child_process";
import * as core from "@actions/core";

/**
 *
 * @param packageName
 * @param {string} [options]
 * @param {string} [options.version]
 * @param {string} [options.registry]
 * @param {string} [options.cwd]
 * @returns {Promise<string|undefined>}
 */
export async function npmExists(packageName, options) {
  const registry = options?.registry || "https://registry.npmjs.org";
  try {
    const version = execSync(
      `npm show ${packageName} version` +
        (registry ? ` --registry ${registry}` : ""),
      {
        cwd: options?.cwd,
        stdio: "pipe",
      },
    )
      .toString()
      .trim();
    core.debug(version);
    // eslint-disable-next-line no-console
    console.log(version);
    return version;
  } catch (error) {
    const msg = error.stderr.toString();
    // eslint-disable-next-line no-console
    console.log("Error: ", msg);
    if (msg.includes("E404")) {
      core.debug(msg);
      return;
    }
    throw new Error(msg);
  }
}
