import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useBIM } from '../../context/BIMContext';
import { Card, Input, Slider, Stack, Text } from '../../ui';

export const WorldsSection: React.FC = () => {
  const { world } = useBIM();
  const [background, setBackground] = useState('#202932');
  const [dirLight, setDirLight] = useState(1.5);
  const [ambient, setAmbient] = useState(1);

  useEffect(() => {
    if (!world) {return;}

    try {
      const bg = (world.scene as any)?.config?.backgroundColor as any;
      if (bg?.isColor) {
        setBackground(`#${bg.getHexString()}`);
      }
      const dir = (world.scene as any)?.config?.directionalLight?.intensity;
      if (typeof dir === 'number') {
        setDirLight(dir);
      }
      const amb = (world.scene as any)?.config?.ambientLight?.intensity;
      if (typeof amb === 'number') {
        setAmbient(amb);
      }
    } catch {
      /* ignore */
    }
  }, [world]);

  const applyBackground = (value: string) => {
    setBackground(value);
    if (!world) {return;}
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
    if (!world?.scene?.three) {return;}
    const lights = world.scene.three.children.filter((c: any) => c instanceof THREE.DirectionalLight) as THREE.DirectionalLight[];
    lights.forEach((l) => { l.intensity = value; });
    (world.scene as any).config?.directionalLight && ((world.scene as any).config.directionalLight.intensity = value);
  };

  const applyAmbient = (value: number) => {
    setAmbient(value);
    if (!world?.scene?.three) {return;}
    const lights = world.scene.three.children.filter((c: any) => c instanceof THREE.AmbientLight) as THREE.AmbientLight[];
    lights.forEach((l) => { l.intensity = value; });
    (world.scene as any).config?.ambientLight && ((world.scene as any).config.ambientLight.intensity = value);
  };

  return (
    <Stack gap="sm">
      <Card>
        <Stack gap="sm">
          <Text variant="label" as="div">Controls</Text>
          <Stack gap="sm">
            <Text variant="muted" size="sm">Background Color</Text>
            <Input
              type="color"
              value={background}
              onChange={(e) => applyBackground(e.target.value)}
            />
          </Stack>
          <Slider
            label="Directional light intensity"
            min={0.1}
            max={10}
            step={0.1}
            value={dirLight}
            onChange={(e) => applyDirLight(parseFloat(e.target.value))}
            formatValue={(v) => v.toFixed(1)}
          />
          <Slider
            label="Ambient light intensity"
            min={0.1}
            max={5}
            step={0.1}
            value={ambient}
            onChange={(e) => applyAmbient(parseFloat(e.target.value))}
            formatValue={(v) => v.toFixed(1)}
          />
        </Stack>
      </Card>
    </Stack>
  );
};

export default WorldsSection;
