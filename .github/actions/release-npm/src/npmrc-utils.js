import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";

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
