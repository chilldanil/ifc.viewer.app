import React, { useCallback, useState } from 'react';
import * as OBC from '@thatopen/components';
import { useBIM } from '../../context/BIMContext';
import { fitSceneToView } from '../../utils/cameraUtils';
import type { CameraNavMode, CameraProjectionMode } from '../../hooks/useCameraControls';
import { Button, Select, Stack, Status, Toggle } from '../../ui';

export interface CameraToolbarMenuProps {
  navMode: CameraNavMode;
  projection: CameraProjectionMode;
  setNavMode: (mode: CameraNavMode) => boolean;
  setProjection: (projection: CameraProjectionMode) => boolean;
  cameraAvailable: boolean;
}

export const CameraToolbarMenu: React.FC<CameraToolbarMenuProps> = ({
  navMode,
  projection,
  setNavMode,
  setProjection,
  cameraAvailable,
}) => {
  const { world, zoomToSelection, setZoomToSelection } = useBIM();
  const [userInput, setUserInput] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCamera = useCallback(() => {
    if (!world?.camera) {return null;}
    if (!(world.camera instanceof (OBC as any).OrthoPerspectiveCamera)) {
      return null;
    }
    return world.camera as unknown as OBC.OrthoPerspectiveCamera;
  }, [world]);

  const handleNavModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as CameraNavMode;
    if (projection === 'Orthographic' && selected === 'FirstPerson') {
      setError('First person is not compatible with orthographic projection');
      return;
    }
    setError(null);
    setNavMode(selected);
  };

  const handleProjectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as CameraProjectionMode;
    if (selected === 'Orthographic' && navMode === 'FirstPerson') {
      setError('Orthographic is not compatible with first person mode');
      return;
    }
    setError(null);
    setProjection(selected);
  };

  const handleUserInputChange = (checked: boolean) => {
    const camera = getCamera();
    if (!camera) {return;}

    try {
      camera.setUserInput(checked);
      setUserInput(checked);
    } catch (err) {
      console.warn('Failed to toggle camera user input:', err);
    }
  };

  const handleFitToModel = async () => {
    if (!world) {return;}
    try {
      await fitSceneToView(world, { paddingRatio: 1.2 });
    } catch (err) {
      console.warn('Failed to fit camera to model:', err);
    }
  };

  if (!cameraAvailable) {
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
