import React from 'react';
import { MinimapConfig } from '../bim/Minimap';
import { Toggle, Slider, Stack, Row } from '../../ui';

interface MinimapSectionProps {
  config: MinimapConfig;
  onConfigChange: (config: Partial<MinimapConfig>) => void;
}

export const MinimapSection: React.FC<MinimapSectionProps> = ({ config, onConfigChange }) => {
  return (
    <Stack gap="sm">
      <Toggle
        checked={config.enabled}
        onChange={(value) => onConfigChange({ enabled: value })}
        label="Enabled"
      />

      <Toggle
        checked={config.visible}
        onChange={(value) => onConfigChange({ visible: value })}
        label="Visible"
      />

      <Toggle
        checked={config.lockRotation}
        onChange={(value) => onConfigChange({ lockRotation: value })}
        label="Lock rotation"
      />

      <Slider
        label="Zoom"
        value={config.zoom}
        min={0.01}
        max={0.5}
        step={0.01}
        onChange={(e) => onConfigChange({ zoom: parseFloat(e.target.value) })}
        formatValue={(v) => v.toFixed(2)}
      />

      <Slider
        label="Front Offset"
        value={config.frontOffset}
        min={0}
        max={5}
        step={1}
        onChange={(e) => onConfigChange({ frontOffset: parseFloat(e.target.value) })}
      />

      <Row stretch>
        <Slider
          label="Width"
          value={config.sizeX}
          min={100}
          max={500}
          step={10}
          onChange={(e) => onConfigChange({ sizeX: parseFloat(e.target.value) })}
        />
        <Slider
          label="Height"
          value={config.sizeY}
          min={100}
          max={500}
          step={10}
          onChange={(e) => onConfigChange({ sizeY: parseFloat(e.target.value) })}
        />
      </Row>
    </Stack>
  );
};
