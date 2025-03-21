export async function npmExists(packageName, version, registry) {
  registry = registry || "https://registry.npmjs.org";
  while (registry.endsWith("/")) {
    registry = registry.slice(0, -1);
  }
  const registryUrl =
    `${registry}/${packageName}}` + (version ? `/${version}` : "");

  const response = await fetch(registryUrl, {
    method: "GET",
  });

  if (response.status === 200) {
    const packageData = await response.json();
    return packageData.version;
  }
  if (response.status === 404) {
    return "";
  }
  throw new Error(`Unexpected status code: ${response.status}`);
}
