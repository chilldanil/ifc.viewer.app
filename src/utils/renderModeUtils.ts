import * as THREE from 'three';

export type RenderMode = 'shaded' | 'wireframe' | 'ghost';

export interface RenderModeConfig {
  name: string;
  description: string;
}

export const renderModes: Record<RenderMode, RenderModeConfig> = {
  shaded: {
    name: 'Shaded',
    description: 'Standard solid rendering with materials',
  },
  wireframe: {
    name: 'Wireframe',
    description: 'Display edges only',
  },
  ghost: {
    name: 'Ghost',
    description: 'Semi-transparent view',
  },
};

type MaterialState = {
  wireframe: boolean;
  transparent: boolean;
  opacity: number;
  color?: THREE.Color;
  depthWrite: boolean;
};

type RenderModeState = {
  mode: RenderMode;
  originals: WeakMap<THREE.Material, MaterialState>;
};

const RENDER_STATE_KEY = '__ifcRenderModeState';

const getRenderModeState = (world: any): RenderModeState => {
  if (!world) {
    return {
      mode: 'shaded',
      originals: new WeakMap(),
    };
  }

  const existing = (world as any)[RENDER_STATE_KEY] as RenderModeState | undefined;
  if (existing) {
    return existing;
  }

  const state: RenderModeState = {
    mode: 'shaded',
    originals: new WeakMap<THREE.Material, MaterialState>(),
  };

  (world as any)[RENDER_STATE_KEY] = state;
  return state;
};

const storeOriginalMaterial = (material: THREE.Material, state: RenderModeState) => {
  if (!state.originals.has(material)) {
    const mat = material as THREE.MeshStandardMaterial;
    state.originals.set(material, {
      wireframe: mat.wireframe || false,
      transparent: mat.transparent || false,
      opacity: typeof mat.opacity === 'number' ? mat.opacity : 1,
      color: mat.color ? mat.color.clone() : undefined,
      depthWrite: typeof mat.depthWrite === 'boolean' ? mat.depthWrite : true,
    });
  }
};

const restoreOriginalMaterial = (material: THREE.Material, state: RenderModeState) => {
  const original = state.originals.get(material);
  if (!original) {
    return;
  }

  const mat = material as THREE.MeshStandardMaterial;
  mat.wireframe = original.wireframe;
  mat.transparent = original.transparent;
  mat.opacity = original.opacity;
  mat.depthWrite = original.depthWrite;
  if (original.color && mat.color) {
    mat.color.copy(original.color);
  }
  mat.needsUpdate = true;
};

export const applyRenderModeToWorld = (world: any, mode: RenderMode, options?: { ghostOpacity?: number }) => {
  if (!world?.scene?.three) {
    return;
  }

  const state = getRenderModeState(world);
  const ghostOpacity = options?.ghostOpacity ?? 0.3;
  const scene = world.scene.three as THREE.Scene;

  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const material = object.material;
      const materials = Array.isArray(material) ? material : [material];

      materials.forEach((mat) => {
        storeOriginalMaterial(mat, state);
        const m = mat as THREE.MeshStandardMaterial;

        switch (mode) {
          case 'shaded':
            restoreOriginalMaterial(mat, state);
            break;

          case 'wireframe':
            m.wireframe = true;
            m.transparent = false;
            m.opacity = 1;
            m.depthWrite = true;
            m.needsUpdate = true;
            break;

          case 'ghost':
            m.wireframe = false;
            m.transparent = true;
            m.opacity = ghostOpacity;
            m.depthWrite = false;
            m.needsUpdate = true;
            break;
        }
      });
    }
  });

  state.mode = mode;
};

export const getCurrentRenderMode = (world: any): RenderMode => {
  const state = getRenderModeState(world);
  return state.mode ?? 'shaded';
};

export const resetRenderMode = (world: any) => {
  applyRenderModeToWorld(world, 'shaded');
};
