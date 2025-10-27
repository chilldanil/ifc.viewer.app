import { useEffect, useRef, useState } from 'react';
import { useBIM } from '../../context/BIMContext';
import * as THREE from 'three';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentMode, setCurrentMode] = useState<RenderMode>('shaded');
  const [ghostOpacity, setGhostOpacity] = useState<number>(0.3);

  // Store original materials for restoration
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
    if (!world?.scene?.three) {return;}

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
    updateUI();
  };

  const updateUI = () => {
    if (!containerRef.current) {return;}

    containerRef.current.innerHTML = `
      <style>
        .render-mode-controls {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .render-mode-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.5rem;
        }
        .render-mode-btn {
          padding: 0.5rem;
          background: var(--bim-ui_bg-contrast-20);
          border: 1px solid var(--bim-ui_bg-contrast-40);
          color: var(--bim-ui_main-contrast);
          cursor: pointer;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          transition: all 0.2s;
          text-align: center;
        }
        .render-mode-btn:hover {
          background: var(--bim-ui_bg-contrast-30);
          border-color: var(--bim-ui_accent-base);
        }
        .render-mode-btn.active {
          background: var(--bim-ui_accent-base);
          border-color: var(--bim-ui_accent-base);
          color: white;
        }
        .render-mode-description {
          padding: 0.5rem;
          background: var(--bim-ui_bg-contrast-10);
          border-radius: 0.25rem;
          font-size: 0.85rem;
          color: var(--bim-ui_main-contrast);
        }
        .render-mode-settings {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .render-mode-settings bim-label {
          font-size: 0.875rem;
        }
      </style>

      <div class="render-mode-controls">
        <div class="render-mode-grid">
          ${(Object.keys(renderModes) as RenderMode[]).map(mode => `
            <div class="render-mode-btn ${currentMode === mode ? 'active' : ''}" data-mode="${mode}">
              ${renderModes[mode].name}
            </div>
          `).join('')}
        </div>

        <div class="render-mode-description">
          <strong>${renderModes[currentMode].name}:</strong> ${renderModes[currentMode].description}
        </div>
        <bim-button label="Reset to Shaded" name="resetBtn"></bim-button>
      </div>
    `;

    setupEventListeners();
  };

  const setupEventListeners = () => {
    if (!containerRef.current) {return;}

    // Mode buttons
    const modeButtons = containerRef.current.querySelectorAll('.render-mode-btn');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode as RenderMode;
        handleModeChange(mode);
      });
    });

    // Ghost opacity
    const ghostOpacityInput = containerRef.current.querySelector('bim-number-input[name="ghostOpacity"]') as any;
    if (ghostOpacityInput) {
      ghostOpacityInput.addEventListener('input', (e: any) => {
        const newOpacity = parseFloat(e.target.value);
        setGhostOpacity(newOpacity);
      });
    }

    // Reset button
    const resetBtn = containerRef.current.querySelector('bim-button[name="resetBtn"]') as any;
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        handleModeChange('shaded');
      });
    }
  };

  // Initial UI setup
  useEffect(() => {
    updateUI();
  }, []);

  // Update UI when mode or settings change
  useEffect(() => {
    updateUI();
  }, [currentMode]);

  // Re-apply mode when settings change
  useEffect(() => {
    if (currentMode === 'ghost') {
      applyRenderMode(currentMode);
    }
  }, [ghostOpacity]);

  return (
    <bim-panel-section label="Render Modes" collapsed>
      <div ref={containerRef}></div>
    </bim-panel-section>
  );
};
