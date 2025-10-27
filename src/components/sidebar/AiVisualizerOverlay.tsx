import './AiVisualizerOverlay.css';
import { useEffect, useRef, useState } from 'react';

type Props = {
    onClose: () => void;
    captureScreenshot: () => Promise<string>;
};

// AI image generation API call
async function generateImage(prompt: string, imageBase64: string): Promise<string> {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imageBase64 }),
    });
    if (!response.ok) {
        throw new Error('Failed to generate image');
    }
    const data = await response.json();
    // If HuggingFace returned a link to the image
    if (typeof data === 'object' && data.url) {
        return data.url;
    }
    // If HuggingFace returned an array with an image
    if (Array.isArray(data) && data[0]?.image) {
        return `data:image/png;base64,${data[0].image}`;
    }
    // If HuggingFace returned just base64
    if (data.image) {
        return `data:image/png;base64,${data.image}`;
    }
    throw new Error('No image in response');
}

export const AiVisualizerOverlay = ({ onClose, captureScreenshot }: Props) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {onClose();}
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setResultImage(null);
        try {
            const imageBase64 = await captureScreenshot();
            const result = await generateImage(prompt, imageBase64);
            setResultImage(result);
        } catch (err) {
            setError('Failed to generate image.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-overlay" ref={overlayRef}>
            <div className="ai-panel">
                <div className="ai-header">
                    <h2>AI Visualizer</h2>
                    <button onClick={onClose}>✕</button>
                </div>
                <div className="ai-chat">
                    <textarea
                        placeholder="Describe the visualization..."
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        disabled={loading}
                    />
                    <button onClick={handleGenerate} disabled={loading || !prompt}>
                        {loading ? (
                            <span>
                                <span className="ai-spinner" /> Generating...
                            </span>
                        ) : 'Generate'}
                    </button>
                </div>
                {loading && (
                    <div className="ai-loading">
                        <span className="ai-spinner" /> Generating image, please wait...
                    </div>
                )}
                {error && <div className="ai-error">{error}</div>}
                {resultImage && (
                    <div className="ai-result">
                        <img src={resultImage} alt="AI result" style={{ maxWidth: '100%', maxHeight: 300 }} />
                    </div>
                )}
            </div>
        </div>
    );
};
