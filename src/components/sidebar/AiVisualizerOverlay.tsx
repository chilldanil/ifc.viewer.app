import { useEffect, useRef, useState } from 'react';
import { Button, Row, Stack, Status, Text, Textarea } from '../../ui';
import { generateAiImage, loadReplicateApiKey } from '../../utils/aiVisualizer';
import './AiVisualizerOverlay.css';

type Props = {
    onClose: () => void;
    captureScreenshot: () => Promise<string>;
};

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
            const apiKey = loadReplicateApiKey();
            if (!apiKey.trim()) {
                throw new Error('Replicate API token not set');
            }
            const imageBase64 = await captureScreenshot();
            const result = await generateAiImage({ prompt, imageBase64, apiKey });
            setResultImage(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate image.';
            setError(errorMessage);
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
