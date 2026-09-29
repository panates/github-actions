# ✅ Node.js Quality Check Workflow (v3)

This reusable GitHub Actions workflow runs quality control checks on a Node.js project: it checks
out, installs Node, installs dependencies from the lockfile, and runs your QC script.

> **⚠️ `@v3` requires rman 2.x** if your `qc_script` calls rman. See
> [Migrating to v3](./node-release.md#-migrating-to-v3).

---

## 🚀 Usage

```yaml
jobs:
  quality-check:
    uses: panates/github-actions/.github/workflows/node-qc.yaml@v3
```

For a monorepo (managed with [`rman`](https://github.com/panates/rman)), point `qc_script` at
`rman run` so QC only touches packages that actually changed:

```yaml
jobs:
  quality-check:
    uses: panates/github-actions/.github/workflows/node-qc.yaml@v3
    with:
      qc_script: "rman run qc --changed-since origin/main"
      fetch-depth: "0" # --changed-since compares against a ref a shallow clone does not have
```

`rman` is installed globally at the version this workflow pins, so `qc_script` can call it by name.

---

## 🔧 Inputs

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `qc_script` | string | `"npm run qc"` | Command to run for QC - e.g. `"rman run qc --changed-since <ref>"` for a monorepo. |
| `node-version` | string | `""` | Node.js version. |
| `fetch-depth` | string | `"1"` | Commits to fetch. **`--changed-since` needs `"0"`.** |
| `install` | string | `"ci"` | `"ci"` (from the lockfile), `"install"` (resolve fresh), or `"false"` (skip). |
| `github-registries` | string | - | Scopes to route to npm.pkg.github.com, or `"auto"` - needed only to install a dependency hosted there. |

## 🔐 Secrets

| Name | Required | Description |
| --- | --- | --- |
| `PERSONAL_ACCESS_TOKEN` | Optional | Only for `npm.pkg.github.com`. The checkout uses the job's own GITHUB_TOKEN. |

---

## 🧪 Workflow Steps

1. **Setup Environment** — `panates/gh-setup-node@v2`: checkout, Node, npm auth, `npm ci`, and the
   pinned `rman`.
2. **Run QC Tests** — `qc_script`.

---

## 🚚 Migrating from v2

| v2 | v3 |
| --- | --- |
| `rman-ci: "true"` | `install: "ci"` (now the default) |
| `rman-ci: "false"` → `npm install --only=dev --no-save` | `install: "ci"`, or `install: "install"` to resolve fresh |
| `PERSONAL_ACCESS_TOKEN` required | optional |
| `qc_script: "npx --yes rman@1 run qc ..."` | `qc_script: "rman run qc ..."` |

Three behaviours changed, and each was a defect rather than a preference:

- **`rman-ci` is gone.** It chose between `npm install --only=dev --no-save` and `npx rman ci`, and
  neither is what a QC run wants. `--only=dev` is npm's deprecated spelling of `--omit=prod` and
  leaves out the runtime dependencies a test actually imports; `rman ci` wipes `node_modules` across
  every workspace to reinstall from scratch, which is a repair tool. `npm ci` installs exactly the
  lockfile, which is what CI is for.
- **The lockfile is no longer deleted before installing.** `panates/gh-setup-node@v1` ran
  `rm -f package-lock.json && npm install --no-save`, so QC checked a dependency set nobody had
  pinned or seen. If `npm ci` now fails with a `package.json` / `package-lock.json` mismatch, that
  drift is real and committed — regenerate with `npm install --package-lock-only` and commit it.
  `install: "install"` is the way down if you cannot today.
- **The repository was being checked out twice**, once by `actions/checkout` and once inside the
  setup action. Now once, with `fetch-depth` under your control — which is what makes
  `--changed-since` usable at all.

---

## 📄 Notes

- The `qc_script` should be defined in your `package.json` (or be a direct `rman run ...` call) and
  can include linters, formatters, or test runners.
- Caching is npm's download cache (`~/.npm`), keyed by the lockfile — not `node_modules`, which is
  not portable across Node versions.

---

## 📄 License

This workflow is provided under the MIT License.
