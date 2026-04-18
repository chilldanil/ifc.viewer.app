import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import { useBIM } from '../../context/BIMContext';
import { exportClashAsBcfJson } from '../../core/services/clashBcfService';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import {
  boundsToBox3,
  getAvailableClashEntities,
  getLoadedClashModels,
  runBoxClashDetection,
} from '../../core/services/clashDetectionService';
import {
  ClashBounds,
  ClashItemRef,
  ClashModelSummary,
  ClashResult,
  ClashRunSummary,
} from '../../types/clash';
import { Button, Card, Input, Row, Select, Stack, Status, Text } from '../../ui';
import './ClashDetectionSection.css';

const DEFAULT_CLEARANCE = '0';
const DEFAULT_MAX_RESULTS = '250';
const CLASH_SELECTION_A = 'clash-a';
const CLASH_SELECTION_B = 'clash-b';
const CLASH_TESTS_STORAGE_KEY = 'ifc-viewer-clash-tests';
const MAX_SAVED_TESTS = 12;

interface ClashFormState {
  sourceModelId: string;
  targetModelId: string;
  sourceEntity: string;
  targetEntity: string;
  clearanceInput: string;
  maxResultsInput: string;
}

interface SavedClashTest extends ClashFormState {
  id: string;
  name: string;
  savedAt: string;
}

interface ReviewOptions {
  hideOthers?: boolean;
  silent?: boolean;
}

interface ReviewMaps {
  source: Record<string, Set<number>>;
  target: Record<string, Set<number>>;
  combined: Record<string, Set<number>>;
}

const sourceHighlightColor = new THREE.Color('#ef4444');
const targetHighlightColor = new THREE.Color('#3b82f6');
const clashOverlayColor = new THREE.Color('#d946ef');

const createSavedTestId = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `clash-test-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const hasFragmentEntries = (fragmentIdMap: Record<string, Set<number>>) => (
  Object.values(fragmentIdMap).some((value) => value instanceof Set && value.size > 0)
);

const formatMetric = (result: ClashResult) => {
  if (result.type === 'hard') {
    return `Overlap volume ${result.overlapVolume.toFixed(3)}`;
  }
  return `Clearance ${result.distance.toFixed(3)}`;
};

const formatSavedScope = (
  modelLabel: string,
  entity: string,
) => `${modelLabel}${entity ? ` / ${entity}` : ''}`;

const getModelLabelById = (
  models: ClashModelSummary[],
  modelId: string,
) => models.find((model) => model.id === modelId)?.label ?? modelId;

const buildDefaultTestName = (
  models: ClashModelSummary[],
  form: ClashFormState,
) => {
  const source = formatSavedScope(
    getModelLabelById(models, form.sourceModelId),
    form.sourceEntity,
  );
  const target = formatSavedScope(
    getModelLabelById(models, form.targetModelId),
    form.targetEntity,
  );
  return `${source} vs ${target}`;
};

const disposeMaterial = (material: THREE.Material | THREE.Material[]) => {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }
  material.dispose();
};

const clearOverlayGroup = (group: THREE.Group | null) => {
  if (!group) {
    return;
  }

  group.traverse((child) => {
    const mesh = child as THREE.Mesh & { material?: THREE.Material | THREE.Material[] };
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      disposeMaterial(mesh.material);
    }
  });

  group.clear();
};

const getClosestAxisPair = (aMin: number, aMax: number, bMin: number, bMax: number) => {
  if (aMax < bMin) {
    return { a: aMax, b: bMin };
  }
  if (bMax < aMin) {
    return { a: aMin, b: bMax };
  }

  const overlapStart = Math.max(aMin, bMin);
  const overlapEnd = Math.min(aMax, bMax);
  const midpoint = overlapStart + ((overlapEnd - overlapStart) / 2);
  return { a: midpoint, b: midpoint };
};

const getClosestPointsBetweenBounds = (
  leftBounds: ClashBounds,
  rightBounds: ClashBounds,
) => {
  const x = getClosestAxisPair(leftBounds.min[0], leftBounds.max[0], rightBounds.min[0], rightBounds.max[0]);
  const y = getClosestAxisPair(leftBounds.min[1], leftBounds.max[1], rightBounds.min[1], rightBounds.max[1]);
  const z = getClosestAxisPair(leftBounds.min[2], leftBounds.max[2], rightBounds.min[2], rightBounds.max[2]);

  return {
    source: new THREE.Vector3(x.a, y.a, z.a),
    target: new THREE.Vector3(x.b, y.b, z.b),
  };
};

const buildClashOverlay = (result: ClashResult) => {
  const overlay = new THREE.Group();
  overlay.name = 'ifc-clash-review-overlay-content';

  if (result.type === 'hard' && result.overlapBounds) {
    const overlapBox = boundsToBox3(result.overlapBounds);
    const size = overlapBox.getSize(new THREE.Vector3());
    const center = overlapBox.getCenter(new THREE.Vector3());
    const geometry = new THREE.BoxGeometry(
      Math.max(size.x, 0.02),
      Math.max(size.y, 0.02),
      Math.max(size.z, 0.02),
    );
    const fill = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: clashOverlayColor,
        transparent: true,
        opacity: 0.22,
        depthTest: false,
        depthWrite: false,
      }),
    );
    fill.position.copy(center);
    fill.renderOrder = 1000;

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: clashOverlayColor,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.95,
      }),
    );
    edges.position.copy(center);
    edges.renderOrder = 1001;

    overlay.add(fill, edges);
    return overlay;
  }

  const points = getClosestPointsBetweenBounds(result.a.bounds, result.b.bounds);
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([points.source, points.target]);
  const line = new THREE.Line(
    lineGeometry,
    new THREE.LineBasicMaterial({
      color: clashOverlayColor,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.95,
    }),
  );
  line.renderOrder = 1001;
  overlay.add(line);

  const focusBox = boundsToBox3(result.focusBounds);
  const focusSize = focusBox.getSize(new THREE.Vector3());
  const markerRadius = Math.max(Math.min(focusSize.length() * 0.018, 0.5), 0.06);
  const pointGeometry = new THREE.SphereGeometry(markerRadius, 16, 16);

  const sourceMarker = new THREE.Mesh(
    pointGeometry,
    new THREE.MeshBasicMaterial({
      color: sourceHighlightColor,
      depthTest: false,
      depthWrite: false,
    }),
  );
  sourceMarker.position.copy(points.source);
  sourceMarker.renderOrder = 1002;

  const targetMarker = new THREE.Mesh(
    pointGeometry.clone(),
    new THREE.MeshBasicMaterial({
      color: targetHighlightColor,
      depthTest: false,
      depthWrite: false,
    }),
  );
  targetMarker.position.copy(points.target);
  targetMarker.renderOrder = 1002;

  overlay.add(sourceMarker, targetMarker);
  return overlay;
};

export const ClashDetectionSection: React.FC = () => {
  const { captureScreenshot, components, eventBus, world } = useBIM();
  const [availableModels, setAvailableModels] = useState<ClashModelSummary[]>([]);
  const [availableEntities, setAvailableEntities] = useState<string[]>([]);
  const [sourceModelId, setSourceModelId] = useState('');
  const [targetModelId, setTargetModelId] = useState('');
  const [sourceEntity, setSourceEntity] = useState('');
  const [targetEntity, setTargetEntity] = useState('');
  const [clearanceInput, setClearanceInput] = useState(DEFAULT_CLEARANCE);
  const [maxResultsInput, setMaxResultsInput] = useState(DEFAULT_MAX_RESULTS);
  const [savedTestName, setSavedTestName] = useState('');
  const [resultQuery, setResultQuery] = useState('');
  const deferredResultQuery = useDeferredValue(resultQuery);
  const [savedTests, setSavedTests] = useLocalStorage<SavedClashTest[]>(CLASH_TESTS_STORAGE_KEY, []);
  const [results, setResults] = useState<ClashResult[]>([]);
  const [summary, setSummary] = useState<ClashRunSummary | null>(null);
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const overlayRootRef = useRef<THREE.Group | null>(null);
  const overlayWorldRef = useRef<OBC.World | null>(null);

  const refreshOptions = useCallback(() => {
    if (!components) {
      setAvailableModels([]);
      setAvailableEntities([]);
      setSourceModelId('');
      setTargetModelId('');
      return;
    }

    const models = getLoadedClashModels(components);
    const entities = getAvailableClashEntities(components);

    setAvailableModels(models);
    setAvailableEntities(entities);

    setSourceModelId((current) => (
      models.some((model) => model.id === current) ? current : (models[0]?.id ?? '')
    ));

    setTargetModelId((current) => {
      if (models.some((model) => model.id === current)) {
        return current;
      }
      return models[1]?.id ?? models[0]?.id ?? '';
    });

    setSourceEntity((current) => (current && !entities.includes(current) ? '' : current));
    setTargetEntity((current) => (current && !entities.includes(current) ? '' : current));
  }, [components]);

  const getCurrentFormState = useCallback((): ClashFormState => ({
    sourceModelId,
    targetModelId,
    sourceEntity,
    targetEntity,
    clearanceInput,
    maxResultsInput,
  }), [
    clearanceInput,
    maxResultsInput,
    sourceEntity,
    sourceModelId,
    targetEntity,
    targetModelId,
  ]);

  const applyFormState = useCallback((form: ClashFormState) => {
    setSourceModelId(form.sourceModelId);
    setTargetModelId(form.targetModelId);
    setSourceEntity(form.sourceEntity);
    setTargetEntity(form.targetEntity);
    setClearanceInput(form.clearanceInput);
    setMaxResultsInput(form.maxResultsInput);
  }, []);

  const ensureOverlayRoot = useCallback(() => {
    const scene = (world?.scene as any)?.three as THREE.Scene | undefined;
    if (!scene) {
      return null;
    }

    if (overlayRootRef.current && overlayWorldRef.current === world) {
      if (!overlayRootRef.current.parent) {
        scene.add(overlayRootRef.current);
      }
      return overlayRootRef.current;
    }

    clearOverlayGroup(overlayRootRef.current);
    overlayRootRef.current?.removeFromParent();

    const nextGroup = new THREE.Group();
    nextGroup.name = 'ifc-clash-review-overlay';
    scene.add(nextGroup);

    overlayRootRef.current = nextGroup;
    overlayWorldRef.current = world;
    return nextGroup;
  }, [world]);

  const clearReviewVisuals = useCallback(() => {
    if (components) {
      try {
        const highlighter = components.get(OBCF.Highlighter) as any;
        if (highlighter?.selection?.[CLASH_SELECTION_A]) {
          highlighter.clear(CLASH_SELECTION_A);
        }
        if (highlighter?.selection?.[CLASH_SELECTION_B]) {
          highlighter.clear(CLASH_SELECTION_B);
        }
      } catch {
        // Ignore cleanup failures during teardown or partial initialization.
      }
    }

    clearOverlayGroup(overlayRootRef.current);
  }, [components]);

  const handleShowAll = useCallback(async (nextMessage = 'All model elements are visible again') => {
    if (!components) {
      return;
    }

    try {
      clearReviewVisuals();
      const hider = components.get(OBC.Hider);
      await hider.set(true);
      setActiveResultId(null);
      setMessage(nextMessage);
      setError(null);
    } catch (err) {
      const nextError = err instanceof Error ? err.message : 'Failed to restore visibility';
      setError(nextError);
    }
  }, [clearReviewVisuals, components]);

  const buildItemFragmentMap = useCallback((item: ClashItemRef) => {
    if (!components) {
      throw new Error('Viewer not ready');
    }

    const fragmentsManager = components.get(OBC.FragmentsManager);
    return fragmentsManager.modelIdToFragmentIdMap({
      [item.modelId]: new Set([item.expressId]),
    });
  }, [components]);

  const buildReviewMaps = useCallback((result: ClashResult): ReviewMaps => {
    if (!components) {
      throw new Error('Viewer not ready');
    }

    const fragmentsManager = components.get(OBC.FragmentsManager);
    const combinedModelMap: Record<string, Set<number>> = {};

    [result.a, result.b].forEach((item) => {
      if (!combinedModelMap[item.modelId]) {
        combinedModelMap[item.modelId] = new Set<number>();
      }
      combinedModelMap[item.modelId].add(item.expressId);
    });

    return {
      source: buildItemFragmentMap(result.a),
      target: buildItemFragmentMap(result.b),
      combined: fragmentsManager.modelIdToFragmentIdMap(combinedModelMap),
    };
  }, [buildItemFragmentMap, components]);

  const ensureReviewSelections = useCallback(() => {
    if (!components) {
      throw new Error('Viewer not ready');
    }

    const highlighter = components.get(OBCF.Highlighter) as any;
    if (!highlighter?.selection?.[CLASH_SELECTION_A]) {
      highlighter.add(CLASH_SELECTION_A, sourceHighlightColor);
    }
    if (!highlighter?.selection?.[CLASH_SELECTION_B]) {
      highlighter.add(CLASH_SELECTION_B, targetHighlightColor);
    }
    return highlighter;
  }, [components]);

  const fitCameraToResult = useCallback(async (result: ClashResult) => {
    const controls = (world?.camera as any)?.controls;
    if (typeof controls?.fitToBox !== 'function') {
      return;
    }

    const box = boundsToBox3(result.focusBounds);
    await controls.fitToBox(box, true);
  }, [world]);

  const renderReviewOverlay = useCallback((result: ClashResult) => {
    const overlayRoot = ensureOverlayRoot();
    if (!overlayRoot) {
      return;
    }

    clearOverlayGroup(overlayRoot);
    overlayRoot.add(buildClashOverlay(result));
  }, [ensureOverlayRoot]);

  const applyClashReview = useCallback(async (
    result: ClashResult,
    options: ReviewOptions = {},
  ) => {
    if (!components) {
      return false;
    }

    try {
      const { hideOthers = false, silent = false } = options;
      const highlighter = ensureReviewSelections();
      const reviewMaps = buildReviewMaps(result);

      if (!hasFragmentEntries(reviewMaps.combined)) {
        setError('No highlightable fragments found for this clash');
        return false;
      }

      clearReviewVisuals();

      const hider = components.get(OBC.Hider);
      if (hideOthers) {
        await hider.isolate(reviewMaps.combined);
      } else {
        await hider.set(true);
      }

      await highlighter.highlightByID(CLASH_SELECTION_A, reviewMaps.source, true, false);
      await highlighter.highlightByID(CLASH_SELECTION_B, reviewMaps.target, true, false);
      renderReviewOverlay(result);
      await fitCameraToResult(result);

      setActiveResultId(result.id);
      setError(null);

      if (!silent) {
        setMessage(
          hideOthers
            ? `Reviewing clash ${result.a.expressId} <-> ${result.b.expressId} with other elements hidden`
            : `Highlighted clash ${result.a.expressId} <-> ${result.b.expressId}`,
        );
      }

      return true;
    } catch (err) {
      const nextError = err instanceof Error ? err.message : 'Failed to review clash';
      setError(nextError);
      return false;
    }
  }, [
    buildReviewMaps,
    clearReviewVisuals,
    components,
    ensureReviewSelections,
    fitCameraToResult,
    renderReviewOverlay,
  ]);

  const clearResults = useCallback(() => {
    setResults([]);
    setSummary(null);
    setActiveResultId(null);
    setResultQuery('');
    setMessage(null);
    setError(null);
    void handleShowAll('Cleared clash results and restored model visibility');
  }, [handleShowAll]);

  const runDetection = useCallback(async (form: ClashFormState) => {
    if (!components) {
      setError('Viewer not ready');
      return;
    }

    if (!form.sourceModelId || !form.targetModelId) {
      setError('Load at least one model before running clash detection');
      return;
    }

    const sourceExists = availableModels.some((model) => model.id === form.sourceModelId);
    const targetExists = availableModels.some((model) => model.id === form.targetModelId);
    if (!sourceExists || !targetExists) {
      setError('One or more saved clash models are no longer loaded');
      return;
    }

    const clearance = Number(form.clearanceInput);
    const maxResults = Number(form.maxResultsInput);

    if (Number.isNaN(clearance) || clearance < 0) {
      setError('Clearance threshold must be a non-negative number');
      return;
    }

    if (!Number.isFinite(maxResults) || maxResults < 1) {
      setError('Max results must be at least 1');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const nextRun = await runBoxClashDetection(components, {
        source: {
          modelIds: [form.sourceModelId],
          entity: form.sourceEntity || null,
        },
        target: {
          modelIds: [form.targetModelId],
          entity: form.targetEntity || null,
        },
        clearance,
        maxResults,
      });

      startTransition(() => {
        setResults(nextRun.results);
        setSummary(nextRun.summary);
        setActiveResultId(nextRun.results[0]?.id ?? null);
      });

      clearReviewVisuals();
      await components.get(OBC.Hider).set(true);

      if (nextRun.results.length === 0) {
        setMessage('No clashes found for the selected scopes');
      } else {
        setMessage(`Found ${nextRun.results.length} clash${nextRun.results.length === 1 ? '' : 'es'}`);
      }
    } catch (err) {
      const nextError = err instanceof Error ? err.message : 'Clash detection failed';
      setError(nextError);
      setSummary(null);
      setResults([]);
      setActiveResultId(null);
    } finally {
      setLoading(false);
    }
  }, [availableModels, clearReviewVisuals, components]);

  useEffect(() => {
    refreshOptions();
  }, [refreshOptions]);

  useEffect(() => {
    if (!components) {
      return undefined;
    }

    const fragmentsManager = components.get(OBC.FragmentsManager);
    const handleDisposed = () => {
      clearReviewVisuals();
      refreshOptions();
      setResults([]);
      setSummary(null);
      setActiveResultId(null);
      setResultQuery('');
      setMessage(null);
      setError(null);
    };
    const offLoaded = eventBus.on('modelLoaded', () => refreshOptions());

    fragmentsManager.onFragmentsDisposed.add(handleDisposed);

    return () => {
      offLoaded();
      fragmentsManager.onFragmentsDisposed.remove(handleDisposed);
    };
  }, [clearReviewVisuals, components, eventBus, refreshOptions]);

  useEffect(() => () => {
    clearReviewVisuals();
    clearOverlayGroup(overlayRootRef.current);
    overlayRootRef.current?.removeFromParent();
    overlayRootRef.current = null;
    overlayWorldRef.current = null;
  }, [clearReviewVisuals]);

  const handleSaveTest = useCallback(() => {
    const form = getCurrentFormState();
    if (!form.sourceModelId || !form.targetModelId) {
      setError('Choose the source and target models before saving a clash test');
      return;
    }

    const name = savedTestName.trim() || buildDefaultTestName(availableModels, form);
    const savedAt = new Date().toISOString();
    const nextTest: SavedClashTest = {
      id: createSavedTestId(),
      name,
      savedAt,
      ...form,
    };

    setSavedTests((current) => [nextTest, ...current].slice(0, MAX_SAVED_TESTS));
    setSavedTestName(name);
    setMessage(`Saved clash test "${name}"`);
    setError(null);
  }, [availableModels, getCurrentFormState, savedTestName, setSavedTests]);

  const handleLoadSavedTest = useCallback((test: SavedClashTest) => {
    applyFormState(test);
    setSavedTestName(test.name);
    setMessage(`Loaded clash test "${test.name}"`);
    setError(null);
  }, [applyFormState]);

  const handleDeleteSavedTest = useCallback((testId: string) => {
    setSavedTests((current) => current.filter((test) => test.id !== testId));
    setMessage('Removed saved clash test');
    setError(null);
  }, [setSavedTests]);

  const handleRun = useCallback(async () => {
    await runDetection(getCurrentFormState());
  }, [getCurrentFormState, runDetection]);

  const handleRunSavedTest = useCallback(async (test: SavedClashTest) => {
    applyFormState(test);
    setSavedTestName(test.name);
    await runDetection(test);
  }, [applyFormState, runDetection]);

  const handleHighlightClash = useCallback(async (result: ClashResult) => {
    await applyClashReview(result);
  }, [applyClashReview]);

  const handleHideOthers = useCallback(async (result: ClashResult) => {
    await applyClashReview(result, { hideOthers: true });
  }, [applyClashReview]);

  const handleExportBcf = useCallback(async (result: ClashResult) => {
    if (!components) {
      return;
    }

    try {
      const reviewed = await applyClashReview(result, { hideOthers: true, silent: true });
      if (!reviewed) {
        return;
      }

      const filename = await exportClashAsBcfJson({
        captureScreenshot,
        components,
        result,
        world,
      });

      setActiveResultId(result.id);
      setMessage(`Exported ${filename}`);
      setError(null);
    } catch (err) {
      const nextError = err instanceof Error ? err.message : 'Failed to export BCF viewpoint';
      setError(nextError);
    }
  }, [applyClashReview, captureScreenshot, components, world]);

  const normalizedQuery = deferredResultQuery.trim().toLowerCase();
  const filteredResults = normalizedQuery
    ? results.filter((result) => {
      const haystack = [
        result.type,
        result.a.modelLabel,
        String(result.a.expressId),
        result.b.modelLabel,
        String(result.b.expressId),
      ].join(' ').toLowerCase();

      return haystack.includes(normalizedQuery);
    })
    : results;

  if (!components || availableModels.length === 0) {
    return (
      <Status variant="warning">
        Load one or more IFC models to run clash detection.
      </Status>
    );
  }

  return (
    <Stack gap="sm">
      <Text variant="muted" size="sm">
        Scan loaded BIM models for box-level hard clashes and near misses. Review mode colors source in red, target in blue, and the clash marker in magenta.
      </Text>

      <Select
        label="Source model"
        value={sourceModelId}
        onChange={(event) => setSourceModelId(event.target.value)}
      >
        {availableModels.map((model) => (
          <option key={model.id} value={model.id}>
            {model.label}{model.visible ? '' : ' (hidden)'}
          </option>
        ))}
      </Select>

      <Select
        label="Source entity filter"
        value={sourceEntity}
        onChange={(event) => setSourceEntity(event.target.value)}
      >
        <option value="">All elements</option>
        {availableEntities.map((entity) => (
          <option key={entity} value={entity}>
            {entity}
          </option>
        ))}
      </Select>

      <Select
        label="Target model"
        value={targetModelId}
        onChange={(event) => setTargetModelId(event.target.value)}
      >
        {availableModels.map((model) => (
          <option key={model.id} value={model.id}>
            {model.label}{model.visible ? '' : ' (hidden)'}
          </option>
        ))}
      </Select>

      <Select
        label="Target entity filter"
        value={targetEntity}
        onChange={(event) => setTargetEntity(event.target.value)}
      >
        <option value="">All elements</option>
        {availableEntities.map((entity) => (
          <option key={entity} value={entity}>
            {entity}
          </option>
        ))}
      </Select>

      <Input
        label="Clearance threshold"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={clearanceInput}
        onChange={(event) => setClearanceInput(event.target.value)}
      />

      <Input
        label="Max results"
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        value={maxResultsInput}
        onChange={(event) => setMaxResultsInput(event.target.value)}
      />

      <Input
        label="Saved test name"
        placeholder="Structure vs MEP coordination"
        value={savedTestName}
        onChange={(event) => setSavedTestName(event.target.value)}
      />

      <Row stretch>
        <Button variant="primary" onClick={() => void handleRun()} disabled={loading}>
          {loading ? 'Running...' : 'Run clash detection'}
        </Button>
        <Button onClick={handleSaveTest} disabled={loading}>
          Save test
        </Button>
      </Row>

      <Row stretch>
        <Button onClick={clearResults} disabled={loading && results.length === 0}>
          Clear results
        </Button>
        <Button onClick={() => void handleShowAll()} disabled={loading}>
          Show all
        </Button>
      </Row>

      {savedTests.length > 0 && (
        <div className="clash-saved-tests">
          <Text variant="label" size="sm" as="div">
            Saved tests
          </Text>
          <div className="clash-saved-tests__list">
            {savedTests.map((test) => (
              <Card key={test.id} className="clash-saved-test">
                <Stack gap="sm">
                  <div className="clash-saved-test__header">
                    <Text as="div">{test.name}</Text>
                    <Text variant="subtle" size="sm" as="div">
                      {formatSavedScope(getModelLabelById(availableModels, test.sourceModelId), test.sourceEntity)}
                      {' -> '}
                      {formatSavedScope(getModelLabelById(availableModels, test.targetModelId), test.targetEntity)}
                    </Text>
                  </div>

                  <div className="clash-saved-test__meta">
                    <Text variant="subtle" size="sm" as="span">
                      Clearance {Number(test.clearanceInput).toFixed(2)}
                    </Text>
                    <Text variant="subtle" size="sm" as="span">
                      Max {test.maxResultsInput}
                    </Text>
                  </div>

                  <div className="clash-actions">
                    <Button size="sm" block onClick={() => handleLoadSavedTest(test)}>
                      Load
                    </Button>
                    <Button size="sm" block variant="primary" onClick={() => void handleRunSavedTest(test)}>
                      Run
                    </Button>
                    <Button size="sm" block variant="ghost" onClick={() => handleDeleteSavedTest(test.id)}>
                      Delete
                    </Button>
                  </div>
                </Stack>
              </Card>
            ))}
          </div>
        </div>
      )}

      {summary && (
        <Status variant="info">
          Compared {summary.sourceCount} source items against {summary.targetCount} target items across {summary.scannedPairs.toLocaleString()} candidate pairs in {summary.durationMs.toFixed(0)} ms.
          {summary.truncated ? ' Results were capped at the configured maximum.' : ''}
        </Status>
      )}

      {error && <Status variant="error">{error}</Status>}
      {message && !error && <Status variant="success">{message}</Status>}
      {isPending && <Status variant="info">Rendering clash results...</Status>}

      {results.length > 0 && (
        <>
          <Input
            label="Filter results"
            placeholder="Search by model name or express ID"
            value={resultQuery}
            onChange={(event) => setResultQuery(event.target.value)}
          />

          <div className="clash-results" aria-live="polite">
            {filteredResults.map((result) => {
              const isActive = result.id === activeResultId;
              return (
                <Card
                  key={result.id}
                  className={`clash-result ${isActive ? 'clash-result--active' : ''}`}
                >
                  <Stack gap="sm">
                    <div className="clash-result__header">
                      <Text variant="label" as="div">
                        {result.type === 'hard' ? 'Hard clash' : 'Clearance clash'}
                      </Text>
                      <Text variant="subtle" size="sm" as="span">
                        {formatMetric(result)}
                      </Text>
                    </div>

                    <div className="clash-result__pair">
                      <Text size="sm" as="div">
                        A: {result.a.modelLabel} #{result.a.expressId}
                      </Text>
                      <Text size="sm" as="div">
                        B: {result.b.modelLabel} #{result.b.expressId}
                      </Text>
                    </div>

                    <Text variant="muted" size="sm" as="div">
                      {result.type === 'hard'
                        ? 'Review shows a clash volume at the overlapping region.'
                        : 'Review shows the clearance segment between the closest points.'}
                    </Text>

                    <div className="clash-actions">
                      <Button
                        size="sm"
                        block
                        variant="primary"
                        onClick={() => void handleHighlightClash(result)}
                      >
                        Highlight clash
                      </Button>
                      <Button size="sm" block onClick={() => void handleHideOthers(result)}>
                        Hide others
                      </Button>
                      <Button size="sm" block onClick={() => void handleShowAll()}>
                        Show all
                      </Button>
                      <Button size="sm" block variant="ghost" onClick={() => void handleExportBcf(result)}>
                        Export BCF
                      </Button>
                    </div>
                  </Stack>
                </Card>
              );
            })}
          </div>

          {filteredResults.length === 0 && (
            <Status variant="warning">
              No results match the current filter.
            </Status>
          )}
        </>
      )}
    </Stack>
  );
};

export default ClashDetectionSection;
