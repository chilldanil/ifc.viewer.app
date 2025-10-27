import React, { useEffect, useRef } from 'react';
import * as OBC from '@thatopen/components';
import { useBIM } from '../../context/BIMContext';
import './CameraSection.css';
import { ensureBUIInitialised } from '../../utils/bui';
import { fitSceneToView } from '../../utils/cameraUtils';

export const CameraSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { world, zoomToSelection, setZoomToSelection } = useBIM();

  useEffect(() => {
    if (!containerRef.current || !world || !world.camera) {return;}

    // Ensure camera is OrthoPerspectiveCamera, otherwise skip rendering UI
    if (!(world.camera instanceof (OBC as any).OrthoPerspectiveCamera)) {
      console.warn('CameraSection: current world camera is not an OrthoPerspectiveCamera. Skipping UI render.');
      return;
    }

    const camera = world.camera as unknown as OBC.OrthoPerspectiveCamera;

    ensureBUIInitialised();

    // clear previous content
    containerRef.current.innerHTML = '';

    // Build UI markup
    const html = `
      <div class="camera-controls-wrapper">
        <bim-dropdown label="Navigation mode" name="navMode" required>
          <bim-option label="Orbit" checked></bim-option>
          <bim-option label="FirstPerson"></bim-option>
          <bim-option label="Plan"></bim-option>
        </bim-dropdown>

        <bim-dropdown label="Camera projection" name="projection" required style="margin-top:8px;">
          <bim-option label="Perspective" checked></bim-option>
          <bim-option label="Orthographic"></bim-option>
        </bim-dropdown>

        <bim-checkbox label="Allow user input" name="userInput" checked style="margin-top:8px;"></bim-checkbox>

        <bim-checkbox label="Fly to Selection" name="flyToSelection" ${zoomToSelection ? 'checked' : ''} style="margin-top:8px;"></bim-checkbox>

        <bim-button label="Fit to model" name="fitButton" style="margin-top:12px;"></bim-button>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    containerRef.current.appendChild(wrapper);

    // Navigation mode handler
    const navDropdown = wrapper.querySelector('bim-dropdown[name="navMode"]') as any;
    navDropdown?.addEventListener('change', (e: any) => {
      const selected = e.target.value?.[0] as OBC.NavModeID;
      if (!selected) {return;}
      const currentProj = camera.projection.current;
      if (currentProj === 'Orthographic' && selected === 'FirstPerson') {
        console.warn('First person is not compatible with orthographic projection');
        // revert selection to previous value
        (e.target as any).value = [camera.mode.id];
        return;
      }
      try {
        camera.set(selected);
      } catch (err) {
        console.warn('Failed to set camera navigation mode:', err);
      }
    });

    // Projection handler
    const projDropdown = wrapper.querySelector('bim-dropdown[name="projection"]') as any;
    projDropdown?.addEventListener('change', (e: any) => {
      const selected = e.target.value?.[0] as OBC.CameraProjection;
      if (!selected) {return;}
      const isOrtho = selected === 'Orthographic';
      const isFirstPerson = camera.mode.id === 'FirstPerson';
      if (isOrtho && isFirstPerson) {
        console.warn('First person is not compatible with orthographic projection');
        (e.target as any).value = [camera.projection.current];
        return;
      }
      try {
        camera.projection.set(selected);
      } catch (err) {
        console.warn('Failed to set camera projection:', err);
      }
    });

    // User input toggle
    const userCheckbox = wrapper.querySelector('bim-checkbox[name="userInput"]') as any;
    userCheckbox?.addEventListener('change', (e: any) => {
      const allow = e.target.checked;
      try {
        camera.setUserInput(allow);
      } catch (err) {
        console.warn('Failed to toggle camera user input:', err);
      }
    });

    // Fly to Selection toggle
    const flyToSelectionCheckbox = wrapper.querySelector('bim-checkbox[name="flyToSelection"]') as any;
    flyToSelectionCheckbox?.addEventListener('change', (e: any) => {
      const enabled = e.target.checked;
      setZoomToSelection(enabled);
    });

    // Fit button
    const fitBtn = wrapper.querySelector('bim-button[name="fitButton"]') as any;
    fitBtn?.addEventListener('click', async () => {
      try {
        await fitSceneToView(world, { paddingRatio: 1.2 });
      } catch (err) {
        console.warn('Failed to fit camera to model:', err);
      }
    });

    // Cleanup listeners on unmount
    return () => {
      const clone = wrapper.cloneNode(false);
      wrapper.parentElement?.replaceChild(clone, wrapper);
    };
  }, [world, zoomToSelection]);

  return <div ref={containerRef} className="camera-section" />;
}; 