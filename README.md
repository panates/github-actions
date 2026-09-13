# Reusable Workflows for GitHub Actions

This Repository contains reusable workflows for GitHub Actions.

`node-release.yaml`/`node-qc.yaml` have a **v2**, powered by [`rman`](https://github.com/panates/rman)
(version bump, changelog, npm + Docker publish are all driven by rman/`.rmanrc` now, and npm
[Trusted Publishing (OIDC)](./docs/node-release.md#-npm-trusted-publishing-oidc---no-more-npm_token)
is supported) - `v1` keeps working unchanged for repos that haven't migrated; migrate at your own
pace by pointing `uses:` at `@v2` and following [docs/node-release.md](./docs/node-release.md).

## Workflows

- NodeJS Quality Check Workflow

  [node-qc.yaml](./docs/node-qc.md)


- NodeJS Release Workflow

  [node-release.yaml](./docs/node-release.md)


- Sonar Analysis Workflow
  
  [sonar.yaml](./docs/sonar.md)



## 📄 License

This project is licensed under the **MIT License**.
