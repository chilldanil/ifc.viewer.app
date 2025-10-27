# 🧰 Setting up and Running a GitLab Shell Runner (Windows)

This guide explains how to install, configure, and run a GitLab Shell Runner for local CI/CD development and GitLab Pages deployment on Windows.

---

## Install GitLab Runner

### Download the Windows Binary

Download the Windows binary from the official GitLab source:

👉 **https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-windows-amd64.exe**

### Move to Installation Directory

Move it to a convenient location, for example:
```
C:\GitLab-Runner\
```

### Register the Runner

Open **PowerShell as Administrator** and register the Runner:

```powershell
cd C:\GitLab-Runner
.\gitlab-runner.exe register
```

### Registration Prompts

When prompted, provide the following:

| Prompt | What to Enter |
|--------|---------------|
| **GitLab instance URL** | `https://gitlab.lrz.de` |
| **Registration token** | From your project → **Settings → CI/CD → Runners → Create project runner** |
| **Description** | e.g. `Local runner ` |
| **Tags** | Leave empty (or set `windows-shell`) |
| **Executor** | `shell` |

You should see:
```
Runner registered successfully.
Configuration was saved in C:\GitLab-Runner\config.toml
```

---

## Configure the Runner

### Edit Configuration File

Open `C:\GitLab-Runner\config.toml` in a text editor and ensure it contains:

```toml
[[runners]]
  name = "Local runner Rita"
  url = "https://gitlab.lrz.de"
  token = "YOUR_TOKEN"
  executor = "shell"
  shell = "powershell"   # use built-in Windows PowerShell
```

⚠️ **Important:** The key `shell = "powershell"` is essential — it prevents GitLab from trying to use `pwsh` (PowerShell 7), which is not installed by default on Windows.

**Save the file.**

---

## Start the Runner

### Option A – Run Manually (for quick testing)

```powershell
cd C:\GitLab-Runner
.\gitlab-runner.exe run
```

**Keep this PowerShell window open** while the Runner is active.

---

### Option B – Install as a Windows Service (recommended)

```powershell
cd C:\GitLab-Runner
.\gitlab-runner.exe install
.\gitlab-runner.exe start
```

Now the Runner runs in the background automatically.

**Check status:**
```powershell
.\gitlab-runner.exe status
```

**To stop or restart:**
```powershell
.\gitlab-runner.exe stop
.\gitlab-runner.exe restart
```

**To remove the service:**
```powershell
.\gitlab-runner.exe uninstall
```

---

## Verify the Runner in GitLab

In your project → **Settings → CI/CD → Runners**, you should see:

```
🟢 Local runner — online
```

### If the runner shows as stuck, make sure:

1. The runner tag matches job tags (`tags: ["windows-shell"]`) **OR**
2. **"Run untagged jobs"** is enabled for this runner

---

## Run a Pipeline

1. Go to **CI/CD → Pipelines → Run pipeline**
2. Select your branch (e.g. `development` or `zykova`)
3. Click **Run pipeline**

The Runner will pick up the job, and logs will appear both in GitLab and in your local PowerShell window.

---

### Cross-Platform Commands

For commands that work on both Linux (Alpine) and Windows, use shell-agnostic syntax:

| Task | Alpine/Linux | Windows PowerShell | Cross-Platform |
|------|-------------|-------------------|----------------|
| Create directory | `mkdir -p public` | `New-Item -ItemType Directory -Force -Path public` | `mkdir -p public` (works on both) |
| Copy files | `cp -r src/* dest/` | `Copy-Item -Recurse -Force "src/*" "dest/"` | Use conditional in pipeline |
| Check if exists | `if [ -d dir ]` | `if (Test-Path "dir")` | Use conditional in pipeline |
| Echo | `echo "text"` | `Write-Host "text"` | `echo "text"` (works on both) |

---

## Common Issues and Fixes

| Error | Cause | Solution |
|-------|-------|----------|
| `pwsh: executable file not found in %PATH%` | GitLab tries to use PowerShell 7 (`pwsh`), which is not installed. | Add `shell = "powershell"` in `config.toml`. |
| Runner is stuck (pending) | Tags mismatch or "Run untagged jobs" disabled. | Enable "Run untagged jobs" or add the same tag to jobs and runner. |
| `Job failed (system failure): prepare environment` | Runner misconfigured. | Verify `executor = "shell"` and correct `shell` value. |
| Pipeline doesn't publish Pages | Job `pages` didn't run on the default branch. | Run it on `main` or change default branch in repo settings. |
| `npm: command not found` | Node.js not in PATH | Add Node.js to Windows PATH or use full path in commands |
| Permission denied | Runner doesn't have write permissions | Run PowerShell as Administrator or adjust folder permissions |

---

## GitLab Pages Deployment

### Important Notes

1. **GitLab Pages only publishes from the project's default branch** (usually `main`)
2. You can change this under **Settings → Repository → Default branch** if needed
3. The `pages` job must create a `public/` directory with your site content
4. The job **must** be named exactly `pages` (lowercase)

### Verifying Pages Deployment

After a successful pipeline:

1. Go to **Settings → Pages**
2. You should see: **"Your pages are served under: `https://[namespace].gitlab.io/[project]/`"**
3. Wait 1-2 minutes for deployment to complete
4. Visit the URL to see your site

---

## Advanced Configuration

### Concurrent Jobs

Edit `config.toml`:

```toml
concurrent = 1  # Number of jobs to run simultaneously

[[runners]]
  # ... rest of config
```

### Runner-Specific Variables

In `.gitlab-ci.yml`:

```yaml
variables:
  # Windows-specific paths
  BUILD_DIR: "C:\\temp\\builds"
  
job_name:
  script:
    - echo "Building in $BUILD_DIR"
  tags:
    - windows-shell
```

### Cache Configuration

```toml
[[runners]]
  [runners.cache]
    Type = "local"
    Path = "C:\\GitLab-Runner\\cache"
    Shared = true
    [runners.cache.local]
      MaxSize = 1073741824  # 1GB in bytes
```

---

### Useful Links

- [GitLab Runner Documentation](https://docs.gitlab.com/runner/)
- [GitLab Runner Windows Installation](https://docs.gitlab.com/runner/install/windows.html)
- [GitLab Pages Documentation](https://docs.gitlab.com/ee/user/project/pages/)

---

## 📋 Quick Reference

### Common Commands

```powershell
# Registration
.\gitlab-runner.exe register

# Service management
.\gitlab-runner.exe install
.\gitlab-runner.exe start
.\gitlab-runner.exe stop
.\gitlab-runner.exe restart
.\gitlab-runner.exe uninstall

# Manual run
.\gitlab-runner.exe run

# Status and verification
.\gitlab-runner.exe status
.\gitlab-runner.exe verify
.\gitlab-runner.exe list

# Update
# Download new .exe and replace the old one
```

### Configuration File Location
```
C:\GitLab-Runner\config.toml
```

### Log Location (Service)
```
Windows Event Viewer → Application → gitlab-runner
```

---

**Last Updated:** October 22, 2025  
**Maintained By:** @000000000014BA09F  
**Version:** 1.0.0

