import getAuthToken from "registry-auth-token";
import getRegistryUrl from "registry-auth-token/registry-url";

const PACKAGE_NAME_PATTERN = /^(@[^/]+)?(.+)$/;

/**
 *
 * @param packageName
 * @param {string} [options]
 * @param {string} [options.version]
 * @param {string} options.registry
 * @returns {Promise<string|undefined>}
 */
export async function npmExists(packageName, options) {
  const m = PACKAGE_NAME_PATTERN.exec(packageName);
  if (!m) throw new Error(`Invalid package name: ${packageName}`);

  let registryUrl = options?.registry || getRegistryUrl(m[1]);
  while (registryUrl.endsWith("/")) {
    registryUrl = registryUrl.slice(0, -1);
  }

  const auth = getAuthToken(registryUrl);

  const requestUrl =
    `${registryUrl}/${packageName}}` +
    (options.version ? `/${options.version}` : "");
  const headers = {};
  if (auth?.type === "Bearer") {
    headers.authorization = `Bearer ${auth.token}`;
  } else if (auth?.type === "Basic") {
    headers.authorization =
      "Basic " + Buffer.from(auth.token).toString("base64");
  }

  const response = await fetch(requestUrl, {
    method: "GET",
    headers,
  });

  if (response.status === 200) {
    const packageData = await response.json();
    return packageData?.version;
  }
  if (response.status === 404) {
    return "";
  }
  throw new Error(`Unexpected status code: ${response.status}`);
}
