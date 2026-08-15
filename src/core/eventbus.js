/** In-process pub/sub. Worker traffic stays on postMessage; this only fans out on one thread. */

export function createEventBus() {
  const listeners = new Map();

  return {
    on(type, fn) {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(fn);
      return () => this.off(type, fn);
    },
    off(type, fn) {
      const set = listeners.get(type);
      if (!set) return;
      set.delete(fn);
      if (set.size === 0) listeners.delete(type);
    },
    once(type, fn) {
      const wrap = (payload) => {
        this.off(type, wrap);
        fn(payload);
      };
      return this.on(type, wrap);
    },
    emit(type, payload) {
      const set = listeners.get(type);
      if (!set) return;
      for (const fn of [...set]) fn(payload);
    },
    clear() {
      listeners.clear();
    },
  };
}
