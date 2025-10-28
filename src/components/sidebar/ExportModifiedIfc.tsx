import React, { useState } from 'react';
import * as OBC from '@thatopen/components';
import { useBIM } from '../../context/BIMContext';
import './ExportModifiedIfc.css';

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

        models.push({
          id: group.uuid,
          name: displayName,
        });
      });

      return models;
    } catch (error) {
      console.warn('Error getting loaded models:', error);
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

      // Check if there are any changes
      const hasChanges = propertyEditingService.hasChanges(selectedModelId);

      if (!hasChanges) {
        const confirmExport = confirm(
          'No changes detected for this model. Export anyway?'
        );
        if (!confirmExport) {
          setIsExporting(false);
          return;
        }
      }

      // Save modifications to IFC
      const modifiedIfcData = await propertyEditingService.saveToIfc(model);

      // Download the file
      propertyEditingService.downloadModifiedIfc(model, modifiedIfcData);

      // Clear changes after export
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
    <div className="export-modified-ifc">
      <div className="export-modified-ifc__info">
        Export your model with all property modifications as a new IFC file.
      </div>

      {models.length === 0 && (
        <div className="export-modified-ifc__warning">
          No models loaded. Load an IFC file first.
        </div>
      )}

      {models.length > 0 && (
        <>
          <div className="export-modified-ifc__field">
            <label htmlFor="export-model-select">Select Model:</label>
            <select
              id="export-model-select"
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
            </select>
          </div>

          {selectedModel && (
            <div className="export-modified-ifc__status">
              <strong>Status:</strong>{' '}
              {hasChanges ? (
                <span className="export-modified-ifc__status--modified">
                  Modified (has unsaved changes)
                </span>
              ) : (
                <span className="export-modified-ifc__status--clean">No changes</span>
              )}
            </div>
          )}

          <button
            className="export-modified-ifc__button"
            onClick={handleExport}
            disabled={!hasService || !selectedModelId || isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export Modified IFC'}
          </button>
        </>
      )}

      {!hasService && (
        <div className="export-modified-ifc__info">
          Property editing service is initializing...
        </div>
      )}
    </div>
  );
};
