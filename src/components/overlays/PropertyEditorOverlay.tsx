import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as OBF from '@thatopen/fragments';
import { PropertyEditor } from '../sidebar/PropertyEditor';
import './PropertyEditorOverlay.css';

interface PropertyEditorOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: OBF.FragmentsGroup | null;
  selectedExpressID: number | null;
}

const ROOT_FALLBACK = globalThis.document?.body ?? null;

export const PropertyEditorOverlay: React.FC<PropertyEditorOverlayProps> = ({
  isOpen,
  onClose,
  selectedModel,
  selectedExpressID,
}) => {
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

  if (!isOpen || !ROOT_FALLBACK) {
    return null;
  }

  return createPortal(
    <div className="property-editor-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="property-editor-overlay__content"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="property-editor-overlay__header">
          <div>
            <h3>Element Properties</h3>
            <p className="property-editor-overlay__subtitle">
              {selectedModel && selectedExpressID !== null
                ? `Editing fragment ${selectedExpressID} in model ${selectedModel.uuid.substring(0, 8)}`
                : 'Select an element in the scene to view or edit its properties.'}
            </p>
          </div>
          <button
            type="button"
            className="property-editor-overlay__close"
            onClick={onClose}
            aria-label="Close property editor"
          >
            ✕
          </button>
        </header>

        <div className="property-editor-overlay__body">
          <PropertyEditor selectedModel={selectedModel} selectedExpressID={selectedExpressID} />
        </div>

        <footer className="property-editor-overlay__footer">
          <span>Shortcut: press <kbd>E</kbd> + <kbd>D</kbd> to toggle this view.</span>
        </footer>
      </div>
    </div>,
    ROOT_FALLBACK
  );
};
