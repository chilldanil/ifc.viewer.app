import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import type { Table, TableDataTransform, TableRow } from '@thatopen/ui';

type RelationsTreeRowData = {
  Entity?: string;
  Name?: string;
  modelID?: string | number;
  expressID?: number;
  relations?: string;
  [key: string]: unknown;
};

type TableGroupNode = {
  data: unknown;
  children?: TableGroupNode[];
};

const DEFAULT_SELECT_HIGHLIGHTER = 'select';
const DEFAULT_HOVER_HIGHLIGHTER = 'hover';

const fragmentKey = (modelId: string | number, expressId: number) => `${modelId}:${expressId}`;
type FragmentIdMap = Record<string, Set<number>>;

const EYE_ICON = `
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
`;

const EYE_OFF_ICON = `
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
`;

const hasFragmentEntries = (value: unknown): boolean => {
  if (!value) {
    return false;
  }
  if (value instanceof Map || value instanceof Set) {
    return value.size > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return false;
};

const mergeFragmentIdMapInto = (target: FragmentIdMap, source: unknown) => {
  if (!source) {
    return;
  }

  if (source instanceof Map) {
    source.forEach((value, fragmentId) => {
      mergeFragmentIdMapInto(target, { [String(fragmentId)]: value });
    });
    return;
  }

  if (typeof source !== 'object') {
    return;
  }

  Object.entries(source as Record<string, unknown>).forEach(([fragmentId, expressIds]) => {
    if (!expressIds) {
      return;
    }

    const targetSet = target[fragmentId] ?? new Set<number>();
    const addId = (value: unknown) => {
      if (typeof value === 'number') {
        targetSet.add(value);
      }
    };

    if (expressIds instanceof Set) {
      expressIds.forEach((value) => addId(value));
    } else if (Array.isArray(expressIds)) {
      expressIds.forEach((value) => addId(value));
    } else if (ArrayBuffer.isView(expressIds)) {
      const arrayView = expressIds as unknown as ArrayLike<number>;
      for (let index = 0; index < arrayView.length; index += 1) {
        addId(arrayView[index]);
      }
    } else if (typeof expressIds === 'object') {
      Object.values(expressIds as Record<string, unknown>).forEach((value) => addId(value));
    }

    if (targetSet.size > 0) {
      target[fragmentId] = targetSet;
    }
  });
};

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

  const iterate = (collection: unknown) => {
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

  iterate(fragmentIdMap);
  return keys;
};

const collectModelKeysFromSelection = (components: OBC.Components, fragmentIdMap: unknown): Set<string> => {
  try {
    const fragmentsManager = components.get(OBC.FragmentsManager) as any;
    if (typeof fragmentsManager?.getModelIdMap !== 'function') {
      return collectFragmentKeys(fragmentIdMap);
    }

    const modelIdMap = fragmentsManager.getModelIdMap(fragmentIdMap as any) as Record<string, Set<number>> | undefined;
    if (!modelIdMap) {
      return new Set();
    }

    const keys = new Set<string>();
    Object.entries(modelIdMap).forEach(([modelId, expressIds]) => {
      if (!(expressIds instanceof Set)) {
        return;
      }

      expressIds.forEach((expressId) => {
        if (typeof expressId === 'number') {
          keys.add(fragmentKey(modelId, expressId));
        }
      });
    });

    return keys.size ? keys : collectFragmentKeys(fragmentIdMap);
  } catch {
    return collectFragmentKeys(fragmentIdMap);
  }
};

const buildFragmentMapForNode = (node: TableGroupNode | null, components: OBC.Components): FragmentIdMap | null => {
  if (!node) {
    return null;
  }

  const modelToExpressIds = new Map<string, Set<number>>();
  const visit = (entry: TableGroupNode) => {
    const data = entry.data as RelationsTreeRowData | undefined;
    const modelId = data?.modelID;
    const expressId = data?.expressID;
    if ((typeof modelId === 'string' || typeof modelId === 'number') && typeof expressId === 'number') {
      const modelKey = String(modelId);
      const expressIds = modelToExpressIds.get(modelKey) ?? new Set<number>();
      expressIds.add(expressId);
      modelToExpressIds.set(modelKey, expressIds);
    }
    entry.children?.forEach((child) => visit(child));
  };

  visit(node);

  if (modelToExpressIds.size === 0) {
    return null;
  }

  let fragmentsManager: any;
  try {
    fragmentsManager = components.get(OBC.FragmentsManager);
  } catch {
    return null;
  }

  const merged: FragmentIdMap = {};

  modelToExpressIds.forEach((expressIds, modelId) => {
    if (!expressIds.size) {
      return;
    }
    const group = fragmentsManager.groups.get(modelId);
    if (!group) {
      return;
    }
    try {
      const fragmentMap = group.getFragmentMap(Array.from(expressIds));
      mergeFragmentIdMapInto(merged, fragmentMap);
    } catch {
      // ignore model failures
    }
  });

  return hasFragmentEntries(merged) ? merged : null;
};

const safeParseRelations = (value: unknown): number[] => {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is number => typeof entry === 'number');
    }
  } catch {
    // ignore invalid JSON
  }

  return [];
};

const getRowFragmentMap = (components: OBC.Components, rowData: RelationsTreeRowData) => {
  const modelId = rowData.modelID;
  const expressId = rowData.expressID;

  if (modelId == null || typeof expressId !== 'number') {
    return null;
  }

  const fragmentsManager = components.get(OBC.FragmentsManager);
  const group = fragmentsManager.groups.get(String(modelId));
  if (!group) {
    return null;
  }

  const relations = safeParseRelations(rowData.relations);
  return group.getFragmentMap([expressId, ...relations]);
};

const findNodeByDataRef = (nodes: TableGroupNode[], targetData: unknown): TableGroupNode | null => {
  for (const node of nodes) {
    if (node.data === targetData) {
      return node;
    }
    if (node.children?.length) {
      const found = findNodeByDataRef(node.children, targetData);
      if (found) {
        return found;
      }
    }
  }

  return null;
};

const collectSubtreeKeys = (node: TableGroupNode | null) => {
  if (!node) {
    return [];
  }

  const keys: string[] = [];

  const visit = (entry: TableGroupNode) => {
    const data = entry.data as RelationsTreeRowData | undefined;
    const modelId = data?.modelID;
    const expressId = data?.expressID;
    if ((typeof modelId === 'string' || typeof modelId === 'number') && typeof expressId === 'number') {
      keys.push(fragmentKey(modelId, expressId));
    }
    entry.children?.forEach((child) => visit(child));
  };

  visit(node);
  return keys;
};

const canExpandRow = (table: Table<Record<string, any>>, rowData: unknown) => {
  const nodes = (table.data as unknown as TableGroupNode[]) ?? [];
  const node = findNodeByDataRef(nodes, rowData);
  return Boolean(node?.children?.length);
};

const computeEntityAccent = (entity: string) => {
  const normalized = entity.toUpperCase();
  if (normalized.includes('PROJECT')) {
    return { bg: 'rgba(94, 124, 255, 0.25)', border: 'rgba(94, 124, 255, 0.45)' };
  }
  if (normalized.includes('SITE')) {
    return { bg: 'rgba(77, 201, 178, 0.22)', border: 'rgba(77, 201, 178, 0.42)' };
  }
  if (normalized.includes('BUILDING')) {
    return { bg: 'rgba(255, 173, 76, 0.18)', border: 'rgba(255, 173, 76, 0.36)' };
  }
  if (normalized.includes('STOREY') || normalized.includes('FLOOR')) {
    return { bg: 'rgba(184, 107, 255, 0.20)', border: 'rgba(184, 107, 255, 0.40)' };
  }
  if (normalized.includes('SPACE') || normalized.includes('ROOM')) {
    return { bg: 'rgba(95, 200, 255, 0.18)', border: 'rgba(95, 200, 255, 0.36)' };
  }

  return { bg: 'rgba(255, 255, 255, 0.10)', border: 'rgba(255, 255, 255, 0.18)' };
};

const createEntityCell = (value: unknown, rowData: RelationsTreeRowData) => {
  const entity = typeof value === 'string' ? value : String(value ?? '');
  const nameValue = typeof rowData.Name === 'string' ? rowData.Name : '';
  const hasName = Boolean(nameValue && nameValue.trim() && nameValue.trim() !== '—');
  const titleText = hasName ? nameValue : entity;
  const subtitleText = hasName ? entity : '';

  const entityLabel = entity.replace(/^IFC/i, '') || entity || 'Entity';
  const shortLabel = entityLabel.slice(0, 2).toUpperCase();
  const accent = computeEntityAccent(entity);

  const wrapper = document.createElement('div');
  wrapper.style.width = '100%';
  wrapper.style.minWidth = '0';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '0.18rem';
  wrapper.style.padding = '0.1rem 0.15rem';
  wrapper.style.userSelect = 'none';
  wrapper.style.cursor = 'pointer';

  const topRow = document.createElement('div');
  topRow.style.width = '100%';
  topRow.style.minWidth = '0';
  topRow.style.display = 'flex';
  topRow.style.alignItems = 'flex-start';
  topRow.style.gap = '0.55rem';

  const badge = document.createElement('span');
  badge.textContent = shortLabel;
  badge.style.background = accent.bg;
  badge.style.border = `1px solid ${accent.border}`;
  badge.title = entity;
  badge.style.flex = '0 0 auto';
  badge.style.width = '24px';
  badge.style.height = '24px';
  badge.style.borderRadius = '8px';
  badge.style.display = 'inline-flex';
  badge.style.alignItems = 'center';
  badge.style.justifyContent = 'center';
  badge.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.22)';
  badge.style.color = 'rgba(255, 255, 255, 0.92)';
  badge.style.fontSize = '11px';
  badge.style.fontWeight = '800';
  badge.style.letterSpacing = '0.05em';

  const expressId = typeof rowData.expressID === 'number' ? rowData.expressID : null;
  const modelId = rowData.modelID;
  const rowKey =
    (typeof modelId === 'string' || typeof modelId === 'number') && typeof expressId === 'number'
      ? fragmentKey(modelId, expressId)
      : null;

  const title = document.createElement('span');
  title.textContent = titleText || '—';
  title.title = titleText;
  title.style.flex = '1 1 auto';
  title.style.minWidth = '0';
  title.style.color = 'rgba(255, 255, 255, 0.92)';
  title.style.fontSize = '13px';
  title.style.fontWeight = '650';
  title.style.lineHeight = '1.2';
  title.style.overflow = 'hidden';
  title.style.textOverflow = 'ellipsis';
  title.style.display = '-webkit-box';
  title.style.setProperty('-webkit-line-clamp', '2');
  title.style.setProperty('-webkit-box-orient', 'vertical');

  topRow.append(badge, title);

  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.alignItems = 'center';
  controls.style.gap = '0.45rem';
  controls.style.flex = '0 0 auto';
  controls.style.marginLeft = 'auto';

  if (rowKey) {
    const eyeButton = document.createElement('button');
    eyeButton.type = 'button';
    eyeButton.dataset.treeKey = rowKey;
    eyeButton.dataset.action = 'toggle-visibility';
    eyeButton.style.width = '28px';
    eyeButton.style.height = '28px';
    eyeButton.style.borderRadius = '9px';
    eyeButton.style.display = 'inline-flex';
    eyeButton.style.alignItems = 'center';
    eyeButton.style.justifyContent = 'center';
    eyeButton.style.background = 'rgba(255, 255, 255, 0.04)';
    eyeButton.style.border = '1px solid rgba(255, 255, 255, 0.10)';
    eyeButton.style.color = 'rgba(255, 255, 255, 0.78)';
    eyeButton.style.cursor = 'pointer';
    eyeButton.style.padding = '0';
    eyeButton.style.lineHeight = '0';
    eyeButton.style.transition = 'background-color 120ms ease, border-color 120ms ease, color 120ms ease';
    eyeButton.innerHTML = EYE_ICON;
    eyeButton.title = 'Hide';

    eyeButton.addEventListener(
      'mousedown',
      (event) => {
        event.preventDefault();
        event.stopPropagation();
      },
      { passive: false }
    );
    eyeButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      eyeButton.dispatchEvent(
        new CustomEvent('togglevisibility', { bubbles: true, composed: true, detail: { key: rowKey } })
      );
    });
    eyeButton.addEventListener('mouseenter', () => {
      eyeButton.style.background = 'rgba(255, 255, 255, 0.07)';
      eyeButton.style.borderColor = 'rgba(255, 255, 255, 0.14)';
      eyeButton.style.color = 'rgba(255, 255, 255, 0.92)';
    });
    eyeButton.addEventListener('mouseleave', () => {
      const isHidden = eyeButton.dataset.visibility === 'hidden';
      eyeButton.style.background = 'rgba(255, 255, 255, 0.04)';
      eyeButton.style.borderColor = isHidden ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.14)';
      eyeButton.style.color = isHidden ? 'rgba(255, 255, 255, 0.60)' : 'rgba(255, 255, 255, 0.78)';
    });

    controls.append(eyeButton);
  }

  if (expressId != null) {
    const idBadge = document.createElement('span');
    idBadge.textContent = `#${expressId}`;
    idBadge.title = `ExpressID ${expressId}`;
    idBadge.style.flex = '0 0 auto';
    idBadge.style.fontSize = '10px';
    idBadge.style.fontWeight = '700';
    idBadge.style.padding = '0.12rem 0.5rem';
    idBadge.style.borderRadius = '999px';
    idBadge.style.background = 'rgba(255, 255, 255, 0.06)';
    idBadge.style.border = '1px solid rgba(255, 255, 255, 0.10)';
    idBadge.style.color = 'rgba(255, 255, 255, 0.66)';
    idBadge.style.marginTop = '1px';
    controls.append(idBadge);
  }

  if (controls.childNodes.length) {
    topRow.append(controls);
  }

  wrapper.append(topRow);

  if (subtitleText) {
    const subtitle = document.createElement('div');
    subtitle.textContent = subtitleText;
    subtitle.title = subtitleText;
    subtitle.style.paddingLeft = 'calc(24px + 0.55rem)';
    subtitle.style.color = 'rgba(255, 255, 255, 0.62)';
    subtitle.style.fontSize = '11px';
    subtitle.style.fontWeight = '650';
    subtitle.style.letterSpacing = '0.03em';
    subtitle.style.textTransform = 'uppercase';
    subtitle.style.overflow = 'hidden';
    subtitle.style.textOverflow = 'ellipsis';
    subtitle.style.whiteSpace = 'nowrap';
    wrapper.append(subtitle);
  }

  return wrapper;
};

const applyRowVisualState = (row: HTMLElement) => {
  const selected = row.hasAttribute('data-selected');
  const hovered = row.hasAttribute('data-hovered');
  const depth = Number(row.dataset.depth ?? '0');

  if (selected) {
    row.style.backgroundColor = 'rgba(94, 124, 255, 0.16)';
    row.style.boxShadow = 'inset 0 0 0 1px rgba(94, 124, 255, 0.55)';
    return;
  }

  if (hovered) {
    row.style.backgroundColor = 'rgba(255, 255, 255, 0.035)';
    row.style.boxShadow = 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)';
    return;
  }

  const baseShade = depth > 0 ? Math.min(0.018 + depth * 0.002, 0.03) : 0;
  row.style.backgroundColor = baseShade ? `rgba(255, 255, 255, ${baseShade})` : '';
  row.style.boxShadow = 'inset 0 -1px 0 rgba(255, 255, 255, 0.06)';
};

export const setupRelationsTreeEnhancements = (
  tree: HTMLElement | null,
  components: OBC.Components | undefined | null,
  options?: {
    selectHighlighterName?: string;
    hoverHighlighterName?: string;
  },
) => {
  if (!tree || !components) {
    return undefined;
  }

  const table = tree as unknown as Table<Record<string, any>>;
  const selectName = options?.selectHighlighterName ?? DEFAULT_SELECT_HIGHLIGHTER;
  const hoverName = options?.hoverHighlighterName ?? DEFAULT_HOVER_HIGHLIGHTER;

  const rowRegistry = new Map<string, HTMLElement>();
  const rowDataByKey = new Map<string, RelationsTreeRowData>();
  const eyeRegistry = new Map<string, HTMLButtonElement>();
  const hiddenKeys = new Set<string>();
  const fragMapByKey = new Map<string, unknown>();
  const fragMapByRow = new WeakMap<HTMLElement, unknown>();
  let currentKeys = new Set<string>();
  let revealRequestId = 0;

  const highlighter = (() => {
    try {
      return components.get(OBCF.Highlighter) as any;
    } catch {
      return null;
    }
  })();

  const selectEvents = highlighter?.events?.[selectName];

  const markRow = (row: HTMLElement, isSelected: boolean) => {
    row.toggleAttribute('data-selected', isSelected);
    row.classList.toggle('relations-tree__row--selected', isSelected);
    applyRowVisualState(row);
  };

  const updateEyeButton = (button: HTMLButtonElement, isHidden: boolean) => {
    button.innerHTML = isHidden ? EYE_OFF_ICON : EYE_ICON;
    button.title = isHidden ? 'Show' : 'Hide';
    button.dataset.visibility = isHidden ? 'hidden' : 'visible';
    button.style.background = 'rgba(255, 255, 255, 0.04)';
    button.style.color = isHidden ? 'rgba(255, 255, 255, 0.60)' : 'rgba(255, 255, 255, 0.78)';
    button.style.borderColor = isHidden ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.14)';
  };

  const applyHiddenVisual = (row: HTMLElement, isHidden: boolean) => {
    row.toggleAttribute('data-hidden', isHidden);
    row.style.opacity = isHidden ? '0.55' : '1';
    row.style.filter = isHidden ? 'saturate(0.85)' : '';
  };

  const setHiddenForKeys = (keys: string[], isHidden: boolean) => {
    const staleKeys: string[] = [];

    keys.forEach((key) => {
      if (isHidden) {
        hiddenKeys.add(key);
      } else {
        hiddenKeys.delete(key);
      }

      const row = rowRegistry.get(key);
      if (row) {
        if (!row.isConnected) {
          staleKeys.push(key);
        } else {
          applyHiddenVisual(row, isHidden);
        }
      }

      const eye = eyeRegistry.get(key);
      if (eye) {
        if (!eye.isConnected) {
          eyeRegistry.delete(key);
        } else {
          updateEyeButton(eye, isHidden);
        }
      }
    });

    staleKeys.forEach((key) => rowRegistry.delete(key));
    staleKeys.forEach((key) => rowDataByKey.delete(key));
  };

  const applySelection = (keys: Set<string>) => {
    const staleKeys: string[] = [];
    rowRegistry.forEach((row, key) => {
      if (!row.isConnected) {
        staleKeys.push(key);
        rowDataByKey.delete(key);
        return;
      }
      markRow(row, keys.has(key));
    });
    staleKeys.forEach((key) => rowRegistry.delete(key));
    currentKeys = keys;
  };

  const handleToggleVisibility = (key: string, rowData: RelationsTreeRowData) => {
    const currentlyHidden = hiddenKeys.has(key);
    const nextVisible = currentlyHidden;

    const nodes = (table.data as unknown as TableGroupNode[]) ?? [];
    const node = findNodeByDataRef(nodes, rowData);
    const subtreeKeys = node ? collectSubtreeKeys(node) : [key];

    const fragmentMap =
      buildFragmentMapForNode(node, components)
      ?? (fragMapByKey.get(key) as FragmentIdMap | undefined)
      ?? (getRowFragmentMap(components, rowData) as FragmentIdMap | null);

    try {
      if (!hasFragmentEntries(fragmentMap)) {
        return;
      }

      const hider = components.get(OBC.Hider);
      hider.set(nextVisible, fragmentMap as any);
    } catch (error) {
      console.warn('Failed to toggle visibility for', key, error);
      return;
    }

    setHiddenForKeys(subtreeKeys, !nextVisible);
  };

  const parseKey = (key: string) => {
    const separatorIndex = key.lastIndexOf(':');
    if (separatorIndex <= 0) {
      return null;
    }
    const modelId = key.slice(0, separatorIndex);
    const expressId = Number(key.slice(separatorIndex + 1));
    if (!modelId || !Number.isFinite(expressId)) {
      return null;
    }
    return { modelId, expressId };
  };

  const findPathToRow = (
    nodes: TableGroupNode[],
    modelId: string,
    expressId: number,
    ancestors: TableGroupNode[] = [],
  ): TableGroupNode[] | null => {
    for (const node of nodes) {
      const data = node.data as RelationsTreeRowData | undefined;
      const nodeModelId = data?.modelID;
      const nodeExpressId = data?.expressID;
      const matches =
        (typeof nodeModelId === 'string' || typeof nodeModelId === 'number')
        && String(nodeModelId) === modelId
        && typeof nodeExpressId === 'number'
        && nodeExpressId === expressId;
      const nextAncestors = [...ancestors, node];

      if (matches) {
        return nextAncestors;
      }

      if (node.children?.length) {
        const found = findPathToRow(node.children, modelId, expressId, nextAncestors);
        if (found) {
          return found;
        }
      }
    }

    return null;
  };

  const getTableShadowRoot = async () => {
    if ((tree as any).shadowRoot) {
      return (tree as any).shadowRoot as ShadowRoot;
    }
    const update = (tree as any).updateComplete;
    if (update instanceof Promise) {
      try {
        await update;
      } catch {
        // ignore
      }
    }
    return (tree as any).shadowRoot as ShadowRoot | null;
  };

  const findGroupElement = (root: ShadowRoot, node: TableGroupNode) => {
    const groups = root.querySelectorAll('bim-table-group');
    for (const group of groups) {
      const groupNode = (group as any).data;
      if (groupNode === node) {
        return group as HTMLElement;
      }
    }
    return null;
  };

  const waitForUpdateComplete = async (element: unknown) => {
    const update = (element as any)?.updateComplete;
    if (update instanceof Promise) {
      try {
        await update;
      } catch {
        // ignore
      }
    }
  };

  const waitForShadowRoot = async (element: unknown, timeoutMs = 500) => {
    const shadowRoot = (element as any)?.shadowRoot as ShadowRoot | undefined;
    if (shadowRoot) {
      return shadowRoot;
    }

    await waitForUpdateComplete(element);
    if ((element as any)?.shadowRoot) {
      return (element as any).shadowRoot as ShadowRoot;
    }

    await waitFor(() => Boolean((element as any)?.shadowRoot), timeoutMs);
    return ((element as any)?.shadowRoot as ShadowRoot) ?? null;
  };

  const waitFor = async (predicate: () => boolean, timeoutMs = 500) => {
    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      if (predicate()) {
        return true;
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return predicate();
  };

  const revealKeyInTree = async (key: string) => {
    const requestId = ++revealRequestId;
    const parsed = parseKey(key);
    if (!parsed) {
      return;
    }

    const existingRow = rowRegistry.get(key);
    if (existingRow?.isConnected) {
      existingRow.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return;
    }

    const root = await getTableShadowRoot();
    if (!root || requestId !== revealRequestId) {
      return;
    }

    const topChildrenHost = root.querySelector('bim-table-children');
    if (!topChildrenHost) {
      return;
    }

    const topGroupsRoot = await waitForShadowRoot(topChildrenHost, 700);
    if (!topGroupsRoot || requestId !== revealRequestId) {
      return;
    }

    const nodes = (table.value as unknown as TableGroupNode[]) ?? [];
    const path = findPathToRow(nodes, parsed.modelId, parsed.expressId);
    if (!path || requestId !== revealRequestId) {
      return;
    }

    let groupsRoot: ShadowRoot | null = topGroupsRoot;
    for (let index = 0; index < path.length - 1; index += 1) {
      const node = path[index];
      const nextNode = path[index + 1];
      if (!groupsRoot) {
        break;
      }

      const group = findGroupElement(groupsRoot, node);
      if (!group) {
        break;
      }

      const groupAny = group as any;
      if (typeof groupAny.toggleChildren === 'function' && groupAny.childrenHidden) {
        groupAny.toggleChildren(true);
        await waitForUpdateComplete(group);
      }

      const groupShadow = await waitForShadowRoot(group, 500);
      if (!groupShadow) {
        break;
      }

      const nextChildrenHost = groupShadow.querySelector('bim-table-children');
      if (!nextChildrenHost) {
        break;
      }

      groupsRoot = await waitForShadowRoot(nextChildrenHost, 700);

      await waitFor(() => Boolean(groupsRoot && findGroupElement(groupsRoot, nextNode)), 700);
      if (requestId !== revealRequestId) {
        return;
      }
    }

    await waitFor(() => Boolean(rowRegistry.get(key)?.isConnected), 600);
    if (requestId !== revealRequestId) {
      return;
    }

    const row = rowRegistry.get(key);
    if (row?.isConnected) {
      row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  const registerRow = (row: TableRow<Record<string, any>>) => {
    const rowElement = row as unknown as HTMLElement;
    const rowData = (row as any).data as RelationsTreeRowData | undefined;
    if (!rowData) {
      return;
    }

    const modelId = rowData.modelID;
    const expressId = rowData.expressID;
    if ((typeof modelId !== 'string' && typeof modelId !== 'number') || typeof expressId !== 'number') {
      return;
    }

    const key = fragmentKey(modelId, expressId);
    rowElement.dataset.fragmentKey = key;
    rowDataByKey.set(key, rowData);
    const getRowIndentation = (table as any)?.getRowIndentation;
    if (typeof getRowIndentation === 'function') {
      const indentation = getRowIndentation.call(table, rowData);
      if (typeof indentation === 'number' && Number.isFinite(indentation)) {
        rowElement.dataset.depth = String(indentation);
      }
    }
    rowRegistry.set(key, rowElement);

    rowElement.style.cursor = 'pointer';
    rowElement.style.borderRadius = '12px';
    rowElement.style.transition = 'background-color 140ms ease, box-shadow 140ms ease';
    rowElement.style.margin = '2px 0';

    rowElement.toggleAttribute('data-selected', currentKeys.has(key));
    applyHiddenVisual(rowElement, hiddenKeys.has(key));
    applyRowVisualState(rowElement);

    const expandable = canExpandRow(table, rowData);
    rowElement.toggleAttribute('data-expandable', expandable);
    if (!expandable) {
      queueMicrotask(() => {
        rowElement.querySelector('.caret')?.remove();
      });
    }

    const fragMap = getRowFragmentMap(components, rowData);
    if (!hasFragmentEntries(fragMap)) {
      return;
    }
    fragMapByRow.set(rowElement, fragMap);
    fragMapByKey.set(key, fragMap);

    rowElement.addEventListener(
      'mousedown',
      (event) => {
        if (event.button === 0) {
          event.preventDefault();
        }
      },
      { passive: false }
    );

    rowElement.onmouseover = () => {
      rowElement.toggleAttribute('data-hovered', true);
      applyRowVisualState(rowElement);

      if (!hoverName || !highlighter) {
        return;
      }

      highlighter.highlightByID(
        hoverName,
        fragMap,
        true,
        false,
        highlighter.selection?.[selectName] ?? {}
      );
    };

    rowElement.onmouseout = () => {
      rowElement.toggleAttribute('data-hovered', false);
      applyRowVisualState(rowElement);

      if (!hoverName || !highlighter) {
        return;
      }
      highlighter.clear(hoverName);
    };

    rowElement.onclick = () => {
      if (!selectName || !highlighter) {
        return;
      }
      highlighter.highlightByID(selectName, fragMap, true, true);
    };
  };

  const onRowCreatedCapture = (event: Event) => {
    const custom = event as CustomEvent<{ row: TableRow<Record<string, any>> }>;
    const row = custom.detail?.row;
    if (!row) {
      return;
    }

    // Override the default handler from @thatopen/ui-obc so we can control styling.
    event.stopImmediatePropagation();
    registerRow(row);
  };

  tree.addEventListener('rowcreated', onRowCreatedCapture, true);

  const entityCellCache = new WeakMap<object, HTMLElement>();

  const dataTransform: TableDataTransform<Record<string, any>> = {
    Entity: (value, data) => {
      if (!data || typeof data !== 'object') {
        return createEntityCell(value, {});
      }
      const key = data as object;
      const cached = entityCellCache.get(key);
      if (cached) {
        return cached;
      }
      const cell = createEntityCell(value, data as RelationsTreeRowData);
      cell.querySelectorAll<HTMLButtonElement>('button[data-action="toggle-visibility"]').forEach((button) => {
        const key = button.dataset.treeKey;
        if (!key) {
          return;
        }
        eyeRegistry.set(key, button);
        updateEyeButton(button, hiddenKeys.has(key));
      });
      entityCellCache.set(key, cell);
      return cell;
    },
  };

  try {
    table.columns = [
      { name: 'Entity', width: '1fr' },
    ] as any;
    table.minColWidth = '6rem';
    const hidden = Array.isArray((table as any).hiddenColumns) ? (table as any).hiddenColumns : [];
    (table as any).hiddenColumns = Array.from(new Set([...hidden, 'Name']));
    (table as any).dataTransform = dataTransform;
  } catch (error) {
    console.warn('Failed to apply relations-tree enhancements:', error);
  }

  // Tweak the local UI palette for nicer branch/caret contrast.
  tree.style.setProperty('--bim-ui_bg-contrast-40', 'rgba(255, 255, 255, 0.08)');
  tree.style.setProperty('--bim-ui_bg-contrast-60', 'rgba(255, 255, 255, 0.72)');
  tree.style.setProperty('--bim-ui_bg-contrast-20', 'rgba(255, 255, 255, 0.06)');

  const onToggleVisibility = (event: Event) => {
    const custom = event as CustomEvent<{ key?: string }>;
    const key = custom.detail?.key;
    if (!key) {
      return;
    }

    const rowData = rowDataByKey.get(key);
    if (!rowData) {
      return;
    }

    handleToggleVisibility(key, rowData as RelationsTreeRowData);
  };

  tree.addEventListener('togglevisibility', onToggleVisibility as EventListener);

  const handleHighlight = (fragmentIdMap: unknown) => {
    const keys = collectModelKeysFromSelection(components, fragmentIdMap);
    applySelection(keys);
    const firstKey = keys.values().next().value;
    if (typeof firstKey === 'string') {
      void revealKeyInTree(firstKey);
    }
  };

  const handleClear = () => {
    applySelection(new Set());
  };

  if (selectEvents?.onHighlight && selectEvents?.onClear) {
    selectEvents.onHighlight.add(handleHighlight);
    selectEvents.onClear.add(handleClear);
  }

  const initialSelection = highlighter?.selection?.[selectName];
  if (initialSelection) {
    handleHighlight(initialSelection);
  }

  return () => {
    tree.removeEventListener('rowcreated', onRowCreatedCapture, true);
    tree.removeEventListener('togglevisibility', onToggleVisibility as EventListener);
    if (selectEvents?.onHighlight && selectEvents?.onClear) {
      selectEvents.onHighlight.remove(handleHighlight);
      selectEvents.onClear.remove(handleClear);
    }
    rowRegistry.clear();
    rowDataByKey.clear();
    eyeRegistry.clear();
    fragMapByKey.clear();
  };
};
