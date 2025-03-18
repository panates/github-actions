# Sonar Analysis Workflow

This is a reusable GitHub Actions workflow for running SonarQube analysis on a repository.

## Usage

To use this workflow in your GitHub repository, include the following in your workflow YAML file:

```yaml
jobs:
  call-sonar-analysis:
    uses: panates/github-actions/.github/workflows/sonar.yml@main
    secrets:
      PERSONAL_ACCESS_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
      SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

## Workflow Details

### Trigger: `workflow_call`
This workflow is designed to be called by other workflows and does not run independently.

### Secrets:
- `PERSONAL_ACCESS_TOKEN` **(required)**: A GitHub personal access token for authentication.
- `SONAR_HOST_URL` **(required)**: The SonarQube server URL.
- `SONAR_TOKEN` **(required)**: The authentication token for SonarQube.
