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

const DEFAULT_SELECT_HIGHLIGHTER = 'select';
const DEFAULT_HOVER_HIGHLIGHTER = 'hover';

const fragmentKey = (modelId: string | number, expressId: number) => `${modelId}:${expressId}`;

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
    topRow.append(idBadge);
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
  const fragMapByRow = new WeakMap<HTMLElement, unknown>();
  let currentKeys = new Set<string>();

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

  const applySelection = (keys: Set<string>) => {
    const staleKeys: string[] = [];
    rowRegistry.forEach((row, key) => {
      if (!row.isConnected) {
        staleKeys.push(key);
        return;
      }
      markRow(row, keys.has(key));
    });
    staleKeys.forEach((key) => rowRegistry.delete(key));
    currentKeys = keys;
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
    applyRowVisualState(rowElement);

    const fragMap = getRowFragmentMap(components, rowData);
    if (!hasFragmentEntries(fragMap)) {
      return;
    }
    fragMapByRow.set(rowElement, fragMap);

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

  const handleHighlight = (fragmentIdMap: unknown) => {
    applySelection(collectFragmentKeys(fragmentIdMap));
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
    if (selectEvents?.onHighlight && selectEvents?.onClear) {
      selectEvents.onHighlight.remove(handleHighlight);
      selectEvents.onClear.remove(handleClear);
    }
    rowRegistry.clear();
  };
};
