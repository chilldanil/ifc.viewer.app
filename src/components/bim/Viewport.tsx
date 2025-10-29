import React, { useEffect, useRef, useCallback } from 'react';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import * as OBF from '@thatopen/fragments';
import * as WEBIFC from 'web-ifc';
import * as BUI from '@thatopen/ui';
import { useBIM } from '../../context/BIMContext';
import { ErrorType, handleBIMError, withErrorHandling } from '../../utils/errorHandler';
import { Minimap } from './Minimap';
import { ModelLoader } from '../layout/ModelLoader';
import { useViewCube } from '../../hooks/useViewCube';
import './Viewport.css';

// Extend JSX.IntrinsicElements to include the custom element
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'bim-viewport': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

// Type definitions for better type safety
interface VisibilityControls {
  model: OBF.FragmentsGroup;
  indexer: OBC.IfcRelationsIndexer;
  classifier: OBC.Classifier;
  hider: OBC.Hider;
}

const ViewportComponent: React.FC = () => {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerElementRef = useRef<HTMLElement | null>(null);
  const viewerInitializedRef = useRef(false);
  const fragmentsHandlerRef = useRef<((model: OBF.FragmentsGroup) => Promise<void>) | null>(null);
  const fragmentsDisposedHandlerRef = useRef<(({ groupID }: { groupID: string }) => void) | null>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const isUnmountedRef = useRef(false);
  const worldRef = useRef<OBC.World | null>(null);
  const highlighterInitializedRef = useRef(false);
  const processedModelsRef = useRef<Set<string>>(new Set());
  const {
    components,
    visibilityPanelRef,
    visibilityOverlayContainerRef,
    setWorld,
    zoomToSelection,
    minimapConfig,
    setMinimapConfig,
    isModelLoading,
    setIsModelLoading,
    viewCubeEnabled,
  } = useBIM();

  // Get Three.js camera, renderer, and controls for ViewCube
  const threeCamera = worldRef.current ? (worldRef.current.camera as any).three : null;
  const threeRenderer = worldRef.current ? (worldRef.current.renderer as any).three : null;
  const cameraControls = worldRef.current ? (worldRef.current.camera as any).controls : null;

  // Initialize ViewCube using custom hook
  useViewCube({
    camera: threeCamera,
    renderer: threeRenderer,
    controls: cameraControls,
    isEnabled: !!worldRef.current && viewCubeEnabled, // Only enable when world is ready and not toggled off
  });

  const createVisibilityControls = useCallback(async (params: VisibilityControls) => {
    const { model, indexer, classifier, hider } = params;
    
    return withErrorHandling(async () => {
      // Check if component is unmounted
      if (isUnmountedRef.current) {return;}

      // Ensure we have a valid panel element to inject controls into
      const panelElement = visibilityPanelRef.current;

      if (!panelElement) {
        handleBIMError(
          ErrorType.COMPONENT_ERROR,
          'Visibility controls panel not found in sidebar',
          undefined,
          'Viewport'
        );
        return;
      }

      const ensureContainer = (element: HTMLElement | null) => {
        if (!element) {
          return null;
        }

        if (element.classList.contains('visibility-container')) {
          return element;
        }

        const existing = element.querySelector<HTMLElement>('.visibility-container');
        if (existing) {
          return existing;
        }

        const created = document.createElement('div');
        created.classList.add('visibility-container');
        element.appendChild(created);
        return created;
      };

      const containers: HTMLElement[] = [];
      const sidebarContainer = ensureContainer(panelElement);
      const overlayContainer = ensureContainer(visibilityOverlayContainerRef.current);

      if (sidebarContainer) {
        containers.push(sidebarContainer);
      }
      if (overlayContainer && overlayContainer !== sidebarContainer) {
        containers.push(overlayContainer);
      }

      if (containers.length === 0) {
        return;
      }

      const controlRegistry = new Map<string, Set<BUI.Checkbox>>();

      const registerControl = (key: string, checkbox: BUI.Checkbox) => {
        const existing = controlRegistry.get(key);
        if (existing) {
          existing.add(checkbox);
        } else {
          controlRegistry.set(key, new Set([checkbox]));
        }
      };

      const syncPeerCheckboxes = (key: string, source: BUI.Checkbox) => {
        const peers = controlRegistry.get(key);
        if (!peers) {
          return;
        }

        const { checked } = source as unknown as { checked?: boolean };
        const isChecked = typeof checked === 'boolean' ? checked : source.hasAttribute('checked');

        peers.forEach((checkbox) => {
          if (checkbox === source) {
            return;
          }

          const peerElement = checkbox as unknown as { checked?: boolean };
          if (typeof peerElement.checked === 'boolean') {
            peerElement.checked = Boolean(isChecked);
          }

          if (isChecked) {
            checkbox.setAttribute('checked', '');
          } else {
            checkbox.removeAttribute('checked');
          }
        });
      };

      const buildFloorSection = () => {
        const section = BUI.Component.create<BUI.PanelSection>(() => {
          return BUI.html`<bim-panel-section collapsed label="Floors" name="floors"></bim-panel-section>`;
        });

        if (classifier.list?.spatialStructures) {
          const structureNames = Object.keys(classifier.list.spatialStructures);
          if (structureNames.length > 0) {
            for (const name of structureNames) {
              const controlKey = `floor:${name}`;
              const checkbox = BUI.Component.create<BUI.Checkbox>(() => {
                return BUI.html`
                  <bim-checkbox
                    value="${controlKey}"
                    data-control-key="${controlKey}"
                    checked
                    label="${name}"
                    @change="${({ target }: { target: BUI.Checkbox }) => {
                      const targetCheckbox = target as BUI.Checkbox;
                      try {
                        const found = classifier.list.spatialStructures[name];
                        if (found?.id !== null && found?.id !== undefined) {
                          const foundIDs = indexer.getEntityChildren(model, found.id);
                          const fragMap = model.getFragmentMap(foundIDs);
                          hider.set(target.value, fragMap);
                        }
                      } catch (error) {
                        handleBIMError(
                          ErrorType.USER_INTERACTION,
                          `Floor control interaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                          { error, floorName: name },
                          'Viewport'
                        );
                      } finally {
                        syncPeerCheckboxes(controlKey, targetCheckbox);
                      }
                    }}">
                  </bim-checkbox>
                `;
              });
              registerControl(controlKey, checkbox);
              section.append(checkbox);
            }
          } else {
            const noFloorsMessage = BUI.Component.create(() => {
              return BUI.html`<div style="color: #666; font-size: 0.9rem; padding: 8px;">No floor structures found in this model</div>`;
            });
            section.append(noFloorsMessage);
          }
        } else {
          const noSpatialMessage = BUI.Component.create(() => {
            return BUI.html`<div style="color: #666; font-size: 0.9rem; padding: 8px;">Spatial structures not available in this model</div>`;
          });
          section.append(noSpatialMessage);
          console.log('No spatial structures available for floor controls - this is normal for some IFC models');
        }

        return section;
      };

      const buildCategorySection = () => {
        const section = BUI.Component.create<BUI.PanelSection>(() => {
          return BUI.html`<bim-panel-section collapsed label="Categories" name="categories"></bim-panel-section>`;
        });

        if (classifier.list?.entities) {
          const classNames = Object.keys(classifier.list.entities);
          if (classNames.length > 0) {
            for (const name of classNames) {
              const controlKey = `category:${name}`;
              const checkbox = BUI.Component.create<BUI.Checkbox>(() => {
                return BUI.html`
                  <bim-checkbox
                    value="${controlKey}"
                    data-control-key="${controlKey}"
                    checked
                    label="${name}"
                    @change="${({ target }: { target: BUI.Checkbox }) => {
                      const targetCheckbox = target as BUI.Checkbox;
                      try {
                        const found = classifier.find({ entities: [name] });
                        hider.set(target.value, found);
                      } catch (error) {
                        handleBIMError(
                          ErrorType.USER_INTERACTION,
                          `Category control interaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                          { error, categoryName: name },
                          'Viewport'
                        );
                      } finally {
                        syncPeerCheckboxes(controlKey, targetCheckbox);
                      }
                    }}">
                  </bim-checkbox>
                `;
              });
              registerControl(controlKey, checkbox);
              section.append(checkbox);
            }
          } else {
            const noCategoriesMessage = BUI.Component.create(() => {
              return BUI.html`<div style="color: #666; font-size: 0.9rem; padding: 8px;">No entity categories found in this model</div>`;
            });
            section.append(noCategoriesMessage);
          }
        } else {
          const noEntitiesMessage = BUI.Component.create(() => {
            return BUI.html`<div style="color: #666; font-size: 0.9rem; padding: 8px;">Entity information not available in this model</div>`;
          });
          section.append(noEntitiesMessage);
          console.log('No entities available for category controls - this is normal for some IFC models');
        }

        return section;
      };

      containers.forEach((target) => {
        target.innerHTML = '';
        const floorSection = buildFloorSection();
        const categorySection = buildCategorySection();
        target.append(floorSection, categorySection);
      });

      panelElement.classList.add('panel-visible');
    }, ErrorType.COMPONENT_ERROR, 'Viewport');
  }, [visibilityPanelRef, visibilityOverlayContainerRef]);

  const cleanupBIMComponents = useCallback(() => {
    if (!components) {return;}

    try {
      // More aggressive highlighter cleanup
      try {
        const highlighter = components.get(OBCF.Highlighter);
        if (highlighter) {
          // Clear all selections first
          try {
            highlighter.clear();
            
            // Force clear all possible selection stores
            const selectionProps = ['selection', 'selections', '_selection', '_selections', 'selectionEvents', '_selectionEvents', 'events'];
            selectionProps.forEach(prop => {
              try {
                if ((highlighter as any)[prop]) {
                  if ((highlighter as any)[prop] instanceof Map) {
                    (highlighter as any)[prop].clear();
                  } else if (typeof (highlighter as any)[prop] === 'object') {
                    Object.keys((highlighter as any)[prop]).forEach(key => {
                      delete (highlighter as any)[prop][key];
                    });
                  }
                }
              } catch (propError) {
                // Ignore individual property errors
              }
            });
          } catch (clearError) {
            console.warn('Warning during highlighter clear:', clearError);
          }
          
          // Dispose the highlighter completely
          try {
            if (typeof (highlighter as any).dispose === 'function') {
              (highlighter as any).dispose();
            }
          } catch (disposeError) {
            console.warn('Warning during highlighter disposal:', disposeError);
          }
        }
      } catch (error) {
        console.warn('Warning during highlighter cleanup:', error);
      }

      // Clean up world if it exists
      if (worldRef.current) {
        try {
          const worlds = components.get(OBC.Worlds);
          
          // Check if world exists in the list before trying to delete
          if (worlds && typeof worlds.delete === 'function') {
            try {
              // Try to delete the world, ignore if it's not found
              worlds.delete(worldRef.current);
            } catch (deleteError) {
              // Ignore "world not found" errors during cleanup
              const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
              if (!errorMessage.includes('not found')) {
                console.warn('Unexpected error during world deletion:', deleteError);
              }
            }
          }
          
          // Dispose the world after removing from list - only if it has components
          if (typeof worldRef.current.dispose === 'function') {
            try {
              worldRef.current.dispose();
            } catch (disposeError) {
              // Ignore dispose errors during cleanup (like "No scene initialized!")
              console.warn('Warning during world disposal:', disposeError);
            }
          }
        } catch (error) {
          console.warn('Warning during world cleanup:', error);
        }
        worldRef.current = null;
        setWorld(null);
      }

      // Clean up fragments manager handlers
      if (fragmentsHandlerRef.current) {
        try {
          const fragmentsManager = components.get(OBC.FragmentsManager);
          if (fragmentsManager && fragmentsManager.onFragmentsLoaded) {
            fragmentsManager.onFragmentsLoaded.remove(fragmentsHandlerRef.current);
          }
        } catch (error) {
          console.warn('Warning during fragments handler cleanup:', error);
        }
        fragmentsHandlerRef.current = null;
      }
      try {
        const fragmentsManager = components.get(OBC.FragmentsManager);
        if (fragmentsManager && fragmentsDisposedHandlerRef.current) {
          fragmentsManager.onFragmentsDisposed.remove(fragmentsDisposedHandlerRef.current);
        }
      } catch (error) {
        console.warn('Warning during fragments disposed handler cleanup:', error);
      }
      fragmentsDisposedHandlerRef.current = null;
      processedModelsRef.current.clear();
    } catch (error) {
      // Log but don't throw during cleanup
      console.warn('Error during BIM components cleanup:', error);
    }
  }, [components, setWorld]);

  //doubleclick listener for measurement of length 
  const canvasRef = useRef<HTMLElement | null>(null);
  const dblClickHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);


  useEffect(() => {
    // Reset unmounted flag
    isUnmountedRef.current = false;
    
    // Prevent multiple initializations
    if (!components || !viewerContainerRef.current || viewerInitializedRef.current) {return;}

    const setupViewer = async () => {
      return withErrorHandling(async () => {
        // Check if viewer already exists
        const existingViewer = viewerContainerRef.current?.querySelector('bim-viewport');
        if (existingViewer) {
          handleBIMError(
            ErrorType.BIM_INITIALIZATION,
            'Viewer already exists, skipping initialization',
            undefined,
            'Viewport'
          );
          return;
        }

        // Clean up any existing components first
        cleanupBIMComponents();

        // Mark as initialized
        viewerInitializedRef.current = true;

        // Create and setup viewer
        viewerElementRef.current = document.createElement('bim-viewport');
        viewerElementRef.current.style.width = '100%';
        viewerElementRef.current.style.height = '100%';
        viewerContainerRef.current?.appendChild(viewerElementRef.current);

        canvasRef.current = viewerElementRef.current;

        //doubleclick listener for measurement of length
        // dblclick to create a length measurement when enabled
        const dblHandler = () => {
          try {
            const measurement = components.get(OBCF.LengthMeasurement);
            if (measurement?.enabled) {measurement.create();}
          } catch {
            // Silently ignore measurement creation errors
          }
        };
        dblClickHandlerRef.current = dblHandler;
        canvasRef.current.addEventListener('dblclick', dblHandler);
        window.addEventListener('length-create', () => {
          const measurement = components.get(OBCF.LengthMeasurement);
          if (measurement?.enabled) {
            measurement.create();
          }
        });

        // Initialize the viewer with a unique world
        const worlds = components.get(OBC.Worlds);
        const world = worlds.create();
        
        // Set up scene first
        const sceneComponent = new OBC.SimpleScene(components);
        sceneComponent.setup();
        world.scene = sceneComponent;

        // Set up renderer
        const rendererComponent = new OBC.SimpleRenderer(components, viewerElementRef.current);
        world.renderer = rendererComponent;

        // Set up OrthoPerspective camera
        const cameraComponent = new OBC.OrthoPerspectiveCamera(components);
        world.camera = cameraComponent;

        // Place camera at a default position looking at origin
        try {
          await cameraComponent.controls.setLookAt(3, 3, 3, 0, 0, 0);
        } catch { /* ignore */ }

        // Ensure all components are properly initialized before storing world
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Validate that all components are ready before proceeding
        if (!world.scene || !world.renderer || !world.camera || !world.scene.three) {
          throw new Error('Failed to properly initialize world components');
        }
        
        // Store world references only after validation
        worldRef.current = world;
        setWorld(world);

        // Wait additional time for world to fully stabilize before other components access it
        await new Promise(resolve => setTimeout(resolve, 200));

        // Handle viewport resize
        const handleResize = () => {
          if (!isUnmountedRef.current) {
            rendererComponent.resize();
            cameraComponent.updateAspect();
          }
        };
        resizeHandlerRef.current = handleResize;
        viewerElementRef.current.addEventListener("resize", handleResize);

        // Add grid to the scene
        const viewerGrids = components.get(OBC.Grids);
        viewerGrids.create(world);

        // Set up IFC loader (with WebAssembly)
        const ifcLoader = components.get(OBC.IfcLoader);
        ifcLoader.settings.wasm = { 
          path: 'https://unpkg.com/web-ifc@0.0.68/dist/',
          absolute: true
        };
        await ifcLoader.setup();

        // Add loading state management to IFC loader
        ifcLoader.onIfcStartedLoading.add(() => {
          console.log('IFC loading started');
          setIsModelLoading(true);
        });

        // Wait a moment for all components to stabilize before setting up highlighter
        await new Promise(resolve => setTimeout(resolve, 200));

        // Set up highlighter for selection and hover effects with proper validation
        try {
          // Ensure world is fully ready before highlighter setup
          if (!world || !world.scene || !world.renderer || !world.camera) {
            console.warn('World not fully initialized, skipping highlighter setup');
            return;
          }
          
          // Wait a bit more to ensure world is stable
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verify world is still valid
          if (!worldRef.current || !worldRef.current.scene || !worldRef.current.renderer) {
            console.warn('World became invalid during highlighter setup delay');
            return;
          }
          
          const highlighter = components.get(OBCF.Highlighter);
          
          // Avoid setting up the highlighter multiple times which causes duplicate selection errors
          if (!highlighterInitializedRef.current) {
            try {
              highlighter.setup({ world: worldRef.current });
              highlighter.zoomToSelection = zoomToSelection;
              highlighterInitializedRef.current = true;
              console.log('Highlighter setup successful - built-in selection should work');
            } catch (setupError) {
              console.warn('Highlighter setup failed:', setupError);
            }
          } else {
            console.log('Highlighter already initialized, skipping setup');
          }
        } catch (error) {
          console.warn('Highlighter initialization failed completely:', error);
        }

        // Set up fragments manager to handle loaded models
        const fragmentsManager = components.get(OBC.FragmentsManager);
        const indexer = components.get(OBC.IfcRelationsIndexer);
        const classifier = components.get(OBC.Classifier);
        const hider = components.get(OBC.Hider);

        const handleFragmentsDisposed = ({ groupID }: { groupID: string }) => {
          if (!groupID) {return;}
          processedModelsRef.current.delete(groupID);
        };
        fragmentsManager.onFragmentsDisposed.add(handleFragmentsDisposed);
        fragmentsDisposedHandlerRef.current = handleFragmentsDisposed;

        // Create and store the new handler
        const handleFragmentsLoaded = async (model: OBF.FragmentsGroup) => {
          if (isUnmountedRef.current) {return;}
          
          // Set loading to false when fragments are loaded
          setIsModelLoading(false);
          
          await withErrorHandling(async () => {
            // Wait a bit more to ensure everything is ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Validate world and scene existence with detailed checks
            if (!worldRef.current) {
              throw new Error('World reference is not available when trying to load fragments');
            }
            
            if (!worldRef.current.scene) {
              throw new Error('Scene is not initialized in world when trying to load fragments');
            }
            
            if (!worldRef.current.scene.three) {
              throw new Error('Three.js scene is not initialized when trying to load fragments');
            }
            
            // Use worldRef.current consistently to avoid instance mismatches
            
            worldRef.current.scene.three.add(model);

            const alreadyProcessed = processedModelsRef.current.has(model.uuid);

            if (model.hasProperties && !alreadyProcessed) {
              await indexer.process(model);
              
              classifier.byEntity(model);
              await classifier.bySpatialStructure(model, {
                isolate: new Set([WEBIFC.IFCBUILDINGSTOREY]),
              });

              processedModelsRef.current.add(model.uuid);

              // Create visibility controls after classification
              await createVisibilityControls({ model, indexer, classifier, hider });
            } else if (alreadyProcessed) {
              // Data already classified; still refresh visibility controls so UI stays synced
              await createVisibilityControls({ model, indexer, classifier, hider });
            } else {
              processedModelsRef.current.delete(model.uuid);
            }
          }, ErrorType.MODEL_LOADING, 'Viewport').catch((error) => {
            // If loading fails, make sure to hide the loader
            setIsModelLoading(false);
            throw error;
          });
        };

        fragmentsHandlerRef.current = handleFragmentsLoaded;
        fragmentsManager.onFragmentsLoaded.add(handleFragmentsLoaded);
      }, ErrorType.BIM_INITIALIZATION, 'Viewport');
    };

    setupViewer().then((result) => {
      if (!viewerInitializedRef.current || result === null) {
        // Setup failed, reset state
        console.warn('Viewer setup failed, cleaning up...');
        cleanupBIMComponents();
        if (viewerElementRef.current?.parentNode) {
          viewerElementRef.current.parentNode.removeChild(viewerElementRef.current);
        }
        viewerElementRef.current = null;
        viewerInitializedRef.current = false;
      }
    }).catch((error) => {
      console.error('Viewer setup failed with error:', error);
      // Reset state on error
      cleanupBIMComponents();
      if (viewerElementRef.current?.parentNode) {
        viewerElementRef.current.parentNode.removeChild(viewerElementRef.current);
      }
      viewerElementRef.current = null;
      viewerInitializedRef.current = false;
    });

    // Cleanup function
    return () => {
      isUnmountedRef.current = true;
      
      // Clean up resize event listener
      if (resizeHandlerRef.current && viewerElementRef.current) {
        viewerElementRef.current.removeEventListener("resize", resizeHandlerRef.current);
        resizeHandlerRef.current = null;
      }
      
      // Clean up custom event listeners
      if (viewerElementRef.current) {
        const canvas = viewerElementRef.current;
        if (dblClickHandlerRef.current) {
          canvas.removeEventListener('dblclick', dblClickHandlerRef.current);
          dblClickHandlerRef.current = null;
        }
      }
      
      // Clean up viewer element
      if (viewerElementRef.current?.parentNode) {
        viewerElementRef.current.parentNode.removeChild(viewerElementRef.current);
      }
      viewerElementRef.current = null;
      
      // Clean up BIM components
      cleanupBIMComponents();
      
      // Reset initialization flag
      viewerInitializedRef.current = false;
      
      // Reset highlighter flag on cleanup so it can be re-initialized next mount if needed
      highlighterInitializedRef.current = false;
    };
  }, [components, setWorld, createVisibilityControls, cleanupBIMComponents]);

  useEffect(() => {
    if (components) {
      const highlighter = components.get(OBCF.Highlighter);
      highlighter.zoomToSelection = zoomToSelection;
    }
  }, [zoomToSelection, components]);

  return (
    <div ref={viewerContainerRef} className="viewer-container">
      {isModelLoading && <ModelLoader text="Loading IFC Model..." />}
      <Minimap config={minimapConfig} onConfigChange={setMinimapConfig} />
      
    </div>
  );
};

export const Viewport = React.memo(ViewportComponent);
