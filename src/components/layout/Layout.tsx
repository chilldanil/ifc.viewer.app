import React, { useRef, useState, useMemo } from 'react';
import { Viewport } from '../bim/Viewport';
import { SecondaryViewport } from '../bim/SecondaryViewport';
import { Sidebar } from './Sidebar';
import { Toolbar, type MenuConfig } from './Toolbar';
import { Panel } from './Panel';
import { useBIM } from '../../context/BIMContext';
import DragAndDropOverlay from '../DragAndDropOverlay';
import './Layout.css';

// ============================================================================
// Icons for Toolbar Menus
// ============================================================================

const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LayersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const GridIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const BoxIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const TerminalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// ============================================================================
// Layout Component
// ============================================================================

export const Layout: React.FC = () => {
  const { isInitialized, isLoading, error, retry, multiViewPreset, config } = useBIM();
  const containerRef = useRef<HTMLDivElement>(null);

  // Panel visibility states
  const [isLeftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [isBottomPanelCollapsed, setBottomPanelCollapsed] = useState(true);

  // Get sidebar config from context - fully configurable, no hardcoded values
  const sidebarConfig = config.layout.sidebar;
  const { minWidth, maxWidth, defaultWidth } = sidebarConfig;

  // CSS variables for layout
  const layoutStyle = useMemo<React.CSSProperties>(() => ({}), []);

  const containerClassName = useMemo(() => {
    const classes = ['layout', 'ifc-viewer-library-container'];
    if (isLeftPanelCollapsed) classes.push('left-panel-collapsed');
    if (isRightPanelCollapsed) classes.push('right-panel-collapsed');
    if (isBottomPanelCollapsed) classes.push('bottom-panel-collapsed');
    return classes.join(' ');
  }, [isLeftPanelCollapsed, isRightPanelCollapsed, isBottomPanelCollapsed]);

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

  // Toolbar menu configuration
  const toolbarMenus: MenuConfig[] = useMemo(() => [
    {
      label: 'File',
      items: [
        { label: 'Open IFC...', icon: <FileIcon />, shortcut: 'Ctrl+O' },
        { label: 'Recent Files', type: 'submenu', items: [
          { label: 'No recent files', disabled: true }
        ]},
        { type: 'divider' },
        { label: 'Export...', icon: <FileIcon /> },
        { type: 'divider' },
        { label: 'Settings', icon: <SettingsIcon />, shortcut: 'Ctrl+,' },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Left Panel', onClick: () => setLeftPanelCollapsed(c => !c) },
        { label: 'Right Panel', onClick: () => setRightPanelCollapsed(c => !c) },
        { label: 'Bottom Panel', onClick: () => setBottomPanelCollapsed(c => !c) },
        { type: 'divider' },
        { label: 'Viewport Layout', type: 'submenu', icon: <GridIcon />, items: [
          { label: 'Single View' },
          { label: '2 Views (Horizontal)' },
          { label: '3 Views' },
          { label: '4 Views (Quad)' },
        ]},
        { type: 'divider' },
        { label: 'Reset Layout' },
      ],
    },
    {
      label: 'Tools',
      items: [
        { label: 'Measure', type: 'submenu', items: [
          { label: 'Distance' },
          { label: 'Area' },
          { label: 'Angle' },
        ]},
        { label: 'Section', type: 'submenu', items: [
          { label: 'Clipping Plane' },
          { label: 'Section Box' },
        ]},
        { type: 'divider' },
        { label: 'Isolate Selected' },
        { label: 'Hide Selected' },
        { label: 'Show All' },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Documentation', icon: <InfoIcon /> },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/' },
        { type: 'divider' },
        { label: 'About' },
      ],
    },
  ], []);

  // Toolbar right content
  const toolbarRightContent = useMemo(() => (
    <>
      <button className="toolbar-action" title="Settings" onClick={() => setRightPanelCollapsed(c => !c)}>
        <SettingsIcon />
      </button>
    </>
  ), []);

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

      {/* Top Toolbar */}
      <Toolbar menus={toolbarMenus} rightContent={toolbarRightContent} />

      {/* Main Content Area */}
      <div className="layout-body">
        {/* Left Panel (Existing Sidebar) */}
        <Panel
          position="left"
          title="Outliner"
          icon={<LayersIcon />}
          collapsed={isLeftPanelCollapsed}
          onCollapsedChange={setLeftPanelCollapsed}
          defaultSize={defaultWidth}
          minSize={minWidth}
          maxSize={maxWidth}
          resizable={true}
        >
          <Sidebar />
        </Panel>

        {/* Center Area (Viewport + Bottom Panel) */}
        <div className="layout-center">
          {/* Viewport Area */}
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

          {/* Bottom Panel */}
          <Panel
            position="bottom"
            title="Output"
            icon={<TerminalIcon />}
            collapsed={isBottomPanelCollapsed}
            onCollapsedChange={setBottomPanelCollapsed}
            defaultSize={200}
            minSize={100}
            maxSize={400}
            resizable={true}
          >
            <div className="output-panel-content">
              <p className="output-placeholder">Console output and logs will appear here.</p>
            </div>
          </Panel>
        </div>

        {/* Right Panel (Properties) */}
        <Panel
          position="right"
          title="Properties"
          icon={<BoxIcon />}
          collapsed={isRightPanelCollapsed}
          onCollapsedChange={setRightPanelCollapsed}
          defaultSize={300}
          minSize={240}
          maxSize={500}
          resizable={true}
        >
          <div className="properties-panel-content">
            <p className="properties-placeholder">Select an element to view its properties.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
};
