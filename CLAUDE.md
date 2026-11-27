# CLAUDE.md

Reusable GitHub Actions workflows and composite actions that other Panates repositories call. This
repository ships no npm package: its artifact is the workflow file at a ref.

A handoff note between sessions goes to `.claude/local/handoff.md` (git-ignored); a new session reads
it first.

## The major IS a branch

`@v3` resolves to the **branch** `v3`, and there must never be a `v3` tag: with both, git calls the
ref ambiguous and picks the tag, shadowing the branch every consumer is pinned to. So a release is a
push to the major's branch and nothing else - no version tags, no npm publish. `v1.x` and `v2.x`
keep working unchanged.

Because of this, work lands on the major branch (`v3`), not through `dev`: `dev` is an ancestor of
`v3` and lags behind it. `main` still carries the old v1 line.

## Layout

- `.github/workflows/*.yaml` - the reusable workflows: `node-qc`, `node-release`, `pr-source`,
  `sonar`. Each one is `on: workflow_call` and is documented in `docs/<name>.md`.
- `.github/actions/stage-deploy/` - a composite action whose `src/index.mjs` is bundled by esbuild
  into `dist/index.js`. The bundle is committed, because an action runs from the ref, not from an
  install. `npm run build` writes it and the husky pre-commit hook runs that build.
- `docs/` - one page per workflow: inputs, secrets, outputs, steps, migration notes.

## Conventions

- This repository installs with **npm** (`package-lock.json`), not pnpm. The workflows it ships
  support both, through `panates/gh-setup-node@v2`, which detects the manager from the lockfile.
- Node.js setup, auth and installation belong to `panates/gh-setup-node@v2`, never to a direct
  `actions/setup-node` step here. It is also the only place that knows which npmrc npm reads.
- `rman` is pinned by major through the `RMAN_VERSION` env of the workflow that uses it.
- The three actions that handle a token - `actions/create-github-app-token` (twice) and
  `crazy-max/ghaction-github-runtime` in `node-release.yaml` - stay pinned to a commit SHA with the
  version in a trailing comment. The company standard asks for a version tag, and this repository
  deliberately does not follow it there, because a tag can be moved onto other code while a release
  workflow is handing out an App installation token and the job's runtime token. So `repo-check`
  reports `security.actions-by-tag` as `FAIL` by design; every other action here uses its tag.
- Every input gets a description that says *why*, not only what: these files are read by the people
  who call them, and a surprising default has cost a release before.
- An input holding a value that is not secret (a namespace, an image name) is an input, not a
  secret: a secret's value is masked everywhere and GitHub drops a job output that contains one.
- A change to a workflow a consumer already calls is a breaking change unless the old spelling keeps
  working.
