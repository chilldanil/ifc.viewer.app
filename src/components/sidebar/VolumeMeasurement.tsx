import React, { useEffect, useRef, useState } from 'react';
import * as OBCF from '@thatopen/components-front';
import * as BUI from '@thatopen/ui';
import { useBIM } from '../../context/BIMContext';

// Local helper to ensure BUI.Manager is initialised only once
const ensureBUI = () => {
  const mgr: any = BUI.Manager as any;
  if (!mgr.__initialised) {
    try {
      BUI.Manager.init();
    } catch (err) {
      // ignore "already initialised" errors  
    }
    mgr.__initialised = true;
  }
};

export const VolumeMeasurement: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { components, world } = useBIM();
  const [isEnabled, setIsEnabled] = useState(false);
  const [currentVolume, setCurrentVolume] = useState<number | null>(null);
  const volumeMeasurementRef = useRef<OBCF.VolumeMeasurement | null>(null);
  const highlighterRef = useRef<OBCF.Highlighter | null>(null);

  useEffect(() => {
    if (!containerRef.current || !components || !world) {return;}

    ensureBUI();

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Get the volume measurement component
    const dimensions = components.get(OBCF.VolumeMeasurement);
    volumeMeasurementRef.current = dimensions;
    dimensions.world = world;

    // Get the highlighter component (should already be set up in Viewport)
    const highlighter = components.get(OBCF.Highlighter);
    highlighterRef.current = highlighter;

    // Build UI markup using BUI components
    const html = `
      <div class="volume-measurement-controls">
        <div style="margin-bottom: 12px;">
          <bim-button label="${isEnabled ? 'Disable' : 'Enable'} Volume Measurement" name="toggleVolume"></bim-button>
        </div>
        
        <div style="margin-bottom: 12px;">
          <bim-label>Instructions:</bim-label>
          <div style="font-size: 0.85rem; color: #666; margin-top: 4px; line-height: 1.4;">
            • Left click on an element to measure its volume<br/>
          </div>
        </div>

        <div class="volume-display" style="margin-bottom: 12px; padding: 8px; background: #f8f9fa; border-radius: 4px; min-height: 40px; display: flex; align-items: center; justify-content: center;">
          <span style="color: #666; font-style: italic;">
            ${currentVolume !== null ? `Volume: ${currentVolume.toFixed(3)} m³` : 'No element selected'}
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <bim-button label="Clear All Measurements" name="clearAll"></bim-button>
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    containerRef.current.appendChild(wrapper);

    // Toggle volume measurement handler
    const toggleBtn = wrapper.querySelector('bim-button[name="toggleVolume"]') as any;
    toggleBtn?.addEventListener('click', () => {
      const newEnabled = !isEnabled;
      setIsEnabled(newEnabled);
      dimensions.enabled = newEnabled;
      
      toggleBtn.label = newEnabled ? 'Disable Volume Measurement' : 'Enable Volume Measurement';
      console.log(`Volume measurement ${newEnabled ? 'enabled' : 'disabled'}`);
      
      if (!newEnabled) {
        // Clear measurements when disabling
        dimensions.clear();
        setCurrentVolume(null);
        updateVolumeDisplay(wrapper, null);
      }
    });

    // Clear all handler
    const clearBtn = wrapper.querySelector('bim-button[name="clearAll"]') as any;
    clearBtn?.addEventListener('click', () => {
      dimensions.clear();
      highlighter.clear();
      setCurrentVolume(null);
      updateVolumeDisplay(wrapper, null);
      console.log('All volume measurements cleared');
    });

    // Set up highlighter event handlers for volume calculation
    const handleHighlight = (event: any) => {
      if (!isEnabled) {return;}
      
      try {
        const volume = dimensions.getVolumeFromFragments(event);
        console.log('Calculated volume:', volume);
        setCurrentVolume(volume);
        updateVolumeDisplay(wrapper, volume);
      } catch (error) {
        console.warn('Error calculating volume:', error);
        setCurrentVolume(null);
        updateVolumeDisplay(wrapper, null);
      }
    };

    const handleClear = () => {
      dimensions.clear();
      setCurrentVolume(null);
      updateVolumeDisplay(wrapper, null);
    };

    // Add event listeners to highlighter
    if (highlighter.events?.select?.onHighlight) {
      highlighter.events.select.onHighlight.add(handleHighlight);
    }
    
    if (highlighter.events?.select?.onClear) {
      highlighter.events.select.onClear.add(handleClear);
    }

    // Cleanup listeners on unmount
    return () => {
      if (highlighter.events?.select?.onHighlight) {
        highlighter.events.select.onHighlight.remove(handleHighlight);
      }
      if (highlighter.events?.select?.onClear) {
        highlighter.events.select.onClear.remove(handleClear);
      }
      
      if (dimensions) {
        dimensions.enabled = false;
        dimensions.clear();
      }
      
      const clone = wrapper.cloneNode(false);
      wrapper.parentElement?.replaceChild(clone, wrapper);
    };
  }, [components, world, isEnabled, currentVolume]);

  // Helper function to update the volume display
  const updateVolumeDisplay = (wrapper: Element, volume: number | null) => {
    const displayElement = wrapper.querySelector('.volume-display span');
    if (displayElement) {
      displayElement.textContent = volume !== null 
        ? `Volume: ${volume.toFixed(3)} m³`
        : 'No element selected';
    }
  };

  return <div ref={containerRef} className="volume-measurement-section" />;
}; 