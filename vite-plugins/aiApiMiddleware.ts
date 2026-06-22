import type { Plugin } from 'vite';
import Replicate from 'replicate';

const MODEL_VERSION = 'google/nano-banana:2c8a3b5b81554aa195bde461e2caa6afacd69a66c48a64fb0e650c9789f8b8a0';

function extractImageUrl(output: unknown): string | null {
  if (typeof output === 'string') {
    return output;
  }
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (first && typeof first === 'object' && 'url' in first) {
      const value = (first as { url: unknown }).url;
      return typeof value === 'function' ? (value as () => string)() : (value as string);
    }
    if (typeof first === 'string') {
      return first;
    }
    return null;
  }
  if (output && typeof output === 'object') {
    const obj = output as Record<string, unknown>;
    if (obj.output) {
      return extractImageUrl(obj.output);
    }
    if (obj.url) {
      const value = obj.url;
      return typeof value === 'function' ? (value as () => string)() : (value as string);
    }
    if (Array.isArray(obj.urls) && obj.urls.length > 0) {
      return extractImageUrl(obj.urls[0]);
    }
  }
  return null;
}

/**
 * Dev-server-only middleware that proxies AI Visualizer requests to
 * Replicate. Used by both the library build (vite.config.ts) and the
 * Electron renderer dev server (vite.electron.config.ts) so this logic
 * lives in one place instead of being duplicated across both configs.
 */
export function createAiApiMiddlewarePlugin(replicateApiToken: string | undefined): Plugin {
  return {
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

            const token = apiKey || replicateApiToken;
            if (!token) {
              res.statusCode = 500;
              res.end(
                JSON.stringify({
                  error: 'Replicate API token not provided. Please enter your API token in the sidebar.',
                })
              );
              return;
            }

            const replicate = new Replicate({ auth: token });

            const dataUrl = imageBase64.startsWith('data:')
              ? imageBase64
              : `data:image/png;base64,${imageBase64}`;

            const enhancedPrompt = `Edit this image: ${prompt}. Keep the exact same building structure, camera angle, and composition. Only change the materials, textures, and lighting to make it look photorealistic.`;

            const output = await replicate.run(MODEL_VERSION, {
              input: {
                prompt: enhancedPrompt,
                image_input: [dataUrl],
                aspect_ratio: 'match_input_image',
                output_format: 'jpg',
              },
            });

            const imageUrl = extractImageUrl(output);
            if (!imageUrl) {
              throw new Error(`No image URL in response from Replicate (output type: ${typeof output})`);
            }

            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
              throw new Error(`Failed to fetch generated image: ${imageResponse.status} ${imageResponse.statusText}`);
            }

            const arrayBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString('base64');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ image: base64Image }));
          } catch (err) {
            console.error('AI API middleware error:', err);
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : 'Failed to generate image',
              })
            );
          }
        });
      });
    },
  };
}
