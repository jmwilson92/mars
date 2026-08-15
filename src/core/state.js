import { GAME_VERSION } from './identity.js';
import { POWER_PRIORITY_DEFAULT } from './constants.js';
import { createClockState } from './clock.js';
import { createRng } from './rng.js';

export const DEFAULT_DIFFICULTY = 'ADMINISTRATOR';

function emptyEarth() {
  return {
    budget: {
      annual: 0,
      remaining: 0,
      allocation: { rd: 0, mfg: 0, ops: 0, outreach: 0, reserve: 0 },
      ledger: [],
    },
    politics: {
      support: 0,
      administration: null,
      mandate: null,
      quartersUnderThreshold: 0,
    },
    contractors: {},
    research: { points: 0, completed: [], active: null, maturity: {}, milestones: [] },
    labs: [],
    manufacturing: { queue: [], facilities: [] },
    inventory: {},
  };
}

function emptyMars() {
  return {
    site: null,
    environment: {
      tau: 0.4,
      temp_c: -63,
      insolation_wm2: 0,
      dustDeposition: 0,
      stormActive: false,
    },
    power: {
      generation_kw: 0,
      demand_kw: 0,
      storage_kwh: 0,
      storageMax_kwh: 0,
      priority: [...POWER_PRIORITY_DEFAULT],
      allocated: {},
      deficitSols: 0,
      lifeSupportPowered: true,
    },
    resources: {},
    modules: [],
    unplaced: [],
    nodes: [],
    systems: {},
    agriculture: { plots: [], nutritionalDiversity: 0 },
    atmosphere: { pressure_kpa: 0, ppO2_kpa: 0, co2_ppm: 0 },
    closure: { consumable: 0, industrial: 0, technical: 0, energy: 0, human: 0 },
  };
}

export function createInitialState(seed, difficulty = DEFAULT_DIFFICULTY) {
  const rng = createRng(seed >>> 0);
  return {
    meta: {
      seed: seed >>> 0,
      version: GAME_VERSION,
      difficulty,
      createdAt: 0,
      playtimeSeconds: 0,
    },
    clock: createClockState(),
    earth: emptyEarth(),
    vehicles: { designs: {}, fleet: [] },
    missions: { planned: [], inTransit: [], completed: [], failed: [] },
    mars: emptyMars(),
    colonists: { living: [], dead: [], candidates: [] },
    incidents: { active: [], history: [] },
    autonomy: {
      factions: { loyalist: 0, autonomist: 0, separatist: 0 },
      charterLevel: 0,
    },
    experience: {
      phase: 'office',
      siteId: 'jezero_north',
      landed: false,
      ship: { eclss: 1, plants: 1, water: 1, power: 1 },
    },
    rng: rng.serialize(),
  };
}

export function snapshotOf(state) {
  const { rng: rngHandle, ...rest } = state;
  const payload = structuredClone(rest);
  payload.rng = rngHandle && typeof rngHandle.serialize === 'function'
    ? rngHandle.serialize()
    : structuredClone(state.rng);
  return payload;
}

export function bindRng(state) {
  state.rng = createRng(state.meta.seed, state.rng);
  return state;
}

export function hasRedAlert(state) {
  return state.incidents.active.some((a) => a.severity === 'red' || a.severity === 'black');
}

export function hasBlockingAlert(state) {
  return state.incidents.active.some(
    (a) => a.severity === 'red' || a.severity === 'black' || a.severity === 'amber',
  );
}
