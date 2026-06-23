import { getElectronAPI } from '../../utils/electronUtils';
import {
  bytesToObjectUrl,
  type RenderIndexEntry,
  type RenderItem,
} from './renderGallery';

/**
 * Persistence for the render gallery. On desktop, the index is a small JSON
 * file and each image is a binary blob under userData (so renders survive an
 * app reload). On the web there is no durable store, so these are no-ops and
 * the gallery lives only in memory (and in saved .ifcproj bundles).
 */

const NAMESPACE = 'renders';
const INDEX_KEY = 'gallery-index';

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? bytes.buffer
    : bytes.slice().buffer;

export const isGalleryPersistent = (): boolean => Boolean(getElectronAPI());

export const writeRenderBytes = async (id: string, bytes: Uint8Array): Promise<void> => {
  const api = getElectronAPI();
  if (!api) {
    return;
  }
  try {
    await api.appStorage.writeBytes(NAMESPACE, id, toArrayBuffer(bytes));
  } catch (error) {
    console.warn('Failed to persist render image', error);
  }
};

export const deleteRenderBytes = async (id: string): Promise<void> => {
  const api = getElectronAPI();
  if (!api) {
    return;
  }
  try {
    await api.appStorage.deleteBytes(NAMESPACE, id);
  } catch (error) {
    console.warn('Failed to delete render image', error);
  }
};

export const saveGalleryIndex = async (entries: RenderIndexEntry[]): Promise<void> => {
  const api = getElectronAPI();
  if (!api) {
    return;
  }
  try {
    await api.appStorage.writeJson(INDEX_KEY, entries);
  } catch (error) {
    console.warn('Failed to persist gallery index', error);
  }
};

/** Load the persisted gallery (index + images) on desktop; empty on the web. */
export const loadPersistedGallery = async (): Promise<RenderItem[]> => {
  const api = getElectronAPI();
  if (!api) {
    return [];
  }
  try {
    const index = (await api.appStorage.readJson(INDEX_KEY)) as RenderIndexEntry[] | null;
    if (!Array.isArray(index) || index.length === 0) {
      return [];
    }
    const items: RenderItem[] = [];
    for (const entry of index) {
      const buffer = await api.appStorage.readBytes(NAMESPACE, entry.id);
      if (!buffer) {
        continue;
      }
      const bytes = new Uint8Array(buffer);
      items.push({
        id: entry.id,
        kind: entry.kind,
        createdAt: entry.createdAt,
        prompt: entry.prompt,
        bytes,
        url: bytesToObjectUrl(bytes),
      });
    }
    return items;
  } catch (error) {
    console.warn('Failed to load persisted gallery', error);
    return [];
  }
};
