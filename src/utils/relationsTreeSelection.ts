import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';

type FragmentIdCollection = Map<string | number, unknown> | Record<string, unknown> | undefined | null;

const fragmentKey = (modelId: string | number, expressId: number) => `${modelId}:${expressId}`;

const collectFragmentKeys = (fragmentIdMap: unknown): Set<string> => {
  const keys = new Set<string>();

  const addValue = (modelId: string, value: unknown) => {
    if (value == null) {
      return;
    }

    if (typeof value === 'number') {
      keys.add(fragmentKey(modelId, value));
      return;
    }

    if (value instanceof Set) {
      value.forEach((entry) => addValue(modelId, entry));
      return;
    }

    if (value instanceof Map) {
      value.forEach((entry) => addValue(modelId, entry));
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => addValue(modelId, entry));
      return;
    }

    if (ArrayBuffer.isView(value)) {
      const arrayView = value as unknown as ArrayLike<number>;
      for (let index = 0; index < arrayView.length; index += 1) {
        addValue(modelId, arrayView[index]);
      }
      return;
    }

    if (typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach((entry) => addValue(modelId, entry));
    }
  };

  const iterate = (collection: FragmentIdCollection) => {
    if (!collection) {
      return;
    }

    if (collection instanceof Map) {
      collection.forEach((value, modelId) => addValue(String(modelId), value));
      return;
    }

    Object.entries(collection as Record<string, unknown>).forEach(([modelId, value]) => {
      addValue(modelId, value);
    });
  };

  iterate(fragmentIdMap as FragmentIdCollection);
  return keys;
};

/**
 * Syncs the relations tree selection with the highlighter selection.
 * Marks tree rows when selection changes, and cleans up on unmount.
 */
export const setupRelationsTreeSelection = (
  tree: HTMLElement | null,
  components: OBC.Components | undefined | null,
) => {
  if (!tree || !components) {
    return undefined;
  }

  const highlighter = components.get(OBCF.Highlighter) as any;
  const selectEvents = highlighter?.events?.select;

  if (!selectEvents?.onHighlight || !selectEvents?.onClear) {
    return undefined;
  }

  const rowRegistry = new Map<string, HTMLElement>();
  let currentKeys = new Set<string>();

  const markRow = (row: HTMLElement, isSelected: boolean) => {
    if ('selected' in row) {
      (row as any).selected = isSelected;
    } else {
      row.toggleAttribute('selected', isSelected);
    }
    row.toggleAttribute('data-selected', isSelected);
    row.classList.toggle('relations-tree__row--selected', isSelected);
  };

  const applySelection = (keys: Set<string>) => {
    rowRegistry.forEach((row, key) => {
      markRow(row, keys.has(key));
    });
    currentKeys = keys;
  };

  const resolveRowKey = (row: HTMLElement) => {
    const data = (row as any).data ?? (row as any).rowData;
    if (!data) {
      return null;
    }

    const modelId = data.modelID ?? data.modelId ?? data.modelUUID ?? data.modelUuid;
    const expressId = data.expressID ?? data.expressId;

    if ((typeof modelId !== 'string' && typeof modelId !== 'number') || typeof expressId !== 'number') {
      return null;
    }

    return fragmentKey(modelId, expressId);
  };

  const registerRow = (row: HTMLElement) => {
    row.style.cursor = 'pointer';
    const key = resolveRowKey(row);
    if (!key) {
      return;
    }
    row.dataset.fragmentKey = key;
    rowRegistry.set(key, row);
    markRow(row, currentKeys.has(key));
  };

  const unregisterRow = (row: HTMLElement) => {
    const key = row.dataset.fragmentKey;
    if (key) {
      rowRegistry.delete(key);
      row.classList.remove('relations-tree__row--selected');
    }
  };

  const processNode = (node: Node, handler: (row: HTMLElement) => void) => {
    if (node instanceof DocumentFragment) {
      node.querySelectorAll('bim-table-row').forEach((element) => handler(element as HTMLElement));
      return;
    }

    if (!(node instanceof HTMLElement)) {
      return;
    }

    if (node.tagName === 'BIM-TABLE-ROW') {
      handler(node);
    }

    node.querySelectorAll?.('bim-table-row').forEach((element) => handler(element as HTMLElement));
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => processNode(node, registerRow));
      mutation.removedNodes.forEach((node) => processNode(node, unregisterRow));
    }
  });

  const observeRows = (root: ShadowRoot) => {
    root.querySelectorAll('bim-table-row').forEach((element) => registerRow(element as HTMLElement));
    observer.observe(root, { childList: true, subtree: true });
  };

  if (tree.shadowRoot) {
    observeRows(tree.shadowRoot);
  } else {
    const updatePromise = (tree as any).updateComplete;
    if (updatePromise instanceof Promise) {
      updatePromise.then(() => {
        if (tree.shadowRoot) {
          observeRows(tree.shadowRoot);
        }
      }).catch(() => {
        /* no-op */
      });
    }
  }

  const handleHighlight = (fragmentIdMap: unknown) => {
    let keys = collectFragmentKeys(fragmentIdMap);
    try {
      const fragmentsManager = components.get(OBC.FragmentsManager) as any;
      if (typeof fragmentsManager?.getModelIdMap === 'function') {
        const modelIdMap = fragmentsManager.getModelIdMap(fragmentIdMap as any) as Record<string, Set<number>> | undefined;
        if (modelIdMap) {
          const mapped = new Set<string>();
          Object.entries(modelIdMap).forEach(([modelId, expressIds]) => {
            if (!(expressIds instanceof Set)) {
              return;
            }
            expressIds.forEach((expressId) => {
              if (typeof expressId === 'number') {
                mapped.add(fragmentKey(modelId, expressId));
              }
            });
          });
          if (mapped.size) {
            keys = mapped;
          }
        }
      }
    } catch {
      // ignore mapping failures
    }

    applySelection(keys);
  };

  const handleClear = () => {
    applySelection(new Set());
  };

  selectEvents.onHighlight.add(handleHighlight);
  selectEvents.onClear.add(handleClear);

  const initialSelection = highlighter?.selection?.select;
  if (initialSelection) {
    handleHighlight(initialSelection);
  }

  return () => {
    observer.disconnect();
    selectEvents.onHighlight.remove(handleHighlight);
    selectEvents.onClear.remove(handleClear);
    rowRegistry.clear();
  };
};
