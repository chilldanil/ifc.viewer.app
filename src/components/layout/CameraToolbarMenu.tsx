import React, { useCallback, useEffect, useState } from 'react';
import * as OBC from '@thatopen/components';
import { useBIM } from '../../context/BIMContext';
import { fitSceneToView } from '../../utils/cameraUtils';
import { Button, Select, Stack, Status, Toggle } from '../../ui';

type NavMode = 'Orbit' | 'FirstPerson' | 'Plan';
type Projection = 'Perspective' | 'Orthographic';

export const CameraToolbarMenu: React.FC = () => {
  const { world, zoomToSelection, setZoomToSelection } = useBIM();
  const [navMode, setNavMode] = useState<NavMode>('Orbit');
  const [projection, setProjection] = useState<Projection>('Perspective');
  const [userInput, setUserInput] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCamera = useCallback(() => {
    if (!world?.camera) return null;
    if (!(world.camera instanceof (OBC as any).OrthoPerspectiveCamera)) {
      return null;
    }
    return world.camera as unknown as OBC.OrthoPerspectiveCamera;
  }, [world]);

  useEffect(() => {
    const camera = getCamera();
    if (camera) {
      setNavMode(camera.mode.id as NavMode);
      setProjection(camera.projection.current as Projection);
    }
  }, [getCamera]);

  const handleNavModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as NavMode;
    const camera = getCamera();
    if (!camera) return;

    if (projection === 'Orthographic' && selected === 'FirstPerson') {
      setError('First person is not compatible with orthographic projection');
      return;
    }

    setError(null);
    try {
      camera.set(selected as OBC.NavModeID);
      setNavMode(selected);
    } catch (err) {
      console.warn('Failed to set camera navigation mode:', err);
    }
  };

  const handleProjectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as Projection;
    const camera = getCamera();
    if (!camera) return;

    if (selected === 'Orthographic' && navMode === 'FirstPerson') {
      setError('Orthographic is not compatible with first person mode');
      return;
    }

    setError(null);
    try {
      camera.projection.set(selected as OBC.CameraProjection);
      setProjection(selected);
    } catch (err) {
      console.warn('Failed to set camera projection:', err);
    }
  };

  const handleUserInputChange = (checked: boolean) => {
    const camera = getCamera();
    if (!camera) return;

    try {
      camera.setUserInput(checked);
      setUserInput(checked);
    } catch (err) {
      console.warn('Failed to toggle camera user input:', err);
    }
  };

  const handleFitToModel = async () => {
    if (!world) return;
    try {
      await fitSceneToView(world, { paddingRatio: 1.2 });
    } catch (err) {
      console.warn('Failed to fit camera to model:', err);
    }
  };

  const camera = getCamera();
  if (!camera) {
    return (
      <div className="toolbar-camera-menu">
        <div className="toolbar-camera-section">
          <Status variant="warning">Camera controls not available</Status>
        </div>
      </div>
    );
  }

  return (
    <div className="toolbar-camera-menu">
      <div className="toolbar-camera-section">
        <Stack gap="sm">
          {error && <Status variant="warning">{error}</Status>}

          <Select
            label="Navigation Mode"
            value={navMode}
            onChange={handleNavModeChange}
            options={[
              { value: 'Orbit', label: 'Orbit' },
              { value: 'FirstPerson', label: 'First Person' },
              { value: 'Plan', label: 'Plan' },
            ]}
          />

          <Select
            label="Projection"
            value={projection}
            onChange={handleProjectionChange}
            options={[
              { value: 'Perspective', label: 'Perspective' },
              { value: 'Orthographic', label: 'Orthographic' },
            ]}
          />

          <Toggle
            checked={userInput}
            onChange={handleUserInputChange}
            label="Allow user input"
          />

          <Toggle
            checked={zoomToSelection}
            onChange={setZoomToSelection}
            label="Fly to selection"
          />

          <Button variant="primary" onClick={handleFitToModel}>
            Fit to Model
          </Button>
        </Stack>
      </div>
    </div>
  );
};

export default CameraToolbarMenu;
