# IFC Viewer

A modern React + TypeScript BIM viewer for IFC files. Built with Three.js and the That Open Company ecosystem.

## Installation

```bash
npm install deployable-ifc-viewer
```

**Peer Dependencies:** This package requires React 18+:
```bash
npm install react react-dom
```

## Quick Start

```typescript
import { createIFCViewer } from 'deployable-ifc-viewer';
import 'deployable-ifc-viewer/styles';

// Create a container element
const container = document.getElementById('viewer');

// Initialize the viewer
const viewer = createIFCViewer({
  container,
  onModelLoaded: (meta) => console.log('Model loaded:', meta),
  onError: (error) => console.error('Error:', error),
});

// Load a model
await viewer.loadModelFromUrl('/path/to/model.ifc');

// Or load from a File object
// await viewer.loadModelFromFile(file);

// Clean up when done
viewer.unmount();
```

## Usage with React

```tsx
import { useEffect, useRef } from 'react';
import { createIFCViewer, ViewerHandle } from 'deployable-ifc-viewer';
import 'deployable-ifc-viewer/styles';

function IFCViewerComponent({ modelUrl }: { modelUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ViewerHandle | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    viewerRef.current = createIFCViewer({
      container: containerRef.current,
      onModelLoaded: (meta) => console.log('Loaded:', meta),
    });

    if (modelUrl) {
      viewerRef.current.loadModelFromUrl(modelUrl);
    }

    return () => {
      viewerRef.current?.unmount();
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
}
```

## Configuration

### Full Configuration Example

```typescript
const viewer = createIFCViewer({
  container: document.getElementById('viewer'),

  // Callbacks
  onObjectSelected: (selection) => console.log('Selected:', selection),
  onModelLoaded: (meta) => console.log('Model loaded:', meta),
  onError: (error) => console.error('Error:', error),

  // Viewer configuration
  config: {
    layout: {
      showSidebar: true,
      sidebar: {
        minWidth: 280,
        maxWidth: 500,
        position: 'right', // 'left' or 'right'
      },
      panels: {
        aiVisualizer: { enabled: false },
        clipping: { enabled: true, collapsed: false },
        measurements: { enabled: true },
      },
    },
    controls: {
      navigationMode: 'Orbit', // 'Orbit', 'FirstPerson', 'Plan'
      projection: 'Perspective', // 'Perspective', 'Orthographic'
    },
    appearance: {
      elementColors: {
        walls: '#e0e0e0',
        doors: '#8b4513',
        windows: '#87ceeb',
      },
      viewport: {
        backgroundColor: '#1a1a2e',
      },
    },
    theme: {
      preset: 'dark', // 'dark' or 'light'
    },
  },

  // Design token overrides for complete styling control
  tokens: {
    colors: {
      primary: '#ff6600',
      background: '#0a0a0a',
    },
    radius: {
      md: '8px',
    },
  },
});
```

### Runtime Updates

```typescript
// Update configuration at runtime
viewer.updateConfig({
  controls: { navigationMode: 'FirstPerson' },
});

// Update design tokens at runtime
viewer.updateTokens({
  colors: { primary: '#00ff00' },
});
```

## API Reference

### `createIFCViewer(options): ViewerHandle`

Creates and mounts an IFC viewer instance.

#### Options

| Property | Type | Description |
|----------|------|-------------|
| `container` | `HTMLElement` | **Required.** Container element for the viewer |
| `onObjectSelected` | `(selection: SelectionMap) => void` | Callback when objects are selected |
| `onModelLoaded` | `(meta: Record<string, unknown>) => void` | Callback when model loads |
| `onError` | `(error: unknown) => void` | Callback for errors |
| `config` | `PartialViewerConfig` | Viewer configuration |
| `tokens` | `PartialDesignTokens` | Design token overrides |

#### ViewerHandle Methods

| Method | Description |
|--------|-------------|
| `loadModelFromUrl(url: string)` | Load an IFC model from a URL |
| `loadModelFromFile(file: File)` | Load an IFC model from a File object |
| `getCameraState()` | Get current camera position and target |
| `setCameraState(state)` | Set camera position and target |
| `captureScreenshot()` | Capture current view as base64 image |
| `updateConfig(config)` | Update viewer configuration at runtime |
| `updateTokens(tokens)` | Update design tokens at runtime |
| `unmount()` | Destroy the viewer instance |

## Features

- **IFC Model Loading** - Drag-and-drop or file dialog
- **3D Viewport** - High-performance WebGL with multiple navigation modes (Orbit, First-Person, Plan)
- **Model Tree** - Spatial structure visualization with search
- **Element Properties** - Inspect IFC attributes with export options
- **Minimap** - Real-time overhead view
- **Measurements** - Volume measurement tools
- **Clipping Planes** - Axis-aligned section cuts
- **AI Visualizer** - Transform views into photorealistic renders (requires API key)
- **Screenshots** - Capture and export views
- **View Cube** - 3D orientation widget
- **Multi-view** - Single, dual, triple, or quad viewport layouts

## AI Visualizer Setup (Optional)

To enable the AI Visualizer feature, you need a Replicate API token:

1. Get an API key from [replicate.com](https://replicate.com)
2. The token can be entered directly in the AI Visualizer panel in the sidebar

## Tech Stack

- React 18 + TypeScript 5
- Three.js r175
- @thatopen/components 2.4
- web-ifc 0.0.68

## Development

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

## Electron Desktop App

```bash
# Development with Electron
npm run electron:dev

# Build Electron app
npm run electron:build
```

## License

MIT
