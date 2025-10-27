# 🏗️ IFC Viewer Integration Guide

**A beginner-friendly guide to integrating `@ifc-viewer/core` into your website**

## 📖 Table of Contents

1. [Quick Start](#quick-start)
2. [Use Case 1: Full-Page Viewer](#use-case-1-full-page-viewer)
3. [Use Case 2: Embedded in Section](#use-case-2-embedded-in-section)
4. [Use Case 3: Landing Page with Viewer](#use-case-3-landing-page-with-viewer)
5. [Use Case 4: Modal/Popup Viewer](#use-case-4-modalpopup-viewer)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Installation

```bash
npm install @ifc-viewer/core
```

### Basic Setup

```javascript
import { createIFCViewer } from '@ifc-viewer/core';
import '@ifc-viewer/core/styles';

const viewer = createIFCViewer({
  container: document.getElementById('viewer-container'),
  onModelLoaded: (meta) => console.log('Model loaded!', meta),
  onError: (error) => console.error('Error:', error)
});
```

---

## Use Case 1: Full-Page Viewer

**Perfect for:** Dedicated viewer applications, BIM portals

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IFC Viewer</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }

    #viewer-container {
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="viewer-container"></div>

  <script type="module">
    import { createIFCViewer } from '@ifc-viewer/core';
    import '@ifc-viewer/core/styles';

    const viewer = createIFCViewer({
      container: document.getElementById('viewer-container')
    });
  </script>
</body>
</html>
```

### ✅ What Works

- Viewer takes entire screen
- Sidebar works perfectly
- All controls visible
- No scrolling issues

### ⚠️ Important Notes

- Use `100vw` and `100vh` for container
- No need for additional CSS overrides
- This is the **default** intended use case

---

## Use Case 2: Embedded in Section

**Perfect for:** Product pages, documentation sites, blogs

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page with Embedded Viewer</title>
  <style>
    body {
      margin: 0;
      font-family: sans-serif;
    }

    header {
      background: #333;
      color: white;
      padding: 20px;
    }

    main {
      padding: 40px 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* CRITICAL: Viewer container styles */
    .viewer-wrapper {
      width: 100%;
      height: 600px;           /* Set explicit height */
      position: relative;      /* Create positioning context */
      margin: 40px 0;
      border-radius: 12px;
      overflow: hidden;        /* Clip escaped content */
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }

    #viewer-container {
      width: 100%;
      height: 100%;
      position: relative;
    }

    /* CRITICAL: Override viewer viewport sizing */
    #viewer-container .ifc-viewer-library-container.layout {
      height: 100% !important;    /* Override 100vh */
      width: 100% !important;     /* Override 100vw */
    }

    /* CRITICAL: Contain sidebar to container */
    #viewer-container .sidebar-slot {
      position: absolute !important;  /* Override fixed */
    }

    #viewer-container .sidebar-toggle {
      position: absolute !important;  /* Override fixed */
    }

    footer {
      background: #f5f5f5;
      padding: 40px 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <h1>My Project</h1>
  </header>

  <main>
    <h2>3D Model Viewer</h2>
    <p>View and interact with the BIM model below:</p>

    <div class="viewer-wrapper">
      <div id="viewer-container"></div>
    </div>

    <h3>About the Project</h3>
    <p>More content here...</p>
  </main>

  <footer>
    <p>&copy; 2025 My Company</p>
  </footer>

  <script type="module">
    import { createIFCViewer } from '@ifc-viewer/core';
    import '@ifc-viewer/core/styles';

    const viewer = createIFCViewer({
      container: document.getElementById('viewer-container')
    });
  </script>
</body>
</html>
```

### ✅ What This Does

1. **Sets explicit height** on wrapper (600px)
2. **Creates positioning context** with `position: relative`
3. **Clips content** with `overflow: hidden`
4. **Overrides viewport units** to container units
5. **Fixes sidebar positioning** from viewport to container

### ❌ Common Mistakes

**DON'T DO THIS:**

```html
<!-- ❌ BAD: No height, no positioning -->
<div id="viewer-container"></div>
```

```css
/* ❌ BAD: Missing overrides */
.viewer-wrapper {
  height: 600px;
  /* Missing position, overflow, and CSS overrides! */
}
```

### 💡 Pro Tips

- Always set **explicit height** (px, vh, or %)
- Use `position: relative` on wrapper
- Add the three **CRITICAL** CSS overrides
- Test with page scrolling

---

## Use Case 3: Landing Page with Viewer

**Perfect for:** Marketing sites, product showcases

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Landing Page</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: sans-serif;
      background: #0a0a0a;
      color: white;
    }

    /* Fixed Navigation */
    nav {
      position: fixed;
      top: 0;
      width: 100%;
      padding: 20px 50px;
      background: rgba(0, 0, 0, 0.9);
      z-index: 9999;  /* Higher than viewer */
      backdrop-filter: blur(10px);
    }

    /* Hero Section */
    .hero {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 100px 20px;
    }

    .hero h1 {
      font-size: 64px;
      text-align: center;
    }

    /* Viewer Demo Section */
    .demo-section {
      padding: 80px 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .demo-section h2 {
      font-size: 48px;
      text-align: center;
      margin-bottom: 40px;
    }

    /* CRITICAL: Viewer container with containment */
    .viewer-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      padding: 30px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      position: relative;     /* Positioning context */
      overflow: hidden;       /* Clip content */
    }

    #viewer-demo {
      width: 100%;
      height: 700px;
      position: relative;
    }

    /* CRITICAL: Override viewer defaults for embedded use */
    #viewer-demo .ifc-viewer-library-container.layout {
      height: 100% !important;
      width: 100% !important;
    }

    #viewer-demo .sidebar-slot {
      position: absolute !important;
    }

    #viewer-demo .sidebar-toggle {
      position: absolute !important;
    }

    /* Features Section */
    .features {
      padding: 80px 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.05);
      padding: 30px;
      border-radius: 12px;
    }

    footer {
      padding: 40px 20px;
      text-align: center;
      background: #000;
    }
  </style>
</head>
<body>
  <!-- Fixed Navigation -->
  <nav>
    <a href="#home">Home</a>
    <a href="#demo">Demo</a>
    <a href="#features">Features</a>
  </nav>

  <!-- Hero Section -->
  <section class="hero" id="home">
    <h1>Professional BIM Viewer</h1>
  </section>

  <!-- Viewer Demo Section -->
  <section class="demo-section" id="demo">
    <h2>Live Demo</h2>
    <div class="viewer-card">
      <div id="viewer-demo"></div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="features" id="features">
    <h2>Features</h2>
    <div class="features-grid">
      <div class="feature-card">
        <h3>🏗️ IFC Support</h3>
        <p>Full IFC file format support</p>
      </div>
      <div class="feature-card">
        <h3>📐 Measurements</h3>
        <p>Built-in measurement tools</p>
      </div>
      <div class="feature-card">
        <h3>🎨 Rendering</h3>
        <p>High-quality 3D rendering</p>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer>
    <p>&copy; 2025 - Powered by @ifc-viewer/core</p>
  </footer>

  <script type="module">
    import { createIFCViewer } from '@ifc-viewer/core';
    import '@ifc-viewer/core/styles';

    const viewer = createIFCViewer({
      container: document.getElementById('viewer-demo')
    });
  </script>
</body>
</html>
```

### ✅ Key Points

1. **Navigation z-index** (9999) must be higher than viewer
2. **Viewer card** has positioning and overflow
3. **Three CSS overrides** for embedded mode
4. Works with page scrolling and fixed navigation

---

## Use Case 4: Modal/Popup Viewer

**Perfect for:** Quick previews, galleries, thumbnail expansions

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Modal Viewer</title>
  <style>
    body {
      font-family: sans-serif;
      padding: 40px;
    }

    .open-viewer-btn {
      padding: 12px 24px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
    }

    /* Modal Overlay */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .modal-overlay.active {
      display: flex;
    }

    /* Modal Content */
    .modal-content {
      width: 90vw;
      height: 80vh;
      max-width: 1400px;
      max-height: 900px;
      background: #1a1a1a;
      border-radius: 12px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    /* Close Button */
    .close-modal {
      position: absolute;
      top: 20px;
      right: 20px;
      z-index: 10001;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Viewer Container */
    #modal-viewer {
      width: 100%;
      height: 100%;
      position: relative;
    }

    /* CRITICAL: Override for modal context */
    #modal-viewer .ifc-viewer-library-container.layout {
      height: 100% !important;
      width: 100% !important;
    }

    #modal-viewer .sidebar-slot {
      position: absolute !important;
    }

    #modal-viewer .sidebar-toggle {
      position: absolute !important;
    }
  </style>
</head>
<body>
  <h1>My Page</h1>
  <p>Click the button to view the BIM model:</p>

  <button class="open-viewer-btn" onclick="openViewer()">
    Open 3D Viewer
  </button>

  <!-- Modal -->
  <div class="modal-overlay" id="modal">
    <button class="close-modal" onclick="closeViewer()">×</button>
    <div class="modal-content">
      <div id="modal-viewer"></div>
    </div>
  </div>

  <script type="module">
    import { createIFCViewer } from '@ifc-viewer/core';
    import '@ifc-viewer/core/styles';

    let viewer = null;

    window.openViewer = function() {
      // Show modal
      document.getElementById('modal').classList.add('active');

      // Create viewer if not exists
      if (!viewer) {
        viewer = createIFCViewer({
          container: document.getElementById('modal-viewer')
        });
      }
    };

    window.closeViewer = function() {
      document.getElementById('modal').classList.remove('active');
    };

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.closeViewer();
      }
    });
  </script>
</body>
</html>
```

### ✅ Features

- Opens in modal overlay
- Close on button click or Escape key
- Viewer only created once
- Proper z-index management

---

## Common Issues & Solutions

### Issue 1: Sidebar Extends Full Page Height

**Problem:** Sidebar goes beyond viewer container

**Cause:** Viewer uses `position: fixed` which is relative to viewport

**Solution:** Override with container-relative positioning

```css
#your-container .sidebar-slot {
  position: absolute !important;
}
```

### Issue 2: Viewer Takes Full Screen

**Problem:** Viewer ignores container height

**Cause:** Viewer uses `100vh` (viewport height)

**Solution:** Override to use container height

```css
#your-container .ifc-viewer-library-container.layout {
  height: 100% !important;
  width: 100% !important;
}
```

### Issue 3: Controls Escape Container

**Problem:** Sidebar toggle appears outside container

**Cause:** Uses `position: fixed`

**Solution:**

```css
#your-container .sidebar-toggle {
  position: absolute !important;
}
```

### Issue 4: Navbar Gets Covered by Viewer

**Problem:** Fixed navigation hidden behind viewer

**Solution:** Increase navbar z-index

```css
.navbar {
  z-index: 9999;  /* Higher than viewer (1200) */
}
```

### Issue 5: No Height on Container

**Problem:** Viewer doesn't show or has 0 height

**Cause:** Container has no explicit height

**Solution:**

```css
.viewer-wrapper {
  height: 600px;  /* Or any value */
  /* OR */
  height: 80vh;   /* Viewport-relative */
  /* OR */
  min-height: 500px; /* Minimum height */
}
```

---

## Troubleshooting

### Checklist for Embedded Viewers

Use this checklist when embedding the viewer in a page:

- [ ] Container has explicit height (`height: 600px` or similar)
- [ ] Container has `position: relative`
- [ ] Container has `overflow: hidden`
- [ ] Added CSS override for `height: 100% !important`
- [ ] Added CSS override for `width: 100% !important`
- [ ] Added CSS override for `.sidebar-slot` positioning
- [ ] Added CSS override for `.sidebar-toggle` positioning
- [ ] Navbar/header has higher z-index than viewer (if fixed)
- [ ] Tested with page scrolling
- [ ] Tested sidebar open/close

### Quick Test

Add this to see if CSS is being applied:

```css
#your-container {
  border: 2px solid red; /* Should see red border */
}

#your-container .ifc-viewer-library-container.layout {
  border: 2px solid blue; /* Should see blue border */
}
```

### Debug with Browser DevTools

1. Open DevTools (F12)
2. Right-click viewer → Inspect
3. Check computed styles for:
   - `height` (should be px value, not vh)
   - `position` on `.sidebar-slot` (should be absolute)
   - `width` (should be px value, not vw)

### Still Not Working?

Check these:

1. **Did you import styles?**
   ```javascript
   import '@ifc-viewer/core/styles';
   ```

2. **Is CSS specificity correct?**
   ```css
   /* More specific = higher priority */
   #viewer-container .sidebar-slot { }
   ```

3. **Are styles in the right place?**
   - CSS must be loaded AFTER package styles
   - Or use `!important` to force override

4. **Check browser console for errors**
   - Look for import errors
   - Check for missing dependencies

---

## CSS Template

Copy-paste this template for any embedded viewer:

```html
<style>
  /* Your viewer container ID */
  #YOUR-VIEWER-ID {
    width: 100%;
    height: 600px;        /* Adjust as needed */
    position: relative;
    overflow: hidden;
  }

  /* REQUIRED: Override viewport sizing */
  #YOUR-VIEWER-ID .ifc-viewer-library-container.layout {
    height: 100% !important;
    width: 100% !important;
  }

  /* REQUIRED: Contain sidebar */
  #YOUR-VIEWER-ID .sidebar-slot {
    position: absolute !important;
  }

  /* REQUIRED: Contain toggle button */
  #YOUR-VIEWER-ID .sidebar-toggle {
    position: absolute !important;
  }
</style>

<div id="YOUR-VIEWER-ID"></div>

<script type="module">
  import { createIFCViewer } from '@ifc-viewer/core';
  import '@ifc-viewer/core/styles';

  const viewer = createIFCViewer({
    container: document.getElementById('YOUR-VIEWER-ID')
  });
</script>
```

---

## Summary

### When to Use Each Approach

| Use Case | Container Size | CSS Overrides Needed |
|----------|---------------|---------------------|
| **Full Page** | `100vw` × `100vh` | ❌ None |
| **Embedded Section** | Custom (e.g., `100%` × `600px`) | ✅ Required |
| **Landing Page** | Custom | ✅ Required |
| **Modal** | `90vw` × `80vh` | ✅ Required |

### The 3 Critical CSS Overrides

For ANY embedded viewer, you **MUST** add these three CSS rules:

```css
/* 1. Override viewport sizing */
.ifc-viewer-library-container.layout {
  height: 100% !important;
  width: 100% !important;
}

/* 2. Contain sidebar */
.sidebar-slot {
  position: absolute !important;
}

/* 3. Contain toggle */
.sidebar-toggle {
  position: absolute !important;
}
```

### Why These Are Needed

The viewer package is designed for **full-page applications** by default. It uses:
- `100vh`/`100vw` (viewport units) for sizing
- `position: fixed` (viewport-relative) for positioning

When embedding in a page section, these must be overridden to use container-relative values.

---

## Need Help?

- 📦 [npm Package](https://www.npmjs.com/package/@ifc-viewer/core)
- 📚 [GitHub Repository](https://github.com/yourusername/ifc-viewer-project)
- 💬 [Report Issues](https://github.com/yourusername/ifc-viewer-project/issues)

---

**Version:** 0.1.3
**Last Updated:** October 2025
**Package:** `@ifc-viewer/core`
