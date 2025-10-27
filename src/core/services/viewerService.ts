import * as OBC from '@thatopen/components';
import { handleBIMError, ErrorType } from '../../utils/errorHandler';

export interface WorldHandle {
  world: OBC.World;
  dispose: () => void;
}

/**
 * Creates a new BIM world bound to a container element with scene, renderer, camera and grid
 * @param components - The BIM components instance
 * @param container - The HTML container element
 * @returns A world handle with cleanup function
 * @throws {Error} If world creation fails
 */
export const createWorld = async (
  components: OBC.Components,
  container: HTMLElement
): Promise<WorldHandle> => {
  try {
    const worlds = components.get(OBC.Worlds);
    const world = worlds.create();

    const sceneComponent = new OBC.SimpleScene(components);
    sceneComponent.setup();
    world.scene = sceneComponent;

    const rendererComponent = new OBC.SimpleRenderer(components, container);
    world.renderer = rendererComponent;

    const cameraComponent = new OBC.OrthoPerspectiveCamera(components);
    world.camera = cameraComponent;

    try {
      await cameraComponent.controls.setLookAt(3, 3, 3, 0, 0, 0);
    } catch (error) {
      console.warn('Failed to set initial camera position:', error);
      // Continue - this is not critical
    }

    // Small delay to stabilize
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Add grid
    try {
      const grids = components.get(OBC.Grids);
      grids.create(world);
    } catch (error) {
      console.warn('Failed to create grid:', error);
      // Continue - grid is optional
    }

    const handleResize = () => {
      try {
        rendererComponent.resize();
        cameraComponent.updateAspect();
      } catch (error) {
        handleBIMError(
          ErrorType.RENDER_ERROR,
          'Failed to handle resize',
          { error },
          'createWorld'
        );
      }
    };

    container.addEventListener('resize', handleResize);

    const dispose = () => {
      try {
        container.removeEventListener('resize', handleResize);
      } catch (error) {
        console.warn('Failed to remove resize listener:', error);
      }

      try {
        const worldsList = components.get(OBC.Worlds);
        worldsList.delete(world);
      } catch (error) {
        console.warn('Failed to delete world from worlds list:', error);
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (world as any).dispose?.();
      } catch (error) {
        console.warn('Failed to dispose world:', error);
      }
    };

    return { world, dispose };
  } catch (error) {
    handleBIMError(ErrorType.BIM_INITIALIZATION, 'Failed to create world', { error }, 'createWorld');
    throw error;
  }
};
