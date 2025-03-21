# NodeJS Build Workflow

This GitHub Actions workflow is designed to **build Node.js packages** and manage artifacts and changelogs in a
standardized way across multiple repositories.

## 📄 Workflow File

`.github/workflows/node-build.yaml`

## 🚀 Trigger

This workflow is triggered via [`workflow_call`](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
from another workflow.

## 📥 Inputs

| Name           | Type   | Default         | Description                                  |
|----------------|--------|-----------------|----------------------------------------------|
| `build_script` | string | `npm run build` | The script to execute for building packages. |

## 🔐 Secrets

| Name                    | Required | Description                                    |
|-------------------------|----------|------------------------------------------------|
| `PERSONAL_ACCESS_TOKEN` | ✅        | GitHub personal access token with repo access. |

## 🧱 Jobs

### `build` – Build Packages

This job performs the following steps:

1. **Setup Environment**  
   Uses the [`panates/gh-setup-node@v1`](https://github.com/panates/gh-setup-node) action to configure Node.js
   environment and checkout the code.

2. **Scan Environment**  
   Gathers repository info using [`panates/gh-repository-info@v1`](https://github.com/panates/gh-repository-info).

3. **Build Changelog**  
   Generates a changelog from the previous to the latest commit using a custom action:  
   `panates/github-actions/.github/actions/node-build-changelog@dev`.

4. **Print Changelog**  
   Prints the generated changelog from `COMMIT_CHANGELOG.md` to the console.

5. **Build Packages**  
   Executes the build script defined in the input (`npm run build` by default).

6. **Upload Artifacts**  
   Uploads built artifacts using `panates/github-actions/.github/actions/node-build-artifacts@dev`.

## 📦 Outputs

This workflow does not define outputs directly but produces artifacts and a printed changelog useful for downstream
actions.

---

✅ **Recommended Use**: Call this workflow from your repository’s main workflow to standardize build, changelog
generation, and artifact handling.
