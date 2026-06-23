import * as OBC from '@thatopen/components';
import type { PropertyEditingService } from '../services/propertyEditingService';
import type { ProjectModelPayload } from './projectTypes';

const modelDisplayName = (uuid: string, group: any): string => {
  const metadataName =
    typeof group?.ifcMetadata?.name === 'string' ? group.ifcMetadata.name.trim() : '';
  const explicitName = typeof group?.name === 'string' ? group.name.trim() : '';
  return metadataName || explicitName || uuid.substring(0, 8);
};

/**
 * Gather the IFC bytes for every loaded model so they can be embedded in a
 * bundle. Models with property edits are re-serialized via saveToIfc (edits
 * baked in); unedited models reuse the original buffer retained at load time.
 * Models whose source bytes can't be recovered are skipped (and reported).
 */
export const collectModelPayloads = async (
  components: OBC.Components,
  propertyEditingService: PropertyEditingService | null
): Promise<{ payloads: ProjectModelPayload[]; skipped: string[] }> => {
  const fragmentsManager = components.get(OBC.FragmentsManager);
  const payloads: ProjectModelPayload[] = [];
  const skipped: string[] = [];
  let index = 0;

  for (const [uuid, group] of fragmentsManager.groups) {
    if (!group) {
      continue;
    }

    const name = modelDisplayName(uuid, group);
    const hasEdits = Boolean(propertyEditingService?.hasChanges(uuid));

    let bytes: Uint8Array | undefined;
    try {
      if (hasEdits && propertyEditingService) {
        bytes = await propertyEditingService.saveToIfc(group as any);
      } else {
        bytes = propertyEditingService?.getOriginalIfcBuffer(uuid);
      }
    } catch (error) {
      console.warn(`Failed to gather IFC bytes for model ${name}`, error);
    }

    if (!bytes) {
      skipped.push(name);
      continue;
    }

    const id = `model-${index++}`;
    payloads.push({
      meta: { id, name, path: `models/${id}.ifc`, hasEdits },
      bytes,
    });
  }

  return { payloads, skipped };
};
