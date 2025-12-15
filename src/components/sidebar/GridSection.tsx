import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import { useBIM } from '../../context/BIMContext';
import { Button, Input, Slider, Stack, Toggle, Row, Text } from '../../ui';

type GridConfig = {
  visible: boolean;
  height: number;
  primarySize: number;
  secondarySize: number;
  color: string;
};

const defaultGridConfig: GridConfig = {
  visible: true,
  height: 0,
  primarySize: 1,
  secondarySize: 10,
  color: '#bbbbbb',
};

export const GridSection: React.FC = () => {
  const { components, world } = useBIM();
  const [config, setConfig] = useState<GridConfig>(defaultGridConfig);
  const gridRef = useRef<any>(null);
  const gridCacheRef = useRef<WeakMap<any, any>>(new WeakMap());
  const grids = useMemo(() => components?.get(OBC.Grids as any) as any, [components]);

  useEffect(() => {
    if (!grids || !world) {return;}
    const cached = gridCacheRef.current.get(world) ?? (world as any).__grid;
    if (cached) {
      gridRef.current = cached;
    } else {
      const existing =
        (grids as any).list?.get?.(world) ??
        (grids as any).list?.find?.((entry: any) => entry?.world === world || entry?.worldRef === world);

      if (existing) {
        gridRef.current = existing;
        gridCacheRef.current.set(world, existing);
        (world as any).__grid = existing;
      } else {
        try {
          const created = grids.create(world);
          gridRef.current = created;
          gridCacheRef.current.set(world, created);
          (world as any).__grid = created;
        } catch (error) {
          const message = error instanceof Error ? error.message : '';
          if (!message.includes('already has a grid')) {
            console.warn('Failed to create grid:', error);
          }
          return;
        }
      }
    }

    const grid = gridRef.current;
    try {
      grid.config.visible = config.visible;
      grid.config.primarySize = config.primarySize;
      grid.config.secondarySize = config.secondarySize;
      grid.config.color = new THREE.Color(config.color);
      grid.three.position.y = config.height;
    } catch (error) {
      console.warn('Failed to apply grid config:', error);
    }

    return () => {
      if (gridRef.current && !config.visible) {
        try {
          gridRef.current.config.visible = false;
        } catch {
          /* ignore */
        }
      }
    };
  }, [grids, world, config]);

  const updateConfig = (partial: Partial<GridConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleReset = () => {
    setConfig(defaultGridConfig);
  };

  return (
    <Stack gap="sm">
      <Toggle
        checked={config.visible}
        onChange={(value) => updateConfig({ visible: value })}
        label="Visible"
      />

      <Slider
        label="Height"
        min={-50}
        max={50}
        step={0.5}
        value={config.height}
        onChange={(e) => updateConfig({ height: parseFloat(e.target.value) })}
        formatValue={(v) => `${v.toFixed(1)} m`}
      />

      <Row stretch>
        <Slider
          label="Primary Size"
          min={0.1}
          max={10}
          step={0.1}
          value={config.primarySize}
          onChange={(e) => updateConfig({ primarySize: parseFloat(e.target.value) })}
          formatValue={(v) => v.toFixed(1)}
        />
        <Slider
          label="Secondary Size"
          min={1}
          max={50}
          step={0.5}
          value={config.secondarySize}
          onChange={(e) => updateConfig({ secondarySize: parseFloat(e.target.value) })}
          formatValue={(v) => v.toFixed(1)}
        />
      </Row>

      <Stack gap="sm">
        <Text variant="label" as="div">Grid Color</Text>
        <Input
          type="color"
          value={config.color}
          onChange={(e) => updateConfig({ color: e.target.value })}
        />
      </Stack>

      <Button variant="ghost" onClick={handleReset}>
        Reset Grid
      </Button>
    </Stack>
  );
};

export default GridSection;
