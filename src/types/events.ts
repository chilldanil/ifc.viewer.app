export interface ViewerEventMap {
  modelLoaded: { modelId: string };
  selectionChanged: { modelId: string | null; expressId: number | null };
  visibilityChanged: { modelId: string; visible: boolean };
}
