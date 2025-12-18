import React, { useEffect, useRef, useCallback } from 'react';
import { createRoot, Root } from 'react-dom/client';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import * as OBF from '@thatopen/fragments';
import * as WEBIFC from 'web-ifc';
import { useBIM } from '../../context/BIMContext';
import { ErrorType, handleBIMError, withErrorHandling } from '../../utils/errorHandler';
import { Minimap } from './Minimap';
import { ModelLoader } from '../layout/ModelLoader';
import { useViewCube } from '../../hooks/useViewCube';
import { Card, Stack, Text, Toggle } from '../../ui';
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
  const visibilityRootRef = useRef<Root | null>(null);
  const {
    components,
    visibilityPanelRef,
    setWorld,
    zoomToSelection,
    minimapConfig,
    setMinimapConfig,
    isModelLoading,
    setIsModelLoading,
    viewCubeEnabled,
    eventBus,
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
      if (isUnmountedRef.current) {return;}

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

      let container = panelElement.querySelector<HTMLElement>('.visibility-container');

      if (!container) {
        container = document.createElement('div');
        container.classList.add('visibility-container');
        panelElement.appendChild(container);
      }

      container.innerHTML = '';

      if (visibilityRootRef.current) {
        visibilityRootRef.current.unmount();
        visibilityRootRef.current = null;
      }

      const floors = classifier.list?.spatialStructures
        ? Object.keys(classifier.list.spatialStructures)
        : [];
      const categories = classifier.list?.entities
        ? Object.keys(classifier.list.entities)
        : [];

      const handleFloorToggle = (name: string, value: boolean) => {
        try {
          const found = classifier.list?.spatialStructures?.[name];
          if (found?.id !== null && found?.id !== undefined) {
            const foundIDs = indexer.getEntityChildren(model, found.id);
            const fragMap = model.getFragmentMap(foundIDs);
            hider.set(value, fragMap);
          }
        } catch (error) {
          handleBIMError(
            ErrorType.USER_INTERACTION,
            `Floor control interaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { error, floorName: name },
            'Viewport'
          );
        }
      };

      const handleCategoryToggle = (name: string, value: boolean) => {
        try {
          const found = classifier.find({ entities: [name] });
          hider.set(value, found);
        } catch (error) {
          handleBIMError(
            ErrorType.USER_INTERACTION,
            `Category control interaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { error, categoryName: name },
            'Viewport'
          );
        }
      };

      const VisibilityPanel: React.FC = () => {
        const [floorState, setFloorState] = React.useState<Record<string, boolean>>(() => (
          floors.reduce((acc, name) => ({ ...acc, [name]: true }), {})
        ));
        const [categoryState, setCategoryState] = React.useState<Record<string, boolean>>(() => (
          categories.reduce((acc, name) => ({ ...acc, [name]: true }), {})
        ));

        return (
          <Stack gap="md">
            <Card className="visibility-card">
              <Stack gap="sm" className="visibility-list">
                <Text variant="label" as="div">Floors</Text>
                {floors.length > 0 ? (
                  floors.map((name) => (
                    <Toggle
                      key={name}
                      label={name}
                      checked={floorState[name] ?? true}
                      onChange={(checked) => {
                        setFloorState((prev) => ({ ...prev, [name]: checked }));
                        handleFloorToggle(name, checked);
                      }}
                    />
                  ))
                ) : (
                  <Text variant="subtle" size="sm">No floor structures found in this model</Text>
                )}
              </Stack>
            </Card>

            <Card className="visibility-card">
              <Stack gap="sm" className="visibility-list">
                <Text variant="label" as="div">Categories</Text>
                {categories.length > 0 ? (
                  categories.map((name) => (
                    <Toggle
                      key={name}
                      label={name}
                      checked={categoryState[name] ?? true}
                      onChange={(checked) => {
                        setCategoryState((prev) => ({ ...prev, [name]: checked }));
                        handleCategoryToggle(name, checked);
                      }}
                    />
                  ))
                ) : (
                  <Text variant="subtle" size="sm">No entity categories found in this model</Text>
                )}
              </Stack>
            </Card>
          </Stack>
        );
      };

      const root = createRoot(container);
      visibilityRootRef.current = root;
      root.render(<VisibilityPanel />);

      panelElement.classList.add('panel-visible');
    }, ErrorType.COMPONENT_ERROR, 'Viewport');
  }, [visibilityPanelRef]);

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

        // Set up renderer (PostproductionRenderer adds AO/edges/outlines pipeline)
        const rendererComponent = new OBCF.PostproductionRenderer(components, viewerElementRef.current);
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

        // Configure postproduction defaults (gamma + custom effects + AO), but keep it disabled by default.
        try {
          rendererComponent.postproduction.enabled = false;
          rendererComponent.postproduction.setPasses({ gamma: true, custom: true, ao: true });
        } catch (error) {
          console.warn('Failed to initialize postproduction:', error);
        }

        // Keep camera aspect in sync with the renderer size.
        // SimpleRenderer already resizes itself via ResizeObserver, so we only
        // need to react to its resize events here.
        const handleResize = () => {
          if (isUnmountedRef.current) {
            return;
          }
          cameraComponent.updateAspect();
          rendererComponent.update();
        };
        resizeHandlerRef.current = handleResize;
        rendererComponent.onResize.add(handleResize);
        // Ensure initial aspect is correct after the first layout pass.
        handleResize();

        // Add grid to the scene (skip if already created)
        const viewerGrids = components.get(OBC.Grids) as any;
        const existingGrid =
          (world as any).__grid ??
          viewerGrids?.list?.get?.(world) ??
          (Array.isArray(viewerGrids?.list)
            ? viewerGrids.list.find((entry: any) => entry?.world === world || entry?.worldRef === world)
            : undefined);
        if (!existingGrid) {
          try {
            const created = viewerGrids.create(world);
            (world as any).__grid = created;
          } catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (!message.includes('already has a grid')) {
              throw error;
            }
          }
        } else {
          (world as any).__grid = existingGrid;
        }

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
              eventBus.emit('modelLoaded', { modelId: model.uuid });
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
      
      // Clean up resize handler
      if (resizeHandlerRef.current) {
        try {
          const currentRenderer = (worldRef.current?.renderer as any)?.onResize;
          currentRenderer?.remove?.(resizeHandlerRef.current);
        } catch {
          // ignore cleanup errors
        }
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
      if (visibilityRootRef.current) {
        visibilityRootRef.current.unmount();
        visibilityRootRef.current = null;
      }
      
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
