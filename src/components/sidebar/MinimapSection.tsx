import React, { useEffect, useRef } from 'react';
import * as BUI from '@thatopen/ui';
import { MinimapConfig } from '../bim/Minimap';
import './MinimapSection.css';
import { ensureBUIInitialised } from '../../utils/bui';

interface MinimapSectionProps {
  config: MinimapConfig;
  onConfigChange: (config: Partial<MinimapConfig>) => void;
}

export const MinimapSection: React.FC<MinimapSectionProps> = ({ config, onConfigChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) {return;}

    ensureBUIInitialised();

    // Create each control individually and append to container
    const container = containerRef.current;
    container.innerHTML = '';

    const createCheckbox = (label: string, checked: boolean, onChange: (value: boolean) => void) => {
      const checkbox = BUI.Component.create<BUI.Checkbox>(() => {
        return BUI.html`
          <bim-checkbox 
            checked="${checked}" 
            label="${label}" 
            @change="${({ target }: { target: BUI.Checkbox }) => onChange(target.value)}">
          </bim-checkbox>
        `;
      });
      return checkbox;
    };

    const createSlider = (label: string, value: number, min: number, max: number, step: number, onChange: (value: number) => void) => {
      const slider = BUI.Component.create<BUI.NumberInput>(() => {
        return BUI.html`
          <bim-number-input 
            slider 
            label="${label}" 
            value="${value}" 
            min="${min}" 
            max="${max}" 
            step="${step}" 
            @change="${({ target }: { target: BUI.NumberInput }) => onChange(target.value)}">
          </bim-number-input>
        `;
      });
      return slider;
    };

    const enabledCheckbox = createCheckbox('Enabled', config.enabled, (value) => onConfigChange({ enabled: value }));
    const visibleCheckbox = createCheckbox('Visible', config.visible, (value) => onConfigChange({ visible: value }));
    const lockRotationCheckbox = createCheckbox('Lock rotation', config.lockRotation, (value) => onConfigChange({ lockRotation: value }));
    const zoomSlider = createSlider('Zoom', config.zoom, 0.01, 0.5, 0.01, (value) => onConfigChange({ zoom: value }));
    const frontOffsetSlider = createSlider('Front offset', config.frontOffset, 0, 5, 1, (value) => onConfigChange({ frontOffset: value }));

    const sizeContainer = document.createElement('div');
    sizeContainer.style.display = 'flex';
    sizeContainer.style.gap = '12px';
    sizeContainer.style.marginTop = '12px';

    const widthSlider = createSlider('Width', config.sizeX, 100, 500, 10, (value) => onConfigChange({ sizeX: value }));
    const heightSlider = createSlider('Height', config.sizeY, 100, 500, 10, (value) => onConfigChange({ sizeY: value }));

    widthSlider.setAttribute('pref', 'Width');
    heightSlider.setAttribute('pref', 'Height');

    sizeContainer.appendChild(widthSlider);
    sizeContainer.appendChild(heightSlider);

    container.appendChild(enabledCheckbox);
    container.appendChild(visibleCheckbox);
    container.appendChild(lockRotationCheckbox);
    container.appendChild(zoomSlider);
    container.appendChild(frontOffsetSlider);
    container.appendChild(sizeContainer);

    const stopAllPropagation = (e: Event) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    container.addEventListener('click', stopAllPropagation, true);
    container.addEventListener('mousedown', stopAllPropagation, true);
    container.addEventListener('mouseup', stopAllPropagation, true);
    container.addEventListener('change', stopAllPropagation, true);
    container.addEventListener('input', stopAllPropagation, true);

    return () => {
      container.removeEventListener('click', stopAllPropagation, true);
      container.removeEventListener('mousedown', stopAllPropagation, true);
      container.removeEventListener('mouseup', stopAllPropagation, true);
      container.removeEventListener('change', stopAllPropagation, true);
      container.removeEventListener('input', stopAllPropagation, true);
    };
  }, [config, onConfigChange]);

  return <div ref={containerRef} className="minimap-section minimap-controls-container" />;
};