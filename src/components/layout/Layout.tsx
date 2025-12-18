import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import Stats from 'stats.js';
import { Viewport } from '../bim/Viewport';
import { SecondaryViewport } from '../bim/SecondaryViewport';
import { Toolbar, type MenuConfig, type MenuItem } from './Toolbar';
import { Panel } from './Panel';
import { CategoryHiderModal } from './CategoryHiderModal';
import { useBIM, type MultiViewPreset } from '../../context/BIMContext';
import { WorldToolbarMenu } from './WorldToolbarMenu';
import { PostproductionToolbarMenu } from './PostproductionToolbarMenu';
import { CameraToolbarMenu } from './CameraToolbarMenu';
import { ClippingToolbarMenu } from './ClippingToolbarMenu';
import { ModelTreePanel } from './ModelTreePanel';
import { LeftPropertiesPanel } from './LeftPropertiesPanel';
import { AiVisualizerBottomPanel } from './AiVisualizerBottomPanel';
import DragAndDropOverlay from '../DragAndDropOverlay';
import { setupIfcLoader } from '../../core/services/ifcLoaderService';
import { fitSceneToView, setStandardView, type StandardViewDirection } from '../../utils/cameraUtils';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Modal, Stack, Text } from '../../ui';
import { useElectronFileOpen } from '../../hooks/useElectronFileOpen';
import '../sidebar/PerformanceSection.css';
import './Layout.css';

// ============================================================================
// Icons for Toolbar Menus
// ============================================================================

const FolderOpenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <path d="M2 10h20" />
  </svg>
);

const CameraIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const LayersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const BoxIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const TerminalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const MaximizeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const ScissorsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);

const CubeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </svg>
);

const HIGHLIGHTER_SELECTION_KEY = 'select';
const IFV_PLANE_CONTROLS_HELPER_KEY = '__ifvPlaneControlsHelper';

const patchThatOpenClipperPlanes = () => {
  const EdgesPlane = (OBCF as any)?.EdgesPlane;
  if (!EdgesPlane?.prototype) {
    return;
  }

  const planeProto = EdgesPlane.prototype as any;
  if (planeProto.__ifvPatched) {
    return;
  }

  planeProto.__ifvPatched = true;

  planeProto.newTransformControls = function () {
    if (!this.world?.renderer) {
      throw new Error('No renderer found for clipping plane!');
    }

    const camera = this.world.camera.three;
    const domElement = this.world.renderer.three.domElement;
    const controls = new TransformControls(camera, domElement);

    this.initializeControls(controls);

    const helper = controls.getHelper?.();
    if (helper && this.world?.scene?.three) {
      this.world.scene.three.add(helper);
    }

    this[IFV_PLANE_CONTROLS_HELPER_KEY] = helper;
    return controls;
  };

  planeProto.initializeControls = function (controls: any) {
    controls.attach(this._helper);
    controls.showX = false;
    controls.showY = false;
    controls.setSpace?.('local');

    try {
      this.createArrowBoundingBox?.();
    } catch {
      /* ignore */
    }

    const arrowBoundBox = this._arrowBoundBox;
    if (!arrowBoundBox) {
      return;
    }

    const helper = controls.getHelper?.();
    if (!helper) {
      try {
        this._helper.add(arrowBoundBox);
      } catch {
        /* ignore */
      }
      return;
    }

    let target: any = null;
    helper.traverse?.((obj: any) => {
      if (target) {
        return;
      }
      if (obj?.name === 'Z') {
        target = obj;
      }
    });

    try {
      (target ?? helper).add(arrowBoundBox);
    } catch {
      /* ignore */
    }
  };

  const originalDispose = planeProto.dispose;
  if (typeof originalDispose === 'function') {
    planeProto.dispose = function (...args: any[]) {
      try {
        const helper = this[IFV_PLANE_CONTROLS_HELPER_KEY] ?? this._controls?.getHelper?.();
        helper?.removeFromParent?.();
      } catch {
        /* ignore */
      }
      return originalDispose.apply(this, args);
    };
  }

  // Make the visibility toggle affect the TransformControls helper too.
  const findDescriptor = (proto: any, key: string): PropertyDescriptor | null => {
    let current = proto;
    while (current) {
      const desc = Object.getOwnPropertyDescriptor(current, key);
      if (desc) {
        return desc;
      }
      current = Object.getPrototypeOf(current);
    }
    return null;
  };

  const visibleDescriptor = findDescriptor(planeProto, 'visible');
  if (visibleDescriptor?.get && visibleDescriptor?.set) {
    const originalGet = visibleDescriptor.get;
    const originalSet = visibleDescriptor.set;

    Object.defineProperty(planeProto, 'visible', {
      configurable: true,
      enumerable: visibleDescriptor.enumerable ?? false,
      get() {
        return originalGet.call(this);
      },
      set(state: boolean) {
        originalSet.call(this, state);
        try {
          const helper = this[IFV_PLANE_CONTROLS_HELPER_KEY] ?? this._controls?.getHelper?.();
          if (helper) {
            helper.visible = state;
          }
        } catch {
          /* ignore */
        }
      },
    });
  }
};

const hasFragmentEntries = (value: unknown): boolean => {
  if (!value) {
    return false;
  }
  if (value instanceof Map || value instanceof Set) {
    return value.size > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return false;
};

// ============================================================================
// Layout Component
// ============================================================================

export const Layout: React.FC = () => {
  const {
    isInitialized,
    isLoading,
    error,
    retry,
    multiViewPreset,
    setMultiViewPreset,
    config,
    components,
    world,
    captureScreenshot,
    viewCubeEnabled,
    setViewCubeEnabled,
    setIsModelLoading,
    eventBus,
    minimapConfig,
    setMinimapConfig,
    propertyEditingService,
  } = useBIM();

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Panel visibility states
  const [isLeftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
  const [isRightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [isBottomPanelCollapsed, setBottomPanelCollapsed] = useState(true);
  const [floorOptions, setFloorOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [floorVisibility, setFloorVisibility] = useState<Record<string, boolean>>({});
  const [categoryVisibility, setCategoryVisibility] = useState<Record<string, boolean>>({});
  const [hasSelection, setHasSelection] = useState(false);
  const [isCategoryHiderModalOpen, setIsCategoryHiderModalOpen] = useState(false);
  // Clipping (ThatOpen Clipper + EdgesPlane + ClipEdges)
  const [clippingEnabled, setClippingEnabled] = useState(false);
  const [clippingGizmosVisible, setClippingGizmosVisible] = useState(true);
  const [clippingToolMode, setClippingToolMode] = useState<'off' | 'create' | 'delete'>('off');
  const [clipPlaneOpacity, setClipPlaneOpacity] = useState(0.2);
  const [clipPlaneSize, setClipPlaneSize] = useState(5);
  const [clipEdgesVisible, setClipEdgesVisible] = useState(true);
  const [clipEdgeColor, setClipEdgeColor] = useState('#e6e6e6');
  const [clipEdgeWidth, setClipEdgeWidth] = useState(1);
  const [clipFillColor, setClipFillColor] = useState('#0d131c');
  const [clipFillOpacity, setClipFillOpacity] = useState(0.15);
  const [clipOrthoY, setClipOrthoY] = useState(true);
  const [sectionBoxActive, setSectionBoxActive] = useState(false);
  const [clipPlaneCount, setClipPlaneCount] = useState(0);
  const sectionBoxPlanesRef = useRef<any[]>([]);
  const clipperSetupRef = useRef(false);
  const clipStyleRef = useRef<{
    name: string;
    lineMaterial: LineMaterial;
    fillMaterial: THREE.MeshBasicMaterial;
    outlineMaterial: THREE.MeshBasicMaterial;
  } | null>(null);
  const [transformActive, setTransformActive] = useState(false);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const attachedModelRef = useRef<any>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<Stats | null>(null);
  const statsOverlayHostRef = useRef<HTMLElement | null>(null);
  const MINIMAP_LIMITS = { minZoom: 0.01, maxZoom: 0.5 };
  const [helpModal, setHelpModal] = useState<'docs' | 'shortcuts' | 'about' | null>(null);

  useElectronFileOpen(components, propertyEditingService);

  const findViewerContainer = useCallback(() => {
    return document.querySelector<HTMLElement>('.ifc-viewer-library-container .viewer-container');
  }, []);

  const attachStatsOverlay = useCallback(() => {
    if (!statsRef.current) {return;}
    const viewer = findViewerContainer();
    if (viewer && statsRef.current.dom.parentElement !== viewer) {
      viewer.appendChild(statsRef.current.dom);
      statsOverlayHostRef.current = viewer;
    }
  }, [findViewerContainer]);

  const ensureStats = useCallback(() => {
    if (!statsRef.current) {
      const stats = new Stats();
      stats.showPanel(2);
      stats.dom.classList.add('stats-overlay');
      stats.dom.style.display = 'none';
      statsRef.current = stats;
    }
    attachStatsOverlay();
    return statsRef.current;
  }, [attachStatsOverlay]);

  useEffect(() => {
    const stats = ensureStats();
    return () => {
      if (stats?.dom?.parentElement) {
        stats.dom.parentElement.removeChild(stats.dom);
      }
      statsRef.current = null;
      statsOverlayHostRef.current = null;
    };
  }, [ensureStats]);

  useEffect(() => {
    attachStatsOverlay();
  }, [world, attachStatsOverlay]);

  useEffect(() => {
    if (!statsRef.current?.dom) {return;}
    if (statsVisible) {
      statsRef.current.dom.classList.add('stats-overlay--visible');
      statsRef.current.dom.style.display = 'block';
    } else {
      statsRef.current.dom.classList.remove('stats-overlay--visible');
      statsRef.current.dom.style.display = 'none';
    }
  }, [statsVisible]);

  useEffect(() => {
    if (!world?.renderer || !statsRef.current) {return;}

    const beforeUpdate = () => {
      if (statsVisible) {statsRef.current?.begin();}
    };

    const afterUpdate = () => {
      if (statsVisible) {statsRef.current?.end();}
    };

    world.renderer.onBeforeUpdate.add(beforeUpdate);
    world.renderer.onAfterUpdate.add(afterUpdate);

    return () => {
      if (world.renderer) {
        world.renderer.onBeforeUpdate.remove(beforeUpdate);
        world.renderer.onAfterUpdate.remove(afterUpdate);
      }
    };
  }, [world, statsVisible]);

  const toggleStatsOverlay = useCallback(() => {
    ensureStats();
    setStatsVisible((v) => !v);
  }, [ensureStats]);

  const selectStatsPanel = useCallback((panel: number) => {
    const stats = ensureStats();
    stats?.showPanel(panel);
    setStatsVisible(true);
  }, [ensureStats]);

  // Minimap controls (toolbar shortcut)
  const toggleMinimapEnabled = useCallback(() => {
    setMinimapConfig({ enabled: !minimapConfig.enabled });
  }, [minimapConfig.enabled, setMinimapConfig]);

  const toggleMinimapVisible = useCallback(() => {
    setMinimapConfig({ visible: !minimapConfig.visible, enabled: true });
  }, [minimapConfig.visible, setMinimapConfig]);

  const toggleMinimapLock = useCallback(() => {
    setMinimapConfig({ lockRotation: !minimapConfig.lockRotation });
  }, [minimapConfig.lockRotation, setMinimapConfig]);

  const nudgeMinimapZoom = useCallback((delta: number) => {
    const next = Math.min(
      MINIMAP_LIMITS.maxZoom,
      Math.max(MINIMAP_LIMITS.minZoom, (minimapConfig.zoom ?? 0.2) + delta)
    );
    setMinimapConfig({ zoom: next, enabled: true });
  }, [minimapConfig.zoom, setMinimapConfig]);

  // Get sidebar config from context - fully configurable, no hardcoded values
  const sidebarConfig = config.layout.sidebar;
  const { minWidth, maxWidth, defaultWidth } = sidebarConfig;

  // CSS variables for layout
  const layoutStyle = useMemo<React.CSSProperties>(() => ({}), []);

  const containerClassName = useMemo(() => {
    const classes = ['layout', 'ifc-viewer-library-container'];
    if (isLeftPanelCollapsed) classes.push('left-panel-collapsed');
    if (isRightPanelCollapsed) classes.push('right-panel-collapsed');
    if (isBottomPanelCollapsed) classes.push('bottom-panel-collapsed');
    return classes.join(' ');
  }, [isLeftPanelCollapsed, isRightPanelCollapsed, isBottomPanelCollapsed]);

  // Calculate extra views based on multiViewPreset (must be before conditional returns)
  const presetKey = multiViewPreset ?? 'single';
  const extraViews = useMemo(() => {
    switch (presetKey) {
      case 'dual':
        return ['front'] as const;
      case 'triple':
        return ['front', 'front'] as const;
      case 'quad':
        return ['front', 'front', 'front'] as const;
      default:
        return [] as const;
    }
  }, [presetKey]);

  const refreshHiderMetadata = useCallback(() => {
    if (!components) {
      setFloorOptions([]);
      setCategoryOptions([]);
      setFloorVisibility({});
      setCategoryVisibility({});
      return;
    }

    try {
      const classifier = components.get(OBC.Classifier);
      const floors = classifier?.list?.spatialStructures
        ? Object.keys(classifier.list.spatialStructures)
        : [];
      const categories = classifier?.list?.entities
        ? Object.keys(classifier.list.entities)
        : [];

      setFloorOptions(floors);
      setCategoryOptions(categories);
      setFloorVisibility((prev) => {
        const next: Record<string, boolean> = {};
        floors.forEach((name) => {
          next[name] = prev[name] ?? true;
        });
        return next;
      });
      setCategoryVisibility((prev) => {
        const next: Record<string, boolean> = {};
        categories.forEach((name) => {
          next[name] = prev[name] ?? true;
        });
        return next;
      });
    } catch (error) {
      console.warn('Failed to refresh visibility metadata:', error);
      setFloorOptions([]);
      setCategoryOptions([]);
      setFloorVisibility({});
      setCategoryVisibility({});
    }
  }, [components]);

  useEffect(() => {
    refreshHiderMetadata();
  }, [refreshHiderMetadata]);

  useEffect(() => {
    const off = eventBus.on('modelLoaded', () => refreshHiderMetadata());
    return () => off();
  }, [eventBus, refreshHiderMetadata]);

  const getSelectionFragments = useCallback(() => {
    if (!components) {
      return null;
    }

    try {
      const highlighter = components.get(OBCF.Highlighter) as any;
      const selection = highlighter?.selection?.[HIGHLIGHTER_SELECTION_KEY];
      if (hasFragmentEntries(selection)) {
        return selection;
      }
    } catch (error) {
      console.warn('Failed to read selection fragments:', error);
    }

    return null;
  }, [components]);

  const refreshSelectionState = useCallback(() => {
    setHasSelection(!!getSelectionFragments());
  }, [getSelectionFragments]);

  useEffect(() => {
    refreshSelectionState();
  }, [refreshSelectionState]);

  useEffect(() => {
    const off = eventBus.on('selectionChanged', () => refreshSelectionState());
    return () => off();
  }, [eventBus, refreshSelectionState]);


  // ============================================================================
  // Action Handlers
  // ============================================================================

  // File: Open IFC
  const handleOpenIfcClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleIfcFileSelected = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !components) return;

    setIsModelLoading(true);
    try {
      const loader = setupIfcLoader(components);
      const buffer = await file.arrayBuffer();
      await loader.loadFromBuffer(new Uint8Array(buffer));

      // Fit to model after loading
      if (world) {
        await fitSceneToView(world, { paddingRatio: 1.2 });
      }
    } catch (err) {
      console.error('Failed to load IFC file:', err);
    } finally {
      setIsModelLoading(false);
      // Reset input so same file can be loaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [components, world, setIsModelLoading]);

  const handleToggleFloorVisibility = useCallback(async (floorName: string) => {
    if (!components) {return;}

    try {
      const classifier = components.get(OBC.Classifier);
      const indexer = components.get(OBC.IfcRelationsIndexer);
      const hider = components.get(OBC.Hider);
      const fragmentsManager = components.get(OBC.FragmentsManager);
      const structure = classifier?.list?.spatialStructures?.[floorName];

      if (!structure?.id || !indexer || !hider || !fragmentsManager) {
        console.warn('Floor visibility toggle unavailable for', floorName);
        return;
      }

      const nextVisible = !(floorVisibility[floorName] ?? true);
      const updateTasks: Promise<unknown>[] = [];

      fragmentsManager.groups.forEach((group: any) => {
        if (!group) {return;}
        try {
          const structureId = structure.id;
          if (structureId === null) return;
          const foundIDs = indexer.getEntityChildren(group, structureId);
          const fragMap = group.getFragmentMap(foundIDs);
          updateTasks.push(Promise.resolve(hider.set(nextVisible, fragMap)));
        } catch (groupError) {
          console.warn(`Failed to update floor "${floorName}" for model`, groupError);
        }
      });

      if (updateTasks.length) {
        await Promise.allSettled(updateTasks);
      }

      setFloorVisibility((prev) => ({ ...prev, [floorName]: nextVisible }));
    } catch (error) {
      console.error('Failed to toggle floor visibility:', error);
    }
  }, [components, floorVisibility]);

  const handleToggleCategoryVisibility = useCallback(async (categoryName: string) => {
    if (!components) {return;}

    try {
      const classifier = components.get(OBC.Classifier);
      const hider = components.get(OBC.Hider);
      if (!classifier || !hider) {
        return;
      }

      const nextVisible = !(categoryVisibility[categoryName] ?? true);
      const fragments = classifier.find({ entities: [categoryName] });
      await Promise.resolve(hider.set(nextVisible, fragments));
      setCategoryVisibility((prev) => ({ ...prev, [categoryName]: nextVisible }));
    } catch (error) {
      console.error('Failed to toggle category visibility:', error);
    }
  }, [components, categoryVisibility]);

  const runSelectionHiderAction = useCallback(async (action: 'hide' | 'show' | 'isolate') => {
    if (!components) {return;}

    const selection = getSelectionFragments();
    if (!selection) {
      console.warn('No selection available for hider action');
      return;
    }

    try {
      const hider = components.get(OBC.Hider);
      if (!hider) {return;}

      if (action === 'isolate') {
        await Promise.resolve(hider.isolate(selection));
      } else {
        await Promise.resolve(hider.set(action === 'show', selection));
      }
      refreshSelectionState();
    } catch (error) {
      console.error('Failed to update selection visibility:', error);
    }
  }, [components, getSelectionFragments, refreshSelectionState]);

  // File: Screenshot
  const handleScreenshot = useCallback(async () => {
    try {
      const dataUrl = await captureScreenshot();
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `ifc-screenshot-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
    }
  }, [captureScreenshot]);

  // View: Fit to Model
  const handleFitToModel = useCallback(async () => {
    if (world) {
      await fitSceneToView(world, { paddingRatio: 1.2 });
    }
  }, [world]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = Boolean(
        target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            (target as HTMLElement).isContentEditable)
      );
      if (isTyping) {
        return;
      }

      const hasCmdOrCtrl = event.ctrlKey || event.metaKey;

      if (hasCmdOrCtrl && (event.key === 'o' || event.key === 'O')) {
        // In Electron, Cmd/Ctrl+O is handled by the native app menu accelerator.
        if ((window as any).electronAPI) {
          return;
        }
        event.preventDefault();
        handleOpenIfcClick();
        return;
      }

      if (hasCmdOrCtrl && event.code === 'Slash') {
        event.preventDefault();
        setHelpModal('shortcuts');
        return;
      }

      if (!hasCmdOrCtrl && !event.altKey && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault();
        void handleFitToModel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleFitToModel, handleOpenIfcClick]);

  // View: Standard orthographic views
  const handleSetViewDirection = useCallback(async (direction: StandardViewDirection) => {
    if (!world) {return;}
    try {
      await setStandardView(world, direction);
    } catch (err) {
      console.error(`Failed to set ${direction} view`, err);
    }
  }, [world]);

  const handleTopView = useCallback(() => {
    void handleSetViewDirection('top');
  }, [handleSetViewDirection]);

  // View: Toggle ViewCube
  const handleToggleViewCube = useCallback(() => {
    setViewCubeEnabled(!viewCubeEnabled);
  }, [viewCubeEnabled, setViewCubeEnabled]);

  // View: Viewport layouts
  const handleSetViewportLayout = useCallback((preset: MultiViewPreset) => {
    setMultiViewPreset(preset);
  }, [setMultiViewPreset]);

  // Tools: Clipping (ThatOpen Clipper)
  const getClipper = useCallback(() => {
    if (!components) {
      return null;
    }
    try {
      const clipper = components.get(OBC.Clipper) as any;
      if (!clipperSetupRef.current) {
        patchThatOpenClipperPlanes();
        clipper.Type = (OBCF as any).EdgesPlane;
        clipperSetupRef.current = true;
      }
      return clipper;
    } catch (error) {
      console.warn('Failed to access clipper component', error);
      return null;
    }
  }, [components]);

  const getClipEdges = useCallback(() => {
    if (!components) {
      return null;
    }
    try {
      return components.get(OBCF.ClipEdges) as any;
    } catch (error) {
      console.warn('Failed to access clip edges component', error);
      return null;
    }
  }, [components]);

  const computeModelsBoundingBox = useCallback((): THREE.Box3 | null => {
    if (!components || !world) {
      return null;
    }

    try {
      const bbox = new THREE.Box3();
      const fragmentsManager = components.get(OBC.FragmentsManager) as any;
      let hasModels = false;

      fragmentsManager?.groups?.forEach?.((group: any) => {
        if (!group) {
          return;
        }
        try {
          bbox.union(new THREE.Box3().setFromObject(group));
          hasModels = true;
        } catch {
          /* ignore */
        }
      });

      if (!hasModels && world.scene?.three) {
        bbox.copy(new THREE.Box3().setFromObject(world.scene.three));
        hasModels = true;
      }

      if (!hasModels || bbox.isEmpty()) {
        return null;
      }
      return bbox;
    } catch (error) {
      console.warn('Failed to compute models bounding box', error);
      return null;
    }
  }, [components, world]);

  const rebuildClipEdgesStyle = useCallback(async () => {
    if (!world) {
      return;
    }
    const clipEdges = getClipEdges();
    if (!clipEdges) {
      return;
    }

    const styleName = 'default';

    try {
      const meshes = new Set<any>();
      const worldMeshes = Array.from((world as any).meshes ?? []);
      for (const entry of worldMeshes) {
        const mesh = entry as any;
        if (!mesh || !mesh.geometry) {
          continue;
        }
        if (mesh.isMesh || mesh.isInstancedMesh) {
          meshes.add(mesh);
        }
      }

      if (meshes.size === 0) {
        return;
      }

      try {
        if (clipEdges.styles?.list?.[styleName]) {
          clipEdges.styles.deleteStyle(styleName, true);
        }
      } catch {
        /* ignore */
      }

      const lineMaterial = new LineMaterial({
        color: new THREE.Color(clipEdgeColor),
        linewidth: Math.max(0.0005, 0.001 * clipEdgeWidth),
        transparent: true,
        opacity: 1,
      } as any);
      lineMaterial.resolution.set(window.innerWidth, window.innerHeight);

      const fillMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(clipFillColor),
        transparent: true,
        opacity: clipFillOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(clipEdgeColor),
        transparent: true,
        opacity: 0.9,
      });

      clipEdges.styles.create(styleName, meshes, world, lineMaterial as any, fillMaterial, outlineMaterial);
      clipStyleRef.current = { name: styleName, lineMaterial, fillMaterial, outlineMaterial };
      await clipEdges.update(true);
    } catch (error) {
      console.warn('Failed to setup clip edge style', error);
    }
  }, [world, getClipEdges]);

  const syncClipperConfig = useCallback(() => {
    const clipper = getClipper();
    if (!clipper) {
      return;
    }

    try {
      clipper.enabled = clippingEnabled;
    } catch {
      /* ignore */
    }

    try {
      clipper.visible = clippingGizmosVisible;
    } catch {
      /* ignore */
    }

    try {
      clipper.orthogonalY = clipOrthoY;
    } catch {
      /* ignore */
    }

    try {
      if (clipper.config) {
        clipper.config.opacity = clipPlaneOpacity;
        clipper.config.size = clipPlaneSize;
      }
    } catch {
      /* ignore */
    }
  }, [
    getClipper,
    clippingEnabled,
    clippingGizmosVisible,
    clipOrthoY,
    clipPlaneOpacity,
    clipPlaneSize,
  ]);

  useEffect(() => {
    syncClipperConfig();
  }, [syncClipperConfig]);

  useEffect(() => {
    void rebuildClipEdgesStyle();
  }, [rebuildClipEdgesStyle]);

  useEffect(() => {
    const off = eventBus.on('modelLoaded', () => {
      void rebuildClipEdgesStyle();
    });
    return () => off();
  }, [eventBus, rebuildClipEdgesStyle]);

  const syncClipEdgesPresentation = useCallback(() => {
    const clipEdges = getClipEdges();
    if (!clipEdges) {
      return;
    }

    try {
      clipEdges.visible = clipEdgesVisible;
    } catch {
      /* ignore */
    }

    const style = clipStyleRef.current;
    if (style) {
      try {
        style.lineMaterial.color = new THREE.Color(clipEdgeColor) as any;
      } catch {
        /* ignore */
      }

      try {
        style.lineMaterial.linewidth = Math.max(0.0005, 0.001 * clipEdgeWidth) as any;
        style.lineMaterial.resolution.set(window.innerWidth, window.innerHeight);
        style.lineMaterial.needsUpdate = true;
      } catch {
        /* ignore */
      }

      try {
        style.fillMaterial.color.set(clipFillColor);
        style.fillMaterial.opacity = clipFillOpacity;
        style.fillMaterial.needsUpdate = true;
      } catch {
        /* ignore */
      }

      try {
        style.outlineMaterial.color.set(clipEdgeColor);
        style.outlineMaterial.needsUpdate = true;
      } catch {
        /* ignore */
      }
    }

    try {
      clipEdges.fillsNeedUpdate = true;
      void clipEdges.update(true);
    } catch {
      /* ignore */
    }
  }, [getClipEdges, clipEdgesVisible, clipEdgeColor, clipEdgeWidth, clipFillColor, clipFillOpacity]);

  useEffect(() => {
    syncClipEdgesPresentation();
  }, [syncClipEdgesPresentation]);

  useEffect(() => {
    const clipper = getClipper();
    const clipEdges = getClipEdges();
    if (!clipper || !clipEdges) {
      return;
    }

    const handleAfterCreate = () => {
      try {
        setClipPlaneCount(clipper.list?.length ?? 0);
      } catch {
        /* ignore */
      }
      clipEdges.fillsNeedUpdate = true;
      void clipEdges.update(true);
    };

    const handleAfterDelete = (plane: any) => {
      sectionBoxPlanesRef.current = sectionBoxPlanesRef.current.filter((item) => item !== plane);
      if (sectionBoxPlanesRef.current.length === 0) {
        setSectionBoxActive(false);
      }
      try {
        setClipPlaneCount(clipper.list?.length ?? 0);
      } catch {
        /* ignore */
      }
      clipEdges.fillsNeedUpdate = true;
      void clipEdges.update(true);
    };

    clipper.onAfterCreate.add(handleAfterCreate);
    clipper.onAfterDelete.add(handleAfterDelete);

    return () => {
      clipper.onAfterCreate.remove(handleAfterCreate);
      clipper.onAfterDelete.remove(handleAfterDelete);
    };
  }, [getClipper, getClipEdges]);

  useEffect(() => {
    if (!world || !components) {
      return;
    }

    if (clippingToolMode === 'off') {
      return;
    }

    const viewer = findViewerContainer();
    if (!viewer) {
      return;
    }

    const clipper = getClipper();
    const clipEdges = getClipEdges();
    if (!clipper || !clipEdges) {
      return;
    }

    const raycasters = components.get(OBC.Raycasters);

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      try {
        const dom = (world.renderer as any)?.three?.domElement as HTMLElement | undefined;
        if (!dom) {
          return;
        }

        const bounds = dom.getBoundingClientRect();
        if (!bounds.width || !bounds.height) {
          return;
        }

        const position = new THREE.Vector2(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1
        );

        const caster = raycasters.get(world);

        if (clippingToolMode === 'create') {
          const intersects = caster.castRay(Array.from((world as any).meshes ?? []), position);
          const faceNormal = intersects?.face?.normal?.clone();
          if (!intersects || !faceNormal) {
            return;
          }

          const object = intersects.object as any;
          let transform = object?.matrixWorld?.clone?.() as THREE.Matrix4 | undefined;
          if (!transform) {
            return;
          }

          if (object?.isInstancedMesh && intersects.instanceId !== undefined) {
            const instanceMatrix = new THREE.Matrix4();
            object.getMatrixAt(intersects.instanceId, instanceMatrix);
            transform = instanceMatrix.multiply(transform);
          }

          const normalMatrix = new THREE.Matrix3().getNormalMatrix(transform);
          const worldNormal = faceNormal.applyMatrix3(normalMatrix).normalize();

          if (clipOrthoY) {
            const tolerance = 0.7;
            if (worldNormal.y > tolerance) {
              worldNormal.set(0, 1, 0);
            } else if (worldNormal.y < -tolerance) {
              worldNormal.set(0, -1, 0);
            }
          }

          setClippingEnabled(true);
          clipper.enabled = true;
          clipper.createFromNormalAndCoplanarPoint(world, worldNormal.negate(), intersects.point);
        } else if (clippingToolMode === 'delete') {
          const planeMeshes = clipper.list.flatMap((plane: any) => plane?.meshes ?? []);
          if (!planeMeshes.length) {
            return;
          }

          const hit = caster.castRay(planeMeshes, position);
          if (!hit) {
            return;
          }

          const plane = clipper.list.find((candidate: any) => candidate?.meshes?.includes?.(hit.object));
          if (!plane) {
            return;
          }

          clipper.delete(world, plane);
        }
      } catch (error) {
        console.warn('Clipping interaction failed', error);
      } finally {
        clipEdges.fillsNeedUpdate = true;
        void clipEdges.update(true);
        setClippingToolMode('off');
      }
    };

    viewer.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      viewer.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [world, components, clippingToolMode, findViewerContainer, getClipper, getClipEdges, clipOrthoY]);

  useEffect(() => {
    if (clippingToolMode === 'off') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setClippingToolMode('off');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [clippingToolMode]);

  useEffect(() => {
    const viewer = findViewerContainer();
    if (!viewer) {
      return;
    }

    const previousCursor = viewer.style.cursor;
    if (clippingToolMode === 'create') {
      viewer.style.cursor = 'crosshair';
    } else if (clippingToolMode === 'delete') {
      viewer.style.cursor = 'not-allowed';
    } else {
      viewer.style.cursor = '';
    }

    return () => {
      viewer.style.cursor = previousCursor;
    };
  }, [clippingToolMode, findViewerContainer]);

  const createAxisClippingPlane = useCallback((axis: 'X' | 'Y' | 'Z') => {
    if (!world) {
      return;
    }

    const clipper = getClipper();
    if (!clipper) {
      return;
    }

    const bbox = computeModelsBoundingBox();
    const center = bbox?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3();

    const normal = axis === 'X'
      ? new THREE.Vector3(-1, 0, 0)
      : axis === 'Y'
        ? new THREE.Vector3(0, -1, 0)
        : new THREE.Vector3(0, 0, -1);

    setClippingEnabled(true);
    clipper.enabled = true;
    clipper.createFromNormalAndCoplanarPoint(world, normal, center);
  }, [world, getClipper, computeModelsBoundingBox]);

  const clearSectionBox = useCallback(() => {
    if (!world) {
      return;
    }
    const clipper = getClipper();
    if (!clipper) {
      return;
    }

    const planes = [...sectionBoxPlanesRef.current];
    sectionBoxPlanesRef.current = [];
    setSectionBoxActive(false);

    for (const plane of planes) {
      try {
        clipper.delete(world, plane);
      } catch {
        /* ignore */
      }
    }
  }, [world, getClipper]);

  const createSectionBox = useCallback(() => {
    if (!world) {
      return;
    }

    const clipper = getClipper();
    if (!clipper) {
      return;
    }

    const bbox = computeModelsBoundingBox();
    if (!bbox) {
      return;
    }

    const previous = [...sectionBoxPlanesRef.current];
    sectionBoxPlanesRef.current = [];

    for (const plane of previous) {
      try {
        clipper.delete(world, plane);
      } catch {
        /* ignore */
      }
    }

    const center = bbox.getCenter(new THREE.Vector3());
    const planes: any[] = [];

    const createPlane = (normal: THREE.Vector3, point: THREE.Vector3) => {
      const plane = clipper.createFromNormalAndCoplanarPoint(world, normal, point);
      try {
        plane.enabled = true;
      } catch {
        /* ignore */
      }
      planes.push(plane);
    };

    // Three.js keeps the positive half-space (distance > 0), so normals must point inward to keep the box volume.
    createPlane(new THREE.Vector3(1, 0, 0), new THREE.Vector3(bbox.min.x, center.y, center.z));
    createPlane(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(bbox.max.x, center.y, center.z));
    createPlane(new THREE.Vector3(0, 1, 0), new THREE.Vector3(center.x, bbox.min.y, center.z));
    createPlane(new THREE.Vector3(0, -1, 0), new THREE.Vector3(center.x, bbox.max.y, center.z));
    createPlane(new THREE.Vector3(0, 0, 1), new THREE.Vector3(center.x, center.y, bbox.min.z));
    createPlane(new THREE.Vector3(0, 0, -1), new THREE.Vector3(center.x, center.y, bbox.max.z));

    sectionBoxPlanesRef.current = planes;
    setSectionBoxActive(true);
    setClippingEnabled(true);
    clipper.enabled = true;
  }, [world, getClipper, computeModelsBoundingBox]);

  const clearAllClipping = useCallback(() => {
    const clipper = getClipper();
    if (!clipper) {
      return;
    }

    try {
      clipper.deleteAll();
      sectionBoxPlanesRef.current = [];
      setSectionBoxActive(false);
      setClippingEnabled(false);
      clipper.enabled = false;
      setClipPlaneCount(0);
    } catch (error) {
      console.warn('Failed to clear clipping planes', error);
    }
  }, [getClipper]);

  // Tools: Model transform (toolbar shortcut)
  const disableTransform = useCallback(() => {
    if (transformControlsRef.current) {
      try {
        transformControlsRef.current.detach();
        if (world?.scene) {
          const gizmo = transformControlsRef.current.getHelper?.() as unknown as THREE.Object3D | undefined;
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
    attachedModelRef.current = null;
    setTransformActive(false);
  }, [world]);

  const enableTransform = useCallback(() => {
    if (!world?.scene || !world.renderer || !components) {
      console.warn('Cannot enable model transform: world not ready');
      return;
    }

    disableTransform();

    const fragmentsManager = components.get(OBC.FragmentsManager);
    if (!fragmentsManager || fragmentsManager.groups.size === 0) {
      console.warn('No models available for transform');
      return;
    }

    let targetModel: any = null;
    for (const [, group] of fragmentsManager.groups) {
      if (group) {
        targetModel = group;
        break;
      }
    }

    if (!targetModel) {
      console.warn('No model found to attach transform controls');
      return;
    }

    const renderer = (world.renderer as any).three as THREE.WebGLRenderer;
    const camera = (world.camera as any)?.three as THREE.Camera | undefined;
    const scene = world.scene.three as THREE.Scene;

    if (!camera) {
      console.warn('Cannot enable model transform: camera not ready');
      return;
    }

    const controls = new TransformControls(camera, renderer.domElement);
    controls.attach(targetModel);
    (controls as any).setMode?.('translate');

    const gizmo = controls.getHelper?.() as unknown as THREE.Object3D | undefined;
    if (gizmo && !scene.children.includes(gizmo)) {
      scene.add(gizmo);
    }

    controls.addEventListener('change', () => {
      (world.renderer as any).update?.();
    });

    controls.addEventListener('dragging-changed', (e: any) => {
      const orbit = (world.camera as any)?.controls;
      if (orbit) {
        orbit.enabled = !e.value;
      }
    });

    transformControlsRef.current = controls;
    attachedModelRef.current = targetModel;
    setTransformActive(true);
  }, [world, components, disableTransform]);

  const resetTransform = useCallback(() => {
    const model = attachedModelRef.current;
    if (!model) {return;}
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.scale.set(1, 1, 1);
    model.updateMatrix();
    model.updateMatrixWorld(true);
    (world?.renderer as any)?.update?.();
  }, [world]);

  // Cleanup clipping / transform on world change and unmount
  useEffect(() => {
    disableTransform();
  }, [world, disableTransform]);

  useEffect(() => {
    return () => {
      disableTransform();
    };
  }, [disableTransform]);

  // Tools: Show All (Reset Visibility)
  const handleShowAll = useCallback(() => {
    if (!components) return;
    try {
      const hider = components.get(OBC.Hider);
      hider.set(true);
    } catch (err) {
      console.error('Failed to show all:', err);
    }
  }, [components]);

  // Tools: Clear Selection
  const handleClearSelection = useCallback(() => {
    if (!components) return;
    try {
      const highlighter = components.get(OBCF.Highlighter);
      highlighter.clear('select');
      highlighter.clear('hover');
    } catch (err) {
      console.error('Failed to clear selection:', err);
    }
  }, [components]);


  const floorMenuItems = useMemo<MenuItem[]>(() => {
    if (!floorOptions.length) {
      return [{ label: 'No floors available', disabled: true }];
    }

    return floorOptions.map((floor) => ({
      label: floor,
      onClick: () => { void handleToggleFloorVisibility(floor); },
      checked: floorVisibility[floor] ?? true,
    }));
  }, [floorOptions, floorVisibility, handleToggleFloorVisibility]);

  const categoryMenuItems = useMemo<MenuItem[]>(() => {
    if (!categoryOptions.length) {
      return [{ label: 'No categories available', disabled: true }];
    }

    return categoryOptions.map((category) => ({
      label: category,
      onClick: () => { void handleToggleCategoryVisibility(category); },
      checked: categoryVisibility[category] ?? true,
    }));
  }, [categoryOptions, categoryVisibility, handleToggleCategoryVisibility]);

  const selectionHiderMenuItems = useMemo<MenuItem[]>(() => [
    { label: 'Hide Selection', onClick: () => { void runSelectionHiderAction('hide'); }, disabled: !hasSelection },
    { label: 'Isolate Selection', onClick: () => { void runSelectionHiderAction('isolate'); }, disabled: !hasSelection },
    { label: 'Reset Selection Visibility', onClick: () => { void runSelectionHiderAction('show'); }, disabled: !hasSelection },
  ], [hasSelection, runSelectionHiderAction]);

  // ============================================================================
  // Toolbar Menu Configuration
  // ============================================================================

  const toolbarMenus: MenuConfig[] = useMemo(() => [
    {
      label: 'File',
      items: [
        { label: 'Open IFC...', icon: <FolderOpenIcon />, shortcut: 'Cmd/Ctrl+O', onClick: handleOpenIfcClick },
        { type: 'divider' },
        { label: 'Capture Screenshot', icon: <CameraIcon />, onClick: handleScreenshot },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Fit to Model', icon: <MaximizeIcon />, shortcut: 'F', onClick: handleFitToModel },
        { label: 'Standard Views', type: 'submenu', icon: <BoxIcon />, items: [
          { label: 'Top', onClick: handleTopView },
          { label: 'Bottom', onClick: () => handleSetViewDirection('bottom') },
          { label: 'Front', onClick: () => handleSetViewDirection('front') },
          { label: 'Back', onClick: () => handleSetViewDirection('back') },
          { label: 'Left', onClick: () => handleSetViewDirection('left') },
          { label: 'Right', onClick: () => handleSetViewDirection('right') },
        ]},
        { type: 'divider' },
        { label: viewCubeEnabled ? 'Hide ViewCube' : 'Show ViewCube', icon: <CubeIcon />, onClick: handleToggleViewCube },
        { type: 'divider' },
        { label: 'Panels', type: 'submenu', items: [
          { label: isLeftPanelCollapsed ? 'Show Left Panel' : 'Hide Left Panel', onClick: () => setLeftPanelCollapsed(c => !c) },
          { label: isRightPanelCollapsed ? 'Show Right Panel' : 'Hide Right Panel', onClick: () => setRightPanelCollapsed(c => !c) },
          { label: isBottomPanelCollapsed ? 'Show Bottom Panel' : 'Hide Bottom Panel', onClick: () => setBottomPanelCollapsed(c => !c) },
        ]},
        { type: 'divider' },
        { label: 'Viewport Layout', type: 'submenu', icon: <GridIcon />, items: [
          { label: 'Single View', onClick: () => handleSetViewportLayout('single') },
          { label: '2 Views', onClick: () => handleSetViewportLayout('dual') },
          { label: '3 Views', onClick: () => handleSetViewportLayout('triple') },
          { label: '4 Views (Quad)', onClick: () => handleSetViewportLayout('quad') },
        ]},
      ],
    },
    {
      label: 'World',
      items: [
        {
          type: 'custom',
          render: () => <WorldToolbarMenu />,
        },
      ],
    },
    {
      label: 'Post',
      items: [
        {
          type: 'custom',
          render: () => <PostproductionToolbarMenu />,
        },
      ],
    },
    {
      label: 'Camera',
      items: [
        {
          type: 'custom',
          render: () => <CameraToolbarMenu />,
        },
      ],
    },
    {
      label: 'Hider',
      items: [
        { label: 'Predefined', type: 'submenu', icon: <LayersIcon />, items: [
          { label: 'Floors', type: 'submenu', icon: <GridIcon />, items: floorMenuItems },
          { label: 'Categories', type: 'submenu', icon: <BoxIcon />, items: categoryMenuItems },
        ]},
        { label: 'Selection Tools', type: 'submenu', icon: <EyeIcon />, items: selectionHiderMenuItems },
        { type: 'divider' },
        { label: 'Isolate or Hide...', icon: <EyeIcon />, onClick: () => setIsCategoryHiderModalOpen(true) },
      ],
    },
    {
      label: 'Tools',
      items: [
        { label: 'Clipping', type: 'submenu', icon: <ScissorsIcon />, items: [
          {
            type: 'custom',
            render: () => (
              <ClippingToolbarMenu
                enabled={clippingEnabled}
                onEnabledChange={setClippingEnabled}
                gizmosVisible={clippingGizmosVisible}
                onGizmosVisibleChange={setClippingGizmosVisible}
                edgesVisible={clipEdgesVisible}
                onEdgesVisibleChange={setClipEdgesVisible}
                orthoY={clipOrthoY}
                onOrthoYChange={setClipOrthoY}
                planeOpacity={clipPlaneOpacity}
                onPlaneOpacityChange={setClipPlaneOpacity}
                planeSize={clipPlaneSize}
                onPlaneSizeChange={setClipPlaneSize}
                edgeColor={clipEdgeColor}
                onEdgeColorChange={setClipEdgeColor}
                edgeWidth={clipEdgeWidth}
                onEdgeWidthChange={setClipEdgeWidth}
                fillColor={clipFillColor}
                onFillColorChange={setClipFillColor}
                fillOpacity={clipFillOpacity}
                onFillOpacityChange={setClipFillOpacity}
                toolMode={clippingToolMode}
                onToolModeChange={setClippingToolMode}
                sectionBoxActive={sectionBoxActive}
                onCreateSectionBox={createSectionBox}
                onClearSectionBox={clearSectionBox}
                onClearAll={clearAllClipping}
                onCreateAxisPlane={createAxisClippingPlane}
                planeCount={clipPlaneCount}
              />
            ),
          },
        ]},
        { label: transformActive ? 'Disable Model Transform' : 'Enable Model Transform', icon: <CubeIcon />, onClick: () => transformActive ? disableTransform() : enableTransform(), disabled: !world },
        { label: 'Reset Model Transform', icon: <BoxIcon />, onClick: resetTransform, disabled: !transformActive },
        { type: 'divider' },
        { label: 'Performance', type: 'submenu', icon: <TerminalIcon />, items: [
          { label: statsVisible ? 'Hide Stats Overlay' : 'Show Stats Overlay', onClick: toggleStatsOverlay, disabled: !world },
          { label: 'Show FPS', onClick: () => selectStatsPanel(0), disabled: !world },
          { label: 'Show MS', onClick: () => selectStatsPanel(1), disabled: !world },
          { label: 'Show MB', onClick: () => selectStatsPanel(2), disabled: !world },
        ]},
        { label: 'Minimap', type: 'submenu', icon: <GridIcon />, items: [
          { label: minimapConfig.enabled ? 'Disable Minimap' : 'Enable Minimap', onClick: toggleMinimapEnabled },
          { label: minimapConfig.visible ? 'Hide Minimap' : 'Show Minimap', onClick: toggleMinimapVisible, disabled: !minimapConfig.enabled },
          { label: minimapConfig.lockRotation ? 'Unlock Rotation' : 'Lock Rotation', onClick: toggleMinimapLock, disabled: !minimapConfig.enabled },
          { type: 'divider' },
          { label: 'Zoom In', onClick: () => nudgeMinimapZoom(0.02), disabled: !minimapConfig.enabled },
          { label: 'Zoom Out', onClick: () => nudgeMinimapZoom(-0.02), disabled: !minimapConfig.enabled },
        ]},
        { type: 'divider' },
        { label: 'Show All', icon: <EyeIcon />, onClick: handleShowAll },
        { label: 'Clear Selection', icon: <EyeOffIcon />, onClick: handleClearSelection },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Documentation', icon: <InfoIcon />, onClick: () => setHelpModal('docs') },
        { label: 'Keyboard Shortcuts', shortcut: 'Cmd/Ctrl+/', onClick: () => setHelpModal('shortcuts') },
        { type: 'divider' },
        { label: 'About', onClick: () => setHelpModal('about') },
      ],
    },
  ], [
    handleOpenIfcClick,
    handleScreenshot,
    handleFitToModel,
    handleTopView,
    handleSetViewDirection,
    handleToggleViewCube,
    viewCubeEnabled,
    isLeftPanelCollapsed,
    isRightPanelCollapsed,
    isBottomPanelCollapsed,
    handleSetViewportLayout,
    handleShowAll,
    handleClearSelection,
    floorMenuItems,
    categoryMenuItems,
    selectionHiderMenuItems,
    clippingEnabled,
    clippingGizmosVisible,
    clipEdgesVisible,
    clipOrthoY,
    sectionBoxActive,
    clippingToolMode,
    clipPlaneOpacity,
    clipPlaneSize,
    clipEdgeColor,
    clipEdgeWidth,
    clipFillColor,
    clipFillOpacity,
    clipPlaneCount,
    createAxisClippingPlane,
    createSectionBox,
    clearSectionBox,
    clearAllClipping,
    world,
    transformActive,
    disableTransform,
    enableTransform,
    resetTransform,
    statsVisible,
    toggleStatsOverlay,
    selectStatsPanel,
    minimapConfig,
    toggleMinimapEnabled,
    toggleMinimapVisible,
    toggleMinimapLock,
    nudgeMinimapZoom,
    helpModal,
  ]);

  // Toolbar right content
  const toolbarRightContent = useMemo(() => null, []);

  if (isLoading) {
    return (
      <div className="loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading BIM components...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading">
        <div className="error-content">
          <h3>Failed to Initialize BIM Components</h3>
          <p>{error}</p>
          <button onClick={retry} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="loading">
        <div className="loading-content">
          <p>Initializing BIM components...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`${containerClassName} multi-view--${presetKey}`} style={layoutStyle}>
      {/* Hidden file input for IFC loading */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ifc,.IFC"
        style={{ display: 'none' }}
        onChange={handleIfcFileSelected}
      />

      <DragAndDropOverlay container={containerRef.current} />

      {/* Top Toolbar */}
      <Toolbar menus={toolbarMenus} rightContent={toolbarRightContent} />

      {/* Main Content Area */}
      <div className="layout-body">
        {/* Left Panel (Existing Sidebar) */}
        <Panel
          position="left"
          title="Properties"
          icon={<BoxIcon />}
          collapsed={isLeftPanelCollapsed}
          onCollapsedChange={setLeftPanelCollapsed}
          defaultSize={defaultWidth}
          minSize={minWidth}
          maxSize={maxWidth}
          resizable={true}
        >
          <LeftPropertiesPanel />
        </Panel>

        {/* Center Area (Viewport + Bottom Panel) */}
        <div className="layout-center">
          {/* Viewport Area */}
          <main className={`main-content main-content--${presetKey}`}>
            <div className={`viewer-grid viewer-grid--${presetKey}`}>
              <div className="viewer-pane viewer-pane--primary">
                <Viewport />
              </div>
              {extraViews.map((orientation, index) => (
                <div key={`${orientation}-${index}`} className={`viewer-pane viewer-pane--${orientation}`}>
                  <SecondaryViewport orientation={orientation} preset={presetKey} />
                </div>
              ))}
            </div>
          </main>

          {/* Bottom Panel */}
          <Panel
            position="bottom"
            title="AI Visualizer"
            icon={<SparklesIcon />}
            collapsed={isBottomPanelCollapsed}
            onCollapsedChange={setBottomPanelCollapsed}
            defaultSize={200}
            minSize={100}
            maxSize={400}
            resizable={true}
          >
            <AiVisualizerBottomPanel />
          </Panel>
        </div>

        {/* Right Panel (Properties) */}
        <Panel
          position="right"
          title="Model Tree"
          icon={<LayersIcon />}
          collapsed={isRightPanelCollapsed}
          onCollapsedChange={setRightPanelCollapsed}
          defaultSize={320}
          minSize={260}
          maxSize={520}
          resizable={true}
        >
          <div className="properties-panel-content">
            <ModelTreePanel />
          </div>
        </Panel>
      </div>

      {/* Category Hider Modal */}
      <CategoryHiderModal
        isOpen={isCategoryHiderModalOpen}
        onClose={() => setIsCategoryHiderModalOpen(false)}
      />

      <Modal isOpen={helpModal === 'docs'} onClose={() => setHelpModal(null)} title="Documentation" size="sm">
        <Stack gap="sm">
          <Text variant="muted" size="sm" as="div">
            Useful links:
          </Text>
          <Text as="div">
            <a href="https://github.com/go36dic/deployable-ifc-viewer" target="_blank" rel="noopener noreferrer">
              Project repository
            </a>
          </Text>
          <Text as="div">
            <a href="https://docs.thatopen.com/" target="_blank" rel="noopener noreferrer">
              That Open documentation
            </a>
          </Text>
        </Stack>
      </Modal>

      <Modal isOpen={helpModal === 'shortcuts'} onClose={() => setHelpModal(null)} title="Keyboard Shortcuts" size="sm">
        <Stack gap="sm">
          <Text as="div"><strong>Cmd/Ctrl+O</strong> — Open IFC file</Text>
          <Text as="div"><strong>F</strong> — Fit to model</Text>
          <Text as="div"><strong>Cmd/Ctrl+/</strong> — Show this dialog</Text>
          <Text as="div"><strong>Esc</strong> — Close dialogs/previews</Text>
        </Stack>
      </Modal>

      <Modal isOpen={helpModal === 'about'} onClose={() => setHelpModal(null)} title="About" size="sm">
        <Stack gap="sm">
          <Text as="div">
            IFC Viewer — desktop-ready IFC/BIM viewer built with React, Three.js and That Open components.
          </Text>
          <Text variant="muted" size="sm" as="div">
            AI Visualizer uses your Replicate API token stored locally in this app.
          </Text>
        </Stack>
      </Modal>
    </div>
  );
};
