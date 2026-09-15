# 📦 Node.js Release Workflow (v2)

This reusable GitHub Actions workflow automates the release process for Node.js/monorepo projects,
powered by [`rman`](https://github.com/panates/rman):

- Bumps versions from conventional-commit messages (`rman version`)
- Generates changelogs per package (`rman changelog`)
- Cuts the GitHub Release, with notes covering everything that shipped under its tag
- Publishes to npm and/or builds+pushes Docker images (`rman publish`), per package `.rmanrc`
  `"publish.target"` config
- Optionally updates a separate "stage" deployment repository

`v1` (the previous, `gh-repository-info`-based pipeline) keeps working unchanged for repos that
haven't migrated yet - this page documents `v2` only.

---

## ✅ Quick start

Your own repo needs one thin "entry" workflow - **this is also the file you register as the npm
Trusted Publisher below**, so give it a stable, predictable name (`release.yml` recommended):

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

permissions:
  id-token: write # npm Trusted Publishing (OIDC)
  contents: write

jobs:
  release:
    uses: panates/github-actions/.github/workflows/node-release.yaml@v2
    permissions:
      id-token: write
      contents: write
    secrets:
      PERSONAL_ACCESS_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
      # Omit NPM_TOKEN once the package is registered as a Trusted Publisher - see below.
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
      DOCKERHUB_NAMESPACE: ${{ secrets.DOCKERHUB_NAMESPACE }}
      DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}
      DOCKERHUB_PASS: ${{ secrets.DOCKERHUB_PASS }}
```

Your repo needs a valid `.rmanrc`/`package.json#rman` (npm/yarn `workspaces` for a monorepo) - see
[rman's own docs](https://github.com/panates/rman#readme). Nothing else is required for npm
publishing; Docker publishing additionally needs each docker-shipping package's own
`"publish.target": ["docker"]` + `"publish.docker"` config (image name, platforms, ...). Two
repo-level settings are worth adding to your **root** `.rmanrc` right away:

```jsonc
{
  "version": { "changelog": true } // fold CHANGELOG.md into every bump commit
}
```

It is not a workflow flag on purpose - it's standing policy, so a bump you run locally behaves
exactly like one this workflow runs (see the Notes below).

---

## 🔐 npm Trusted Publishing (OIDC) - no more `NPM_TOKEN`

npm validates the **calling** workflow (this repo's own entry workflow above, not
`node-release.yaml` itself) - so switching a package over needs no change to this reusable
workflow or your entry file, just:

1. On npmjs.com, open the package → **Settings → Trusted Publisher** → add GitHub Actions, with:
   - **Repository**: your repo (e.g. `panates/your-repo`)
   - **Workflow filename**: whatever your entry workflow is actually named (`release.yml` if you
     used the template above - just the filename, not the path)
   - **Environment**: optional - set one if you want a GitHub Environment's protection rules
     (required reviewers, etc.) to gate publishing
2. Remove the `NPM_TOKEN` secret from your repo (or just stop passing it to this workflow).

`node-release.yaml` only ever writes an npmjs.org auth line into `.npmrc` when `NPM_TOKEN` is
actually given - omit it and npm's own CLI (≥ 11.5.1, which this workflow ensures) falls through to
OIDC automatically. This is **npmjs.org-only** - `npm.pkg.github.com` (via `github-registries`)
keeps using `PERSONAL_ACCESS_TOKEN` regardless, Trusted Publishing doesn't apply there.

---

## 🔧 Inputs

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `build_script` | string | `"rman build"` | Build command, run after versioning. |
| `workspace` | string | `${{ github.workspace }}` | Working directory for every step. |
| `node-version` | string | `""` | Node.js version. |
| `github-registries` | string | - | Comma-separated GitHub Packages namespaces (npm.pkg.github.com auth). |
| `cache-key` / `cache-path` | string | - | Restores a GitHub Actions cache before building (unrelated to rman - e.g. large downloaded binaries a Dockerfile's build context needs). |
| `stage-repository` / `stage-repository-branch` | string | - / `"main"` | A separate manifest repo to update after a successful release. |
| `stage-files` | string | - | `<cr>`-delimited `<package name>=<stage file path>` pairs. |

## 🔐 Secrets

| Name | Required | Description |
| --- | --- | --- |
| `PERSONAL_ACCESS_TOKEN` | ✅ Yes | GitHub token - checkout, pushing the version-bump commit/tag, the GitHub Release, GitHub Packages auth. |
| `NPM_TOKEN` | Optional | npmjs.org auth token - omit once the package uses Trusted Publishing. |
| `DOCKERHUB_NAMESPACE` / `DOCKERHUB_USERNAME` / `DOCKERHUB_PASS` | Optional | Required if any package targets `docker`, or `stage-repository` is set. |

---

## 🧱 Workflow steps summary

1. **Setup Environment** - checkout (full history **and tags**) + Node, via `panates/gh-setup-node@v1`.
2. **Docker login** - ahead of everything that writes, so bad credentials surface before a version
   has been bumped and pushed. A no-op without `DOCKERHUB_USERNAME`.
3. **What changed** - `rman changed --json`. Only decides whether a *new version number* is
   warranted; it is correctly empty when the bump already happened.
4. **Version** - `rman version --yes --push`, severity auto-detected from commits. Runs only when
   step 3 found something. Always ahead of the build: the published artifact carries whatever
   version `package.json` held when it was built.
5. **Build** - `build_script` (default `rman build`). Unconditional - a package may need its
   in-repo dependencies built even on a run that publishes nothing.
6. **Publish** - `rman publish --yes`, no `--target` filter - each package's own `.rmanrc
   "publish.target"` decides npm and/or docker. It publishes only what is actually due, so there is
   no separate gate in front of it; the plan is printed first purely to record what the run
   released (and to keep step 8 off a no-op run).
7. **GitHub Release** - `rman github-release --yes`. Unconditional, and after the publish so a
   failed registry push doesn't leave a release announcing code that never arrived. A no-op when
   the tag already has one.
8. **Stage Deploy** (separate job, only if `stage-repository` is set **and** something was actually
   published) - updates the manifest repo's deployment YAML with each Docker package's new image tag.

### Why `changed` is not the release signal

`changed` answers "does anything need a *new version number*", which is commit-driven - so it is
empty in exactly the cases where the bump already happened:

| | `changed` | actually due to publish |
| --- | --- | --- |
| CI bumps the version itself | non-empty | yes |
| Version bumped locally, merged in via a PR | **empty** | yes |
| Nothing new since the last release | empty | no |
| An earlier run's publish failed after the tag was pushed | **empty** | yes |

So `changed` only ever decides whether to *bump*. What is due to publish is `rman publish`'s own
question, answered per target against its own registry - and answered *after* the bump, since
before it a release this very run is about to create still reads as "up-to-date".

## 📄 Notes

- A push with nothing left to release - no new commits *and* every target already holding the
  current version - is a no-op: nothing is built, published, or released.
- **GitHub Releases come from `rman github-release`**, and need no configuration or opt-in of any
  kind - a release isn't somewhere a package ships to (that's `publish.target`: npm, Docker Hub,
  GitHub Packages), it's the repository's record that a version shipped, and every repo wants that
  record. One release per run, named after the repository's own release tag, with notes rman
  generates itself - bounded by the previous release and headed with each package's own version,
  which is what makes it correct for a monorepo whose packages sit on different version lines. A
  generic release action can't do this: notes generated before the bump don't know the version
  being released, and notes generated after it can't find the boundary any more.
- **The tags have to reach CI.** Both the release tag and the boundary its notes are measured from
  are read from git. A version bumped locally and pushed with a plain `git push` leaves its tags
  behind - use `rman version --push`, which sends them. `rman github-release` refuses to cut a
  release whose tag it can't find rather than producing one covering the whole history.
- **Deliberately *not* inputs here: `bump`, `preid`, `npm-publish`, `dockerize`, `rman-version`,
  `ignore-packages`.** Every one of these would be a static, workflow-level value applied
  identically to *every* future run - the wrong place for something that should vary per commit or
  per package:
  - Severity is always auto-detected from commits. A specific change needing a different severity
    than its own commit type implies (e.g. a `fix:` that's actually breaking) gets a
    `Release-As: patch|minor|major` footer on *that commit's* own message - `rman version` already
    honors it, no CI input needed. See
    [rman's severity auto-detection docs](https://github.com/panates/rman/blob/main/docs/cli/version.md#severity-auto-detection).
  - Whether a package publishes to npm, Docker, both, or neither is entirely `.rmanrc
    "publish.target"` - there's no separate `image-files`/Dockerfile-presence detection or
    `npm-publish`/`dockerize` toggle to keep in sync with it. A workflow-level override would just
    be a second, conflicting place that decision could live.
  - Excluding a package from publish (npm and Docker) and changelog generation permanently - e.g.
    it's released through some other process - is `.rmanrc "publish": { "skip": true }`, set in
    *that package's own* `.rmanrc` (`version` itself never consults it - the package still bumps
    normally) - see
    [rman's docs](https://github.com/panates/rman/blob/main/docs/cli/publish.md#excluding-a-package-entirely-rmanrc-publishskip).
    A repo-wide `ignore-packages` list in the *workflow* would be a second place that same fact
    could live, out of sync with the package's own directory.
  - Whether a bump commit also folds in `CHANGELOG.md` updates is `.rmanrc "version.changelog"`,
    not a `--changelog` flag this workflow passes - a standing policy, set once, behaves the same
    whether `rman version` runs here or a developer runs it locally themselves ahead of a merge - a
    flag is easy to forget on one side or the other and get inconsistent results.
  - A genuine prerelease channel (a permanent `--preid` for everything a given branch/workflow
    releases) isn't something this workflow has a documented pattern for yet - add it deliberately,
    with its own entry-workflow template, if/when a real need for one comes up.
  - The `rman` version this workflow runs is a floating major (`RMAN_VERSION` in
    `node-release.yaml`/`node-qc.yaml` themselves, currently `"1"`), not exposed as an input -
    every `1.x` fix/feature is picked up automatically, trusting semver's own major-version
    breaking-change boundary, without needing a coordinated `github-actions` release for each one.
    Bumping the major is a deliberate maintenance decision made here, not something a consumer
    repo should be able to drift independently.
- See [rman's own `publish` docs](https://github.com/panates/rman/blob/main/docs/cli/publish.md#docker-publishing-publishdocker)
  for the full `.rmanrc "publish.docker"` schema (platforms, build contexts, build args, ...).
