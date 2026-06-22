import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import { saveFileDialog } from '../../utils/electronUtils';
import { ClashItemRef, ClashResult } from '../../types/clash';
import { handleBIMError, ErrorType } from '../../utils/errorHandler';

interface BcfComponent {
  ifc_guid?: string;
  originating_system?: string;
  authoring_tool_id?: string;
}

interface ExportClashBcfOptions {
  captureScreenshot: () => Promise<string>;
  components: OBC.Components;
  result: ClashResult;
  world: OBC.World | null;
}

const COLOR_A = 'FFEF4444';
const COLOR_B = 'FF3B82F6';

const createGuid = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `clash-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const stripDataUrlPrefix = (dataUrl: string) => {
  const marker = 'base64,';
  const index = dataUrl.indexOf(marker);
  return index >= 0 ? dataUrl.slice(index + marker.length) : dataUrl;
};

const getCameraPayload = (world: OBC.World | null) => {
  const camera = (world?.camera as any)?.three as THREE.Camera | undefined;
  if (!camera) {
    return null;
  }

  const controls = (world?.camera as any)?.controls;
  const target = new THREE.Vector3(0, 0, 0);
  if (typeof controls?.getTarget === 'function') {
    controls.getTarget(target);
  }

  const cameraPosition = camera.position.clone();
  const cameraDirection = target.clone().sub(cameraPosition).normalize();
  const cameraUp = camera.up.clone().normalize();

  let aspectRatio = 1;
  const renderer = world?.renderer as any;
  const domElement = renderer?.three?.domElement as HTMLCanvasElement | undefined;
  if (domElement && domElement.height) {
    aspectRatio = domElement.width / domElement.height;
  }

  if (camera.type === 'OrthographicCamera') {
    const ortho = camera as THREE.OrthographicCamera;
    return {
      orthogonal_camera: {
        camera_view_point: { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z },
        camera_direction: { x: cameraDirection.x, y: cameraDirection.y, z: cameraDirection.z },
        camera_up_vector: { x: cameraUp.x, y: cameraUp.y, z: cameraUp.z },
        view_to_world_scale: (ortho.top - ortho.bottom) / Math.max(ortho.zoom, 0.0001),
        aspect_ratio: aspectRatio,
      },
    };
  }

  const perspective = camera as THREE.PerspectiveCamera;
  return {
    perspective_camera: {
      camera_view_point: { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z },
      camera_direction: { x: cameraDirection.x, y: cameraDirection.y, z: cameraDirection.z },
      camera_up_vector: { x: cameraUp.x, y: cameraUp.y, z: cameraUp.z },
      field_of_view: perspective.fov,
      aspect_ratio: aspectRatio,
    },
  };
};

const extractIfcGuid = async (
  components: OBC.Components,
  item: ClashItemRef,
) => {
  const fragmentsManager = components.get(OBC.FragmentsManager);
  const model = fragmentsManager.groups.get(item.modelId);
  if (!model) {
    return undefined;
  }

  try {
    const properties = await model.getProperties(item.expressId);
    const guidCandidate = properties?.GlobalId as
      | string
      | { value?: string }
      | undefined;

    if (typeof guidCandidate === 'string' && guidCandidate.trim()) {
      return guidCandidate.trim();
    }

    if (
      guidCandidate &&
      typeof guidCandidate === 'object' &&
      typeof guidCandidate.value === 'string' &&
      guidCandidate.value.trim()
    ) {
      return guidCandidate.value.trim();
    }
  } catch (error) {
    handleBIMError(
      ErrorType.COMPONENT_ERROR,
      'Failed to read GlobalId via getProperties, falling back to globalToExpressIDs map',
      { error, modelId: item.modelId, expressId: item.expressId },
      'clashBcfService.extractIfcGuid'
    );
  }

  for (const [globalId, expressId] of model.globalToExpressIDs.entries()) {
    if (expressId === item.expressId) {
      return globalId;
    }
  }

  return undefined;
};

const buildBcfComponent = async (
  components: OBC.Components,
  item: ClashItemRef,
): Promise<BcfComponent> => {
  const ifcGuid = await extractIfcGuid(components, item);
  return {
    ifc_guid: ifcGuid,
    originating_system: 'IFC Viewer',
    authoring_tool_id: `${item.modelId}:${item.expressId}`,
  };
};

export const exportClashAsBcfJson = async ({
  captureScreenshot,
  components,
  result,
  world,
}: ExportClashBcfOptions) => {
  const exportedAt = new Date().toISOString();
  const topicGuid = createGuid();
  const viewpointGuid = createGuid();
  const [componentA, componentB, snapshot] = await Promise.all([
    buildBcfComponent(components, result.a),
    buildBcfComponent(components, result.b),
    captureScreenshot(),
  ]);

  const payload = {
    format: 'BCF API 3.0 skeleton',
    exported_at: exportedAt,
    clash: {
      id: result.id,
      type: result.type,
      overlap_volume: result.overlapVolume,
      clearance_distance: result.distance,
      focus_bounds: result.focusBounds,
      overlap_bounds: result.overlapBounds ?? null,
      a: {
        model_id: result.a.modelId,
        model_label: result.a.modelLabel,
        express_id: result.a.expressId,
      },
      b: {
        model_id: result.b.modelId,
        model_label: result.b.modelLabel,
        express_id: result.b.expressId,
      },
    },
    topic: {
      guid: topicGuid,
      title: `${result.type === 'hard' ? 'Hard' : 'Clearance'} clash: ${result.a.modelLabel} #${result.a.expressId} vs ${result.b.modelLabel} #${result.b.expressId}`,
      description: result.type === 'hard'
        ? `Detected hard clash with overlap volume ${result.overlapVolume.toFixed(3)}.`
        : `Detected clearance clash with minimum distance ${result.distance.toFixed(3)}.`,
      priority: result.type === 'hard' ? 'High' : 'Medium',
      labels: ['clash', result.type],
      creation_date: exportedAt,
    },
    viewpoints: [
      {
        guid: viewpointGuid,
        snapshot: {
          snapshot_type: 'png',
          snapshot_data: stripDataUrlPrefix(snapshot),
        },
        ...getCameraPayload(world),
        components: {
          selection: [componentA, componentB],
          coloring: [
            { color: COLOR_A, components: [componentA] },
            { color: COLOR_B, components: [componentB] },
          ],
          visibility: {
            default_visibility: false,
            exceptions: [componentA, componentB],
          },
        },
      },
    ],
  };

  const filename = `clash-${result.a.expressId}-${result.b.expressId}.bcf.json`;
  const saved = await saveFileDialog(JSON.stringify(payload, null, 2), filename);

  if (!saved) {
    throw new Error('BCF export was cancelled');
  }

  return filename;
};
