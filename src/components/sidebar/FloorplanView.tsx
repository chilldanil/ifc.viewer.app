import React, { useEffect, useRef, useState } from 'react';
import * as OBC from '@thatopen/components';
import * as BUI from '@thatopen/ui';
import * as THREE from 'three';
import { useBIM } from '../../context/BIMContext';
import './FloorPlanSection.css';

// Local helper to ensure BUI.Manager is initialized only once
const ensureBUI = () => {
  const mgr: any = BUI.Manager as any;
  if (!mgr.__initialised) {
    try {
      BUI.Manager.init();
    } catch (err) {
      // ignore "already initialized" errors
    }
    mgr.__initialised = true;
  }
};

interface FloorInfo {
  name: string;
  id: string;
  elevation?: number;
}

// Floor Plan Section
export const FloorPlanSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { components, world } = useBIM();
  const [isFloorPlanMode, setIsFloorPlanMode] = useState(false);
  const [availableFloors, setAvailableFloors] = useState<FloorInfo[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [savedCameraState, setSavedCameraState] = useState<any>(null);
  const [isFloorsExpanded, setIsFloorsExpanded] = useState<boolean>(false);

  // Store references to BIM components
  const classifierRef = useRef<OBC.Classifier | null>(null);
  const hiderRef = useRef<OBC.Hider | null>(null);
  const indexerRef = useRef<OBC.IfcRelationsIndexer | null>(null);
  const currentModelRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !components || !world) {return;}

    ensureBUI();

    // Get BIM components
    const classifier = components.get(OBC.Classifier);
    const hider = components.get(OBC.Hider);
    const indexer = components.get(OBC.IfcRelationsIndexer);
    const fragmentsManager = components.get(OBC.FragmentsManager);

    classifierRef.current = classifier;
    hiderRef.current = hider;
    indexerRef.current = indexer;

    // Listen for model loading to extract floor information
    const handleModelLoaded = (model: any) => {
      currentModelRef.current = model;
      
      // Wait a bit for classification to complete
      setTimeout(() => {
        extractFloorInformation(model, classifier);
      }, 1500); // Increased delay to ensure proper classification
    };

    fragmentsManager.onFragmentsLoaded.add(handleModelLoaded);

    // Cleanup
    return () => {
      fragmentsManager.onFragmentsLoaded.remove(handleModelLoaded);
    };
  }, [components, world]);

  const extractFloorInformation = (model: any, classifier: OBC.Classifier) => {
    try {
      console.log('Starting floor extraction...');
      console.log('Model:', model);
      console.log('Classifier list:', classifier.list);
      
      if (classifier.list?.spatialStructures) {
        const floors: FloorInfo[] = [];
        const structures = classifier.list.spatialStructures;
        
        console.log('Found spatial structures:', structures);
        
                  Object.entries(structures).forEach(([name, structure]: [string, any]) => {
            console.log(`Processing structure: ${name}`, structure);
            if (structure && typeof structure === 'object' && structure.id !== null && structure.id !== undefined) {
              // Try to extract elevation from various possible properties
              let elevation = structure.elevation;
              if (!elevation && structure.properties) {
                // Look for elevation in common IFC property names
                elevation = structure.properties.Elevation || 
                           structure.properties.elevation || 
                           structure.properties.Height ||
                           structure.properties.height;
              }
              
              floors.push({
                name: name,
                id: structure.id.toString(),
                elevation: elevation && elevation !== 0 ? elevation : undefined
              });
              console.log(`Added floor: ${name} with ID: ${structure.id}, elevation: ${elevation}`);
            }
          });

        // Sort floors by elevation if available
        floors.sort((a, b) => (a.elevation || 0) - (b.elevation || 0));
        
        console.log('Final extracted floors:', floors);
        setAvailableFloors(floors);
        
        // Update UI after floors are loaded
        updateFloorPlanUI();
      } else {
        console.log('No spatial structures found, checking entities...');
        
        // Fallback: Look for building storey entities
        if (classifier.list?.entities) {
          const floors: FloorInfo[] = [];
          const entities = classifier.list.entities;
          
          console.log('Available entities:', Object.keys(entities));
          
          Object.entries(entities).forEach(([entityName, entityData]: [string, any]) => {
            // Look for entities that might represent floors/storeys
            if (entityName.toLowerCase().includes('storey') || 
                entityName.toLowerCase().includes('floor') ||
                entityName.includes('IFCBUILDINGSTOREY')) {
              console.log(`Found potential floor entity: ${entityName}`, entityData);
              floors.push({
                name: entityName,
                id: entityName, // Use entity name as ID for entity-based approach
                elevation: undefined // Don't assume elevation when using entity fallback
              });
            }
          });
          
          if (floors.length > 0) {
            console.log('Extracted floors from entities:', floors);
            setAvailableFloors(floors);
            updateFloorPlanUI();
          } else {
            console.log('No floor entities found either');
          }
        }
      }
    } catch (error) {
      console.error('Error extracting floor information:', error);
    }
  };

  const updateFloorPlanUI = () => {
    if (!containerRef.current) {return;}

    const html = `
      <style>
        .camera-style-buttons bim-button,
        .camera-style-buttons bim-button::part(button) {
          min-height: 34px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          border-radius: 10px;
          border: 1px solid var(--sidebar-border, rgba(255, 255, 255, 0.06));
          background: var(--sidebar-control-bg, rgba(13, 18, 28, 0.85));
          color: var(--sidebar-text, #eef2fb);
          font-size: 0.82rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-shadow: none;
          box-shadow: none;
          transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;
        }

        .camera-style-buttons bim-button:hover::part(button),
        .camera-style-buttons bim-button:hover {
          background: var(--sidebar-control-hover, rgba(26, 35, 50, 0.95));
          border-color: var(--sidebar-accent-strong, rgba(94, 124, 255, 0.45));
        }

        .camera-style-buttons bim-button[disabled]::part(button),
        .camera-style-buttons bim-button[disabled] {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .camera-style-buttons .floors-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: var(--sidebar-surface-muted, rgba(20, 27, 40, 0.88));
          color: var(--sidebar-text, #eef2fb);
          border-radius: 12px 12px 0 0;
          border: 1px solid var(--sidebar-border, rgba(255, 255, 255, 0.06));
          cursor: pointer;
          user-select: none;
          transition: border-color 0.2s ease, background-color 0.2s ease;
        }

        .camera-style-buttons .floors-panel-header:hover {
          background: var(--sidebar-control-hover, rgba(26, 35, 50, 0.95));
          border-color: var(--sidebar-accent-strong, rgba(94, 124, 255, 0.45));
        }

        .camera-style-buttons .floors-panel-header[data-expanded="true"] .floors-toggle-arrow {
          transform: rotate(180deg);
        }

        .camera-style-buttons .floors-panel-title {
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          color: inherit;
        }

        .camera-style-buttons .floors-toggle-arrow {
          font-size: 0.75rem;
          transition: transform 0.2s ease;
          color: inherit;
        }

        .camera-style-buttons .floors-panel-content {
          background: var(--sidebar-surface-muted, rgba(20, 27, 40, 0.88));
          border: 1px solid var(--sidebar-border, rgba(255, 255, 255, 0.06));
          border-top: none;
          border-radius: 0 0 12px 12px;
          max-height: 200px;
          overflow-y: auto;
        }

        .camera-style-buttons .floor-option {
          padding: 10px 14px;
          cursor: pointer;
          color: var(--sidebar-text-muted, rgba(196, 205, 224, 0.78));
          border-bottom: 1px solid var(--sidebar-divider, rgba(255, 255, 255, 0.05));
          font-size: 0.82rem;
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        .camera-style-buttons .floor-option:last-child {
          border-bottom: none;
        }

        .camera-style-buttons .floor-option:hover {
          background: var(--sidebar-control-hover, rgba(26, 35, 50, 0.95));
          color: var(--sidebar-text, #eef2fb);
        }

        .camera-style-buttons .floor-option[data-active="true"] {
          background: rgba(94, 124, 255, 0.24);
          color: #ffffff;
          border-bottom-color: rgba(94, 124, 255, 0.35);
        }

        .camera-style-buttons .floor-info {
          margin-top: 12px;
          padding: 12px;
          font-size: 0.82rem;
          color: var(--sidebar-text-muted, rgba(196, 205, 224, 0.78));
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          border: 1px solid var(--sidebar-border, rgba(255, 255, 255, 0.06));
          line-height: 1.45;
        }

        .camera-style-buttons .floor-info strong {
          color: var(--sidebar-text, #eef2fb);
        }
      </style>
      <div class="floor-plan-controls camera-style-buttons">
        <div style="margin-bottom: 12px;">
          <bim-button 
            label="${isFloorPlanMode ? 'Exit Floor Plan' : 'Enter Floor Plan'}" 
            name="toggleFloorPlan"
            style="width: 100%;">
          </bim-button>
        </div>
        

        ${isFloorPlanMode ? `
          <div style="margin-bottom: 12px;">
            <div 
              class="floors-panel-header" 
              name="floorsToggle"
              data-expanded="${isFloorsExpanded}"
            >
              <span class="floors-panel-title">Floors</span>
              <span class="floors-toggle-arrow">▼</span>
            </div>
            
            <div 
              class="floors-panel-content" 
              style="display: ${isFloorsExpanded ? 'block' : 'none'};"
            >
              ${availableFloors.map(floor => `
                <div 
                  class="floor-option" 
                  name="selectFloor"
                  data-floor-id="${floor.id}"
                  data-floor-name="${floor.name}"
                  data-active="${selectedFloor === floor.id ? 'true' : 'false'}"
                >
                  ${floor.name}${floor.elevation && floor.elevation !== 0 ? ` (${floor.elevation.toFixed(1)}m)` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          
          ${selectedFloor ? `
            <div class="active-floor-display">
              <strong>Active Floor:</strong> ${availableFloors.find(f => f.id === selectedFloor)?.name || 'Unknown'}
            </div>
          ` : ''}
          
          <div style="margin-bottom: 12px;">
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <bim-button 
                label="Reset & Show All" 
                name="resetAll"
                style="width: 100%;">
              </bim-button>
            </div>
          </div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <bim-button 
                label="Top View" 
                name="topViewBtn"
                style="width: 100%;">
              </bim-button>
              <bim-button 
                label="Fit to View" 
                name="fitViewBtn"
                style="width: 100%;">
              </bim-button>
            </div>
          </div>
        ` : ''}
        
        <div class="floor-info">
          ${availableFloors.length > 0 
            ? `Found ${availableFloors.length} floor(s) in the model.<br/><br/>
               <strong>How to use:</strong><br/>
               1. Click "Enter Floor Plan" to start<br/>
               2. Select a floor to view only its elements<br/>
               3. Use "Top View" for floor plan perspective<br/>
               4. Click "Exit Floor Plan" to return to 3D view`
            : 'No floors detected. Load an IFC model to see available floors.'
          }
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(wrapper);

    // Add event listeners
    setupEventListeners(wrapper);
    
  };

  const setupEventListeners = (wrapper: HTMLElement) => {
    // Toggle floor plan mode
    const toggleBtn = wrapper.querySelector('bim-button[name="toggleFloorPlan"]') as any;
    toggleBtn?.addEventListener('click', () => {
      const newMode = !isFloorPlanMode;
      setIsFloorPlanMode(newMode);
      
      if (newMode) {
        enterFloorPlanMode();
      } else {
        exitFloorPlanMode();
      }
      
      updateFloorPlanUI();
    });

    // Floors panel toggle
    const floorsToggle = wrapper.querySelector('[name="floorsToggle"]') as HTMLElement;
    floorsToggle?.addEventListener('click', () => {
      setIsFloorsExpanded(!isFloorsExpanded);
      updateFloorPlanUI();
    });

    // Floor selection from expandable panel
    const floorOptions = wrapper.querySelectorAll('[name="selectFloor"]');
    floorOptions.forEach(option => {
      option.addEventListener('click', (e: any) => {
        const floorId = e.target.dataset.floorId;
        const floorName = e.target.dataset.floorName;
        
        if (floorId) {
          setSelectedFloor(floorId);
          showOnlyFloor(floorId, floorName);
          updateFloorPlanUI();
        }
      });
    });

    // Reset everything
    const resetAllBtn = wrapper.querySelector('bim-button[name="resetAll"]') as any;
    resetAllBtn?.addEventListener('click', () => {
      console.log('Reset button clicked - showing all elements');
      showAllElements();
      setSelectedFloor(null);
      
      // Also try to refresh the visibility state
      if (hiderRef.current) {
        // Force reset the hider component
        setTimeout(() => {
          hiderRef.current?.set(true);
          console.log('Force reset hider component');
        }, 100);
      }
      
      updateFloorPlanUI();
    });

    // View controls buttons
    const topViewBtn = wrapper.querySelector('bim-button[name="topViewBtn"]') as any;
    topViewBtn?.addEventListener('click', () => {
      setTopView();
    });

    const fitViewBtn = wrapper.querySelector('bim-button[name="fitViewBtn"]') as any;
    fitViewBtn?.addEventListener('click', () => {
      fitToView();
    });
  };

  const enterFloorPlanMode = () => {
    if (!world?.camera) {return;}

    try {
      // Save current camera state
      const camera = world.camera as OBC.OrthoPerspectiveCamera;
      const currentPosition = camera.three.position.clone();
      const currentTarget = new THREE.Vector3();
      
      if (camera.controls && typeof camera.controls.getTarget === 'function') {
        camera.controls.getTarget(currentTarget);
      }

      setSavedCameraState({
        position: currentPosition,
        target: currentTarget,
        isOrthographic: camera.projection.current === "Orthographic"
      });

      // Switch to orthographic mode for floor plan
      camera.projection.set("Orthographic");
      
      // Properly initialize orthographic camera parameters
      if (camera.three instanceof THREE.OrthographicCamera) {
        const orthoCamera = camera.three as THREE.OrthographicCamera;
        
        // Set reasonable default bounds for orthographic camera
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 50; // Default frustum size
        
        orthoCamera.left = -frustumSize * aspect / 2;
        orthoCamera.right = frustumSize * aspect / 2;
        orthoCamera.top = frustumSize / 2;
        orthoCamera.bottom = -frustumSize / 2;
        orthoCamera.zoom = 1; // Reset zoom to 1
        orthoCamera.near = 0.1;
        orthoCamera.far = 2000;
        orthoCamera.updateProjectionMatrix();
        
        console.log('Initialized orthographic camera with bounds:', {
          left: orthoCamera.left,
          right: orthoCamera.right,
          top: orthoCamera.top,
          bottom: orthoCamera.bottom,
          zoom: orthoCamera.zoom
        });
      }
      
      console.log('Entered floor plan mode');
    } catch (error) {
      console.error('Error entering floor plan mode:', error);
    }
  };

  const exitFloorPlanMode = () => {
    if (!world?.camera) {return;}

    try {
      // Restore previous camera state
      if (savedCameraState) {
        const camera = world.camera as OBC.OrthoPerspectiveCamera;
        
        // Restore camera position and target
        if (camera.controls && typeof camera.controls.setLookAt === 'function') {
          camera.controls.setLookAt(
            savedCameraState.position.x,
            savedCameraState.position.y,
            savedCameraState.position.z,
            savedCameraState.target.x,
            savedCameraState.target.y,
            savedCameraState.target.z
          );
        }

        // Restore projection mode
        if (!savedCameraState.isOrthographic) {
          camera.projection.set("Perspective");
        }
      }

      // Show all elements
      showAllElements();
      setSelectedFloor(null);
      
      console.log('Exited floor plan mode');
    } catch (error) {
      console.error('Error exiting floor plan mode:', error);
    }
  };

  // Try alternative floor filtering
  const tryAlternativeFloorFiltering = (floorName: string) => {
    console.log('Trying alternative floor filtering for:', floorName);
    
    if (!classifierRef.current || !hiderRef.current) {
      console.error('Required components not available for alternative filtering');
      hiderRef.current?.set(true); // Show all elements as fallback
      return;
    }

    try {
      const classifier = classifierRef.current;
      const hider = hiderRef.current;
      
      // Try entity-based filtering
      const entities = classifier.list?.entities;
      if (entities) {
        // Look for entities that contain the floor name or related terms
        const potentialMatches = Object.keys(entities).filter(entityName => 
          entityName.toLowerCase().includes(floorName.toLowerCase()) ||
          entityName.toLowerCase().includes('storey') ||
          entityName.toLowerCase().includes('floor')
        );
        
        console.log('Potential entity matches:', potentialMatches);
        
        if (potentialMatches.length > 0) {
          // Try to use the first match
          const entityName = potentialMatches[0];
          const found = classifier.find({ entities: [entityName] });
          
          if (found && Object.keys(found).length > 0) {
            console.log('Found elements using entity filtering:', found);
            hider.set(false); // Hide all
            hider.set(true, found); // Show found elements
            return;
          }
        }
      }
      
      // If nothing works, show all elements
      console.warn('Alternative filtering failed, showing all elements');
      hider.set(true);
      
    } catch (error) {
      console.error('Error in alternative filtering:', error);
      hiderRef.current?.set(true); // Show all as fallback
    }
  };

  const showOnlyFloor = (floorId: string, floorName: string) => {
    if (!classifierRef.current || !hiderRef.current || !indexerRef.current || !currentModelRef.current) {
      console.error('BIM components not available');
      return;
    }

    try {
      const classifier = classifierRef.current;
      const hider = hiderRef.current;
      const indexer = indexerRef.current;
      const model = currentModelRef.current;

      console.log(`Attempting to show floor: ${floorName} (ID: ${floorId})`);
      console.log('Available structures:', classifier.list?.spatialStructures);

      // First, show all elements to reset state
      hider.set(true);

      // Find the floor structure by ID
      const structures = classifier.list?.spatialStructures;
      if (!structures) {
        console.error('No spatial structures available');
        return;
      }

      const floorStructure = Object.values(structures).find((structure: any) => 
        structure && structure.id && structure.id.toString() === floorId
      );

      console.log('Found floor structure:', floorStructure);

              if (floorStructure && floorStructure.id !== null) {
          // Get all child elements of this floor
          const foundIDs = indexer.getEntityChildren(model, floorStructure.id);
          console.log(`Found ${foundIDs.size} child elements for floor`);
          
          if (foundIDs.size === 0) {
            console.warn('No child elements found for this floor, trying alternative approach...');
            // Try to find elements using classifier filter
            tryAlternativeFloorFiltering(floorName);
            return;
          }

          const fragMap = model.getFragmentMap(foundIDs);
          console.log('Fragment map:', fragMap);
          
          // Check if fragment map has any data
          if (!fragMap || Object.keys(fragMap).length === 0) {
            console.warn('Empty fragment map, trying alternative approach...');
            tryAlternativeFloorFiltering(floorName);
            return;
          }
          
          // Hide all elements first
          hider.set(false);
          
          // Show only the selected floor elements
          hider.set(true, fragMap);
          
          console.log(`Successfully showing floor: ${floorName} (${foundIDs.size} elements)`);
        } else {
          console.error(`Floor structure not found for ID: ${floorId}`);
          tryAlternativeFloorFiltering(floorName);
        }
    } catch (error) {
      console.error('Error showing floor:', error);
      // Fallback: show all elements if there's an error
      if (hiderRef.current) {
        hiderRef.current.set(true);
      }
    }
  };

  const showAllElements = () => {
    if (!hiderRef.current) {
      console.error('Hider component not available');
      return;
    }

    try {
      // Show all elements
      hiderRef.current.set(true);
      console.log('Successfully showing all elements');
      
      // Also ensure visibility panel shows everything if it exists
      if (classifierRef.current) {
        // Reset any classifier-based hiding
        const allFragments = classifierRef.current.find({});
        if (allFragments && Object.keys(allFragments).length > 0) {
          hiderRef.current.set(true, allFragments);
          console.log('Reset classifier-based visibility');
        }
      }
      
    } catch (error) {
      console.error('Error showing all elements:', error);
    }
  };

  const setTopView = () => {
    if (!world?.camera) {return;}

    try {
      const camera = world.camera as OBC.OrthoPerspectiveCamera;
      
      // Set camera to look down from above
      if (camera.controls && typeof camera.controls.setLookAt === 'function') {
        // Position camera high above looking down
        camera.controls.setLookAt(0, 100, 0, 0, 0, 0);
      }
      
      console.log('Set to top view');
    } catch (error) {
      console.error('Error setting top view:', error);
    }
  };

  const fitToView = async () => {
    if (!world?.camera || !components) {return;}

    try {
      const camera = world.camera as OBC.OrthoPerspectiveCamera;
      const threeCamera = camera.three;
      const controls = camera.controls;
      
      if (!world.scene?.three) {return;}

      console.log('Starting fit to view...');

      // Use the exact same approach as the working CameraSection
      // Recursively collect all meshes in the scene
      const allMeshes: THREE.Mesh[] = [];
      
      const collectMeshes = (object: THREE.Object3D) => {
        if ((object as any).isMesh) {
          allMeshes.push(object as THREE.Mesh);
        }
        // Recursively check children
        for (const child of object.children) {
          collectMeshes(child);
        }
      };

      // Start traversal from scene root
      collectMeshes(world.scene.three);

      if (allMeshes.length === 0) {
        console.warn('No meshes found in scene to fit to');
        return;
      }

      // Compute bounding box for all meshes
      const box = new THREE.Box3();
      
      for (const mesh of allMeshes) {
        // Ensure mesh geometry is up to date
        mesh.updateMatrixWorld(true);
        
        // Create a temporary box for this mesh
        const meshBox = new THREE.Box3();
        meshBox.setFromObject(mesh);
        
        // Expand main bounding box
        box.union(meshBox);
      }

      if (box.isEmpty()) {
        console.warn('Bounding box is empty');
        return;
      }

      // Get current camera position and target
      if (!controls) {return;}
      
      // Get current camera direction vector
      const currentCameraPos = new THREE.Vector3();
      const currentTarget = new THREE.Vector3();
      
      if (typeof controls.getPosition === 'function' && typeof controls.getTarget === 'function') {
        controls.getPosition(currentCameraPos);
        controls.getTarget(currentTarget);
      } else {
        // Fallback to three.js camera if control methods not available
        currentCameraPos.copy(threeCamera.position);
        currentTarget.copy(currentTarget.set(0, 0, 0)); // Default target if not available
      }
      
      // Calculate direction vector from camera to target
      const direction = currentTarget.clone().sub(currentCameraPos).normalize();
      
      // Calculate model size and required distance
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      
      console.log('Model bounds:', { center, size, maxDim });

      // Handle fitting differently for perspective vs orthographic cameras
      if (threeCamera.type === 'PerspectiveCamera') {
        // For perspective camera: calculate distance based on FOV
        const perspCamera = threeCamera as THREE.PerspectiveCamera;
        const fov = perspCamera.fov || 50;
        const distance = (maxDim * 1.2) / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
        
        // Position camera at calculated distance in same direction from model center
        const newCameraPos = center.clone().sub(direction.clone().multiplyScalar(distance));
        
        // Set new camera position while keeping the same viewing direction
        if (typeof controls.setLookAt === 'function') {
          await controls.setLookAt(
            newCameraPos.x, newCameraPos.y, newCameraPos.z,
            center.x, center.y, center.z
          );
        } else {
          // Fallback: manually set camera position and look at center
          threeCamera.position.copy(newCameraPos);
          threeCamera.lookAt(center);
          threeCamera.updateProjectionMatrix();
        }
             } else {
         // For orthographic camera: adjust zoom instead of distance - EXACT same as CameraSection
         const orthoCamera = threeCamera as THREE.OrthographicCamera;
         const currentDistance = currentCameraPos.distanceTo(center);
         
         // Use EXACT same calculation as working CameraSection
         const aspect = orthoCamera.right / orthoCamera.top;
         const fitSize = Math.max(maxDim / aspect, maxDim) * 1.2; // Add padding
         
         // Set zoom to fit the model size - EXACT same formula as CameraSection
         const newZoom = 2 / fitSize;
         orthoCamera.zoom = newZoom;
         orthoCamera.updateProjectionMatrix();
         
         // For floor plan mode, position camera above looking down, otherwise keep current direction
         if (isFloorPlanMode) {
           const cameraHeight = center.y + maxDim * 2;
           if (typeof controls.setLookAt === 'function') {
             await controls.setLookAt(
               center.x, cameraHeight, center.z,  // Camera position
               center.x, center.y, center.z       // Look at target
             );
           }
         } else {
           // Keep current viewing direction but look at model center - same as CameraSection
           if (typeof controls.setLookAt === 'function') {
             const newCameraPos = center.clone().sub(direction.clone().multiplyScalar(currentDistance));
             await controls.setLookAt(
               newCameraPos.x, newCameraPos.y, newCameraPos.z,
               center.x, center.y, center.z
             );
           }
         }
         
         console.log('Applied orthographic zoom:', newZoom, 'fitSize:', fitSize, 'aspect:', aspect, 'maxDim:', maxDim);
         console.log('Camera bounds:', {
           left: orthoCamera.left,
           right: orthoCamera.right, 
           top: orthoCamera.top,
           bottom: orthoCamera.bottom
         });
         console.log('Model bounding box check:', { center, size, maxDim });
        
        // Alternative approach if the above doesn't work - direct Three.js method
        if (newZoom < 0.001 || newZoom > 1000) {
          console.warn('Zoom value seems incorrect, trying alternative method...');
          
          // Method 2: Use Three.js Box3 helper methods
          const sphere = new THREE.Sphere();
          box.getBoundingSphere(sphere);
          
          const distance = sphere.radius * 2.5; // Increased multiplier for better view
          const newZoom2 = distance > 0 ? 10 / distance : 1;
          
          orthoCamera.zoom = Math.max(0.1, Math.min(10, newZoom2)); // Clamp zoom
          orthoCamera.updateProjectionMatrix();
          
          console.log('Alternative zoom applied:', orthoCamera.zoom);
        }
      }
      
      console.log('Successfully fitted model to view');
      
    } catch (error) {
      console.error('Error fitting to view:', error);
    }
  };

  // Update UI when state changes
  useEffect(() => {
    updateFloorPlanUI();
  }, [isFloorPlanMode, availableFloors, selectedFloor, isFloorsExpanded]);

  return <div ref={containerRef} className="floor-plan-section" />;
}; 

//end of file
