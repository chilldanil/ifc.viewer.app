import { getElectronAPI, isElectron } from './electronUtils';
import {
  DEFAULT_AI_RENDER_MODE,
  buildAIVisualizationPrompt,
  coerceAiRenderMode,
  getAIVisualizationMode,
  type AiRenderMode,
  type RenderIntensity,
} from './aiVisualizationRouter';

export type { AiRenderMode, RenderIntensity } from './aiVisualizationRouter';

export interface AiRenderPreset {
  label: string;
  prompt: string;
}

export const AI_RENDER_PRESETS: AiRenderPreset[] = [
  {
    label: 'Photorealistic',
    prompt:
      'photorealistic architectural visualization, professional rendering, high quality, detailed textures, natural lighting, 8k, architectural photography',
  },
  {
    label: 'Modern Interior',
    prompt:
      'modern interior design, photorealistic, luxury materials, ambient lighting, contemporary architecture, professional render',
  },
  {
    label: 'Exterior View',
    prompt:
      'photorealistic exterior building view, professional architectural photography, blue sky, natural daylight, high detail, 8k quality',
  },
  {
    label: 'Night Scene',
    prompt:
      'photorealistic night architectural scene, dramatic lighting, city lights, ambient glow, professional photography, cinematic',
  },
];

export interface AiGenerationParams {
  prompt: string;
  imageBase64: string;
  apiKey: string;
  mode?: AiRenderMode;
  negativePrompt?: string;
  seed?: number;
  /** 'match_input_image' | '16:9' | '1:1' | '4:3' | '3:2' | '9:16' | '21:9' */
  aspectRatio?: string;
  outputFormat?: 'jpg' | 'png';
  intensity?: RenderIntensity;
}

export interface AIVisualizationParams {
  prompt: string;
  image: string;
  mode?: AiRenderMode;
  apiKey?: string;
  negativePrompt?: string;
  seed?: number;
  /** 'match_input_image' | '16:9' | '1:1' | '4:3' | '3:2' | '9:16' | '21:9' */
  aspectRatio?: string;
  outputFormat?: 'jpg' | 'png';
  intensity?: RenderIntensity;
}

/**
 * Build the instruction the edit model receives, steered by how aggressively
 * the user wants the look changed. Kept in sync with the copy in
 * electron/main.cts (the main-process path can't import this module).
 */
export const buildEnhancedPrompt = (
  prompt: string,
  intensity: RenderIntensity = 'balanced',
  negativePrompt = ''
): string => {
  return buildAIVisualizationPrompt({ prompt, intensity, negativePrompt });
};

export const REPLICATE_API_KEY_STORAGE_KEY = 'replicate_api_key';

// In Electron, the key is encrypted at rest via the OS keychain (safeStorage,
// see electron/main.ts). In a plain web build there's no equivalent, so we
// fall back to localStorage there.
export const loadReplicateApiKey = async (): Promise<string> => {
  const electronAPI = getElectronAPI() as any;
  if (isElectron() && electronAPI?.secureStorage) {
    try {
      return await electronAPI.secureStorage.getApiKey();
    } catch {
      return '';
    }
  }
  try {
    return localStorage.getItem(REPLICATE_API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const saveReplicateApiKey = async (apiKey: string): Promise<void> => {
  const electronAPI = getElectronAPI() as any;
  if (isElectron() && electronAPI?.secureStorage) {
    try {
      await electronAPI.secureStorage.setApiKey(apiKey);
    } catch {
      // ignore storage errors
    }
    return;
  }
  try {
    localStorage.setItem(REPLICATE_API_KEY_STORAGE_KEY, apiKey);
  } catch {
    // ignore storage errors (private mode, blocked storage, etc.)
  }
};

export async function generateAIVisualization(args: AIVisualizationParams): Promise<string> {
  const mode = coerceAiRenderMode(args.mode ?? DEFAULT_AI_RENDER_MODE);
  const selectedMode = getAIVisualizationMode(mode);
  const image = args.image.trim();

  console.info('[AI Visualization] generation requested', {
    mode,
    model: selectedMode.model,
    hasImage: Boolean(image),
    status: 'queued',
  });

  if (!image) {
    throw new Error('Current viewport screenshot is missing. Capture a view before generating.');
  }
  if (!selectedMode.supportsViewportReference) {
    throw new Error(
      `${selectedMode.label} uses ${selectedMode.model}, which is not enabled for strict viewport-reference editing here. Choose a reference-image AI model to preserve the same IFC building geometry.`
    );
  }

  const requestPayload = {
    prompt: args.prompt,
    imageBase64: image,
    mode,
    apiKey: args.apiKey ?? '',
    negativePrompt: args.negativePrompt,
    seed: args.seed,
    aspectRatio: args.aspectRatio,
    outputFormat: args.outputFormat,
    intensity: args.intensity,
  };
  const electronAPI = getElectronAPI() as any;

  if (isElectron()) {
    if (!electronAPI?.generateAiImage) {
      throw new Error('AI Visualization backend bridge is unavailable.');
    }

    let data: unknown;
    try {
      data = await electronAPI.generateAiImage(requestPayload);
    } catch (err) {
      console.error('[AI Visualization] generation failed', {
        mode,
        model: selectedMode.model,
        hasImage: Boolean(image),
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    if (typeof data === 'string') {
      return data;
    }
    if (data && typeof data === 'object') {
      const responseData = data as Record<string, unknown>;
      if (typeof responseData.url === 'string') {
        return responseData.url;
      }
      if (responseData.image) {
        return `data:image/png;base64,${String(responseData.image)}`;
      }
    }

    throw new Error('No image in response');
  }

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.error) {
          errorMessage += ` - ${String(errorData.error)}`;
        }
      } catch {
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage += ` - ${errorText}`;
          }
        } catch {
          // ignore
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (typeof data === 'object' && data?.url) {
      return data.url as string;
    }
    if (Array.isArray(data) && data[0]?.image) {
      return `data:image/png;base64,${data[0].image}`;
    }
    if (data?.image) {
      return `data:image/png;base64,${data.image}`;
    }

    throw new Error('No image in response');
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AI Visualization] generation failed', {
      mode,
      model: selectedMode.model,
      hasImage: Boolean(image),
      status: 'failed',
      error: message,
    });
    throw new Error(`AI request failed: ${message}`);
  }
}

export async function generateAiImage(args: AiGenerationParams): Promise<string> {
  return generateAIVisualization({
    prompt: args.prompt,
    image: args.imageBase64,
    mode: args.mode,
    apiKey: args.apiKey,
    negativePrompt: args.negativePrompt,
    seed: args.seed,
    aspectRatio: args.aspectRatio,
    outputFormat: args.outputFormat,
    intensity: args.intensity,
  });
}
