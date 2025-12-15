import React, { useEffect, useRef, useState } from 'react';
import * as OBC from '@thatopen/components';
import * as THREE from 'three';
import { useBIM } from '../../context/BIMContext';
import { Button, Stack, Text, Card, Status } from '../../ui';
import './FloorPlanSection.css';

interface FloorInfo {
  name: string;
  id: string;
  elevation?: number;
}

export const FloorPlanSection: React.FC = () => {
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
    if (!components || !world) {return;}

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
      }, 1500);
    };

    fragmentsManager.onFragmentsLoaded.add(handleModelLoaded);

    // Cleanup
    return () => {
      fragmentsManager.onFragmentsLoaded.remove(handleModelLoaded);
    };
  }, [components, world]);

  const extractFloorInformation = (_model: any, classifier: OBC.Classifier) => {
    try {
      console.log('Starting floor extraction...');

      if (classifier.list?.spatialStructures) {
        const floors: FloorInfo[] = [];
        const structures = classifier.list.spatialStructures;

        Object.entries(structures).forEach(([name, structure]: [string, any]) => {
          if (structure && typeof structure === 'object' && structure.id !== null && structure.id !== undefined) {
            let elevation = structure.elevation;
            if (!elevation && structure.properties) {
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
          }
        });

        floors.sort((a, b) => (a.elevation || 0) - (b.elevation || 0));
        setAvailableFloors(floors);
      } else if (classifier.list?.entities) {
        const floors: FloorInfo[] = [];
        const entities = classifier.list.entities;

        Object.entries(entities).forEach(([entityName]: [string, any]) => {
          if (entityName.toLowerCase().includes('storey') ||
              entityName.toLowerCase().includes('floor') ||
              entityName.includes('IFCBUILDINGSTOREY')) {
            floors.push({
              name: entityName,
              id: entityName,
              elevation: undefined
            });
          }
        });

        if (floors.length > 0) {
          setAvailableFloors(floors);
        }
      }
    } catch (error) {
      console.error('Error extracting floor information:', error);
    }
  };

  const enterFloorPlanMode = () => {
    if (!world?.camera) {return;}

    try {
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

      camera.projection.set("Orthographic");

      if (camera.three instanceof THREE.OrthographicCamera) {
        const orthoCamera = camera.three as THREE.OrthographicCamera;
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 50;

        orthoCamera.left = -frustumSize * aspect / 2;
        orthoCamera.right = frustumSize * aspect / 2;
        orthoCamera.top = frustumSize / 2;
        orthoCamera.bottom = -frustumSize / 2;
        orthoCamera.zoom = 1;
        orthoCamera.near = 0.1;
        orthoCamera.far = 2000;
        orthoCamera.updateProjectionMatrix();
      }

      console.log('Entered floor plan mode');
    } catch (error) {
      console.error('Error entering floor plan mode:', error);
    }
  };

  const exitFloorPlanMode = () => {
    if (!world?.camera) {return;}

    try {
      if (savedCameraState) {
        const camera = world.camera as OBC.OrthoPerspectiveCamera;

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

        if (!savedCameraState.isOrthographic) {
          camera.projection.set("Perspective");
        }
      }

      showAllElements();
      setSelectedFloor(null);

      console.log('Exited floor plan mode');
    } catch (error) {
      console.error('Error exiting floor plan mode:', error);
    }
  };

  const tryAlternativeFloorFiltering = (floorName: string) => {
    if (!classifierRef.current || !hiderRef.current) {
      hiderRef.current?.set(true);
      return;
    }

    try {
      const classifier = classifierRef.current;
      const hider = hiderRef.current;

      const entities = classifier.list?.entities;
      if (entities) {
        const potentialMatches = Object.keys(entities).filter(entityName =>
          entityName.toLowerCase().includes(floorName.toLowerCase()) ||
          entityName.toLowerCase().includes('storey') ||
          entityName.toLowerCase().includes('floor')
        );

        if (potentialMatches.length > 0) {
          const entityName = potentialMatches[0];
          const found = classifier.find({ entities: [entityName] });

          if (found && Object.keys(found).length > 0) {
            hider.set(false);
            hider.set(true, found);
            return;
          }
        }
      }

      hider.set(true);

    } catch (error) {
      console.error('Error in alternative filtering:', error);
      hiderRef.current?.set(true);
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

      hider.set(true);

      const structures = classifier.list?.spatialStructures;
      if (!structures) {
        console.error('No spatial structures available');
        return;
      }

      const floorStructure = Object.values(structures).find((structure: any) =>
        structure && structure.id && structure.id.toString() === floorId
      );

      if (floorStructure && floorStructure.id !== null) {
        const foundIDs = indexer.getEntityChildren(model, floorStructure.id);

        if (foundIDs.size === 0) {
          tryAlternativeFloorFiltering(floorName);
          return;
        }

        const fragMap = model.getFragmentMap(foundIDs);

        if (!fragMap || Object.keys(fragMap).length === 0) {
          tryAlternativeFloorFiltering(floorName);
          return;
        }

        hider.set(false);
        hider.set(true, fragMap);

        console.log(`Successfully showing floor: ${floorName} (${foundIDs.size} elements)`);
      } else {
        tryAlternativeFloorFiltering(floorName);
      }
    } catch (error) {
      console.error('Error showing floor:', error);
      hiderRef.current?.set(true);
    }
  };

  const showAllElements = () => {
    if (!hiderRef.current) {
      console.error('Hider component not available');
      return;
    }

    try {
      hiderRef.current.set(true);

      if (classifierRef.current) {
        const allFragments = classifierRef.current.find({});
        if (allFragments && Object.keys(allFragments).length > 0) {
          hiderRef.current.set(true, allFragments);
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

      if (camera.controls && typeof camera.controls.setLookAt === 'function') {
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

      const allMeshes: THREE.Mesh[] = [];

      const collectMeshes = (object: THREE.Object3D) => {
        if ((object as any).isMesh) {
          allMeshes.push(object as THREE.Mesh);
        }
        for (const child of object.children) {
          collectMeshes(child);
        }
      };

      collectMeshes(world.scene.three);

      if (allMeshes.length === 0) {
        console.warn('No meshes found in scene to fit to');
        return;
      }

      const box = new THREE.Box3();

      for (const mesh of allMeshes) {
        mesh.updateMatrixWorld(true);
        const meshBox = new THREE.Box3();
        meshBox.setFromObject(mesh);
        box.union(meshBox);
      }

      if (box.isEmpty()) {
        console.warn('Bounding box is empty');
        return;
      }

      if (!controls) {return;}

      const currentCameraPos = new THREE.Vector3();
      const currentTarget = new THREE.Vector3();

      if (typeof controls.getPosition === 'function' && typeof controls.getTarget === 'function') {
        controls.getPosition(currentCameraPos);
        controls.getTarget(currentTarget);
      } else {
        currentCameraPos.copy(threeCamera.position);
        currentTarget.set(0, 0, 0);
      }

      const direction = currentTarget.clone().sub(currentCameraPos).normalize();

      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      if (threeCamera.type === 'PerspectiveCamera') {
        const perspCamera = threeCamera as THREE.PerspectiveCamera;
        const fov = perspCamera.fov || 50;
        const distance = (maxDim * 1.2) / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));

        const newCameraPos = center.clone().sub(direction.clone().multiplyScalar(distance));

        if (typeof controls.setLookAt === 'function') {
          await controls.setLookAt(
            newCameraPos.x, newCameraPos.y, newCameraPos.z,
            center.x, center.y, center.z
          );
        } else {
          threeCamera.position.copy(newCameraPos);
          threeCamera.lookAt(center);
          threeCamera.updateProjectionMatrix();
        }
      } else {
        const orthoCamera = threeCamera as THREE.OrthographicCamera;
        const currentDistance = currentCameraPos.distanceTo(center);

        const aspect = orthoCamera.right / orthoCamera.top;
        const fitSize = Math.max(maxDim / aspect, maxDim) * 1.2;

        const newZoom = 2 / fitSize;
        orthoCamera.zoom = newZoom;
        orthoCamera.updateProjectionMatrix();

        if (isFloorPlanMode) {
          const cameraHeight = center.y + maxDim * 2;
          if (typeof controls.setLookAt === 'function') {
            await controls.setLookAt(
              center.x, cameraHeight, center.z,
              center.x, center.y, center.z
            );
          }
        } else {
          if (typeof controls.setLookAt === 'function') {
            const newCameraPos = center.clone().sub(direction.clone().multiplyScalar(currentDistance));
            await controls.setLookAt(
              newCameraPos.x, newCameraPos.y, newCameraPos.z,
              center.x, center.y, center.z
            );
          }
        }

        if (newZoom < 0.001 || newZoom > 1000) {
          const sphere = new THREE.Sphere();
          box.getBoundingSphere(sphere);

          const distance = sphere.radius * 2.5;
          const newZoom2 = distance > 0 ? 10 / distance : 1;

          orthoCamera.zoom = Math.max(0.1, Math.min(10, newZoom2));
          orthoCamera.updateProjectionMatrix();
        }
      }

      console.log('Successfully fitted model to view');

    } catch (error) {
      console.error('Error fitting to view:', error);
    }
  };

  const handleToggleFloorPlan = () => {
    const newMode = !isFloorPlanMode;
    setIsFloorPlanMode(newMode);

    if (newMode) {
      enterFloorPlanMode();
    } else {
      exitFloorPlanMode();
    }
  };

  const handleSelectFloor = (floor: FloorInfo) => {
    setSelectedFloor(floor.id);
    showOnlyFloor(floor.id, floor.name);
  };

  const handleResetAll = () => {
    showAllElements();
    setSelectedFloor(null);

    if (hiderRef.current) {
      setTimeout(() => {
        hiderRef.current?.set(true);
      }, 100);
    }
  };

  const selectedFloorName = availableFloors.find(f => f.id === selectedFloor)?.name;

  return (
    <Stack gap="sm" className="floor-plan-section">
      <Button
        variant={isFloorPlanMode ? 'danger' : 'primary'}
        onClick={handleToggleFloorPlan}
        block
      >
        {isFloorPlanMode ? 'Exit Floor Plan' : 'Enter Floor Plan'}
      </Button>

      {isFloorPlanMode && (
        <>
          {/* Floors Accordion */}
          <Card className="floor-accordion">
            <div
              className="floor-accordion-header"
              onClick={() => setIsFloorsExpanded(!isFloorsExpanded)}
            >
              <Text size="sm"><strong>Floors</strong></Text>
              <span className={`floor-arrow ${isFloorsExpanded ? 'floor-arrow--expanded' : ''}`}>
                ▼
              </span>
            </div>

            {isFloorsExpanded && (
              <div className="floor-accordion-content">
                {availableFloors.map(floor => (
                  <div
                    key={floor.id}
                    className={`floor-option ${selectedFloor === floor.id ? 'floor-option--active' : ''}`}
                    onClick={() => handleSelectFloor(floor)}
                  >
                    {floor.name}
                    {floor.elevation && floor.elevation !== 0 && (
                      <span className="floor-elevation"> ({floor.elevation.toFixed(1)}m)</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {selectedFloorName && (
            <Status variant="info">
              <strong>Active Floor:</strong> {selectedFloorName}
            </Status>
          )}

          <Button onClick={handleResetAll} block>
            Reset & Show All
          </Button>

          <Stack gap="sm">
            <Button onClick={setTopView} block>
              Top View
            </Button>
            <Button onClick={fitToView} block>
              Fit to View
            </Button>
          </Stack>
        </>
      )}

      <Card>
        <Text variant="muted" size="xs">
          {availableFloors.length > 0 ? (
            <>
              Found {availableFloors.length} floor(s) in the model.
              <br /><br />
              <strong>How to use:</strong><br />
              1. Click "Enter Floor Plan" to start<br />
              2. Select a floor to view only its elements<br />
              3. Use "Top View" for floor plan perspective<br />
              4. Click "Exit Floor Plan" to return to 3D view
            </>
          ) : (
            'No floors detected. Load an IFC model to see available floors.'
          )}
        </Text>
      </Card>
    </Stack>
  );
};
