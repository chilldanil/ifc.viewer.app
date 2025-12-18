import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Replicate from 'replicate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      preload: path.join(__dirname, 'preload.js'),
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
  if (process.env.VITE_DEV_SERVER_URL) {
    // Development mode
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in the user's default browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
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

// IPC Handlers
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

ipcMain.handle('ai:generate', async (_event, args: unknown) => {
  if (!args || typeof args !== 'object') {
    throw new Error('Invalid request payload');
  }

  const { prompt, imageBase64, apiKey } = args as Record<string, unknown>;

  if (typeof prompt !== 'string' || typeof imageBase64 !== 'string') {
    throw new Error('Invalid request payload');
  }

  const token = (typeof apiKey === 'string' && apiKey.trim()) ? apiKey.trim() : REPLICATE_API_TOKEN;

  if (!token) {
    throw new Error(
      'Replicate API token not provided. Please enter your API token in the AI Visualizer panel.'
    );
  }

  const replicate = new Replicate({ auth: token });

  const dataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/png;base64,${imageBase64}`;

  const enhancedPrompt = `Edit this image: ${prompt}. Keep the exact same building structure, camera angle, and composition. Only change the materials, textures, and lighting to make it look photorealistic.`;

  const output = await replicate.run(
    'google/nano-banana:2c8a3b5b81554aa195bde461e2caa6afacd69a66c48a64fb0e650c9789f8b8a0',
    {
      input: {
        prompt: enhancedPrompt,
        image_input: [dataUrl],
        aspect_ratio: 'match_input_image',
        output_format: 'jpg',
      },
    }
  );

  const extractUrl = (value: unknown): string | null => {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      const firstItem = value[0] as unknown;
      if (typeof firstItem === 'string') {
        return firstItem;
      }
      if (firstItem && typeof firstItem === 'object' && 'url' in (firstItem as any)) {
        const urlValue = (firstItem as any).url as unknown;
        if (typeof urlValue === 'function') {
          return urlValue();
        }
        if (typeof urlValue === 'string') {
          return urlValue;
        }
      }
      return null;
    }
    if (typeof value === 'object') {
      const obj = value as any;
      if (obj.output) {
        return extractUrl(obj.output);
      }
      if (obj.url) {
        return extractUrl(obj.url);
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

// App lifecycle
app.whenReady().then(() => {
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
