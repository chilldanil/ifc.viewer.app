import React, { useState, useRef, useCallback, useEffect } from 'react';
import './Panel.css';

// ============================================================================
// Types
// ============================================================================

export type PanelPosition = 'left' | 'right' | 'bottom';

export interface PanelProps {
  /** Position of the panel */
  position: PanelPosition;
  /** Panel title displayed in the header */
  title?: string;
  /** Whether the panel is initially collapsed */
  defaultCollapsed?: boolean;
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Default size in pixels */
  defaultSize?: number;
  /** Minimum size in pixels */
  minSize?: number;
  /** Maximum size in pixels */
  maxSize?: number;
  /** Whether the panel can be resized */
  resizable?: boolean;
  /** Icon to display in header */
  icon?: React.ReactNode;
  /** Additional actions in the header */
  headerActions?: React.ReactNode;
  /** Panel content */
  children?: React.ReactNode;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

const ChevronIcon: React.FC<{ direction: 'left' | 'right' | 'up' | 'down' }> = ({ direction }) => {
  const rotations = {
    left: 180,
    right: 0,
    up: -90,
    down: 90,
  };

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ transform: `rotate(${rotations[direction]}deg)` }}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
};

// ============================================================================
// Panel Component
// ============================================================================

export const Panel: React.FC<PanelProps> = ({
  position,
  title,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  defaultSize,
  minSize = 200,
  maxSize = 500,
  resizable = true,
  icon,
  headerActions,
  children,
  className,
}) => {
  // Determine if collapsed state is controlled
  const isControlled = controlledCollapsed !== undefined;
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isCollapsed = isControlled ? controlledCollapsed : internalCollapsed;

  // Size state
  const getDefaultSize = () => {
    if (defaultSize) return defaultSize;
    return position === 'bottom' ? 200 : 280;
  };

  const [size, setSize] = useState(getDefaultSize);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStateRef = useRef({ startPos: 0, startSize: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Collapse toggle handler
  const handleToggleCollapse = useCallback(() => {
    const newCollapsed = !isCollapsed;
    if (!isControlled) {
      setInternalCollapsed(newCollapsed);
    }
    onCollapsedChange?.(newCollapsed);
  }, [isCollapsed, isControlled, onCollapsedChange]);

  // Resize handlers
  const getClientPos = useCallback(
    (event: PointerEvent) => {
      return position === 'bottom' ? event.clientY : event.clientX;
    },
    [position]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      event.preventDefault();
      const currentPos = getClientPos(event);
      let delta = currentPos - resizeStateRef.current.startPos;

      // Invert delta for left and bottom panels (drag away = larger)
      if (position === 'left') {
        // For left panel, dragging right (positive delta) increases size
      } else if (position === 'right') {
        // For right panel, dragging left (negative delta) increases size
        delta = -delta;
      } else if (position === 'bottom') {
        // For bottom panel, dragging up (negative delta) increases size
        delta = -delta;
      }

      const newSize = Math.min(Math.max(resizeStateRef.current.startSize + delta, minSize), maxSize);
      setSize(newSize);
    },
    [getClientPos, minSize, maxSize, position]
  );

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopResizing);
    window.removeEventListener('pointercancel', stopResizing);
  }, [handlePointerMove]);

  const handleResizerPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!resizable || isCollapsed) return;

      event.preventDefault();
      event.stopPropagation();

      resizeStateRef.current = {
        startPos: getClientPos(event.nativeEvent),
        startSize: size,
      };

      setIsResizing(true);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = position === 'bottom' ? 'row-resize' : 'col-resize';

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopResizing);
      window.addEventListener('pointercancel', stopResizing);
    },
    [resizable, isCollapsed, getClientPos, size, position, handlePointerMove, stopResizing]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizing);
      window.removeEventListener('pointercancel', stopResizing);
    };
  }, [handlePointerMove, stopResizing]);

  // Determine chevron direction based on position and collapsed state
  const getChevronDirection = (): 'left' | 'right' | 'up' | 'down' => {
    if (position === 'bottom') {
      return isCollapsed ? 'up' : 'down';
    }
    if (position === 'left') {
      return isCollapsed ? 'right' : 'left';
    }
    // right panel
    return isCollapsed ? 'left' : 'right';
  };

  // CSS custom properties for size
  const panelStyle: React.CSSProperties = {
    ['--panel-size' as string]: `${size}px`,
  };

  const panelClasses = [
    'panel',
    `panel--${position}`,
    isCollapsed && 'panel--collapsed',
    isResizing && 'panel--resizing',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside ref={panelRef} className={panelClasses} style={panelStyle}>
      {/* Resizer */}
      {resizable && !isCollapsed && (
        <div
          className={`panel-resizer panel-resizer--${position}`}
          onPointerDown={handleResizerPointerDown}
          aria-hidden="true"
        />
      )}

      {/* Header */}
      <header className="panel-header">
        <button
          className="panel-collapse-btn"
          onClick={handleToggleCollapse}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          <ChevronIcon direction={getChevronDirection()} />
        </button>
        {icon && <span className="panel-header-icon">{icon}</span>}
        {title && <h2 className="panel-title">{title}</h2>}
        {headerActions && !isCollapsed && (
          <div className="panel-header-actions">{headerActions}</div>
        )}
      </header>

      {/* Content */}
      {!isCollapsed && <div className="panel-content">{children}</div>}
    </aside>
  );
};

export default Panel;
