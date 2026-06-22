import * as OBC from '@thatopen/components';
import type * as OBF from '@thatopen/fragments';
import { handleBIMError, ErrorType } from '../../utils/errorHandler';
import { PropertyEditingService } from './propertyEditingService';

// setupIfcLoader() is called fresh on every file-load action across several
// call sites. Without tracking the last-registered listener per
// FragmentsManager, each call would stack another onFragmentsLoaded
// subscription on the shared singleton, leaking listeners for the life of
// the session and firing onModelLoaded callbacks multiple times per load.
const activeModelLoadedListeners = new WeakMap<
  OBC.FragmentsManager,
  (group: OBF.FragmentsGroup) => void
>();

export interface IfcLoaderHandle {
  loadFromBuffer: (data: Uint8Array) => Promise<void>;
  onStartedLoading: (cb: () => void) => void;
  onModelLoaded: (cb: (modelId: string) => void) => void;
}

/**
 * Sets up the IFC loader with proper configuration
 * @param components - The BIM components instance
 * @param propertyEditingService - Optional property editing service for buffer storage
 * @returns An IFC loader handle with load methods
 */
export const setupIfcLoader = (
  components: OBC.Components,
  propertyEditingService?: PropertyEditingService
): IfcLoaderHandle => {
  const ifcLoader = components.get(OBC.IfcLoader);
  const fragmentsManager = components.get(OBC.FragmentsManager);

  // Store buffer for property editing
  let lastLoadedBuffer: Uint8Array | null = null;

  // Configure WebIFC path from environment
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const path = (import.meta as any).env?.VITE_WEBIFC_PATH as string | undefined;
    if (path) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ifcLoader.settings as any).wasm = { path, absolute: true };
    }
  } catch (error) {
    console.warn('Failed to configure WebIFC path:', error);
    // Continue with default path
  }

  const onStartedLoading = (cb: () => void) => {
    try {
      ifcLoader.onIfcStartedLoading.add(cb);
    } catch (error) {
      handleBIMError(
        ErrorType.MODEL_LOADING,
        'Failed to add loading callback',
        { error },
        'setupIfcLoader'
      );
    }
  };

  const onModelLoaded = (cb: (modelId: string) => void) => {
    try {
      const previousListener = activeModelLoadedListeners.get(fragmentsManager);
      if (previousListener) {
        fragmentsManager.onFragmentsLoaded.remove(previousListener);
      }

      const listener = (group: OBF.FragmentsGroup) => {
        cb(group.uuid);
        // Store the original IFC buffer if property editing service is available
        if (propertyEditingService && lastLoadedBuffer) {
          propertyEditingService.storeOriginalIfcBuffer(group.uuid, lastLoadedBuffer);
        }
      };

      activeModelLoadedListeners.set(fragmentsManager, listener);
      fragmentsManager.onFragmentsLoaded.add(listener);
    } catch (error) {
      handleBIMError(
        ErrorType.MODEL_LOADING,
        'Failed to add model loaded callback',
        { error },
        'setupIfcLoader'
      );
    }
  };

  const loadFromBuffer = async (data: Uint8Array): Promise<void> => {
    try {
      // Store buffer for property editing
      lastLoadedBuffer = data;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ifcLoader.load as any)(data);
    } catch (error) {
      handleBIMError(
        ErrorType.MODEL_LOADING,
        'Failed to load IFC from buffer',
        { error, dataSize: data.length },
        'setupIfcLoader'
      );
      throw error;
    }
  };

  return { loadFromBuffer, onStartedLoading, onModelLoaded };
};
