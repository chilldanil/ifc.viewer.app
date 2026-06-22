import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { createAiApiMiddlewarePlugin } from './vite-plugins/aiApiMiddleware';

dotenv.config();

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Plugin to build Electron main process and preload script
function electronBuilder() {
  return {
    name: 'electron-builder',
    closeBundle: async () => {
      // Build main process
      const mainBuild = spawn(
        'tsc',
        [
          '--project',
          'tsconfig.electron.json',
        ],
        { stdio: 'inherit', shell: true }
      );

      await new Promise((resolve, reject) => {
        mainBuild.on('close', (code) => {
          if (code === 0) {
            resolve(null);
          } else {
            reject(new Error('Main process build failed'));
          }
        });
      });
    },
  };
}

// Plugin to launch Electron in development mode
function electronDev() {
  let electronProcess: any = null;

  return {
    name: 'electron-dev',
    closeBundle: () => {
      if (electronProcess) {
        electronProcess.kill();
        electronProcess = null;
      }

      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          electronProcess = spawn('electron', ['.'], {
            stdio: 'inherit',
            shell: true,
            env: {
              ...process.env,
              VITE_DEV_SERVER_URL: 'http://localhost:5173',
            },
          });

          electronProcess.on('close', () => {
            process.exit();
          });
        }, 1000);
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    electronBuilder(),
    mode === 'development' ? electronDev() : null,
    createAiApiMiddlewarePlugin(REPLICATE_API_TOKEN),
  ].filter(Boolean),
  base: './',
  server: {
    port: 5173,
  },
  resolve: {
    dedupe: ['three', 'web-ifc'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['three', 'web-ifc'],
    exclude: ['@thatopen/ui-obc'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  assetsInclude: ['**/*.wasm'],
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      mode === 'production' ? 'production' : 'development'
    ),
  },
}));
