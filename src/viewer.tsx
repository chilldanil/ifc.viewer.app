import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { bridge, CameraState } from './utils/bridge';
import { SelectionMap } from './context/BIMContext';
import { PartialViewerConfig, applyConfigToContainer, defaultViewerConfig, mergeViewerConfig } from './config/viewerConfig';
import { PartialDesignTokens, tokensToCSSVariables, mergeTokens, defaultDarkTokens, defaultLightTokens } from './config/tokens';

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

  /**
   * Full viewer configuration including layout, controls, features, appearance, and theme.
   * This is the recommended way to configure the viewer.
   */
  config?: PartialViewerConfig;

  /**
   * Direct design token overrides for complete styling control.
   * These override any tokens set via config.theme.tokens.
   */
  tokens?: PartialDesignTokens;

  /**
   * @deprecated Use `config` instead. Legacy CSS variable overrides.
   * Kept for backward compatibility.
   */
  theme?: Record<string, string>;

  /**
   * @deprecated Use `config.features` instead. Legacy feature flags.
   */
  features?: Partial<{
    minimap: boolean;
    measurement: boolean;
    clipping: boolean;
    floorplans: boolean;
    aiVisualizer: boolean;
  }>;
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

  /** Update the viewer configuration at runtime */
  updateConfig: (config: PartialViewerConfig) => void;

  /** Update design tokens at runtime */
  updateTokens: (tokens: PartialDesignTokens) => void;
}

/**
 * Creates and mounts an IFC viewer instance
 *
 * @example
 * ```typescript
 * // Basic usage
 * const viewer = createIFCViewer({
 *   container: document.getElementById('viewer'),
 *   onModelLoaded: (meta) => console.log('Model loaded:', meta),
 * });
 *
 * // Full customization
 * const viewer = createIFCViewer({
 *   container: document.getElementById('viewer'),
 *   config: {
 *     layout: {
 *       sidebar: { minWidth: 300, maxWidth: 500 },
 *       panels: { aiVisualizer: { enabled: false } },
 *     },
 *     appearance: {
 *       elementColors: { walls: '#ff0000', doors: '#00ff00' },
 *     },
 *     theme: { preset: 'dark' },
 *   },
 *   tokens: {
 *     colors: { primary: '#ff6600' },
 *   },
 * });
 *
 * await viewer.loadModelFromUrl('/path/to/model.ifc');
 * viewer.unmount();
 * ```
 */
export function createIFCViewer(options: CreateViewerOptions): ViewerHandle {
  const { container, theme, config, tokens } = options;

  // Merge user config with defaults
  const mergedConfig = mergeViewerConfig(config);

  // Get base tokens from theme preset
  const baseTokens = mergedConfig.theme.preset === 'light' ? defaultLightTokens : defaultDarkTokens;

  // Merge tokens: base -> config.theme.tokens -> direct tokens override
  let finalTokens = mergeTokens(baseTokens, mergedConfig.theme.tokens);
  if (tokens) {
    finalTokens = mergeTokens(finalTokens, tokens);
  }

  // Apply CSS variables to container
  const cssVars = tokensToCSSVariables(finalTokens);
  Object.entries(cssVars).forEach(([key, value]) => {
    container.style.setProperty(key, value);
  });

  // Apply legacy theme overrides (backward compatibility)
  if (theme) {
    Object.entries(theme).forEach(([key, value]) => {
      container.style.setProperty(key, value);
    });
  }

  // Store current tokens for runtime updates
  let currentTokens = finalTokens;

  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App
        onObjectSelected={options.onObjectSelected}
        onModelLoaded={options.onModelLoaded}
        onError={options.onError}
        config={mergedConfig}
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

    updateConfig: (newConfig: PartialViewerConfig) => {
      const updatedConfig = mergeViewerConfig(newConfig, mergedConfig);
      applyConfigToContainer(updatedConfig, container);
    },

    updateTokens: (newTokens: PartialDesignTokens) => {
      currentTokens = mergeTokens(currentTokens, newTokens);
      const cssVars = tokensToCSSVariables(currentTokens);
      Object.entries(cssVars).forEach(([key, value]) => {
        container.style.setProperty(key, value);
      });
    },
  };
}

// Re-export types and utilities for convenience
export type { SelectionMap } from './context/BIMContext';
export type { PartialViewerConfig, ViewerConfig } from './config/viewerConfig';
export type { PartialDesignTokens, DesignTokens } from './config/tokens';
export { defaultViewerConfig } from './config/viewerConfig';
export { defaultDarkTokens, defaultLightTokens } from './config/tokens';
