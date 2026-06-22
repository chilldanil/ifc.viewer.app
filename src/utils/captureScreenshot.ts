import * as THREE from 'three';

/**
 * Captures a screenshot from a Three.js renderer, scene, and camera.
 * @param renderer - The WebGL renderer.
 * @param scene - The Three.js scene.
 * @param camera - The Three.js camera.
 * @param format - Image format (default: 'image/png').
 * @param quality - Image quality for 'image/jpeg' (0..1, default: 0.92).
 * @returns Base64 data URL of the screenshot.
 */
export function captureScreenshot(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  format: 'image/png' | 'image/jpeg' = 'image/png',
  quality?: number
): string {
  renderer.render(scene, camera);
  const canvas = document.createElement('canvas');
  canvas.width = renderer.domElement.width;
  canvas.height = renderer.domElement.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get 2D context for screenshot canvas');
  }
  context.drawImage(renderer.domElement, 0, 0);
  return canvas.toDataURL(format, quality);
}

/**
 * Downloads a base64 image as a file.
 * @param base64 - The base64 data URL or raw base64 string.
 * @param filename - The filename for download.
 * @param format - Image format (default: 'image/png').
 */
export function downloadBase64Image(
  base64: string,
  filename: string,
  format: 'image/png' | 'image/jpeg' = 'image/png'
) {
  const hasPrefix = base64.startsWith('data:');
  const href = hasPrefix ? base64 : `data:${format};base64,${base64}`;
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
