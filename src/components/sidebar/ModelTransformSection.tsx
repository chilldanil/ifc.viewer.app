import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import { useBIM } from '../../context/BIMContext';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Button, ButtonGroup, Select, Stack, Text, Status } from '../../ui';

type TransformMode = 'translate' | 'rotate' | 'scale';

export const ModelTransformSection: React.FC = () => {
  const { world, components } = useBIM();
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<TransformMode>('translate');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const attachedModelRef = useRef<any>(null);

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

      let targetModel: any = null;

      if (selectedModelId) {
        targetModel = fragmentsManager.groups.get(selectedModelId);
      }

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

      if (!transformControlsRef.current) {
        transformControlsRef.current = new TransformControls(camera, renderer.domElement);
      }

      const controls = transformControlsRef.current;
      controls.attach(targetModel);
      (controls as any).setMode?.(mode) || ((controls as any).mode = mode);
      attachedModelRef.current = targetModel;

      const gizmo = controls.getHelper?.() as unknown as THREE.Object3D | undefined;
      if (gizmo && !scene.children.includes(gizmo)) {
        scene.add(gizmo);
      }

      controls.addEventListener('change', () => {
        if (world.renderer) {
          (world.renderer as any).update?.();
        }
      });

      controls.addEventListener('dragging-changed', (e: any) => {
        const orbit = (world.camera as any)?.controls;
        if (orbit) {
          orbit.enabled = !e.value;
        }
      });

      setActive(true);
    } catch (error) {
      console.error('Error activating transform controls:', error);
    }
  };

  const deactivate = () => {
    if (!active) return;

    if (transformControlsRef.current) {
      try {
        transformControlsRef.current.detach();
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
      const controls = transformControlsRef.current as any;
      controls.setMode?.(newMode) || (controls.mode = newMode);
    }
  };

  const resetTransform = () => {
    if (!attachedModelRef.current) return;

    const model = attachedModelRef.current;
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.scale.set(1, 1, 1);
    model.updateMatrix();
    model.updateMatrixWorld(true);
  };

  const getAvailableModels = (): Array<{ id: string; name: string }> => {
    if (!components) return [];

    try {
      const fragmentsManager = components.get(OBC.FragmentsManager);
      const models: Array<{ id: string; name: string }> = [];

      fragmentsManager.groups.forEach((group) => {
        if (!group) return;
        const metadataName = typeof (group as any)?.ifcMetadata?.name === 'string'
          ? ((group as any).ifcMetadata.name as string).trim()
          : '';
        const explicitName = typeof group.name === 'string' ? group.name.trim() : '';
        const displayName = metadataName || explicitName || group.uuid.substring(0, 8);

        models.push({ id: group.uuid, name: displayName });
      });

      return models;
    } catch (error) {
      return [];
    }
  };

  const availableModels = getAvailableModels();

  return (
    <Stack gap="sm">
      <Text variant="muted" size="sm">
        Transform and manipulate loaded IFC models in 3D space
      </Text>

      {availableModels.length > 0 && (
        <Select
          label="Model"
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
        </Select>
      )}

      <ButtonGroup stretch>
        <Button
          size="sm"
          selected={mode === 'translate'}
          onClick={() => changeMode('translate')}
          disabled={!active}
        >
          Move
        </Button>
        <Button
          size="sm"
          selected={mode === 'rotate'}
          onClick={() => changeMode('rotate')}
          disabled={!active}
        >
          Rotate
        </Button>
        <Button
          size="sm"
          selected={mode === 'scale'}
          onClick={() => changeMode('scale')}
          disabled={!active}
        >
          Scale
        </Button>
      </ButtonGroup>

      <Button
        variant="primary"
        onClick={active ? deactivate : activate}
        disabled={!world || availableModels.length === 0}
      >
        {active ? 'Disable' : 'Enable'} Transform
      </Button>

      {active && (
        <Button variant="danger" onClick={resetTransform}>
          Reset to Origin
        </Button>
      )}

      {availableModels.length === 0 && (
        <Status variant="warning">
          No models loaded. Load an IFC file first.
        </Status>
      )}
    </Stack>
  );
};
