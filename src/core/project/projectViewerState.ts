import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import type { MinimapConfig } from '../../components/bim/Minimap';
import type { MultiViewPreset } from '../../types/viewer';
import type { CameraNavMode, CameraProjectionMode } from '../../hooks/useCameraControls';
import type {
  ProjectViewerState,
  ProjectClippingState,
  ProjectVisibilityState,
} from './projectTypes';

/**
 * Live bindings the project IO needs to read and restore viewer state. Most of
 * this state lives as local React state in Layout, so Layout supplies the
 * current values and the setters; the engine stays the single place that knows
 * the project format.
 */
export interface ClippingBinding {
  enabled: boolean;
  gizmosVisible: boolean;
  orthoY: boolean;
  planeOpacity: number;
  planeSize: number;
  edgesVisible: boolean;
  edgeColor: string;
  edgeWidth: number;
  fillColor: string;
  fillOpacity: number;
  sectionBoxActive: boolean;
  setEnabled: (v: boolean) => void;
  setGizmosVisible: (v: boolean) => void;
  setOrthoY: (v: boolean) => void;
  setPlaneOpacity: (v: number) => void;
  setPlaneSize: (v: number) => void;
  setEdgesVisible: (v: boolean) => void;
  setEdgeColor: (v: string) => void;
  setEdgeWidth: (v: number) => void;
  setFillColor: (v: string) => void;
  setFillOpacity: (v: number) => void;
  setSectionBoxActive: (v: boolean) => void;
  /** Returns the configured ThatOpen Clipper (sets it up on first use). */
  getClipper: () => any | null;
}

export interface ProjectIOContext {
  components: OBC.Components;
  world: OBC.World;

  camera: {
    navMode: CameraNavMode;
    projection: CameraProjectionMode;
    setNavMode: (mode: CameraNavMode) => boolean;
    setProjection: (projection: CameraProjectionMode) => boolean;
  };

  multiViewPreset: MultiViewPreset;
  setMultiViewPreset: (preset: MultiViewPreset) => void;
  minimapConfig: MinimapConfig;
  setMinimapConfig: (config: Partial<MinimapConfig>) => void;
  viewCubeEnabled: boolean;
  setViewCubeEnabled: (enabled: boolean) => void;

  panels: {
    leftCollapsed: boolean;
    rightCollapsed: boolean;
    bottomCollapsed: boolean;
    setLeftCollapsed: (v: boolean) => void;
    setRightCollapsed: (v: boolean) => void;
    setBottomCollapsed: (v: boolean) => void;
  };

  floorVisibility: Record<string, boolean>;
  categoryVisibility: Record<string, boolean>;
  setFloorVisibility: (next: Record<string, boolean>) => void;
  setCategoryVisibility: (next: Record<string, boolean>) => void;

  clipping: ClippingBinding;
}

const vec3 = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];

// ============================================================================
// Collect
// ============================================================================

const collectCamera = (ctx: ProjectIOContext): ProjectViewerState['camera'] => {
  const controls = (ctx.world.camera as any)?.controls;
  if (!controls?.getPosition || !controls?.getTarget) {
    return undefined;
  }
  const position = new THREE.Vector3();
  const target = new THREE.Vector3();
  controls.getPosition(position);
  controls.getTarget(target);
  return {
    position: vec3(position),
    target: vec3(target),
    navMode: ctx.camera.navMode,
    projection: ctx.camera.projection,
  };
};

const collectClipping = (ctx: ProjectIOContext): ProjectClippingState => {
  const c = ctx.clipping;
  let planes: ProjectClippingState['planes'] = [];
  try {
    const clipper = c.getClipper();
    planes = (clipper?.list ?? []).map((plane: any) => ({
      normal: vec3(plane.normal),
      origin: vec3(plane.origin),
    }));
  } catch (error) {
    console.warn('Failed to collect clipping planes', error);
  }
  return {
    enabled: c.enabled,
    gizmosVisible: c.gizmosVisible,
    orthoY: c.orthoY,
    planeOpacity: c.planeOpacity,
    planeSize: c.planeSize,
    edgesVisible: c.edgesVisible,
    edgeColor: c.edgeColor,
    edgeWidth: c.edgeWidth,
    fillColor: c.fillColor,
    fillOpacity: c.fillOpacity,
    sectionBoxActive: c.sectionBoxActive,
    planes,
  };
};

export const collectViewerState = (ctx: ProjectIOContext): ProjectViewerState => ({
  camera: collectCamera(ctx),
  clipping: collectClipping(ctx),
  visibility: {
    floors: { ...ctx.floorVisibility },
    categories: { ...ctx.categoryVisibility },
  },
  panels: {
    leftCollapsed: ctx.panels.leftCollapsed,
    rightCollapsed: ctx.panels.rightCollapsed,
    bottomCollapsed: ctx.panels.bottomCollapsed,
  },
  minimap: {
    enabled: ctx.minimapConfig.enabled,
    visible: ctx.minimapConfig.visible,
    lockRotation: ctx.minimapConfig.lockRotation,
    zoom: ctx.minimapConfig.zoom ?? 0.2,
  },
  multiViewPreset: ctx.multiViewPreset,
  viewCubeEnabled: ctx.viewCubeEnabled,
});

// ============================================================================
// Apply
// ============================================================================

const applyCamera = async (state: ProjectViewerState, ctx: ProjectIOContext): Promise<void> => {
  if (!state.camera) {
    return;
  }
  try {
    ctx.camera.setProjection(state.camera.projection);
    ctx.camera.setNavMode(state.camera.navMode);
  } catch (error) {
    console.warn('Failed to restore camera mode/projection', error);
  }

  const controls = (ctx.world.camera as any)?.controls;
  if (!controls?.setLookAt) {
    return;
  }
  const [px, py, pz] = state.camera.position;
  const [tx, ty, tz] = state.camera.target;
  try {
    // Defer one frame so projection/nav-mode changes settle before we set pose.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await controls.setLookAt(px, py, pz, tx, ty, tz, false);
  } catch (error) {
    console.warn('Failed to restore camera pose', error);
  }
};

/**
 * Set a single floor's visibility to an explicit value. Mirrors the hider
 * logic in Layout's handleToggleFloorVisibility, but absolute (set, not toggle)
 * so we can restore an exact saved state.
 */
const setFloorVisible = async (
  components: OBC.Components,
  floorName: string,
  visible: boolean
): Promise<void> => {
  const classifier = components.get(OBC.Classifier);
  const indexer = components.get(OBC.IfcRelationsIndexer);
  const hider = components.get(OBC.Hider);
  const fragmentsManager = components.get(OBC.FragmentsManager);
  const structure = classifier?.list?.spatialStructures?.[floorName];
  if (!structure || structure.id === null || structure.id === undefined) {
    return;
  }

  const tasks: Promise<unknown>[] = [];
  fragmentsManager.groups.forEach((group: any) => {
    if (!group) {
      return;
    }
    try {
      const foundIDs = indexer.getEntityChildren(group, structure.id as number);
      const fragMap = group.getFragmentMap(foundIDs);
      tasks.push(Promise.resolve(hider.set(visible, fragMap)));
    } catch {
      /* ignore per-group failures */
    }
  });
  await Promise.allSettled(tasks);
};

const setCategoryVisible = async (
  components: OBC.Components,
  categoryName: string,
  visible: boolean
): Promise<void> => {
  const classifier = components.get(OBC.Classifier);
  const hider = components.get(OBC.Hider);
  if (!classifier || !hider) {
    return;
  }
  const fragments = classifier.find({ entities: [categoryName] });
  await Promise.resolve(hider.set(visible, fragments));
};

const applyVisibility = async (
  visibility: ProjectVisibilityState,
  ctx: ProjectIOContext
): Promise<void> => {
  for (const [floor, visible] of Object.entries(visibility.floors ?? {})) {
    try {
      await setFloorVisible(ctx.components, floor, visible);
    } catch (error) {
      console.warn(`Failed to restore floor visibility for ${floor}`, error);
    }
  }
  for (const [category, visible] of Object.entries(visibility.categories ?? {})) {
    try {
      await setCategoryVisible(ctx.components, category, visible);
    } catch (error) {
      console.warn(`Failed to restore category visibility for ${category}`, error);
    }
  }
  ctx.setFloorVisibility({ ...visibility.floors });
  ctx.setCategoryVisibility({ ...visibility.categories });
};

const applyClipping = (clipping: ProjectClippingState, ctx: ProjectIOContext): void => {
  const c = ctx.clipping;
  c.setOrthoY(clipping.orthoY);
  c.setGizmosVisible(clipping.gizmosVisible);
  c.setPlaneOpacity(clipping.planeOpacity);
  c.setPlaneSize(clipping.planeSize);
  c.setEdgesVisible(clipping.edgesVisible);
  c.setEdgeColor(clipping.edgeColor);
  c.setEdgeWidth(clipping.edgeWidth);
  c.setFillColor(clipping.fillColor);
  c.setFillOpacity(clipping.fillOpacity);

  try {
    const clipper = c.getClipper();
    if (clipper) {
      clipper.deleteAll();
      clipper.enabled = clipping.enabled;
      for (const plane of clipping.planes ?? []) {
        clipper.createFromNormalAndCoplanarPoint(
          ctx.world,
          new THREE.Vector3(...plane.normal),
          new THREE.Vector3(...plane.origin)
        );
      }
    }
  } catch (error) {
    console.warn('Failed to restore clipping planes', error);
  }

  c.setEnabled(clipping.enabled);
  // NOTE: section-box plane bookkeeping isn't reconstructed in v1; the planes
  // are restored generically and the toggle state is reflected for the UI.
  c.setSectionBoxActive(clipping.sectionBoxActive);
};

/**
 * Restore the full viewer state. Order matters: layout/preset first, then
 * visibility and clipping (which mutate the scene), then camera pose last so
 * it isn't disturbed by projection changes.
 */
export const applyViewerState = async (
  state: ProjectViewerState,
  ctx: ProjectIOContext
): Promise<void> => {
  if (state.multiViewPreset) {
    ctx.setMultiViewPreset(state.multiViewPreset);
  }
  if (typeof state.viewCubeEnabled === 'boolean') {
    ctx.setViewCubeEnabled(state.viewCubeEnabled);
  }
  if (state.minimap) {
    ctx.setMinimapConfig({
      enabled: state.minimap.enabled,
      visible: state.minimap.visible,
      lockRotation: state.minimap.lockRotation,
      zoom: state.minimap.zoom,
    });
  }
  if (state.panels) {
    ctx.panels.setLeftCollapsed(state.panels.leftCollapsed);
    ctx.panels.setRightCollapsed(state.panels.rightCollapsed);
    ctx.panels.setBottomCollapsed(state.panels.bottomCollapsed);
  }
  if (state.visibility) {
    await applyVisibility(state.visibility, ctx);
  }
  if (state.clipping) {
    applyClipping(state.clipping, ctx);
  }
  await applyCamera(state, ctx);
};
