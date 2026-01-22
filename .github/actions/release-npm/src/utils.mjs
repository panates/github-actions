import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";

export function coerceToArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value).split(/\s*,\s*/);
}

/**
 *
 * @param {string} [options]
 * @param {string} [options.cwd]
 */
export function readNpmrc(options) {
  const npmrcPath = path.join(options?.cwd || process.cwd(), ".npmrc");
  return fs.existsSync(npmrcPath) ? fs.readFileSync(npmrcPath, "utf8") : "";
}

/**
 *
 * @param {string} key
 * @param {string }value
 * @param {string} [options]
 * @param {string} [options.cwd]
 */
export function setNpmrcValue(key, value, options) {
  let npmrcContent = readNpmrc(options);
  let i = 0;
  npmrcContent = npmrcContent
    .split("\n")
    .map((line) => {
      if (line.startsWith(key + "=")) {
        i++;
        return key + "=" + value;
      }
      return line;
    })
    .join("\n");
  if (!i) npmrcContent = npmrcContent += "\n" + key + "=" + value;
  core.debug("npmrc content: " + npmrcContent);
  const npmrcPath = path.join(options?.cwd || process.cwd(), ".npmrc");
  fs.writeFileSync(npmrcPath, npmrcContent.trim());
}

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
