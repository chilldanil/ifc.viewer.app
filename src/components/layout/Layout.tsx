import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Viewport } from '../bim/Viewport';
import { SecondaryViewport } from '../bim/SecondaryViewport';
import { Sidebar } from './Sidebar';
import { useBIM } from '../../context/BIMContext';
import DragAndDropOverlay from '../DragAndDropOverlay';
import './Layout.css';

export const Layout: React.FC = () => {
  const { isInitialized, isLoading, error, retry, multiViewPreset, config } = useBIM();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSidebarVisible, setSidebarVisible] = useState(true);

  // Get sidebar config from context - fully configurable, no hardcoded values
  const sidebarConfig = config.layout.sidebar;
  const { minWidth, maxWidth, defaultWidth, widthRatio, maxViewportRatio } = sidebarConfig;

  const getDefaultSidebarWidth = useCallback(() => {
    if (typeof window === 'undefined') {
      return defaultWidth;
    }

    const viewportWidth = window.innerWidth;
    const preferredWidth = widthRatio * viewportWidth;

    return Math.max(minWidth, Math.min(preferredWidth, defaultWidth + 40));
  }, [defaultWidth, widthRatio, minWidth]);

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => getDefaultSidebarWidth());
  const [isResizing, setIsResizing] = useState(false);
  const resizeStateRef = useRef({ startX: 0, startWidth: 0 });
  const isResizingRef = useRef(false);

  const containerClassName = useMemo(() => {
    const base = `layout ifc-viewer-library-container${isSidebarVisible ? '' : ' sidebar-hidden'}`;
    return isResizing ? `${base} sidebar-resizing` : base;
  }, [isSidebarVisible, isResizing]);

  const layoutStyle = useMemo<React.CSSProperties>(() => {
    return {
      '--ifc-sidebar-width': `${sidebarWidth}px`,
      '--ifc-sidebar-min-width': `${minWidth}px`,
      '--ifc-sidebar-max-width': `${maxWidth}px`,
    } as React.CSSProperties;
  }, [sidebarWidth, minWidth, maxWidth]);

  const toggleSidebar = () => {
    setSidebarVisible((prev) => !prev);
  };

  const clampSidebarWidth = useCallback((width: number) => {
    const viewportLimitedMax = typeof window === 'undefined'
      ? maxWidth
      : Math.max(
          minWidth,
          Math.min(maxWidth, Math.round(window.innerWidth * maxViewportRatio))
        );

    return Math.min(Math.max(width, minWidth), viewportLimitedMax);
  }, [minWidth, maxWidth, maxViewportRatio]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!isResizingRef.current) {
      return;
    }

    event.preventDefault();

    const delta = event.clientX - resizeStateRef.current.startX;
    const newWidth = clampSidebarWidth(resizeStateRef.current.startWidth + delta);
    setSidebarWidth(newWidth);
  }, [clampSidebarWidth]);

  const stopResizing = useCallback(() => {
    if (!isResizingRef.current) {
      return;
    }

    isResizingRef.current = false;
    setIsResizing(false);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizing);
      window.removeEventListener('pointercancel', stopResizing);
    }
  }, [handlePointerMove]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidth,
    };

    isResizingRef.current = true;
    setIsResizing(true);

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopResizing);
      window.addEventListener('pointercancel', stopResizing);
    }
  }, [handlePointerMove, sidebarWidth, stopResizing]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setSidebarWidth((currentWidth) => clampSidebarWidth(currentWidth));
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [clampSidebarWidth]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', stopResizing);
        window.removeEventListener('pointercancel', stopResizing);
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      isResizingRef.current = false;
    };
  }, [handlePointerMove, stopResizing]);

  // Calculate extra views based on multiViewPreset (must be before conditional returns)
  const presetKey = multiViewPreset ?? 'single';
  const extraViews = useMemo(() => {
    switch (presetKey) {
      case 'dual':
        return ['front'] as const;
      case 'triple':
        return ['front', 'front'] as const;
      case 'quad':
        return ['front', 'front', 'front'] as const;
      default:
        return [] as const;
    }
  }, [presetKey]);

  if (isLoading) {
    return (
      <div className="loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading BIM components...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading">
        <div className="error-content">
          <h3>Failed to Initialize BIM Components</h3>
          <p>{error}</p>
          <button onClick={retry} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="loading">
        <div className="loading-content">
          <p>Initializing BIM components...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`${containerClassName} multi-view--${presetKey}`} style={layoutStyle}>
      <DragAndDropOverlay container={containerRef.current} />
      <button
        type="button"
        className={`sidebar-toggle${isSidebarVisible ? '' : ' sidebar-toggle--collapsed'}`}
        onClick={toggleSidebar}
        aria-expanded={isSidebarVisible}
        aria-controls="ifc-sidebar"
        aria-label={isSidebarVisible ? 'Hide side panel' : 'Show side panel'}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className={`sidebar-slot${isSidebarVisible ? ' sidebar-slot--visible' : ''}`} aria-hidden={!isSidebarVisible} id="ifc-sidebar">
        <Sidebar />
        <div className="sidebar-resizer" onPointerDown={handlePointerDown} aria-hidden="true" />
      </div>
      <main className={`main-content main-content--${presetKey}`}>
        <div className={`viewer-grid viewer-grid--${presetKey}`}>
          <div className="viewer-pane viewer-pane--primary">
            <Viewport />
          </div>
          {extraViews.map((orientation, index) => (
            <div key={`${orientation}-${index}`} className={`viewer-pane viewer-pane--${orientation}`}>
              <SecondaryViewport orientation={orientation} preset={presetKey} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
