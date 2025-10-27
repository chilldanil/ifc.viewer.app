import React, { useEffect, useRef, useState } from 'react';
import * as OBCF from "@thatopen/components-front";
import { useBIM } from '../../context/BIMContext';
import { ensureBUIInitialised } from '../../utils/bui';

export const LengthMeasurement: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { components, world } = useBIM();
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentLength, setCurrentLength] = useState<object | null>(null);
  const lengthMeasurementRef = useRef<OBCF.LengthMeasurement | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);
  

  useEffect(() => {
    if (!containerRef.current || !components || !world) {return;}

    ensureBUIInitialised();

    const lengthDimensions = components.get(OBCF.LengthMeasurement);
    lengthDimensions.world = world;

    const highlighter = components.get(OBCF.Highlighter);
    const wrapper = document.createElement('div');

    lengthMeasurementRef.current = lengthDimensions;
    highlighterRef.current = highlighter;

    containerRef.current.innerHTML = '';
    // Build UI markup using BUI components
    const html = `
      <div class="length-measurement-controls">
        <div style="margin-bottom: 12px;">
          <bim-button label="${isEnabled ? 'Disable' : 'Enable'} Length Measurement" name="toggleLength"></bim-button>
        </div>
        
        <div style="margin-bottom: 12px;">
          <bim-label>Instructions:</bim-label>
          <div style="font-size: 0.85rem; color: #666; margin-top: 4px; line-height: 1.4;">
            • Enable the tool first<br/>
            • Double-click on the 3D viewport to create measurements<br/>
            • Click on elements to measure their length<br/>
            • Press Delete/Backspace to remove the last measurement<br/>
          </div>
        </div>

        <div class="length-display" style="margin-bottom: 12px; padding: 8px; background: #f8f9fa; border-radius: 4px; min-height: 40px; display: flex; align-items: center; justify-content: center;">
          <span style="color: #666; font-style: italic;">
            ${currentLength !== null ? `Length: ${currentLength} m` : 'No element selected'}
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <bim-button label="Clear All Measurements" name="clearAll"></bim-button>
        </div>
      </div>
    `;

    wrapper.innerHTML = html;
    containerRef.current.appendChild(wrapper);

    lengthDimensions.onAfterUpdate.add( (event) => {
      console.log("LengthMeasurement AfterUpdate happen:", event);
    });

    // Add a double-click event listener to the viewport
  const handleDoubleClick = () => {
    if (!lengthDimensions.enabled) {
      lengthDimensions.enabled = true;
      lengthDimensions.visible = true;
      console.log('[LengthMeasurement] Enable measurement...');
    }
    else{
      try {
        // Update the display with the latest measurement
        const last = lengthDimensions.list[lengthDimensions.list.length - 1];
        if (last) {
        // Extract the length value from the dimension line object
          const lengthValue = (last as any).length || (last as any).value || 0;
          setCurrentLength(lengthValue);
          updateLengthDisplay(wrapper, lengthValue);
        } else {
          setCurrentLength(null);
          updateLengthDisplay(wrapper, null);
        }
      } catch (error) {
        console.error('Error creating length measurement:', error);
      }
    }
  };

    // Toggle length measurement handler
    const toggleBtn = wrapper.querySelector('bim-button[name="toggleLength"]') as any;
    toggleBtn?.addEventListener('click', () => {
      handleDoubleClick();
      const newEnabled = !isEnabled;
      setIsEnabled(newEnabled);
      if (newEnabled){
        lengthMeasurementRef.current = lengthDimensions;
        highlighter.enabled = false;
        lengthDimensions.enabled = newEnabled;
        lengthDimensions.snapDistance = 1;

        console.log(`Length  measurement created`);
        const last = lengthDimensions.list[lengthDimensions.list.length - 1];
        setCurrentLength(last || null);
      }

      console.log(`Length  measurement ${newEnabled ? 'enabled' : 'disabled'}`);
      
      toggleBtn.label = newEnabled ? 'Disable Length Measurement' : 'Enable Length  Measurement';
      
      if (!newEnabled) {
        // Clear measurements when disabling
        lengthDimensions.deleteAll();
        lengthDimensions.enabled = false;
        lengthMeasurementRef.current = null;
        highlighter.enabled = true;
        setCurrentLength(null);
        updateLengthDisplay(wrapper, null);
      }
    });

    // Clear all handlers
    const clearBtn = wrapper.querySelector('bim-button[name="clearAll"]') as any;
    clearBtn?.addEventListener('click', () => {
      lengthDimensions.delete();
      highlighter.clear();
      setCurrentLength(null);
      updateLengthDisplay(wrapper, null);
      console.log('All length measurements cleared');
    });

    // Cleanup listeners on unmount
    return () => {
      // Remove the double-click listener
      const viewport = document.querySelector('bim-viewport');
      if (viewport) {
      viewport.removeEventListener('dblclick', handleDoubleClick);
    }

        if (lengthDimensions) {
          lengthDimensions.enabled = false;
          lengthDimensions.delete();
        }
        
        const clone = wrapper.cloneNode(false);
        wrapper.parentElement?.replaceChild(clone, wrapper);
    };

  }, [components, world, isEnabled, currentLength]);

  // Helper function to update the length display
  const updateLengthDisplay = (wrapper: Element, length: number | null) => {
    const displayElement = wrapper.querySelector('.length-display span');
    if (displayElement) {
      displayElement.textContent = length !== null 
        ? `Length: ${length.toFixed(3)} m`
        : 'No element selected';
    }
  };

  return <div ref={containerRef} className="length-measurement-section" />;
}; 