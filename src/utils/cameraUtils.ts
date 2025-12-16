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

const MIN_VIEW_DISTANCE = 10;

const VIEW_DIRECTIONS = {
  top: new THREE.Vector3(0, 1, 0),
  bottom: new THREE.Vector3(0, -1, 0),
  front: new THREE.Vector3(0, 0, 1),
  back: new THREE.Vector3(0, 0, -1),
  left: new THREE.Vector3(-1, 0, 0),
  right: new THREE.Vector3(1, 0, 0),
} as const;

export type StandardViewDirection = keyof typeof VIEW_DIRECTIONS;

const getSceneCenterAndSize = (scene?: THREE.Scene) => {
  const center = new THREE.Vector3(0, 0, 0);
  let maxDimension = MIN_VIEW_DISTANCE;

  if (!scene) {
    return { center, maxDimension };
  }

  const box = new THREE.Box3();
  scene.updateMatrixWorld(true);
  box.setFromObject(scene);

  if (!box.isEmpty()) {
    box.getCenter(center);
    const size = box.getSize(new THREE.Vector3());
    maxDimension = Math.max(size.x, size.y, size.z, MIN_VIEW_DISTANCE);
  }

  return { center, maxDimension };
};

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

const setCameraPosition = async (
  camera: CameraWithControls,
  scene: THREE.Scene | undefined,
  direction: StandardViewDirection
) => {
  const threeCamera = camera.three;
  const controls = camera.controls;
  const { center, maxDimension } = getSceneCenterAndSize(scene);
  const distance = Math.max(maxDimension * 1.5, MIN_VIEW_DISTANCE);
  const offset = VIEW_DIRECTIONS[direction].clone().multiplyScalar(distance);
  const position = center.clone().add(offset);

  if (controls?.setLookAt) {
    await controls.setLookAt(position.x, position.y, position.z, center.x, center.y, center.z);
    return;
  }

  threeCamera.position.set(position.x, position.y, position.z);
  threeCamera.lookAt(center);

  if ('updateProjectionMatrix' in threeCamera) {
    (threeCamera as THREE.PerspectiveCamera | THREE.OrthographicCamera).updateProjectionMatrix();
  }
};

/**
 * Sets the camera to one of the standard orthogonal directions
 */
export const setStandardView = async (
  world: OBC.World,
  direction: StandardViewDirection
): Promise<void> => {
  const worldWithCamera = world as unknown as WorldWithCamera;
  const camera = worldWithCamera.camera;
  const scene = worldWithCamera.scene?.three;

  if (!camera) {
    console.warn('Camera not available for setStandardView');
    return;
  }

  await setCameraPosition(camera, scene, direction);
};

/**
 * Sets the camera to a top-down view
 */
export const setTopView = async (world: OBC.World): Promise<void> => {
  await setStandardView(world, 'top');
};
