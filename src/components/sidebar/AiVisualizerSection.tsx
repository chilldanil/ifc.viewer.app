import React, { useState } from 'react';
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
  };

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
          <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '11px' }}>
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
                  <img
                    src={originalImage}
                    alt="Original View"
                    className="comparison-image"
                  />
                  <button
                    onClick={handleDownloadOriginal}
                    className="download-mini-btn"
                  >
                    Download
                  </button>
                </div>
              )}

              {resultImage && (
                <div className="comparison-item">
                  <label>AI Render</label>
                  <img
                    src={resultImage}
                    alt="AI Rendered"
                    className="comparison-image"
                  />
                  <button
                    onClick={handleDownloadResult}
                    className="download-mini-btn"
                  >
                    Download
                  </button>
                </div>
              )}

              {loading && !resultImage && (
                <div className="comparison-item loading-placeholder">
                  <label>AI Render</label>
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Generating photorealistic render...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiVisualizerSection;
