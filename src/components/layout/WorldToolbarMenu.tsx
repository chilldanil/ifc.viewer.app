import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import { useBIM } from '../../context/BIMContext';
import { Button, ButtonGroup, Input, Row, Slider, Stack, Text, Toggle } from '../../ui';
import {
  applyRenderModeToWorld,
  getCurrentRenderMode,
  renderModes,
  type RenderMode,
} from '../../utils/renderModeUtils';

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

const colorToHex = (color: any, fallback: string) => {
  if (!color) {
    return fallback;
  }
  if (typeof color === 'string') {
    return color;
  }
  if (color instanceof THREE.Color || (color.isColor && typeof color.getHexString === 'function')) {
    return `#${color.getHexString()}`;
  }
  return fallback;
};

export const WorldToolbarMenu: React.FC = () => {
  const { world, components } = useBIM();
  const [background, setBackground] = useState('#202932');
  const [dirLight, setDirLight] = useState(1.5);
  const [ambient, setAmbient] = useState(1);
  const [currentMode, setCurrentMode] = useState<RenderMode>('shaded');
  const [gridConfig, setGridConfig] = useState<GridConfig>(defaultGridConfig);
  const gridRef = useRef<any>(null);
  const gridCacheRef = useRef<WeakMap<any, any>>(new WeakMap());
  const grids = useMemo(() => components?.get(OBC.Grids as any) as any, [components]);
  const ghostOpacity = 0.3;

  const syncLightingFromWorld = useCallback(() => {
    if (!world) {
      return;
    }

    try {
      const sceneConfig = (world.scene as any)?.config;
      const bg = sceneConfig?.backgroundColor;
      if (bg?.isColor) {
        setBackground(`#${bg.getHexString()}`);
      }
      const dir = sceneConfig?.directionalLight?.intensity;
      if (typeof dir === 'number') {
        setDirLight(dir);
      }
      const amb = sceneConfig?.ambientLight?.intensity;
      if (typeof amb === 'number') {
        setAmbient(amb);
      }
    } catch {
      /* ignore */
    }
  }, [world]);

  const applyBackground = (value: string) => {
    setBackground(value);
    if (!world) {
      return;
    }
    try {
      const color = new THREE.Color(value);
      if ((world.scene as any).config?.backgroundColor) {
        (world.scene as any).config.backgroundColor = color;
      }
      const threeScene = world.scene?.three as THREE.Scene | undefined;
      if (threeScene) {
        threeScene.background = color;
      }
    } catch {
      /* ignore */
    }
  };

  const applyDirLight = (value: number) => {
    setDirLight(value);
    if (!world?.scene?.three) {
      return;
    }
    const lights = world.scene.three.children.filter((c: any) => c instanceof THREE.DirectionalLight) as THREE.DirectionalLight[];
    lights.forEach((l) => { l.intensity = value; });
    (world.scene as any).config?.directionalLight && ((world.scene as any).config.directionalLight.intensity = value);
  };

  const applyAmbient = (value: number) => {
    setAmbient(value);
    if (!world?.scene?.three) {
      return;
    }
    const lights = world.scene.three.children.filter((c: any) => c instanceof THREE.AmbientLight) as THREE.AmbientLight[];
    lights.forEach((l) => { l.intensity = value; });
    (world.scene as any).config?.ambientLight && ((world.scene as any).config.ambientLight.intensity = value);
  };

  const ensureGrid = useCallback(() => {
    if (!grids || !world) {
      gridRef.current = null;
      return null;
    }

    const cached = gridCacheRef.current.get(world) ?? (world as any).__grid;
    if (cached) {
      gridRef.current = cached;
      return cached;
    }

    const existing =
      (grids as any).list?.get?.(world) ??
      (grids as any).list?.find?.((entry: any) => entry?.world === world || entry?.worldRef === world);

    if (existing) {
      gridRef.current = existing;
      gridCacheRef.current.set(world, existing);
      (world as any).__grid = existing;
      return existing;
    }

    try {
      const created = grids.create(world);
      gridRef.current = created;
      gridCacheRef.current.set(world, created);
      (world as any).__grid = created;
      return created;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('already has a grid')) {
        console.warn('Failed to create grid:', error);
      }
    }

    return null;
  }, [grids, world]);

  const syncGridConfigFromGrid = useCallback((grid?: any) => {
    const target = grid ?? gridRef.current;
    if (!target) {
      return;
    }

    try {
      setGridConfig({
        visible: typeof target.config?.visible === 'boolean' ? target.config.visible : defaultGridConfig.visible,
        height: target.three?.position?.y ?? defaultGridConfig.height,
        primarySize: typeof target.config?.primarySize === 'number' ? target.config.primarySize : defaultGridConfig.primarySize,
        secondarySize: typeof target.config?.secondarySize === 'number' ? target.config.secondarySize : defaultGridConfig.secondarySize,
        color: colorToHex(target.config?.color, defaultGridConfig.color),
      });
    } catch (error) {
      console.warn('Failed to sync grid config:', error);
    }
  }, []);

  useEffect(() => {
    if (!world) {
      setCurrentMode('shaded');
      return;
    }

    syncLightingFromWorld();
    setCurrentMode(getCurrentRenderMode(world));
  }, [world, syncLightingFromWorld]);

  useEffect(() => {
    const grid = ensureGrid();
    if (grid) {
      syncGridConfigFromGrid(grid);
    } else {
      setGridConfig(defaultGridConfig);
    }
  }, [ensureGrid, syncGridConfigFromGrid]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return;
    }
    try {
      grid.config.visible = gridConfig.visible;
      grid.config.primarySize = gridConfig.primarySize;
      grid.config.secondarySize = gridConfig.secondarySize;
      grid.config.color = new THREE.Color(gridConfig.color);
      if (grid.three?.position) {
        grid.three.position.y = gridConfig.height;
      }
    } catch (error) {
      console.warn('Failed to apply grid config:', error);
    }
  }, [gridConfig]);

  const handleRenderModeChange = (mode: RenderMode) => {
    if (!world) {
      return;
    }
    setCurrentMode(mode);
    applyRenderModeToWorld(world, mode, { ghostOpacity });
  };

  const handleResetGrid = () => {
    setGridConfig(defaultGridConfig);
  };

  const gridControlsDisabled = !world || !grids;

  return (
    <div className="toolbar-world-menu">
      <div className="toolbar-world-section">
        <Text variant="label" size="sm" as="div">Edit world</Text>
        <Stack gap="sm">
          <Stack gap="sm" className="toolbar-world-field">
            <Text variant="muted" size="sm">Background color</Text>
            <Input
              type="color"
              value={background}
              disabled={!world}
              onChange={(e) => applyBackground(e.target.value)}
            />
          </Stack>
          <Slider
            label="Directional light intensity"
            min={0.1}
            max={10}
            step={0.1}
            value={dirLight}
            disabled={!world}
            onChange={(e) => applyDirLight(parseFloat(e.target.value))}
            formatValue={(v) => v.toFixed(1)}
          />
          <Slider
            label="Ambient light intensity"
            min={0.1}
            max={5}
            step={0.1}
            value={ambient}
            disabled={!world}
            onChange={(e) => applyAmbient(parseFloat(e.target.value))}
            formatValue={(v) => v.toFixed(1)}
          />
        </Stack>
      </div>

      <div className="toolbar-world-section">
        <Text variant="label" size="sm" as="div">Render mode</Text>
        <Stack gap="sm">
          <ButtonGroup stretch>
            {(Object.keys(renderModes) as RenderMode[]).map((mode) => (
              <Button
                key={mode}
                size="sm"
                selected={currentMode === mode}
                disabled={!world}
                onClick={() => handleRenderModeChange(mode)}
              >
                {renderModes[mode].name}
              </Button>
            ))}
          </ButtonGroup>
          <Text variant="muted" size="sm">
            <strong>{renderModes[currentMode].name}:</strong> {renderModes[currentMode].description}
          </Text>
        </Stack>
      </div>

      <div className="toolbar-world-section">
        <Row between>
          <Text variant="label" size="sm" as="div">Grid</Text>
          <Button size="sm" variant="ghost" onClick={handleResetGrid} disabled={gridControlsDisabled}>
            Reset
          </Button>
        </Row>
        <Stack gap="sm">
          <Toggle
            checked={gridConfig.visible}
            onChange={(value) => setGridConfig((prev) => ({ ...prev, visible: value }))}
            label="Visible"
            disabled={gridControlsDisabled}
          />
          <Slider
            label="Height"
            min={-50}
            max={50}
            step={0.5}
            value={gridConfig.height}
            disabled={gridControlsDisabled}
            onChange={(e) => setGridConfig((prev) => ({ ...prev, height: parseFloat(e.target.value) }))}
            formatValue={(v) => `${v.toFixed(1)} m`}
          />
          <Row stretch>
            <Slider
              label="Primary Size"
              min={0.1}
              max={10}
              step={0.1}
              value={gridConfig.primarySize}
              disabled={gridControlsDisabled}
              onChange={(e) => setGridConfig((prev) => ({ ...prev, primarySize: parseFloat(e.target.value) }))}
              formatValue={(v) => v.toFixed(1)}
            />
            <Slider
              label="Secondary Size"
              min={1}
              max={50}
              step={0.5}
              value={gridConfig.secondarySize}
              disabled={gridControlsDisabled}
              onChange={(e) => setGridConfig((prev) => ({ ...prev, secondarySize: parseFloat(e.target.value) }))}
              formatValue={(v) => v.toFixed(1)}
            />
          </Row>
          <Stack gap="sm" className="toolbar-world-field">
            <Text variant="muted" size="sm">Grid color</Text>
            <Input
              type="color"
              value={gridConfig.color}
              disabled={gridControlsDisabled}
              onChange={(e) => setGridConfig((prev) => ({ ...prev, color: e.target.value }))}
            />
          </Stack>
        </Stack>
      </div>
    </div>
  );
};

export default WorldToolbarMenu;
