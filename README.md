# IFC Viewer

A modern React + TypeScript BIM viewer for IFC files. Built with Three.js and the That Open Company ecosystem.

## Features

- **IFC Model Loading** - Drag-and-drop or file dialog
- **3D Viewport** - High-performance WebGL with multiple navigation modes (Orbit, First-Person, Plan)
- **Model Tree** - Spatial structure visualization with search
- **Element Properties** - Inspect IFC attributes with export options
- **Minimap** - Real-time overhead view
- **Measurements** - Volume measurement tools
- **Clipping Planes** - Axis-aligned section cuts
- **AI Visualizer** - Transform views into photorealistic renders
- **Screenshots** - Capture and export views
- **Electron Support** - Desktop app packaging

## Tech Stack

- React 18 + TypeScript 5
- Vite 6
- Three.js r175
- @thatopen/components 2.4
- web-ifc 0.0.68

## Getting Started

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Electron

```bash
# Development with Electron
npm run electron:dev

# Build Electron app
npm run electron:build
```

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── bim/          # Viewport, Minimap
│   │   ├── layout/       # Layout, Sidebar, ModelLoader
│   │   └── sidebar/      # Feature panels
│   ├── context/          # React context (BIMContext)
│   ├── core/services/    # BIM services
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Utilities
│   ├── types/            # TypeScript declarations
│   └── styles/           # Global styles
├── electron/             # Electron main/preload
├── build/                # App icons
└── index.html            # Entry point
```

## NPM Package

This project can be used as an npm library:

```typescript
import { createIFCViewer } from '@ifc-viewer/core';

const viewer = createIFCViewer({
  container: document.getElementById('viewer'),
  onModelLoaded: (meta) => console.log('Loaded:', meta),
});

await viewer.loadModelFromUrl('/model.ifc');
```

## Environment Variables

Copy `.env.example` to `.env` for AI Visualizer features:

```bash
cp .env.example .env
```

## License

MIT
