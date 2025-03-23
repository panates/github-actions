import { execSync } from "node:child_process";

export async function execCmd(cmd, options) {
  try {
    return execSync("npm publish", {
      ...options,
      stdio: "pipe",
    });
  } catch (error) {
    const msg = error.stderr?.toString();
    throw new Error(msg);
  }
}
