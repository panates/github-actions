# ✅ Node.js Quality Check Workflow

This reusable GitHub Actions workflow performs quality control checks on a Node.js project by installing development
dependencies and running custom `npm run qc` scripts.

---

## 🚀 Usage

To include this quality check workflow in your project, call it from another workflow:

```yaml
jobs:
  quality-check:
    uses: your-org/your-repo/.github/workflows/node-qc.yaml@v2
    secrets:
      PERSONAL_ACCESS_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
```

For a monorepo (managed with [`rman`](https://github.com/panates/rman)), point `qc_script` at
`rman run` so QC only touches packages that actually changed:

```yaml
jobs:
  quality-check:
    uses: your-org/your-repo/.github/workflows/node-qc.yaml@v2
    with:
      qc_script: "npx --yes rman@1 run qc --changed-since origin/main"
      rman-ci: "true" # clean install across every workspace instead of --only=dev
    secrets:
      PERSONAL_ACCESS_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
```

---

## 🔧 Inputs

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `qc_script` | string | `"npm run qc"` | Command to run for QC - e.g. `"rman run qc --changed-since <ref>"` for a monorepo. |
| `node-version` | string | `""` | Node.js version. |
| `rman-ci` | string | `"false"` | Use `npx rman ci` (a clean install across every workspace) instead of `npm install --only=dev`. The rman version run is pinned internally, same as `node-release.yaml`. |

## 🔐 Required Secrets

| Name                    | Description                                                                       |
|-------------------------|-----------------------------------------------------------------------------------|
| `PERSONAL_ACCESS_TOKEN` | GitHub Personal Access Token used for npm authentication and package installation |

---

## 🧪 Workflow Steps

1. **Check out the repository** using `actions/checkout@v7`
2. **Set up the Node.js environment** with `panates/gh-setup-node@v1`
    - Skips dependency installation
    - Enables caching with a custom key
3. **Installs dependencies** - `npm install --only=dev` by default, or `npx rman ci` when `rman-ci`
   is `"true"`
4. **Runs quality control checks** via `qc_script`

---

## 📄 Notes

- The `qc_script` should be defined in your `package.json` (or be a direct `rman run ...` call) and
  can include linters, formatters, or test runners.
- Caching is enabled to speed up repeated runs.
- The default install is done with `--no-save` to avoid modifying `package-lock.json`.

---

## 📄 License

This workflow is provided under the MIT License.
