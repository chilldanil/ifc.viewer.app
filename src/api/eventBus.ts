export type EventHandler<T> = (payload: T) => void;

export interface EventBus<EventMap extends Record<string, any>> {
  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void;
  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void;
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void;
}

export const createEventBus = <EventMap extends Record<string, any>>(): EventBus<EventMap> => {
  const listeners = new Map<keyof EventMap, Set<EventHandler<any>>>();

  return {
    on: (event, handler) => {
      const set = listeners.get(event) ?? new Set<EventHandler<any>>();
      set.add(handler);
      listeners.set(event, set);
      return () => set.delete(handler);
    },
    off: (event, handler) => {
      const set = listeners.get(event);
      set?.delete(handler);
    },
    emit: (event, payload) => {
      const set = listeners.get(event);
      if (!set) {return;}
      set.forEach((handler) => {
        try {
          handler(payload);
        } catch {
          /* ignore handler errors */
        }
      });
    },
  };
};
