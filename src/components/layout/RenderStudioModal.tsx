import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Button,
  Select,
  Slider,
  Toggle,
  Textarea,
  Input,
  Text,
  Row,
  Stack,
  Status,
} from '../../ui';
import { useBIM } from '../../context/BIMContext';
import { useRenderGallery } from '../../context/RenderGalleryContext';
import { useElementSelection } from '../../hooks/useElementSelection';
import {
  captureRenderPlate,
  cropPlate,
  type NormalizedRect,
  type RenderPlate,
} from '../../utils/renderPlate';
import {
  generateAIVisualization,
  loadReplicateApiKey,
  saveReplicateApiKey,
  type AiRenderMode,
  type RenderIntensity,
} from '../../utils/aiVisualizer';
import {
  AI_RENDER_MODE_OPTIONS,
  DEFAULT_AI_RENDER_MODE,
  getAIVisualizationMode,
} from '../../utils/aiVisualizationRouter';
import './RenderStudioModal.css';

interface RenderStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Fragment {
  label: string;
  fragment: string;
}

const STYLE_PRESETS: Fragment[] = [
  {
    label: 'Photoreal',
    fragment:
      'photorealistic architectural visualization, professional rendering, detailed textures, 8k',
  },
  {
    label: 'Interior',
    fragment: 'modern interior design, luxury materials, ambient lighting, contemporary',
  },
  {
    label: 'Exterior',
    fragment: 'photorealistic exterior, architectural photography, high detail',
  },
  { label: 'Sketch', fragment: 'architectural concept sketch, hand-drawn, soft pencil shading' },
];
const TIME_PRESETS: Fragment[] = [
  { label: 'Dawn', fragment: 'soft dawn light' },
  { label: 'Midday', fragment: 'bright midday sun' },
  { label: 'Golden hour', fragment: 'warm golden-hour light' },
  { label: 'Dusk', fragment: 'dusk blue-hour light' },
  { label: 'Night', fragment: 'night time, artificial lighting' },
];
const MOOD_PRESETS: Fragment[] = [
  { label: 'Calm', fragment: 'calm serene atmosphere' },
  { label: 'Dramatic', fragment: 'dramatic moody atmosphere' },
  { label: 'Minimal', fragment: 'minimal clean aesthetic' },
  { label: 'Cinematic', fragment: 'cinematic composition, depth of field' },
];

const ASPECT_OPTIONS = [
  { value: 'match_input_image', label: 'Match view' },
  { value: '16:9', label: '16:9' },
  { value: '3:2', label: '3:2' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' },
  { value: '9:16', label: '9:16 (portrait)' },
];

const randomSeed = () => Math.floor(Math.random() * 1_000_000_000);

interface ResultItem {
  id: string;
  url: string;
  seed: number;
}

// ----------------------------------------------------------------------------
// Crop selector: drag a rectangle over the plate; reports a normalized rect.
// ----------------------------------------------------------------------------
const CropSelector: React.FC<{
  src: string;
  rect: NormalizedRect | null;
  onChange: (rect: NormalizedRect | null) => void;
}> = ({ src, rect, onChange }) => {
  const ref = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const toLocal = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) {
      return { x: 0, y: 0 };
    }
    const b = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - b.left) / b.width)),
      y: Math.max(0, Math.min(1, (clientY - b.top) / b.height)),
    };
  };

  const handleDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragStart.current = toLocal(e.clientX, e.clientY);
    onChange(null);
  };
  const handleMove = (e: React.PointerEvent) => {
    if (!dragStart.current) {
      return;
    }
    const p = toLocal(e.clientX, e.clientY);
    const s = dragStart.current;
    onChange({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    });
  };
  const handleUp = () => {
    if (rect && (rect.w < 0.02 || rect.h < 0.02)) {
      onChange(null);
    }
    dragStart.current = null;
  };

  return (
    <div
      ref={ref}
      className="render-studio-crop"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
    >
      <img src={src} alt="Render plate" className="render-studio-crop-img" draggable={false} />
      {rect && (
        <>
          <div className="render-studio-crop-shade" />
          <div
            className="render-studio-crop-rect"
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
            }}
          />
        </>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Chip group
// ----------------------------------------------------------------------------
const Chips: React.FC<{
  options: Fragment[];
  selected: string[];
  onToggle: (label: string) => void;
}> = ({ options, selected, onToggle }) => (
  <div className="render-studio-chips">
    {options.map((opt) => (
      <button
        key={opt.label}
        type="button"
        className={`render-studio-chip ${selected.includes(opt.label) ? 'render-studio-chip--on' : ''}`}
        onClick={() => onToggle(opt.label)}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export const RenderStudioModal: React.FC<RenderStudioModalProps> = ({ isOpen, onClose }) => {
  const { world, components } = useBIM();
  const { addRender } = useRenderGallery();
  const { selectedModel } = useElementSelection(components, world);

  const [apiKey, setApiKey] = useState('');

  // Shot setup
  const [subject, setSubject] = useState<'whole' | 'selection'>('whole');
  const [cleanPlate, setCleanPlate] = useState(true);
  const [scale, setScale] = useState(2);
  const [plate, setPlate] = useState<RenderPlate | null>(null);
  const [crop, setCrop] = useState<NormalizedRect | null>(null);

  // Prompt
  const [styles, setStyles] = useState<string[]>(['Photoreal']);
  const [times, setTimes] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');

  // Settings
  const [variations, setVariations] = useState(2);
  const [renderMode, setRenderMode] = useState<AiRenderMode>(DEFAULT_AI_RENDER_MODE);
  const [intensity, setIntensity] = useState<RenderIntensity>('balanced');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('match_input_image');
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png'>('jpg');
  const [seedLocked, setSeedLocked] = useState(false);
  const [seed, setSeed] = useState(randomSeed());

  // Run
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enlarge, setEnlarge] = useState<string | null>(null);

  const hasSelection = Boolean(selectedModel);
  const selectedMode = useMemo(() => getAIVisualizationMode(renderMode), [renderMode]);

  useEffect(() => {
    let cancelled = false;
    void loadReplicateApiKey().then((k) => {
      if (!cancelled) {
        setApiKey(k);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const fragmentsFor = (presets: Fragment[], selected: string[]) =>
    presets.filter((p) => selected.includes(p.label)).map((p) => p.fragment);

  const finalPrompt = useMemo(() => {
    return [
      ...fragmentsFor(STYLE_PRESETS, styles),
      ...fragmentsFor(TIME_PRESETS, times),
      ...fragmentsFor(MOOD_PRESETS, moods),
      customPrompt.trim(),
    ]
      .filter(Boolean)
      .join(', ');
  }, [styles, times, moods, customPrompt]);

  const capture = useCallback(() => {
    if (!world) {
      setError('Viewer not ready.');
      return;
    }
    try {
      const keepObjects =
        subject === 'selection' && selectedModel
          ? [((selectedModel as any).object ?? selectedModel) as any]
          : null;
      const captured = captureRenderPlate(world, {
        scale,
        hideHelpers: cleanPlate,
        keepObjects,
        format: 'image/jpeg',
        quality: 0.92,
      });
      setPlate(captured);
      setCrop(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture the view.');
    }
  }, [world, subject, selectedModel, scale, cleanPlate]);

  // Auto-capture a plate when the studio opens.
  useEffect(() => {
    if (isOpen && world && !plate) {
      capture();
    }
    if (!isOpen) {
      setPlate(null);
      setResults([]);
      setError(null);
      setCrop(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, world]);

  const toggle =
    (setter: React.Dispatch<React.SetStateAction<string[]>>, single = false) =>
    (label: string) =>
      setter((prev) =>
        prev.includes(label) ? prev.filter((l) => l !== label) : single ? [label] : [...prev, label]
      );

  const generate = useCallback(async () => {
    if (!plate) {
      setError('Capture a view first.');
      return;
    }
    if (!finalPrompt) {
      setError('Pick a style or write a prompt.');
      return;
    }
    if (!selectedMode.supportsViewportReference) {
      setError(
        `${selectedMode.label} uses ${selectedMode.model}, which is not enabled for strict viewport-reference editing here. Choose a reference-image AI model to preserve the same IFC building geometry.`
      );
      return;
    }
    if (!apiKey.trim()) {
      setError('Enter your Replicate API token.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setProgress({ done: 0, total: variations });

    let base = plate.dataUrl;
    try {
      if (crop) {
        base = (await cropPlate(plate.dataUrl, crop, 'image/jpeg', 0.92)).dataUrl;
      }
    } catch {
      /* fall back to full plate */
    }

    let anySucceeded = false;
    let lastError = '';
    for (let i = 0; i < variations; i += 1) {
      const useSeed = seedLocked ? seed : randomSeed();
      try {
        const result = await generateAIVisualization({
          prompt: finalPrompt,
          image: base,
          mode: renderMode,
          apiKey,
          negativePrompt,
          seed: useSeed,
          aspectRatio,
          outputFormat,
          intensity,
        });
        setResults((prev) => [...prev, { id: `${Date.now()}-${i}`, url: result, seed: useSeed }]);
        addRender({ kind: 'ai', dataUrl: result, prompt: finalPrompt });
        anySucceeded = true;
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Generation failed.';
      } finally {
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    }

    if (anySucceeded) {
      void saveReplicateApiKey(apiKey);
    } else {
      setError(lastError || 'All renders failed.');
    }
    setLoading(false);
  }, [
    plate,
    apiKey,
    finalPrompt,
    variations,
    crop,
    seedLocked,
    seed,
    negativePrompt,
    aspectRatio,
    outputFormat,
    intensity,
    renderMode,
    selectedMode,
    addRender,
  ]);

  const closeLightbox = useCallback(() => {
    setEnlarge(null);
  }, []);

  useEffect(() => {
    if (!enlarge) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeLightbox();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enlarge, closeLightbox]);

  const applyResultAsBase = useCallback((url: string) => {
    setPlate({ dataUrl: url, width: 0, height: 0 });
    setCrop(null);
    setResults([]);
  }, []);

  const exportResult = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `render-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Render Studio" size="lg">
      <div className="render-studio">
        {/* Controls column */}
        <div className="render-studio-controls">
          <Stack gap="md">
            <Input
              type="password"
              label="Replicate API Token"
              placeholder="r8_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />

            <section>
              <Text variant="label" as="div">
                AI Visualization
              </Text>
              <div className="render-studio-mode-seg">
                {AI_RENDER_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={renderMode === option.value ? 'on' : ''}
                    onClick={() => {
                      if (!option.disabled) {
                        setRenderMode(option.value);
                      }
                    }}
                    disabled={option.disabled}
                    title={
                      option.disabled
                        ? 'Unavailable for same-building viewport reference output'
                        : `${option.purpose}. Estimated cost: ${option.estimatedCost}`
                    }
                  >
                    <span>{option.label}</span>
                    <small>{option.estimatedCost}</small>
                  </button>
                ))}
              </div>
              <Text variant="subtle" size="xs" as="div" className="render-studio-ai-note">
                AI Visualization is a conceptual enhancement of the current viewport and may not
                preserve exact BIM geometry.
              </Text>
            </section>

            <section>
              <Text variant="label" as="div">
                1 · Shot
              </Text>
              <div className="render-studio-seg">
                <button
                  type="button"
                  className={subject === 'whole' ? 'on' : ''}
                  onClick={() => setSubject('whole')}
                >
                  Whole scene
                </button>
                <button
                  type="button"
                  className={subject === 'selection' ? 'on' : ''}
                  onClick={() => hasSelection && setSubject('selection')}
                  disabled={!hasSelection}
                  title={hasSelection ? 'Render only the selected model' : 'Select a model first'}
                >
                  Selected model
                </button>
              </div>
              <Toggle checked={cleanPlate} onChange={setCleanPlate} label="Hide grid & gizmos" />
              <div className="render-studio-seg render-studio-seg--scale">
                {[1, 2, 4].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={scale === s ? 'on' : ''}
                    onClick={() => setScale(s)}
                  >
                    {s}×
                  </button>
                ))}
              </div>
              <Row>
                <Button size="sm" variant="primary" onClick={capture} block>
                  Recapture view
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCrop(null)}
                  disabled={!crop}
                  block
                >
                  Clear crop
                </Button>
              </Row>
              <Text variant="subtle" size="xs" as="div">
                Close the studio to reframe the camera, then reopen. Drag on the plate to crop a
                region.
              </Text>
            </section>

            <section>
              <Text variant="label" as="div">
                2 · Look
              </Text>
              <Text variant="muted" size="xs" as="div">
                Style
              </Text>
              <Chips options={STYLE_PRESETS} selected={styles} onToggle={toggle(setStyles)} />
              <Text variant="muted" size="xs" as="div">
                Time of day
              </Text>
              <Chips options={TIME_PRESETS} selected={times} onToggle={toggle(setTimes, true)} />
              <Text variant="muted" size="xs" as="div">
                Mood
              </Text>
              <Chips options={MOOD_PRESETS} selected={moods} onToggle={toggle(setMoods, true)} />
              <Textarea
                label="Custom prompt"
                placeholder="Add specifics: materials, surroundings, mood..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={2}
              />
            </section>

            <section>
              <Text variant="label" as="div">
                3 · Settings
              </Text>
              <Slider
                label="Variations"
                min={1}
                max={4}
                step={1}
                value={variations}
                onChange={(e) => setVariations(Number(e.currentTarget.value))}
              />
              <div className="render-studio-seg">
                {(['subtle', 'balanced', 'strong'] as RenderIntensity[]).map((i) => (
                  <button
                    key={i}
                    type="button"
                    className={intensity === i ? 'on' : ''}
                    onClick={() => setIntensity(i)}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <Select
                label="Aspect ratio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                options={ASPECT_OPTIONS}
              />
              <Select
                label="Format"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as 'jpg' | 'png')}
                options={[
                  { value: 'jpg', label: 'JPG' },
                  { value: 'png', label: 'PNG' },
                ]}
              />
              <Input
                label="Negative prompt"
                placeholder="blurry, people, text..."
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
              />
              <div className="render-studio-seed">
                <Toggle checked={seedLocked} onChange={setSeedLocked} label="Lock seed" />
                <input
                  className="render-studio-seed-input"
                  type="number"
                  value={seed}
                  disabled={!seedLocked}
                  onChange={(e) => setSeed(Number(e.target.value) || 0)}
                />
                <button
                  type="button"
                  className="render-studio-seed-shuffle"
                  onClick={() => setSeed(randomSeed())}
                  title="Shuffle seed"
                >
                  ⟳
                </button>
              </div>
            </section>

            {error && <Status variant="error">{error}</Status>}

            <Button
              variant="primary"
              onClick={generate}
              disabled={loading || !plate || !selectedMode.supportsViewportReference}
              block
            >
              {loading
                ? `Generating ${progress.done}/${progress.total}...`
                : `Generate ${variations} ${selectedMode.label} ${variations === 1 ? 'visualization' : 'visualizations'}`}
            </Button>
          </Stack>
        </div>

        {/* Preview + results column */}
        <div className="render-studio-stage">
          <div className="render-studio-plate">
            {plate ? (
              <CropSelector src={plate.dataUrl} rect={crop} onChange={setCrop} />
            ) : (
              <div className="render-studio-plate-empty">Capturing view…</div>
            )}
          </div>

          <Text variant="label" as="div">
            Results
          </Text>
          <div className="render-studio-results">
            {results.length === 0 && !loading && (
              <div className="render-studio-results-empty">Your renders will appear here.</div>
            )}
            {results.map((r) => (
              <div key={r.id} className="render-studio-result">
                <button
                  type="button"
                  className="render-studio-result-thumb"
                  onClick={() => setEnlarge(r.url)}
                >
                  <img src={r.url} alt="AI visualization" loading="lazy" />
                </button>
                <div className="render-studio-result-actions">
                  <button
                    type="button"
                    onClick={() => applyResultAsBase(r.url)}
                    title="Use as base for the next render"
                  >
                    ↺ Base
                  </button>
                  <button type="button" onClick={() => exportResult(r.url)} title="Export PNG">
                    ⤓
                  </button>
                </div>
              </div>
            ))}
            {loading &&
              Array.from({ length: Math.max(0, progress.total - results.length) }).map((_, i) => (
                <div
                  key={`pending-${i}`}
                  className="render-studio-result render-studio-result--pending"
                >
                  <div className="render-studio-spinner" />
                </div>
              ))}
          </div>
        </div>
      </div>

      {enlarge && (
        <div
          className="render-studio-lightbox"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="AI visualization preview"
        >
          <button
            type="button"
            className="render-studio-lightbox-close"
            onClick={closeLightbox}
            aria-label="Close preview"
          >
            ×
          </button>
          <img src={enlarge} alt="Render preview" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </Modal>
  );
};

export default RenderStudioModal;
