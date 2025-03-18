# NodeJS Quality Check Workflow

This is a reusable GitHub Actions workflow for performing quality checks on a NodeJS repository.

## Usage

To use this workflow in your GitHub repository, include the following in your workflow YAML file:

```yaml
type: workflow_call

jobs:
  call-quality-check:
    uses: panates/github-actions/.github/workflows/node-qc.yaml@v1
    secrets:
      PERSONAL_ACCESS_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
```

## Workflow Details

### **Trigger**: `workflow_call`
This workflow is designed to be called by other workflows and does not run independently.

### **Secrets**:
- `PERSONAL_ACCESS_TOKEN` **(required)**: A GitHub personal access token for authentication.

## Requirements
- This workflow requires Node.js and npm.
- Ensure the `qc` script is defined in `package.json`.
