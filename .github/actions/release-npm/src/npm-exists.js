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
    if (options.version) packageName += `@${options.version}`;
    const cmd =
      `npm show ${packageName} version` +
      (registry ? ` --registry ${registry}` : "");
    core.debug(cmd);
    const version = execSync(cmd, {
      cwd: options?.cwd,
      stdio: "pipe",
    })
      .toString()
      .trim();
    core.debug("version: " + version);
    return version;
  } catch (error) {
    const msg = error.stderr.toString();
    if (msg.includes("E404")) {
      core.debug(msg);
      return;
    }
    throw new Error(msg);
  }
}
