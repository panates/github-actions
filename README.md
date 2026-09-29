# Reusable Workflows for GitHub Actions

This Repository contains reusable workflows for GitHub Actions.

`node-release.yaml`/`node-qc.yaml` have a **v3**, powered by [`rman` 2.x](https://github.com/panates/rman)
(version bump, changelog, npm + Docker publish are all driven by rman/`.rmanrc`, and npm
[Trusted Publishing (OIDC)](./docs/node-release.md#-npm-trusted-publishing-oidc---no-more-npm_token)
actually works — before v3 it could not, because npm never attempted the OIDC exchange without a
configured registry).

`v1` and `v2` keep working unchanged. **`@v3` requires migrating your `.rmanrc` to rman 2** — see
[Migrating to v3](./docs/node-release.md#-migrating-to-v3).

## Workflows

- NodeJS Quality Check Workflow

  [node-qc.yaml](./docs/node-qc.md)


- NodeJS Release Workflow

  [node-release.yaml](./docs/node-release.md)


- Sonar Analysis Workflow
  
  [sonar.yaml](./docs/sonar.md)


## 🔖 Versioning — the major IS a branch

`@v3` resolves to the **branch** named `v3`. There is no `v3` tag, and there must never be one:
GitHub resolves `@ref` as any git ref, and with both a branch and a tag called `v3` the reference is
ambiguous — measured, git warns `refname 'v3' is ambiguous` and resolves it to the **tag**, which
would silently shadow the branch every consumer is pinned to.

So a release is a push to the major's branch, and nothing else. `major-tag.yaml` and the `tag:*`
npm scripts are gone with the mechanism they served.

- Each major line lives on its own branch: `v1.x`, `v2.x`, `v3`.
- **Consequence to know: `@v3` is always the branch tip**, so anything pushed there reaches every
  consumer immediately. Land work through a PR; a direct push is a release.
- `v1` and `v2` remain *tags* (`v1.x`/`v2.x` are their branches) — that is the older convention and
  it stays frozen for those lines. Do not add a branch named `v1` or `v2` either, for the same
  ambiguity reason in reverse.

> The old tag flow is why `@v2` drifted: its tag points two commits behind `v2.x`, because moving it
> was a manual step that got skipped.

## 📄 License

This project is licensed under the **MIT License**.
