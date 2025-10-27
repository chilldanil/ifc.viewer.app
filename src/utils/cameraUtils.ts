import * as THREE from 'three';
import * as OBC from '@thatopen/components';

export interface FitOptions {
  paddingRatio?: number; // 1.2 = 20% padding
}

interface CameraWithControls {
  three: THREE.Camera;
  controls?: {
    setLookAt?: (
      posX: number,
      posY: number,
      posZ: number,
      targetX: number,
      targetY: number,
      targetZ: number
    ) => Promise<void>;
    getPosition?: (target: THREE.Vector3) => THREE.Vector3;
    getTarget?: (target: THREE.Vector3) => THREE.Vector3;
  };
}

interface WorldWithCamera {
  camera?: CameraWithControls;
  scene?: {
    three?: THREE.Scene;
  };
}

/**
 * Fits the scene to the camera view with optional padding
 */
export const fitSceneToView = async (world: OBC.World, options: FitOptions = {}): Promise<void> => {
  const paddingRatio = options.paddingRatio ?? 1.2;

  const worldWithCamera = world as unknown as WorldWithCamera;
  const camera = worldWithCamera.camera;
  const sceneThree = worldWithCamera.scene?.three;

  if (!camera || !sceneThree) {
    console.warn('Camera or scene not available for fitSceneToView');
    return;
  }

  const threeCamera = camera.three;
  const controls = camera.controls;

  const box = new THREE.Box3();
  sceneThree.updateMatrixWorld(true);
  box.setFromObject(sceneThree);

  if (box.isEmpty()) {
    console.warn('Scene bounding box is empty');
    return;
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  if (threeCamera.type === 'PerspectiveCamera') {
    const perspCamera = threeCamera as THREE.PerspectiveCamera;
    const fov = perspCamera.fov || 50;
    const distance =
      (maxDim * paddingRatio) / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));

    const dir = new THREE.Vector3();
    if (controls?.getPosition && controls?.getTarget) {
      const pos = new THREE.Vector3();
      const target = new THREE.Vector3();
      controls.getPosition(pos);
      controls.getTarget(target);
      dir.copy(target).sub(pos).normalize();
    } else {
      dir.set(0, 0, -1);
    }

    const newPos = center.clone().sub(dir.multiplyScalar(distance));

    if (controls?.setLookAt) {
      await controls.setLookAt(newPos.x, newPos.y, newPos.z, center.x, center.y, center.z);
    } else {
      perspCamera.position.copy(newPos);
      perspCamera.lookAt(center);
      perspCamera.updateProjectionMatrix();
    }
    return;
  }

  // Orthographic camera
  if (threeCamera.type === 'OrthographicCamera') {
    const orthoCamera = threeCamera as THREE.OrthographicCamera;
    const aspect = orthoCamera.right / orthoCamera.top;
    const fitSize = Math.max(maxDim / aspect, maxDim) * paddingRatio;
    orthoCamera.zoom = 2 / fitSize;
    orthoCamera.updateProjectionMatrix();

    if (controls?.setLookAt) {
      const pos = new THREE.Vector3();
      const target = new THREE.Vector3();
      if (controls.getPosition && controls.getTarget) {
        controls.getPosition(pos);
        controls.getTarget(target);
      } else {
        pos.set(center.x, center.y + maxDim, center.z);
        target.copy(center);
      }
      await controls.setLookAt(pos.x, pos.y, pos.z, center.x, center.y, center.z);
    }
  }
};

/**
 * Sets the camera to a top-down view
 */
export const setTopView = async (world: OBC.World): Promise<void> => {
  const worldWithCamera = world as unknown as WorldWithCamera;
  const camera = worldWithCamera.camera;

  if (!camera) {
    console.warn('Camera not available for setTopView');
    return;
  }

  const threeCamera = camera.three;
  const controls = camera.controls;
  const center = new THREE.Vector3(0, 0, 0);
  const height = 100;

  if (controls?.setLookAt) {
    await controls.setLookAt(center.x, height, center.z, center.x, center.y, center.z);
  } else {
    threeCamera.position.set(center.x, height, center.z);
    threeCamera.lookAt(center);
    if ('updateProjectionMatrix' in threeCamera) {
      (threeCamera as THREE.PerspectiveCamera | THREE.OrthographicCamera).updateProjectionMatrix();
    }
  }
};
