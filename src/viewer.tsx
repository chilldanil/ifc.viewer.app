import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { bridge, CameraState } from './utils/bridge';
import { SelectionMap } from './context/BIMContext';

/**
 * Configuration options for creating an IFC viewer instance
 */
export interface CreateViewerOptions {
  /** The HTML container element to mount the viewer into */
  container: HTMLElement;

  /** Callback fired when objects are selected in the viewer */
  onObjectSelected?: (selection: SelectionMap) => void;

  /** Callback fired when a model has finished loading */
  onModelLoaded?: (meta: Record<string, unknown>) => void;

  /** Callback fired when errors occur */
  onError?: (error: unknown) => void;

  /** Feature flags to enable/disable specific viewer features */
  features?: Partial<{
    minimap: boolean;
    measurement: boolean;
    clipping: boolean;
    floorplans: boolean;
    aiVisualizer: boolean;
  }>;

  /** Custom CSS theme variables to override default styling */
  theme?: Record<string, string>;
}

/**
 * Handle for controlling an IFC viewer instance
 */
export interface ViewerHandle {
  /** Unmount the viewer from its container */
  unmount: () => void;

  /** Load an IFC model from a URL */
  loadModelFromUrl: (url: string) => Promise<void>;

  /** Load an IFC model from a File object */
  loadModelFromFile: (file: File) => Promise<void>;

  /** Get the current camera state */
  getCameraState: () => Promise<CameraState>;

  /** Set the camera state */
  setCameraState: (state: CameraState) => Promise<void>;

  /** Capture a screenshot of the current view */
  captureScreenshot: () => Promise<string>;
}

/**
 * Creates and mounts an IFC viewer instance
 *
 * @example
 * ```typescript
 * const container = document.getElementById('viewer-container');
 * const viewer = createIFCViewer({
 *   container,
 *   onModelLoaded: (meta) => console.log('Model loaded:', meta),
 *   onObjectSelected: (selection) => console.log('Selected:', selection),
 * });
 *
 * // Load a model
 * await viewer.loadModelFromUrl('/path/to/model.ifc');
 *
 * // Cleanup when done
 * viewer.unmount();
 * ```
 *
 * @param options - Configuration options for the viewer
 * @returns A viewer handle with control methods
 */
export function createIFCViewer(options: CreateViewerOptions): ViewerHandle {
  const { container, theme } = options;

  // Apply theme tokens as CSS variables on container scope
  if (theme) {
    for (const [key, value] of Object.entries(theme)) {
      container.style.setProperty(key, value);
    }
  }

  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App
        onObjectSelected={options.onObjectSelected}
        onModelLoaded={options.onModelLoaded}
        onError={options.onError}
      />
    </React.StrictMode>
  );

  return {
    unmount: () => {
      root.unmount();
    },

    loadModelFromUrl: async (url: string) => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Load timeout'));
        }, 30000);

        bridge.emit({
          type: 'loadFromUrl',
          url,
          replyTo: (success: boolean) => {
            clearTimeout(timeout);
            if (success) {
              resolve();
            } else {
              reject(new Error('Failed to load model from URL'));
            }
          },
        });
      });
    },

    loadModelFromFile: async (file: File) => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Load timeout'));
        }, 30000);

        bridge.emit({
          type: 'loadFromFile',
          file,
          replyTo: (success: boolean) => {
            clearTimeout(timeout);
            if (success) {
              resolve();
            } else {
              reject(new Error('Failed to load model from file'));
            }
          },
        });
      });
    },

    getCameraState: () => {
      return new Promise<CameraState>((resolve) => {
        bridge.emit({
          type: 'getCameraState',
          replyTo: resolve,
        });
      });
    },

    setCameraState: async (state: CameraState) => {
      return new Promise<void>((resolve) => {
        bridge.emit({
          type: 'setCameraState',
          state,
          replyTo: () => resolve(),
        });
      });
    },

    captureScreenshot: async () => {
      return new Promise<string>((resolve) => {
        bridge.emit({
          type: 'captureScreenshot',
          replyTo: resolve,
        });
      });
    },
  };
}

// Re-export types for convenience
export type { SelectionMap } from './context/BIMContext';
