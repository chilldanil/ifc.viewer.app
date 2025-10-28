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

            // Find the first selected element
            for (const [, expressIds] of Object.entries(fragmentIdMap)) {
              const expressIdSet = expressIds as Set<number>;

              if (expressIdSet && expressIdSet.size > 0) {
                const firstExpressId = Array.from(expressIdSet)[0];
                console.log('🎯 First selected expressID:', firstExpressId);

                // Find the model containing this fragment
                for (const [, group] of fragmentsManager.groups) {
                  try {
                    const fragmentMap = group.getFragmentMap([firstExpressId]);
                    if (fragmentMap && Object.keys(fragmentMap).length > 0) {
                      console.log('✅ Found model for selection:', group.uuid);
                      setSelectedModel(group);
                      setSelectedExpressID(firstExpressId);
                      return;
                    }
                  } catch (err) {
                    // Continue to next group
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
