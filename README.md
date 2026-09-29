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



## 📄 License

This project is licensed under the **MIT License**.
