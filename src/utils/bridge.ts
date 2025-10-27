/**
 * Event-based bridge for communication between the host API and app internals
 * This provides a loosely coupled way to send commands to the viewer
 */

export interface CameraState {
  position?: number[];
  target?: number[];
}

export type BridgeEvents =
  | { type: 'loadFromUrl'; url: string; replyTo?: (success: boolean) => void }
  | { type: 'loadFromFile'; file: File; replyTo?: (success: boolean) => void }
  | { type: 'getCameraState'; replyTo: (state: CameraState) => void }
  | { type: 'setCameraState'; state: CameraState; replyTo?: (ok: boolean) => void }
  | { type: 'captureScreenshot'; replyTo: (dataUrl: string) => void };

type BridgeListener = (event: BridgeEvents) => void;

const listeners = new Set<BridgeListener>();

/**
 * Bridge for internal communication between viewer components
 * Uses a pub/sub pattern for loose coupling
 */
export const bridge = {
  /**
   * Subscribe to bridge events
   * @param fn - Callback function to handle events
   * @returns Unsubscribe function
   */
  subscribe(fn: BridgeListener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  /**
   * Emit an event to all subscribers
   * @param event - The event to emit
   */
  emit(event: BridgeEvents): void {
    for (const fn of listeners) {
      try {
        fn(event);
      } catch (error) {
        console.error('Bridge listener error:', error);
      }
    }
  },

  /**
   * Get the current number of active listeners
   * Useful for debugging
   */
  listenerCount(): number {
    return listeners.size;
  },
};
