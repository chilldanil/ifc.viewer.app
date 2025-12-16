import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MultiViewPreset, useBIM } from '../../context/BIMContext';
import * as BUIC from '@thatopen/ui-obc';
import * as BUI from '@thatopen/ui';
import * as OBCF from '@thatopen/components-front';
import * as OBC from '@thatopen/components';
import * as THREE from 'three';
import './Sidebar.css';
import { bridge } from '../../utils/bridge';
import { useElectronFileOpen } from '../../hooks/useElectronFileOpen';
import { useElementSelection } from '../../hooks/useElementSelection';
import { Button, Card, Input, Row, Stack, Text } from '../../ui';
import type { Table } from '@thatopen/ui';
import { setupIfcLoader } from '../../core/services/ifcLoaderService';
import { setupRelationsTreeSelection } from '../../utils/relationsTreeSelection';

type LoadedModel = {
  id: string;
  label: string;
  visible: boolean;
};

const SELECT_HIGHLIGHTER = 'select';
const HOVER_HIGHLIGHTER = 'hover';

const MULTI_VIEW_OPTIONS: Array<{ id: MultiViewPreset; label: string }> = [
  { id: 'single', label: 'Single' },
  { id: 'dual', label: '2 Views' },
  { id: 'triple', label: '3 Views' },
  { id: 'quad', label: '4 Views' },
];

const ClippingSection = React.lazy(() => import('../sidebar/ClippingSection').then(m => ({ default: m.ClippingSection })));
const ModelTransformSection = React.lazy(() => import('../sidebar/ModelTransformSection').then(m => ({ default: m.ModelTransformSection })));
const PropertyEditor = React.lazy(() => import('../sidebar/PropertyEditor').then(m => ({ default: m.PropertyEditor })));
const ExportModifiedIfc = React.lazy(() => import('../sidebar/ExportModifiedIfc').then(m => ({ default: m.ExportModifiedIfc })));
const MinimapSection = React.lazy(() => import('../sidebar/MinimapSection').then(m => ({ default: m.MinimapSection })));
const CameraSection = React.lazy(() => import('../sidebar/CameraSection').then(m => ({ default: m.CameraSection })));
const MeasurementSection = React.lazy(() => import('../sidebar/MeasurementSection').then(m => ({ default: m.MeasurementSection })));
const FloorPlanSection = React.lazy(() => import('../sidebar/FloorPlanSection').then(m => ({ default: m.FloorPlanSection })));
const AiVisualizerSection = React.lazy(() => import('../sidebar/AiVisualizerSection').then(m => ({ default: m.AiVisualizerSection })));
const RenderModeSection = React.lazy(() => import('../sidebar/RenderModeSection').then(m => ({ default: m.RenderModeSection })));
const PerformanceSection = React.lazy(() => import('../sidebar/PerformanceSection').then(m => ({ default: m.PerformanceSection })));
const ScreenshotSection = React.lazy(() => import('../sidebar/ScreenshotSection').then(m => ({ default: m.ScreenshotSection })));
const ViewCubeSection = React.lazy(() => import('../sidebar/ViewCubeSection').then(m => ({ default: m.ViewCubeSection })));
const GridSection = React.lazy(() => import('../sidebar/GridSection').then(m => ({ default: m.GridSection })));
const HiderSection = React.lazy(() => import('../sidebar/HiderSection').then(m => ({ default: m.HiderSection })));
const WorldsSection = React.lazy(() => import('../sidebar/WorldsSection').then(m => ({ default: m.WorldsSection })));
// Alternative implementation with more aggressive event stopping
// import { MinimapSectionAlt } from '../sidebar/MinimapSectionAlt';

const SidebarComponent: React.FC = () => {
  const {
    components,
    world,
    visibilityPanelRef: visibilityPanelContextRef,
    minimapConfig,
    setMinimapConfig,
    onObjectSelected,
    multiViewPreset,
    setMultiViewPreset,
    propertyEditingService,
    setIsModelLoading,
    eventBus,
  } = useBIM();
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const [loadedModels, setLoadedModels] = useState<LoadedModel[]>([]);
  const treeElementRef = useRef<Table | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [relationsSearch, setRelationsSearch] = useState('');

  // Use dedicated hook for element selection tracking
  const { selectedModel, selectedExpressID } = useElementSelection(components, world);

  useEffect(() => {
    eventBus.emit('selectionChanged', {
      modelId: selectedModel?.uuid ?? null,
      expressId: selectedExpressID ?? null,
    });
  }, [eventBus, selectedModel, selectedExpressID]);

  // Enable Electron file opening from menu
  useElectronFileOpen(components, propertyEditingService);

  // References for visibility controls container and panel
  const visibilityContainerRef = useRef<HTMLDivElement>(null);
  const visibilityPanelWrapperRef = useRef<HTMLElement>(null);
  // Reference for the Element Properties container
  const propertiesContainerRef = useRef<HTMLDivElement>(null);
  // Reference for the Classifier container
  const classifierContainerRef = useRef<HTMLDivElement>(null);
  // Store classified groups for each model (persistent across renders)
  const classifiedGroupsRef = useRef<any>({});
  // Reference for the minimap panel section
  const minimapPanelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Bridge API handlers
    const unsub = bridge.subscribe(async (evt) => {
      try {
        if (!world || !components) {return;}
        if (evt.type === 'loadFromUrl') {
          // Implement when URL loader utility available
          console.warn('loadFromUrl bridge not implemented');
        } else if (evt.type === 'loadFromFile') {
          const arrayBuffer = await evt.file.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          const ifcLoader = await import('../../core/services/ifcLoaderService');
          const { loadFromBuffer } = ifcLoader.setupIfcLoader(components);
          await loadFromBuffer(uint8);
        } else if (evt.type === 'getCameraState') {
          const state = {
            // minimal snapshot; extend later
            position: world.camera?.three?.position?.toArray?.() ?? [],
            target: (world.camera as any)?.controls?.getTarget?.(new (window as any).THREE.Vector3())?.toArray?.() ?? [],
          };
          evt.replyTo(state);
        } else if (evt.type === 'setCameraState') {
          const THREE = (window as any).THREE;
          const pos = new THREE.Vector3(...(evt.state?.position ?? [0, 0, 0]));
          const tgt = new THREE.Vector3(...(evt.state?.target ?? [0, 0, 0]));
          const controls = (world.camera as any)?.controls;
          if (controls?.setLookAt) {
            await controls.setLookAt(pos.x, pos.y, pos.z, tgt.x, tgt.y, tgt.z);
          }
          evt.replyTo?.(true);
        } else if (evt.type === 'captureScreenshot') {
          const dataUrl = await (async () => {
            const { captureScreenshot } = await import('../../utils/captureScreenshot');
            const threeRenderer = (world.renderer as any).three;
            const threeScene = (world.scene as any).three;
            const threeCamera = (world.camera as any).three;
            return captureScreenshot(threeRenderer, threeScene, threeCamera);
          })();
          evt.replyTo(dataUrl);
        }
      } catch (err) {
        console.warn('Bridge handler error:', err);
      }
    });
    return () => unsub();
  }, [components, world]);

  const refreshLoadedModels = useCallback(() => {
    if (!components) {
      setLoadedModels([]);
      return;
    }

    try {
      const fragmentsManager = components.get(OBC.FragmentsManager);
      if (!fragmentsManager) {
        setLoadedModels([]);
        return;
      }

      const models: LoadedModel[] = [];

      fragmentsManager.groups.forEach((group) => {
        if (!group) {
          return;
        }

        const metadataName = typeof (group as any)?.ifcMetadata?.name === 'string'
          ? ((group as any).ifcMetadata.name as string).trim()
          : '';
        const explicitName = typeof group.name === 'string' ? group.name.trim() : '';
        const displayName = metadataName || explicitName || group.uuid;

        models.push({
          id: group.uuid,
          label: displayName,
          visible: group.visible !== false,
        });
      });

      models.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true }));
      setLoadedModels(models);
    } catch (error) {
      console.warn('Failed to refresh loaded model list:', error);
    }
  }, [components]);

  const handleBrowseIfc = () => {
    fileInputRef.current?.click();
  };

  const handleIfcFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !components) {
      return;
    }

    try {
      const loader = setupIfcLoader(components, propertyEditingService ?? undefined);
      setIsModelLoading(true);
      const buffer = new Uint8Array(await file.arrayBuffer());
      await loader.loadFromBuffer(buffer);
      refreshLoadedModels();
    } catch (error) {
      console.warn('Failed to load IFC file:', error);
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleToggleModelVisibility = useCallback((modelId: string) => {
    if (!components) {
      return;
    }

    try {
      const fragmentsManager = components.get(OBC.FragmentsManager);
      const highlighter = components.get(OBCF.Highlighter);
      const group = fragmentsManager?.groups.get(modelId);

      if (!group) {
        console.warn('Model group not found when toggling visibility:', modelId);
        return;
      }

      const nextVisibility = !group.visible;
      group.visible = nextVisibility;

      if (!nextVisibility && highlighter) {
        try {
          const fragmentMap = group.getFragmentMap();
          highlighter.clear(SELECT_HIGHLIGHTER, fragmentMap);
          highlighter.clear(HOVER_HIGHLIGHTER, fragmentMap);
        } catch (clearError) {
          console.warn('Failed to clear highlighter selection for hidden model:', clearError);
        }
      }

      refreshLoadedModels();
      eventBus.emit('visibilityChanged', { modelId, visible: nextVisibility });
    } catch (error) {
      console.warn('Failed to toggle model visibility:', error);
    }
  }, [components, refreshLoadedModels, eventBus]);

  const handleDeleteModel = useCallback((modelId: string) => {
    if (!components) {
      return;
    }

    try {
      const fragmentsManager = components.get(OBC.FragmentsManager);
      const highlighter = components.get(OBCF.Highlighter);
      const group = fragmentsManager?.groups.get(modelId);

      if (!group) {
        console.warn('Model group not found when deleting:', modelId);
        return;
      }

      try {
        const fragmentMap = group.getFragmentMap();
        highlighter?.clear(SELECT_HIGHLIGHTER, fragmentMap);
        highlighter?.clear(HOVER_HIGHLIGHTER, fragmentMap);
      } catch (clearError) {
        console.warn('Failed to clear highlighter selection before deleting model:', clearError);
      }

      if (group.parent) {
        group.parent.remove(group);
      }

      fragmentsManager.disposeGroup(group);
      refreshLoadedModels();
    } catch (error) {
      console.warn('Failed to delete model:', error);
    }
  }, [components, refreshLoadedModels]);

  useEffect(() => {
    if (!components) {
      setLoadedModels([]);
      return;
    }

    let disposed = false;

    try {
      const fragmentsManager = components.get(OBC.FragmentsManager);
      if (!fragmentsManager) {
        setLoadedModels([]);
        return;
      }

      const update = () => {
        if (!disposed) {
          refreshLoadedModels();
        }
      };

      update();

      const handleLoaded = () => update();
      const handleDisposed = () => update();

      fragmentsManager.onFragmentsLoaded.add(handleLoaded);
      fragmentsManager.onFragmentsDisposed.add(handleDisposed);

      return () => {
        disposed = true;
        fragmentsManager.onFragmentsLoaded.remove(handleLoaded);
        fragmentsManager.onFragmentsDisposed.remove(handleDisposed);
      };
    } catch (error) {
      console.warn('Failed to subscribe to fragments manager events:', error);
      setLoadedModels([]);
      return undefined;
    }

    return undefined;
  }, [components, refreshLoadedModels]);

  // Relations tree setup
  useEffect(() => {
    if (!components || !treeContainerRef.current) {return;}

    const [tree] = BUIC.tables.relationsTree({
      components,
      models: []
    });

    treeElementRef.current = tree;
    treeContainerRef.current.innerHTML = '';
    treeContainerRef.current.appendChild(tree);

    const cleanupSelectionSync = setupRelationsTreeSelection(tree, components);

    return () => {
      if (cleanupSelectionSync) {cleanupSelectionSync();}
      treeElementRef.current = null;
      if (treeContainerRef.current) {
        treeContainerRef.current.innerHTML = '';
      }
    };
  }, [components]);

  useEffect(() => {
    if (!treeElementRef.current) {return;}
    treeElementRef.current.queryString = relationsSearch.trim() || null;
  }, [relationsSearch]);

  // Expose the visibility controls panel through the shared context so
  // that other components (for example the viewport) can interact with it.
  useEffect(() => {
    if (visibilityPanelWrapperRef.current) {
      visibilityPanelContextRef.current = visibilityPanelWrapperRef.current;
    }
  }, [visibilityPanelWrapperRef, visibilityPanelContextRef]);

  /**
   * Element Properties panel setup
   */
  useEffect(() => {
    // Require components, world (so highlighter is already set up), and container DOM ref
    if (!components || !world || !propertiesContainerRef.current) {
      console.log('Element Properties effect skipped:', { components: !!components, world: !!world, container: !!propertiesContainerRef.current });
      return;
    }

    // Add delay to ensure world is fully stabilized
    const setupDelay = setTimeout(() => {
      if (!components || !world || !propertiesContainerRef.current) {
        return; // Double-check after delay
      }

      // Create Element Properties table
      const [propertiesTable, updatePropertiesTable] = BUIC.tables.elementProperties({
        components,
        fragmentIdMap: {},
      });

      // Optional configurations taken from the docs
      propertiesTable.preserveStructureOnFilter = true;
      propertiesTable.indentationInText = false;

      // --- Helper handlers
      const onTextInput = (e: Event) => {
        const input = e.target as any;
        propertiesTable.queryString = input.value !== '' ? input.value : null;
      };

      const expandTable = (e: Event) => {
        const button = e.target as any;
        propertiesTable.expanded = !propertiesTable.expanded;
        button.label = propertiesTable.expanded ? 'Collapse' : 'Expand';
      };

      const copyAsTSV = async () => {
        await navigator.clipboard.writeText(propertiesTable.tsv);
      };

      // Create wrapper element using BUI templating
      const propertiesPanelElement = BUI.Component.create(() => {
        return BUI.html`
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <div style="display: flex; gap: 0.5rem;">
              <bim-button @click=${expandTable} label="Expand"></bim-button>
              <bim-button @click=${copyAsTSV} label="Copy as TSV"></bim-button>
            </div>
            <bim-text-input @input=${onTextInput} placeholder="Search Property" debounce="250"></bim-text-input>
            ${propertiesTable}
          </div>
        `;
      });

      // Inject into container
      const container = propertiesContainerRef.current;
      if (container) {
        container.innerHTML = '';
        container.appendChild(propertiesPanelElement);
      }

      // --- Hook into Highlighter events to update table with delay for setup
      const setupEventHandlers = () => {
        try {
          const highlighter = components.get(OBCF.Highlighter);
          console.log('Checking highlighter events:', { 
            highlighter: !!highlighter, 
            events: !!highlighter?.events, 
            select: !!highlighter?.events?.select,
            onHighlight: !!highlighter?.events?.select?.onHighlight
          });

          // The highlighter should be set up by the Viewport component
          // We just need to ensure the events exist before subscribing
          if (highlighter?.events?.select?.onHighlight) {
            console.log('Setting up Element Properties event handlers');
            
            const highlightHandler = (fragmentIdMap: any) => {
              console.log('=== Element Selection Event ===');
              console.log('fragmentIdMap:', fragmentIdMap);
              updatePropertiesTable({ fragmentIdMap });

              // Track selection for PropertyEditor
              try {
                const fragmentsManager = components.get(OBC.FragmentsManager);
                console.log('FragmentsManager groups count:', fragmentsManager.groups.size);

                // Get first selected element
                let foundSelection = false;
                for (const [fragmentId, expressIds] of Object.entries(fragmentIdMap)) {
                  const expressIdSet = expressIds as Set<number>;
                  console.log(`Fragment ${fragmentId} has ${expressIdSet?.size || 0} express IDs`);

                  if (expressIdSet && expressIdSet.size > 0) {
                    const firstExpressId = Array.from(expressIdSet)[0];
                    console.log('First ExpressID:', firstExpressId);

                    // Find the model that contains this fragment
                    for (const [groupId, group] of fragmentsManager.groups) {
                      console.log(`Checking group ${groupId}...`);

                      // Try to find if this group contains the fragment
                      try {
                        const fragmentMap = group.getFragmentMap([firstExpressId]);
                        console.log('Fragment map result:', fragmentMap);

                        if (fragmentMap && Object.keys(fragmentMap).length > 0) {
                          console.log('✅ Found model for selection!');
                          console.log('Model UUID:', group.uuid);
                          console.log('ExpressID:', firstExpressId);
                          // Selection is now handled by useElementSelection hook
                          foundSelection = true;
                          break;
                        }
                      } catch (err) {
                        console.warn('Error checking group:', err);
                      }
                    }

                    if (foundSelection) break;
                  }
                }

                if (!foundSelection) {
                  console.warn('❌ No model found for selected fragments');
                }
              } catch (e) {
                console.error('Failed to track selection for PropertyEditor:', e);
              }

              // Notify host if callback provided
              try {
                onObjectSelected?.(fragmentIdMap);
              } catch (e) {
                console.warn('onObjectSelected callback threw an error:', e);
              }
            };

            const clearHandler = () => {
              console.log('Element selection cleared');
              updatePropertiesTable({ fragmentIdMap: {} });
              // Selection clear is now handled by useElementSelection hook
            };

            highlighter.events.select.onHighlight.add(highlightHandler);
            highlighter.events.select.onClear.add(clearHandler);

            return () => {
              console.log('Cleaning up Element Properties event handlers');
              if (highlighter?.events?.select) {
                highlighter.events.select.onHighlight.remove(highlightHandler);
                highlighter.events.select.onClear.remove(clearHandler);
              }
            };
          } else {
            console.log('Highlighter events not ready yet, retrying in 100ms...');
            // Retry after a short delay
            const timeout = setTimeout(setupEventHandlers, 100);
            return () => clearTimeout(timeout);
          }
        } catch (error) {
          console.warn('Error setting up Element Properties event handlers:', error);
          return undefined;
        }
      };

      const cleanupEventHandlers = setupEventHandlers();

      // Store cleanup function for the timeout cleanup
      return () => {
        if (cleanupEventHandlers) {cleanupEventHandlers();}
      };
    }, 300); // Wait 300ms for world to stabilize

    // Cleanup function
    return () => {
      clearTimeout(setupDelay);
      if (propertiesContainerRef.current) {propertiesContainerRef.current.innerHTML = '';}
    };
  }, [components, world]);

  /**
   * Classifier panel setup for color controls
   */
  useEffect(() => {
    if (!components || !world || !classifierContainerRef.current) {
      console.log('Classifier effect skipped:', { components: !!components, world: !!world, container: !!classifierContainerRef.current });
      return;
    }

    // Add delay to ensure world is fully stabilized  
    const setupDelay = setTimeout(() => {
      if (!components || !world || !classifierContainerRef.current) {
        return; // Double-check after delay
      }

      const classifier = components.get(OBC.Classifier);
      const fragmentsManager = components.get(OBC.FragmentsManager);
      const color = new THREE.Color();

      // Setup classifier when a model is loaded
      const setupClassifierForModel = (model: any) => {
        console.log('Setting up classifier for model:', model.uuid);
        
        try {
          // First register the model with classifier, then classify
          classifier.byModel(model.uuid, model);
          classifier.byEntity(model);
          
          // Find different element types
          const walls = classifier.find({ entities: ["IFCWALLSTANDARDCASE", "IFCWALL"] });
          const slabs = classifier.find({ entities: ["IFCSLAB"] });
          const curtainWalls = classifier.find({ entities: ["IFCMEMBER", "IFCPLATE"] });
          const furniture = classifier.find({ entities: ["IFCFURNISHINGELEMENT"] });
          const doors = classifier.find({ entities: ["IFCDOOR"] });
          const windows = classifier.find({ entities: ["IFCWINDOW"] });
          const all = classifier.find({ models: [model.uuid] });

          // Store for reset functionality
          classifiedGroupsRef.current[model.uuid] = { walls, slabs, curtainWalls, furniture, doors, windows, all };
          
          console.log('Classified groups for model:', classifiedGroupsRef.current[model.uuid]);

          // Get element colors from CSS custom properties (set via token system)
          const computedStyle = getComputedStyle(document.documentElement);
          const getElementColor = (varName: string, fallback: string) => {
            // Try to get from the viewer container first, then root
            const container = document.querySelector('.ifc-viewer-library-container');
            if (container) {
              const containerStyle = getComputedStyle(container);
              const value = containerStyle.getPropertyValue(varName).trim();
              if (value) return value;
            }
            const value = computedStyle.getPropertyValue(varName).trim();
            return value || fallback;
          };

          const elementColors = {
            walls: getElementColor('--ifc-color-element-walls', '#3498db'),
            slabs: getElementColor('--ifc-color-element-slabs', '#e74c3c'),
            curtainWalls: getElementColor('--ifc-color-element-curtain-walls', '#f39c12'),
            furniture: getElementColor('--ifc-color-element-furniture', '#9b59b6'),
            doors: getElementColor('--ifc-color-element-doors', '#2ecc71'),
            windows: getElementColor('--ifc-color-element-windows', '#1abc9c'),
          };

          // Create color control UI
          const classifierPanel = BUI.Component.create(() => {
            return BUI.html`
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div style="font-size: 0.9rem; color: var(--ifc-color-text-muted, #666); margin-bottom: 0.5rem;">
                  Control element colors by IFC category
                </div>

                <bim-color-input
                  label="Walls" color="${elementColors.walls}"
                  @input="${({ target }: { target: any }) => {
                    color.set(target.color);
                    classifier.setColor(walls, color);
                  }}">
                </bim-color-input>

                <bim-color-input
                  label="Slabs" color="${elementColors.slabs}"
                  @input="${({ target }: { target: any }) => {
                    color.set(target.color);
                    classifier.setColor(slabs, color);
                  }}">
                </bim-color-input>

                <bim-color-input
                  label="Curtain Walls" color="${elementColors.curtainWalls}"
                  @input="${({ target }: { target: any }) => {
                    color.set(target.color);
                    classifier.setColor(curtainWalls, color);
                  }}">
                </bim-color-input>

                <bim-color-input
                  label="Furniture" color="${elementColors.furniture}"
                  @input="${({ target }: { target: any }) => {
                    color.set(target.color);
                    classifier.setColor(furniture, color);
                  }}">
                </bim-color-input>

                <bim-color-input
                  label="Doors" color="${elementColors.doors}"
                  @input="${({ target }: { target: any }) => {
                    color.set(target.color);
                    classifier.setColor(doors, color);
                  }}">
                </bim-color-input>

                <bim-color-input
                  label="Windows" color="${elementColors.windows}"
                  @input="${({ target }: { target: any }) => {
                    color.set(target.color);
                    classifier.setColor(windows, color);
                  }}">
                </bim-color-input>

                <bim-button
                  label="Reset All Colors"
                  @click="${() => {
                    console.log('Reset button clicked, available groups:', classifiedGroupsRef.current);
                    Object.values(classifiedGroupsRef.current).forEach((groups: any) => {
                      console.log('Resetting colors for group:', groups);
                      classifier.resetColor(groups.all);
                    });
                  }}">
                </bim-button>
              </div>
            `;
          });

          // Clear container and add new panel
          const container = classifierContainerRef.current;
          if (container) {
            container.innerHTML = '';
            container.appendChild(classifierPanel);
          }
        } catch (error) {
          console.warn('Error setting up classifier for model:', error);
        }
      };

      // Listen for model loading
      const handleModelLoaded = (model: any) => {
        console.log('Model loaded for classifier:', model);
        // Small delay to ensure model is fully processed
        setTimeout(() => setupClassifierForModel(model), 500);
      };

      fragmentsManager.onFragmentsLoaded.add(handleModelLoaded);

      // Store cleanup for the timeout
      return () => {
        fragmentsManager.onFragmentsLoaded.remove(handleModelLoaded);
        classifiedGroupsRef.current = {};
      };
    }, 300); // Wait 300ms for world to stabilize

    // Cleanup
    return () => {
      clearTimeout(setupDelay);
      if (classifierContainerRef.current) {classifierContainerRef.current.innerHTML = '';}
    };
  }, [components, world]);

  // Prevent minimap section from collapsing when controls are clicked
  useEffect(() => {
    if (!minimapPanelRef.current) {return;}

    const preventCollapse = (e: Event) => {
      const target = e.target as HTMLElement;
      const panelSection = minimapPanelRef.current;
      
      // If the click is inside the panel content area (not the header), prevent default
      if (panelSection && target !== panelSection) {
        const header = panelSection.querySelector('.bim-panel-section__header');
        if (header && !header.contains(target)) {
          e.stopPropagation();
          e.preventDefault();
        }
      }
    };

    minimapPanelRef.current.addEventListener('click', preventCollapse, true);
    
    return () => {
      if (minimapPanelRef.current) {
        minimapPanelRef.current.removeEventListener('click', preventCollapse, true);
      }
    };
  }, []);

  return (
    <aside className="sidebar">
      <bim-panel>
        {/* Model / Relations Tree */}
        <bim-panel-section label="Relations Tree" collapsed>
          <Card className="relations-card">
            <Stack gap="md">
              <Stack gap="sm">
                <Row className="relations-actions" between>
                  <Text variant="label" as="div" className="relations-label">Model Tree</Text>
                  <Button variant="primary" size="sm" onClick={handleBrowseIfc}>
                    Load IFC
                  </Button>
                </Row>
                <Input
                  placeholder="Search..."
                  value={relationsSearch}
                  onChange={(e) => setRelationsSearch(e.target.value)}
                />
              </Stack>

              <div className="relations-tree-shell">
                <div ref={treeContainerRef} className="relations-tree-container" />
              </div>

              <Stack gap="sm">
                <Text variant="label" as="div">View Layout</Text>
                <div className="multi-view-options">
                  {MULTI_VIEW_OPTIONS.map((option) => (
                    <Button
                      key={option.id}
                      variant={multiViewPreset === option.id ? 'primary' : 'ghost'}
                      selected={multiViewPreset === option.id}
                      className="multi-view-options__button"
                      onClick={() => setMultiViewPreset(option.id)}
                      block
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </Stack>

              {loadedModels.length > 0 && (
                <Stack gap="sm">
                  <Text variant="label" as="div">Loaded Models</Text>
                  <div className="model-manager">
                    {loadedModels.map((model) => (
                      <Card key={model.id} className="model-manager__item-card">
                        <Row between className="model-manager__row">
                          <Text className="model-manager__name" title={model.label}>{model.label}</Text>
                          <Row className="model-manager__actions">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleModelVisibility(model.id)}
                            >
                              {model.visible ? 'Hide' : 'Show'}
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeleteModel(model.id)}
                            >
                              Delete
                            </Button>
                          </Row>
                        </Row>
                      </Card>
                    ))}
                  </div>
                </Stack>
              )}
            </Stack>
            <input
              type="file"
              accept=".ifc,.IFC"
              ref={fileInputRef}
              className="relations-file-input"
              onChange={handleIfcFileSelected}
            />
          </Card>
        </bim-panel-section>

        {/* Visibility controls – content injected dynamically */}
        <bim-panel-section label="Visibility Controls" collapsed ref={visibilityPanelWrapperRef as any}>
          {/* This section will be populated by the Viewport component once a model is loaded */}
          <div ref={visibilityContainerRef} className="visibility-container" />
        </bim-panel-section>

        {/* Classifier controls for element colors */}
        <bim-panel-section label="Element Colors" collapsed>
          <div ref={classifierContainerRef} />
        </bim-panel-section>

        {/* Render Modes */}
        <React.Suspense fallback={<div />}>
          <RenderModeSection />
        </React.Suspense>

        {/* Worlds */}
        <bim-panel-section label="Worlds" collapsed>
          <React.Suspense fallback={<div />}>
            <WorldsSection />
          </React.Suspense>
        </bim-panel-section>

        {/* Hider */}
        <bim-panel-section label="Hider" collapsed>
          <React.Suspense fallback={<div />}>
            <HiderSection />
          </React.Suspense>
        </bim-panel-section>

        {/* Grids */}
        <bim-panel-section label="Grids" collapsed>
          <React.Suspense fallback={<div />}>
            <GridSection />
          </React.Suspense>
        </bim-panel-section>

        {/* Camera controls */}
        <bim-panel-section label="Camera" collapsed>
          <React.Suspense fallback={<div />}>
            <CameraSection />
          </React.Suspense>
        </bim-panel-section>

        {/* Floor Plan View */}
        <bim-panel-section label="Floor Plan View" collapsed>
          <React.Suspense fallback={<div />}> 
            <FloorPlanSection />
          </React.Suspense>
        </bim-panel-section>

        {/* Measurement Tools */}
        <bim-panel-section label="Measurement Tools" collapsed>
          <React.Suspense fallback={<div />}> 
            <MeasurementSection />
          </React.Suspense>
        </bim-panel-section>

        {/* Performance */}
        <React.Suspense fallback={<div />}>
          <PerformanceSection />
        </React.Suspense>

        {/* View Cube */}
        <React.Suspense fallback={<div />}>
          <ViewCubeSection />
        </React.Suspense>

        {/* Screenshot tools */}
        <React.Suspense fallback={<div />}>
          <ScreenshotSection />
        </React.Suspense>

        {/* Minimap controls */}
        <bim-panel-section 
          label="Minimap" 
          collapsed
          ref={(el: any) => { minimapPanelRef.current = el; }}
        >
          <React.Suspense fallback={<div />}> 
            <MinimapSection config={minimapConfig} onConfigChange={setMinimapConfig} />
          </React.Suspense>
        </bim-panel-section>

        {/* Clipping controls */}
        <bim-panel-section label="Clipping" collapsed>
          <React.Suspense fallback={<div />}>
            <ClippingSection />
          </React.Suspense>
        </bim-panel-section>

        {/* Model Transform controls */}
        <bim-panel-section label="Model Transform" collapsed>
          <React.Suspense fallback={<div />}>
            <ModelTransformSection />
          </React.Suspense>
        </bim-panel-section>

        {/* Element Properties - Enhanced with Editing */}
        <bim-panel-section label="Element Properties (Editable)" collapsed>
          <React.Suspense fallback={<div>Loading...</div>}>
            <PropertyEditor
              selectedModel={selectedModel}
              selectedExpressID={selectedExpressID}
            />
          </React.Suspense>
        </bim-panel-section>

        {/* Export Modified IFC */}
        <bim-panel-section label="Export Modified IFC" collapsed>
          <React.Suspense fallback={<div>Loading...</div>}>
            <ExportModifiedIfc />
          </React.Suspense>
        </bim-panel-section>

        {/* AI Visualizer */}
        <bim-panel-section label="AI Visualizer" collapsed>
          <React.Suspense fallback={<div>Loading AI Visualizer...</div>}>
            <AiVisualizerSection />
          </React.Suspense>
        </bim-panel-section>
      </bim-panel>
    </aside>
  );
};

export const Sidebar = React.memo(SidebarComponent);
