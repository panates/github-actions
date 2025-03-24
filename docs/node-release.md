# 📦 Node.js Release Workflow

This reusable GitHub Actions workflow automates the release process for Node.js projects, including:

- Building the project
- Generating changelogs
- Creating GitHub Releases
- Publishing npm packages
- Building and optionally publishing Docker images

---

## ✅ How to Use

```yaml
jobs:
  release:
    uses: your-org/your-repo/.github/workflows/node-release.yaml@v1
    secrets:
      PERSONAL_ACCESS_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
      DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
      DOCKERHUB_PASS: ${{ secrets.DOCKERHUB_PASS }}
```

---

## 🔧 Inputs

| Name               | Type   | Required | Default                   | Description                           |
|--------------------|--------|----------|---------------------------|---------------------------------------|
| `build_script`     | string | No       | `npm run build`           | Build command to run                  |
| `workspace`        | string | No       | `${{ github.workspace }}` | Root directory for actions            |
| `npm-publish`      | string | No       | `true`                    | Whether to publish npm packages       |
| `dockerize`        | string | No       | `true`                    | Whether to build Docker images        |
| `docker-platforms` | string | No       | `linux/amd64`             | Platforms to target for Docker images |
| `stage_version`    | string | No       | `v1`                      | Stage file version prefix             |

---

## 🔐 Secrets

| Name                    | Required | Description                        |
|-------------------------|----------|------------------------------------|
| `PERSONAL_ACCESS_TOKEN` | ✅ Yes    | GitHub token for pushing releases  |
| `DOCKERHUB_USERNAME`    | Optional | DockerHub username for Docker push |
| `DOCKERHUB_PASS`        | Optional | DockerHub password for Docker push |

---

## 🧱 Workflow Steps Summary

1. **Setup Environment** — via `panates/gh-setup-node@v1`
2. **Scan Git Info** — fetch repo metadata and tags
3. **Changelog Generation** — using `node-build-changelog`
4. **GitHub Release** — via `ncipollo/release-action`
5. **Build Packages** — runs `build_script`
6. **Publish NPM Packages** — optional step
7. **Build Docker Images** — optional step, supports multi-platform builds

---

## 📄 Notes

- `COMMIT_CHANGELOG.md` is generated and used in the GitHub Release.
- Requires recent git tags for changelog generation.
- Docker publishing steps are only run if Docker packages are detected.

