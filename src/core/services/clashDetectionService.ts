import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/fragments';
import {
  ClashBounds,
  ClashDetectionOptions,
  ClashModelSummary,
  ClashResult,
  ClashRunResult,
  ClashScope,
} from '../../types/clash';

interface ClashBoxEntry {
  modelId: string;
  modelLabel: string;
  expressId: number;
  box: THREE.Box3;
}

const tempGeometryBox = new THREE.Box3();
const tempInstanceMatrix = new THREE.Matrix4();
const tempWorldMatrix = new THREE.Matrix4();
const tempSize = new THREE.Vector3();

const cloneBox = (box: THREE.Box3) => new THREE.Box3(box.min.clone(), box.max.clone());

const boxToBounds = (box: THREE.Box3): ClashBounds => ({
  min: [box.min.x, box.min.y, box.min.z],
  max: [box.max.x, box.max.y, box.max.z],
});

export const boundsToBox3 = (bounds: ClashBounds): THREE.Box3 => (
  new THREE.Box3(
    new THREE.Vector3(...bounds.min),
    new THREE.Vector3(...bounds.max),
  )
);

const getModelLabel = (group: OBF.FragmentsGroup) => {
  const metadataName = typeof (group as any)?.ifcMetadata?.name === 'string'
    ? ((group as any).ifcMetadata.name as string).trim()
    : '';
  const explicitName = typeof group.name === 'string' ? group.name.trim() : '';
  return metadataName || explicitName || group.uuid;
};

const normalizeEntity = (entity?: string | null) => {
  const value = entity?.trim();
  return value ? value : null;
};

const getAllModelIds = (components: OBC.Components) => {
  const fragmentsManager = components.get(OBC.FragmentsManager);
  return Array.from(fragmentsManager.groups.keys());
};

const ensureModelClassification = (
  components: OBC.Components,
  modelIds: string[],
) => {
  const fragmentsManager = components.get(OBC.FragmentsManager);
  const classifier = components.get(OBC.Classifier);

  modelIds.forEach((modelId) => {
    const group = fragmentsManager.groups.get(modelId);
    if (!group) {
      return;
    }
    classifier.byModel(modelId, group);
  });
};

const getScopedExpressIds = (
  components: OBC.Components,
  scope: ClashScope,
): Map<string, Set<number>> | null => {
  const entity = normalizeEntity(scope.entity);
  if (!entity) {
    return null;
  }

  const fragmentsManager = components.get(OBC.FragmentsManager);
  const classifier = components.get(OBC.Classifier);
  const modelIds = scope.modelIds.length ? scope.modelIds : getAllModelIds(components);

  ensureModelClassification(components, modelIds);

  const fragmentIdMap = classifier.find({
    models: modelIds,
    entities: [entity],
  });

  const rawModelMap = fragmentsManager.getModelIdMap(fragmentIdMap) as Record<string, Set<number>> | undefined;
  const modelIdMap = new Map<string, Set<number>>();

  if (!rawModelMap) {
    return modelIdMap;
  }

  Object.entries(rawModelMap).forEach(([modelId, expressIds]) => {
    modelIdMap.set(modelId, new Set(expressIds));
  });

  return modelIdMap;
};

const buildModelBoxes = (group: OBF.FragmentsGroup) => {
  const boxes = new Map<number, THREE.Box3>();
  group.updateMatrixWorld(true);

  group.items.forEach((fragment) => {
    const geometry = fragment.mesh.geometry as THREE.BufferGeometry;

    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }

    const baseBoundingBox = geometry.boundingBox;
    if (!baseBoundingBox) {
      return;
    }

    fragment.itemToInstances.forEach((instanceIds, expressId) => {
      let itemBox = boxes.get(expressId);
      if (!itemBox) {
        itemBox = new THREE.Box3().makeEmpty();
        boxes.set(expressId, itemBox);
      }

      instanceIds.forEach((instanceId) => {
        fragment.mesh.getMatrixAt(instanceId, tempInstanceMatrix);
        tempWorldMatrix.multiplyMatrices(fragment.mesh.matrixWorld, tempInstanceMatrix);
        tempGeometryBox.copy(baseBoundingBox).applyMatrix4(tempWorldMatrix);
        itemBox!.union(tempGeometryBox);
      });
    });
  });

  return boxes;
};

const buildScopeEntries = (
  components: OBC.Components,
  scope: ClashScope,
): ClashBoxEntry[] => {
  const fragmentsManager = components.get(OBC.FragmentsManager);
  const modelIds = scope.modelIds.length ? scope.modelIds : getAllModelIds(components);
  const scopedExpressIds = getScopedExpressIds(components, scope);
  const entries: ClashBoxEntry[] = [];

  modelIds.forEach((modelId) => {
    const group = fragmentsManager.groups.get(modelId);
    if (!group) {
      return;
    }

    const modelBoxes = buildModelBoxes(group);
    const expressIds = scopedExpressIds
      ? (scopedExpressIds.get(modelId) ?? [])
      : modelBoxes.keys();

    for (const expressId of expressIds) {
      const box = modelBoxes.get(expressId);
      if (!box || box.isEmpty()) {
        continue;
      }

      entries.push({
        modelId,
        modelLabel: getModelLabel(group),
        expressId,
        box: cloneBox(box),
      });
    }
  });

  return entries;
};

const createScopeKey = (scope: ClashScope) => {
  const modelIds = [...scope.modelIds].sort().join('|');
  return `${modelIds}::${normalizeEntity(scope.entity) ?? '*'}`;
};

const getAxisGap = (aMin: number, aMax: number, bMin: number, bMax: number) => {
  if (aMax < bMin) {
    return bMin - aMax;
  }
  if (bMax < aMin) {
    return aMin - bMax;
  }
  return 0;
};

const classifyPair = (
  left: ClashBoxEntry,
  right: ClashBoxEntry,
  clearance: number,
): ClashResult | null => {
  const overlapX = Math.min(left.box.max.x, right.box.max.x) - Math.max(left.box.min.x, right.box.min.x);
  const overlapY = Math.min(left.box.max.y, right.box.max.y) - Math.max(left.box.min.y, right.box.min.y);
  const overlapZ = Math.min(left.box.max.z, right.box.max.z) - Math.max(left.box.min.z, right.box.min.z);

  const isHardClash = overlapX > 0 && overlapY > 0 && overlapZ > 0;

  const gapX = getAxisGap(left.box.min.x, left.box.max.x, right.box.min.x, right.box.max.x);
  const gapY = getAxisGap(left.box.min.y, left.box.max.y, right.box.min.y, right.box.max.y);
  const gapZ = getAxisGap(left.box.min.z, left.box.max.z, right.box.min.z, right.box.max.z);
  const distance = Math.sqrt((gapX ** 2) + (gapY ** 2) + (gapZ ** 2));

  if (!isHardClash && (clearance <= 0 || distance > clearance)) {
    return null;
  }

  const focusBox = cloneBox(left.box).union(right.box);
  const overlapBox = isHardClash
    ? new THREE.Box3(
      new THREE.Vector3(
        Math.max(left.box.min.x, right.box.min.x),
        Math.max(left.box.min.y, right.box.min.y),
        Math.max(left.box.min.z, right.box.min.z),
      ),
      new THREE.Vector3(
        Math.min(left.box.max.x, right.box.max.x),
        Math.min(left.box.max.y, right.box.max.y),
        Math.min(left.box.max.z, right.box.max.z),
      ),
    )
    : null;

  let overlapVolume = 0;
  if (overlapBox) {
    overlapBox.getSize(tempSize);
    overlapVolume = tempSize.x * tempSize.y * tempSize.z;
  }

  return {
    id: `${left.modelId}:${left.expressId}-${right.modelId}:${right.expressId}`,
    type: isHardClash ? 'hard' : 'clearance',
    a: {
      modelId: left.modelId,
      modelLabel: left.modelLabel,
      expressId: left.expressId,
      bounds: boxToBounds(left.box),
    },
    b: {
      modelId: right.modelId,
      modelLabel: right.modelLabel,
      expressId: right.expressId,
      bounds: boxToBounds(right.box),
    },
    focusBounds: boxToBounds(focusBox),
    overlapBounds: overlapBox ? boxToBounds(overlapBox) : undefined,
    overlapVolume,
    distance,
  };
};

const sortByMinX = (entries: ClashBoxEntry[]) => (
  [...entries].sort((left, right) => left.box.min.x - right.box.min.x)
);

const sortResults = (results: ClashResult[]) => {
  results.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'hard' ? -1 : 1;
    }
    if (left.type === 'hard') {
      return right.overlapVolume - left.overlapVolume;
    }
    return left.distance - right.distance;
  });
};

const detectCrossScopeClashes = (
  source: ClashBoxEntry[],
  target: ClashBoxEntry[],
  clearance: number,
  maxResults: number,
) => {
  const sortedSource = sortByMinX(source);
  const sortedTarget = sortByMinX(target);
  const results: ClashResult[] = [];
  let scannedPairs = 0;
  let truncated = false;
  let targetStart = 0;

  for (const left of sortedSource) {
    while (
      targetStart < sortedTarget.length &&
      sortedTarget[targetStart].box.max.x < left.box.min.x - clearance
    ) {
      targetStart += 1;
    }

    for (let index = targetStart; index < sortedTarget.length; index += 1) {
      const right = sortedTarget[index];
      if (right.box.min.x > left.box.max.x + clearance) {
        break;
      }

      if (left.modelId === right.modelId && left.expressId === right.expressId) {
        continue;
      }

      scannedPairs += 1;
      const clash = classifyPair(left, right, clearance);
      if (!clash) {
        continue;
      }

      results.push(clash);
      if (results.length >= maxResults) {
        truncated = true;
        return { results, scannedPairs, truncated };
      }
    }
  }

  return { results, scannedPairs, truncated };
};

const detectSelfClashes = (
  entries: ClashBoxEntry[],
  clearance: number,
  maxResults: number,
) => {
  const sortedEntries = sortByMinX(entries);
  const results: ClashResult[] = [];
  let scannedPairs = 0;
  let truncated = false;

  for (let leftIndex = 0; leftIndex < sortedEntries.length; leftIndex += 1) {
    const left = sortedEntries[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < sortedEntries.length; rightIndex += 1) {
      const right = sortedEntries[rightIndex];
      if (right.box.min.x > left.box.max.x + clearance) {
        break;
      }

      if (left.modelId === right.modelId && left.expressId === right.expressId) {
        continue;
      }

      scannedPairs += 1;
      const clash = classifyPair(left, right, clearance);
      if (!clash) {
        continue;
      }

      results.push(clash);
      if (results.length >= maxResults) {
        truncated = true;
        return { results, scannedPairs, truncated };
      }
    }
  }

  return { results, scannedPairs, truncated };
};

export const getLoadedClashModels = (components: OBC.Components): ClashModelSummary[] => {
  const fragmentsManager = components.get(OBC.FragmentsManager);
  const models: ClashModelSummary[] = [];

  fragmentsManager.groups.forEach((group) => {
    if (!group) {
      return;
    }

    models.push({
      id: group.uuid,
      label: getModelLabel(group),
      visible: group.visible !== false,
    });
  });

  models.sort((left, right) => left.label.localeCompare(right.label, undefined, {
    sensitivity: 'base',
    numeric: true,
  }));

  return models;
};

export const getAvailableClashEntities = (components: OBC.Components) => {
  const classifier = components.get(OBC.Classifier);
  return Object.keys(classifier.list?.entities ?? {}).sort((left, right) => (
    left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true })
  ));
};

export const runBoxClashDetection = async (
  components: OBC.Components,
  options: ClashDetectionOptions,
): Promise<ClashRunResult> => {
  const startedAt = performance.now();
  const clearance = Math.max(0, options.clearance);
  const maxResults = Math.max(1, Math.floor(options.maxResults));
  const sourceEntries = buildScopeEntries(components, options.source);
  const targetEntries = buildScopeEntries(components, options.target);
  const sameScope = createScopeKey(options.source) === createScopeKey(options.target);

  const detection = sameScope
    ? detectSelfClashes(sourceEntries, clearance, maxResults)
    : detectCrossScopeClashes(sourceEntries, targetEntries, clearance, maxResults);

  sortResults(detection.results);

  return {
    results: detection.results,
    summary: {
      sourceCount: sourceEntries.length,
      targetCount: targetEntries.length,
      scannedPairs: detection.scannedPairs,
      durationMs: performance.now() - startedAt,
      truncated: detection.truncated,
    },
  };
};
