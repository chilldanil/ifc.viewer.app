import { ObjectPosition, FaceNames } from '@mlightcad/three-viewcube';
import { DesignTokens, defaultDarkTokens, defaultLightTokens } from '../config/tokens';

/**
 * ViewCube configuration interface
 * All values can be customized via the token system
 */
export interface ViewCubeConfig {
  pos: ObjectPosition;
  dimension: number;
  faceColor: number;
  hoverColor: number;
  outlineColor: number;
  fontSize: number;
  labelColor: string;
  labelBackground: string;
  labelBorderColor: string;
  labelFont: string;
  hoverHighlightColor: number;
  faceNames: FaceNames;
}

/**
 * Convert a CSS color string to a hex number for Three.js
 */
function colorToHex(color: string): number {
  // Handle hex colors
  if (color.startsWith('#')) {
    return parseInt(color.slice(1), 16);
  }
  // Handle rgb/rgba - extract RGB values
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return (r << 16) | (g << 8) | b;
  }
  // Default fallback
  return 0x1a2230;
}

/**
 * Generate ViewCube configuration from design tokens
 */
export function getViewCubeConfigFromTokens(tokens: DesignTokens): ViewCubeConfig {
  return {
    pos: ObjectPosition.RIGHT_BOTTOM,
    dimension: tokens.components.viewCubeDimension,
    faceColor: colorToHex(tokens.colors.viewCubeFace),
    hoverColor: colorToHex(tokens.colors.viewCubeHover),
    outlineColor: colorToHex(tokens.colors.viewCubeOutline),
    fontSize: tokens.components.viewCubeFontSize,
    labelColor: tokens.colors.viewCubeLabel,
    labelBackground: tokens.colors.viewCubeLabelBg,
    labelBorderColor: tokens.colors.viewCubeLabelBorder,
    labelFont: tokens.typography.fontFamily,
    hoverHighlightColor: colorToHex(tokens.colors.viewCubeHover),
    faceNames: {
      top: 'TOP',
      front: 'FRONT',
      right: 'RIGHT',
      back: 'BACK',
      left: 'LEFT',
      bottom: 'BOTTOM',
    },
  };
}

/**
 * Default ViewCube configuration (dark theme)
 * Uses values from the centralized token system
 */
export const DEFAULT_VIEWCUBE_CONFIG = getViewCubeConfigFromTokens(defaultDarkTokens);

/**
 * Light theme ViewCube configuration
 */
export const LIGHT_VIEWCUBE_CONFIG = getViewCubeConfigFromTokens(defaultLightTokens);

/**
 * Compact ViewCube configuration (smaller size)
 */
export const COMPACT_VIEWCUBE_CONFIG: ViewCubeConfig = {
  ...DEFAULT_VIEWCUBE_CONFIG,
  dimension: 60,
  fontSize: 12,
};

/**
 * Large ViewCube configuration (larger size)
 */
export const LARGE_VIEWCUBE_CONFIG: ViewCubeConfig = {
  ...DEFAULT_VIEWCUBE_CONFIG,
  dimension: 120,
  fontSize: 22,
};

/**
 * Create a custom ViewCube configuration with overrides
 */
export function createViewCubeConfig(
  overrides: Partial<ViewCubeConfig>,
  base: ViewCubeConfig = DEFAULT_VIEWCUBE_CONFIG
): ViewCubeConfig {
  return {
    ...base,
    ...overrides,
    faceNames: {
      ...base.faceNames,
      ...(overrides.faceNames || {}),
    },
  };
}

/**
 * Get ViewCube configuration based on theme preset
 */
export function getViewCubeConfigForTheme(theme: 'dark' | 'light'): ViewCubeConfig {
  return theme === 'light' ? LIGHT_VIEWCUBE_CONFIG : DEFAULT_VIEWCUBE_CONFIG;
}
