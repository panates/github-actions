import * as core from '@actions/core';

async function run() {
  const packagesString = core.getInput('packages', {
    trimWhitespace: true,
    required: true
  });
  const packages = JSON.parse(packagesString);
  console.log(packages);
}

run().catch(error => {
  core.setFailed(error);
});
