import { useCallback, useEffect, useState } from 'react';
import * as OBC from '@thatopen/components';

export type CameraNavMode = OBC.NavModeID;
export type CameraProjectionMode = OBC.CameraProjection;

/**
 * Shared camera nav-mode/projection state, used by both the Camera toolbar
 * menu and the spacebar quick menu so they stay in sync and share the
 * FirstPerson/Orthographic incompatibility rule.
 */
export const useCameraControls = (world: OBC.World | null | undefined) => {
  const [navMode, setNavModeState] = useState<CameraNavMode>('Orbit');
  const [projection, setProjectionState] = useState<CameraProjectionMode>('Perspective');

  const getCamera = useCallback(() => {
    if (!world?.camera) {return null;}
    if (!(world.camera instanceof (OBC as any).OrthoPerspectiveCamera)) {return null;}
    return world.camera as unknown as OBC.OrthoPerspectiveCamera;
  }, [world]);

  useEffect(() => {
    const camera = getCamera();
    if (!camera) {
      return undefined;
    }

    setNavModeState(camera.mode.id);
    setProjectionState(camera.projection.current);

    const handleProjectionChanged = () => setProjectionState(camera.projection.current);
    camera.projection.onChanged.add(handleProjectionChanged);
    return () => camera.projection.onChanged.remove(handleProjectionChanged);
  }, [getCamera]);

  const setNavMode = useCallback((mode: CameraNavMode): boolean => {
    const camera = getCamera();
    if (!camera) {return false;}
    if (projection === 'Orthographic' && mode === 'FirstPerson') {return false;}

    try {
      camera.set(mode);
      setNavModeState(mode);
      return true;
    } catch (err) {
      console.warn('Failed to set camera navigation mode:', err);
      return false;
    }
  }, [getCamera, projection]);

  const setProjection = useCallback((proj: CameraProjectionMode): boolean => {
    const camera = getCamera();
    if (!camera) {return false;}
    if (proj === 'Orthographic' && navMode === 'FirstPerson') {return false;}

    try {
      camera.projection.set(proj);
      setProjectionState(proj);
      return true;
    } catch (err) {
      console.warn('Failed to set camera projection:', err);
      return false;
    }
  }, [getCamera, navMode]);

  return {
    navMode,
    projection,
    setNavMode,
    setProjection,
    cameraAvailable: Boolean(getCamera()),
  };
};
