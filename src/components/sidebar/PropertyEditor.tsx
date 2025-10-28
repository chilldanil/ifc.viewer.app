import React, { useState, useEffect, useCallback } from 'react';
import * as OBF from '@thatopen/fragments';
import { useBIM } from '../../context/BIMContext';
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

  // Debug: Log when props change
  useEffect(() => {
    console.log('PropertyEditor props updated:', {
      hasModel: !!selectedModel,
      modelUUID: selectedModel?.uuid,
      expressID: selectedExpressID,
      hasComponents: !!components,
    });
  }, [selectedModel, selectedExpressID, components]);

  // Load properties when selection changes
  useEffect(() => {
    if (!selectedModel || selectedExpressID === null || !components) {
      console.log('PropertyEditor: Skipping load - missing dependencies', {
        hasModel: !!selectedModel,
        hasExpressID: selectedExpressID !== null,
        hasComponents: !!components,
      });
      setProperties([]);
      return;
    }

    loadProperties();
  }, [selectedModel, selectedExpressID, components]);

  const loadProperties = useCallback(async () => {
    if (!selectedModel || selectedExpressID === null || !components) return;

    try {
      console.log('=== Loading Properties ===');
      console.log('Model UUID:', selectedModel.uuid);
      console.log('ExpressID:', selectedExpressID);

      // Access the model's internal property storage
      const modelData = (selectedModel as any);
      let entity: any = null;

      console.log('Attempting to access properties...');

      // Method 1: Try _properties (internal storage used by ThatOpen)
      if (modelData._properties && modelData._properties[selectedExpressID]) {
        entity = modelData._properties[selectedExpressID];
        console.log('✅ Found properties via _properties');
      }
      // Method 2: Try ifcMetadata.properties
      else if (modelData.ifcMetadata?.properties?.[selectedExpressID]) {
        entity = modelData.ifcMetadata.properties[selectedExpressID];
        console.log('✅ Found properties via ifcMetadata.properties');
      }
      // Method 3: Try data property
      else if (modelData.data?.[selectedExpressID]) {
        entity = modelData.data[selectedExpressID];
        console.log('✅ Found properties via data');
      }
      // Method 4: Try direct properties object
      else if (modelData.properties?.[selectedExpressID]) {
        entity = modelData.properties[selectedExpressID];
        console.log('✅ Found properties via properties');
      }

      console.log('Property search result:', {
        found: !!entity,
        has_properties: !!modelData._properties,
        has_ifcMetadata: !!modelData.ifcMetadata,
        has_data: !!modelData.data,
        expressID: selectedExpressID,
      });

      if (!entity) {
        console.warn('No properties found for expressID:', selectedExpressID);
        console.log('Available model keys:', Object.keys(selectedModel));

        // Show basic model info even if no detailed properties
        const basicProps: PropertyData[] = [
          {
            name: 'ExpressID',
            value: selectedExpressID,
            type: 'number',
            expressID: selectedExpressID,
            isEditable: false,
          },
          {
            name: 'Model',
            value: selectedModel.uuid,
            type: 'string',
            expressID: selectedExpressID,
            isEditable: false,
          },
        ];

        setProperties(basicProps);
        return;
      }

      console.log('Entity data:', entity);
      const propertyList: PropertyData[] = [];

      // Extract properties from the entity
      for (const [key, value] of Object.entries(entity)) {
        // Skip internal properties, complex objects, and null values
        if (key.startsWith('_') || value === null || value === undefined) continue;

        // Skip complex nested objects (but allow simple objects with value)
        if (typeof value === 'object' && !value.hasOwnProperty('value') && typeof value !== 'string') {
          continue;
        }

        const isEditable = [
          'Name',
          'Description',
          'ObjectType',
          'Tag',
          'LongName',
          'OverallHeight',
          'OverallWidth',
        ].includes(key);

        propertyList.push({
          name: key,
          value: typeof value === 'object' ? (value as any).value : value,
          type: typeof value === 'object' ? (value as any).type : undefined,
          expressID: selectedExpressID,
          isEditable,
        });
      }

      console.log(`Extracted ${propertyList.length} properties`);
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
    if (!propertyEditingService || !selectedModel || selectedExpressID === null) {
      return;
    }

    if (editedProperties.size === 0) {
      alert('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      // Apply all edited properties
      for (const [propertyName, newValue] of editedProperties) {
        await propertyEditingService.updateProperty(
          selectedModel,
          selectedExpressID,
          propertyName,
          newValue
        );
      }

      // Reload properties to show updated values
      await loadProperties();

      // Clear edited properties
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
    if (!propertyEditingService || !selectedModel) {
      return;
    }

    if (!newProperty.name || !newProperty.value) {
      alert('Please provide both name and value for the new property');
      return;
    }

    try {
      // Convert value to appropriate type
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

      // Create the property
      const propId = await propertyEditingService.createProperty(
        selectedModel,
        newProperty.type,
        newProperty.name,
        value
      );

      console.log(`Created property ${newProperty.name} with ID ${propId}`);

      // Reset form
      setNewProperty({ name: '', value: '', type: 'string' });
      setShowCreateProperty(false);

      alert(`Property "${newProperty.name}" created successfully!`);
    } catch (error) {
      console.error('Failed to create property:', error);
      alert('Failed to create property. Check console for details.');
    }
  };

  const getCurrentValue = (propertyName: string, originalValue: any) => {
    return editedProperties.has(propertyName)
      ? editedProperties.get(propertyName)
      : originalValue;
  };

  const renderPropertyValue = (prop: PropertyData) => {
    const currentValue = getCurrentValue(prop.name, prop.value);
    const hasChanges = editedProperties.has(prop.name);

    if (!isEditMode || !prop.isEditable) {
      return (
        <span className={`property-value ${hasChanges ? 'property-value--edited' : ''}`}>
          {String(currentValue ?? 'N/A')}
        </span>
      );
    }

    // Editable input
    return (
      <input
        type="text"
        className="property-input"
        value={currentValue ?? ''}
        onChange={(e) => handlePropertyChange(prop.name, e.target.value)}
      />
    );
  };

  if (!selectedModel || selectedExpressID === null) {
    return (
      <div className="property-editor property-editor--empty">
        <p>No element selected. Select an element to view/edit its properties.</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="property-editor property-editor--empty">
        <p>No editable properties found for this element.</p>
        <p style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
          ExpressID: {selectedExpressID}<br/>
          Model: {selectedModel?.uuid.substring(0, 8)}...
        </p>
        <p style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
          Check browser console for detailed property structure.
        </p>
      </div>
    );
  }

  const hasChanges = editedProperties.size > 0;
  const hasService = propertyEditingService !== null;

  return (
    <div className="property-editor">
      {/* Header with mode toggle */}
      <div className="property-editor__header">
        <h3 className="property-editor__title">
          Element Properties
          {hasChanges && <span className="property-editor__badge">{editedProperties.size} edited</span>}
        </h3>

        {hasService && (
          <div className="property-editor__actions">
            {!isEditMode && (
              <button
                className="property-editor__button property-editor__button--primary"
                onClick={() => setIsEditMode(true)}
              >
                Edit Properties
              </button>
            )}

            {isEditMode && (
              <>
                <button
                  className="property-editor__button property-editor__button--success"
                  onClick={handleSaveChanges}
                  disabled={!hasChanges || isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="property-editor__button property-editor__button--secondary"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Properties list */}
      <div className="property-editor__list">
        {properties.map((prop) => (
          <div
            key={prop.name}
            className={`property-row ${prop.isEditable ? 'property-row--editable' : ''}`}
          >
            <div className="property-name">
              {prop.name}
              {prop.isEditable && isEditMode && (
                <span className="property-editable-badge">editable</span>
              )}
            </div>
            <div className="property-value-wrapper">
              {renderPropertyValue(prop)}
            </div>
          </div>
        ))}
      </div>

      {/* Create new property section */}
      {hasService && isEditMode && (
        <div className="property-editor__create">
          {!showCreateProperty && (
            <button
              className="property-editor__button property-editor__button--secondary"
              onClick={() => setShowCreateProperty(true)}
            >
              + Create New Property
            </button>
          )}

          {showCreateProperty && (
            <div className="property-create-form">
              <h4>Create New Property</h4>
              <div className="property-create-field">
                <label>Name:</label>
                <input
                  type="text"
                  value={newProperty.name}
                  onChange={(e) =>
                    setNewProperty({ ...newProperty, name: e.target.value })
                  }
                  placeholder="Property name"
                />
              </div>
              <div className="property-create-field">
                <label>Type:</label>
                <select
                  value={newProperty.type}
                  onChange={(e) =>
                    setNewProperty({
                      ...newProperty,
                      type: e.target.value as 'string' | 'number' | 'boolean',
                    })
                  }
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
              <div className="property-create-field">
                <label>Value:</label>
                <input
                  type="text"
                  value={newProperty.value}
                  onChange={(e) =>
                    setNewProperty({ ...newProperty, value: e.target.value })
                  }
                  placeholder={
                    newProperty.type === 'boolean' ? 'true or false' : 'Property value'
                  }
                />
              </div>
              <div className="property-create-actions">
                <button
                  className="property-editor__button property-editor__button--success"
                  onClick={handleCreateProperty}
                >
                  Create
                </button>
                <button
                  className="property-editor__button property-editor__button--secondary"
                  onClick={() => {
                    setShowCreateProperty(false);
                    setNewProperty({ name: '', value: '', type: 'string' });
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info message if no service */}
      {!hasService && (
        <div className="property-editor__info">
          Property editing service is initializing...
        </div>
      )}
    </div>
  );
};
