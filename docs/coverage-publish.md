# Coverage Publish Workflow

Sends the coverage report of the code being released to Coveralls, from the release workflow. Coveralls' release branch (`main`) then shows the released code under the release commit.

A repository that tests on `dev` and releases by merging `dev` into `main` does not test again on `main`. Coveralls' `main` therefore never received a build when the test run uploaded the report itself.

## Usage

The test workflow keeps the report as an artifact instead of sending it:

```yaml
      - name: Keep the coverage report for the release
        if: ${{ matrix.node == '24' }}
        uses: actions/upload-artifact@v7
        with:
          name: coverage
          path: coverage/lcov.info
```

The release workflow publishes it, next to [`pr-source.yaml`](../.github/workflows/pr-source.yaml):

```yaml
jobs:
  source:
    uses: panates/github-actions/.github/workflows/pr-source.yaml@v3
    permissions:
      contents: read
      pull-requests: read

  test:
    needs: source
    if: needs.source.outputs.head-ref != 'dev'
    uses: ./.github/workflows/test.yml

  coverage:
    needs: [source, test]
    if: >
      always() && !cancelled() &&
      needs.source.result == 'success' &&
      (needs.test.result == 'success' ||
       (needs.test.result == 'skipped' && needs.source.outputs.head-ref == 'dev'))
    uses: panates/github-actions/.github/workflows/coverage-publish.yaml@v3
    permissions:
      actions: read
      contents: read
      pull-requests: read
    with:
      pr-number: ${{ needs.source.outputs.head-ref == 'dev' && needs.source.outputs.pr-number || '' }}
```

Point the README badge at the release branch: `https://img.shields.io/coveralls/<org>/<repo>/main.svg`.

## Inputs

| Name | Default | Description |
| --- | --- | --- |
| `pr-number` | `""` | The pull request the release came from. The report comes from the successful test run of its head commit, found by that exact SHA. Empty: the report comes from this run's own `test` job. |
| `workflow` | `test.yml` | The file name of the workflow that uploads the report. |
| `artifact` | `coverage` | The artifact's name. |
| `file` | `lcov.info` | The report's file name inside the artifact. |

## Never fails a release

When there is no successful test run for the head commit (a `no-test` push, a deleted run), no artifact (expired after the retention period), or Coveralls refuses the upload, the job warns and ends green.
