import React, { useEffect, useRef, useState, useCallback } from 'react';
import Stats from 'stats.js';
import { useBIM } from '../../context/BIMContext';
import { Toggle, Button, Text, Stack, ButtonGroup } from '../../ui';

const findViewerContainer = () => {
  return document.querySelector<HTMLElement>('.ifc-viewer-library-container .viewer-container');
};

export const PerformanceSection: React.FC = () => {
  const { world } = useBIM();
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<Stats | null>(null);
  const overlayHostRef = useRef<HTMLElement | null>(null);

  const ensureOverlayAttached = useCallback(() => {
    if (!statsRef.current) {return;}
    const viewerContainer = findViewerContainer();
    if (viewerContainer && statsRef.current.dom.parentElement !== viewerContainer) {
      viewerContainer.appendChild(statsRef.current.dom);
      overlayHostRef.current = viewerContainer;
    }
  }, []);

  useEffect(() => {
    if (statsRef.current) {return;}

    const stats = new Stats();
    stats.showPanel(2);
    const dom = stats.dom;
    dom.style.position = 'absolute';
    dom.style.left = 'auto';
    dom.style.top = 'auto';
    dom.style.right = '20px';
    dom.style.bottom = '20px';
    dom.style.zIndex = '1400';
    dom.style.display = 'none';
    dom.style.borderRadius = '8px';
    dom.style.overflow = 'hidden';
    dom.style.boxShadow = '0 14px 32px rgba(0, 0, 0, 0.35)';

    statsRef.current = stats;
    ensureOverlayAttached();

    return () => {
      if (dom.parentElement) {
        dom.parentElement.removeChild(dom);
      }
      statsRef.current = null;
      overlayHostRef.current = null;
    };
  }, [ensureOverlayAttached]);

  useEffect(() => {
    if (!world || !statsRef.current) {return;}
    ensureOverlayAttached();
  }, [world, ensureOverlayAttached]);

  useEffect(() => {
    if (!statsRef.current?.dom) {return;}
    statsRef.current.dom.style.display = statsVisible ? 'block' : 'none';
  }, [statsVisible]);

  useEffect(() => {
    if (!world?.renderer || !statsRef.current) {return;}

    const beforeUpdate = () => {
      if (statsVisible) {statsRef.current?.begin();}
    };

    const afterUpdate = () => {
      if (statsVisible) {statsRef.current?.end();}
    };

    world.renderer.onBeforeUpdate.add(beforeUpdate);
    world.renderer.onAfterUpdate.add(afterUpdate);

    return () => {
      if (world.renderer) {
        world.renderer.onBeforeUpdate.remove(beforeUpdate);
        world.renderer.onAfterUpdate.remove(afterUpdate);
      }
    };
  }, [world, statsVisible]);

  const selectPanel = (panel: number) => {
    if (!statsRef.current) {return;}
    statsRef.current.showPanel(panel);
    if (!statsVisible) {
      setStatsVisible(true);
    }
  };

  return (
    <bim-panel-section label="Performance" collapsed>
      <Stack gap="sm">
        <Toggle
          checked={statsVisible}
          onChange={setStatsVisible}
          label="Show stats overlay"
          disabled={!world?.renderer}
        />
        <ButtonGroup>
          <Button size="sm" disabled={!world?.renderer} onClick={() => selectPanel(0)}>
            FPS
          </Button>
          <Button size="sm" disabled={!world?.renderer} onClick={() => selectPanel(1)}>
            MS
          </Button>
          <Button size="sm" disabled={!world?.renderer} onClick={() => selectPanel(2)}>
            MB
          </Button>
        </ButtonGroup>
        <Text variant="subtle" size="xs">
          Stats are rendered inside the viewport near the bottom-right corner.
        </Text>
      </Stack>
    </bim-panel-section>
  );
};
