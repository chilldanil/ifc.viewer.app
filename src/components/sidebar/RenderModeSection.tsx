import React, { useState, useEffect } from 'react';
import { useBIM } from '../../context/BIMContext';
import { Button, ButtonGroup, Stack, Text, Card } from '../../ui';
import {
  applyRenderModeToWorld,
  getCurrentRenderMode,
  renderModes,
  type RenderMode,
} from '../../utils/renderModeUtils';

export const RenderModeSection: React.FC = () => {
  const { world } = useBIM();
  const [currentMode, setCurrentMode] = useState<RenderMode>('shaded');
  const ghostOpacity = 0.3;

  const handleModeChange = (mode: RenderMode) => {
    setCurrentMode(mode);
    applyRenderModeToWorld(world, mode, { ghostOpacity });
  };

  useEffect(() => {
    if (!world) {
      setCurrentMode('shaded');
      return;
    }

    const mode = getCurrentRenderMode(world);
    setCurrentMode(mode);
    if (mode !== 'shaded') {
      applyRenderModeToWorld(world, mode, { ghostOpacity });
    }
  }, [world]);

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
