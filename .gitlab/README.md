# GitLab CI/CD Documentation

This directory contains all CI/CD pipeline documentation for the IFC Viewer project.

---

## 📚 Documentation Index

### For Quick Answers

**🚀 [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)**
- Fast lookup for common questions
- Command reference
- Troubleshooting tips
- 5-minute read

**When to use:** You need a quick answer or reminder

---

### For Complete Understanding

**📖 [CI-CD-GUIDE.md](../CI-CD-GUIDE.md)** (in project root)
- Complete pipeline documentation (~50 pages)
- Detailed stage explanations
- Architecture and design decisions
- Performance optimization
- Best practices
- 30-minute read

**When to use:** You want to understand how everything works

---

### For Setup & Overview

**📝 [CI-CD-SETUP-SUMMARY.md](../CI-CD-SETUP-SUMMARY.md)** (in project root)
- What was configured
- Files and their purposes
- Getting started guide
- Feature explanations
- 15-minute read

**When to use:** First time setup or understanding what's included

---

### For Configuration

**🔧 [CI-VARIABLES.md](./CI-VARIABLES.md)**
- How to add CI/CD variables
- Security best practices
- Current state: No variables needed
- 2-minute read

**When to use:** You need to add API keys or secrets

---

## 🗺️ Choose Your Path

### "I'm new here"

1. Start: [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Get oriented (5 min)
2. Then: [CI-CD-SETUP-SUMMARY.md](../CI-CD-SETUP-SUMMARY.md) - Understand setup (15 min)
3. Deep dive: [CI-CD-GUIDE.md](../CI-CD-GUIDE.md) - Complete knowledge (30 min)

---

### "Pipeline is failing"

1. Check: [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Troubleshooting section
2. If not resolved: [CI-CD-GUIDE.md](../CI-CD-GUIDE.md) - Troubleshooting chapter

---

### "I need to add a feature"

1. Review: [CI-CD-GUIDE.md](../CI-CD-GUIDE.md) - Architecture section
2. Quick reference: [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Testing locally

---

### "Just need a quick answer"

Go straight to: [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)

---

## 📂 Configuration Files

These files are in the **project root** (not in `.gitlab/` directory):

| File | Purpose |
|------|---------|
| `.gitlab-ci.yml` | Main pipeline configuration |
| `.eslintrc.json` | Linting rules |
| `.prettierrc` | Code formatting rules |
| `typedoc.json` | Documentation generator config |
| `.editorconfig` | Editor settings |
| `.gitignore` | Git exclusions |
| `.npmrc` | npm configuration |
| `.node-version` | Node.js version lock (20.12.2) |
| `CODEOWNERS` | Code ownership |

---

## 🎯 Quick Facts

| Metric | Value |
|--------|-------|
| **Node.js version** | 20.12.2 |
| **Stages** | 6 (install, quality, test, build, docs, deploy) |
| **Deploy branches** | main, development, production |
| **Cache strategy** | Based on package-lock.json |

---

## 🔗 External Resources

- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [GitLab Pages Documentation](https://docs.gitlab.com/ee/user/project/pages/)
- [GitLab YAML Reference](https://docs.gitlab.com/ee/ci/yaml/)

---

## 📞 Support

**For help:**
1. Check documentation (start with [QUICK-REFERENCE.md](./QUICK-REFERENCE.md))
2. Check pipeline logs in GitLab
3. Run commands locally to reproduce issues
4. Contact maintainer if needed

---

**Last Updated:** October 12, 2025  
**Documentation Version:** 1.0.0

