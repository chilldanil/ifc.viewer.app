import type { Plugin } from 'vite';
import Replicate from 'replicate';
import {
  buildReplicateInput,
  coerceAiRenderMode,
  extractReplicateImageUrl,
  getAIVisualizationMode,
  getReplicateReferenceImageField,
} from '../src/utils/aiVisualizationRouter';

/**
 * Dev-server-only middleware that proxies AI Visualization requests to
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
          let logContext = {
            mode: 'unknown',
            model: 'unknown',
            hasImage: false,
            referenceImageField: null as string | null,
          };

          try {
            const parsed = JSON.parse(body);
            const {
              prompt,
              imageBase64,
              image,
              apiKey,
              negativePrompt,
              seed,
              aspectRatio,
              outputFormat,
              intensity,
            } = parsed;
            const mode = coerceAiRenderMode(parsed?.mode);
            const selectedMode = getAIVisualizationMode(mode);
            const inputImage = typeof imageBase64 === 'string' ? imageBase64 : image;
            logContext = {
              mode,
              model: selectedMode.model,
              hasImage: typeof inputImage === 'string' && inputImage.trim().length > 0,
              referenceImageField: selectedMode.referenceImageField ?? null,
            };

            console.info('[AI Visualization] dev proxy request', {
              ...logContext,
              status: 'received',
            });

            if (typeof prompt !== 'string' || !prompt.trim()) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Prompt is required for AI Visualization.' }));
              return;
            }

            if (typeof inputImage !== 'string' || !inputImage.trim()) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  error:
                    'Current viewport screenshot is missing. Capture a view before generating.',
                })
              );
              return;
            }

            if (!selectedMode.supportsViewportReference) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  error: `${selectedMode.label} uses ${selectedMode.model}, which is not enabled for strict viewport-reference editing here. Choose a reference-image AI model to preserve the same IFC building geometry.`,
                })
              );
              return;
            }

            const requestToken =
              typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : undefined;
            const token = requestToken || replicateApiToken;
            if (!token) {
              res.statusCode = 500;
              res.end(
                JSON.stringify({
                  error:
                    'Replicate API token not provided. Set REPLICATE_API_TOKEN or enter your token in Render Studio.',
                })
              );
              return;
            }

            const replicate = new Replicate({ auth: token, useFileOutput: false });

            const modelInput = buildReplicateInput({
              prompt,
              image: inputImage,
              mode,
              negativePrompt,
              seed,
              aspectRatio,
              outputFormat,
              intensity,
            });
            const referenceImageField = getReplicateReferenceImageField(modelInput);
            if (!referenceImageField) {
              throw new Error(
                `${selectedMode.label} did not produce a Replicate reference-image input. The viewer screenshot was not sent.`
              );
            }
            logContext = {
              ...logContext,
              referenceImageField,
            };

            const runModel = (input: Record<string, unknown>) =>
              replicate.run(selectedMode.model, { input });

            console.info('[AI Visualization] dev proxy generation started', {
              ...logContext,
              inputKeys: Object.keys(modelInput),
              status: 'running',
            });

            let output: unknown;
            try {
              output = await runModel(modelInput);
            } catch (err) {
              if ('seed' in modelInput) {
                const { seed: _omitSeed, ...withoutSeed } = modelInput;
                console.info('[AI Visualization] dev proxy retrying without seed', {
                  ...logContext,
                  inputKeys: Object.keys(withoutSeed),
                  status: 'retrying',
                });
                output = await runModel(withoutSeed);
              } else {
                throw err;
              }
            }

            const imageUrl = extractReplicateImageUrl(output);
            if (!imageUrl) {
              throw new Error(
                `No image URL in response from Replicate (output type: ${typeof output})`
              );
            }

            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
              throw new Error(
                `Failed to fetch generated image: ${imageResponse.status} ${imageResponse.statusText}`
              );
            }

            const arrayBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString('base64');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ image: base64Image }));
            console.info('[AI Visualization] dev proxy generation completed', {
              ...logContext,
              status: 'succeeded',
            });
          } catch (err) {
            console.error('[AI Visualization] dev proxy generation failed', {
              ...logContext,
              status: 'failed',
              error: err instanceof Error ? err.message : String(err),
            });
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
