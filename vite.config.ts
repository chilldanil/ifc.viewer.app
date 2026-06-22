import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import dotenv from 'dotenv';
import { createAiApiMiddlewarePlugin } from './vite-plugins/aiApiMiddleware';

dotenv.config();

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/__tests__', 'src/**/*.test.ts', 'src/**/*.test.tsx', 'src/main.tsx'],
    }),
    createAiApiMiddlewarePlugin(REPLICATE_API_TOKEN),
  ],
  base: mode === 'production' ? '/IFC_V/' : '/',
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    dedupe: ['three', 'web-ifc'],
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    include: ['three', 'web-ifc'],
    exclude: ['@thatopen/ui-obc'],
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
    lib: {
      entry: 'src/viewer.tsx',
      name: 'IFCViewer',
      formats: ['es', 'umd'],
      fileName: (format) => `ifc-viewer.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'react/jsx-runtime',
        },
        exports: 'named',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'style.css';
          }
          return assetInfo.name || 'assets/[name][extname]';
        },
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
