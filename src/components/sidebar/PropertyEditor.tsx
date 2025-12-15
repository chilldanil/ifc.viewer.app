import React, { useState, useEffect, useCallback } from 'react';
import * as OBF from '@thatopen/fragments';
import { useBIM } from '../../context/BIMContext';
import { Button, Input, Select, Stack, Text, Card, Row, Status } from '../../ui';
import './PropertyEditor.css';

interface PropertyData {
  name: string;
  value: any;
  type?: string;
  expressID: number;
  isEditable: boolean;
}

interface PropertyEditorProps {
  selectedModel: OBF.FragmentsGroup | null;
  selectedExpressID: number | null;
}

export const PropertyEditor: React.FC<PropertyEditorProps> = ({
  selectedModel,
  selectedExpressID,
}) => {
  const { propertyEditingService, components } = useBIM();
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [editedProperties, setEditedProperties] = useState<Map<string, any>>(new Map());
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateProperty, setShowCreateProperty] = useState(false);
  const [newProperty, setNewProperty] = useState({
    name: '',
    value: '',
    type: 'string' as 'string' | 'number' | 'boolean',
  });

  useEffect(() => {
    if (!selectedModel || selectedExpressID === null || !components) {
      setProperties([]);
      return;
    }
    loadProperties();
  }, [selectedModel, selectedExpressID, components]);

  const loadProperties = useCallback(async () => {
    if (!selectedModel || selectedExpressID === null || !components) return;

    try {
      const modelData = (selectedModel as any);
      let entity: any = null;

      if (modelData._properties && modelData._properties[selectedExpressID]) {
        entity = modelData._properties[selectedExpressID];
      } else if (modelData.ifcMetadata?.properties?.[selectedExpressID]) {
        entity = modelData.ifcMetadata.properties[selectedExpressID];
      } else if (modelData.data?.[selectedExpressID]) {
        entity = modelData.data[selectedExpressID];
      } else if (modelData.properties?.[selectedExpressID]) {
        entity = modelData.properties[selectedExpressID];
      }

      if (!entity) {
        const basicProps: PropertyData[] = [
          { name: 'ExpressID', value: selectedExpressID, type: 'number', expressID: selectedExpressID, isEditable: false },
          { name: 'Model', value: selectedModel.uuid, type: 'string', expressID: selectedExpressID, isEditable: false },
        ];
        setProperties(basicProps);
        return;
      }

      const propertyList: PropertyData[] = [];

      for (const [key, value] of Object.entries(entity)) {
        if (key.startsWith('_') || value === null || value === undefined) continue;
        if (typeof value === 'object' && !value.hasOwnProperty('value') && typeof value !== 'string') continue;

        const isEditable = ['Name', 'Description', 'ObjectType', 'Tag', 'LongName', 'OverallHeight', 'OverallWidth'].includes(key);

        propertyList.push({
          name: key,
          value: typeof value === 'object' ? (value as any).value : value,
          type: typeof value === 'object' ? (value as any).type : undefined,
          expressID: selectedExpressID,
          isEditable,
        });
      }

      setProperties(propertyList);
    } catch (error) {
      console.error('Failed to load properties:', error);
      setProperties([]);
    }
  }, [selectedModel, selectedExpressID, components]);

  const handlePropertyChange = (propertyName: string, newValue: any) => {
    const updated = new Map(editedProperties);
    updated.set(propertyName, newValue);
    setEditedProperties(updated);
  };

  const handleSaveChanges = async () => {
    if (!propertyEditingService || !selectedModel || selectedExpressID === null) return;
    if (editedProperties.size === 0) {
      alert('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      for (const [propertyName, newValue] of editedProperties) {
        await propertyEditingService.updateProperty(selectedModel, selectedExpressID, propertyName, newValue);
      }
      await loadProperties();
      setEditedProperties(new Map());
      setIsEditMode(false);
      alert('Properties updated successfully!');
    } catch (error) {
      console.error('Failed to save properties:', error);
      alert('Failed to save properties. Check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedProperties(new Map());
    setIsEditMode(false);
  };

  const handleCreateProperty = async () => {
    if (!propertyEditingService || !selectedModel) return;
    if (!newProperty.name || !newProperty.value) {
      alert('Please provide both name and value for the new property');
      return;
    }

    try {
      let value: string | number | boolean = newProperty.value;
      if (newProperty.type === 'number') {
        value = parseFloat(newProperty.value);
        if (isNaN(value)) {
          alert('Invalid number value');
          return;
        }
      } else if (newProperty.type === 'boolean') {
        value = newProperty.value.toLowerCase() === 'true';
      }

      await propertyEditingService.createProperty(selectedModel, newProperty.type, newProperty.name, value);
      setNewProperty({ name: '', value: '', type: 'string' });
      setShowCreateProperty(false);
      alert(`Property "${newProperty.name}" created successfully!`);
    } catch (error) {
      console.error('Failed to create property:', error);
      alert('Failed to create property. Check console for details.');
    }
  };

  const getCurrentValue = (propertyName: string, originalValue: any) => {
    return editedProperties.has(propertyName) ? editedProperties.get(propertyName) : originalValue;
  };

  if (!selectedModel || selectedExpressID === null) {
    return (
      <Card>
        <Text variant="muted" size="sm">
          No element selected. Select an element to view/edit its properties.
        </Text>
      </Card>
    );
  }

  if (properties.length === 0) {
    return (
      <Stack gap="sm">
        <Card>
          <Text variant="muted" size="sm">No editable properties found for this element.</Text>
        </Card>
        <Text variant="subtle" size="xs">
          ExpressID: {selectedExpressID}<br />
          Model: {selectedModel?.uuid.substring(0, 8)}...
        </Text>
      </Stack>
    );
  }

  const hasChanges = editedProperties.size > 0;
  const hasService = propertyEditingService !== null;

  return (
    <Stack gap="sm">
      <Row between>
        <Text size="sm">
          <strong>Element Properties</strong>
          {hasChanges && (
            <span style={{ marginLeft: '8px', color: 'var(--ui-warning)', fontSize: '0.75rem' }}>
              ({editedProperties.size} edited)
            </span>
          )}
        </Text>
        {hasService && !isEditMode && (
          <Button size="sm" variant="primary" onClick={() => setIsEditMode(true)}>
            Edit
          </Button>
        )}
      </Row>

      {isEditMode && (
        <Row>
          <Button size="sm" variant="primary" onClick={handleSaveChanges} disabled={!hasChanges || isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button size="sm" onClick={handleCancelEdit} disabled={isSaving}>
            Cancel
          </Button>
        </Row>
      )}

      <div className="property-list">
        {properties.map((prop) => (
          <div key={prop.name} className="property-row">
            <Text variant="muted" size="xs" className="property-name">
              {prop.name}
              {prop.isEditable && isEditMode && (
                <span style={{ marginLeft: '4px', color: 'var(--ui-primary)', fontSize: '0.65rem' }}>
                  (editable)
                </span>
              )}
            </Text>
            <div className="property-value">
              {isEditMode && prop.isEditable ? (
                <Input
                  value={getCurrentValue(prop.name, prop.value) ?? ''}
                  onChange={(e) => handlePropertyChange(prop.name, e.target.value)}
                />
              ) : (
                <Text size="sm" style={{ color: editedProperties.has(prop.name) ? 'var(--ui-warning)' : undefined }}>
                  {String(getCurrentValue(prop.name, prop.value) ?? 'N/A')}
                </Text>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasService && isEditMode && (
        <Stack gap="sm">
          {!showCreateProperty ? (
            <Button size="sm" variant="ghost" onClick={() => setShowCreateProperty(true)}>
              + Create New Property
            </Button>
          ) : (
            <Card>
              <Stack gap="sm">
                <Text size="sm"><strong>Create New Property</strong></Text>
                <Input
                  label="Name"
                  value={newProperty.name}
                  onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                  placeholder="Property name"
                />
                <Select
                  label="Type"
                  value={newProperty.type}
                  onChange={(e) => setNewProperty({ ...newProperty, type: e.target.value as any })}
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                </Select>
                <Input
                  label="Value"
                  value={newProperty.value}
                  onChange={(e) => setNewProperty({ ...newProperty, value: e.target.value })}
                  placeholder={newProperty.type === 'boolean' ? 'true or false' : 'Property value'}
                />
                <Row>
                  <Button size="sm" variant="primary" onClick={handleCreateProperty}>
                    Create
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowCreateProperty(false);
                      setNewProperty({ name: '', value: '', type: 'string' });
                    }}
                  >
                    Cancel
                  </Button>
                </Row>
              </Stack>
            </Card>
          )}
        </Stack>
      )}

      {!hasService && (
        <Status variant="info">Property editing service is initializing...</Status>
      )}
    </Stack>
  );
};
