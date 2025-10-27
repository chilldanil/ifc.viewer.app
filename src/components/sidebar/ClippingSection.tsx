import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useBIM } from '../../context/BIMContext';
import './ClippingSection.css';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export const ClippingSection: React.FC = () => {
  const { world } = useBIM();
  const [active, setActive] = useState(false);
  const [clipY, setClipY] = useState<number>(0);
  const [range, setRange] = useState<{ min: number; max: number }>({ min: 0, max: 1 });
  const [axis, setAxis] = useState<'X' | 'Y' | 'Z'>('Z');
  const planeRef = useRef<THREE.Plane | null>(null);
  const helperRef = useRef<THREE.PlaneHelper | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);

  // Reset when world changes
  useEffect(() => {
    deactivate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  const activate = () => {
    if (!world || !world.scene || !world.renderer) {return;}
    const scene = world.scene.three as THREE.Scene;
    const renderer = (world.renderer as any).three as THREE.WebGLRenderer;

    // Compute extents along chosen axis
    const bbox = new THREE.Box3().setFromObject(scene);
    let min = 0, max = 0, initial = 0, normal: THREE.Vector3;
    switch (axis) {
      case 'X':
        min = bbox.min.x; max = bbox.max.x; normal = new THREE.Vector3(-1, 0, 0); break;
      case 'Y':
        min = bbox.min.y; max = bbox.max.y; normal = new THREE.Vector3(0, -1, 0); break;
      case 'Z':
      default:
        min = bbox.min.z; max = bbox.max.z; normal = new THREE.Vector3(0, 0, -1); break;
    }
    initial = (min + max) / 2;

    setRange({ min, max });
    setClipY(initial);

    const plane = new THREE.Plane(normal, initial);
    planeRef.current = plane;

    renderer.clippingPlanes = [plane];
    renderer.localClippingEnabled = true;

    const helper = new THREE.PlaneHelper(plane, bbox.getSize(new THREE.Vector3()).length(), 0xff0000);
    helperRef.current = helper;
    scene.add(helper);

    // -------------------- 3-axis gizmo (TransformControls) --------------------
    // Obtain the active camera and create TransformControls that will allow the
    // user to drag the plane helper with the standard red/green/blue arrows.
    const camera = (world.camera as any)?.three as THREE.Camera | undefined;
    if (camera) {
      // Create TransformControls once and reuse if the user toggles clipping on/off
      if (!transformControlsRef.current) {
        transformControlsRef.current = new TransformControls(camera, renderer.domElement);
      }
      const controls = transformControlsRef.current;
      // Attach to the plane helper so moving the gizmo moves the plane
      controls!.attach(helper);
      // Add the gizmo (helper Object3D) to the scene if not already present
      const gizmo = controls!.getHelper?.() as unknown as THREE.Object3D | undefined;
      if (gizmo && !scene.children.includes(gizmo)) {
        scene.add(gizmo);
      }

      // When the gizmo is dragged, update the clipping plane constant so the
      // renderer clipping plane follows the helper's new position
      controls!.addEventListener('objectChange', () => {
        if (!planeRef.current || !helperRef.current) {return;}
        // Constant sign follows Three.js plane definition: n·p + constant = 0
        const newConstant = -planeRef.current.normal.dot(helperRef.current.position);
        planeRef.current.constant = newConstant;
        setClipY(newConstant);
        // Ensure helper matrix is up-to-date
        helperRef.current.updateMatrixWorld(true);
      });

      // Disable orbit controls while the user is dragging the gizmo
      controls!.addEventListener('dragging-changed', (e: any) => {
        const orbit = (world.camera as any)?.controls;
        if (orbit) {orbit.enabled = !e.value;}
      });
    }

    setActive(true);
  };

  const deactivate = () => {
    if (!active) {return;}
    if (!world || !world.renderer) {return;}
    const renderer = (world.renderer as any).three as THREE.WebGLRenderer;
    renderer.clippingPlanes = [];
    renderer.localClippingEnabled = false;
    if (helperRef.current && world.scene) {
      (world.scene.three as THREE.Scene).remove(helperRef.current);
    }
    if (transformControlsRef.current) {
      try {
        if (world && world.scene && transformControlsRef.current?.getHelper) {
          const gizmo = transformControlsRef.current.getHelper() as unknown as THREE.Object3D | undefined;
          if (gizmo) {
            (world.scene.three as THREE.Scene).remove(gizmo);
          }
        }
        transformControlsRef.current.dispose();
      } catch {
        /* ignore */
      }
      transformControlsRef.current = null;
    }
    planeRef.current = null;
    helperRef.current = null;
    setActive(false);
  };

  const updateConstant = (value: number) => {
    if (!planeRef.current) {return;}
    planeRef.current.constant = value;
    if (helperRef.current) {helperRef.current.updateMatrixWorld(true);}
    setClipY(value);
  };

  return (
    <div className="clipping-controls">
      <div className="axis-buttons">
        {(['X','Y','Z'] as const).map(a => (
          <button key={a} onClick={() => setAxis(a)} disabled={active || axis === a} className={axis===a ? 'selected' : ''}>{a}
          </button>
        ))}
      </div>
      <button onClick={active ? deactivate : activate} disabled={!world} className="primary">
        {active ? 'Disable' : 'Enable'} Clipping ({axis})
      </button>
      {active && (
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={(range.max - range.min) / 1000}
          value={clipY}
          onChange={(e) => updateConstant(parseFloat(e.target.value))}
        />
      )}
    </div>
  );
}; 