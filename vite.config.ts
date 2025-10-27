import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import dotenv from 'dotenv';
import Replicate from 'replicate';

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

              // Use API key from request, fallback to .env
              const token = apiKey || REPLICATE_API_TOKEN;

              // Check if token is available
              if (!token) {
                res.statusCode = 500;
                res.end(JSON.stringify({
                  error: 'Replicate API token not provided. Please enter your API token in the sidebar.'
                }));
                return;
              }

              // Initialize Replicate client
              const replicate = new Replicate({
                auth: token,
              });

              // Use Nano Banana (Gemini 2.5 Flash Image) via Replicate
              console.log('Starting img2img generation with Nano Banana (Gemini 2.5)...');

              // Note: image_input expects a URL or data URI
              // We need to convert base64 to a data URL
              const dataUrl = imageBase64.startsWith('data:')
                ? imageBase64
                : `data:image/png;base64,${imageBase64}`;

              // Nano Banana prompt should be specific about editing/enhancing the input image
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

              // Nano Banana returns a URL or array
              console.log('Nano Banana output type:', typeof output);
              console.log('Nano Banana output:', JSON.stringify(output, null, 2));

              let imageUrl: any = null;

              // Handle different response formats
              if (typeof output === 'string') {
                imageUrl = output;
              } else if (Array.isArray(output)) {
                // For arrays, we need to handle FileOutput objects
                if (output.length > 0) {
                  const firstItem = output[0];
                  console.log('First array item:', firstItem);
                  console.log('First array item type:', typeof firstItem);

                  // Check if it's a FileOutput object with url() method
                  if (firstItem && typeof firstItem === 'object' && 'url' in firstItem) {
                    // If url is a function, call it
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
                // Try various possible response structures
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
                throw new Error(`No image URL in response from Nano Banana. Output type: ${typeof output}, Output: ${JSON.stringify(output)}`);
              }

              console.log('Extracted imageUrl:', imageUrl);
              console.log('imageUrl type:', typeof imageUrl);

              // Ensure imageUrl is a string and not a function
              let urlString: string;
              if (typeof imageUrl === 'function') {
                urlString = imageUrl();
              } else if (typeof imageUrl === 'string') {
                urlString = imageUrl;
              } else {
                urlString = String(imageUrl);
              }

              console.log('Final URL string:', urlString);

              // Fetch the image and convert to base64
              const imageResponse = await fetch(urlString);

              if (!imageResponse.ok) {
                throw new Error(`Failed to fetch generated image: ${imageResponse.status} ${imageResponse.statusText}`);
              }

              const imageBlob = await imageResponse.blob();
              const arrayBuffer = await imageBlob.arrayBuffer();
              const base64Image = Buffer.from(arrayBuffer).toString('base64');

              console.log('Successfully generated img2img result');

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
