# ✅ Node.js Quality Check Workflow

This reusable GitHub Actions workflow performs quality control checks on a Node.js project by installing development
dependencies and running custom `npm run qc` scripts.

---

## 🚀 Usage

To include this quality check workflow in your project, call it from another workflow:

```yaml
jobs:
  quality-check:
    uses: your-org/your-repo/.github/workflows/node-qc.yaml@v1
    secrets:
      PERSONAL_ACCESS_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
```

---

## 🔐 Required Secrets

| Name                    | Description                                                                       |
|-------------------------|-----------------------------------------------------------------------------------|
| `PERSONAL_ACCESS_TOKEN` | GitHub Personal Access Token used for npm authentication and package installation |

---

## 🧪 Workflow Steps

1. **Check out the repository** using `actions/checkout@v4`
2. **Set up the Node.js environment** with `panates/gh-setup-node@v1`
    - Skips dependency installation
    - Enables caching with a custom key
3. **Installs only development dependencies** using `npm install --only=dev`
4. **Runs quality control checks** via `npm run qc`

---

## 📄 Notes

- The `npm run qc` script should be defined in your `package.json` and can include linters, formatters, or test runners.
- Caching is enabled to speed up repeated runs.
- Dependencies are installed with `--no-save` to avoid modifying `package-lock.json`.

---

## 📄 License

This workflow is provided under the MIT License.
