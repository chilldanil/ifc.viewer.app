import { useEffect, useRef, useState } from 'react';
import { Button, Textarea, Stack, Text, Status, Row, Card } from '../../ui';
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
            <Stack gap="md" className="ai-overlay-panel">
                <Row between className="ai-overlay-header">
                    <Text size="sm"><strong>AI Visualizer</strong></Text>
                    <Button size="sm" icon onClick={onClose}>✕</Button>
                </Row>

                <Stack gap="sm" className="ai-overlay-chat">
                    <Textarea
                        placeholder="Describe the visualization..."
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        disabled={loading}
                        rows={4}
                    />
                    <Button
                        variant="primary"
                        onClick={handleGenerate}
                        disabled={loading || !prompt}
                    >
                        {loading ? 'Generating...' : 'Generate'}
                    </Button>
                </Stack>

                {loading && (
                    <Status variant="info">
                        <span className="ai-overlay-spinner" /> Generating image, please wait...
                    </Status>
                )}

                {error && <Status variant="error">{error}</Status>}

                {resultImage && (
                    <Card className="ai-overlay-result">
                        <img src={resultImage} alt="AI result" />
                    </Card>
                )}
            </Stack>
        </div>
    );
};
