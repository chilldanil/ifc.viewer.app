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
}

