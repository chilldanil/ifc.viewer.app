/**
 * Electron integration utilities for native file dialogs and operations
 */

// Type guard to check if we're running in Electron
export function isElectron(): boolean {
  return !!(window as any).electronAPI;
}

// Get the Electron API if available
export function getElectronAPI() {
  if (isElectron()) {
    return (window as any).electronAPI;
  }
  return null;
}

/**
 * Open a native file dialog and return the selected file
 * Falls back to web behavior if not in Electron
 */
export async function openFileDialog(): Promise<File | null> {
  const electronAPI = getElectronAPI();

  if (electronAPI) {
    try {
      const filePath = await electronAPI.openFileDialog();
      if (!filePath) return null;

      // Read the file using Electron's file system access
      const arrayBuffer = await electronAPI.readFile(filePath);
      const fileName = filePath.split(/[/\\]/).pop() || 'model.ifc';

      // Create a File object from the ArrayBuffer
      const blob = new Blob([arrayBuffer]);
      return new File([blob], fileName, { type: 'application/ifc' });
    } catch (error) {
      console.error('Error opening file with Electron:', error);
      return null;
    }
  }

  // Fallback to web file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ifc';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      resolve(file || null);
    };
    input.click();
  });
}

/**
 * Save a file using native file dialog
 * @param data The data to save (as ArrayBuffer or string)
 * @param defaultPath Default file name/path
 */
export async function saveFileDialog(
  data: ArrayBuffer | string,
  defaultPath?: string
): Promise<boolean> {
  const electronAPI = getElectronAPI();

  if (electronAPI) {
    try {
      const filePath = await electronAPI.saveFileDialog(defaultPath);
      if (!filePath) return false;

      const arrayBuffer = typeof data === 'string'
        ? new TextEncoder().encode(data).buffer
        : data;

      await electronAPI.writeFile(filePath, arrayBuffer);
      return true;
    } catch (error) {
      console.error('Error saving file with Electron:', error);
      return false;
    }
  }

  // Fallback to web download
  const blob = typeof data === 'string'
    ? new Blob([data], { type: 'text/plain' })
    : new Blob([data]);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultPath || 'file.txt';
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Listen for files opened from the application menu (Electron only)
 */
export function onFileOpened(callback: (filePath: string) => void): (() => void) | null {
  const electronAPI = getElectronAPI();

  if (electronAPI && electronAPI.onFileOpened) {
    return electronAPI.onFileOpened(callback);
  }

  return null;
}

/**
 * Get platform information
 */
export function getPlatform(): string {
  const electronAPI = getElectronAPI();
  if (electronAPI) {
    return electronAPI.platform;
  }
  return navigator.platform;
}
