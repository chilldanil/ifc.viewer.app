# IFC Viewer - Electron Desktop Application

This is a standalone desktop application version of the IFC Viewer, built with Electron. It provides native file dialogs, menu integration, and cross-platform installers for Windows, macOS, and Linux.

## Features

- Native file open/save dialogs
- Application menu with keyboard shortcuts
- File → Open IFC File (Cmd/Ctrl+O)
- Drag-and-drop IFC file loading
- Cross-platform support (Windows, macOS, Linux)
- All features from the web version included

## Requirements

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

## Installation

First, install the dependencies:

```bash
npm install
```

## Development

To run the Electron app in development mode:

```bash
npm run electron:dev
```

This will:
1. Compile the Electron main and preload scripts
2. Start the Vite dev server
3. Launch Electron with hot-reload enabled
4. Open DevTools automatically

## Building

### Build for Testing

To build and preview the production version locally:

```bash
npm run electron:preview
```

This creates a production build and runs it without packaging.

### Build Installers

To create distributable installers for your platform:

```bash
npm run electron:build
```

This will:
1. Compile TypeScript files
2. Build the renderer process with Vite
3. Package with electron-builder
4. Create installers in the `release/` directory

**Output formats by platform:**

- **macOS**: `.dmg` and `.zip`
- **Windows**: `.exe` (NSIS installer) and portable `.exe`
- **Linux**: `.AppImage` and `.deb`

### Build for Specific Platforms

```bash
# macOS only
npm run electron:build -- --mac

# Windows only
npm run electron:build -- --win

# Linux only
npm run electron:build -- --linux

# Multiple platforms
npm run electron:build -- --mac --win --linux
```

## Project Structure

```
├── electron/
│   ├── main.ts              # Electron main process (window management, menus)
│   └── preload.ts           # Preload script (secure IPC bridge)
├── src/
│   ├── utils/
│   │   └── electronUtils.ts # Electron helper utilities
│   └── hooks/
│       └── useElectronFileOpen.ts  # React hook for Electron file events
├── dist-electron/           # Compiled Electron files (generated)
├── dist/                    # Built renderer files (generated)
├── release/                 # Installers (generated)
├── vite.electron.config.ts  # Vite config for Electron
├── tsconfig.electron.json   # TypeScript config for Electron
└── package.json             # Electron configuration
```

## Configuration

### Application Info

Update these fields in `package.json`:

```json
{
  "name": "ifc-viewer-app",
  "productName": "IFC Viewer",
  "version": "1.0.0",
  "description": "Professional IFC viewer desktop application",
  "author": "Your Name",
  "build": {
    "appId": "com.yourcompany.ifcviewer"
  }
}
```

### Icons

Add application icons in the `build/` directory:

- `build/icon.icns` - macOS icon (512x512 or higher)
- `build/icon.ico` - Windows icon (256x256 or higher)
- `build/icon.png` - Linux icon (512x512 or higher)

You can generate these from a single PNG using tools like:
- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder)
- Online: https://cloudconvert.com/png-to-icns

## Usage

### Opening Files

**Method 1: File Menu**
- Go to File → Open IFC File
- Or press Cmd+O (Mac) / Ctrl+O (Windows/Linux)

**Method 2: Drag and Drop**
- Drag an `.ifc` file into the application window

### Keyboard Shortcuts

- `Cmd/Ctrl+O` - Open IFC file
- `Cmd/Ctrl+R` - Reload
- `Cmd/Ctrl+Shift+I` - Toggle DevTools
- `Cmd/Ctrl+Q` - Quit (Cmd+W to close on Mac)

## Troubleshooting

### Build fails with "electron not found"

Run:
```bash
rm -rf node_modules package-lock.json
npm install
```

### "spawn electron ENOENT" error

Ensure Electron is installed:
```bash
npm install electron --save-dev
```

### White screen on launch

Check the DevTools console (Cmd/Ctrl+Shift+I) for errors. Common causes:
- Missing dependencies
- Incorrect file paths in production build
- CSP (Content Security Policy) issues

### App won't install on macOS (unsigned)

macOS Gatekeeper blocks unsigned apps. Options:
1. Right-click → Open (first time only)
2. System Preferences → Security → "Open Anyway"
3. Code sign the app (requires Apple Developer account)

### App won't install on Windows (SmartScreen)

Click "More info" → "Run anyway"

For distribution, consider code signing with a certificate.

## Advanced Configuration

### Custom Menu Items

Edit `electron/main.ts` and modify the `createApplicationMenu()` function.

### File Type Associations

Add to `package.json`:

```json
{
  "build": {
    "fileAssociations": [
      {
        "ext": "ifc",
        "name": "IFC File",
        "role": "Viewer"
      }
    ]
  }
}
```

### Auto-updater

Integrate electron-updater:

```bash
npm install electron-updater
```

See: https://www.electron.build/auto-update

## Distribution

### Code Signing

**macOS:**
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
npm run electron:build
```

**Windows:**
```bash
npm run electron:build -- --win --sign
```

### Publishing to Stores

- **Mac App Store**: https://www.electron.build/configuration/mac#mas
- **Windows Store**: https://www.electron.build/configuration/appx
- **Snap Store (Linux)**: https://www.electron.build/configuration/snap

## Performance Tips

1. **Reduce bundle size**: Use `electron-builder` compression
2. **Lazy load modules**: Dynamic imports for heavy dependencies
3. **Enable V8 code cache**: Improves startup time
4. **Use native modules wisely**: They increase build complexity

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Docs](https://www.electron.build/)
- [Vite + Electron Template](https://github.com/electron-vite/electron-vite-vue)

## License

MIT
