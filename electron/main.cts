import { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import Replicate from 'replicate';

let mainWindow: BrowserWindow | null = null;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

type AiRenderMode = 'fast-preview' | 'standard' | 'premium' | 'experimental';
type RenderIntensity = 'subtle' | 'balanced' | 'strong';
interface AiVisualizationModeConfig {
  label: string;
  model: string;
  supportsViewportReference: boolean;
  referenceImageField?: 'image_input' | 'input_images';
}

const DEFAULT_AI_RENDER_MODE: AiRenderMode = 'standard';
const AI_VISUALIZATION_MODES: Record<AiRenderMode, AiVisualizationModeConfig> = {
  'fast-preview': {
    label: 'GPT Image 2 Low',
    model: 'openai/gpt-image-2',
    supportsViewportReference: true,
    referenceImageField: 'input_images',
  },
  standard: {
    label: 'Nano Banana 2',
    model: 'google/nano-banana-2',
    supportsViewportReference: true,
    referenceImageField: 'image_input',
  },
  premium: {
    label: 'FLUX.2 Max',
    model: 'black-forest-labs/flux-2-max',
    supportsViewportReference: true,
    referenceImageField: 'input_images',
  },
  experimental: {
    label: 'FLUX.2 Flex',
    model: 'black-forest-labs/flux-2-flex',
    supportsViewportReference: true,
    referenceImageField: 'input_images',
  },
};

const AI_GEOMETRY_PRESERVATION_INSTRUCTIONS =
  'Use the provided IFC viewport screenshot as the strict visual reference and source of truth. This is an image-to-image enhancement, not a new design. Preserve the exact same building identity, massing, silhouette, geometry, number of floors, floor heights, facade rhythm, window count and placement, openings, entrance position, roofline, proportions, camera angle, perspective, and structural layout. Improve only materials, surface realism, lighting, atmosphere, city/context background, landscaping, and presentation quality. Do not redesign the building, do not replace it with another building, and do not add or remove floors, windows, doors, balconies, rooms, facade modules, columns, canopies, towers, setbacks, or structural elements unless explicitly requested.';

const AI_GEOMETRY_NEGATIVE_INSTRUCTIONS =
  'Forbidden: different building, new architecture, redesigned facade, changed window grid, changed number of floors, changed entrance, changed massing, changed roof, extra tower, skyscraper replacement, curtain-wall replacement, random city building, alternate camera angle, cropped-out original building.';

const isAiRenderMode = (value: unknown): value is AiRenderMode =>
  typeof value === 'string' && value in AI_VISUALIZATION_MODES;

const coerceAiRenderMode = (value: unknown): AiRenderMode =>
  isAiRenderMode(value) ? value : DEFAULT_AI_RENDER_MODE;

const normalizeImageDataUrl = (image: string): string => {
  const trimmed = image.trim();
  if (!trimmed) {
    throw new Error('Current viewport screenshot is missing. Capture a view before generating.');
  }
  return trimmed.startsWith('data:') ? trimmed : `data:image/png;base64,${trimmed}`;
};

const sanitizeAIVisualizationText = (text: string): string => {
  const replacements: Record<string, string> = {
    '\u2026': '...',
    '\u2013': '-',
    '\u2014': '-',
    '\u2018': "'",
    '\u2019': "'",
    '\u201a': "'",
    '\u201b': "'",
    '\u201c': '"',
    '\u201d': '"',
    '\u201e': '"',
    '\u201f': '"',
    '\u2022': '*',
    '\u00b7': '*',
    '\u2192': '->',
    '\u2190': '<-',
    '\u00a0': ' ',
  };
  return text
    .replace(
      /[\u2013\u2014\u2018\u2019\u201a\u201b\u201c\u201d\u201e\u201f\u2022\u00b7\u2026\u2192\u2190\u00a0]/g,
      (char) => replacements[char] ?? char
    )
    .replace(/[^\x00-\xff]/g, '');
};

const buildAIVisualizationPrompt = (
  prompt: string,
  intensity: RenderIntensity = 'balanced',
  negativePrompt = ''
): string => {
  const subject = sanitizeAIVisualizationText(prompt).trim() || 'architectural visualization';
  const negative = sanitizeAIVisualizationText(negativePrompt).trim();
  const intensityInstruction =
    intensity === 'subtle'
      ? 'Apply a subtle concept render treatment with restrained material, texture, and lighting improvements.'
      : intensity === 'strong'
        ? 'Create a fully realized concept render with polished materials, lighting, atmosphere, and presentation quality.'
        : 'Create a balanced concept render with improved materials, lighting, atmosphere, and presentation quality.';

  return [
    AI_GEOMETRY_PRESERVATION_INSTRUCTIONS,
    intensityInstruction,
    `Design request: ${subject}.`,
    AI_GEOMETRY_NEGATIVE_INSTRUCTIONS,
    negative ? `Avoid: ${negative}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
};

const normalizeOutputFormat = (format: unknown): 'jpg' | 'png' =>
  format === 'png' ? 'png' : 'jpg';
const normalizeJpegOutputFormat = (format: unknown): 'jpeg' | 'png' =>
  format === 'png' ? 'png' : 'jpeg';

const gptAspectRatio = (
  aspectRatio: unknown
): '1:1' | '3:2' | '2:3' | '16:9' | '9:16' | 'auto' => {
  if (aspectRatio === 'match_input_image' || !aspectRatio) {
    return 'auto';
  }
  if (
    aspectRatio === '1:1' ||
    aspectRatio === '3:2' ||
    aspectRatio === '2:3' ||
    aspectRatio === '16:9' ||
    aspectRatio === '9:16'
  ) {
    return aspectRatio;
  }
  return 'auto';
};

const getReplicateReferenceImageField = (
  input: Record<string, unknown>
): 'image_input' | 'input_images' | null => {
  if (Array.isArray(input.image_input) && input.image_input.length > 0) {
    return 'image_input';
  }
  if (Array.isArray(input.input_images) && input.input_images.length > 0) {
    return 'input_images';
  }
  return null;
};

const buildReplicateInput = (
  args: Record<string, unknown>,
  mode: AiRenderMode
): Record<string, unknown> => {
  const selectedMode = AI_VISUALIZATION_MODES[mode];
  const image = normalizeImageDataUrl(String(args.imageBase64 ?? args.image ?? ''));
  const aspectRatio =
    typeof args.aspectRatio === 'string' && args.aspectRatio
      ? args.aspectRatio
      : 'match_input_image';
  const prompt = buildAIVisualizationPrompt(
    String(args.prompt ?? ''),
    args.intensity === 'subtle' || args.intensity === 'strong' ? args.intensity : 'balanced',
    typeof args.negativePrompt === 'string' ? args.negativePrompt : ''
  );

  if (!selectedMode.supportsViewportReference || !selectedMode.referenceImageField) {
    throw new Error(
      `${selectedMode.label} uses ${selectedMode.model}, which is not enabled for strict viewport-reference editing here. Choose a reference-image AI model to preserve the same IFC building geometry.`
    );
  }

  if (mode === 'fast-preview') {
    const input: Record<string, unknown> = {
      prompt,
      input_images: [image],
      quality: 'low',
      number_of_images: 1,
      output_format: normalizeJpegOutputFormat(args.outputFormat),
    };
    input.aspect_ratio = gptAspectRatio(aspectRatio);
    return input;
  }

  if (mode === 'experimental') {
    const input: Record<string, unknown> = {
      prompt,
      input_images: [image],
      aspect_ratio: aspectRatio,
      output_format: normalizeOutputFormat(args.outputFormat),
      steps: 30,
      guidance: 4.5,
    };
    if (typeof args.seed === 'number' && Number.isFinite(args.seed)) {
      input.seed = Math.floor(args.seed);
    }
    return input;
  }

  if (mode === 'premium') {
    const input: Record<string, unknown> = {
      prompt,
      input_images: [image],
      aspect_ratio: aspectRatio,
      output_format: normalizeOutputFormat(args.outputFormat),
      resolution: 'match_input_image',
    };
    if (typeof args.seed === 'number' && Number.isFinite(args.seed)) {
      input.seed = Math.floor(args.seed);
    }
    return input;
  }

  return {
    prompt,
    image_input: [image],
    aspect_ratio: aspectRatio,
    output_format: normalizeOutputFormat(args.outputFormat),
  };
};

const resolveReplicateUrlValue = (urlValue: unknown): string | null => {
  if (typeof urlValue === 'function') {
    try {
      return resolveReplicateUrlValue((urlValue as () => unknown)());
    } catch {
      return null;
    }
  }
  if (typeof urlValue === 'string') {
    return urlValue;
  }
  if (urlValue && typeof urlValue === 'object' && 'href' in (urlValue as any)) {
    return String((urlValue as any).href);
  }
  return null;
};

const extractReplicateImageUrl = (value: unknown): string | null => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'function') {
    return resolveReplicateUrlValue(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractReplicateImageUrl(item);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (typeof value === 'object') {
    const obj = value as any;
    if ('url' in obj) {
      const found = resolveReplicateUrlValue(obj.url);
      if (found) {
        return found;
      }
    }
    if (typeof obj.href === 'string') {
      return obj.href;
    }
    if (obj.output) {
      return extractReplicateImageUrl(obj.output);
    }
    if (obj.urls) {
      return extractReplicateImageUrl(obj.urls);
    }
  }
  return null;
};

const runAIVisualization = async (args: unknown): Promise<{ image: string }> => {
  if (!args || typeof args !== 'object') {
    throw new Error('Invalid request payload');
  }

  const payload = args as Record<string, unknown>;
  const mode = coerceAiRenderMode(payload.mode);
  const selectedMode = AI_VISUALIZATION_MODES[mode];
  const prompt = payload.prompt;
  const imageBase64 = payload.imageBase64 ?? payload.image;

  console.info('[AI Visualization] electron request', {
    mode,
    model: selectedMode.model,
    hasImage: typeof imageBase64 === 'string' && imageBase64.trim().length > 0,
    referenceImageField: selectedMode.referenceImageField ?? null,
    status: 'received',
  });

  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Prompt is required for AI Visualization.');
  }
  if (typeof imageBase64 !== 'string' || !imageBase64.trim()) {
    throw new Error('Current viewport screenshot is missing. Capture a view before generating.');
  }

  const MAX_PROMPT_LENGTH = 2000;
  const MAX_IMAGE_BASE64_LENGTH = 20_000_000;
  if (prompt.length > MAX_PROMPT_LENGTH || imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    throw new Error('Request payload too large');
  }

  if (!selectedMode.supportsViewportReference) {
    throw new Error(
      `${selectedMode.label} uses ${selectedMode.model}, which is not enabled for strict viewport-reference editing here. Choose a reference-image AI model to preserve the same IFC building geometry.`
    );
  }

  const apiKey = payload.apiKey;
  const token = typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error(
      'Replicate API token not provided. Set REPLICATE_API_TOKEN or enter your token in Render Studio.'
    );
  }

  const replicate = new Replicate({ auth: token, useFileOutput: false });
  const modelInput = buildReplicateInput(payload, mode);
  const referenceImageField = getReplicateReferenceImageField(modelInput);
  if (!referenceImageField) {
    throw new Error(
      `${selectedMode.label} did not produce a Replicate reference-image input. The viewer screenshot was not sent.`
    );
  }
  const modelName = selectedMode.model as `${string}/${string}` | `${string}/${string}:${string}`;
  const runModel = (input: Record<string, unknown>) => replicate.run(modelName, { input });

  console.info('[AI Visualization] electron generation started', {
    mode,
    model: selectedMode.model,
    hasImage: true,
    referenceImageField,
    inputKeys: Object.keys(modelInput),
    status: 'running',
  });

  let output: unknown;
  try {
    output = await runModel(modelInput);
  } catch (err) {
    if ('seed' in modelInput) {
      const { seed: _omitSeed, ...withoutSeed } = modelInput;
      console.info('[AI Visualization] electron retrying without seed', {
        mode,
        model: selectedMode.model,
        hasImage: true,
        referenceImageField,
        inputKeys: Object.keys(withoutSeed),
        status: 'retrying',
      });
      output = await runModel(withoutSeed);
    } else {
      throw err;
    }
  }

  const urlString = extractReplicateImageUrl(output);
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

  console.info('[AI Visualization] electron generation completed', {
    mode,
    model: selectedMode.model,
    hasImage: true,
    referenceImageField,
    status: 'succeeded',
  });

  return { image: base64Image };
};

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
    try {
      return await runAIVisualization(args);
    } catch (error) {
      const payload = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
      const mode = coerceAiRenderMode(payload.mode);
      const selectedMode = AI_VISUALIZATION_MODES[mode];
      const imageBase64 = payload.imageBase64 ?? payload.image;
      console.error('[AI Visualization] electron generation failed', {
        mode,
        model: selectedMode.model,
        hasImage: typeof imageBase64 === 'string' && imageBase64.trim().length > 0,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
