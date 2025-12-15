import React, { useState } from 'react';
import * as OBC from '@thatopen/components';
import { useBIM } from '../../context/BIMContext';
import { Button, Select, Stack, Text, Status, Card } from '../../ui';

export const ExportModifiedIfc: React.FC = () => {
  const { propertyEditingService, components } = useBIM();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  const getLoadedModels = (): Array<{ id: string; name: string }> => {
    if (!components) return [];

    try {
      const fragmentsManager = components.get(OBC.FragmentsManager);
      const models: Array<{ id: string; name: string }> = [];

      fragmentsManager.groups.forEach((group) => {
        if (!group) return;

        const metadataName =
          typeof (group as any)?.ifcMetadata?.name === 'string'
            ? ((group as any).ifcMetadata.name as string).trim()
            : '';
        const explicitName = typeof group.name === 'string' ? group.name.trim() : '';
        const displayName = metadataName || explicitName || group.uuid.substring(0, 8);

        models.push({ id: group.uuid, name: displayName });
      });

      return models;
    } catch (error) {
      return [];
    }
  };

  const handleExport = async () => {
    if (!propertyEditingService || !components || !selectedModelId) {
      alert('Please select a model to export');
      return;
    }

    setIsExporting(true);

    try {
      const fragmentsManager = components.get(OBC.FragmentsManager);
      const model = fragmentsManager.groups.get(selectedModelId);

      if (!model) {
        throw new Error('Selected model not found');
      }

      const hasChanges = propertyEditingService.hasChanges(selectedModelId);

      if (!hasChanges) {
        const confirmExport = confirm('No changes detected for this model. Export anyway?');
        if (!confirmExport) {
          setIsExporting(false);
          return;
        }
      }

      const modifiedIfcData = await propertyEditingService.saveToIfc(model);
      propertyEditingService.downloadModifiedIfc(model, modifiedIfcData);
      propertyEditingService.clearChanges(selectedModelId);

      alert('IFC file exported successfully!');
    } catch (error) {
      console.error('Failed to export IFC:', error);
      alert(`Failed to export IFC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const models = getLoadedModels();
  const hasService = propertyEditingService !== null;
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const hasChanges = selectedModelId
    ? propertyEditingService?.hasChanges(selectedModelId) || false
    : false;

  return (
    <Stack gap="sm">
      <Text variant="muted" size="sm">
        Export your model with all property modifications as a new IFC file.
      </Text>

      {models.length === 0 && (
        <Status variant="warning">
          No models loaded. Load an IFC file first.
        </Status>
      )}

      {models.length > 0 && (
        <>
          <Select
            label="Select Model"
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            disabled={isExporting}
          >
            <option value="">-- Select a model --</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </Select>

          {selectedModel && (
            <Card>
              <Text size="sm">
                <strong>Status:</strong>{' '}
                {hasChanges ? (
                  <span style={{ color: 'var(--ui-warning)' }}>
                    Modified (has unsaved changes)
                  </span>
                ) : (
                  <span style={{ color: 'var(--ui-success)' }}>No changes</span>
                )}
              </Text>
            </Card>
          )}

          <Button
            variant="primary"
            onClick={handleExport}
            disabled={!hasService || !selectedModelId || isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export Modified IFC'}
          </Button>
        </>
      )}

      {!hasService && (
        <Status variant="info">
          Property editing service is initializing...
        </Status>
      )}
    </Stack>
  );
};
