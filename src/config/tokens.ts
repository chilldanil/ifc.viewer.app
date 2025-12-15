/**
 * IFC Viewer Design Tokens
 *
 * This is the SINGLE SOURCE OF TRUTH for all design values in the viewer.
 * All colors, spacing, sizing, and other design values should be defined here.
 *
 * These tokens are converted to CSS variables and can be overridden by users
 * via the `theme` prop in createIFCViewer().
 */

// ============================================================================
// COLOR TOKENS
// ============================================================================

export interface ColorTokens {
  // Brand colors
  primary: string;
  primaryHover: string;
  primaryActive: string;

  // Semantic colors
  danger: string;
  dangerHover: string;
  dangerActive: string;
  warning: string;
  success: string;
  info: string;

  // Text colors
  text: string;
  textMuted: string;
  textSubtle: string;

  // Background colors
  background: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  surfaceMuted: string;
  surfaceElevated: string;

  // Border colors
  border: string;
  borderStrong: string;
  borderFocus: string;

  // Overlay colors
  overlayBackdrop: string;
  overlayDragDrop: string;
  overlayDragDropBorder: string;

  // Component-specific colors
  viewCubeFace: string;
  viewCubeHover: string;
  viewCubeOutline: string;
  viewCubeLabel: string;
  viewCubeLabelBg: string;
  viewCubeLabelBorder: string;

  // Element type colors (for visibility panel)
  elementWalls: string;
  elementSlabs: string;
  elementCurtainWalls: string;
  elementFurniture: string;
  elementDoors: string;
  elementWindows: string;

  // Grid color
  gridDefault: string;

  // Viewport background
  viewportBackground: string;
  secondaryViewportBackground: string;
}

// ============================================================================
// SPACING TOKENS
// ============================================================================

export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

// ============================================================================
// BORDER RADIUS TOKENS
// ============================================================================

export interface RadiusTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

// ============================================================================
// SHADOW TOKENS
// ============================================================================

export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  statsOverlay: string;
  minimap: string;
  sidebar: string;
  panel: string;
  button: string;
}

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export interface TypographyTokens {
  fontFamily: string;
  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeBase: string;
  fontSizeLg: string;
  fontSizeXl: string;
  fontWeightNormal: string;
  fontWeightMedium: string;
  fontWeightSemibold: string;
  fontWeightBold: string;
  lineHeight: string;
  letterSpacing: string;
  letterSpacingWide: string;
}

// ============================================================================
// LAYOUT TOKENS
// ============================================================================

export interface LayoutTokens {
  // Sidebar dimensions
  sidebarMinWidth: number;
  sidebarMaxWidth: number;
  sidebarDefaultWidth: number;
  sidebarWidthRatio: number;
  sidebarMaxViewportRatio: number;

  // Breakpoints
  breakpointSm: number;
  breakpointMd: number;
  breakpointLg: number;

  // Gaps and padding
  viewerGridGap: string;
  mainContentPadding: string;
  sidebarPadding: string;
  panelGap: string;
  sectionGap: string;

  // Z-indices
  zIndexSidebar: number;
  zIndexSidebarResizer: number;
  zIndexSidebarToggle: number;
  zIndexStatsOverlay: number;
  zIndexDragOverlay: number;
  zIndexMinimap: number;
  zIndexViewCube: number;
}

// ============================================================================
// COMPONENT TOKENS
// ============================================================================

export interface ComponentTokens {
  // Control heights
  controlHeight: string;
  controlHeightSm: string;
  controlHeightLg: string;

  // Button
  buttonMinWidth: string;
  buttonIconSize: string;

  // Toggle
  toggleWidth: string;
  toggleHeight: string;
  toggleThumbSize: string;

  // Slider
  sliderTrackHeight: string;
  sliderThumbSize: string;

  // Input
  inputMinHeight: string;
  textareaMinHeight: string;

  // Scrollbar
  scrollbarWidth: string;
  scrollbarWidthMobile: string;

  // Minimap
  minimapDefaultSize: number;
  minimapBorderRadius: string;

  // Stats overlay
  statsPositionRight: string;
  statsPositionBottom: string;
  statsBorderRadius: string;

  // Loading spinner
  spinnerSize: string;

  // ViewCube
  viewCubeDimension: number;
  viewCubeFontSize: number;
}

// ============================================================================
// ANIMATION TOKENS
// ============================================================================

export interface AnimationTokens {
  transitionFast: string;
  transitionBase: string;
  transitionSlow: string;
  easeDefault: string;
  easeIn: string;
  easeOut: string;
  easeInOut: string;
}

// ============================================================================
// COMPLETE DESIGN TOKENS INTERFACE
// ============================================================================

export interface DesignTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
  typography: TypographyTokens;
  layout: LayoutTokens;
  components: ComponentTokens;
  animation: AnimationTokens;
}

// ============================================================================
// DEFAULT DARK THEME TOKENS
// ============================================================================

export const defaultDarkTokens: DesignTokens = {
  colors: {
    // Brand colors
    primary: '#5e7cff',
    primaryHover: '#7b94ff',
    primaryActive: '#4a66e0',

    // Semantic colors
    danger: '#f87171',
    dangerHover: '#fca5a5',
    dangerActive: '#ef4444',
    warning: '#f6c177',
    success: '#34d399',
    info: '#38bdf8',

    // Text colors
    text: '#eef2fb',
    textMuted: 'rgba(238, 242, 251, 0.7)',
    textSubtle: 'rgba(238, 242, 251, 0.5)',

    // Background colors
    background: '#0b1018',
    surface: 'rgba(9, 14, 22, 0.94)',
    surfaceHover: 'rgba(26, 34, 48, 0.95)',
    surfaceActive: 'rgba(32, 42, 58, 0.95)',
    surfaceMuted: 'rgba(20, 27, 40, 0.88)',
    surfaceElevated: 'rgba(17, 24, 36, 0.92)',

    // Border colors
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(94, 124, 255, 0.35)',
    borderFocus: '#5e7cff',

    // Overlay colors
    overlayBackdrop: 'rgba(0, 0, 0, 0.45)',
    overlayDragDrop: '#bcf124',
    overlayDragDropBorder: '#bcf124',

    // ViewCube colors
    viewCubeFace: '#1a2230',
    viewCubeHover: '#8da3ff',
    viewCubeOutline: '#384357',
    viewCubeLabel: 'rgba(238, 242, 251, 0.9)',
    viewCubeLabelBg: 'rgba(26, 33, 45, 0.9)',
    viewCubeLabelBorder: 'rgba(58, 71, 107, 1)',

    // Element type colors
    elementWalls: '#3498db',
    elementSlabs: '#e74c3c',
    elementCurtainWalls: '#f39c12',
    elementFurniture: '#9b59b6',
    elementDoors: '#2ecc71',
    elementWindows: '#1abc9c',

    // Grid color
    gridDefault: '#555555',

    // Viewport backgrounds
    viewportBackground: '#0b1018',
    secondaryViewportBackground: '#0d131c',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },

  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '10px',
    xl: '12px',
    full: '999px',
  },

  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
    md: '0 4px 12px rgba(0, 0, 0, 0.15)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.2)',
    xl: '0 18px 48px rgba(0, 0, 0, 0.46)',
    statsOverlay: '0 14px 32px rgba(0, 0, 0, 0.35)',
    minimap: '0 4px 8px rgba(0, 0, 0, 0.2)',
    sidebar: '0 18px 48px rgba(0, 0, 0, 0.46)',
    panel: '0 10px 24px rgba(4, 8, 16, 0.3)',
    button: '0 6px 14px rgba(6, 10, 20, 0.35)',
  },

  typography: {
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif",
    fontSizeXs: '0.7rem',
    fontSizeSm: '0.78rem',
    fontSizeBase: '0.85rem',
    fontSizeLg: '0.95rem',
    fontSizeXl: '1.1rem',
    fontWeightNormal: '400',
    fontWeightMedium: '500',
    fontWeightSemibold: '600',
    fontWeightBold: '700',
    lineHeight: '1.4',
    letterSpacing: '0.01em',
    letterSpacingWide: '0.04em',
  },

  layout: {
    // Sidebar dimensions
    sidebarMinWidth: 260,
    sidebarMaxWidth: 680,
    sidebarDefaultWidth: 320,
    sidebarWidthRatio: 0.26,
    sidebarMaxViewportRatio: 0.92,

    // Breakpoints
    breakpointSm: 640,
    breakpointMd: 900,
    breakpointLg: 1200,

    // Gaps and padding
    viewerGridGap: '12px',
    mainContentPadding: '14px',
    sidebarPadding: '22px 20px 26px',
    panelGap: '18px',
    sectionGap: '10px',

    // Z-indices
    zIndexSidebar: 1100,
    zIndexSidebarResizer: 1300,
    zIndexSidebarToggle: 1200,
    zIndexStatsOverlay: 1400,
    zIndexDragOverlay: 9999,
    zIndexMinimap: 1000,
    zIndexViewCube: 1000,
  },

  components: {
    // Control heights
    controlHeight: '36px',
    controlHeightSm: '28px',
    controlHeightLg: '44px',

    // Button
    buttonMinWidth: '32px',
    buttonIconSize: '32px',

    // Toggle
    toggleWidth: '36px',
    toggleHeight: '20px',
    toggleThumbSize: '14px',

    // Slider
    sliderTrackHeight: '6px',
    sliderThumbSize: '16px',

    // Input
    inputMinHeight: '36px',
    textareaMinHeight: '80px',

    // Scrollbar
    scrollbarWidth: '8px',
    scrollbarWidthMobile: '4px',

    // Minimap
    minimapDefaultSize: 200,
    minimapBorderRadius: '12px',

    // Stats overlay
    statsPositionRight: '20px',
    statsPositionBottom: '20px',
    statsBorderRadius: '8px',

    // Loading spinner
    spinnerSize: '40px',

    // ViewCube
    viewCubeDimension: 100,
    viewCubeFontSize: 16,
  },

  animation: {
    transitionFast: '0.15s',
    transitionBase: '0.2s',
    transitionSlow: '0.28s',
    easeDefault: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// ============================================================================
// DEFAULT LIGHT THEME TOKENS
// ============================================================================

export const defaultLightTokens: DesignTokens = {
  ...defaultDarkTokens,
  colors: {
    ...defaultDarkTokens.colors,

    // Brand colors
    primary: '#3b5bdb',
    primaryHover: '#4c6ef5',
    primaryActive: '#364fc7',

    // Semantic colors
    danger: '#e03131',
    dangerHover: '#f03e3e',
    dangerActive: '#c92a2a',
    warning: '#f59f00',
    success: '#2f9e44',
    info: '#1c7ed6',

    // Text colors
    text: '#1f2933',
    textMuted: '#52606d',
    textSubtle: '#7b8794',

    // Background colors
    background: '#f8f9fa',
    surface: '#ffffff',
    surfaceHover: '#f1f3f5',
    surfaceActive: '#e9ecef',
    surfaceMuted: '#f8f9fa',
    surfaceElevated: '#ffffff',

    // Border colors
    border: 'rgba(0, 0, 0, 0.08)',
    borderStrong: 'rgba(59, 91, 219, 0.35)',
    borderFocus: '#3b5bdb',

    // Overlay colors
    overlayBackdrop: 'rgba(0, 0, 0, 0.3)',
    overlayDragDrop: '#40c057',
    overlayDragDropBorder: '#40c057',

    // ViewCube colors
    viewCubeFace: '#e9ecef',
    viewCubeHover: '#4c6ef5',
    viewCubeOutline: '#adb5bd',
    viewCubeLabel: '#1f2933',
    viewCubeLabelBg: 'rgba(255, 255, 255, 0.95)',
    viewCubeLabelBorder: '#adb5bd',

    // Viewport backgrounds
    viewportBackground: '#f8f9fa',
    secondaryViewportBackground: '#e9ecef',
  },

  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
    md: '0 4px 12px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
    xl: '0 18px 48px rgba(0, 0, 0, 0.15)',
    statsOverlay: '0 14px 32px rgba(0, 0, 0, 0.15)',
    minimap: '0 4px 8px rgba(0, 0, 0, 0.1)',
    sidebar: '0 18px 48px rgba(0, 0, 0, 0.15)',
    panel: '0 10px 24px rgba(0, 0, 0, 0.08)',
    button: '0 6px 14px rgba(0, 0, 0, 0.1)',
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Converts design tokens to CSS custom properties
 */
export function tokensToCSSVariables(tokens: DesignTokens): Record<string, string> {
  const vars: Record<string, string> = {};

  // Colors
  Object.entries(tokens.colors).forEach(([key, value]) => {
    vars[`--ifc-color-${camelToKebab(key)}`] = value;
  });

  // Spacing
  Object.entries(tokens.spacing).forEach(([key, value]) => {
    vars[`--ifc-space-${key}`] = value;
  });

  // Radius
  Object.entries(tokens.radius).forEach(([key, value]) => {
    vars[`--ifc-radius-${key}`] = value;
  });

  // Shadows
  Object.entries(tokens.shadows).forEach(([key, value]) => {
    vars[`--ifc-shadow-${camelToKebab(key)}`] = value;
  });

  // Typography
  vars['--ifc-font-family'] = tokens.typography.fontFamily;
  vars['--ifc-font-size-xs'] = tokens.typography.fontSizeXs;
  vars['--ifc-font-size-sm'] = tokens.typography.fontSizeSm;
  vars['--ifc-font-size-base'] = tokens.typography.fontSizeBase;
  vars['--ifc-font-size-lg'] = tokens.typography.fontSizeLg;
  vars['--ifc-font-size-xl'] = tokens.typography.fontSizeXl;
  vars['--ifc-font-weight-normal'] = tokens.typography.fontWeightNormal;
  vars['--ifc-font-weight-medium'] = tokens.typography.fontWeightMedium;
  vars['--ifc-font-weight-semibold'] = tokens.typography.fontWeightSemibold;
  vars['--ifc-font-weight-bold'] = tokens.typography.fontWeightBold;
  vars['--ifc-line-height'] = tokens.typography.lineHeight;
  vars['--ifc-letter-spacing'] = tokens.typography.letterSpacing;
  vars['--ifc-letter-spacing-wide'] = tokens.typography.letterSpacingWide;

  // Layout
  vars['--ifc-sidebar-min-width'] = `${tokens.layout.sidebarMinWidth}px`;
  vars['--ifc-sidebar-max-width'] = `${tokens.layout.sidebarMaxWidth}px`;
  vars['--ifc-sidebar-default-width'] = `${tokens.layout.sidebarDefaultWidth}px`;
  vars['--ifc-breakpoint-sm'] = `${tokens.layout.breakpointSm}px`;
  vars['--ifc-breakpoint-md'] = `${tokens.layout.breakpointMd}px`;
  vars['--ifc-breakpoint-lg'] = `${tokens.layout.breakpointLg}px`;
  vars['--ifc-viewer-grid-gap'] = tokens.layout.viewerGridGap;
  vars['--ifc-main-content-padding'] = tokens.layout.mainContentPadding;
  vars['--ifc-sidebar-padding'] = tokens.layout.sidebarPadding;
  vars['--ifc-panel-gap'] = tokens.layout.panelGap;
  vars['--ifc-section-gap'] = tokens.layout.sectionGap;
  vars['--ifc-z-sidebar'] = String(tokens.layout.zIndexSidebar);
  vars['--ifc-z-sidebar-resizer'] = String(tokens.layout.zIndexSidebarResizer);
  vars['--ifc-z-sidebar-toggle'] = String(tokens.layout.zIndexSidebarToggle);
  vars['--ifc-z-stats-overlay'] = String(tokens.layout.zIndexStatsOverlay);
  vars['--ifc-z-drag-overlay'] = String(tokens.layout.zIndexDragOverlay);
  vars['--ifc-z-minimap'] = String(tokens.layout.zIndexMinimap);
  vars['--ifc-z-viewcube'] = String(tokens.layout.zIndexViewCube);

  // Components
  vars['--ifc-control-height'] = tokens.components.controlHeight;
  vars['--ifc-control-height-sm'] = tokens.components.controlHeightSm;
  vars['--ifc-control-height-lg'] = tokens.components.controlHeightLg;
  vars['--ifc-button-min-width'] = tokens.components.buttonMinWidth;
  vars['--ifc-button-icon-size'] = tokens.components.buttonIconSize;
  vars['--ifc-toggle-width'] = tokens.components.toggleWidth;
  vars['--ifc-toggle-height'] = tokens.components.toggleHeight;
  vars['--ifc-toggle-thumb-size'] = tokens.components.toggleThumbSize;
  vars['--ifc-slider-track-height'] = tokens.components.sliderTrackHeight;
  vars['--ifc-slider-thumb-size'] = tokens.components.sliderThumbSize;
  vars['--ifc-input-min-height'] = tokens.components.inputMinHeight;
  vars['--ifc-textarea-min-height'] = tokens.components.textareaMinHeight;
  vars['--ifc-scrollbar-width'] = tokens.components.scrollbarWidth;
  vars['--ifc-scrollbar-width-mobile'] = tokens.components.scrollbarWidthMobile;
  vars['--ifc-minimap-size'] = `${tokens.components.minimapDefaultSize}px`;
  vars['--ifc-minimap-radius'] = tokens.components.minimapBorderRadius;
  vars['--ifc-stats-right'] = tokens.components.statsPositionRight;
  vars['--ifc-stats-bottom'] = tokens.components.statsPositionBottom;
  vars['--ifc-stats-radius'] = tokens.components.statsBorderRadius;
  vars['--ifc-spinner-size'] = tokens.components.spinnerSize;
  vars['--ifc-viewcube-dimension'] = `${tokens.components.viewCubeDimension}px`;
  vars['--ifc-viewcube-font-size'] = `${tokens.components.viewCubeFontSize}px`;

  // Animation
  vars['--ifc-transition-fast'] = tokens.animation.transitionFast;
  vars['--ifc-transition-base'] = tokens.animation.transitionBase;
  vars['--ifc-transition-slow'] = tokens.animation.transitionSlow;
  vars['--ifc-ease-default'] = tokens.animation.easeDefault;
  vars['--ifc-ease-in'] = tokens.animation.easeIn;
  vars['--ifc-ease-out'] = tokens.animation.easeOut;
  vars['--ifc-ease-in-out'] = tokens.animation.easeInOut;

  return vars;
}

/**
 * Deep merge two token objects
 */
export function mergeTokens(base: DesignTokens, override: Partial<DeepPartial<DesignTokens>>): DesignTokens {
  const result = JSON.parse(JSON.stringify(base)) as DesignTokens;

  if (override.colors) {
    result.colors = { ...result.colors, ...override.colors };
  }
  if (override.spacing) {
    result.spacing = { ...result.spacing, ...override.spacing };
  }
  if (override.radius) {
    result.radius = { ...result.radius, ...override.radius };
  }
  if (override.shadows) {
    result.shadows = { ...result.shadows, ...override.shadows };
  }
  if (override.typography) {
    result.typography = { ...result.typography, ...override.typography };
  }
  if (override.layout) {
    result.layout = { ...result.layout, ...override.layout };
  }
  if (override.components) {
    result.components = { ...result.components, ...override.components };
  }
  if (override.animation) {
    result.animation = { ...result.animation, ...override.animation };
  }

  return result;
}

/**
 * Convert camelCase to kebab-case
 */
function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Type for deep partial
 */
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Partial design tokens type for user overrides
 */
export type PartialDesignTokens = DeepPartial<DesignTokens>;

/**
 * Get tokens for a theme preset
 */
export function getThemeTokens(preset: 'dark' | 'light'): DesignTokens {
  return preset === 'light' ? defaultLightTokens : defaultDarkTokens;
}
