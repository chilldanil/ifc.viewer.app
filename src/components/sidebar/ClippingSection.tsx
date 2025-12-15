import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useBIM } from '../../context/BIMContext';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Button, ButtonGroup, Slider, Stack } from '../../ui';

export const ClippingSection: React.FC = () => {
  const { world } = useBIM();
  const [active, setActive] = useState(false);
  const [clipY, setClipY] = useState<number>(0);
  const [range, setRange] = useState<{ min: number; max: number }>({ min: 0, max: 1 });
  const [axis, setAxis] = useState<'X' | 'Y' | 'Z'>('Z');
  const planeRef = useRef<THREE.Plane | null>(null);
  const helperRef = useRef<THREE.PlaneHelper | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);

  useEffect(() => {
    deactivate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  const activate = () => {
    if (!world || !world.scene || !world.renderer) {return;}
    const scene = world.scene.three as THREE.Scene;
    const renderer = (world.renderer as any).three as THREE.WebGLRenderer;

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

    const camera = (world.camera as any)?.three as THREE.Camera | undefined;
    if (camera) {
      if (!transformControlsRef.current) {
        transformControlsRef.current = new TransformControls(camera, renderer.domElement);
      }
      const controls = transformControlsRef.current;
      controls!.attach(helper);
      const gizmo = controls!.getHelper?.() as unknown as THREE.Object3D | undefined;
      if (gizmo && !scene.children.includes(gizmo)) {
        scene.add(gizmo);
      }

      controls!.addEventListener('objectChange', () => {
        if (!planeRef.current || !helperRef.current) {return;}
        const newConstant = -planeRef.current.normal.dot(helperRef.current.position);
        planeRef.current.constant = newConstant;
        setClipY(newConstant);
        helperRef.current.updateMatrixWorld(true);
      });

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
    <Stack gap="sm">
      <ButtonGroup stretch>
        {(['X', 'Y', 'Z'] as const).map((a) => (
          <Button
            key={a}
            size="sm"
            selected={axis === a}
            onClick={() => setAxis(a)}
            disabled={active}
          >
            {a}
          </Button>
        ))}
      </ButtonGroup>
      <Button
        variant="primary"
        onClick={active ? deactivate : activate}
        disabled={!world}
      >
        {active ? 'Disable' : 'Enable'} Clipping ({axis})
      </Button>
      {active && (
        <Slider
          label="Position"
          min={range.min}
          max={range.max}
          step={(range.max - range.min) / 1000}
          value={clipY}
          onChange={(e) => updateConstant(parseFloat(e.target.value))}
          formatValue={(v) => v.toFixed(2)}
        />
      )}
    </Stack>
  );
};
