import type { ProjectRenderMeta, ProjectRenderPayload } from './projectTypes';

export type RenderKind = 'ai' | 'screenshot';

/** A gallery render held in memory: raw PNG bytes + a display object URL. */
export interface RenderItem {
  id: string;
  kind: RenderKind;
  createdAt: string;
  prompt?: string;
  bytes: Uint8Array;
  url: string;
}

/** Lightweight index entry persisted as JSON (no image bytes). */
export interface RenderIndexEntry {
  id: string;
  kind: RenderKind;
  createdAt: string;
  prompt?: string;
}

export const createRenderId = (): string =>
  `render-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Decode a data URL or bare base64 string into raw bytes. */
export const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const comma = dataUrl.indexOf(',');
  const base64 = dataUrl.startsWith('data:') && comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const bytesToObjectUrl = (bytes: Uint8Array, mime = 'image/png'): string => {
  const copy = bytes.slice();
  return URL.createObjectURL(new Blob([copy], { type: mime }));
};

export const renderItemToIndexEntry = (item: RenderItem): RenderIndexEntry => ({
  id: item.id,
  kind: item.kind,
  createdAt: item.createdAt,
  prompt: item.prompt,
});

/** Convert a gallery item into a bundle payload (renders/<id>.png + meta). */
export const renderItemToPayload = (item: RenderItem): ProjectRenderPayload => {
  const meta: ProjectRenderMeta = {
    id: item.id,
    path: `renders/${item.id}.png`,
    kind: item.kind,
    createdAt: item.createdAt,
    ...(item.prompt ? { prompt: item.prompt } : {}),
  };
  return { meta, bytes: item.bytes };
};

/** Rebuild a gallery item from a bundle payload (creates a fresh object URL). */
export const payloadToRenderItem = (payload: ProjectRenderPayload): RenderItem => ({
  id: payload.meta.id,
  kind: payload.meta.kind,
  createdAt: payload.meta.createdAt,
  prompt: payload.meta.prompt,
  bytes: payload.bytes,
  url: bytesToObjectUrl(payload.bytes),
});

export const downloadRenderItem = (item: RenderItem): void => {
  const link = document.createElement('a');
  link.href = item.url;
  link.download = `${item.id}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
