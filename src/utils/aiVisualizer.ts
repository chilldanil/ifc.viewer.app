import { getElectronAPI, isElectron } from './electronUtils';

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

export const REPLICATE_API_KEY_STORAGE_KEY = 'replicate_api_key';

export const loadReplicateApiKey = (): string => {
  try {
    return localStorage.getItem(REPLICATE_API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const saveReplicateApiKey = (apiKey: string) => {
  try {
    localStorage.setItem(REPLICATE_API_KEY_STORAGE_KEY, apiKey);
  } catch {
    // ignore storage errors (private mode, blocked storage, etc.)
  }
};

export async function generateAiImage(args: {
  prompt: string;
  imageBase64: string;
  apiKey: string;
}): Promise<string> {
  const runReplicateDirect = async () => {
    const MODEL_VERSION = '2c8a3b5b81554aa195bde461e2caa6afacd69a66c48a64fb0e650c9789f8b8a0';
    const dataUrl = args.imageBase64.startsWith('data:')
      ? args.imageBase64
      : `data:image/png;base64,${args.imageBase64}`;
    const enhancedPrompt = `Edit this image: ${args.prompt}. Keep the exact same building structure, camera angle, and composition. Only change the materials, textures, and lighting to make it look photorealistic.`;

    const headers = {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    };

    const initRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          prompt: enhancedPrompt,
          image_input: [dataUrl],
          aspect_ratio: 'match_input_image',
          output_format: 'jpg',
        },
      }),
    });

    if (!initRes.ok) {
      let detail = '';
      try {
        const errJson = await initRes.json();
        detail = errJson?.detail || errJson?.error || '';
      } catch {
        /* ignore */
      }
      throw new Error(`Replicate request failed (${initRes.status}) ${detail ? `- ${detail}` : ''}`);
    }

    let prediction = await initRes.json();

    const poll = async () => {
      if (!prediction?.urls?.get) {
        throw new Error('Replicate response missing polling URL');
      }
      const res = await fetch(prediction.urls.get, { headers });
      if (!res.ok) {
        throw new Error(`Replicate poll failed (${res.status})`);
      }
      prediction = await res.json();
    };

    const terminalStates = new Set(['succeeded', 'failed', 'canceled']);
    const maxPolls = 30;
    let polls = 0;
    while (!terminalStates.has(prediction?.status) && polls < maxPolls) {
      polls += 1;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await poll();
    }

    if (prediction?.status !== 'succeeded') {
      const detail = prediction?.error || prediction?.status || 'unknown error';
      throw new Error(`Replicate generation failed: ${detail}`);
    }

    let imageUrl: string | null = null;
    const output = prediction?.output;
    if (typeof output === 'string') {
      imageUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      const first = output[0];
      if (typeof first === 'string') {
        imageUrl = first;
      } else if (first && typeof first === 'object' && 'url' in first) {
        const value: any = (first as any).url;
        imageUrl = typeof value === 'function' ? value() : value;
      }
    } else if (output && typeof output === 'object' && 'url' in output) {
      const value: any = (output as any).url;
      imageUrl = typeof value === 'function' ? value() : value;
    }

    if (!imageUrl) {
      throw new Error('No image URL in Replicate response');
    }

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch generated image (${imageRes.status})`);
    }
    const arrayBuffer = await imageRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    // Chunked base64 encode to avoid call stack issues
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64Image = typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(arrayBuffer).toString('base64');
    return `data:image/png;base64,${base64Image}`;
  };

  const electronAPI = getElectronAPI() as any;
  if (isElectron()) {
    if (!electronAPI?.generateAiImage) {
      // Fallback to direct Replicate HTTP in Electron if the bridge is missing
      return runReplicateDirect();
    }

    const data = await electronAPI.generateAiImage(args);

    if (typeof data === 'string') {
      return data;
    }
    if (typeof data === 'object' && data?.url) {
      return data.url as string;
    }
    if (typeof data === 'object' && data?.image) {
      return `data:image/png;base64,${String(data.image)}`;
    }

    throw new Error('No image in response');
  }

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
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
    throw new Error(`AI request failed: ${message}`);
  }
}
