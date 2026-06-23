import * as THREE from 'three';

/**
 * Capture a clean, optionally supersampled "render plate" from the viewer to
 * feed the AI image generator.
 *
 * Unlike a raw screenshot this can:
 *  - hide scene helpers (grid, transform/clipper gizmos) so they don't get
 *    baked into the image the model sees;
 *  - supersample (1x/2x/4x) for a higher-resolution base, independent of the
 *    on-screen canvas size;
 *  - isolate a subject by keeping only the given top-level objects visible.
 *
 * All visibility/size changes are restored before returning, and the viewport
 * is re-rendered so the user sees no lasting change.
 */
export interface RenderPlateOptions {
  /** Resolution multiplier (clamped so the longest side stays <= maxDimension). */
  scale?: number;
  /** Hide grid + gizmo helpers. Default true. */
  hideHelpers?: boolean;
  /** If set, keep only these top-level scene objects visible (subject isolation). */
  keepObjects?: THREE.Object3D[] | null;
  format?: 'image/png' | 'image/jpeg';
  quality?: number;
  maxDimension?: number;
}

export interface RenderPlate {
  dataUrl: string;
  width: number;
  height: number;
}

const asObject3D = (value: any): THREE.Object3D | null => {
  if (!value) {
    return null;
  }
  if (value.isObject3D) {
    return value as THREE.Object3D;
  }
  if (value.three?.isObject3D) {
    return value.three as THREE.Object3D;
  }
  return null;
};

const looksLikeHelper = (obj: THREE.Object3D): boolean => {
  const anyObj = obj as any;
  return Boolean(
    anyObj.isTransformControlsRoot ||
      anyObj.isTransformControls ||
      obj.type === 'TransformControlsRoot' ||
      /helper|gizmo|controls/i.test(obj.name || '')
  );
};

export const captureRenderPlate = (world: any, options: RenderPlateOptions = {}): RenderPlate => {
  const renderer = world?.renderer?.three as THREE.WebGLRenderer | undefined;
  const scene = world?.scene?.three as THREE.Scene | undefined;
  const camera = world?.camera?.three as THREE.Camera | undefined;
  if (!renderer || !scene || !camera) {
    throw new Error('Renderer, scene, or camera not available for capture.');
  }

  const {
    scale = 1,
    hideHelpers = true,
    keepObjects = null,
    format = 'image/jpeg',
    quality = 0.92,
    maxDimension = 8192,
  } = options;

  const hiddenObjects: THREE.Object3D[] = [];
  const hide = (obj: THREE.Object3D | null) => {
    if (obj && obj.visible) {
      obj.visible = false;
      hiddenObjects.push(obj);
    }
  };

  if (hideHelpers) {
    hide(asObject3D(world.__grid));
    for (const child of scene.children) {
      if (looksLikeHelper(child)) {
        hide(child);
      }
    }
  }

  if (keepObjects && keepObjects.length) {
    const keep = new Set(keepObjects);
    for (const child of scene.children) {
      const anyChild = child as any;
      if (keep.has(child) || anyChild.isLight || anyChild.isCamera) {
        continue;
      }
      hide(child);
    }
  }

  const prevSize = new THREE.Vector2();
  renderer.getSize(prevSize);
  const prevPixelRatio = renderer.getPixelRatio();
  const longest = Math.max(prevSize.x, prevSize.y, 1);
  const cappedScale = Math.max(1, Math.min(scale, maxDimension / longest));
  const width = Math.round(prevSize.x * cappedScale);
  const height = Math.round(prevSize.y * cappedScale);

  let dataUrl = '';
  try {
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);

    const dom = renderer.domElement;
    const canvas = document.createElement('canvas');
    canvas.width = dom.width;
    canvas.height = dom.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get a 2D context for the render plate.');
    }
    ctx.drawImage(dom, 0, 0);
    dataUrl = canvas.toDataURL(format, quality);
  } finally {
    renderer.setPixelRatio(prevPixelRatio);
    renderer.setSize(prevSize.x, prevSize.y, false);
    for (const obj of hiddenObjects) {
      obj.visible = true;
    }
    renderer.render(scene, camera);
  }

  return { dataUrl, width, height };
};

/** A crop region expressed as fractions (0..1) of the source image. */
export interface NormalizedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for cropping.'));
    img.src = src;
  });

/**
 * Crop a data URL to a normalized rectangle. Used to render only a selected
 * region of the plate. Returns a new data URL plus its pixel dimensions.
 */
export const cropPlate = async (
  dataUrl: string,
  rect: NormalizedRect,
  format: 'image/png' | 'image/jpeg' = 'image/jpeg',
  quality = 0.92
): Promise<RenderPlate> => {
  const img = await loadImage(dataUrl);
  const sx = Math.round(Math.max(0, Math.min(1, rect.x)) * img.width);
  const sy = Math.round(Math.max(0, Math.min(1, rect.y)) * img.height);
  const sw = Math.max(1, Math.round(Math.min(1, rect.w) * img.width));
  const sh = Math.max(1, Math.round(Math.min(1, rect.h) * img.height));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get a 2D context for cropping.');
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return { dataUrl: canvas.toDataURL(format, quality), width: sw, height: sh };
};
