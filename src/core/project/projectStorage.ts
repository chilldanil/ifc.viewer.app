import { getElectronAPI } from '../../utils/electronUtils';

/** Where a project lives on disk. `path` is null on the web (no stable path). */
export interface ProjectLocation {
  path: string | null;
  name: string;
}

export interface OpenedProject {
  bytes: Uint8Array;
  location: ProjectLocation;
}

export interface RecentProject {
  name: string;
  path: string;
  savedAt: string;
}

const RECENT_KEY = 'recent-projects';
const RECENT_LIMIT = 10;

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
    return bytes.buffer;
  }
  return bytes.slice().buffer;
};

const baseName = (filePath: string): string => filePath.split(/[/\\]/).pop() || filePath;

const ensureExtension = (name: string): string =>
  name.toLowerCase().endsWith('.ifcproj') ? name : `${name}.ifcproj`;

// ============================================================================
// Save
// ============================================================================

/**
 * Write project bytes to an already-known path (Electron "Save"). On the web,
 * where there is no stable path, returns null so the caller falls back to
 * saveProjectBytesAs.
 */
export const saveProjectBytesToPath = async (
  bytes: Uint8Array,
  path: string
): Promise<ProjectLocation | null> => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    return null;
  }
  await electronAPI.writeFile(path, toArrayBuffer(bytes));
  return { path, name: baseName(path) };
};

/**
 * Prompt for a location and write project bytes ("Save As"). Returns the chosen
 * location, or null if the user cancelled.
 */
export const saveProjectBytesAs = async (
  bytes: Uint8Array,
  defaultName: string
): Promise<ProjectLocation | null> => {
  const electronAPI = getElectronAPI();
  const fileName = ensureExtension(defaultName);

  if (electronAPI) {
    const path = await electronAPI.saveProjectDialog(fileName);
    if (!path) {
      return null;
    }
    await electronAPI.writeFile(path, toArrayBuffer(bytes));
    return { path, name: baseName(path) };
  }

  // Web fallback: trigger a download.
  const blob = new Blob([toArrayBuffer(bytes)], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { path: null, name: fileName };
};

// ============================================================================
// Open
// ============================================================================

const readWebProjectFile = (): Promise<OpenedProject | null> =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ifcproj';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const buffer = await file.arrayBuffer();
      resolve({ bytes: new Uint8Array(buffer), location: { path: null, name: file.name } });
    };
    input.click();
  });

/** Prompt for and read a project file. Returns null if cancelled. */
export const openProjectBytes = async (): Promise<OpenedProject | null> => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    return readWebProjectFile();
  }

  const path = await electronAPI.openProjectDialog();
  if (!path) {
    return null;
  }
  const buffer = await electronAPI.readFile(path);
  return { bytes: new Uint8Array(buffer), location: { path, name: baseName(path) } };
};

/** Read a project from a known path (Electron "Recent"). */
export const readProjectBytesFromPath = async (path: string): Promise<OpenedProject> => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    throw new Error('Opening by path is only available in the desktop app.');
  }
  const buffer = await electronAPI.readFile(path);
  return { bytes: new Uint8Array(buffer), location: { path, name: baseName(path) } };
};

// ============================================================================
// Recent projects (desktop only — web has no stable paths to reopen)
// ============================================================================

export const getRecentProjects = async (): Promise<RecentProject[]> => {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    return [];
  }
  try {
    const list = (await electronAPI.appStorage.readJson(RECENT_KEY)) as RecentProject[] | null;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const addRecentProject = async (entry: RecentProject): Promise<void> => {
  const electronAPI = getElectronAPI();
  if (!electronAPI || !entry.path) {
    return;
  }
  try {
    const existing = await getRecentProjects();
    const deduped = existing.filter((item) => item.path !== entry.path);
    const next = [entry, ...deduped].slice(0, RECENT_LIMIT);
    await electronAPI.appStorage.writeJson(RECENT_KEY, next);
  } catch (error) {
    console.warn('Failed to update recent projects', error);
  }
};
