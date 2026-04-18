import { useState, useEffect } from 'react';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';
import * as OBF from '@thatopen/fragments';

/**
 * Hook to track element selection in the 3D viewer
 * Returns the selected model and expressID
 */
export const useElementSelection = (
  components: OBC.Components | null,
  world: OBC.World | null
): {
  selectedModel: OBF.FragmentsGroup | null;
  selectedExpressID: number | null;
} => {
  const [selectedModel, setSelectedModel] = useState<OBF.FragmentsGroup | null>(null);
  const [selectedExpressID, setSelectedExpressID] = useState<number | null>(null);

  useEffect(() => {
    if (!components || !world) {
      console.log('useElementSelection: Missing dependencies', { components: !!components, world: !!world });
      return;
    }

    console.log('useElementSelection: Setting up selection tracking');

    // Try to get highlighter with retries
    let retryCount = 0;
    const maxRetries = 20; // 2 seconds total
    let cleanupFn: (() => void) | undefined;

    const trySetupHighlighter = () => {
      try {
        const highlighter = components.get(OBCF.Highlighter);

        if (!highlighter?.events?.select?.onHighlight) {
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`useElementSelection: Highlighter not ready (attempt ${retryCount}/${maxRetries}), retrying...`);
            setTimeout(trySetupHighlighter, 100);
            return;
          } else {
            console.error('useElementSelection: Highlighter events never became available');
            return;
          }
        }

        console.log('✅ useElementSelection: Highlighter ready, setting up handlers');

        const handleSelection = (fragmentIdMap: any) => {
          console.log('🎯 useElementSelection: Selection event fired!', fragmentIdMap);

          try {
            const fragmentsManager = components.get(OBC.FragmentsManager);
            if (typeof (fragmentsManager as any)?.getModelIdMap === 'function') {
              const modelIdMap = (fragmentsManager as any).getModelIdMap(fragmentIdMap) as Record<string, Set<number>> | undefined;

              if (modelIdMap) {
                for (const [modelId, expressIds] of Object.entries(modelIdMap)) {
                  if (!(expressIds instanceof Set) || expressIds.size === 0) {
                    continue;
                  }

                  const group = fragmentsManager.groups.get(modelId);
                  const firstExpressId = Array.from(expressIds)[0];

                  if (group && typeof firstExpressId === 'number') {
                    console.log('✅ Found model for selection:', group.uuid);
                    setSelectedModel(group);
                    setSelectedExpressID(firstExpressId);
                    return;
                  }
                }
              }
            }

            console.warn('❌ No model found for selection');
          } catch (error) {
            console.error('useElementSelection: Error processing selection:', error);
          }
        };

        const handleClear = () => {
          console.log('🎯 useElementSelection: Selection cleared');
          setSelectedModel(null);
          setSelectedExpressID(null);
        };

        highlighter.events.select.onHighlight.add(handleSelection);
        highlighter.events.select.onClear.add(handleClear);

        console.log('✅ useElementSelection: Event handlers attached');

        // Store cleanup function
        cleanupFn = () => {
          console.log('useElementSelection: Cleaning up');
          highlighter.events.select.onHighlight.remove(handleSelection);
          highlighter.events.select.onClear.remove(handleClear);
        };
      } catch (error) {
        console.error('useElementSelection: Error setting up:', error);
      }
    };

    // Start setup with small delay
    const timeout = setTimeout(trySetupHighlighter, 300);

    return () => {
      clearTimeout(timeout);
      if (cleanupFn) cleanupFn();
    };
  }, [components, world]);

  return { selectedModel, selectedExpressID };
};
