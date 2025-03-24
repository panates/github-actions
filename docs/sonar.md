# 🔍 SonarQube Analysis Workflow

This **reusable GitHub Actions workflow** performs static code analysis using **SonarQube**, suitable for integration
into CI pipelines to maintain code quality.

---

## ✅ Usage

To use this workflow in another repository:

```yaml
jobs:
  sonar-analysis:
    uses: your-org/your-repo/.github/workflows/sonar.yaml@v1
    secrets:
      PERSONAL_ACCESS_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
      SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

---

## 🔐 Required Secrets

| Name                    | Description                        |
|-------------------------|------------------------------------|
| `PERSONAL_ACCESS_TOKEN` | GitHub Personal Access Token       |
| `SONAR_HOST_URL`        | The URL of your SonarQube server   |
| `SONAR_TOKEN`           | Authentication token for SonarQube |

---

## 🧱 Workflow Summary

1. ✅ **Validates required secrets**.
2. 📥 **Checks out the repository**.
3. 🐳 **Runs SonarQube scanner via Docker**, passing in required environment variables.

---

## 💡 Notes

- This workflow runs on a **`self-hosted` runner**. Make sure Docker is available on the runner machine.
- Ensure the repository has recent commits for accurate analysis by SonarQube.
- `docker run` is used with `sonarsource/sonar-scanner-cli` to scan the code inside the working directory.

---

## 📄 License

This workflow is released under the MIT License.
