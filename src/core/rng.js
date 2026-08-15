/**
 * Named mulberry32 streams. Each stream has its own state and counter so a new
 * roll in `incidents` cannot desync `edl` (or any other stream).
 * Sim code must never call Math.random().
 */

function hash32(text, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function stepMulberry(a) {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { state: a >>> 0, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
}

function streamSeed(rootSeed, name) {
  return hash32(name, (rootSeed ^ 0x811c9dc5) >>> 0);
}

function makeStreamApi(slot) {
  return {
    get name() {
      return slot.name;
    },
    get counter() {
      return slot.counter;
    },
    next() {
      const stepped = stepMulberry(slot.state);
      slot.state = stepped.state;
      slot.counter += 1;
      return stepped.value;
    },
    float(min = 0, max = 1) {
      return min + this.next() * (max - min);
    },
    int(min, max) {
      const lo = Math.ceil(min);
      const hi = Math.floor(max);
      return lo + Math.floor(this.next() * (hi - lo + 1));
    },
    chance(p) {
      return this.next() < p;
    },
    pick(items) {
      if (!items.length) return undefined;
      return items[this.int(0, items.length - 1)];
    },
  };
}

export function generateSeed() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] >>> 0;
}

export function formatSeed(seed) {
  return (seed >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function createRng(rootSeed, serialized = null) {
  const seed = (serialized?.rootSeed ?? rootSeed) >>> 0;
  const streams = new Map();

  function restoreSlot(name, rec) {
    const slot = {
      name,
      seed: rec?.seed ?? streamSeed(seed, name),
      state: rec?.state ?? streamSeed(seed, name),
      counter: rec?.counter ?? 0,
    };
    // Fresh streams start with state == seed so the first next() is step(seed).
    if (rec == null) slot.state = slot.seed;
    streams.set(name, slot);
    return slot;
  }

  if (serialized?.streams) {
    for (const [name, rec] of Object.entries(serialized.streams)) {
      restoreSlot(name, rec);
    }
  }

  return {
    get rootSeed() {
      return seed;
    },
    stream(name) {
      let slot = streams.get(name);
      if (!slot) slot = restoreSlot(name, null);
      return makeStreamApi(slot);
    },
    serialize() {
      const out = {};
      for (const [name, slot] of streams) {
        out[name] = { seed: slot.seed, state: slot.state, counter: slot.counter };
      }
      return { rootSeed: seed, streams: out };
    },
  };
}
