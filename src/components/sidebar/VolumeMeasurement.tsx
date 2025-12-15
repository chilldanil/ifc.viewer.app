import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as OBCF from '@thatopen/components-front';
import { useBIM } from '../../context/BIMContext';
import { Button, Stack, Text, Card } from '../../ui';

export const VolumeMeasurement: React.FC = () => {
  const { components, world } = useBIM();
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentVolume, setCurrentVolume] = useState<number | null>(null);
  const volumeMeasurementRef = useRef<OBCF.VolumeMeasurement | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);

  const handleHighlight = useCallback((event: any) => {
    if (!volumeMeasurementRef.current) return;

    try {
      const volume = volumeMeasurementRef.current.getVolumeFromFragments(event);
      setCurrentVolume(volume);
    } catch (error) {
      console.warn('Error calculating volume:', error);
      setCurrentVolume(null);
    }
  }, []);

  const handleClear = useCallback(() => {
    if (volumeMeasurementRef.current) {
      volumeMeasurementRef.current.clear();
    }
    setCurrentVolume(null);
  }, []);

  useEffect(() => {
    if (!components || !world) return;

    const dimensions = components.get(OBCF.VolumeMeasurement);
    volumeMeasurementRef.current = dimensions;
    dimensions.world = world;

    const highlighter = components.get(OBCF.Highlighter);
    highlighterRef.current = highlighter;

    if (highlighter.events?.select?.onHighlight) {
      highlighter.events.select.onHighlight.add(handleHighlight);
    }

    if (highlighter.events?.select?.onClear) {
      highlighter.events.select.onClear.add(handleClear);
    }

    return () => {
      if (highlighter.events?.select?.onHighlight) {
        highlighter.events.select.onHighlight.remove(handleHighlight);
      }
      if (highlighter.events?.select?.onClear) {
        highlighter.events.select.onClear.remove(handleClear);
      }

      if (dimensions) {
        dimensions.enabled = false;
        dimensions.clear();
      }
    };
  }, [components, world, handleHighlight, handleClear]);

  const handleToggle = () => {
    if (!volumeMeasurementRef.current) return;

    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    volumeMeasurementRef.current.enabled = newEnabled;

    if (!newEnabled) {
      volumeMeasurementRef.current.clear();
      setCurrentVolume(null);
    }
  };

  const handleClearAll = () => {
    if (!volumeMeasurementRef.current || !highlighterRef.current) return;

    volumeMeasurementRef.current.clear();
    highlighterRef.current.clear();
    setCurrentVolume(null);
  };

  return (
    <Stack gap="sm">
      <Button
        variant={isEnabled ? 'danger' : 'primary'}
        onClick={handleToggle}
        disabled={!components || !world}
      >
        {isEnabled ? 'Disable' : 'Enable'} Volume Measurement
      </Button>

      <Card>
        <Text variant="muted" size="sm">
          <strong>Instructions:</strong>
        </Text>
        <Text variant="subtle" size="xs" style={{ marginTop: '4px' }}>
          - Left click on an element to measure its volume
        </Text>
      </Card>

      <Card>
        <Text size="sm" variant={currentVolume !== null ? 'default' : 'subtle'}>
          {currentVolume !== null
            ? `Volume: ${currentVolume.toFixed(3)} m³`
            : 'No element selected'}
        </Text>
      </Card>

      <Button onClick={handleClearAll} disabled={!isEnabled}>
        Clear All Measurements
      </Button>
    </Stack>
  );
};
