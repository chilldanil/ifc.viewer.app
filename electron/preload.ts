import { contextBridge, ipcRenderer } from 'electron';
import * as fs from 'fs/promises';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File dialog APIs
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: (defaultPath?: string) =>
    ipcRenderer.invoke('dialog:saveFile', defaultPath),

  // File system operations (read-only for security)
  readFile: async (filePath: string): Promise<ArrayBuffer> => {
    try {
      const buffer = await fs.readFile(filePath);
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  },

  // Write file (for screenshots, exports, etc.)
  writeFile: async (filePath: string, data: ArrayBuffer): Promise<void> => {
    try {
      const buffer = Buffer.from(data);
      await fs.writeFile(filePath, buffer);
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  },

  // Listen for file opened from menu
  onFileOpened: (callback: (filePath: string) => void) => {
    const subscription = (_event: any, filePath: string) => callback(filePath);
    ipcRenderer.on('file-opened', subscription);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('file-opened', subscription);
    };
  },

  // File system browsing
  listDir: (dirPath?: string) => ipcRenderer.invoke('fs:listDir', dirPath),

  // AI Visualizer (Replicate) - executed in main process via IPC
  generateAiImage: (args: { prompt: string; imageBase64: string; apiKey: string }) =>
    ipcRenderer.invoke('ai:generate', args),

  // Platform detection
  platform: process.platform,
  isElectron: true,
});

// TypeScript type definitions for the exposed API
export interface ElectronAPI {
  openFileDialog: () => Promise<string | null>;
  saveFileDialog: (defaultPath?: string) => Promise<string | null>;
  readFile: (filePath: string) => Promise<ArrayBuffer>;
  writeFile: (filePath: string, data: ArrayBuffer) => Promise<void>;
  onFileOpened: (callback: (filePath: string) => void) => () => void;
  listDir: (
    dirPath?: string
  ) => Promise<{
    path: string;
    parent: string;
    entries: Array<{ name: string; path: string; isDirectory: boolean; isIfc: boolean }>;
    error?: string;
  }>;
  generateAiImage: (args: { prompt: string; imageBase64: string; apiKey: string }) => Promise<{ image: string }>;
  platform: NodeJS.Platform;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
