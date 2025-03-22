import { execSync } from "node:child_process";

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
    return execSync(
      `npm show ${packageName} version` +
        (registry ? ` --registry ${registry}` : ""),
      { cwd: options.cwd, stdio: "pipe" },
    )
      .toString()
      .trim();
  } catch (error) {
    const msg = error.stderr.toString();
    if (msg.includes("E404")) return;
    console.error("Error fetching version from npm repository:", msg);
  }
}
