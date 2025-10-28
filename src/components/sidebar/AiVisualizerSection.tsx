import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBIM } from '../../context/BIMContext';
import { downloadBase64Image } from '../../utils/captureScreenshot';
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
    // Load API key from localStorage if available
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
      setOriginalImage(imageBase64); // Store original for comparison
      const result = await generateImage(prompt, imageBase64, apiKey);
      setResultImage(result);
      // Save API key to localStorage on successful generation
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
    <div className="ai-visualizer-section">
      <div className="ai-visualizer-header">
        <h3>AI Photorealistic Render</h3>
        <p className="ai-visualizer-description">
          Transform your BIM view into photorealistic architectural visualization
        </p>
      </div>

      <div className="ai-visualizer-content">
        {/* API Key Input */}
        <div className="ai-visualizer-input">
          <label>Replicate API Token:</label>
          <input
            type="password"
            placeholder="r8_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={loading}
          />
          <small className="ai-visualizer-hint">
            Get token at <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer">replicate.com/account/api-tokens</a>
          </small>
        </div>

        {/* Render Style Presets */}
        <div className="render-presets">
          <label>Render Style:</label>
          <div className="preset-buttons">
            {RENDER_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetSelect(preset)}
                className={`preset-btn ${prompt === preset.prompt ? 'active' : ''}`}
                disabled={loading}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="ai-visualizer-input">
          <label>Custom Prompt (optional):</label>
          <textarea
            placeholder="Customize your render style..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            rows={2}
          />
        </div>

        {/* Action Buttons */}
        <div className="ai-visualizer-actions">
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="generate-btn"
          >
            {loading ? 'Rendering...' : 'Render View'}
          </button>

          <button
            onClick={handleClear}
            className="clear-btn"
            disabled={loading}
          >
            Clear
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="ai-visualizer-error">
            {error}
          </div>
        )}

        {/* Side-by-Side Comparison */}
        {(originalImage || resultImage) && (
          <div className="ai-visualizer-comparison">
            <h4>Comparison:</h4>
            <div className="comparison-grid">
              {originalImage && (
                <div className="comparison-item">
                  <label>Original View</label>
                  <div className="comparison-thumb">
                    <img
                      src={originalImage}
                      alt="Original View"
                      className="comparison-image"
                      onClick={() => openViewer('original')}
                    />
                  </div>
                  <div className="comparison-actions">
                    <button
                      type="button"
                      className="preview-mini-btn"
                      onClick={() => openViewer('original')}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadOriginal}
                      className="download-mini-btn"
                    >
                      Download
                    </button>
                  </div>
                </div>
              )}

              {resultImage && (
                <div className="comparison-item">
                  <label>AI Render</label>
                  <div className="comparison-thumb">
                    <img
                      src={resultImage}
                      alt="AI Rendered"
                      className="comparison-image"
                      onClick={() => openViewer('result')}
                    />
                  </div>
                  <div className="comparison-actions">
                    <button
                      type="button"
                      className="preview-mini-btn"
                      onClick={() => openViewer('result')}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadResult}
                      className="download-mini-btn"
                    >
                      Download
                    </button>
                  </div>
                </div>
              )}

              {loading && !resultImage && (
                <div className="comparison-item loading-placeholder">
                  <label>AI Render</label>
                  <div className="comparison-thumb">
                    <div className="spinner" />
                  </div>
                  <p>Generating photorealistic render...</p>
                </div>
              )}
            </div>

            {hasComparison && (
              <div className="comparison-toolbar">
                <button
                  type="button"
                  className="compare-open-btn"
                  onClick={() => openViewer('compare')}
                >
                  Open Compare View
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {viewerMode !== 'none' && portalContainerRef.current
        ? createPortal(
            <div
              className="ai-visualizer-modal"
              role="dialog"
              aria-modal="true"
              onClick={closeViewer}
            >
              <div
                className="ai-visualizer-modal__content"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="ai-visualizer-modal__header">
                  <h4 className="ai-visualizer-modal__title">
                    {viewerMode === 'compare'
                      ? 'Compare Result'
                      : viewerMode === 'original'
                      ? 'Original View'
                      : 'AI Render'}
                  </h4>
                  <button
                    type="button"
                    className="ai-visualizer-modal__close"
                    onClick={closeViewer}
                    aria-label="Close preview"
                  >
                    ✕
                  </button>
                </div>

                {viewerMode === 'compare' && hasComparison ? (
                  <div className="ai-visualizer-compare">
                    <div className="compare-stage">
                      <img
                        src={originalImage as string}
                        alt="Original view"
                        className="compare-stage__image compare-stage__image--base"
                      />
                      <img
                        src={resultImage as string}
                        alt="AI render overlay"
                        className="compare-stage__image compare-stage__image--overlay"
                        style={{ clipPath: `inset(0 ${100 - compareSplit}% 0 0)` }}
                      />
                      <div
                        className="compare-stage__divider"
                        style={{ left: `${compareSplit}%` }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={compareSplit}
                        onChange={handleCompareSlider}
                        className="compare-stage__slider"
                        aria-label="Adjust comparison slider"
                      />
                    </div>
                    <div className="compare-stage__labels">
                      <span>Original</span>
                      <span>AI Render</span>
                    </div>
                  </div>
                ) : (
                  <div className="ai-visualizer-modal__image">
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
                  <div className="ai-visualizer-modal__actions">
                    {viewerMode === 'original' && originalImage && (
                      <button
                        type="button"
                        className="modal-primary-btn"
                        onClick={handleDownloadOriginal}
                      >
                        Download Original
                      </button>
                    )}
                    {viewerMode === 'result' && resultImage && (
                      <button
                        type="button"
                        className="modal-primary-btn"
                        onClick={handleDownloadResult}
                      >
                        Download Render
                      </button>
                    )}
                    {hasComparison && viewerMode !== 'compare' && (
                      <button
                        type="button"
                        className="modal-secondary-btn"
                        onClick={() => openViewer('compare')}
                      >
                        Switch to Compare
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>,
            portalContainerRef.current
          )
        : null}
    </div>
  );
};

export default AiVisualizerSection;
