import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/fragments';
import { handleBIMError, ErrorType } from '../../utils/errorHandler';

export interface PropertyChange {
  modelId: string;
  expressID: number;
  attributeName: string;
  oldValue: any;
  newValue: any;
}

export interface PropertyEditingState {
  changes: Map<string, PropertyChange[]>;
  originalIfcBuffer: Map<string, Uint8Array>;
}

export class PropertyEditingService {
  private propertiesManager: OBC.IfcPropertiesManager;
  private state: PropertyEditingState;

  constructor(components: OBC.Components) {
    this.propertiesManager = components.get(OBC.IfcPropertiesManager);
    this.state = {
      changes: new Map(),
      originalIfcBuffer: new Map(),
    };
  }

  /**
   * Initialize the properties manager with WASM configuration
   */
  async init(): Promise<void> {
    try {
      const path = (import.meta as any).env?.VITE_WEBIFC_PATH as string | undefined;
      if (path) {
        this.propertiesManager.wasm = { path, absolute: true };
      }
    } catch (error) {
      handleBIMError(
        ErrorType.COMPONENT_ERROR,
        'Failed to configure property manager WASM',
        { error },
        'PropertyEditingService'
      );
    }
  }

  /**
   * Store the original IFC buffer for a model (needed for saving changes)
   */
  storeOriginalIfcBuffer(modelId: string, buffer: Uint8Array): void {
    this.state.originalIfcBuffer.set(modelId, buffer);
  }

  /**
   * Update a property value
   */
  async updateProperty(
    model: OBF.FragmentsGroup,
    expressID: number,
    attributeName: string,
    newValue: any
  ): Promise<void> {
    try {
      // Get current value first
      const properties = model.getLocalProperties();
      const currentEntity = properties?.[expressID];
      const oldValue = currentEntity?.[attributeName];

      // Build the update object
      const updateData: Record<string, any> = {
        expressID,
        [attributeName]: { value: newValue }
      };

      // Apply the change
      await this.propertiesManager.setData(model, updateData);

      // Track the change
      this.trackChange(model.uuid, {
        modelId: model.uuid,
        expressID,
        attributeName,
        oldValue,
        newValue,
      });

      console.log(`Updated property: ${attributeName} = ${newValue} for expressID ${expressID}`);
    } catch (error) {
      handleBIMError(
        ErrorType.COMPONENT_ERROR,
        'Failed to update property',
        { error, expressID, attributeName, newValue },
        'PropertyEditingService'
      );
      throw error;
    }
  }

  /**
   * Create a new property set
   */
  async createPropertySet(
    model: OBF.FragmentsGroup,
    name: string,
    description?: string
  ): Promise<number> {
    try {
      const { pset } = await this.propertiesManager.newPset(model, name, description);
      const psetId = (pset.expressID as any).value || pset.expressID;

      console.log(`Created new property set: ${name} (ID: ${psetId})`);
      return psetId;
    } catch (error) {
      handleBIMError(
        ErrorType.COMPONENT_ERROR,
        'Failed to create property set',
        { error, name, description },
        'PropertyEditingService'
      );
      throw error;
    }
  }

  /**
   * Create a new property
   */
  async createProperty(
    model: OBF.FragmentsGroup,
    type: 'string' | 'number' | 'boolean',
    name: string,
    value: string | number | boolean
  ): Promise<number> {
    try {
      let property: any;

      if (type === 'string') {
        property = await this.propertiesManager.newSingleStringProperty(
          model,
          'IfcLabel',
          name,
          value as string
        );
      } else if (type === 'number') {
        property = await this.propertiesManager.newSingleNumericProperty(
          model,
          'IfcReal',
          name,
          value as number
        );
      } else if (type === 'boolean') {
        property = await this.propertiesManager.newSingleBooleanProperty(
          model,
          'IfcBoolean',
          name,
          value as boolean
        );
      } else {
        throw new Error(`Unsupported property type: ${type}`);
      }

      const propId = property.expressID.value;
      console.log(`Created new property: ${name} = ${value} (ID: ${propId})`);
      return propId;
    } catch (error) {
      handleBIMError(
        ErrorType.COMPONENT_ERROR,
        'Failed to create property',
        { error, type, name, value },
        'PropertyEditingService'
      );
      throw error;
    }
  }

  /**
   * Add a property to a property set
   */
  async addPropertyToPset(
    model: OBF.FragmentsGroup,
    psetId: number,
    propertyId: number
  ): Promise<void> {
    try {
      await this.propertiesManager.addPropToPset(model, psetId, propertyId);
      console.log(`Added property ${propertyId} to pset ${psetId}`);
    } catch (error) {
      handleBIMError(
        ErrorType.COMPONENT_ERROR,
        'Failed to add property to pset',
        { error, psetId, propertyId },
        'PropertyEditingService'
      );
      throw error;
    }
  }

  /**
   * Remove a property set
   */
  async removePropertySet(model: OBF.FragmentsGroup, psetId: number): Promise<void> {
    try {
      await this.propertiesManager.removePset(model, psetId);
      console.log(`Removed property set ${psetId}`);
    } catch (error) {
      handleBIMError(
        ErrorType.COMPONENT_ERROR,
        'Failed to remove property set',
        { error, psetId },
        'PropertyEditingService'
      );
      throw error;
    }
  }

  /**
   * Remove a property from a property set
   */
  async removePropertyFromPset(
    model: OBF.FragmentsGroup,
    psetId: number,
    propertyId: number
  ): Promise<void> {
    try {
      await this.propertiesManager.removePsetProp(model, psetId, propertyId);
      console.log(`Removed property ${propertyId} from pset ${psetId}`);
    } catch (error) {
      handleBIMError(
        ErrorType.COMPONENT_ERROR,
        'Failed to remove property from pset',
        { error, psetId, propertyId },
        'PropertyEditingService'
      );
      throw error;
    }
  }

  /**
   * Save modifications to a new IFC file
   */
  async saveToIfc(model: OBF.FragmentsGroup): Promise<Uint8Array> {
    try {
      const originalBuffer = this.state.originalIfcBuffer.get(model.uuid);

      if (!originalBuffer) {
        throw new Error('Original IFC buffer not found. Cannot save modifications.');
      }

      const modifiedIfc = await this.propertiesManager.saveToIfc(model, originalBuffer);
      console.log(`Saved modifications to IFC for model ${model.uuid}`);

      return modifiedIfc;
    } catch (error) {
      handleBIMError(
        ErrorType.COMPONENT_ERROR,
        'Failed to save IFC with modifications',
        { error, modelId: model.uuid },
        'PropertyEditingService'
      );
      throw error;
    }
  }

  /**
   * Download the modified IFC file
   */
  downloadModifiedIfc(model: OBF.FragmentsGroup, ifcData: Uint8Array): void {
    try {
      const blob = new Blob([ifcData], { type: 'application/ifc' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const modelName = (model as any)?.ifcMetadata?.name || model.name || model.uuid;
      const fileName = `${modelName}_modified.ifc`;

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`Downloaded modified IFC: ${fileName}`);
    } catch (error) {
      handleBIMError(
        ErrorType.COMPONENT_ERROR,
        'Failed to download modified IFC',
        { error, modelId: model.uuid },
        'PropertyEditingService'
      );
      throw error;
    }
  }

  /**
   * Get all changes for a model
   */
  getChanges(modelId: string): PropertyChange[] {
    return this.state.changes.get(modelId) || [];
  }

  /**
   * Check if a model has unsaved changes
   */
  hasChanges(modelId: string): boolean {
    const changes = this.state.changes.get(modelId);
    return !!changes && changes.length > 0;
  }

  /**
   * Clear changes for a model
   */
  clearChanges(modelId: string): void {
    this.state.changes.delete(modelId);
  }

  /**
   * Get change map from properties manager
   */
  getChangeMap(): OBC.ChangeMap {
    return this.propertiesManager.changeMap;
  }

  /**
   * Private method to track changes
   */
  private trackChange(modelId: string, change: PropertyChange): void {
    const modelChanges = this.state.changes.get(modelId) || [];
    modelChanges.push(change);
    this.state.changes.set(modelId, modelChanges);
  }

  /**
   * Set attribute listener for real-time updates
   */
  async setAttributeListener(
    model: OBF.FragmentsGroup,
    expressID: number,
    attributeName: string,
    callback: (value: String | Number | Boolean) => void
  ): Promise<void> {
    try {
      const event = await this.propertiesManager.setAttributeListener(
        model,
        expressID,
        attributeName
      );
      event.add(callback);
    } catch (error) {
      console.warn('Failed to set attribute listener:', error);
    }
  }
}

/**
 * Setup and initialize the property editing service
 */
export const setupPropertyEditing = async (
  components: OBC.Components
): Promise<PropertyEditingService> => {
  const service = new PropertyEditingService(components);
  await service.init();
  return service;
};
