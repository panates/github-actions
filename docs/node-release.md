# 📦 Node.js Release Workflow (v3)

This reusable GitHub Actions workflow automates the release process for Node.js/monorepo projects,
powered by [`rman`](https://github.com/panates/rman):

- Bumps versions from conventional-commit messages (`rman version`)
- Generates changelogs per package (`rman changelog`)
- Cuts the GitHub Release, with notes covering everything that shipped under its tag
- Publishes to npm and/or builds+pushes Docker images (`rman publish`), per package `.rmanrc`
  `"publish.target"` config
- Optionally updates a separate "stage" deployment repository

`v1` (the previous, `gh-repository-info`-based pipeline) keeps working unchanged for repos that
haven't migrated yet - this page documents `v3` only.

> **⚠️ `@v3` requires rman 2.x.** Migrate your `.rmanrc` before pointing at it - see
> [Migrating to v3](#-migrating-to-v3) at the bottom. `@v2` keeps running rman 1.x.

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
    uses: panates/github-actions/.github/workflows/node-release.yaml@v3
    permissions:
      id-token: write
      contents: write
    secrets:
      # Optional since v3 - needed only for npm.pkg.github.com and for `stage-repository`.
      # The checkout and `rman version --push` use the job's own GITHUB_TOKEN.
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

`panates/gh-setup-node@v2` writes an npmjs.org auth line only when `NPM_TOKEN` is actually given;
omit it and OIDC is the only credential left. Two details it handles that are easy to get wrong if
you ever configure npm auth yourself:

- **npm only attempts the OIDC exchange when a default registry is configured.** Without
  `registry-url` on `setup-node`, publishing fails with `ENEEDAUTH` - which is why every release
  before v3 could publish with a token and only with a token, whatever this page claimed.
- **`registry-url` makes `setup-node` write a placeholder `_authToken` line, which has to be
  removed.** With nothing behind it, npm reads *having* the entry as being authenticated, never
  reaches for OIDC, and the registry answers `404`
  ([actions/setup-node#1551](https://github.com/actions/setup-node/issues/1551)). It is also
  written into the file `NPM_CONFIG_USERCONFIG` points at, **not** `~/.npmrc`.

The npm CLI version needs no intervention: Node 24 ships npm 11.19.0, past the 11.5.1 OIDC needs.
v2 ran `npm install -g npm@latest` as insurance and it took the job to npm 12.1.0 instead; that step
is gone.

This is **npmjs.org-only** - `npm.pkg.github.com` keeps using `PERSONAL_ACCESS_TOKEN` regardless,
Trusted Publishing doesn't apply there.

---

## 🔧 Inputs

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `build_script` | string | `"rman build"` | Build command, run after versioning. |
| `workspace` | string | `${{ github.workspace }}` | Working directory for every step. |
| `node-version` | string | `""` | Node.js version. |
| `github-registries` | string | - | Scopes to **route** to npm.pkg.github.com, or `"auto"`. Needed only to *install* a dependency hosted there - publishing is routed by each package's own `publishConfig.registry` and authenticated by `PERSONAL_ACCESS_TOKEN`, neither of which needs a scope list. |
| `cache-key` / `cache-path` | string | - | Restores a GitHub Actions cache before building (unrelated to rman - e.g. large downloaded binaries a Dockerfile's build context needs). |
| `stage-repository` / `stage-repository-branch` | string | - / `"main"` | A separate manifest repo to update after a successful release. |
| `stage-files` | string | - | `<cr>`-delimited `<package name>=<stage file path>` pairs. |

## 🔐 Secrets

| Name | Required | Description |
| --- | --- | --- |
| `PERSONAL_ACCESS_TOKEN` | Optional | GitHub Packages auth, and `stage-repository` (a different repo, which the job's GITHUB_TOKEN cannot reach). **Not** used for git: the checkout and `rman version --push` use the job's own GITHUB_TOKEN, which is also why a release does not trigger a second run of itself. |
| `NPM_TOKEN` | Optional | npmjs.org auth token - omit once the package uses Trusted Publishing. |
| `DOCKERHUB_NAMESPACE` / `DOCKERHUB_USERNAME` / `DOCKERHUB_PASS` | Optional | Required if any package targets `docker`, or `stage-repository` is set. |

---

## 🧱 Workflow steps summary

1. **Setup Environment** - checkout (full history **and tags**) + Node + npm auth + `npm ci`, via
   `panates/gh-setup-node@v2`. It also installs the pinned `rman` globally, so `build_script`'s
   default `rman build` runs the same version every other step does.
2. **Docker login** - ahead of everything that writes, so bad credentials surface before a version
   has been bumped and pushed. A no-op without `DOCKERHUB_USERNAME`.
3. **Version** - `rman version --yes --push`, severity auto-detected from commits. Unconditional;
   it writes nothing when no package has commits warranting a bump. Always ahead of the build: the
   published artifact carries whatever version `package.json` held when it was built.
4. **Sync the lockfile** - `rman` writes `package.json` and does not manage lockfiles, so the
   release commit leaves `package-lock.json` on the previous version. Committed separately, never
   amended into the release commit whose tag is already pushed. See
   [Why the lockfile needs a step of its own](#why-the-lockfile-needs-a-step-of-its-own).
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

### Why the lockfile needs a step of its own

**npm does not report this drift - it is the one mismatch it stays quiet about.** Measured on a real
release, with `package.json` at `2.0.0` and the lockfile still at `2.0.0-beta.5`:

| package.json changed | `npm ci` |
| --- | --- |
| a **dependency** the lockfile does not have | `EUSAGE`, refuses: *"Missing: ansi-colors@4.1.3 from lock file"* |
| only the **`version`** field | silent, exit 0, `change rman 2.0.0 => 2.0.0-beta.5` |

The second row is exactly what `rman version` produces. So without this step the lockfile rots from
one release to the next and nothing ever turns red - Dependabot and any SBOM or audit tooling keep
reading a stale record, and the next plain `npm install` rewrites it into an unrelated pull
request's diff.

**The install itself is fine either way**, which is why this went unnoticed: a workspace package is
a symlink, so the real version is served regardless of what the lockfile says. This is a record
being wrong, not a broken tree - worth fixing, not worth panicking about.

**This is not a reason to delete the lockfile in CI.** That trade was tried and it costs more than
it buys: CI then resolves fresh on every run while the committed lockfile freezes forever, so CI,
every developer, and the repository's own record all test different trees - and the vulnerability
count GitHub reports is measured against that frozen file, which the deletion never touches.
Reproducibility goes with it: two runs of the same commit can produce different artifacts, and a bad
or compromised patch release of any transitive dependency reaches the published package with no diff
to review. Keep `npm ci`, and keep dependencies fresh deliberately - Renovate or Dependabot, where
each update arrives as a reviewable pull request that CI proves before it merges.

### Why there is no gate in front of `version`

v2 ran `rman changed --json` first and skipped `version` when it came back empty. **rman 2 removed
`changed`, and the gate deserved removing on its own merits** - it answers "does anything need a
*new version number*", which is commit-driven, so it is empty in exactly the cases where the bump
already happened:

| | `changed` | actually due to publish |
| --- | --- | --- |
| CI bumps the version itself | non-empty | yes |
| Version bumped locally, merged in via a PR | **empty** | yes |
| Nothing new since the last release | empty | no |
| An earlier run's publish failed after the tag was pushed | **empty** | yes |

`rman version` is already a no-op in the "nothing new" row, so the gate never decided anything the
command would not have decided itself.

**Do not reintroduce it as `rman version --json | jq 'select(.status == "bump")'`.** That plan
includes the monorepo **root**, whose entry is informational (`"isRoot": true`, *"monorepo root is
never published on its own"*) - so a script reading it can end up with exactly one name to release,
and that name is the one thing that must never be published. What is due to publish is
`rman publish`'s own question, answered per target against its own registry.

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
    `node-release.yaml`/`node-qc.yaml` themselves, currently `"2"`), not exposed as an input -
    every `2.x` fix/feature is picked up automatically, trusting semver's own major-version
    breaking-change boundary, without needing a coordinated `github-actions` release for each one.
    Bumping the major is a deliberate maintenance decision made here, not something a consumer
    repo should be able to drift independently.
- See [rman's own `publish` docs](https://github.com/panates/rman/blob/main/docs/cli/publish.md#docker-publishing-publishdocker)
  for the full `.rmanrc "publish.docker"` schema (platforms, build contexts, build args, ...).

---

## 🚚 Migrating to v3

`@v3` runs rman 2.x. Point `uses:` at `@v3` only after your `.rmanrc` is migrated — and note that
**rman 2 removed the JSON Schema**, so an `.rmanrc`/`.rmanrc.yml` key that no longer exists is now
dropped in silence rather than flagged by your editor.

### The one that is not mechanical

**An unmarked key now cascades to the repository root as well.** In 1.x the root was the one level
whose unmarked config stayed put; in 2.x every directory cascades, and `"[/]"` is how you address
the root.

This bites `run.<script>` hooks. On the root they are a repo-wide bookend run once at the repository
root; on a package they are that package's own hook run in its directory. Cascaded, one declaration
is now both:

```yaml
# 1.x - a hook written for packages
run:
  build:
    after: node ../../support/postbuild.cjs   # now ALSO runs at the root, where it cannot resolve

# 2.x - say which audience it is for
"[*]":
  run: { build: { after: node ../../support/postbuild.cjs } }
```

### Mechanical

| 1.x | 2.x |
| --- | --- |
| `"[ws:*]"` | `"[*]"` (still accepted, but retired from the docs) |
| `"[*]"` meaning "everything including the root" | unmarked |
| a root-only key (`allowBranch`, `version.*`, `githubRelease.*`) | `"[/]"` |
| `publish.directory` | `publish.npm.directory` — **refused with an error**, not ignored |
| `plugins: ['node']` | nothing; the `node` preset is laid under every root by default |
| `platform: 'node'` as a way to *load* the built-in | nothing, for the same reason — it only *names* a technology now |
| `+key: [...]` (append) | `key: "${{ [...value, 'x'] }}"` — **refused with an error** |
| `repository.git.*` in an expression | `git.*` (top level, beside `env`) |

### The one that bites at the Build step

**A script the monorepo root declares no longer counts as the script being defined.** The root
contributes only `pre`/`post` bookends, so under rman 2 a `run` whose script exists only there fails
with

```
No package defines a "build" script.
```

and exits 1 - where rman 1 ran nothing and reported success. It lands on the `Build` step, **after
`Version` has already bumped and pushed**, which is the worst place to find out. Two things to check
before pointing a repository at `@v3`:

| | |
| --- | --- |
| no package declares `build` | set `build_script: 'npm run build'` so npm runs the root script |
| a `qc_script` of `rman run qc`, with `qc` only at the root | make it `npm run qc` |

The recovery if it does happen is undramatic: `publish` never looks at whether `version` ran, so
fixing the input and re-running releases exactly what the bump produced.

### Commands

- **`rman changed` is gone.** Nothing in this workflow calls it any more; if your own scripts do,
  see [Why there is no gate in front of `version`](#why-there-is-no-gate-in-front-of-version).
- **`rman lint` is gone** — the built-in alias was removed so that a repository can contribute a
  `lint` command of its own (a built-in name cannot be shadowed). `rman run lint` and every
  `run.lint` key are unchanged. If you extend `@panates/rman-preset`, this is the change that lets
  its own `lint` command load at all.
- `--root` is now `--from-root`; `--from npm` is now `--from auto`.
