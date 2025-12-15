import React, { useEffect, useRef, useState } from 'react';
import * as OBCF from '@thatopen/components-front';
import { useBIM } from '../../context/BIMContext';
import { Button, Stack, Text, Card } from '../../ui';

export const LengthMeasurement: React.FC = () => {
  const { components, world } = useBIM();
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentLength, setCurrentLength] = useState<number | null>(null);
  const lengthMeasurementRef = useRef<OBCF.LengthMeasurement | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);

  useEffect(() => {
    if (!components || !world) return;

    const lengthDimensions = components.get(OBCF.LengthMeasurement);
    lengthDimensions.world = world;

    const highlighter = components.get(OBCF.Highlighter);

    lengthMeasurementRef.current = lengthDimensions;
    highlighterRef.current = highlighter;

    lengthDimensions.onAfterUpdate.add(() => {
      const last = lengthDimensions.list[lengthDimensions.list.length - 1];
      if (last) {
        const lengthValue = (last as any).length || (last as any).value || 0;
        setCurrentLength(lengthValue);
      }
    });

    return () => {
      if (lengthDimensions) {
        lengthDimensions.enabled = false;
        lengthDimensions.delete();
      }
    };
  }, [components, world]);

  const handleToggle = () => {
    if (!lengthMeasurementRef.current || !highlighterRef.current) return;

    const lengthDimensions = lengthMeasurementRef.current;
    const highlighter = highlighterRef.current;
    const newEnabled = !isEnabled;

    setIsEnabled(newEnabled);

    if (newEnabled) {
      highlighter.enabled = false;
      lengthDimensions.enabled = true;
      lengthDimensions.visible = true;
      lengthDimensions.snapDistance = 1;
    } else {
      lengthDimensions.deleteAll();
      lengthDimensions.enabled = false;
      highlighter.enabled = true;
      setCurrentLength(null);
    }
  };

  const handleClearAll = () => {
    if (!lengthMeasurementRef.current || !highlighterRef.current) return;

    lengthMeasurementRef.current.delete();
    highlighterRef.current.clear();
    setCurrentLength(null);
  };

  return (
    <Stack gap="sm">
      <Button
        variant={isEnabled ? 'danger' : 'primary'}
        onClick={handleToggle}
        disabled={!components || !world}
      >
        {isEnabled ? 'Disable' : 'Enable'} Length Measurement
      </Button>

      <Card>
        <Text variant="muted" size="sm">
          <strong>Instructions:</strong>
        </Text>
        <Text variant="subtle" size="xs" style={{ marginTop: '4px' }}>
          - Enable the tool first<br />
          - Double-click on the 3D viewport to create measurements<br />
          - Click on elements to measure their length<br />
          - Press Delete/Backspace to remove the last measurement
        </Text>
      </Card>

      <Card>
        <Text size="sm" variant={currentLength !== null ? 'default' : 'subtle'}>
          {currentLength !== null
            ? `Length: ${currentLength.toFixed(3)} m`
            : 'No element selected'}
        </Text>
      </Card>

      <Button onClick={handleClearAll} disabled={!isEnabled}>
        Clear All Measurements
      </Button>
    </Stack>
  );
};
