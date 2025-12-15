import { useEffect, useRef, useState } from 'react';
import { Button, Row, Stack, Status, Text, Textarea } from '../../ui';
import './AiVisualizerOverlay.css';

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
        <div className="ai-overlay" ref={overlayRef} role="dialog" aria-modal="true">
            <div className="ai-overlay__panel">
                <Row between className="ai-overlay__header">
                    <div>
                        <h3 className="ai-overlay__title">AI Visualizer</h3>
                        <Text variant="muted" size="sm" className="ai-overlay__subtitle">
                            Generate concepts directly from the current viewport.
                        </Text>
                    </div>
                    <Button variant="ghost" size="sm" icon onClick={onClose} aria-label="Close AI Visualizer">
                        ✕
                    </Button>
                </Row>

                <Stack gap="md">
                    <Textarea
                        label="Describe the visualization"
                        placeholder="Describe the mood, materials, and lighting you want to see..."
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        disabled={loading}
                        rows={4}
                    />

                    <Row between className="ai-overlay__actions">
                        <Text variant="subtle" size="xs">
                            Uses your current camera view as the base image
                        </Text>
                        <Button variant="primary" onClick={handleGenerate} disabled={loading || !prompt}>
                            {loading ? 'Generating...' : 'Generate'}
                        </Button>
                    </Row>

                    {loading && (
                        <Status variant="info">
                            Generating image, please wait...
                        </Status>
                    )}

                    {error && <Status variant="error">{error}</Status>}

                    {resultImage && (
                        <div className="ai-overlay__result">
                            <img src={resultImage} alt="AI result" />
                        </div>
                    )}
                </Stack>
            </div>
        </div>
    );
};
