import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import CameraControlsImpl from 'camera-controls';
import { useBIM, MultiViewPreset } from '../../context/BIMContext';
import './Viewport.css';

type Orientation = 'perspective' | 'top' | 'front' | 'right';

const CAMERA_UP = new THREE.Vector3(0, 1, 0);

let cameraControlsInstalled = false;
const installCameraControls = () => {
  if (cameraControlsInstalled) {
    return;
  }

  CameraControlsImpl.install({ THREE });
  cameraControlsInstalled = true;
};

const orientationConfigs: Record<Orientation, { position: THREE.Vector3; target: THREE.Vector3; up?: THREE.Vector3 }> = {
  perspective: {
    position: new THREE.Vector3(6, 6, 6),
    target: new THREE.Vector3(0, 0, 0),
  },
  top: {
    position: new THREE.Vector3(0, 10, 0),
    target: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 0, -1),
  },
  front: {
    position: new THREE.Vector3(0, 3, 12),
    target: new THREE.Vector3(0, 1.5, 0),
  },
  right: {
    position: new THREE.Vector3(12, 3, 0),
    target: new THREE.Vector3(0, 1.5, 0),
  },
};

const setInitialView = async (controls: CameraControlsImpl, orientation: Orientation) => {
  const config = orientationConfigs[orientation];
  const up = config.up ?? CAMERA_UP;
  controls.camera.up.copy(up);
  await controls.setLookAt(
    config.position.x,
    config.position.y,
    config.position.z,
    config.target.x,
    config.target.y,
    config.target.z,
    true
  );
};

export interface SecondaryViewportProps {
  orientation: Orientation;
  preset: MultiViewPreset;
}

const SecondaryViewportComponent: React.FC<SecondaryViewportProps> = ({ orientation, preset }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<CameraControlsImpl | null>(null);
  const animationRef = useRef<number>();
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const { world } = useBIM();

  useEffect(() => {
    installCameraControls();

    if (!containerRef.current || !world?.scene?.three) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = world.renderer?.three.outputColorSpace ?? THREE.SRGBColorSpace;
    renderer.toneMapping = world.renderer?.three.toneMapping ?? THREE.ACESFilmicToneMapping;
    renderer.setClearColor('#0d131c');
    renderer.localClippingEnabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);

    const controls = new CameraControlsImpl(camera, renderer.domElement);
    controls.infinityDolly = true;
    controls.mouseButtons.left = CameraControlsImpl.ACTION.ROTATE;
    controls.mouseButtons.middle = CameraControlsImpl.ACTION.DOLLY;
    controls.mouseButtons.right = CameraControlsImpl.ACTION.TRUCK;
    controlsRef.current = controls;

    setInitialView(controls, orientation).catch(() => {
      camera.position.copy(orientationConfigs.perspective.position);
      camera.lookAt(orientationConfigs.perspective.target);
    });

    const resize = () => {
      if (!containerRef.current || !rendererRef.current || !controlsRef.current) {
        return;
      }
      const { clientWidth, clientHeight } = containerRef.current;
      rendererRef.current.setSize(Math.max(clientWidth, 1), Math.max(clientHeight, 1));
      const perspectiveCamera = controlsRef.current.camera as THREE.PerspectiveCamera;
      perspectiveCamera.aspect = clientWidth > 0 && clientHeight > 0 ? clientWidth / clientHeight : 1;
      perspectiveCamera.updateProjectionMatrix();
    };

    resizeObserverRef.current = new ResizeObserver(resize);
    resizeObserverRef.current.observe(containerRef.current);
    resize();

    const render = () => {
      if (!rendererRef.current || !controlsRef.current) {
        return;
      }

      const delta = clockRef.current.getDelta();
      controlsRef.current.update(delta);
      rendererRef.current.render(world.scene.three, controlsRef.current.camera);
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      controlsRef.current?.dispose();
      controlsRef.current = null;
      rendererRef.current?.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
    };
  }, [world, orientation, preset]);

  useEffect(() => () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  return <div className="viewer-container secondary-viewer" ref={containerRef} />;
};

export const SecondaryViewport = React.memo(SecondaryViewportComponent);
