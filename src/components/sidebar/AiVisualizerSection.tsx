import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBIM } from '../../context/BIMContext';
import { downloadBase64Image } from '../../utils/captureScreenshot';
import {
  AI_RENDER_PRESETS,
  generateAiImage,
  loadReplicateApiKey,
  saveReplicateApiKey,
} from '../../utils/aiVisualizer';
import {
  Button,
  Card,
  Input,
  Row,
  Slider,
  Stack,
  Status,
  Text,
  Textarea,
} from '../../ui';
import './AiVisualizerSection.css';

export const AiVisualizerSection: React.FC = () => {
  const { captureScreenshot } = useBIM();
  const [prompt, setPrompt] = useState(AI_RENDER_PRESETS[0].prompt);
  const [loading, setLoading] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => {
    // Load API key from localStorage if available
    return loadReplicateApiKey();
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
    const host = document.querySelector('.ifc-viewer-library-container') ?? document.body;
    host.appendChild(portalNode);
    return () => {
      if (portalNode.parentElement) {
        portalNode.parentElement.removeChild(portalNode);
      }
    };
  }, []);

  const handlePresetSelect = (preset: (typeof AI_RENDER_PRESETS)[number]) => {
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
      setOriginalImage(imageBase64); // Store original for comparison
      const result = await generateAiImage({ prompt, imageBase64, apiKey });
      setResultImage(result);
      // Save API key to localStorage on successful generation
      saveReplicateApiKey(apiKey);
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
    setPrompt(AI_RENDER_PRESETS[0].prompt);
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
    <Card className="ai-visualizer">
      <Stack gap="md">
        <div className="ai-visualizer__header">
          <h3 className="ai-visualizer__title">AI Photorealistic Render</h3>
          <p className="ai-visualizer__description">
            Transform your BIM view into photorealistic architectural visualization
          </p>
        </div>

        <Stack gap="sm">
          <Input
            type="password"
            label="Replicate API Token"
            placeholder="r8_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={loading}
          />
          <Text variant="subtle" size="xs" className="ai-visualizer__hint">
            Get token at{' '}
            <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer">
              replicate.com/account/api-tokens
            </a>
          </Text>
        </Stack>

        <Stack gap="sm">
          <Text variant="label" as="div">Render Style</Text>
          <div className="ai-visualizer__preset-grid">
            {AI_RENDER_PRESETS.map((preset) => {
              const isActive = prompt === preset.prompt;
              return (
                <Button
                  key={preset.label}
                  variant={isActive ? 'primary' : 'ghost'}
                  selected={isActive}
                  block
                  className="ai-visualizer__preset-btn"
                  onClick={() => handlePresetSelect(preset)}
                  disabled={loading}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
        </Stack>

        <Textarea
          label="Custom Prompt (optional)"
          placeholder="Customize your render style..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
          rows={3}
        />

        <Row stretch className="ai-visualizer__actions">
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            block
          >
            {loading ? 'Rendering...' : 'Render View'}
          </Button>

          <Button
            variant="ghost"
            onClick={handleClear}
            disabled={loading}
            block
          >
            Clear
          </Button>
        </Row>

        {error && (
          <Status variant="error">
            {error}
          </Status>
        )}

        {(originalImage || resultImage) && (
          <Stack gap="sm" className="ai-visualizer__panel">
            <Row between>
              <Text variant="label" as="div">Comparison</Text>
              {hasComparison && (
                <Button variant="ghost" size="sm" onClick={() => openViewer('compare')}>
                  Open Compare View
                </Button>
              )}
            </Row>

            <div className="ai-visualizer__grid">
              {originalImage && (
                <Card className="ai-visualizer__tile">
                  <Text variant="label" as="div" className="ai-visualizer__tile-label">Original View</Text>
                  <button
                    type="button"
                    className="ai-visualizer__thumb"
                    onClick={() => openViewer('original')}
                    aria-label="Open original view"
                  >
                    <img
                      src={originalImage}
                      alt="Original View"
                      className="ai-visualizer__image"
                    />
                  </button>
                  <Row stretch className="ai-visualizer__tile-actions">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openViewer('original')}
                      block
                    >
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDownloadOriginal}
                      block
                    >
                      Download
                    </Button>
                  </Row>
                </Card>
              )}

              {resultImage && (
                <Card className="ai-visualizer__tile">
                  <Text variant="label" as="div" className="ai-visualizer__tile-label">AI Render</Text>
                  <button
                    type="button"
                    className="ai-visualizer__thumb"
                    onClick={() => openViewer('result')}
                    aria-label="Open AI render"
                  >
                    <img
                      src={resultImage}
                      alt="AI Rendered"
                      className="ai-visualizer__image"
                    />
                  </button>
                  <Row stretch className="ai-visualizer__tile-actions">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openViewer('result')}
                      block
                    >
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDownloadResult}
                      block
                    >
                      Download
                    </Button>
                  </Row>
                </Card>
              )}

              {loading && !resultImage && (
                <Card className="ai-visualizer__tile ai-visualizer__tile--loading">
                  <Text variant="label" as="div" className="ai-visualizer__tile-label">AI Render</Text>
                  <div className="ai-visualizer__thumb ai-visualizer__thumb--loading">
                    <div className="ai-visualizer__spinner" />
                  </div>
                  <Text variant="muted" size="sm">Generating photorealistic render...</Text>
                </Card>
              )}
            </div>
          </Stack>
        )}
      </Stack>

      {viewerMode !== 'none' && portalContainerRef.current
        ? createPortal(
            <div
              className="ai-visualizer__modal"
              role="dialog"
              aria-modal="true"
              onClick={closeViewer}
            >
              <div
                className="ai-visualizer__modal-content"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="ai-visualizer__modal-header">
                  <h4 className="ai-visualizer__modal-title">
                    {viewerMode === 'compare'
                      ? 'Compare Result'
                      : viewerMode === 'original'
                      ? 'Original View'
                      : 'AI Render'}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon
                    onClick={closeViewer}
                    aria-label="Close preview"
                  >
                    ✕
                  </Button>
                </div>

                {viewerMode === 'compare' && hasComparison ? (
                  <div className="ai-visualizer__compare">
                    <div className="ai-visualizer__compare-stage">
                      <img
                        src={originalImage as string}
                        alt="Original view"
                        className="ai-visualizer__compare-image ai-visualizer__compare-image--base"
                      />
                      <img
                        src={resultImage as string}
                        alt="AI render overlay"
                        className="ai-visualizer__compare-image ai-visualizer__compare-image--overlay"
                        style={{ clipPath: `inset(0 ${100 - compareSplit}% 0 0)` }}
                      />
                      <div
                        className="ai-visualizer__compare-divider"
                        style={{ left: `${compareSplit}%` }}
                      />
                      <Slider
                        min={0}
                        max={100}
                        value={compareSplit}
                        onChange={handleCompareSlider}
                        className="ai-visualizer__compare-slider"
                        aria-label="Adjust comparison slider"
                        showValue={false}
                      />
                    </div>
                    <div className="ai-visualizer__compare-labels">
                      <span>Original</span>
                      <span>AI Render</span>
                    </div>
                  </div>
                ) : (
                  <div className="ai-visualizer__modal-image">
                    <img
                      src={
                        viewerMode === 'original'
                          ? (originalImage as string)
                          : (resultImage as string)
                      }
                      alt={viewerMode === 'original' ? 'Original view' : 'AI render'}
                    />
                  </div>
                )}

                {viewerMode !== 'compare' && (
                  <div className="ai-visualizer__modal-actions">
                    {viewerMode === 'original' && originalImage && (
                      <Button
                        variant="primary"
                        onClick={handleDownloadOriginal}
                      >
                        Download Original
                      </Button>
                    )}
                    {viewerMode === 'result' && resultImage && (
                      <Button
                        variant="primary"
                        onClick={handleDownloadResult}
                      >
                        Download Render
                      </Button>
                    )}
                    {hasComparison && (
                      <Button
                        variant="ghost"
                        onClick={() => openViewer('compare')}
                      >
                        Switch to Compare
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>,
            portalContainerRef.current
          )
        : null}
    </Card>
  );
};

export default AiVisualizerSection;
