import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import * as OBF from '@thatopen/fragments';
import { setupIfcLoader } from '../core/services/ifcLoaderService';
import { CameraState } from '../utils/bridge';
import { EventBus } from './eventBus';
import { ViewerEventMap } from '../types/events';
import { PluginRegistry } from './pluginRegistry';

export interface ViewerAPI {
  loadModelFromBuffer: (data: Uint8Array) => Promise<void>;
  getCameraState: () => CameraState | null;
  setCameraState: (state: CameraState) => Promise<void>;
  highlight: (model: OBF.FragmentsGroup, expressIds: number[]) => void;
  clearHighlight: () => void;
  captureScreenshot: () => Promise<string>;
  events: EventBus<ViewerEventMap>;
  plugins: PluginRegistry;
}

export const createViewerAPI = (
  components: () => OBC.Components | null,
  world: () => OBC.World | null,
  events: EventBus<ViewerEventMap>,
  plugins: PluginRegistry,
  captureScreenshotFn: () => Promise<string>,
  propertyEditingService: () => any
): ViewerAPI => {
  const getComponents = () => {
    const inst = components();
    if (!inst) {throw new Error('Components not ready');}
    return inst;
  };

  const getWorld = () => {
    const inst = world();
    if (!inst) {throw new Error('World not ready');}
    return inst;
  };

  return {
    loadModelFromBuffer: async (data: Uint8Array) => {
      const comps = getComponents();
      const loader = setupIfcLoader(comps, propertyEditingService() ?? undefined);
      await loader.loadFromBuffer(data);
    },
    getCameraState: () => {
      const w = world();
      const pos = w?.camera?.three?.position?.toArray?.() ?? undefined;
      const tgt = (w?.camera as any)?.controls?.getTarget?.()?.toArray?.() ?? undefined;
      if (!pos || !tgt) {return null;}
      return { position: pos, target: tgt };
    },
    setCameraState: async (state: CameraState) => {
      const w = getWorld();
      const controls = (w.camera as any)?.controls;
      if (controls?.setLookAt && state.position && state.target) {
        await controls.setLookAt(
          state.position[0], state.position[1], state.position[2],
          state.target[0], state.target[1], state.target[2]
        );
      }
    },
    highlight: (model, expressIds) => {
      const comps = getComponents();
      const highlighter = comps.get(OBCF.Highlighter) as any;
      const fragmentMap = model.getFragmentMap(expressIds);
      highlighter?.select?.('select', fragmentMap);
    },
    clearHighlight: () => {
      const comps = getComponents();
      const highlighter = comps.get(OBCF.Highlighter) as any;
      highlighter?.clear?.('select');
      highlighter?.clear?.('hover');
    },
    captureScreenshot: () => captureScreenshotFn(),
    events,
    plugins,
  };
};
