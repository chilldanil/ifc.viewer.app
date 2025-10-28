import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBIM } from '../context/BIMContext';
import { setupIfcLoader } from '../core/services/ifcLoaderService';
import './DragAndDropOverlay.css';

/**
 * Container-scoped drag-and-drop overlay.
 *
 * – Darkens entire viewport when a file is dragged over.
 * – Shows a curved dashed border (#bcf124) in the centre.
 * – Loads dropped IFC files through the global IfcLoader.
 */
type Props = { container: HTMLElement | null };

const DragAndDropOverlay: React.FC<Props> = ({ container }) => {
  const { components, propertyEditingService } = useBIM();

  // Indicates whether the overlay is visible (drag in progress)
  const [isDragging, setIsDragging] = useState(false);

  // Counter to avoid flickering when child elements emit dragleave before parent
  const dragCounter = useRef(0);

  useEffect(() => {
    if (!container) {return;}
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      setIsDragging(true);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);

      if (!components) {return;}

      const { loadFromBuffer, onModelLoaded } = setupIfcLoader(components, propertyEditingService ?? undefined);

      // Set up model loaded callback
      if (onModelLoaded) {
        onModelLoaded((modelId) => {
          console.log('Model loaded via drag and drop:', modelId);
        });
      }
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        try {
          // Read file as ArrayBuffer and convert to Uint8Array (required by IfcLoader)
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Load IFC from buffer (faster and avoids subarray errors in web-ifc)
          await loadFromBuffer(uint8Array);
        } catch (error) {
          console.error('Failed to load IFC file via drag-and-drop', error);
        }
      }
    };

  container.addEventListener('dragenter', handleDragEnter);
  container.addEventListener('dragover', handleDragOver);
  container.addEventListener('dragleave', handleDragLeave);
  container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('dragenter', handleDragEnter);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
    };
  }, [components, container]);

  if (!isDragging || !container) {return null;}

  return createPortal(
    <div className="drag-overlay">
      <div className="drag-overlay__box">
        <p>Drop your IFC file here</p>
      </div>
    </div>,
    container
  );
};

export default DragAndDropOverlay; 