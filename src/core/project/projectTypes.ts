/**
 * Project (.ifcproj) format types.
 *
 * A project is a self-contained bundle (a zip, see projectBundle.ts) that
 * embeds the IFC model(s), the viewer state needed to restore the scene
 * exactly as the user left it, and any saved renders.
 *
 * `ProjectState` is the JSON-serializable metadata. The model bytes and render
 * images are stored alongside it inside the bundle and referenced by path.
 */

export const PROJECT_FORMAT_VERSION = 1;

export type Vec3 = [number, number, number];

export interface ProjectCameraState {
  position: Vec3;
  target: Vec3;
  navMode: 'Orbit' | 'FirstPerson' | 'Plan';
  projection: 'Perspective' | 'Orthographic';
}

export interface ProjectClippingPlane {
  normal: Vec3;
  origin: Vec3;
}

export interface ProjectClippingState {
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
  planes: ProjectClippingPlane[];
}

export interface ProjectVisibilityState {
  /** Spatial-structure (floor) name -> visible. */
  floors: Record<string, boolean>;
  /** Entity category name -> visible. */
  categories: Record<string, boolean>;
}

export interface ProjectPanelsState {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
}

export interface ProjectMinimapState {
  enabled: boolean;
  visible: boolean;
  lockRotation: boolean;
  zoom: number;
}

/**
 * The full, restorable viewer state captured at save time.
 * Every field is optional so partial/older bundles still load gracefully.
 */
export interface ProjectViewerState {
  camera?: ProjectCameraState;
  clipping?: ProjectClippingState;
  visibility?: ProjectVisibilityState;
  panels?: ProjectPanelsState;
  minimap?: ProjectMinimapState;
  multiViewPreset?: 'single' | 'dual' | 'triple' | 'quad';
  viewCubeEnabled?: boolean;
}

/** A model entry as described in project.json (bytes live in the bundle). */
export interface ProjectModelMeta {
  /** Stable id used as the bundle filename, e.g. "model-0". */
  id: string;
  /** Display name (from IFC metadata / group name). */
  name: string;
  /** Path of the IFC inside the bundle, e.g. "models/model-0.ifc". */
  path: string;
  /** Whether property edits were baked into the embedded bytes. */
  hasEdits: boolean;
}

/** A saved render as described in project.json (image lives in the bundle). */
export interface ProjectRenderMeta {
  id: string;
  /** Path of the image inside the bundle, e.g. "renders/render-0.png". */
  path: string;
  /** "ai" for AI Visualizer output, "screenshot" for a plain capture. */
  kind: 'ai' | 'screenshot';
  /** ISO timestamp. */
  createdAt: string;
  /** Prompt used, for AI renders. */
  prompt?: string;
  /** Path of the source/original frame the AI render was based on. */
  sourcePath?: string;
}

/** project.json — the metadata document at the root of a bundle. */
export interface ProjectState {
  formatVersion: number;
  name: string;
  /** ISO timestamp of the last save. */
  savedAt: string;
  viewer: ProjectViewerState;
  models: ProjectModelMeta[];
  renders: ProjectRenderMeta[];
}

/** Raw model bytes paired with their metadata, used while packing/unpacking. */
export interface ProjectModelPayload {
  meta: ProjectModelMeta;
  bytes: Uint8Array;
}

/** Raw render bytes paired with their metadata, used while packing/unpacking. */
export interface ProjectRenderPayload {
  meta: ProjectRenderMeta;
  bytes: Uint8Array;
}

/**
 * The fully-materialized, in-memory project: JSON state plus the actual model
 * and render bytes. `projectBundle.ts` packs this to / unpacks it from a zip.
 */
export interface ProjectBundle {
  state: ProjectState;
  models: ProjectModelPayload[];
  renders: ProjectRenderPayload[];
}
