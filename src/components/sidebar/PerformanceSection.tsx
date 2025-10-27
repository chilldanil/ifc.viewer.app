import React, { useEffect, useRef, useState, useCallback } from 'react';
import Stats from 'stats.js';
import { useBIM } from '../../context/BIMContext';
import './PerformanceSection.css';

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
    stats.showPanel(2); // 0: fps, 1: ms, 2: mb
    const dom = stats.dom;
    dom.classList.add('stats-overlay');
    dom.style.position = 'absolute';
    dom.style.left = 'auto';
    dom.style.top = 'auto';
    dom.style.right = '20px';
    dom.style.bottom = '20px';
    dom.style.zIndex = '1400';
    dom.style.display = 'none';

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

  const toggleStats = () => {
    setStatsVisible((prev) => !prev);
  };

  const selectPanel = (panel: number) => {
    if (!statsRef.current) {return;}
    statsRef.current.showPanel(panel);
    if (!statsVisible) {
      setStatsVisible(true);
    }
  };

  return (
    <bim-panel-section label="Performance" collapsed>
      <div className="performance-controls">
        <label className="performance-toggle">
          <input
            type="checkbox"
            checked={statsVisible}
            onChange={toggleStats}
            disabled={!world?.renderer}
          />
          <span>Show stats overlay</span>
        </label>
        <div className="performance-panels">
          <button
            type="button"
            className="performance-chip"
            disabled={!world?.renderer}
            onClick={() => selectPanel(0)}
          >
            FPS
          </button>
          <button
            type="button"
            className="performance-chip"
            disabled={!world?.renderer}
            onClick={() => selectPanel(1)}
          >
            MS
          </button>
          <button
            type="button"
            className="performance-chip"
            disabled={!world?.renderer}
            onClick={() => selectPanel(2)}
          >
            MB
          </button>
        </div>
        <p className="performance-hint">
          Stats are rendered inside the viewport near the bottom-right corner.
        </p>
      </div>
    </bim-panel-section>
  );
};
