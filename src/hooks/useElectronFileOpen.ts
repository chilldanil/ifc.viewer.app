import { useEffect } from 'react';
import { onFileOpened, getElectronAPI, isElectron } from '../utils/electronUtils';
import { setupIfcLoader } from '../core/services/ifcLoaderService';
import type { Components } from '@thatopen/components';

/**
 * Hook to handle file opening from Electron's native menu
 */
export function useElectronFileOpen(components: Components | null) {
  useEffect(() => {
    if (!components || !isElectron()) {
      return;
    }

    const electronAPI = getElectronAPI();
    if (!electronAPI) return;

    console.log('Setting up Electron file open listener');

    // Handler for files opened via menu
    const handleFileOpened = async (filePath: string) => {
      console.log('File opened from Electron menu:', filePath);
      try {
        // Read file using Electron API
        const arrayBuffer = await electronAPI.readFile(filePath);
        const uint8Array = new Uint8Array(arrayBuffer);

        // Load the IFC file
        const { loadFromBuffer } = setupIfcLoader(components);
        await loadFromBuffer(uint8Array);
      } catch (error) {
        console.error('Failed to load IFC file from Electron:', error);
      }
    };

    // Subscribe to file-opened events
    const unsubscribe = onFileOpened(handleFileOpened);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [components]);
}
