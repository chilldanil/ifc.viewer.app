import type { PropertyEditingService } from '../services/propertyEditingService';
import { PROJECT_FORMAT_VERSION, type ProjectBundle, type ProjectRenderPayload, type ProjectState } from './projectTypes';
import { collectModelPayloads } from './projectModels';
import { applyViewerState, collectViewerState, type ProjectIOContext } from './projectViewerState';

export interface BuildProjectArgs {
  name: string;
  ctx: ProjectIOContext;
  propertyEditingService: PropertyEditingService | null;
  /** Saved renders to embed (wired in the render-gallery phase). */
  renders?: ProjectRenderPayload[];
}

export interface BuildProjectResult {
  bundle: ProjectBundle;
  /** Model names that couldn't be embedded (no recoverable source bytes). */
  skippedModels: string[];
}

/**
 * Assemble an in-memory project bundle from the current viewer: model bytes +
 * restorable viewer state + any saved renders. Pack it to a file with
 * projectBundle.packProjectBundle.
 */
export const buildProjectBundle = async (args: BuildProjectArgs): Promise<BuildProjectResult> => {
  const { payloads, skipped } = await collectModelPayloads(
    args.ctx.components,
    args.propertyEditingService
  );
  const renders = args.renders ?? [];
  const viewer = collectViewerState(args.ctx);

  const state: ProjectState = {
    formatVersion: PROJECT_FORMAT_VERSION,
    name: args.name,
    savedAt: new Date().toISOString(),
    viewer,
    models: payloads.map((p) => p.meta),
    renders: renders.map((r) => r.meta),
  };

  return {
    bundle: { state, models: payloads, renders },
    skippedModels: skipped,
  };
};

export interface RestoreProjectArgs {
  bundle: ProjectBundle;
  ctx: ProjectIOContext;
  /** Remove all currently-loaded models before restoring. */
  clearModels: () => void | Promise<void>;
  /** Load one embedded IFC model; resolves once the model is ready. */
  loadModel: (bytes: Uint8Array) => Promise<void>;
}

/**
 * Restore a project: clear the scene, load the embedded model(s), then re-apply
 * the saved viewer state once the models (and their classifier metadata) exist.
 */
export const restoreProjectBundle = async (args: RestoreProjectArgs): Promise<void> => {
  await args.clearModels();

  for (const model of args.bundle.models) {
    await args.loadModel(model.bytes);
  }

  await applyViewerState(args.bundle.state.viewer, args.ctx);
};
