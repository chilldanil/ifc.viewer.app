import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import { useBIM } from '../../context/BIMContext';
import './ModelTransformSection.css';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

type TransformMode = 'translate' | 'rotate' | 'scale';

export const ModelTransformSection: React.FC = () => {
  const { world, components } = useBIM();
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<TransformMode>('translate');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const attachedModelRef = useRef<any>(null);

  // Reset when world changes
  useEffect(() => {
    deactivate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  const activate = () => {
    if (!world || !world.scene || !world.renderer || !components) {
      console.warn('Cannot activate model transform: world or components not ready');
      return;
    }

    const scene = world.scene.three as THREE.Scene;
    const renderer = (world.renderer as any).three as THREE.WebGLRenderer;
    const camera = (world.camera as any)?.three as THREE.Camera | undefined;

    if (!camera) {
      console.warn('Cannot activate model transform: camera not ready');
      return;
    }

    try {
      const fragmentsManager = components.get(OBC.FragmentsManager);
      if (!fragmentsManager || fragmentsManager.groups.size === 0) {
        console.warn('No models loaded to transform');
        return;
      }

      // Get the first model (or the selected one if we implement selection)
      let targetModel: any = null;

      if (selectedModelId) {
        targetModel = fragmentsManager.groups.get(selectedModelId);
      }

      // If no specific model selected, use the first visible one
      if (!targetModel) {
        for (const [, group] of fragmentsManager.groups) {
          if (group.visible !== false) {
            targetModel = group;
            setSelectedModelId(group.uuid);
            break;
          }
        }
      }

      if (!targetModel) {
        console.warn('No visible models to transform');
        return;
      }

      // Create TransformControls
      if (!transformControlsRef.current) {
        transformControlsRef.current = new TransformControls(camera, renderer.domElement);
      }

      const controls = transformControlsRef.current;

      // Attach to the model
      controls.attach(targetModel);
      controls.mode = mode;
      attachedModelRef.current = targetModel;

      // Add the gizmo (helper Object3D) to the scene if not already present
      const gizmo = controls.getHelper?.() as unknown as THREE.Object3D | undefined;
      if (gizmo && !scene.children.includes(gizmo)) {
        scene.add(gizmo);
      }

      // Update controls when mode changes
      controls.addEventListener('change', () => {
        // Force a render update
        if (world.renderer) {
          (world.renderer as any).update?.();
        }
      });

      // Disable orbit controls while dragging the gizmo
      controls.addEventListener('dragging-changed', (e: any) => {
        const orbit = (world.camera as any)?.controls;
        if (orbit) {
          orbit.enabled = !e.value;
        }
      });

      setActive(true);
      console.log(`Transform controls activated for model: ${targetModel.uuid}`);
    } catch (error) {
      console.error('Error activating transform controls:', error);
    }
  };

  const deactivate = () => {
    if (!active) {
      return;
    }

    if (transformControlsRef.current) {
      try {
        // Detach from any object
        transformControlsRef.current.detach();

        // Remove gizmo from scene
        if (world && world.scene) {
          const scene = world.scene.three as THREE.Scene;
          const gizmo = transformControlsRef.current.getHelper?.() as unknown as THREE.Object3D | undefined;
          if (gizmo) {
            scene.remove(gizmo);
          }
        }

        transformControlsRef.current.dispose();
      } catch (error) {
        console.warn('Error disposing transform controls:', error);
      }
      transformControlsRef.current = null;
    }

    attachedModelRef.current = null;
    setActive(false);
  };

  const changeMode = (newMode: TransformMode) => {
    setMode(newMode);

    if (transformControlsRef.current && active) {
      transformControlsRef.current.mode = newMode;
    }
  };

  const resetTransform = () => {
    if (!attachedModelRef.current) {
      return;
    }

    const model = attachedModelRef.current;

    // Reset position, rotation, and scale
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.scale.set(1, 1, 1);

    // Update matrix
    model.updateMatrix();
    model.updateMatrixWorld(true);

    console.log('Model transform reset to origin');
  };

  // Get list of available models
  const getAvailableModels = (): Array<{ id: string; name: string }> => {
    if (!components) {
      return [];
    }

    try {
      const fragmentsManager = components.get(OBC.FragmentsManager);
      const models: Array<{ id: string; name: string }> = [];

      fragmentsManager.groups.forEach((group) => {
        if (!group) {
          return;
        }

        const metadataName = typeof (group as any)?.ifcMetadata?.name === 'string'
          ? ((group as any).ifcMetadata.name as string).trim()
          : '';
        const explicitName = typeof group.name === 'string' ? group.name.trim() : '';
        const displayName = metadataName || explicitName || group.uuid.substring(0, 8);

        models.push({
          id: group.uuid,
          name: displayName,
        });
      });

      return models;
    } catch (error) {
      console.warn('Error getting available models:', error);
      return [];
    }
  };

  const availableModels = getAvailableModels();

  return (
    <div className="model-transform-controls">
      <div className="model-transform-info">
        Transform and manipulate loaded IFC models in 3D space
      </div>

      {availableModels.length > 0 && (
        <div className="model-select-container">
          <label htmlFor="model-select">Model:</label>
          <select
            id="model-select"
            value={selectedModelId || ''}
            onChange={(e) => setSelectedModelId(e.target.value)}
            disabled={active}
          >
            <option value="">Auto-select first model</option>
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="transform-mode-buttons">
        <button
          onClick={() => changeMode('translate')}
          disabled={!active}
          className={mode === 'translate' ? 'selected' : ''}
        >
          Move
        </button>
        <button
          onClick={() => changeMode('rotate')}
          disabled={!active}
          className={mode === 'rotate' ? 'selected' : ''}
        >
          Rotate
        </button>
        <button
          onClick={() => changeMode('scale')}
          disabled={!active}
          className={mode === 'scale' ? 'selected' : ''}
        >
          Scale
        </button>
      </div>

      <button
        onClick={active ? deactivate : activate}
        disabled={!world || availableModels.length === 0}
        className="primary"
      >
        {active ? 'Disable' : 'Enable'} Transform
      </button>

      {active && (
        <button onClick={resetTransform} className="reset-button">
          Reset to Origin
        </button>
      )}

      {availableModels.length === 0 && (
        <div className="no-models-warning">
          No models loaded. Load an IFC file first.
        </div>
      )}
    </div>
  );
};
