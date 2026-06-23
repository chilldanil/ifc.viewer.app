export type AiRenderMode = 'fast-preview' | 'standard' | 'premium' | 'experimental';

export type RenderIntensity = 'subtle' | 'balanced' | 'strong';

export interface AiVisualizationModeConfig {
  label: string;
  model: string;
  purpose: string;
  supportsViewportReference: boolean;
  estimatedCost: string;
  referenceImageField?: 'image_input' | 'input_images';
}

export const DEFAULT_AI_RENDER_MODE: AiRenderMode = 'standard';

export const AI_VISUALIZATION_MODES: Record<AiRenderMode, AiVisualizationModeConfig> = {
  'fast-preview': {
    label: 'GPT Image 2 Low',
    model: 'openai/gpt-image-2',
    purpose: 'Cheap preview before final generation',
    supportsViewportReference: true,
    estimatedCost: '~$0.012/image',
    referenceImageField: 'input_images',
  },
  standard: {
    label: 'Nano Banana 2',
    model: 'google/nano-banana-2',
    purpose: 'Default AI visualization mode',
    supportsViewportReference: true,
    estimatedCost: '~$0.067/image at 1K',
    referenceImageField: 'image_input',
  },
  premium: {
    label: 'FLUX.2 Max',
    model: 'black-forest-labs/flux-2-max',
    purpose: 'Highest-fidelity reference-image visualization',
    supportsViewportReference: true,
    estimatedCost: '~$0.10+/generation',
    referenceImageField: 'input_images',
  },
  experimental: {
    label: 'FLUX.2 Flex',
    model: 'black-forest-labs/flux-2-flex',
    purpose: 'High-control reference-image based visual output',
    supportsViewportReference: true,
    estimatedCost: '~$0.12+/generation',
    referenceImageField: 'input_images',
  },
};

export const AI_RENDER_MODE_ORDER: AiRenderMode[] = [
  'fast-preview',
  'standard',
  'premium',
  'experimental',
];

export const AI_RENDER_MODE_OPTIONS = AI_RENDER_MODE_ORDER.map((mode) => ({
  value: mode,
  label: AI_VISUALIZATION_MODES[mode].label,
  purpose: AI_VISUALIZATION_MODES[mode].purpose,
  estimatedCost: AI_VISUALIZATION_MODES[mode].estimatedCost,
  disabled: !AI_VISUALIZATION_MODES[mode].supportsViewportReference,
}));

export const AI_GEOMETRY_PRESERVATION_INSTRUCTIONS =
  'Use the provided IFC viewport screenshot as the strict visual reference and source of truth. This is an image-to-image enhancement, not a new design. Preserve the exact same building identity, massing, silhouette, geometry, number of floors, floor heights, facade rhythm, window count and placement, openings, entrance position, roofline, proportions, camera angle, perspective, and structural layout. Improve only materials, surface realism, lighting, atmosphere, city/context background, landscaping, and presentation quality. Do not redesign the building, do not replace it with another building, and do not add or remove floors, windows, doors, balconies, rooms, facade modules, columns, canopies, towers, setbacks, or structural elements unless explicitly requested.';

export const AI_GEOMETRY_NEGATIVE_INSTRUCTIONS =
  'Forbidden: different building, new architecture, redesigned facade, changed window grid, changed number of floors, changed entrance, changed massing, changed roof, extra tower, skyscraper replacement, curtain-wall replacement, random city building, alternate camera angle, cropped-out original building.';

export interface BuildAIVisualizationPromptParams {
  prompt: string;
  intensity?: RenderIntensity;
  negativePrompt?: string;
}

export interface BuildReplicateInputParams extends BuildAIVisualizationPromptParams {
  image: string;
  mode?: AiRenderMode;
  seed?: number;
  aspectRatio?: string;
  outputFormat?: 'jpg' | 'png';
}

export const isAiRenderMode = (value: unknown): value is AiRenderMode =>
  typeof value === 'string' && value in AI_VISUALIZATION_MODES;

export const coerceAiRenderMode = (value: unknown): AiRenderMode =>
  isAiRenderMode(value) ? value : DEFAULT_AI_RENDER_MODE;

export const getAIVisualizationMode = (mode: unknown): AiVisualizationModeConfig =>
  AI_VISUALIZATION_MODES[coerceAiRenderMode(mode)];

export const getReplicateReferenceImageField = (
  input: Record<string, unknown>
): 'image_input' | 'input_images' | null => {
  if (Array.isArray(input.image_input) && input.image_input.length > 0) {
    return 'image_input';
  }
  if (Array.isArray(input.input_images) && input.input_images.length > 0) {
    return 'input_images';
  }
  return null;
};

export const normalizeImageDataUrl = (image: string): string => {
  const trimmed = image.trim();
  if (!trimmed) {
    throw new Error('Current viewport screenshot is missing. Capture a view before generating.');
  }
  return trimmed.startsWith('data:') ? trimmed : `data:image/png;base64,${trimmed}`;
};

export const sanitizeAIVisualizationText = (text: string): string => {
  const replacements: Record<string, string> = {
    '\u2026': '...',
    '\u2013': '-',
    '\u2014': '-',
    '\u2018': "'",
    '\u2019': "'",
    '\u201a': "'",
    '\u201b': "'",
    '\u201c': '"',
    '\u201d': '"',
    '\u201e': '"',
    '\u201f': '"',
    '\u2022': '*',
    '\u00b7': '*',
    '\u2192': '->',
    '\u2190': '<-',
    '\u00a0': ' ',
  };
  return Array.from(text)
    .map((char) => replacements[char] ?? char)
    .map((value) =>
      Array.from(value)
        .filter((char) => (char.codePointAt(0) ?? 0) <= 255)
        .join('')
    )
    .join('');
};

export const buildAIVisualizationPrompt = ({
  prompt,
  intensity = 'balanced',
  negativePrompt = '',
}: BuildAIVisualizationPromptParams): string => {
  const subject = sanitizeAIVisualizationText(prompt).trim() || 'architectural visualization';
  const negative = sanitizeAIVisualizationText(negativePrompt).trim();

  const intensityInstruction =
    intensity === 'subtle'
      ? 'Apply a subtle concept render treatment with restrained material, texture, and lighting improvements.'
      : intensity === 'strong'
        ? 'Create a fully realized concept render with polished materials, lighting, atmosphere, and presentation quality.'
        : 'Create a balanced concept render with improved materials, lighting, atmosphere, and presentation quality.';

  return [
    AI_GEOMETRY_PRESERVATION_INSTRUCTIONS,
    intensityInstruction,
    `Design request: ${subject}.`,
    AI_GEOMETRY_NEGATIVE_INSTRUCTIONS,
    negative ? `Avoid: ${negative}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
};

const normalizeOutputFormat = (format: 'jpg' | 'png' | undefined): 'jpg' | 'png' =>
  format === 'png' ? 'png' : 'jpg';

const normalizeJpegOutputFormat = (format: 'jpg' | 'png' | undefined): 'jpeg' | 'png' =>
  format === 'png' ? 'png' : 'jpeg';

const gptAspectRatio = (
  aspectRatio: string | undefined
): '1:1' | '3:2' | '2:3' | '16:9' | '9:16' | 'auto' => {
  if (aspectRatio === 'match_input_image' || !aspectRatio) {
    return 'auto';
  }
  if (
    aspectRatio === '1:1' ||
    aspectRatio === '3:2' ||
    aspectRatio === '2:3' ||
    aspectRatio === '16:9' ||
    aspectRatio === '9:16'
  ) {
    return aspectRatio;
  }
  return 'auto';
};

export const buildReplicateInput = (params: BuildReplicateInputParams): Record<string, unknown> => {
  const mode = coerceAiRenderMode(params.mode);
  const selectedMode = AI_VISUALIZATION_MODES[mode];
  const dataUrl = normalizeImageDataUrl(params.image);
  const prompt = buildAIVisualizationPrompt(params);
  const aspectRatio = params.aspectRatio || 'match_input_image';
  const outputFormat = normalizeOutputFormat(params.outputFormat);

  if (!selectedMode.supportsViewportReference || !selectedMode.referenceImageField) {
    throw new Error(
      `${selectedMode.label} uses ${selectedMode.model}, which is not enabled for strict viewport-reference editing here. Choose a reference-image AI model to preserve the same IFC building geometry.`
    );
  }

  if (mode === 'fast-preview') {
    const input: Record<string, unknown> = {
      prompt,
      input_images: [dataUrl],
      quality: 'low',
      number_of_images: 1,
      output_format: normalizeJpegOutputFormat(params.outputFormat),
    };
    input.aspect_ratio = gptAspectRatio(aspectRatio);
    return input;
  }

  if (mode === 'experimental') {
    const input: Record<string, unknown> = {
      prompt,
      input_images: [dataUrl],
      aspect_ratio: aspectRatio,
      output_format: outputFormat,
      steps: 30,
      guidance: 4.5,
    };
    if (typeof params.seed === 'number' && Number.isFinite(params.seed)) {
      input.seed = Math.floor(params.seed);
    }
    return input;
  }

  if (mode === 'premium') {
    const input: Record<string, unknown> = {
      prompt,
      input_images: [dataUrl],
      aspect_ratio: aspectRatio,
      output_format: outputFormat,
      resolution: 'match_input_image',
    };
    if (typeof params.seed === 'number' && Number.isFinite(params.seed)) {
      input.seed = Math.floor(params.seed);
    }
    return input;
  }

  return {
    prompt,
    image_input: [dataUrl],
    aspect_ratio: aspectRatio,
    output_format: outputFormat,
  };
};

const resolveUrlValue = (urlValue: unknown): string | null => {
  if (typeof urlValue === 'function') {
    try {
      return resolveUrlValue((urlValue as () => unknown)());
    } catch {
      return null;
    }
  }
  if (typeof urlValue === 'string') {
    return urlValue;
  }
  if (urlValue && typeof urlValue === 'object' && 'href' in (urlValue as Record<string, unknown>)) {
    return String((urlValue as { href: unknown }).href);
  }
  return null;
};

export const extractReplicateImageUrl = (value: unknown): string | null => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'function') {
    return resolveUrlValue(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractReplicateImageUrl(item);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('url' in obj) {
      const found = resolveUrlValue(obj.url);
      if (found) {
        return found;
      }
    }
    if (typeof obj.href === 'string') {
      return obj.href;
    }
    if (obj.output) {
      return extractReplicateImageUrl(obj.output);
    }
    if (obj.urls) {
      return extractReplicateImageUrl(obj.urls);
    }
  }
  return null;
};
