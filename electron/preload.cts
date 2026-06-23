import { contextBridge, ipcRenderer } from 'electron';
import * as fs from 'fs/promises';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File dialog APIs
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: (defaultPath?: string) => ipcRenderer.invoke('dialog:saveFile', defaultPath),

  // Project (.ifcproj) dialogs
  saveProjectDialog: (defaultName?: string) =>
    ipcRenderer.invoke('dialog:saveProject', defaultName),
  openProjectDialog: () => ipcRenderer.invoke('dialog:openProject'),

  // Small-JSON + binary blob app storage (recent projects, auto-resume,
  // render-gallery index + images)
  appStorage: {
    readJson: (key: string) => ipcRenderer.invoke('app-storage:read-json', key),
    writeJson: (key: string, value: unknown) =>
      ipcRenderer.invoke('app-storage:write-json', { key, value }),
    writeBytes: (ns: string, key: string, data: ArrayBuffer) =>
      ipcRenderer.invoke('app-storage:write-bytes', { ns, key, data }),
    readBytes: (ns: string, key: string) =>
      ipcRenderer.invoke('app-storage:read-bytes', { ns, key }),
    deleteBytes: (ns: string, key: string) =>
      ipcRenderer.invoke('app-storage:delete-bytes', { ns, key }),
    listBytes: (ns: string) => ipcRenderer.invoke('app-storage:list-bytes', ns),
  },

  // File system operations (read-only for security)
  readFile: async (filePath: string): Promise<ArrayBuffer> => {
    try {
      const buffer = await fs.readFile(filePath);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
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

  // AI Visualization (Replicate) - executed in main process via IPC
  generateAiImage: (args: {
    prompt: string;
    imageBase64: string;
    apiKey?: string;
    mode?: string;
    negativePrompt?: string;
    seed?: number;
    aspectRatio?: string;
    outputFormat?: 'jpg' | 'png';
    intensity?: 'subtle' | 'balanced' | 'strong';
  }) => ipcRenderer.invoke('ai:generate', args),

  // Encrypted-at-rest storage for the user's Replicate API key (OS keychain
  // via safeStorage), in place of plaintext localStorage.
  secureStorage: {
    getApiKey: (): Promise<string> => ipcRenderer.invoke('secure-storage:get-api-key'),
    setApiKey: (apiKey: string): Promise<boolean> =>
      ipcRenderer.invoke('secure-storage:set-api-key', apiKey),
  },

  // Platform detection
  platform: process.platform,
  isElectron: true,
});

// TypeScript type definitions for the exposed API
export interface ElectronAPI {
  openFileDialog: () => Promise<string | null>;
  saveFileDialog: (defaultPath?: string) => Promise<string | null>;
  saveProjectDialog: (defaultName?: string) => Promise<string | null>;
  openProjectDialog: () => Promise<string | null>;
  appStorage: {
    readJson: <T = unknown>(key: string) => Promise<T | null>;
    writeJson: (key: string, value: unknown) => Promise<boolean>;
    writeBytes: (ns: string, key: string, data: ArrayBuffer) => Promise<boolean>;
    readBytes: (ns: string, key: string) => Promise<ArrayBuffer | null>;
    deleteBytes: (ns: string, key: string) => Promise<boolean>;
    listBytes: (ns: string) => Promise<string[]>;
  };
  readFile: (filePath: string) => Promise<ArrayBuffer>;
  writeFile: (filePath: string, data: ArrayBuffer) => Promise<void>;
  onFileOpened: (callback: (filePath: string) => void) => () => void;
  listDir: (dirPath?: string) => Promise<{
    path: string;
    parent: string;
    entries: Array<{ name: string; path: string; isDirectory: boolean; isIfc: boolean }>;
    error?: string;
  }>;
  generateAiImage: (args: {
    prompt: string;
    imageBase64: string;
    apiKey?: string;
    mode?: string;
    negativePrompt?: string;
    seed?: number;
    aspectRatio?: string;
    outputFormat?: 'jpg' | 'png';
    intensity?: 'subtle' | 'balanced' | 'strong';
  }) => Promise<{ image: string }>;
  secureStorage: {
    getApiKey: () => Promise<string>;
    setApiKey: (apiKey: string) => Promise<boolean>;
  };
  platform: NodeJS.Platform;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
