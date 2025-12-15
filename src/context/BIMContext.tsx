import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import * as OBC from '@thatopen/components';
import { useBIMInitialization } from '../hooks/useBIMInitialization';
import { MinimapConfig } from '../components/bim/Minimap';
import { captureScreenshot as captureScreenshotUtil } from '../utils/captureScreenshot';
import { PropertyEditingService } from '../core/services/propertyEditingService';
import { ViewerConfig, PartialViewerConfig, mergeViewerConfig, defaultViewerConfig } from '../config/viewerConfig';
import { MultiViewPreset } from '../types/viewer';
export type { MultiViewPreset } from '../types/viewer';
import { createEventBus } from '../api/eventBus';
import type { EventBus } from '../api/eventBus';
import { createPluginRegistry, PluginRegistry } from '../api/pluginRegistry';
import { ViewerEventMap } from '../types/events';
import { createViewerAPI, ViewerAPI } from '../api/viewerApi';

export interface SelectionMap {
  [fragmentId: string]: Set<string>;
}

interface BIMContextType {
  components: OBC.Components | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  visibilityPanelRef: React.MutableRefObject<HTMLElement | null>;
  world: OBC.World | null;
  setWorld: (world: OBC.World | null) => void;
  zoomToSelection: boolean;
  setZoomToSelection: (zoom: boolean) => void;
  minimapConfig: MinimapConfig;
  setMinimapConfig: (config: Partial<MinimapConfig>) => void;
  isModelLoading: boolean;
  setIsModelLoading: (isLoading: boolean) => void;
  captureScreenshot: () => Promise<string>;
  viewCubeEnabled: boolean;
  setViewCubeEnabled: (enabled: boolean) => void;
  onObjectSelected?: (selection: SelectionMap) => void;
  onModelLoaded?: (meta: Record<string, unknown>) => void;
  onError?: (error: unknown) => void;
  multiViewPreset: MultiViewPreset;
  setMultiViewPreset: (preset: MultiViewPreset) => void;
  propertyEditingService: PropertyEditingService | null;
  config: ViewerConfig;
  updateConfig: (config: PartialViewerConfig) => void;
  eventBus: EventBus<ViewerEventMap>;
  plugins: PluginRegistry;
  api: ViewerAPI;
  retry: () => void;
  reset: () => void;
  cleanup: () => void;
}

const DEFAULT_MINIMAP_CONFIG: MinimapConfig = {
  enabled: true,
  visible: false,
  lockRotation: false,
  zoom: 0.2,
  frontOffset: 1,
  sizeX: 200,
  sizeY: 200,
};

const BIMContext = createContext<BIMContextType>({
  components: null,
  isInitialized: false,
  isLoading: false,
  error: null,
  visibilityPanelRef: { current: null } as React.MutableRefObject<HTMLElement | null>,
  world: null,
  setWorld: () => {},
  zoomToSelection: true,
  setZoomToSelection: () => {},
  minimapConfig: DEFAULT_MINIMAP_CONFIG,
  setMinimapConfig: () => {},
  isModelLoading: false,
  setIsModelLoading: () => {},
  captureScreenshot: async () => '',
  viewCubeEnabled: true,
  setViewCubeEnabled: () => {},
  onObjectSelected: undefined,
  onModelLoaded: undefined,
  onError: undefined,
  multiViewPreset: 'single',
  setMultiViewPreset: () => {},
  propertyEditingService: null,
  config: defaultViewerConfig,
  updateConfig: () => {},
  eventBus: createEventBus<ViewerEventMap>(),
  plugins: createPluginRegistry(),
  api: {} as ViewerAPI,
  retry: () => {},
  reset: () => {},
  cleanup: () => {},
});

export const useBIM = () => useContext(BIMContext);

export interface BIMProviderProps {
  children: React.ReactNode;
  onObjectSelected?: (selection: SelectionMap) => void;
  onModelLoaded?: (meta: Record<string, unknown>) => void;
  onError?: (error: unknown) => void;
  config?: PartialViewerConfig;
  persistConfigKey?: string;
}

export const BIMProvider: React.FC<BIMProviderProps> = ({
  children,
  onObjectSelected,
  onModelLoaded,
  onError,
  config,
  persistConfigKey,
}) => {
  const [world, setWorld] = useState<OBC.World | null>(null);
  const [viewerConfig, setViewerConfig] = useState<ViewerConfig>(() => mergeViewerConfig(config));
  const [zoomToSelection, setZoomToSelectionState] = useState(viewerConfig.controls.zoomToSelection);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [minimapConfig, setMinimapConfigState] = useState<MinimapConfig>({
    ...DEFAULT_MINIMAP_CONFIG,
    ...viewerConfig.controls.minimap,
  });
  const [viewCubeEnabled, setViewCubeEnabledState] = useState(viewerConfig.controls.viewCube.enabled);
  const [multiViewPreset, setMultiViewPresetState] = useState<MultiViewPreset>(viewerConfig.layout.multiViewPreset);
  const [propertyEditingService, setPropertyEditingService] = useState<PropertyEditingService | null>(null);
  const visibilityPanelRef = useRef<HTMLElement | null>(null);
  const eventBusRef = useRef(createEventBus<ViewerEventMap>());
  const pluginRegistryRef = useRef<PluginRegistry>(createPluginRegistry());
  const apiRef = useRef<ViewerAPI | null>(null);

  const { components, isInitialized, isLoading, error, retry, reset, cleanup } =
    useBIMInitialization();

  useEffect(() => {
    setViewerConfig((prev) => mergeViewerConfig(config, prev));
  }, [config]);

  useEffect(() => {
    if (!persistConfigKey) {return;}
    try {
      const stored = localStorage.getItem(persistConfigKey);
      if (stored) {
        const parsed = JSON.parse(stored) as PartialViewerConfig;
        setViewerConfig((prev) => mergeViewerConfig(parsed, prev));
      }
    } catch (error) {
      console.warn('Failed to restore viewer config from storage', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!persistConfigKey) {return;}
    try {
      localStorage.setItem(persistConfigKey, JSON.stringify(viewerConfig));
    } catch (error) {
      console.warn('Failed to persist viewer config', error);
    }
  }, [persistConfigKey, viewerConfig]);

  useEffect(() => {
    setZoomToSelectionState(viewerConfig.controls.zoomToSelection);
    setViewCubeEnabledState(viewerConfig.controls.viewCube.enabled);
    setMinimapConfigState((prev) => ({ ...prev, ...viewerConfig.controls.minimap }));
    setMultiViewPresetState(viewerConfig.layout.multiViewPreset);
  }, [viewerConfig]);

  // Initialize property editing service when components are ready
  React.useEffect(() => {
    if (components && !propertyEditingService) {
      const initService = async () => {
        try {
          const { setupPropertyEditing } = await import('../core/services/propertyEditingService');
          const service = await setupPropertyEditing(components);
          setPropertyEditingService(service);
          console.log('Property editing service initialized');
        } catch (error) {
          console.error('Failed to initialize property editing service:', error);
        }
      };
      initService();
    }
  }, [components]);

  const updateConfig = (partial: PartialViewerConfig) => {
    setViewerConfig((prev) => mergeViewerConfig(partial, prev));
  };

  const setMinimapConfig = (config: Partial<MinimapConfig>) => {
    setMinimapConfigState((prev) => ({ ...prev, ...config }));
    updateConfig({ controls: { minimap: config } });
  };

  const setZoomToSelection = (zoom: boolean) => {
    setZoomToSelectionState(zoom);
    updateConfig({ controls: { zoomToSelection: zoom } });
  };

  const setViewCubeEnabled = (enabled: boolean) => {
    setViewCubeEnabledState(enabled);
    updateConfig({ controls: { viewCube: { enabled } } });
  };

  const setMultiViewPreset = (preset: MultiViewPreset) => {
    setMultiViewPresetState(preset);
    updateConfig({ layout: { multiViewPreset: preset } });
  };

  const captureScreenshot = useCallback(async (): Promise<string> => {
    if (!world?.renderer || !world?.scene || !world?.camera) {
      throw new Error('Renderer, scene, or camera not available');
    }

    try {
      // Get the Three.js renderer, scene, and camera from the world
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const threeRenderer = (world.renderer as any).three;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const threeScene = (world.scene as any).three;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const threeCamera = (world.camera as any).three;

      if (!threeRenderer || !threeScene || !threeCamera) {
        throw new Error('Three.js components not available');
      }

      // Force render for consistency
      threeRenderer.render(threeScene, threeCamera);

      // Use the shared utility for screenshot
      return captureScreenshotUtil(threeRenderer, threeScene, threeCamera);
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      throw error;
    }
  }, [world]);

  useEffect(() => {
    apiRef.current = createViewerAPI(
      () => components,
      () => world,
      eventBusRef.current,
      pluginRegistryRef.current,
      captureScreenshot,
      () => propertyEditingService
    );
  }, [components, world, captureScreenshot, propertyEditingService]);

  const api = apiRef.current ?? createViewerAPI(
    () => components,
    () => world,
    eventBusRef.current,
    pluginRegistryRef.current,
    captureScreenshot,
    () => propertyEditingService
  );

  return (
    <BIMContext.Provider
      value={{
        components,
        isInitialized,
        isLoading,
        error,
        visibilityPanelRef,
        world,
        setWorld,
        zoomToSelection,
        setZoomToSelection,
        minimapConfig,
        setMinimapConfig,
        isModelLoading,
        setIsModelLoading,
        captureScreenshot,
        viewCubeEnabled,
        setViewCubeEnabled,
        multiViewPreset,
        setMultiViewPreset,
        propertyEditingService,
        eventBus: eventBusRef.current,
        plugins: pluginRegistryRef.current,
        api,
        config: viewerConfig,
        updateConfig,
        onObjectSelected,
        onModelLoaded,
        onError,
        retry,
        reset,
        cleanup,
      }}
    >
      {children}
    </BIMContext.Provider>
  );
};
