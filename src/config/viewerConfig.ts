import { MultiViewPreset } from '../types/viewer';
import { MinimapConfig } from '../components/bim/Minimap';
import {
  DesignTokens,
  PartialDesignTokens,
  defaultDarkTokens,
  defaultLightTokens,
  mergeTokens,
  tokensToCSSVariables,
} from './tokens';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// ============================================================================
// LEGACY THEME TOKENS (kept for backward compatibility)
// ============================================================================

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

// ============================================================================
// ELEMENT COLORS CONFIG
// ============================================================================

export interface ElementColorsConfig {
  walls: string;
  slabs: string;
  curtainWalls: string;
  furniture: string;
  doors: string;
  windows: string;
}

// ============================================================================
// VIEWCUBE CONFIG
// ============================================================================

export interface ViewCubeConfig {
  enabled: boolean;
  dimension: number;
  fontSize: number;
  colors: {
    face: string;
    hover: string;
    outline: string;
    label: string;
    labelBackground: string;
    labelBorder: string;
  };
  faceNames: {
    top: string;
    front: string;
    right: string;
    back: string;
    left: string;
    bottom: string;
  };
}

// ============================================================================
// STATS OVERLAY CONFIG
// ============================================================================

export interface StatsOverlayConfig {
  enabled: boolean;
  position: {
    right: string;
    bottom: string;
  };
  borderRadius: string;
}

// ============================================================================
// DRAG AND DROP CONFIG
// ============================================================================

export interface DragDropConfig {
  enabled: boolean;
  colors: {
    backdrop: string;
    border: string;
    text: string;
  };
  borderRadius: string;
}

// ============================================================================
// GRID CONFIG
// ============================================================================

export interface GridConfig {
  defaultColor: string;
  defaultSize1: number;
  defaultSize2: number;
  defaultDistance: number;
}

// ============================================================================
// VIEWPORT CONFIG
// ============================================================================

export interface ViewportConfig {
  backgroundColor: string;
  secondaryBackgroundColor: string;
  borderRadius: string;
}

// ============================================================================
// SIDEBAR CONFIG
// ============================================================================

export interface SidebarConfig {
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  widthRatio: number;
  maxViewportRatio: number;
  position: 'left' | 'right';
}

// ============================================================================
// MAIN VIEWER CONFIG
// ============================================================================

export interface ViewerConfig {
  layout: {
    showSidebar: boolean;
    sidebar: SidebarConfig;
    panels: {
      relationsTree: { enabled: boolean; collapsed: boolean };
      visibility: { enabled: boolean; collapsed: boolean };
      elementColors: { enabled: boolean; collapsed: boolean };
      renderModes: { enabled: boolean; collapsed: boolean };
      hider: { enabled: boolean; collapsed: boolean };
      worlds: { enabled: boolean; collapsed: boolean };
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
    breakpoints: {
      sm: number;
      md: number;
      lg: number;
    };
  };
  controls: {
    navigationMode: 'Orbit' | 'FirstPerson' | 'Plan';
    projection: 'Perspective' | 'Orthographic';
    zoomToSelection: boolean;
    viewCube: ViewCubeConfig;
    minimap: Partial<MinimapConfig>;
    statsOverlay: StatsOverlayConfig;
  };
  features: {
    aiVisualizer: boolean;
    propertyEditing: boolean;
    dragAndDrop: DragDropConfig;
    exportModifiedIfc: boolean;
  };
  performance: {
    selectionHighlightLimit: number;
    progressiveLoad: boolean;
  };
  appearance: {
    viewport: ViewportConfig;
    grid: GridConfig;
    elementColors: ElementColorsConfig;
  };
  theme: {
    preset: 'dark' | 'light';
    tokens: PartialDesignTokens;
    /** @deprecated Use tokens instead */
    legacyTokens?: ThemeTokens;
  };
}

export type PartialViewerConfig = DeepPartial<ViewerConfig>;

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const defaultViewCubeConfig: ViewCubeConfig = {
  enabled: true,
  dimension: 100,
  fontSize: 16,
  colors: {
    face: defaultDarkTokens.colors.viewCubeFace,
    hover: defaultDarkTokens.colors.viewCubeHover,
    outline: defaultDarkTokens.colors.viewCubeOutline,
    label: defaultDarkTokens.colors.viewCubeLabel,
    labelBackground: defaultDarkTokens.colors.viewCubeLabelBg,
    labelBorder: defaultDarkTokens.colors.viewCubeLabelBorder,
  },
  faceNames: {
    top: 'TOP',
    front: 'FRONT',
    right: 'RIGHT',
    back: 'BACK',
    left: 'LEFT',
    bottom: 'BOTTOM',
  },
};

const defaultStatsOverlayConfig: StatsOverlayConfig = {
  enabled: false,
  position: {
    right: defaultDarkTokens.components.statsPositionRight,
    bottom: defaultDarkTokens.components.statsPositionBottom,
  },
  borderRadius: defaultDarkTokens.components.statsBorderRadius,
};

const defaultDragDropConfig: DragDropConfig = {
  enabled: true,
  colors: {
    backdrop: defaultDarkTokens.colors.overlayBackdrop,
    border: defaultDarkTokens.colors.overlayDragDropBorder,
    text: defaultDarkTokens.colors.overlayDragDrop,
  },
  borderRadius: '24px',
};

const defaultGridConfig: GridConfig = {
  defaultColor: defaultDarkTokens.colors.gridDefault,
  defaultSize1: 1,
  defaultSize2: 10,
  defaultDistance: 500,
};

const defaultViewportConfig: ViewportConfig = {
  backgroundColor: defaultDarkTokens.colors.viewportBackground,
  secondaryBackgroundColor: defaultDarkTokens.colors.secondaryViewportBackground,
  borderRadius: '14px',
};

const defaultElementColorsConfig: ElementColorsConfig = {
  walls: defaultDarkTokens.colors.elementWalls,
  slabs: defaultDarkTokens.colors.elementSlabs,
  curtainWalls: defaultDarkTokens.colors.elementCurtainWalls,
  furniture: defaultDarkTokens.colors.elementFurniture,
  doors: defaultDarkTokens.colors.elementDoors,
  windows: defaultDarkTokens.colors.elementWindows,
};

const defaultSidebarConfig: SidebarConfig = {
  minWidth: defaultDarkTokens.layout.sidebarMinWidth,
  maxWidth: defaultDarkTokens.layout.sidebarMaxWidth,
  defaultWidth: defaultDarkTokens.layout.sidebarDefaultWidth,
  widthRatio: defaultDarkTokens.layout.sidebarWidthRatio,
  maxViewportRatio: defaultDarkTokens.layout.sidebarMaxViewportRatio,
  position: 'left',
};

// ============================================================================
// DEFAULT VIEWER CONFIG
// ============================================================================

export const defaultViewerConfig: ViewerConfig = {
  layout: {
    showSidebar: true,
    sidebar: defaultSidebarConfig,
    panels: {
      relationsTree: { enabled: true, collapsed: false },
      visibility: { enabled: true, collapsed: true },
      elementColors: { enabled: true, collapsed: true },
      renderModes: { enabled: true, collapsed: true },
      hider: { enabled: true, collapsed: true },
      worlds: { enabled: true, collapsed: true },
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
    breakpoints: {
      sm: defaultDarkTokens.layout.breakpointSm,
      md: defaultDarkTokens.layout.breakpointMd,
      lg: defaultDarkTokens.layout.breakpointLg,
    },
  },
  controls: {
    navigationMode: 'Orbit',
    projection: 'Perspective',
    zoomToSelection: true,
    viewCube: defaultViewCubeConfig,
    minimap: {},
    statsOverlay: defaultStatsOverlayConfig,
  },
  features: {
    aiVisualizer: true,
    propertyEditing: true,
    dragAndDrop: defaultDragDropConfig,
    exportModifiedIfc: true,
  },
  performance: {
    selectionHighlightLimit: 5000,
    progressiveLoad: true,
  },
  appearance: {
    viewport: defaultViewportConfig,
    grid: defaultGridConfig,
    elementColors: defaultElementColorsConfig,
  },
  theme: {
    preset: 'dark',
    tokens: {},
  },
};

// ============================================================================
// MERGE UTILITY
// ============================================================================

export const mergeViewerConfig = (
  override?: PartialViewerConfig,
  base: ViewerConfig = defaultViewerConfig
): ViewerConfig => {
  const merge = (target: any, source: any): any => {
    const result = Array.isArray(target) ? [...target] : { ...target };
    if (!source) {
      return result;
    }

    Object.entries(source).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = merge(result[key] ?? {}, value);
      } else if (value !== undefined) {
        result[key] = value;
      }
    });

    return result;
  };

  return merge(base, override);
};

// ============================================================================
// THEME UTILITIES
// ============================================================================

/**
 * Get the complete design tokens for the current configuration
 */
export function getConfigTokens(config: ViewerConfig): DesignTokens {
  const baseTokens = config.theme.preset === 'light' ? defaultLightTokens : defaultDarkTokens;

  // Merge with user-provided tokens
  let tokens = mergeTokens(baseTokens, config.theme.tokens);

  // Apply config-specific overrides
  if (config.controls.viewCube?.colors) {
    tokens.colors.viewCubeFace = config.controls.viewCube.colors.face;
    tokens.colors.viewCubeHover = config.controls.viewCube.colors.hover;
    tokens.colors.viewCubeOutline = config.controls.viewCube.colors.outline;
    tokens.colors.viewCubeLabel = config.controls.viewCube.colors.label;
    tokens.colors.viewCubeLabelBg = config.controls.viewCube.colors.labelBackground;
    tokens.colors.viewCubeLabelBorder = config.controls.viewCube.colors.labelBorder;
  }

  if (config.appearance?.elementColors) {
    tokens.colors.elementWalls = config.appearance.elementColors.walls;
    tokens.colors.elementSlabs = config.appearance.elementColors.slabs;
    tokens.colors.elementCurtainWalls = config.appearance.elementColors.curtainWalls;
    tokens.colors.elementFurniture = config.appearance.elementColors.furniture;
    tokens.colors.elementDoors = config.appearance.elementColors.doors;
    tokens.colors.elementWindows = config.appearance.elementColors.windows;
  }

  if (config.appearance?.grid) {
    tokens.colors.gridDefault = config.appearance.grid.defaultColor;
  }

  if (config.appearance?.viewport) {
    tokens.colors.viewportBackground = config.appearance.viewport.backgroundColor;
    tokens.colors.secondaryViewportBackground = config.appearance.viewport.secondaryBackgroundColor;
  }

  if (config.features?.dragAndDrop?.colors) {
    tokens.colors.overlayBackdrop = config.features.dragAndDrop.colors.backdrop;
    tokens.colors.overlayDragDropBorder = config.features.dragAndDrop.colors.border;
    tokens.colors.overlayDragDrop = config.features.dragAndDrop.colors.text;
  }

  if (config.layout?.sidebar) {
    tokens.layout.sidebarMinWidth = config.layout.sidebar.minWidth;
    tokens.layout.sidebarMaxWidth = config.layout.sidebar.maxWidth;
    tokens.layout.sidebarDefaultWidth = config.layout.sidebar.defaultWidth;
    tokens.layout.sidebarWidthRatio = config.layout.sidebar.widthRatio;
    tokens.layout.sidebarMaxViewportRatio = config.layout.sidebar.maxViewportRatio;
  }

  if (config.layout?.breakpoints) {
    tokens.layout.breakpointSm = config.layout.breakpoints.sm;
    tokens.layout.breakpointMd = config.layout.breakpoints.md;
    tokens.layout.breakpointLg = config.layout.breakpoints.lg;
  }

  if (config.controls?.viewCube) {
    tokens.components.viewCubeDimension = config.controls.viewCube.dimension;
    tokens.components.viewCubeFontSize = config.controls.viewCube.fontSize;
  }

  if (config.controls?.statsOverlay?.position) {
    tokens.components.statsPositionRight = config.controls.statsOverlay.position.right;
    tokens.components.statsPositionBottom = config.controls.statsOverlay.position.bottom;
  }

  if (config.controls?.statsOverlay?.borderRadius) {
    tokens.components.statsBorderRadius = config.controls.statsOverlay.borderRadius;
  }

  return tokens;
}

/**
 * Get CSS variables for the current configuration
 */
export function getConfigCSSVariables(config: ViewerConfig): Record<string, string> {
  const tokens = getConfigTokens(config);
  return tokensToCSSVariables(tokens);
}

/**
 * Apply CSS variables to a container element
 */
export function applyConfigToContainer(config: ViewerConfig, container: HTMLElement): void {
  const cssVars = getConfigCSSVariables(config);
  Object.entries(cssVars).forEach(([key, value]) => {
    container.style.setProperty(key, value);
  });
}
