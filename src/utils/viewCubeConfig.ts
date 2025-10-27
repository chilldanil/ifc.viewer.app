import { ObjectPosition, FaceNames } from '@mlightcad/three-viewcube';

// Default ViewCube configuration
export const DEFAULT_VIEWCUBE_CONFIG = {
  pos: ObjectPosition.RIGHT_BOTTOM,
  dimension: 100,
  faceColor: 0x1a2230,
  hoverColor: 0x8da3ff,
  outlineColor: 0x384357,
  fontSize: 16,
  labelColor: 'rgba(58, 71, 107, 1)',
  labelBackground: 'rgba(26, 33, 45, 0.9)',
  labelBorderColor: 'rgba(58, 71, 107, 1)',
  labelFont: 'Inter, "Segoe UI", sans-serif',
  hoverHighlightColor: 0xaac1ff,
  faceNames: {
    top: 'TOP',
    front: 'FRONT',
    right: 'RIGHT',
    back: 'BACK',
    left: 'LEFT',
    bottom: 'BOTTOM',
  } as FaceNames,
};

// Alternative configurations for different use cases
export const COMPACT_VIEWCUBE_CONFIG = {
  ...DEFAULT_VIEWCUBE_CONFIG,
  dimension: 60,
  fontSize: 12,
};

export const LARGE_VIEWCUBE_CONFIG = {
  ...DEFAULT_VIEWCUBE_CONFIG,
  dimension: 120,
  fontSize: 22,
};

// Dark theme configuration
export const DARK_VIEWCUBE_CONFIG = {
  ...DEFAULT_VIEWCUBE_CONFIG,
  faceColor: 0x444444,
  hoverColor: 0x666666,
  outlineColor: 0xcccccc,
}; 