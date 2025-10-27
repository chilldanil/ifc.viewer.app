import * as BUI from '@thatopen/ui';

let isInitialised = false;

export const ensureBUIInitialised = (): void => {
  if (isInitialised) {return;}
  try {
    BUI.Manager.init();
  } catch {
    // Ignore already-initialized errors
  }
  isInitialised = true;
};

export type { BUI };


