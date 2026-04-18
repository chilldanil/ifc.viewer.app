export type ClashKind = 'hard' | 'clearance';

export type BoundsTuple = [number, number, number];

export interface ClashBounds {
  min: BoundsTuple;
  max: BoundsTuple;
}

export interface ClashItemRef {
  modelId: string;
  modelLabel: string;
  expressId: number;
  bounds: ClashBounds;
}

export interface ClashResult {
  id: string;
  type: ClashKind;
  a: ClashItemRef;
  b: ClashItemRef;
  focusBounds: ClashBounds;
  overlapBounds?: ClashBounds;
  overlapVolume: number;
  distance: number;
}

export interface ClashScope {
  modelIds: string[];
  entity?: string | null;
}

export interface ClashDetectionOptions {
  source: ClashScope;
  target: ClashScope;
  clearance: number;
  maxResults: number;
}

export interface ClashRunSummary {
  sourceCount: number;
  targetCount: number;
  scannedPairs: number;
  durationMs: number;
  truncated: boolean;
}

export interface ClashRunResult {
  results: ClashResult[];
  summary: ClashRunSummary;
}

export interface ClashModelSummary {
  id: string;
  label: string;
  visible: boolean;
}
