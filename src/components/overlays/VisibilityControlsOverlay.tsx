import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBIM } from '../../context/BIMContext';
import './VisibilityControlsOverlay.css';

interface VisibilityControlsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROOT_FALLBACK = globalThis.document?.body ?? null;

export const VisibilityControlsOverlay: React.FC<VisibilityControlsOverlayProps> = ({
  isOpen,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { visibilityOverlayContainerRef } = useBIM();

  useEffect(() => {
    visibilityOverlayContainerRef.current = containerRef.current;

    return () => {
      if (visibilityOverlayContainerRef.current === containerRef.current) {
        visibilityOverlayContainerRef.current = null;
      }
    };
  }, [visibilityOverlayContainerRef]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!ROOT_FALLBACK) {
    return null;
  }

  return createPortal(
    <div
      className={`visibility-controls-overlay${isOpen ? ' is-open' : ''}`}
      role={isOpen ? 'dialog' : undefined}
      aria-modal={isOpen || undefined}
      aria-hidden={isOpen ? undefined : 'true'}
      onClick={onClose}
    >
      <div
        className="visibility-controls-overlay__content"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="visibility-controls-overlay__header">
          <div>
            <h3>Visibility Controls</h3>
            <p className="visibility-controls-overlay__subtitle">
              Manage floors and categories without opening the sidebar.
            </p>
          </div>
          <button
            type="button"
            className="visibility-controls-overlay__close"
            onClick={onClose}
            aria-label="Close visibility controls"
          >
            ✕
          </button>
        </header>

        <div className="visibility-controls-overlay__body">
          <div ref={containerRef} className="visibility-controls-overlay__panel visibility-container" />
        </div>

        <footer className="visibility-controls-overlay__footer">
          <span>Shortcut: press <kbd>V</kbd> + <kbd>C</kbd> to toggle this panel.</span>
        </footer>
      </div>
    </div>,
    ROOT_FALLBACK
  );
};
