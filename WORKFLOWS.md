# GitHub Actions Workflows Documentation

This document provides detailed information about all GitHub Actions workflows in this repository.

---

## Table of Contents

1. [CodeQL Security Scan](#1-codeql-security-scan)
2. [Create Release](#2-create-release)
3. [Test Release (Dry Run)](#3-test-release-dry-run)

---

## 1. CodeQL Security Scan

**File:** `.github/workflows/codeql.yml`

### Purpose
Automated security scanning using GitHub's CodeQL analysis to identify security vulnerabilities and code quality issues in the JavaScript codebase.

### Triggers
- **Pull Requests:** Runs on all PRs targeting the `main` branch
- **Schedule:** Runs every Monday at 00:00 UTC (weekly scan)
- **Manual:** Can be triggered manually via `workflow_dispatch`

### What It Does
1. Checks out the repository
2. Initializes CodeQL with JavaScript language support
3. Runs security-extended queries for comprehensive analysis
4. Automatically builds the project
5. Performs CodeQL analysis and uploads results to GitHub Security tab

### Permissions Required
- `actions: read` - Read workflow information
- `contents: read` - Read repository contents
- `security-events: write` - Write security scan results

### Configuration
- **Language:** JavaScript
- **Query Suite:** `security-extended` (comprehensive security checks)
- **Runner:** `ubuntu-latest`

### When to Use
- Automatically runs on every PR and weekly
- Review results in the **Security** tab → **Code scanning alerts**
- Address any identified vulnerabilities before merging

---

## 2. Create Release

**File:** `.github/workflows/create-release.yml`

### Purpose
Automates the complete release process for publishing new versions of the ServiceNow DevOps Change GitHub Action to the marketplace.

### Triggers
- **Manual Only:** `workflow_dispatch` with required inputs

### Required Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `tag` | string | ✅ Yes | - | Release version tag (e.g., `v2.0.0`) |
| `release_notes` | string | ✅ Yes | - | Description/release notes for the release |
| `set_as_latest` | boolean | No | `true` | Mark this release as the latest |
| `is_prerelease` | boolean | No | `false` | Mark this release as a pre-release |

### Workflow Steps

1. **Validation Phase**
   - ✅ Validates tag format (must be `v*.*.*` format, e.g., `v2.0.0`)
   - ✅ Checks if tag already exists (prevents duplicates)
   - ✅ Verifies current branch is `main`

2. **Build Phase**
   - ✅ Sets up Node.js 18.x
   - ✅ Installs dependencies with `npm ci`
   - ✅ Builds distribution with `npm run build`
   - ✅ Verifies `dist/index.js` exists

3. **Commit Phase**
   - ✅ Commits build artifacts if changed
   - ✅ Pushes changes to `main` branch

4. **Release Phase**
   - ✅ Creates annotated Git tag
   - ✅ Pushes tag to GitHub
   - ✅ Creates and publishes GitHub release

5. **Summary Phase**
   - ✅ Provides release URL
   - ✅ Lists next steps (verify release, check marketplace, inform QE)

### Permissions Required
- `contents: write` - Create tags and releases

### How to Use

1. Go to **Actions** tab in GitHub
2. Select **"Create Release"** workflow
3. Click **"Run workflow"** button
4. Fill in the inputs:
   ```
   Tag: v2.0.0
   Release notes: 
   - Added new feature X
   - Fixed bug Y
   - Updated dependencies
   
   Set as latest: ✓ (checked)
   Set as pre-release: ☐ (unchecked)
   ```
5. Click **"Run workflow"**

### Post-Release Checklist

After the workflow completes successfully:

- [ ] Verify the release at the provided URL
- [ ] Check GitHub Marketplace for the new version
- [ ] Inform QE team to test the GitHub Action
- [ ] Update any documentation if needed

### Error Handling

The workflow will fail if:
- Tag format is invalid (not `v*.*.*`)
- Tag already exists
- Not on `main` branch
- Build fails
- Permission issues

---

## 3. Test Release (Dry Run)

**File:** `.github/workflows/test-release.yml`

### Purpose
Provides a safe testing environment to validate the release process without actually publishing a release. Creates a draft release for review.

### Triggers
- **Manual Only:** `workflow_dispatch` with required inputs

### Required Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `tag` | string | ✅ Yes | - | Test version tag (e.g., `v2.0.0-test`) |
| `release_notes` | string | ✅ Yes | - | Test release notes |
| `set_as_latest` | boolean | No | `false` | Mark as latest (default: false for testing) |
| `is_prerelease` | boolean | No | `true` | Mark as pre-release (default: true for testing) |

### Key Differences from Production Release

| Feature | Test Workflow | Production Workflow |
|---------|--------------|---------------------|
| Release Type | **Draft** (not published) | **Published** |
| Tag Creation | **Simulated** (not pushed) | **Actually created & pushed** |
| Tag Format | Allows `-test`, `-rc`, `-beta` suffixes | Strict `v*.*.*` only |
| Default Settings | Pre-release=true, Latest=false | Pre-release=false, Latest=true |
| Safe to Run | ✅ Yes, anytime | ⚠️ Only for real releases |

### Workflow Steps

1. **Validation Phase**
   - ✅ Validates tag format (allows test suffixes)
   - ✅ Checks if tag exists (warns but continues)
   - ✅ Verifies current branch is `main`

2. **Build Phase**
   - ✅ Sets up Node.js 18.x
   - ✅ Installs dependencies
   - ✅ Builds distribution
   - ✅ Verifies build artifacts

3. **Simulation Phase**
   - ✅ Shows what commands would run
   - ✅ Checks for uncommitted changes
   - ✅ Simulates tag creation (doesn't push)

4. **Draft Release Phase**
   - ✅ Creates a **DRAFT** release (not published)
   - ✅ Adds "TEST" label to release name
   - ✅ Includes warning in release body

5. **Test Summary**
   - ✅ Shows all validation results
   - ✅ Provides draft release URL
   - ✅ Lists cleanup steps

### How to Use

1. Go to **Actions** tab in GitHub
2. Select **"Test Release (Dry Run)"** workflow
3. Click **"Run workflow"** button
4. Fill in test inputs:
   ```
   Tag: v2.0.0-test
   Release notes: Testing release automation
   Set as latest: ☐ (unchecked)
   Set as pre-release: ✓ (checked)
   ```
5. Click **"Run workflow"**
6. Review the draft release created
7. **Important:** Delete the draft release after testing

### Recommended Test Tags

- `v2.0.0-test` - General testing
- `v2.0.0-rc1` - Release candidate testing
- `v2.0.0-beta` - Beta version testing
- `v2.0.0-alpha` - Alpha version testing

### Testing Checklist

- [ ] Workflow completes without errors
- [ ] All validation steps pass
- [ ] Build succeeds
- [ ] Draft release is created
- [ ] Release notes are formatted correctly
- [ ] Delete draft release after review
- [ ] Ready to run production release



---

## Workflow Comparison Matrix

| Workflow | Purpose | Trigger | Creates Release | Safe for Testing |
|----------|---------|---------|----------------|------------------|
| **codeql.yml** | Security scanning | Auto + Manual | No | ✅ Yes |
| **create-release.yml** | Production release | Manual | Yes (Published) | ⚠️ No |
| **test-release.yml** | Test release process | Manual | Yes (Draft only) | ✅ Yes |

---

## Best Practices

### For Releases

1. **Always test first**
   - Run `test-release.yml` with a test tag before production
   - Review the draft release carefully
   - Verify all build artifacts are correct

2. **Use semantic versioning**
   - Format: `v<major>.<minor>.<patch>`
   - Example: `v2.0.0`, `v2.1.0`, `v2.1.1`

3. **Write clear release notes**
   - List new features
   - Document bug fixes
   - Note breaking changes
   - Include upgrade instructions if needed

4. **Verify after release**
   - Check the release page
   - Verify GitHub Marketplace listing
   - Test the published action

### For Security

1. **Review CodeQL results regularly**
   - Check Security tab weekly
   - Address critical issues immediately
   - Track and fix medium/low issues

2. **Keep dependencies updated**
   - Monitor for security advisories
   - Update vulnerable packages promptly
   - Test after updates



---

## Troubleshooting

### Release Workflow Issues

**Problem:** Tag already exists
- **Solution:** Choose a different version number or delete the existing tag

**Problem:** Build fails
- **Solution:** Run `npm ci && npm run build` locally to identify issues

**Problem:** Not on main branch
- **Solution:** Switch to main branch and ensure it's up to date

### CodeQL Issues

**Problem:** Analysis fails
- **Solution:** Check if code has syntax errors, fix and re-run

**Problem:** Too many alerts
- **Solution:** Prioritize by severity, address critical issues first



---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [ServiceNow DevOps Documentation](https://docs.servicenow.com/bundle/vancouver-it-service-management/page/product/enterprise-dev-ops/concept/dev-ops-change-control.html)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

---

## Support

For issues or questions:
- **GitHub Issues:** [Create an issue](https://github.com/ServiceNow/servicenow-devops-change/issues)
- **ServiceNow Support:** [Now Support Portal](https://support.servicenow.com/)

---

*Last Updated: October 2025*
