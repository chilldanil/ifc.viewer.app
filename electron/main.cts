import { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import Replicate from 'replicate';

let mainWindow: BrowserWindow | null = null;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a1a',
    title: 'IFC Viewer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      // Renderer never gets direct Node access; all privileged operations
      // (fs, dialogs, AI requests) are funneled through the narrow
      // contextBridge API defined in preload.ts.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
    show: false, // Don't show until ready
  });

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) {
    // Development mode
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in the user's default browser. Only allow
  // http(s) targets so renderer content can't trigger file:// or
  // custom-protocol handoffs to the OS shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const { protocol } = new URL(url);
      if (protocol === 'http:' || protocol === 'https:') {
        void shell.openExternal(url);
      }
    } catch {
      // ignore malformed URLs
    }
    return { action: 'deny' };
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createApplicationMenu();
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open IFC File',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            handleOpenFile();
          },
        },
        { type: 'separator' as const },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const },
            ]),
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Handle file opening
async function handleOpenFile() {
  if (!mainWindow) return;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'IFC Files', extensions: ['ifc'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    mainWindow.webContents.send('file-opened', filePath);
  }
}

// IPC Handlers. Registered lazily inside app.whenReady() below — on this
// Electron build, the 'electron' module's exports (ipcMain, app.getPath,
// etc.) aren't fully populated yet at synchronous require-time, so calling
// them at module top level throws "Cannot read properties of undefined".
function registerIpcHandlers() {
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'IFC Files', extensions: ['ifc'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('dialog:saveFile', async (_event, defaultPath?: string) => {
  if (!mainWindow) return null;

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath || 'screenshot.png',
    filters: [
      { name: 'PNG Images', extensions: ['png'] },
      { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

ipcMain.handle('dialog:saveProject', async (_event, defaultName?: string) => {
  if (!mainWindow) return null;

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'untitled.ifcproj',
    filters: [
      { name: 'IFC Viewer Project', extensions: ['ifcproj'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

ipcMain.handle('dialog:openProject', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'IFC Viewer Project', extensions: ['ifcproj'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('fs:listDir', async (_event, dirPath?: string) => {
  try {
    const target = dirPath ? path.resolve(dirPath) : os.homedir();
    const entries = await fs.readdir(target, { withFileTypes: true });
    const filtered = entries
      .filter((entry) => entry.isDirectory() || entry.name.toLowerCase().endsWith('.ifc'))
      .map((entry) => ({
        name: entry.name,
        path: path.join(target, entry.name),
        isDirectory: entry.isDirectory(),
        isIfc: entry.isFile() && entry.name.toLowerCase().endsWith('.ifc'),
      }))
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    return {
      path: target,
      parent: path.dirname(target),
      entries: filtered,
    };
  } catch (error: any) {
    return {
      error: error?.message ?? 'Failed to read directory',
      path: dirPath ?? '',
      parent: '',
      entries: [],
    };
  }
});

// Secure storage for the user's Replicate API key, encrypted at rest via the
// OS keychain (Keychain/DPAPI/libsecret) instead of plaintext localStorage.
const apiKeyStorePath = path.join(app.getPath('userData'), 'replicate-key.enc');

ipcMain.handle('secure-storage:get-api-key', async () => {
  if (!safeStorage.isEncryptionAvailable()) return '';
  try {
    const encrypted = await fs.readFile(apiKeyStorePath);
    return safeStorage.decryptString(encrypted);
  } catch {
    return '';
  }
});

ipcMain.handle('secure-storage:set-api-key', async (_event, apiKey: unknown) => {
  if (typeof apiKey !== 'string') {
    throw new Error('Invalid API key payload');
  }
  if (!safeStorage.isEncryptionAvailable()) return false;
  if (!apiKey) {
    await fs.rm(apiKeyStorePath, { force: true });
    return true;
  }
  const encrypted = safeStorage.encryptString(apiKey);
  await fs.writeFile(apiKeyStorePath, encrypted);
  return true;
});

// Generic small-JSON storage under userData (recent projects, auto-resume
// snapshots, render-gallery index, ...). Keys are sanitized to a flat filename.
const appStorageDir = path.join(app.getPath('userData'), 'storage');

const resolveStorageFile = (key: unknown): string => {
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('Invalid storage key');
  }
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
  return path.join(appStorageDir, `${safe}.json`);
};

ipcMain.handle('app-storage:read-json', async (_event, key: unknown) => {
  try {
    const raw = await fs.readFile(resolveStorageFile(key), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
});

ipcMain.handle('app-storage:write-json', async (_event, payload: unknown) => {
  const { key, value } = (payload ?? {}) as { key?: unknown; value?: unknown };
  const file = resolveStorageFile(key);
  await fs.mkdir(appStorageDir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(value ?? null), 'utf-8');
  return true;
});

// Binary blob storage under userData (render-gallery images, ...), namespaced
// so different features don't collide. Keys/namespaces are sanitized.
const blobStorageDir = path.join(app.getPath('userData'), 'blobs');

const sanitizeSegment = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Invalid storage segment');
  }
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
};

const resolveBlobDir = (ns: unknown): string => path.join(blobStorageDir, sanitizeSegment(ns));
const resolveBlobFile = (ns: unknown, key: unknown): string =>
  path.join(resolveBlobDir(ns), `${sanitizeSegment(key)}.bin`);

ipcMain.handle('app-storage:write-bytes', async (_event, payload: unknown) => {
  const { ns, key, data } = (payload ?? {}) as { ns?: unknown; key?: unknown; data?: unknown };
  if (!(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data as any)) {
    throw new Error('Invalid blob payload');
  }
  const file = resolveBlobFile(ns, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, Buffer.from(data as ArrayBuffer));
  return true;
});

ipcMain.handle('app-storage:read-bytes', async (_event, payload: unknown) => {
  const { ns, key } = (payload ?? {}) as { ns?: unknown; key?: unknown };
  try {
    const buffer = await fs.readFile(resolveBlobFile(ns, key));
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  } catch {
    return null;
  }
});

ipcMain.handle('app-storage:delete-bytes', async (_event, payload: unknown) => {
  const { ns, key } = (payload ?? {}) as { ns?: unknown; key?: unknown };
  await fs.rm(resolveBlobFile(ns, key), { force: true });
  return true;
});

ipcMain.handle('app-storage:list-bytes', async (_event, ns: unknown) => {
  try {
    const entries = await fs.readdir(resolveBlobDir(ns));
    return entries
      .filter((name) => name.endsWith('.bin'))
      .map((name) => name.slice(0, -'.bin'.length));
  } catch {
    return [];
  }
});

ipcMain.handle('ai:generate', async (_event, args: unknown) => {
  if (!args || typeof args !== 'object') {
    throw new Error('Invalid request payload');
  }

  const { prompt, imageBase64, apiKey, negativePrompt, seed, aspectRatio, outputFormat, intensity } =
    args as Record<string, unknown>;

  if (typeof prompt !== 'string' || typeof imageBase64 !== 'string') {
    throw new Error('Invalid request payload');
  }

  const MAX_PROMPT_LENGTH = 2000;
  const MAX_IMAGE_BASE64_LENGTH = 20_000_000; // ~15MB decoded
  if (prompt.length > MAX_PROMPT_LENGTH || imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    throw new Error('Request payload too large');
  }

  const token = (typeof apiKey === 'string' && apiKey.trim()) ? apiKey.trim() : REPLICATE_API_TOKEN;

  if (!token) {
    throw new Error(
      'Replicate API token not provided. Please enter your API token in the AI Visualizer panel.'
    );
  }

  // useFileOutput:false → run() resolves to plain URL strings/arrays instead of
  // FileOutput stream objects, which is what extractUrl expects.
  const replicate = new Replicate({ auth: token, useFileOutput: false });

  const dataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/png;base64,${imageBase64}`;

  // The Replicate client can place prompt text into request handling that
  // requires Latin-1 (ByteString) encoding, which throws on characters > 255
  // (e.g. a smart ellipsis "…", em dashes, curly quotes). Normalise common
  // smart punctuation to ASCII and drop anything still outside Latin-1 so the
  // request can always be encoded. Accented Latin (≤255) is preserved.
  const sanitizePromptText = (text: string): string => {
    const smartPunctuation: Record<string, string> = {
      '…': '...', // …
      '–': '-', '—': '-', // – —
      '‘': "'", '’': "'", '‚': "'", '‛': "'", // ‘ ’ ‚ ‛
      '“': '"', '”': '"', '„': '"', '‟': '"', // “ ” „ ‟
      '•': '*', '·': '*', // • ·
      '→': '->', '←': '<-', // → ←
      ' ': ' ', // non-breaking space
    };
    return text
      .replace(/[–—‘’‚‛“”„‟•·…→← ]/g, (c) => smartPunctuation[c] ?? c)
      .replace(/[^ -ÿ]/g, ''); // strip any remaining non-Latin-1 (CJK, emoji, …)
  };

  // Steer the instruction by how aggressively the user wants the look changed.
  // Kept in sync with buildEnhancedPrompt in src/utils/aiVisualizer.ts.
  const buildEnhancedPrompt = (): string => {
    const subject = sanitizePromptText(prompt) || 'this architectural view';
    const negative = typeof negativePrompt === 'string' ? sanitizePromptText(negativePrompt).trim() : '';
    let base: string;
    if (intensity === 'subtle') {
      base = `Subtly enhance this architectural view into a photorealistic render: ${subject}. Keep the exact same building structure, geometry, camera angle and composition; only gently refine materials, textures and lighting.`;
    } else if (intensity === 'strong') {
      base = `Transform this architectural view into a fully photorealistic render: ${subject}. Preserve the overall building geometry and camera composition, but completely realize materials, textures, lighting and atmosphere.`;
    } else {
      base = `Edit this image: ${subject}. Keep the exact same building structure, camera angle, and composition. Only change the materials, textures, and lighting to make it look photorealistic.`;
    }
    return negative ? `${base} Avoid: ${negative}.` : base;
  };

  const baseInput: Record<string, unknown> = {
    prompt: buildEnhancedPrompt(),
    image_input: [dataUrl],
    aspect_ratio: typeof aspectRatio === 'string' && aspectRatio ? aspectRatio : 'match_input_image',
    output_format: outputFormat === 'png' ? 'png' : 'jpg',
  };
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    baseInput.seed = Math.floor(seed);
  }

  const runModel = async (modelInput: Record<string, unknown>) =>
    replicate.run(
      'google/nano-banana:2c8a3b5b81554aa195bde461e2caa6afacd69a66c48a64fb0e650c9789f8b8a0',
      { input: modelInput }
    );

  let output: unknown;
  try {
    output = await runModel(baseInput);
  } catch (err) {
    // Some models reject unknown inputs (e.g. seed) with a 422; retry without it.
    if ('seed' in baseInput) {
      const { seed: _omitSeed, ...withoutSeed } = baseInput;
      output = await runModel(withoutSeed);
    } else {
      throw err;
    }
  }

  // Resolve a ".url" value that may be a string, a URL instance, or a method
  // (Replicate FileOutput exposes url() as a function).
  const resolveUrlValue = (urlValue: unknown): string | null => {
    if (typeof urlValue === 'function') {
      try {
        return resolveUrlValue((urlValue as () => unknown)());
      } catch {
        return null;
      }
    }
    if (typeof urlValue === 'string') {
      return urlValue;
    }
    if (urlValue && typeof urlValue === 'object' && 'href' in (urlValue as any)) {
      return String((urlValue as any).href); // URL instance
    }
    return null;
  };

  const extractUrl = (value: unknown): string | null => {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'function') {
      return resolveUrlValue(value);
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = extractUrl(item);
        if (found) {
          return found;
        }
      }
      return null;
    }
    if (typeof value === 'object') {
      const obj = value as any;
      // FileOutput / URL-like: a url string, url() method, or href.
      if ('url' in obj) {
        const found = resolveUrlValue(obj.url);
        if (found) {
          return found;
        }
      }
      if (typeof obj.href === 'string') {
        return obj.href;
      }
      if (obj.output) {
        return extractUrl(obj.output);
      }
      if (obj.urls) {
        return extractUrl(obj.urls);
      }
    }
    return null;
  };

  const urlString = extractUrl(output);
  if (!urlString) {
    throw new Error(`No image URL in response from Replicate (output type: ${typeof output})`);
  }

  const imageResponse = await fetch(urlString);

  if (!imageResponse.ok) {
    throw new Error(
      `Failed to fetch generated image: ${imageResponse.status} ${imageResponse.statusText}`
    );
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString('base64');

  return { image: base64Image };
});
}

// App lifecycle
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
