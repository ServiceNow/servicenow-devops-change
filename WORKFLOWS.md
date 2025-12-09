# Release and Workflow Guide

This guide explains how to use the automated release workflows for this GitHub Action and provides detailed documentation about the CI/CD workflows.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Workflows Overview](#workflows-overview)
  - [Workflow Comparison Matrix](#workflow-comparison-matrix)
- [CodeQL Security Scan](#codeql-security-scan)
- [Test Release (Dry Run)](#test-release-dry-run)
  - [When to Use](#when-to-use)
  - [How to Run](#how-to-run)
  - [Technical Details](#technical-details-test-release)
- [Create Release (Production)](#create-release-production)
  - [When to Use](#when-to-use-production)
  - [How to Run](#how-to-run-production)
  - [Technical Details](#technical-details-create-release)
- [Best Practices](#best-practices)
  - [Versioning](#versioning)
  - [Release Checklist](#release-checklist)
  - [Writing Good Release Notes](#writing-good-release-notes)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)
- [Support](#support)

---

## Overview

We have two primary workflows for releasing this GitHub Action:

1.  **Test Release** - A safe, dry-run environment that creates a *draft* release.
2.  **Create Release** - The production workflow that publishes a *public* release to the GitHub Marketplace.

**Always test first with a Test Release before creating a production release!**

---

## Workflows Overview

This repository uses GitHub Actions for CI/CD, including security scanning and automated releases.

### Workflow Comparison Matrix

| Workflow | Purpose | Trigger | Creates Release | Safe for Testing |
|----------|---------|---------|----------------|------------------|
| **`codeql.yml`** | Security scanning | Auto + Manual | No | ✅ Yes |
| **`create-release.yml`** | Production release | Manual | Yes (Published) | ⚠️ No |
| **`test-release.yml`** | Test release process | Manual | Yes (Draft only) | ✅ Yes |

---

## CodeQL Security Scan

This workflow automatically scans the codebase for security vulnerabilities using GitHub's CodeQL analysis to identify security risks and code quality issues.

-   **File:** `.github/workflows/codeql.yml`
-   **Purpose:** To automate security scanning and identify vulnerabilities before they are introduced into the main branch.
-   **Triggers:** 
    -   **Pull Requests:** Runs on all PRs targeting the `main` branch.
    -   **Schedule:** Runs weekly (every Monday at 00:00 UTC).
    -   **Manual:** Can be triggered manually.

### What It Does

1.  **Initializes CodeQL:** Sets up the CodeQL engine with JavaScript language support.
2.  **Runs Analysis:** Executes the `security-extended` query suite for a comprehensive scan.
3.  **Uploads Results:** Reports findings to the **Security** tab under **Code scanning alerts**.


### Permissions & Configuration

-   **Permissions:**
    -   `actions: read`: To read workflow information.
    -   `contents: read`: To read repository contents for scanning.
    -   `security-events: write`: To write security scan results to the Security tab.
-   **Query Suite:** `security-extended`
-   **Runner:** `ubuntu-latest`

### How to Use

-   The workflow runs automatically. Review results in the **Security** tab and address any identified vulnerabilities before merging pull requests.

---

## Test Release (Dry Run)

Use this workflow to test the release process safely without publishing anything. It creates a draft release for validation.

### When to Use

- Before a production release to ensure everything works.
- When testing changes to the build or release workflow.
- To validate release notes and artifacts.

### How to Run

1.  Navigate to the **Actions** tab in the GitHub repository.
2.  Select **"Test Release (Dry Run)"** from the workflow list.
3.  Click the **"Run workflow"** button.
4.  Fill in the required inputs:

| Input | Example | Description |
|---|---|---|
| **Tag** | `v2.0.0-test` | Use a test suffix like `-test`, `-rc1`, or `-beta`. |
| **Release notes** | `Testing release automation` | A brief description for the test. |
| **Set as latest** | ☐ Unchecked | Leave unchecked for testing. |
| **Set as pre-release** | ✓ Checked | Mark as a pre-release for testing. |

5.  Click **"Run workflow"**.

After the workflow completes, review the draft release, then delete it.

### Technical Details (test-release.yml)

-   **File:** `.github/workflows/test-release.yml`
-   **Trigger:** Manual (`workflow_dispatch`)
-   **Permissions:** `contents: write`

**Workflow Steps:**

1.  **Validation:** Checks tag format, verifies the current branch is `main`, and checks if the tag already exists.
2.  **Build:** Installs dependencies (`npm ci`), builds the distribution (`npm run build`), and verifies the build artifacts.
3.  **Simulation:** Shows what commands would run, checks for uncommitted changes, and simulates tag creation without pushing.
4.  **Draft Release:** Creates a non-published **DRAFT** release, adds a "TEST" label to the release name, and includes a warning in the release body.
5.  **Summary:** Shows all validation results, provides the draft release URL, and lists cleanup steps.


### Testing Checklist

- [ ] Workflow completes without errors
- [ ] All validation steps pass
- [ ] Build succeeds
- [ ] Draft release is created
- [ ] Release notes are formatted correctly
- [ ] Delete draft release after review
- [ ] Ready to run production release

---

## Create Release (Production)

This workflow creates and publishes a real, public release to the GitHub Marketplace.

### ⚠️ Important

-   This is for **production releases only**.
-   Ensure you have successfully run a **Test Release** first.
-   You must be on the `main` branch.

### How to Run

1.  Go to the **Actions** tab.
2.  Select **"Create Release"** from the workflow list.
3.  Click **"Run workflow"**.
4.  Fill in the inputs:

| Input | Example | Description |
|---|---|---|
| **Tag** | `v2.0.0` | Must follow semantic versioning (e.g., `v*.*.*`). |
| **Release notes** | See example below | Detailed notes for the release. |
| **Set as latest** | ✓ Checked | Mark as the latest official release. |
| **Set as pre-release** | ☐ Unchecked | Only check for beta or RC versions. |

5.  Click **"Run workflow"**.

### Example Release Notes

```markdown
## What's New

### Features
- Added support for deployment gates
- Improved error handling and logging
- Updated to use token-based authentication

### Bug Fixes
- Fixed issue with change request creation timeout
- Resolved npm build errors in CI/CD

### Dependencies
- Updated axios to v1.7.7
- Updated @actions/core to v1.10.1

### Breaking Changes
None

### Upgrade Instructions
Simply update your workflow to use `@v2.0.0` instead of the previous version.
```

### Technical Details (create-release.yml)

-   **File:** `.github/workflows/create-release.yml`
-   **Trigger:** Manual (`workflow_dispatch`)
-   **Permissions:** `contents: write`

**Workflow Steps:**

1.  **Validation Phase:** Enforces strict tag format (`v*.*.*`), checks for existing tags, and verifies the branch is `main`.
2.  **Build Phase:** Sets up Node.js, installs dependencies with `npm ci`, builds the distribution with `npm run build`, and verifies that `dist/index.js` exists.
3.  **Commit Phase:** Commits and pushes build artifacts to the `main` branch.
4.  **Release Phase:** Creates an annotated Git tag, pushes the tag, and publishes the final release to GitHub.
5.  **Summary Phase:** Provides the release URL and a post-release checklist.

### Post-Release Checklist

After the workflow completes successfully, follow these steps:

- [ ] **Verify the release** at the URL provided in the workflow summary.
- [ ] **Check GitHub Marketplace** to confirm the new version appears (this may take 5-10 minutes).
- [ ] **Inform the QE team** to begin testing the new version.
- [ ] **Monitor for issues** from users.
- [ ] **Update documentation** if needed.

---

## Best Practices

### Versioning

Follow [Semantic Versioning (SemVer)](https://semver.org/):

-   **Major** (`v2.0.0`): For breaking changes.
-   **Minor** (`v2.1.0`): For new, backward-compatible features.
-   **Patch** (`v2.1.1`): For backward-compatible bug fixes.

### Release Checklist

-   [ ] All changes are merged into the `main` branch.
-   [ ] All automated tests are passing.
-   [ ] A **Test Release** was successful.
-   [ ] Release notes are prepared and follow the recommended format.
-   [ ] The version number is correct and follows SemVer.

### Writing Good Release Notes

**Do:**
- ✅ List all new features
- ✅ Document bug fixes
- ✅ Note any breaking changes
- ✅ Include upgrade instructions
- ✅ Credit contributors

**Don't:**
- ❌ Be vague ("various improvements")
- ❌ Use internal jargon
- ❌ Forget to mention breaking changes
- ❌ Skip upgrade instructions

A good format example:

```markdown
## What's New

### Features
- Added support for deployment gates.

### Bug Fixes
- Fixed an issue with change request timeouts.

### Breaking Changes
- None.
```

---

## Quick Reference

### Test Release Command
```
Actions → Test Release (Dry Run) → Run workflow
Tag: v2.0.0-test
```

### Production Release Command
```
Actions → Create Release → Run workflow
Tag: v2.0.0
```

### After Production Release
1. Verify release page
2. Check GitHub Marketplace
3. Inform QE team
4. Monitor for issues

---

## Troubleshooting

-   **"Tag already exists"**: Choose a new version number or delete the conflicting tag if it was a mistake.
-   **Build Fails**: Run `npm ci && npm run build` locally to debug. Check for missing dependencies in `package.json`.
-   **Not on `main` branch**: Switch to the `main` branch and pull the latest changes.
-   **Release not in Marketplace**: Wait 5-10 minutes. Ensure the release is marked as "latest" and `action.yml` is correct.

---

## Additional Resources

-   [GitHub Actions Documentation](https://docs.github.com/en/actions)
-   [CodeQL Documentation](https://codeql.github.com/docs/)
-   [ServiceNow DevOps Documentation](https://docs.servicenow.com/bundle/vancouver-it-service-management/page/product/enterprise-dev-ops/concept/dev-ops-change-control.html)
-   [Semantic Versioning](https://semver.org/)
-   [Keep a Changelog](https://keepachangelog.com/)

---

## Support

For issues or questions:
- **GitHub Issues:** [Create an issue](https://github.com/ServiceNow/servicenow-devops-change/issues)
- **ServiceNow Support:** [Now Support Portal](https://support.servicenow.com/)
