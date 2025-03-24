import fs from "node:fs";
import path from "node:path";

/**
 *
 * @param {string} key
 * @param {string }value
 * @param {string} [options]
 * @param {string} [options.cwd]
 */
export function setNpmrcValue(key, value, options) {
  const npmrcPath = path.join(options?.cwd || process.cwd(), ".npmrc");
  let npmrcContent = fs.existsSync(npmrcPath)
    ? fs.readFileSync(npmrcPath, "utf8")
    : "";
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
  fs.writeFileSync(npmrcPath, npmrcContent.trim());
}
