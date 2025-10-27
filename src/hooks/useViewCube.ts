import { useRef, useEffect } from 'react';
import { ViewCubeGizmo, FaceNames, ObjectPosition } from '@mlightcad/three-viewcube';
import * as THREE from 'three';
import { DEFAULT_VIEWCUBE_CONFIG } from '../utils/viewCubeConfig';

const PRIMARY_FACE_IDS = new Set([1, 2, 3, 4, 5, 6]);
const FACE_LABEL_ORDER: Array<keyof FaceNames> = ['front', 'right', 'back', 'left', 'top', 'bottom'];

const toCssColor = (color: number | string, alpha = 1): string => {
  if (typeof color === 'string') {
    return color;
  }
  const c = new THREE.Color(color);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createFaceLabelTexture = (
  text: string,
  {
    background,
    textColor,
    borderColor,
    font,
    size = 256,
    renderer,
  }: {
    background: string;
    textColor: string;
    borderColor: string;
    font: string;
    size?: number;
    renderer?: THREE.WebGLRenderer | null;
  },
) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {return null;}

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);

  if (borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = Math.max(2, size * 0.04);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth);
  }

  ctx.font = `600 ${Math.round(size * 0.32)}px ${font}`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  if (renderer?.capabilities?.getMaxAnisotropy) {
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
  return texture;
};

const applyViewCubeTheme = (
  viewCube: ViewCubeGizmo,
  options: ViewCubeOptions,
  renderer?: THREE.WebGLRenderer | null,
) => {
  const cube = (viewCube as any).cube as THREE.Object3D | undefined;
  if (!cube) {return;}

  const faceLabels = options.faceNames ?? DEFAULT_VIEWCUBE_CONFIG.faceNames;
  const baseEdgeColor = options.faceColor ?? DEFAULT_VIEWCUBE_CONFIG.faceColor;
  const hoverFaceColor = options.hoverHighlightColor ?? options.hoverColor ?? DEFAULT_VIEWCUBE_CONFIG.hoverColor;
  const outlineColor = options.outlineColor ?? DEFAULT_VIEWCUBE_CONFIG.outlineColor;
  const labelBackground = toCssColor(options.labelBackground ?? DEFAULT_VIEWCUBE_CONFIG.labelBackground);
  const labelColor = toCssColor(options.labelColor ?? DEFAULT_VIEWCUBE_CONFIG.labelColor);
  const labelBorder = toCssColor(options.labelBorderColor ?? DEFAULT_VIEWCUBE_CONFIG.labelBorderColor, 1);
  const labelFont = options.labelFont ?? DEFAULT_VIEWCUBE_CONFIG.labelFont;
  const faceLabelTexts = FACE_LABEL_ORDER.map((key) => faceLabels?.[key] ?? key.toUpperCase());

  const faceGroup = cube.children.find((child: any) => Array.isArray(child.children) && child.children.length === 6) as THREE.Object3D | undefined;
  if (faceGroup) {
    faceGroup.children.forEach((child: any, index: number) => {
      if (!(child instanceof THREE.Mesh)) {return;}
      const material = child.material as THREE.MeshBasicMaterial;
      if (material.map) {
        material.map.dispose();
      }
      const texture = createFaceLabelTexture(faceLabelTexts[index] ?? '', {
        background: labelBackground,
        textColor: labelColor,
        borderColor: labelBorder,
        font: labelFont,
        renderer,
      });
      if (texture) {
        material.map = texture;
        material.transparent = true;
        material.needsUpdate = true;
      }
      material.color.setHex(0xffffff);
    });
  }

  cube.traverse((obj: any) => {
    if (obj instanceof THREE.LineSegments) {
      const mat = obj.material as THREE.LineBasicMaterial;
      mat.color.setHex(outlineColor);
    } else if (obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshBasicMaterial;
      const id = Number(obj.name);
      if (!Number.isNaN(id) && PRIMARY_FACE_IDS.has(id)) {
        mat.color.setHex(0xffffff);
      } else {
        mat.color.setHex(baseEdgeColor);
      }
    }
  });

  (viewCube as any).checkSideOver = function (x: number, y: number) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.gizmoCamera);
    const intersects = raycaster.intersectObjects(this.cube.children, true);

    this.cube.traverse((obj: any) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshBasicMaterial;
        const id = Number(obj.name);
        if (!Number.isNaN(id) && PRIMARY_FACE_IDS.has(id)) {
          mat.color.setHex(0xffffff);
        } else {
          mat.color.setHex(baseEdgeColor);
        }
      }
    });

    if (intersects.length) {
      for (const { object } of intersects) {
        if (object?.name && object.parent) {
          object.parent.children.forEach((child: any) => {
            if (child.name === object.name && child instanceof THREE.Mesh) {
              const id = Number(child.name);
              if (!Number.isNaN(id) && PRIMARY_FACE_IDS.has(id)) {
                const mat = child.material as THREE.MeshBasicMaterial;
                mat.color.setHex(hoverFaceColor);
              }
            }
          });
          break;
        }
      }
    }
  };
};

interface ViewCubeOptions {
  pos?: ObjectPosition;
  dimension?: number;
  faceColor?: number;
  hoverColor?: number;
  outlineColor?: number;
  fontSize?: number;
  faceNames?: FaceNames;
  labelColor?: string;
  labelBackground?: string;
  labelBorderColor?: string;
  labelFont?: string;
  hoverHighlightColor?: number;
}

interface CameraControls {
  setLookAt?: (x: number, y: number, z: number, tx: number, ty: number, tz: number, enableTransition?: boolean) => void;
  update?: (delta?: number) => void;
}

interface ViewCubeHookParams {
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera | null;
  renderer: THREE.WebGLRenderer | null;
  controls?: CameraControls | null;
  options?: ViewCubeOptions;
  isEnabled?: boolean;
}

export const useViewCube = ({ 
  camera, 
  renderer, 
  controls, 
  options = {}, 
  isEnabled = true 
}: ViewCubeHookParams) => {
  const viewCubeRef = useRef<ViewCubeGizmo | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isUnmountedRef = useRef(false);

  // Merge options with defaults from config file
  const finalOptions = { ...DEFAULT_VIEWCUBE_CONFIG, ...options };

  // Function to disable clipping on ViewCube materials
  const disableClippingOnViewCube = (viewCube: ViewCubeGizmo) => {
    // The ViewCube contains a Three.js Object3D with materials that need to ignore clipping
    const traverseAndDisableClipping = (object: any) => {
      if (object.material) {
        // Single material
        if (Array.isArray(object.material)) {
          // Array of materials
          object.material.forEach((mat: any) => {
            mat.clippingPlanes = [];
          });
        } else {
          // Single material
          object.material.clippingPlanes = [];
        }
      }

      // Recursively traverse children
      if (object.children) {
        object.children.forEach((child: any) => traverseAndDisableClipping(child));
      }
    };

    // Based on ViewCubeGizmo source: the main cube is accessible via .cube property
    if ((viewCube as any).cube) {
      traverseAndDisableClipping((viewCube as any).cube);
    }

    // Also traverse the entire ViewCube gizmo (which extends Object3D) as fallback
    traverseAndDisableClipping(viewCube);
  };

  useEffect(() => {
    isUnmountedRef.current = false;

    // Only initialize if we have camera, renderer, and ViewCube is enabled
    if (!camera || !renderer || !isEnabled) {
      return;
    }

    // Create ViewCube
    const viewCube = new ViewCubeGizmo(camera, renderer, finalOptions);
    viewCubeRef.current = viewCube;

    // Disable clipping on ViewCube materials immediately after creation
    disableClippingOnViewCube(viewCube);
    applyViewCubeTheme(viewCube, finalOptions, renderer);

    // Monkey-patch viewCube.update so it renders with clipping disabled
    const originalUpdate = viewCube.update.bind(viewCube);
    (viewCube as any).update = () => {
      if (!renderer) {
        originalUpdate();
        return;
      }
      // Save current clipping state
      const savedPlanes = renderer.clippingPlanes;
      const savedLocal  = renderer.localClippingEnabled;

      // Disable clipping for ViewCube render
      (renderer as any).clippingPlanes = [];
      renderer.localClippingEnabled = false;

      // Render ViewCube
      originalUpdate();

      // Restore clipping state
      (renderer as any).clippingPlanes = savedPlanes;
      renderer.localClippingEnabled = savedLocal;
    };

    // Handle face clicks with smooth camera animation
    const handleFaceClick = (event: any) => {
      const from = camera.quaternion.clone();
      const to = event.quaternion.clone();
      
      // Calculate the direction vector for the selected face
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(to);
      
      // Get current camera distance from origin (or use a default)
      const currentPos = camera.position;
      const distance = currentPos.length() || 10;
      
      // Calculate new camera position based on face direction
      const newPosition = direction.multiplyScalar(-distance);
      
      // Store initial position for interpolation
      const fromPosition = currentPos.clone();
      
      let t = 0;
      const duration = 0.6; // seconds

      const animate = () => {
        t += 1 / (60 * duration);
        if (t <= 1) {
          // Smoothly interpolate rotation
          camera.quaternion.slerpQuaternions(from, to, t);
          
          // Smoothly interpolate position
          camera.position.lerpVectors(fromPosition, newPosition, t);
          
          camera.updateMatrixWorld();
          
          // Update the controls to look at origin (0,0,0)
          if (controls && typeof controls.setLookAt === 'function') {
            try {
              // Set camera to look at origin from new position
              controls.setLookAt(
                camera.position.x,
                camera.position.y, 
                camera.position.z,
                0, 0, 0,  // Look at origin
                false     // Don't animate (we're doing our own animation)
              );
            } catch (e) {
              // Fallback to just update
              if (typeof controls.update === 'function') {
                controls.update(0.016);
              }
            }
          }
          
          requestAnimationFrame(animate);
        }
      };
      animate();
    };

    viewCube.addEventListener('change', handleFaceClick);

    // Start render loop for ViewCube
    const renderLoop = () => {
      if (!isUnmountedRef.current && viewCubeRef.current) {
        viewCubeRef.current.update();
        
        // Continuously ensure ViewCube materials ignore clipping planes
        disableClippingOnViewCube(viewCubeRef.current);
        
        animationFrameRef.current = requestAnimationFrame(renderLoop);
      }
    };
    renderLoop();

    // Cleanup function
    return () => {
      isUnmountedRef.current = true;
      
      // Stop animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Dispose ViewCube
      if (viewCubeRef.current) {
        viewCubeRef.current.removeEventListener('change', handleFaceClick);
        viewCubeRef.current.dispose();
        viewCubeRef.current = null;
      }
    };
  }, [camera, renderer, controls, isEnabled, finalOptions]);

  return {
    viewCube: viewCubeRef.current,
    isActive: !!viewCubeRef.current && isEnabled,
  };
}; 
