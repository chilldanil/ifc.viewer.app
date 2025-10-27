import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import Replicate from 'replicate';

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
    {
      name: 'ai-api-middleware',
      configureServer(server) {
        server.middlewares.use('/api/generate', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const parsed = JSON.parse(body);
              const { prompt, imageBase64, apiKey } = parsed;

              const token = apiKey || REPLICATE_API_TOKEN;

              if (!token) {
                res.statusCode = 500;
                res.end(JSON.stringify({
                  error: 'Replicate API token not provided. Please enter your API token in the sidebar.'
                }));
                return;
              }

              const replicate = new Replicate({
                auth: token,
              });

              console.log('Starting img2img generation with Nano Banana (Gemini 2.5)...');

              const dataUrl = imageBase64.startsWith('data:')
                ? imageBase64
                : `data:image/png;base64,${imageBase64}`;

              const enhancedPrompt = `Edit this image: ${prompt}. Keep the exact same building structure, camera angle, and composition. Only change the materials, textures, and lighting to make it look photorealistic.`;

              const output = await replicate.run(
                "google/nano-banana:2c8a3b5b81554aa195bde461e2caa6afacd69a66c48a64fb0e650c9789f8b8a0",
                {
                  input: {
                    prompt: enhancedPrompt,
                    image_input: [dataUrl],
                    aspect_ratio: "match_input_image",
                    output_format: "jpg",
                  },
                }
              );

              console.log('Nano Banana output type:', typeof output);

              let imageUrl: any = null;

              if (typeof output === 'string') {
                imageUrl = output;
              } else if (Array.isArray(output)) {
                if (output.length > 0) {
                  const firstItem = output[0];
                  if (firstItem && typeof firstItem === 'object' && 'url' in firstItem) {
                    if (typeof firstItem.url === 'function') {
                      imageUrl = firstItem.url();
                    } else {
                      imageUrl = firstItem.url;
                    }
                  } else if (typeof firstItem === 'string') {
                    imageUrl = firstItem;
                  }
                }
              } else if (output && typeof output === 'object') {
                const obj = output as any;
                if (obj.output) {
                  if (typeof obj.output === 'string') {
                    imageUrl = obj.output;
                  } else if (Array.isArray(obj.output) && obj.output.length > 0) {
                    const firstItem = obj.output[0];
                    if (firstItem && typeof firstItem === 'object' && 'url' in firstItem) {
                      imageUrl = typeof firstItem.url === 'function' ? firstItem.url() : firstItem.url;
                    } else if (typeof firstItem === 'string') {
                      imageUrl = firstItem;
                    }
                  }
                } else if (obj.url) {
                  imageUrl = typeof obj.url === 'function' ? obj.url() : obj.url;
                } else if (obj.urls && Array.isArray(obj.urls) && obj.urls.length > 0) {
                  imageUrl = obj.urls[0];
                }
              }

              if (!imageUrl) {
                throw new Error(`No image URL in response from Nano Banana. Output type: ${typeof output}`);
              }

              let urlString: string;
              if (typeof imageUrl === 'function') {
                urlString = imageUrl();
              } else if (typeof imageUrl === 'string') {
                urlString = imageUrl;
              } else {
                urlString = String(imageUrl);
              }

              const imageResponse = await fetch(urlString);

              if (!imageResponse.ok) {
                throw new Error(`Failed to fetch generated image: ${imageResponse.status}`);
              }

              const imageBlob = await imageResponse.blob();
              const arrayBuffer = await imageBlob.arrayBuffer();
              const base64Image = Buffer.from(arrayBuffer).toString('base64');

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                image: base64Image,
              }));
            } catch (err) {
              console.error('AI API middleware error:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({
                error: err instanceof Error ? err.message : 'Failed to generate image'
              }));
            }
          });
        });
      },
    },
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
