import React, { useRef, useState, useMemo } from 'react';
import { Viewport } from '../bim/Viewport';
import { Sidebar } from './Sidebar';
import { useBIM } from '../../context/BIMContext';
import DragAndDropOverlay from '../DragAndDropOverlay';
import './Layout.css';

export const Layout: React.FC = () => {
  const { isInitialized, isLoading, error, retry } = useBIM();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSidebarVisible, setSidebarVisible] = useState(true);

  const containerClassName = useMemo(() => {
    return `layout ifc-viewer-library-container${isSidebarVisible ? '' : ' sidebar-hidden'}`;
  }, [isSidebarVisible]);

  const toggleSidebar = () => {
    setSidebarVisible((prev) => !prev);
  };

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
    <div ref={containerRef} className={containerClassName}>
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
      </div>
      <main className="main-content">
        <Viewport />
      </main>
    </div>
  );
}; 
