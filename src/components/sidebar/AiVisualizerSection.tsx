import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBIM } from '../../context/BIMContext';
import { downloadBase64Image } from '../../utils/captureScreenshot';
import { Button, Input, Textarea, Stack, Text, Card, Status, Grid, Row } from '../../ui';
import './AiVisualizerSection.css';

// Photorealistic architectural rendering presets
const RENDER_PRESETS = [
  {
    label: 'Photorealistic',
    prompt: 'photorealistic architectural visualization, professional rendering, high quality, detailed textures, natural lighting, 8k, architectural photography'
  },
  {
    label: 'Modern Interior',
    prompt: 'modern interior design, photorealistic, luxury materials, ambient lighting, contemporary architecture, professional render'
  },
  {
    label: 'Exterior View',
    prompt: 'photorealistic exterior building view, professional architectural photography, blue sky, natural daylight, high detail, 8k quality'
  },
  {
    label: 'Night Scene',
    prompt: 'photorealistic night architectural scene, dramatic lighting, city lights, ambient glow, professional photography, cinematic'
  }
];

// AI Image Generation API function using Nano Banana
async function generateImage(prompt: string, imageBase64: string, apiKey: string): Promise<string> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageBase64, apiKey }),
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage += ` - ${errorData.error}`;
      }
    } catch {
      const errorText = await response.text();
      if (errorText) {
        errorMessage += ` - ${errorText}`;
      }
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Handle different response formats from HuggingFace
  if (typeof data === 'object' && data.url) {
    return data.url;
  }
  if (Array.isArray(data) && data[0]?.image) {
    return `data:image/png;base64,${data[0].image}`;
  }
  if (data.image) {
    return `data:image/png;base64,${data.image}`;
  }

  throw new Error('No image in response');
}

export const AiVisualizerSection: React.FC = () => {
  const { captureScreenshot } = useBIM();
  const [prompt, setPrompt] = useState(RENDER_PRESETS[0].prompt);
  const [loading, setLoading] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('replicate_api_key') || '';
  });
  const [viewerMode, setViewerMode] = useState<'none' | 'original' | 'result' | 'compare'>('none');
  const [compareSplit, setCompareSplit] = useState(50);
  const portalContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const portalNode = document.createElement('div');
    portalNode.className = 'ai-visualizer-portal-root';
    portalContainerRef.current = portalNode;
    document.body.appendChild(portalNode);
    return () => {
      if (portalNode.parentElement) {
        portalNode.parentElement.removeChild(portalNode);
      }
    };
  }, []);

  const handlePresetSelect = (preset: typeof RENDER_PRESETS[0]) => {
    setPrompt(preset.prompt);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {return;}

    if (!apiKey.trim()) {
      setError('Please enter your Replicate API token');
      return;
    }

    setLoading(true);
    setError(null);
    setResultImage(null);

    try {
      const imageBase64 = await captureScreenshot();
      setOriginalImage(imageBase64);
      const result = await generateImage(prompt, imageBase64, apiKey);
      setResultImage(result);
      localStorage.setItem('replicate_api_key', apiKey);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate image. Please try again.';
      setError(errorMessage);
      console.error('AI Visualizer error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadResult = () => {
    if (resultImage) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadBase64Image(resultImage, `ai-render-${timestamp}.png`);
    }
  };

  const handleDownloadOriginal = () => {
    if (originalImage) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadBase64Image(originalImage, `original-view-${timestamp}.png`);
    }
  };

  const handleClear = () => {
    setPrompt(RENDER_PRESETS[0].prompt);
    setOriginalImage(null);
    setResultImage(null);
    setError(null);
    setViewerMode('none');
  };

  const hasComparison = Boolean(originalImage && resultImage);

  const handleCompareSlider = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCompareSplit(Number(event.currentTarget.value));
  };

  const openViewer = (mode: 'original' | 'result' | 'compare') => {
    if (mode === 'original' && !originalImage) {return;}
    if (mode === 'result' && !resultImage) {return;}
    if (mode === 'compare' && !hasComparison) {return;}
    setViewerMode(mode);
  };

  const closeViewer = useCallback(() => {
    setViewerMode('none');
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (viewerMode === 'none') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeViewer();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [viewerMode, closeViewer]);

  useEffect(() => {
    if (viewerMode === 'compare') {
      setCompareSplit(50);
    }
  }, [viewerMode]);

  return (
    <Stack gap="md">
      <div>
        <Text size="sm"><strong>AI Photorealistic Render</strong></Text>
        <Text variant="muted" size="xs">
          Transform your BIM view into photorealistic architectural visualization
        </Text>
      </div>

      {/* API Key Input */}
      <Stack gap="sm">
        <Input
          type="password"
          label="Replicate API Token"
          placeholder="r8_..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={loading}
        />
        <Text variant="subtle" size="xs">
          Get token at{' '}
          <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer" className="ai-link">
            replicate.com/account/api-tokens
          </a>
        </Text>
      </Stack>

      {/* Render Style Presets */}
      <Stack gap="sm">
        <Text variant="muted" size="xs"><strong>Render Style</strong></Text>
        <Grid cols={2}>
          {RENDER_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              onClick={() => handlePresetSelect(preset)}
              selected={prompt === preset.prompt}
              disabled={loading}
              size="sm"
            >
              {preset.label}
            </Button>
          ))}
        </Grid>
      </Stack>

      {/* Custom Prompt */}
      <Textarea
        label="Custom Prompt (optional)"
        placeholder="Customize your render style..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={loading}
        rows={2}
      />

      {/* Action Buttons */}
      <Row stretch>
        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
        >
          {loading ? 'Rendering...' : 'Render View'}
        </Button>
        <Button onClick={handleClear} disabled={loading}>
          Clear
        </Button>
      </Row>

      {/* Error Display */}
      {error && <Status variant="error">{error}</Status>}

      {/* Side-by-Side Comparison */}
      {(originalImage || resultImage) && (
        <Stack gap="sm">
          <Text variant="muted" size="sm"><strong>Comparison</strong></Text>

          <Grid cols={2}>
            {originalImage && (
              <Card className="ai-comparison-card">
                <Text variant="label" size="xs">ORIGINAL VIEW</Text>
                <div className="ai-thumb" onClick={() => openViewer('original')}>
                  <img src={originalImage} alt="Original View" />
                </div>
                <Row stretch>
                  <Button size="sm" variant="ghost" onClick={() => openViewer('original')}>
                    Preview
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDownloadOriginal}>
                    Download
                  </Button>
                </Row>
              </Card>
            )}

            {resultImage && (
              <Card className="ai-comparison-card">
                <Text variant="label" size="xs">AI RENDER</Text>
                <div className="ai-thumb" onClick={() => openViewer('result')}>
                  <img src={resultImage} alt="AI Rendered" />
                </div>
                <Row stretch>
                  <Button size="sm" variant="ghost" onClick={() => openViewer('result')}>
                    Preview
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDownloadResult}>
                    Download
                  </Button>
                </Row>
              </Card>
            )}

            {loading && !resultImage && (
              <Card className="ai-comparison-card ai-loading-card">
                <Text variant="label" size="xs">AI RENDER</Text>
                <div className="ai-thumb">
                  <div className="ai-spinner" />
                </div>
                <Text variant="subtle" size="xs">Generating photorealistic render...</Text>
              </Card>
            )}
          </Grid>

          {hasComparison && (
            <Button variant="primary" size="sm" onClick={() => openViewer('compare')}>
              Open Compare View
            </Button>
          )}
        </Stack>
      )}

      {/* Modal Portal */}
      {viewerMode !== 'none' && portalContainerRef.current
        ? createPortal(
            <div
              className="ai-modal"
              role="dialog"
              aria-modal="true"
              onClick={closeViewer}
            >
              <div className="ai-modal-content" onClick={(event) => event.stopPropagation()}>
                <Row between className="ai-modal-header">
                  <Text size="sm">
                    <strong>
                      {viewerMode === 'compare'
                        ? 'Compare Result'
                        : viewerMode === 'original'
                        ? 'Original View'
                        : 'AI Render'}
                    </strong>
                  </Text>
                  <Button
                    size="sm"
                    icon
                    onClick={closeViewer}
                    aria-label="Close preview"
                  >
                    ✕
                  </Button>
                </Row>

                {viewerMode === 'compare' && hasComparison ? (
                  <div className="ai-compare-stage">
                    <div className="ai-compare-images">
                      <img
                        src={originalImage as string}
                        alt="Original view"
                        className="ai-compare-base"
                      />
                      <img
                        src={resultImage as string}
                        alt="AI render overlay"
                        className="ai-compare-overlay"
                        style={{ clipPath: `inset(0 ${100 - compareSplit}% 0 0)` }}
                      />
                      <div
                        className="ai-compare-divider"
                        style={{ left: `${compareSplit}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={compareSplit}
                      onChange={handleCompareSlider}
                      className="ai-compare-slider"
                      aria-label="Adjust comparison slider"
                    />
                    <Row between>
                      <Text variant="subtle" size="xs">Original</Text>
                      <Text variant="subtle" size="xs">AI Render</Text>
                    </Row>
                  </div>
                ) : (
                  <div className="ai-modal-image">
                    <img
                      src={viewerMode === 'original' ? (originalImage as string) : (resultImage as string)}
                      alt={viewerMode === 'original' ? 'Original view' : 'AI render'}
                    />
                  </div>
                )}

                {viewerMode !== 'compare' && (
                  <Row>
                    {viewerMode === 'original' && originalImage && (
                      <Button variant="primary" onClick={handleDownloadOriginal}>
                        Download Original
                      </Button>
                    )}
                    {viewerMode === 'result' && resultImage && (
                      <Button variant="primary" onClick={handleDownloadResult}>
                        Download Render
                      </Button>
                    )}
                    {hasComparison && (
                      <Button onClick={() => openViewer('compare')}>
                        Switch to Compare
                      </Button>
                    )}
                  </Row>
                )}
              </div>
            </div>,
            portalContainerRef.current
          )
        : null}
    </Stack>
  );
};

export default AiVisualizerSection;
