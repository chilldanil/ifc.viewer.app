# CI/CD Pipeline - Quick Reference

**TL;DR:** Fast answers for common questions about the CI/CD pipeline.

---

##  Quick Commands

```bash
# Quality checks (run before pushing)
npm run lint              # Check linting
npm run lint:fix          # Auto-fix linting issues  
npm run format:check      # Check formatting
npm run format            # Auto-format files

# Development
npm run dev               # Start dev server (root project)
npm run intro             # Start intro dev server

# Building
cd intro && npm run build # Build intro page
```

---

## 📊 Pipeline Stages

| Stage | What it does | Duration |
|-------|-------------|----------|
| **Install** | Install dependencies with caching | ~15s (cached) |
| **Quality** | Lint, format, code quality (parallel) | ~20s |
| **Test** | Placeholder (no tests yet) | <1s |
| **Build** | Build intro (if files changed) | ~1-2min |
| **Docs** | Generate TypeDoc (if viewer changed) | ~30s |
| **Deploy** | Deploy to GitLab Pages | ~10s |

**Total:** ~2-3 minutes (with cache)

---

## 🌿 Branch Behavior

| Branch Type | Quality Checks | Build | Deploy to Pages |
|-------------|----------------|-------|-----------------|
| Feature branches | ✅ Yes | ✅ If files changed | ❌ No |
| `main` | ✅ Yes | ✅ If files changed | ✅ Yes |
| `development` | ✅ Yes | ✅ If files changed | ✅ Yes |
| `production` | ✅ Yes | ✅ If files changed | ✅ Yes |
| Merge requests | ✅ Yes | ✅ If files changed | ❌ No |

---

## 🎯 When Build Runs

Build job (`build_intro`) runs **only** when these files/folders change:

- ✅ `intro/**/*`
- ✅ `src/**/*`
- ✅ `viewer/**/*`
- ✅ `package.json`
- ✅ `package-lock.json`

**Otherwise:** Build is skipped (saves ~2 minutes)

**Examples:**
```bash
# Build RUNS
git commit -m "feat: add component to src/"
git commit -m "fix: update intro page"
git commit -m "chore: update dependencies"

# Build SKIPPED  
git commit -m "docs: update README"
git commit -m "ci: modify .gitlab-ci.yml"
```

---

## GitLab Pages

**Deployed from branches:**
- `main`
- `development`
- `production`

**URL structure:**
```
https://<namespace>.gitlab.io/<project>/
https://<namespace>.gitlab.io/<project>/docs/  (API docs)
```

**Deployment time:** 1-2 minutes after pipeline completes

**Contents:**
- Intro page (main demo)
- API documentation (if generated)
- `robots.txt`
- `.nojekyll` (prevents Jekyll processing)

---

## Cache

**What's cached:**
- `node_modules/`
- `.npm/` (npm cache)

**Cache key:** Based on `package-lock.json` hash

**When cache invalidates:**
- When `package-lock.json` changes
- When you manually clear caches

**Performance impact:**
- **First run (no cache):** ~60s install
- **Cached run:** ~15s install
- **Savings:** 75% faster!

**Clear cache:**
GitLab → CI/CD → Pipelines → **Clear Runner Caches** button

---

## 🔧 Troubleshooting

### Pipeline fails on lint

```bash
# See errors
npm run lint

# Auto-fix most issues
npm run lint:fix

# Commit fixes
git add .
git commit -m "style: fix linting issues"
git push
```

### Pipeline fails on format check

```bash
# Auto-format all files
npm run format

# Commit formatted code
git add .
git commit -m "style: format code"
git push
```

### Build doesn't run

**Reason:** No relevant files changed

**Check:** Did you modify files in:
- `intro/`
- `src/`
- `viewer/`
- `package.json`
- `package-lock.json`

**If yes and still skipped:** Check `.gitlab-ci.yml` rules

### Pages not updating

**Checklist:**
1. ✅ Pushed to protected branch? (`main`/`development`/`production`)
2. ✅ Pipeline completed successfully?
3. ✅ `pages` job ran and passed?
4. ✅ Waited 1-2 minutes for Pages to update?

**Still not working:**
- Check pipeline logs
- Verify `public/` artifact was created
- Check GitLab Pages settings

### Job dependency error

**Error:** "Job X is not defined"

**Cause:** Job references another job that doesn't exist

**Fix:** Check `.gitlab-ci.yml` needs section to ensure all referenced jobs are defined

---

## 📁 Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| `.gitlab-ci.yml` | Pipeline configuration | Root |
| `.eslintrc.json` | Linting rules | Root |
| `.prettierrc` | Formatting rules | Root |
| `typedoc.json` | Documentation config | Root |
| `.node-version` | Node.js version (20.12.2) | Root |
| `CODEOWNERS` | Code ownership | Root |

---

## 📖 Full Documentation

**Need more details?** Check these files:

| Document | Purpose | Length |
|----------|---------|--------|
| **CI-CD-GUIDE.md** | Complete pipeline guide | ~50 pages |
| **CI-CD-SETUP-SUMMARY.md** | Setup overview | ~20 pages |
| **.gitlab/QUICK-REFERENCE.md** | This file | Quick |
| **.gitlab/CI-VARIABLES.md** | Variables guide | Short |

---

## Tips

### 1. Check locally before pushing

```bash
# Run these to avoid pipeline failures
npm run lint && npm run format:check
```

### 2. Use feature branches

```bash
git checkout -b feature/my-feature
# ... make changes ...
git push origin feature/my-feature
# Create merge request in GitLab
```

### 3. Monitor pipeline

**Live view:**
- GitLab → CI/CD → Pipelines
- Click on running pipeline
- Watch jobs in real-time

### 4. Download artifacts

**Need build files locally?**
- Go to completed pipeline
- Click **Browse** or **Download** next to job
- Get `intro/build/` or `viewer/docs/`

### 5. Skip build when not needed

Build auto-skips if you only change:
- Documentation files
- CI/CD configuration
- README files
- Other non-code files

---

## 🆘 Get Help

1. **Check this file** for quick answers
2. **Read [CI-CD-GUIDE.md](../CI-CD-GUIDE.md)** for detailed info
3. **Check pipeline logs** in GitLab
4. **Run commands locally** to reproduce

---

## 🔗 Quick Links

- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [GitLab Pages Documentation](https://docs.gitlab.com/ee/user/project/pages/)
- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)

---

**Last Updated:** October 12, 2025  
**Version:** 1.0.0

