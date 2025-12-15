# IFC Viewer Project – **Detailed Documentation**

## Table of Contents
1. [Introduction](#introduction)
2. [Key Features](#key-features)
   1. [IFC Model Workflow](#ifc-model-workflow)
   2. [3-D Viewport](#3-d-viewport)
   3. [Sidebar Panels](#sidebar-panels)
   4. [🗺️ Minimap](#️-minimap)
   5. [Measurement Suite](#measurement-suite)
   6. [🎨 AI Photorealistic Visualizer](#-ai-photorealistic-visualizer)
   7. [Clipping Plane Tools](#clipping-plane-tools)
   8. [Camera Management](#camera-management)
   9. [Performance HUD](#performance-hud)
   10. [Robust Error-Handling Layer](#robust-error-handling-layer)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure) 
5. [Getting Started](#getting-started)
   1. [Prerequisites](#prerequisites)
   2. [Installation](#installation)
   3. [Available Scripts](#available-scripts)
   4. [Development Playground](#development-playground)
   5. [Building for Production](#building-for-production)
6. [Deployment Guide](#deployment-guide)
7. [Contributing](#contributing)
8. [Roadmap & Known Limitations](#roadmap--known-limitations)
9. [License](#license)
10. [Acknowledgements](#acknowledgements)

---

## Introduction
This repository contains a **modern, fully-typed React + TypeScript web application** that allows you to **load, inspect, and interact with Building Information Model (IFC) files** directly in the browser. It leverages the **That Open Company** ecosystem (OBC/Fragments/UI) on top of **Three.js** to deliver a desktop-grade BIM viewer experience with zero native installations.

> **What makes this fork special?** – It adds an opinionated, production-ready architecture, advanced tooling (minimap, clipping, measurements, mobile UX), and a comprehensive error-handling layer while keeping the codebase framework-agnostic and vendor-neutral.

---

## Key Features
### IFC Model Workflow
* **Drag-and-Drop / File Dialog Loader** – Import one or multiple IFC files via the _Load IFC_ button (powered by `@thatopen/ui-obc` helpers).
* **Model Tree (Relations Tree)** – Visualise the spatial structure of your model (Sites ⮕ Buildings ⮕ Storeys ⮕ Components). Includes fuzzy search and incremental loading.
* **Visibility Controls** – Toggle entire floors _or_ IFC entity categories (IfcWall, IfcDoor, …) through auto-generated checkboxes.
* **Element Properties** – Select any fragment to inspect its raw IFC attributes in a responsive table that supports live search, expand/collapse, TSV export, and copy-to-clipboard.

### 3-D Viewport
* **High-performance WebGL renderer** (Three.js r175) with PBR materials and IFC fragment optimisation.
* **Multiple Navigation Modes**
  * **Orbit** – classic track-ball controls (default).
  * **First-Person** – walk-through with WASD & mouse-look.
  * **Plan** – orthographic, top-down navigation ideal for floor exploration.
* **Camera Projections** – instant switch between _Perspective_ and _Orthographic_ (with constraint logic to avoid invalid mode combinations).
* **`Zoom to Selection` toggle** – automatically frame the last selected element(s).
* **`Fit to Model` action** – centres the whole model in view, independent of its original world-coordinates.

### Sidebar Panels
* **Modular BUI‐driven layout** – every tool lives inside its own _panel section_ that can be collapsed, extended, or even replaced at runtime.
* **Live-updating Classifier** – on model load, entity groups are cached to speed up toggling.
* **Element Properties**, **Minimap Settings**, **Clipping Tool**, **Camera Settings**, **Measurement Suite**, **AI Visualizer** – see dedicated sections below.

### 🗺️ Minimap
* Real-time overhead view rendered by `OBC.MiniMaps`.
* **Configurable**: _enabled_, _visible_, _lockRotation_, _zoom_, _frontOffset_, _sizeX_, _sizeY_.
* **Desktop Controls** – tweak settings via the **Minimap** section in the sidebar.
* **Mobile UX** – a floating ⚙️ settings button reveals a touch-friendly panel; click-away listener auto-hides it.
* **Dynamic Resize** – settings propagate instantly without re-initialising the canvas.

### Measurement Suite
* ✅ **Volume Measurement** (implemented)
  * Click an element ➜ surface area is analysed ➜ total volume displayed and stored.
  * Batch clear & enable/disable toggle.
* ⏳ **Upcoming**: Face, Edge, Angle, Area & Length measurements (place-holders scaffolded for future work). All share a common design language and event bus.

### 🎨 AI Photorealistic Visualizer
* **Transform your BIM view into photorealistic architectural renders** using AI-powered image-to-image generation.
* **How it works:**
  1. Position your camera to the desired view
  2. Select a render style preset (Photorealistic, Modern Interior, Exterior View, Night Scene)
  3. Click "Render View" to generate a photorealistic image
  4. Compare side-by-side: original view vs. AI-rendered result
* **Features:**
  * 🎯 4 built-in architectural rendering presets
  * ✏️ Custom prompt editor for fine-tuned control
  * 📸 Side-by-side comparison view
  * 💾 Download both original and rendered images
  * ⚡ Powered by FREE HuggingFace models (SDXL Turbo)
* **Setup:** Requires a free HuggingFace API token. See [.gitlab/HUGGINGFACE_SETUP.md](.gitlab/HUGGINGFACE_SETUP.md) for quick 5-minute setup guide.

### Clipping Plane Tools
* Axis-aligned plane (`X`, `Y`, `Z`) generated on demand.
* Adjustable via **slider** _and_ **Three.js TransformControls** gizmo.
* Renderer-level clipping ensures correct draw order and supports transparent materials.
* Smart clean-up logic: removes helper, plane, and disposes controls when disabled or component un-mounted.

### Camera Management
* Self-contained **Camera Section** exposes navigation mode, projection, user-input lock and fit-to-model.
* Guards against invalid combinations (e.g. First-Person × Orthographic) with user feedback.
* State synchronised through `BIMContext`; external tools can subscribe to `zoomToSelection` flag.

### Performance HUD
* **Stats.js overlay** (memory, FPS, milliseconds) – toggle on/off and switch panels from the sidebar Performance panel.
* Connected to the internal render-loop via `world.renderer.onBeforeUpdate/onAfterUpdate` hooks; zero overhead when disabled.

### Robust Error-Handling Layer
* Centralised [`ErrorHandler`](src/utils/errorHandler.ts) with **typed categories** (`BIM_INITIALIZATION`, `MODEL_LOADING`, …).
* Provides `handleBIMError`, `withErrorHandling` helpers for async flows.
* Outputs granular console warnings/errors **only** in non-critical situations, preserving UX.

---

## Technology Stack
* **React 18** + **TypeScript 5**
* **Vite 6** – lightning-fast bundling & HMR
* **Three.js r175** – underlying WebGL engine
* **@thatopen/components 2.4** – BIM logic & world management
* **@thatopen/components-front 2.4** – front-facing helpers (highlighter, relations tree, …)
* **@thatopen/fragments 3.0** – IFC fragment data model
* **@thatopen/ui 2.4** – lightweight Web Components for design-system-agnostic UIs
* **@thatopen/ui-obc 2.4** – high-level UI widgets for BIM (Ifc loader, relations tree, …)
* **web-ifc 0.0.68** – WASM parser
* **Stats.js 0.17** – performance widget

---

## Project Structure
```
ifc-viewer-project/
├── index.html                # ⚛️ React entry-point (mounted at <div id="root" />)
├── package.json              # npm scripts & dependencies
├── tsconfig.json             # TypeScript compiler options
├── vite.config.ts            # Dev-server & build config
├── start-both.bat            # Windows batch script to run both servers
├── intro/                    # 🆕 Introduction page (runs on port 4000)
│   ├── index.html            # Introduction page HTML
│   ├── styles.css            # Introduction page styles
│   ├── package.json          # Intro page server config
│   ├── README.md             # Intro page documentation
│   └── QUICKSTART.md         # Quick start guide
└── src/
    ├── App.tsx               # Root component – wraps providers & error boundary
    ├── main.tsx              # ReactDOM.createRoot bootstrap
    ├── context/
    │   └── BIMContext.tsx    # Global state provider (world, components, UI flags)
    ├── hooks/
    │   └── useBIMInitialization.ts # One-shot initialiser with retries & deduping
    ├── components/
    │   ├── bim/              # Viewer-centric components
    │   │   ├── Viewport.tsx
    │   │   └── Minimap.tsx
    │   ├── sidebar/          # Feature sections mounted inside <Sidebar />
    │   │   ├── ClippingSection.tsx
    │   │   ├── CameraSection.tsx
    │   │   ├── MeasurementSection.tsx
    │   │   └── VolumeMeasurement.tsx
    │   └── layout/           # High-level layout primitives
    │       ├── Layout.tsx
    │       ├── Sidebar.tsx
    │       ├── FooterToolbar.tsx
    │       └── ModelLoader.tsx
    ├── utils/
    │   └── errorHandler.ts   # Centralised error logic
    └── styles/               # Pure CSS modules scoped per component
        └── main.css
```
Each component is **self-contained** and ships with its own stylesheet to avoid global leakage.

---

## Getting Started
### Prerequisites
* **Node.js ≥ 16** (18 recommended)
* npm (comes with Node) or Yarn (v1) / pnpm.

### Installation
```bash
# Fork ⮕ Clone ⮕ Enter directory
$ git clone <your-fork-url>
$ cd ifc-viewer-project

# Install all dependencies
$ npm install   # or yarn / pnpm install

# Set up AI Visualizer (optional)
# Copy .env.example to .env and add your HuggingFace token
$ cp .env.example .env
# Then edit .env and replace with your token from https://huggingface.co/settings/tokens
```

### Available Scripts
| Command           | Description                                             |
|-------------------|---------------------------------------------------------|
| `npm run dev`     | Start Vite dev-server with HMR on <http://localhost:5173> |
| `npm run build`   | Type-check & produce a production-optimised build under `dist/` |
| `npm run preview` | Locally preview the build as it will run in prod        |
| `npm run intro`   | Start the introduction page on <http://localhost:4000>  |

> **Note:** TypeScript is run in `--noEmit` mode during `npm run dev`; a full `tsc` pass executes during `build` to guarantee type-safety.

### Development Playground
1. Fire up the dev server:
   ```bash
   npm run dev
   ```
2. Open the browser ➜ load an IFC file via the _Load IFC_ button.
3. Explore the tools in the sidebar, tweak minimap settings, enable clipping, etc.
4. Hot-module-reloading (HMR) will instantly update UI changes and preserve React state, including loaded models.

### Introduction Page
A separate introduction page is available in the `intro/` directory that provides:
* Welcome message and project overview
* Information about the team and key features
* Embedded IFC viewer for demonstration

To run the introduction page:
```bash
# Option 1: Using the convenience script (Windows)
start-both.bat

# Option 2: Manual start (run in separate terminals)
# Terminal 1 - Main viewer
npm run dev

# Terminal 2 - Introduction page
npm run intro
```

The introduction page will be available at <http://localhost:4000> and will embed the main viewer running on port 3000.

For more details, see [`intro/README.md`](intro/README.md).

### Building for Production
```bash
npm run build      # Generates static assets under ./dist
npm run preview    # Serves ./dist locally for smoke testing
```
The output is a fully static site (HTML + JS + WASM) which can be hosted on **GitHub Pages, Netlify, Vercel, S3**, or any static file server.

---

## Deployment Guide
A generic deployment pipeline is described in [`DEPLOYMENT.md`](../DEPLOYMENT.md). In short:
1. Ensure **`WEBIFC_PATH`** environment variable (or `importScripts`) points to the WASM bundle when serving from a sub-folder.
2. Upload the content of `dist/` to your hosting provider.
3. For single-page-apps behind a static server, enable fallback to `index.html`.

---

## CI/CD Pipeline

This project includes a **GitLab CI/CD pipeline** with automated quality checks, building, and deployment to GitLab Pages.

### 📚 Complete CI/CD Documentation

**➡️ [.gitlab/README.md](./.gitlab/README.md)** - Start here for all CI/CD documentation

**Pipeline Features:**
- ✅ Automated code quality checks (linting, formatting)
- ✅ Smart caching for faster builds (5-10x speedup)
- ✅ Conditional builds (skip when unnecessary)
- ✅ TypeDoc documentation generation
- ✅ GitLab Pages deployment
- ✅ Multi-branch support (main, development, production)

**Quick Start:**
```bash
# Run quality checks locally
npm run lint
npm run format:check

# Build for production
npm run build
```

**Pipeline Configuration:** [`.gitlab-ci.yml`](./.gitlab-ci.yml)

For detailed guides, troubleshooting, and best practices, see the [CI/CD Documentation](./.gitlab/README.md).

---

## Contributing
We :heart: contributions! Feel free to open issues or PRs for bugs, improvements, or new features.
1. **Fork** ➜ **Clone** ➜ create a feature branch.
2. Run `npm run dev` and reproduce your changes.
3. Ensure `npm run build` succeeds **and** that lint/formatting rules are respected.
4. Open a pull-request with a clear title, description, and screenshots/GIF when applicable.

> _Tip: the project uses semantic-release & conventional commits behind the scenes (CI pipeline). Follow the pattern `feat:`, `fix:`, `chore:` for commit messages to trigger correct changelog entries._

---

## Roadmap & Known Limitations
* [ ] Implement remaining **measurement** tools (Face, Edge, Angle, Area, Length).
* [ ] Optimise fragment renderer for extremely large (>5 M triangles) models.
* [ ] Add **section-box** tool and multi-plane clipping.
* [ ] Migrate UI to **Lit v3** once stable.
* [ ] Unit/E2E tests with **Playwright** covering mobile interactions.

---

## License
Licensed under the **MIT License** – see [`LICENSE`](LICENSE) for full text.

---

## Acknowledgements
* **That Open Company** for OSS tooling & inspiration.
* **Three.js** community for the underlying rendering engine.
* Everyone who reports bugs, suggests improvements, or contributes code ♥️.
