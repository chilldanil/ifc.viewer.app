import React, { createContext, useContext, useState, useRef } from 'react';
import * as OBC from '@thatopen/components';
import { useBIMInitialization } from '../hooks/useBIMInitialization';
import { MinimapConfig } from '../components/bim/Minimap';
import { captureScreenshot as captureScreenshotUtil } from '../utils/captureScreenshot';

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
  retry: () => void;
  reset: () => void;
  cleanup: () => void;
}

export type MultiViewPreset = 'single' | 'dual' | 'triple' | 'quad';

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
}

export const BIMProvider: React.FC<BIMProviderProps> = ({
  children,
  onObjectSelected,
  onModelLoaded,
  onError,
}) => {
  const [world, setWorld] = useState<OBC.World | null>(null);
  const [zoomToSelection, setZoomToSelection] = useState(true);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [minimapConfig, setMinimapConfigState] = useState<MinimapConfig>(DEFAULT_MINIMAP_CONFIG);
  const [viewCubeEnabled, setViewCubeEnabled] = useState(true);
  const [multiViewPreset, setMultiViewPreset] = useState<MultiViewPreset>('single');
  const visibilityPanelRef = useRef<HTMLElement | null>(null);

  const { components, isInitialized, isLoading, error, retry, reset, cleanup } =
    useBIMInitialization();

  const setMinimapConfig = (config: Partial<MinimapConfig>) => {
    setMinimapConfigState((prev) => ({ ...prev, ...config }));
  };

  const captureScreenshot = async (): Promise<string> => {
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
  };

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
