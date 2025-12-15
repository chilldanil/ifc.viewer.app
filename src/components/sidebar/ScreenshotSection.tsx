import React, { useState } from 'react';
import { useBIM } from '../../context/BIMContext';
import { Button, Text, Stack, Status } from '../../ui';

export const ScreenshotSection: React.FC = () => {
  const { captureScreenshot, world } = useBIM();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!world?.renderer) {
      setError('Viewer not ready yet.');
      return;
    }

    setIsDownloading(true);
    setError(null);
    try {
      const dataUrl = await captureScreenshot();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `bim-screenshot-${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
      setError('Failed to capture screenshot. Try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <bim-panel-section label="Screenshot" collapsed>
      <Stack gap="sm">
        <Text variant="muted" size="sm">
          Capture the current viewport as a PNG image. Make sure the model is fully visible before downloading.
        </Text>
        {error && <Status variant="error">{error}</Status>}
        <Button
          variant="primary"
          onClick={handleDownload}
          disabled={isDownloading || !world?.renderer}
        >
          {isDownloading ? 'Preparing…' : 'Download Screenshot'}
        </Button>
      </Stack>
    </bim-panel-section>
  );
};
