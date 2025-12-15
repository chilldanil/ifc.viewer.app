import React, { useRef, useState, useEffect } from 'react';
import { useBIM } from '../../context/BIMContext';
import * as THREE from 'three';
import { Button, ButtonGroup, Stack, Text, Card } from '../../ui';

export type RenderMode = 'shaded' | 'wireframe' | 'ghost';

interface RenderModeConfig {
  name: string;
  description: string;
}

const renderModes: Record<RenderMode, RenderModeConfig> = {
  shaded: {
    name: 'Shaded',
    description: 'Standard solid rendering with materials'
  },
  wireframe: {
    name: 'Wireframe',
    description: 'Display edges only'
  },
  ghost: {
    name: 'Ghost',
    description: 'Semi-transparent view'
  }
};

export const RenderModeSection: React.FC = () => {
  const { world } = useBIM();
  const [currentMode, setCurrentMode] = useState<RenderMode>('shaded');
  const [ghostOpacity] = useState<number>(0.3);

  const originalMaterials = useRef(new Map<THREE.Material, {
    wireframe: boolean;
    transparent: boolean;
    opacity: number;
    color?: THREE.Color;
    depthWrite: boolean;
  }>());

  const storeOriginalMaterial = (material: THREE.Material) => {
    if (!originalMaterials.current.has(material)) {
      const mat = material as THREE.MeshStandardMaterial;
      originalMaterials.current.set(material, {
        wireframe: mat.wireframe || false,
        transparent: mat.transparent || false,
        opacity: mat.opacity !== undefined ? mat.opacity : 1,
        color: mat.color ? mat.color.clone() : undefined,
        depthWrite: mat.depthWrite !== undefined ? mat.depthWrite : true
      });
    }
  };

  const restoreOriginalMaterial = (material: THREE.Material) => {
    const original = originalMaterials.current.get(material);
    if (original) {
      const mat = material as THREE.MeshStandardMaterial;
      mat.wireframe = original.wireframe;
      mat.transparent = original.transparent;
      mat.opacity = original.opacity;
      if (original.color && mat.color) {
        mat.color.copy(original.color);
      }
      mat.depthWrite = original.depthWrite;
      mat.needsUpdate = true;
    }
  };

  const applyRenderMode = (mode: RenderMode) => {
    if (!world?.scene?.three) return;

    const scene = world.scene.three;

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const material = object.material;
        const materials = Array.isArray(material) ? material : [material];

        materials.forEach((mat) => {
          storeOriginalMaterial(mat);

          const m = mat as THREE.MeshStandardMaterial;

          switch (mode) {
            case 'shaded':
              restoreOriginalMaterial(mat);
              break;

            case 'wireframe':
              m.wireframe = true;
              m.transparent = false;
              m.opacity = 1;
              m.depthWrite = true;
              m.needsUpdate = true;
              break;

            case 'ghost':
              m.wireframe = false;
              m.transparent = true;
              m.opacity = ghostOpacity;
              m.depthWrite = false;
              m.needsUpdate = true;
              break;
          }
        });
      }
    });
  };

  const handleModeChange = (mode: RenderMode) => {
    setCurrentMode(mode);
    applyRenderMode(mode);
  };

  useEffect(() => {
    if (currentMode === 'ghost') {
      applyRenderMode(currentMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghostOpacity]);

  return (
    <bim-panel-section label="Render Modes" collapsed>
      <Stack gap="sm">
        <ButtonGroup stretch>
          {(Object.keys(renderModes) as RenderMode[]).map((mode) => (
            <Button
              key={mode}
              size="sm"
              selected={currentMode === mode}
              onClick={() => handleModeChange(mode)}
            >
              {renderModes[mode].name}
            </Button>
          ))}
        </ButtonGroup>

        <Card>
          <Text size="sm">
            <strong>{renderModes[currentMode].name}:</strong>{' '}
            {renderModes[currentMode].description}
          </Text>
        </Card>

        <Button onClick={() => handleModeChange('shaded')}>
          Reset to Shaded
        </Button>
      </Stack>
    </bim-panel-section>
  );
};
