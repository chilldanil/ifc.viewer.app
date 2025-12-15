import { MultiViewPreset } from '../types/viewer';
import { MinimapConfig } from '../components/bim/Minimap';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface ThemeTokens {
  primary?: string;
  danger?: string;
  text?: string;
  textMuted?: string;
  textSubtle?: string;
  bg?: string;
  bgHover?: string;
  bgActive?: string;
  border?: string;
  radius?: number;
}

export interface ViewerConfig {
  layout: {
    showSidebar: boolean;
    panels: {
      relationsTree: { enabled: boolean; collapsed: boolean };
      visibility: { enabled: boolean; collapsed: boolean };
      elementColors: { enabled: boolean; collapsed: boolean };
      renderModes: { enabled: boolean; collapsed: boolean };
      grids: { enabled: boolean; collapsed: boolean };
      camera: { enabled: boolean; collapsed: boolean };
      floorPlan: { enabled: boolean; collapsed: boolean };
      measurements: { enabled: boolean; collapsed: boolean };
      performance: { enabled: boolean; collapsed: boolean };
      viewCube: { enabled: boolean; collapsed: boolean };
      screenshots: { enabled: boolean; collapsed: boolean };
      minimap: { enabled: boolean; collapsed: boolean };
      clipping: { enabled: boolean; collapsed: boolean };
      modelTransform: { enabled: boolean; collapsed: boolean };
      properties: { enabled: boolean; collapsed: boolean };
      exportModifiedIfc: { enabled: boolean; collapsed: boolean };
      aiVisualizer: { enabled: boolean; collapsed: boolean };
    };
    multiViewPreset: MultiViewPreset;
  };
  controls: {
    navigationMode: 'Orbit' | 'FirstPerson' | 'Plan';
    projection: 'Perspective' | 'Orthographic';
    zoomToSelection: boolean;
    viewCube: boolean;
    minimap: Partial<MinimapConfig>;
  };
  features: {
    aiVisualizer: boolean;
    propertyEditing: boolean;
    dragAndDrop: boolean;
    exportModifiedIfc: boolean;
  };
  performance: {
    statsOverlay: boolean;
    selectionHighlightLimit: number;
    progressiveLoad: boolean;
  };
  theme: {
    preset: 'dark' | 'light';
    tokens?: ThemeTokens;
  };
}

export type PartialViewerConfig = DeepPartial<ViewerConfig>;

export const defaultViewerConfig: ViewerConfig = {
  layout: {
    showSidebar: true,
    panels: {
      relationsTree: { enabled: true, collapsed: false },
      visibility: { enabled: true, collapsed: true },
      elementColors: { enabled: true, collapsed: true },
      renderModes: { enabled: true, collapsed: true },
      camera: { enabled: true, collapsed: true },
      floorPlan: { enabled: true, collapsed: true },
      measurements: { enabled: true, collapsed: true },
      performance: { enabled: true, collapsed: false },
      viewCube: { enabled: true, collapsed: false },
      screenshots: { enabled: true, collapsed: false },
      grids: { enabled: true, collapsed: true },
      minimap: { enabled: true, collapsed: true },
      clipping: { enabled: true, collapsed: true },
      modelTransform: { enabled: true, collapsed: true },
      properties: { enabled: true, collapsed: true },
      exportModifiedIfc: { enabled: true, collapsed: true },
      aiVisualizer: { enabled: true, collapsed: true },
    },
    multiViewPreset: 'single',
  },
  controls: {
    navigationMode: 'Orbit',
    projection: 'Perspective',
    zoomToSelection: true,
    viewCube: true,
    minimap: {},
  },
  features: {
    aiVisualizer: true,
    propertyEditing: true,
    dragAndDrop: true,
    exportModifiedIfc: true,
  },
  performance: {
    statsOverlay: false,
    selectionHighlightLimit: 5000,
    progressiveLoad: true,
  },
  theme: {
    preset: 'dark',
    tokens: {},
  },
};

export const mergeViewerConfig = (
  override?: PartialViewerConfig,
  base: ViewerConfig = defaultViewerConfig
): ViewerConfig => {
  const merge = (target: any, source: any): any => {
    const result = Array.isArray(target) ? [...target] : { ...target };
    if (!source) {return result;}

    Object.entries(source).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = merge(result[key] ?? {}, value);
      } else {
        result[key] = value;
      }
    });

    return result;
  };

  return merge(base, override);
};
