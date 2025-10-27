# CI/CD Pipeline Guide - IFC Viewer Project

## Overview

This project uses GitLab CI/CD to automate code quality checks, building, and deployment to GitLab Pages. The pipeline is designed to be fast, efficient, and focused on practical needs.

---

## Pipeline Architecture

### Stages

The pipeline consists of 5 main stages that run sequentially:

```
┌─────────────┐
│   Install   │  ← Install npm dependencies with caching
└──────┬──────┘
       │
┌──────▼──────┐
│   Quality   │  ← Linting, formatting, code quality (parallel)
└──────┬──────┘
       │
┌──────▼──────┐
│    Test     │  ← Placeholder for future tests
└──────┬──────┘
       │
┌──────▼──────┐
│    Build    │  ← Build intro page (with embedded viewer)
└──────┬──────┘
       │
┌──────▼──────┐
│    Docs     │  ← Generate TypeDoc documentation (for future npm library)
└──────┬──────┘
       │
┌──────▼──────┐
│   Deploy    │  ← Deploy to GitLab Pages
└─────────────┘
```

---

## Detailed Stage Breakdown

### 1. Install Stage

**Job:** `install_dependencies`

**Purpose:** Install all npm dependencies and cache them for subsequent jobs.

**What it does:**
- Installs dependencies using `npm ci` for reproducible builds
- Uses npm cache for faster installs
- Creates artifacts (node_modules) for downstream jobs
- Artifact expires in 1 day

**Caching Strategy:**
- Cache key based on `package-lock.json` 
- Caches both `node_modules/` and `.npm/` directory
- Policy: `pull-push` (updates cache if changed)

**Triggers on:**
- All branches
- All tags
- All merge requests

---

### 2. Quality Stage

Three jobs run **in parallel** during this stage:

#### 2.1. Linting (`lint`)

**Purpose:** Check code quality with ESLint

**What it does:**
- Runs ESLint on TypeScript/React code
- Enforces code style and best practices
- Reports unused disable directives
- Fails the pipeline on any linting errors

**Configuration:** `.eslintrc.json`

**How to run locally:**
```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

**Triggers on:**
- All branches
- Merge requests

**Failure behavior:** Pipeline stops (required to pass)

---

#### 2.2. Format Check (`format_check`)

**Purpose:** Ensure consistent code formatting with Prettier

**What it does:**
- Checks if code matches Prettier format rules
- Does not modify files, only validates
- Fails if any files need formatting

**Configuration:** `.prettierrc`

**How to run locally:**
```bash
npm run format:check  # Check formatting
npm run format        # Auto-format files
```

**Triggers on:**
- All branches
- Merge requests

**Failure behavior:** Pipeline stops (required to pass)

---

#### 2.3. Code Quality (`code_quality`)

**Purpose:** Generate GitLab Code Quality report

**What it does:**
- Runs ESLint and outputs JSON report
- Integrates with GitLab's Code Quality widget
- Shows code quality changes in merge requests
- Does not fail the pipeline (report only)

**Output:** `gl-code-quality-report.json`

**Triggers on:**
- All branches
- Merge requests

**Failure behavior:** Continues even if it fails

---

### 3. Test Stage

**Job:** `test`

**Purpose:** Placeholder for future unit tests

**Current state:** 
- Always passes immediately
- No actual tests run yet
- Echo message: "Skipping tests (no tests yet)"

**Future plans:**
- Add unit tests for complex components
- Consider testing critical business logic
- Potentially add tests for specific branches only

**Comment in code:**
> "Our work gets pretty complex now it might make sense to add some tests later, at least for certain branches"

---

### 4. Build Stage

**Job:** `build_intro`

**Purpose:** Build the intro page (which includes the embedded viewer)

**What it does:**
- Installs intro page dependencies separately
- Runs build process for intro
- Creates production-optimized bundle
- Generates artifacts for deployment

**Important notes:**
- Overrides default `before_script` to prevent duplicate npm install
- Only builds when relevant files change (conditional execution)
- Depends on: `install_dependencies`, `lint`

**Conditional trigger - runs only when these paths change:**
- `intro/**/*`
- `src/**/*`
- `viewer/**/*`
- `package.json`
- `package-lock.json`

**Otherwise:** Job is skipped

**Artifacts:**
- `intro/build/` directory
- Expires in 7 days

**Duration:** ~1-2 minutes

---

### 5. Docs Stage

**Job:** `generate_viewer_docs`

**Purpose:** Generate TypeDoc API documentation for the viewer npm package

**What it does:**
- Navigates to `viewer/` directory
- Installs viewer dependencies
- Runs TypeDoc to generate documentation
- Creates HTML documentation from TypeScript comments

**Configuration:** `typedoc.json`

**Conditional trigger - runs only when:**
- Files in `viewer/**/*` change

**Otherwise:** Job is skipped

**Artifacts:**
- `viewer/docs/` directory  
- Expires in 30 days

**Future use:** When viewer becomes a separate npm package

---

### 6. Deploy Stage

**Job:** `pages`

**Purpose:** Deploy to GitLab Pages

**What it does:**
1. Creates `public/` directory
2. Copies intro build to public root
3. Optionally copies viewer docs to `public/docs/`
4. Adds `robots.txt` for SEO
5. Adds `.nojekyll` file (prevents Jekyll processing)

**GitLab Pages URL:**
- `https://<namespace>.gitlab.io/<project-name>/`
- Documentation at: `https://<namespace>.gitlab.io/<project-name>/docs/`

**Triggers on (protected branches only):**
- `main` branch
- `development` branch  
- `production` branch

**Other branches:** Job is skipped

**Artifacts:**
- `public/` directory
- Expires in 30 days (but GitLab Pages keeps current version)

---

## Pipeline Configuration

### Global Variables

```yaml
variables:
  NODE_VERSION: "20"                    # Node.js version
  CACHE_FALLBACK_KEY: "$CI_COMMIT_REF_SLUG"  # Cache key fallback
  HUSKY: "0"                            # Disable Husky in CI
```

### Docker Image

**Default:** `node:20-alpine`

**Why Alpine?**
- Smaller image size (~40MB vs ~900MB)
- Faster download and startup
- Contains everything needed for Node.js builds

### Caching Strategy

**Cache key:** Based on `package-lock.json` hash
- When lock file changes → cache invalidates
- When lock file unchanged → cache reused

**Cached paths:**
- `node_modules/` - installed packages
- `.npm/` - npm's internal cache

**Benefits:**
- 5-10x faster builds (after first run)
- Reduced network traffic
- Consistent builds across jobs

---

## Branch Strategy

### Protected Branches

The project uses three protected branches for deployments:
`main` - Stable production code 
`development` - Active development
`production` - Production releases

### Feature Branches

- Quality checks run on all branches
- Builds run only when relevant files change
- Pages deployment skipped (only on protected branches)

### Merge Requests

- Full quality pipeline runs
- Build artifacts generated (if files changed)
- Code quality report shown in MR widget
- Must pass quality checks to merge

---

## Pipeline Behavior by Branch

### On Feature Branches

**Runs:**
- ✅ Install dependencies
- ✅ Quality checks (lint, format, code quality)
- ✅ Test (placeholder)
- ✅ Build (if files changed)
- ❌ Docs (skipped unless viewer/* changed)
- ❌ Pages deployment (skipped)

### On Protected Branches (main/development/production)

**Runs:**
- ✅ Install dependencies
- ✅ Quality checks
- ✅ Test
- ✅ Build (if files changed)
- ✅ Docs (if viewer/* changed)
- ✅ **Pages deployment**

### On Merge Requests

**Runs:**
- ✅ Install dependencies
- ✅ Quality checks (with MR widget integration)
- ✅ Test
- ✅ Build (if files changed)
- ✅ Docs (if viewer/* changed)
- ❌ Pages deployment (skipped)

---

## Artifacts

### What are artifacts?

Files generated by CI jobs that are:
- Passed between jobs
- Available for download
- Stored with expiration dates

### Artifact List

| Artifact | Job | Expires | Purpose |
|----------|-----|---------|---------|
| `node_modules/` | install_dependencies | 1 day | Share deps across jobs |
| `intro/build/` | build_intro | 7 days | Built intro page |
| `viewer/docs/` | generate_viewer_docs | 30 days | API documentation |
| `public/` | pages | 30 days | GitLab Pages content |
| `gl-code-quality-report.json` | code_quality | 1 week | Code quality report |

### Downloading Artifacts

1. Go to **CI/CD → Pipelines**
2. Click on a pipeline
3. Click **Browse** or **Download** next to job name

---

## Conditional Execution

### Build Jobs

The `build_intro` job uses **conditional execution** with `rules`:

```yaml
rules:
  - changes:
      - intro/**/*
      - src/**/*
      - viewer/**/*
      - package.json
      - package-lock.json
    when: on_success
  - when: never
```

**Meaning:**
- Job runs **only** when listed files/directories change
- If nothing changed → job is skipped
- Saves time and resources

---

## Performance Optimization

### 1. Smart Caching

**Before caching:**
- Install dependencies: ~60 seconds
- Total pipeline: ~3-4 minutes

**After caching:**
- Install dependencies: ~15 seconds
- Total pipeline: ~1-2 minutes

**Savings:** ~50-70% faster

---

### 2. Parallel Execution

Quality checks run in parallel:
```
lint (30s)    ┐
              ├─→ All finish in ~30s (not 90s)
format (20s)  │
              │
code_quality (30s) ┘
```

---

### 3. Conditional Builds

- Build jobs skip when files unchanged
- Docs generation skips unless viewer changes
- Saves ~1-2 minutes per pipeline when no builds needed

---

### 4. Alpine Images

- Base image: 40MB (vs 900MB for full Node)
- Faster pull and startup
- Same functionality

---

## Troubleshooting

### Pipeline Fails on Linting

**Problem:** Linting errors cause pipeline failure

**Solution:**
```bash
# Run locally to see errors
npm run lint

# Auto-fix most issues
npm run lint:fix

# Fix remaining issues manually
# Then commit and push
```

---

### Pipeline Fails on Format Check

**Problem:** Code formatting doesn't match Prettier rules

**Solution:**
```bash
# Check what needs formatting
npm run format:check

# Auto-format all files
npm run format

# Commit formatted code
git add .
git commit -m "style: format code with prettier"
git push
```

---

### Build Job Doesn't Run

**Problem:** `build_intro` job is skipped

**Reason:** No relevant files changed

**Solution:** This is expected behavior. Build only runs when:
- Files in `intro/`, `src/`, or `viewer/` change
- `package.json` or `package-lock.json` changes

**To force build:** Make a small change to any file in those directories

---

### Pages Not Updating

**Problem:** GitLab Pages not showing latest changes

**Checks:**
1. Pipeline ran on protected branch? (main/development/production)
2. `pages` job completed successfully?
3. Waited 1-2 minutes for Pages to update?

**Solution:**
```bash
# Ensure you're on a protected branch
git checkout main
git merge your-feature-branch
git push origin main

# Check pipeline at:
# Settings → CI/CD → Pipelines
```

---

### Cache Issues

**Problem:** Pipeline slow or behaving strangely

**Solution:**
1. Go to **CI/CD → Pipelines**
2. Click **Clear Runner Caches** button
3. Run pipeline again

**Alternative:** Change cache key in `.gitlab-ci.yml` (forces cache rebuild)

---

## Local Development

### Running Quality Checks Locally

**Before pushing, run:**

```bash
# 1. Lint
npm run lint
npm run lint:fix  # if needed

# 2. Format
npm run format:check
npm run format    # if needed

# 3. Build (to catch build errors)
cd intro && npm run build
```

---

### Simulating CI Environment

**Install exact dependencies:**
```bash
npm ci  # Not npm install
```

**Set environment variables:**
```bash
export NODE_VERSION=20
export HUSKY=0
```

**Use Alpine-compatible commands:**
- Alpine uses `sh` not `bash`
- Some commands may differ

---

## Best Practices

### ✅ Do's

1. **Run quality checks locally before pushing**
   ```bash
   npm run lint && npm run format:check
   ```

2. **Keep commits focused**
   - One feature per branch
   - Clear commit messages

3. **Wait for pipeline before merging**
   - Ensure all quality checks pass
   - Review code quality report

4. **Use meaningful branch names**
   ```
   feature/add-measurement-tool
   fix/camera-clipping-bug
   docs/update-readme
   ```

5. **Monitor pipeline performance**
   - Check job durations
   - Optimize slow jobs

---

### ❌ Don'ts

1. **Don't skip quality checks**
   - No `--no-verify` flags
   - Fix issues, don't bypass them

2. **Don't commit directly to protected branches**
   - Always use feature branches
   - Create merge requests

3. **Don't ignore failed pipelines**
   - Investigate failures
   - Fix before proceeding

4. **Don't commit large files**
   - Use `.gitignore`
   - Keep repo clean

5. **Don't modify `.gitlab-ci.yml` without testing**
   - Test changes on feature branch first
   - One change at a time

---

## Quick Reference

### Pipeline Status

**Check pipeline status:**
```
GitLab → CI/CD → Pipelines
```

**Pipeline badge (for README):**
```markdown
![Pipeline](https://gitlab.com/<namespace>/<project>/badges/<branch>/pipeline.svg)
```

---

### Common Commands

```bash
# Quality checks
npm run lint              # Lint code
npm run lint:fix          # Fix linting issues
npm run format:check      # Check formatting
npm run format            # Format code

# Building
cd intro && npm run build     # Build intro page
cd viewer && npm run docs:generate  # Generate docs

# Development
npm run dev               # Start dev server
npm run intro             # Start intro dev server
```

---

### File Locations

| File | Purpose |
|------|---------|
| `.gitlab-ci.yml` | Pipeline configuration |
| `.eslintrc.json` | Linting rules |
| `.prettierrc` | Formatting rules |
| `typedoc.json` | Documentation config |
| `.node-version` | Node.js version (20.12.2) |
| `.gitignore` | Ignored files |
| `CODEOWNERS` | Code ownership |

---

## Monitoring & Metrics

### Key Metrics

Track these in GitLab:

1. **Pipeline Success Rate**
   - Target: >95%
   - Location: CI/CD → Analytics

2. **Pipeline Duration**
   - Target: <3 minutes
   - Check: Individual pipeline pages

3. **Build Size**
   - Monitor `intro/build/` size
   - Keep builds optimized

4. **Cache Hit Rate**
   - Successful cache reuse
   - Affects speed significantly

---

## Future Enhancements

### Possible Improvements

1. **Add Unit Tests**
   - Test complex components
   - Set coverage thresholds
   - Integrate with pipeline

2. **Type Checking**
   - Add `tsc --noEmit` check
   - Catch type errors early

3. **Security Scanning**
   - Dependency vulnerability scanning
   - Secret detection
   - SAST analysis

4. **Multiple Environments**
   - Staging environment
   - Preview deployments for MRs
   - Separate production pipeline

5. **Notifications**
   - Slack/Discord integration
   - Email on failures
   - Success notifications

---

## Support & Resources

### Documentation

- 📝 [CI-CD-SETUP-SUMMARY.md](./CI-CD-SETUP-SUMMARY.md) - Setup overview
- 🔧 [.gitlab/CI-VARIABLES.md](./.gitlab/CI-VARIABLES.md) - Variables guide
- 📦 [package.json](./package.json) - Scripts reference

### GitLab Resources

- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [GitLab Pages Documentation](https://docs.gitlab.com/ee/user/project/pages/)
- [YAML Syntax Reference](https://docs.gitlab.com/ee/ci/yaml/)

### Getting Help

1. **Check pipeline logs** in GitLab
2. **Run commands locally** to reproduce issues
3. **Review this guide** for common solutions

---

## Changelog

### Version 1.0.0 (October 12, 2025)

**Initial pipeline implementation:**
- ✅ Dependency installation with caching
- ✅ Code quality checks (lint, format)
- ✅ Conditional build system
- ✅ TypeDoc documentation generation
- ✅ GitLab Pages deployment
- ✅ Multi-branch support

---

**Last Updated:** October 12, 2025  
**Maintained By:** @000000000014BA09F  
**Version:** 1.0.0

