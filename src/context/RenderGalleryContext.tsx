import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ProjectRenderPayload } from '../core/project/projectTypes';
import {
  createRenderId,
  dataUrlToBytes,
  bytesToObjectUrl,
  renderItemToIndexEntry,
  renderItemToPayload,
  payloadToRenderItem,
  type RenderItem,
  type RenderKind,
} from '../core/project/renderGallery';
import {
  deleteRenderBytes,
  loadPersistedGallery,
  saveGalleryIndex,
  writeRenderBytes,
} from '../core/project/renderGalleryStorage';

const MAX_RENDERS = 60;

export interface AddRenderArgs {
  kind: RenderKind;
  /** Data URL or bare base64 PNG. */
  dataUrl: string;
  prompt?: string;
}

interface RenderGalleryContextType {
  renders: RenderItem[];
  count: number;
  addRender: (args: AddRenderArgs) => RenderItem | null;
  removeRender: (id: string) => void;
  clearRenders: () => void;
  /** Bundle payloads for the current gallery (used when saving a project). */
  getRenderPayloads: () => ProjectRenderPayload[];
  /** Replace the gallery with a project's renders (used when opening). */
  replaceFromPayloads: (payloads: ProjectRenderPayload[]) => void;
}

const noop = () => {};

const RenderGalleryContext = createContext<RenderGalleryContextType>({
  renders: [],
  count: 0,
  addRender: () => null,
  removeRender: noop,
  clearRenders: noop,
  getRenderPayloads: () => [],
  replaceFromPayloads: noop,
});

export const useRenderGallery = () => useContext(RenderGalleryContext);

export const RenderGalleryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [renders, setRenders] = useState<RenderItem[]>([]);
  // Mirror for unmount cleanup (revoke object URLs) without stale closures.
  const rendersRef = useRef<RenderItem[]>([]);
  rendersRef.current = renders;

  const persistIndex = useCallback((items: RenderItem[]) => {
    void saveGalleryIndex(items.map(renderItemToIndexEntry));
  }, []);

  // Load any persisted (desktop) gallery on first mount.
  useEffect(() => {
    let cancelled = false;
    void loadPersistedGallery().then((items) => {
      if (!cancelled && items.length) {
        setRenders(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Revoke all object URLs on unmount.
  useEffect(() => {
    return () => {
      for (const item of rendersRef.current) {
        URL.revokeObjectURL(item.url);
      }
    };
  }, []);

  const addRender = useCallback((args: AddRenderArgs): RenderItem | null => {
    let bytes: Uint8Array;
    try {
      bytes = dataUrlToBytes(args.dataUrl);
    } catch (error) {
      console.warn('Failed to decode render image', error);
      return null;
    }

    const item: RenderItem = {
      id: createRenderId(),
      kind: args.kind,
      createdAt: new Date().toISOString(),
      prompt: args.prompt,
      bytes,
      url: bytesToObjectUrl(bytes),
    };

    setRenders((prev) => {
      const next = [item, ...prev];
      const trimmed = next.slice(0, MAX_RENDERS);
      // Evict + clean up anything past the cap.
      for (const dropped of next.slice(MAX_RENDERS)) {
        URL.revokeObjectURL(dropped.url);
        void deleteRenderBytes(dropped.id);
      }
      persistIndex(trimmed);
      return trimmed;
    });

    void writeRenderBytes(item.id, item.bytes);
    return item;
  }, [persistIndex]);

  const removeRender = useCallback((id: string) => {
    setRenders((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
        void deleteRenderBytes(id);
      }
      const next = prev.filter((item) => item.id !== id);
      persistIndex(next);
      return next;
    });
  }, [persistIndex]);

  const clearRenders = useCallback(() => {
    setRenders((prev) => {
      for (const item of prev) {
        URL.revokeObjectURL(item.url);
        void deleteRenderBytes(item.id);
      }
      persistIndex([]);
      return [];
    });
  }, [persistIndex]);

  const getRenderPayloads = useCallback(
    (): ProjectRenderPayload[] => rendersRef.current.map(renderItemToPayload),
    []
  );

  const replaceFromPayloads = useCallback((payloads: ProjectRenderPayload[]) => {
    setRenders((prev) => {
      for (const item of prev) {
        URL.revokeObjectURL(item.url);
        void deleteRenderBytes(item.id);
      }
      const next = payloads.slice(0, MAX_RENDERS).map(payloadToRenderItem);
      for (const item of next) {
        void writeRenderBytes(item.id, item.bytes);
      }
      persistIndex(next);
      return next;
    });
  }, [persistIndex]);

  return (
    <RenderGalleryContext.Provider
      value={{
        renders,
        count: renders.length,
        addRender,
        removeRender,
        clearRenders,
        getRenderPayloads,
        replaceFromPayloads,
      }}
    >
      {children}
    </RenderGalleryContext.Provider>
  );
};
