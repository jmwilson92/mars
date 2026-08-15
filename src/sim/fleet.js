import { MISSION_TYPES } from '../render/phases.js';
import { raiseAlert } from './alerts.js';
import { SEVERITY } from '../core/constants.js';

export const DEORBIT_FUEL = 0.12;
export const INSERTION_FUEL = 0.22;
export const TMI_FUEL = 0.08;
export const HOME_DAYS = 1;

export function ensureFleet(state) {
  if (!state.vehicles) state.vehicles = { designs: {}, fleet: [] };
  if (!state.vehicles.fleet) state.vehicles.fleet = [];
  return state.vehicles.fleet;
}

export function shipById(state, id) {
  return ensureFleet(state).find((s) => s.id === id) ?? null;
}

export function shipsForMission(state, missionId) {
  return ensureFleet(state).filter((s) => s.missionId === missionId);
}

export function peopleOnShip(state, shipId) {
  return (state.colonists.living || []).filter((c) => c.vehicleId === shipId);
}

export function countFleet(st) {
  const out = { leo: 0, outbound: 0, mars: 0, returning: 0, pad: 0 };
  const fleet = st?.vehicles?.fleet || [];
  if (fleet.length) {
    for (const s of fleet) {
      if (s.location === 'leo') out.leo += 1;
      else if (s.location === 'return') out.returning += 1;
      else if (s.location === 'mars') out.mars += 1;
      else if (s.location === 'outbound' || s.location === 'ascent') out.outbound += 1;
      else if (s.location === 'pad') out.pad += 1;
    }
    return out;
  }
  const piles = [st?.missions?.planned, st?.missions?.inTransit, st?.missions?.completed];
  for (const list of piles) {
    for (const m of list || []) {
      const n = m.ships || 1;
      if (m.status === 'leo') out.leo += n;
      else if (m.status === 'return' || m.leg === 'return') out.returning += n;
      else if (m.status === 'completed') out.mars += n;
      else if (m.leg === 'outbound' || m.status === 'transit') out.outbound += n;
    }
  }
  return out;
}

function qtyOf(mission, cargoId) {
  return mission.manifest.find((l) => l.cargoId === cargoId)?.qty || 0;
}

const HULL_NAMES = [
  'OPTIMUS', 'PERSEVERANCE', 'OZYMANDIAS', 'SECOND WIND',
  'MERIDIAN', 'HAVEN', 'LONGHAUL',
];

function nextName(state) {
  const n = ensureFleet(state).length + 1;
  return `ARK-${n} ${HULL_NAMES[(n - 1) % HULL_NAMES.length]}`;
}

function nextId(state) {
  const n = ensureFleet(state).length + 1;
  return `ss_${String(n).padStart(3, '0')}`;
}

export function variantOf(mission) {
  if (qtyOf(mission, 'methalox_load') > 0) return 'tanker';
  if (mission.type === MISSION_TYPES.CREWED) return 'crew';
  if (mission.type === MISSION_TYPES.ROBOTIC) return 'robotic';
  return 'cargo';
}

function emptyStores() {
  return { food: 0, water: 0, airDays: 0 };
}

export function createShip(state, spec = {}) {
  const ship = {
    id: spec.id || nextId(state),
    name: spec.name || nextName(state),
    variant: spec.variant || 'cargo',
    location: spec.location || 'pad',
    fuel: spec.fuel ?? 1,
    stores: spec.stores || emptyStores(),
    robots: spec.robots || 0,
    crew: spec.crew || 0,
    missionId: spec.missionId || null,
    dockedWith: null,
    flights: spec.flights || 0,
    cargo: spec.cargo || [],
    returnEta: null,
    systems: { eclss: 1, plants: 1, water: 1, power: 1 },
  };
  ensureFleet(state).push(ship);
  return ship;
}

export function fillFromMission(state, data, ship, mission) {
  const cargoById = (id) => data.cargo.find((c) => c.id === id);
  const seated = mission.manifest.reduce((s, l) => {
    const item = cargoById(l.cargoId);
    return s + (item?.crew ? item.crew * l.qty : 0);
  }, 0);
  const robots = mission.manifest.reduce((s, l) => {
    const item = cargoById(l.cargoId);
    return s + (item?.category === 'robot' ? l.qty : 0);
  }, 0);
  ship.variant = variantOf(mission);
  ship.missionId = mission.id;
  ship.fuel = 1;
  ship.crew = mission.type === MISSION_TYPES.ROBOTIC ? 0 : seated;
  ship.robots = robots;
  ship.stores = {
    food: qtyOf(mission, 'food_pallet') * 1000,
    water: qtyOf(mission, 'water_pallet') * 1000 + qtyOf(mission, 'water_recycler') * 400,
    airDays: qtyOf(mission, 'eclss_pack') * 360,
  };
  ship.cargo = mission.manifest
    .filter((l) => l.cargoId !== 'crew_seat')
    .map((l) => ({ cargoId: l.cargoId, qty: l.qty }));
  ship.systems = { eclss: 1, plants: 1, water: 1, power: 1 };
  ship.flights = (ship.flights || 0) + 1;
  ship.location = 'pad';
  ship.dockedWith = null;
  ship.returnEta = null;
}

export function assignOnCommit(state, data, mission) {
  ensureFleet(state);
  const need = Math.max(1, mission.ships || 1);
  const ids = [...(mission.vehicleIds || [])];
  const claimed = new Set(ids);
  const idle = ensureFleet(state).filter(
    (s) => s.location === 'pad' && !claimed.has(s.id) && (!s.missionId || s.missionId === mission.id),
  );
  while (ids.length < need) {
    const reuse = idle.shift();
    if (reuse) ids.push(reuse.id);
    else ids.push(createShip(state, { variant: variantOf(mission), missionId: mission.id }).id);
  }
  mission.vehicleIds = ids.slice(0, need);
  for (const id of mission.vehicleIds) {
    const ship = shipById(state, id);
    if (!ship) continue;
    fillFromMission(state, data, ship, mission);
  }
  return mission.vehicleIds;
}

export function applyLeg(state, mission, leg) {
  if (!mission) return;
  mission.leg = leg;
  if (!mission.vehicleIds?.length) return;
  for (const id of mission.vehicleIds) {
    const s = shipById(state, id);
    if (!s) continue;
    if (leg === 'ascent') s.location = 'ascent';
    else if (leg === 'outbound') {
      s.location = 'outbound';
      s.fuel = Math.min(s.fuel ?? 1, TMI_FUEL);
    } else if (leg === 'leo') s.location = 'leo';
    else if (leg === 'return') s.location = 'return';
  }
}

export function arriveLeo(state, mission) {
  if (!mission) return;
  mission.leg = 'leo';
  const tanker = variantOf(mission) === 'tanker';
  for (const id of mission.vehicleIds || []) {
    const s = shipById(state, id);
    if (!s) continue;
    s.location = 'leo';
    s.fuel = tanker ? 0.95 : INSERTION_FUEL;
    s.dockedWith = null;
    s.returnEta = null;
  }
}

export function markMars(state, mission) {
  for (const id of mission.vehicleIds || []) {
    const s = shipById(state, id);
    if (!s) continue;
    s.location = 'mars';
    s.fuel = 0.05;
    s.dockedWith = null;
  }
}

export function sendToLeo(state, data, mission) {
  if (!mission || mission.status !== 'go') return 'Commit the stack first.';
  if (!mission.vehicleIds?.length) assignOnCommit(state, data, mission);
  mission.status = 'leo';
  arriveLeo(state, mission);
  return null;
}

export function dock(state, aId, bId) {
  const a = shipById(state, aId);
  const b = shipById(state, bId);
  if (!a || !b) return 'Missing vehicle.';
  if (a.id === b.id) return 'Cannot dock with itself.';
  if (a.location !== 'leo' || b.location !== 'leo') return 'Both stacks must be in LEO.';
  if (a.dockedWith && a.dockedWith !== b.id) return `${a.name} is already docked.`;
  if (b.dockedWith && b.dockedWith !== a.id) return `${b.name} is already docked.`;
  a.dockedWith = b.id;
  b.dockedWith = a.id;
  return null;
}

export function undock(state, shipId) {
  const a = shipById(state, shipId);
  if (!a) return 'Missing vehicle.';
  if (!a.dockedWith) return 'Not docked.';
  const b = shipById(state, a.dockedWith);
  a.dockedWith = null;
  if (b) b.dockedWith = null;
  return null;
}

export function refuel(state, data, fromId, toId) {
  if (!state.earth.research.completed.includes('orbital_refuel')) {
    return 'Orbital refueling is not unlocked. Research it, then fly a tanker.';
  }
  return pumpFuel(state, fromId, toId, 1);
}

function pumpFuel(state, fromId, toId, maxGive) {
  const from = shipById(state, fromId);
  const to = shipById(state, toId);
  if (!from || !to) return 'Missing vehicle.';
  if (from.dockedWith !== to.id) return 'Dock the tanker first.';
  const spare = Math.max(0, (from.fuel ?? 0) - DEORBIT_FUEL);
  const room = Math.max(0, 1 - (to.fuel ?? 0));
  const give = Math.min(spare, room, maxGive);
  if (give <= 0.001) return 'No transferable propellant, or the tanker would be stranded.';
  from.fuel -= give;
  to.fuel += give;
  return null;
}

export function transferStores(state, fromId, toId) {
  const a = shipById(state, fromId);
  const b = shipById(state, toId);
  if (!a || !b) return 'Missing vehicle.';
  if (a.dockedWith !== b.id) return 'Dock first.';
  const hands = (a.crew || 0) + (a.robots || 0) + (b.crew || 0) + (b.robots || 0);
  if (hands < 1) return 'Nobody aboard to move cargo. Jump in and haul it.';
  a.stores = a.stores || emptyStores();
  b.stores = b.stores || emptyStores();
  for (const k of ['food', 'water', 'airDays']) {
    b.stores[k] = (b.stores[k] || 0) + (a.stores[k] || 0);
    a.stores[k] = 0;
  }
  const bag = new Map();
  for (const line of [...(b.cargo || []), ...(a.cargo || [])]) {
    bag.set(line.cargoId, (bag.get(line.cargoId) || 0) + line.qty);
  }
  b.cargo = [...bag.entries()].map(([cargoId, qty]) => ({ cargoId, qty }));
  a.cargo = [];
  syncLabFromShip(state, a);
  syncLabFromShip(state, b);
  return null;
}

const UNIT = { food: 200, water: 200, airDays: 30, fuel: 0.1 };

export function transferItem(state, fromId, toId, kind) {
  if (kind === 'fuel' || kind === 'methalox') return pumpFuel(state, fromId, toId, UNIT.fuel);
  const a = shipById(state, fromId);
  const b = shipById(state, toId);
  if (!a || !b) return 'Missing vehicle.';
  if (a.dockedWith !== b.id) return 'Dock first.';
  a.stores = a.stores || emptyStores();
  b.stores = b.stores || emptyStores();
  const key = kind === 'air' ? 'airDays' : kind;
  const amt = Math.min(UNIT[key] || 0, a.stores[key] || 0);
  if (amt <= 0) return 'Nothing left to move.';
  a.stores[key] -= amt;
  b.stores[key] = (b.stores[key] || 0) + amt;
  syncLabFromShip(state, a);
  syncLabFromShip(state, b);
  return null;
}

export function serviceShip(state, shipId, system) {
  const s = shipById(state, shipId);
  if (!s) return 'No ship.';
  if (!s.systems) s.systems = { eclss: 1, plants: 1, water: 1, power: 1 };
  if (!s.systems[system] && s.systems[system] !== 0) return 'Unknown system.';
  s.systems[system] = Math.min(1, (s.systems[system] ?? 0) + 0.4);
  if (system === 'plants') {
    s.stores = s.stores || emptyStores();
    s.stores.food = (s.stores.food || 0) + 12;
    syncLabFromShip(state, s);
  }
  return null;
}

export function comeHome(state, shipId) {
  const ship = shipById(state, shipId);
  if (!ship) return 'No such vehicle.';
  if (ship.location !== 'leo') return 'Only a LEO stack can deorbit from here.';
  if (ship.dockedWith) return 'Undock first.';
  if ((ship.fuel ?? 0) < DEORBIT_FUEL) {
    return 'No deorbit propellant. Launch a tanker, dock, and refuel.';
  }
  ship.fuel -= DEORBIT_FUEL;
  ship.location = 'return';
  ship.returnEta = HOME_DAYS;
  const mission = (state.missions.planned || []).find((m) => m.id === ship.missionId);
  if (mission && mission.status === 'leo') mission.leg = 'return';
  return null;
}

export function tickFleet(state) {
  for (const ship of ensureFleet(state)) {
    if (ship.location !== 'return') continue;
    ship.returnEta = (ship.returnEta ?? HOME_DAYS) - 1;
    if (ship.returnEta > 0) continue;
    landHome(state, ship);
  }
}

function landHome(state, ship) {
  const missionId = ship.missionId;
  if (ship.dockedWith) undock(state, ship.id);
  dropLab(state, ship);
  for (const c of state.colonists.living || []) {
    if (c.vehicleId === ship.id) c.vehicleId = null;
  }
  ship.location = 'pad';
  ship.missionId = null;
  ship.dockedWith = null;
  ship.returnEta = null;
  ship.crew = 0;
  ship.robots = 0;
  ship.stores = emptyStores();
  ship.cargo = [];
  ship.fuel = 0.06;
  const mates = shipsForMission(state, missionId);
  const mission = (state.missions.planned || []).find((m) => m.id === missionId);
  if (mission && mates.every((s) => s.location === 'pad' || s.id === ship.id)) {
    mission.status = 'recovered';
    mission.leg = 'pad';
  }
  raiseAlert(state, {
    id: `home_${ship.id}_${state.clock.tickCount}`,
    severity: SEVERITY.GREEN,
    system: 'trajectory',
    title: `${ship.name} RECOVERED`,
    body: 'Wheels down. The hull stays in your fleet. Fuel it and fly it again.',
  });
}

function dropLab(state, ship) {
  if (!state.earth.labs) return;
  state.earth.labs = state.earth.labs.filter((l) => l.shipId !== ship.id);
}

export function syncLabFromShip(state, ship) {
  const lab = (state.earth.labs || []).find((l) => l.shipId === ship.id || l.missionId === ship.missionId);
  if (!lab) return;
  lab.food = ship.stores?.food || 0;
  lab.water = ship.stores?.water || 0;
  lab.airDays = ship.stores?.airDays || 0;
  if ((lab.crew || 0) > 0 && (lab.food <= 0 || lab.water <= 0 || lab.airDays <= 0)) lab.offline = true;
  else if (lab.food > 0 && lab.water > 0 && lab.airDays > 0) lab.offline = false;
}

export function pushLabFromTick(state, lab) {
  const ship = (lab.shipId && shipById(state, lab.shipId))
    || shipsForMission(state, lab.missionId)[0];
  if (!ship) return;
  ship.stores = ship.stores || emptyStores();
  ship.stores.food = lab.food;
  ship.stores.water = lab.water;
  ship.stores.airDays = lab.airDays;
}

export function setVehicle(state, mission, shipId) {
  if (!mission || mission.status !== 'draft') return 'Assign hulls on a draft.';
  const ship = shipById(state, shipId);
  if (!ship || ship.location !== 'pad') return 'That hull is not on the pad.';
  if (ship.missionId && ship.missionId !== mission.id) return 'Already assigned to another stack.';
  const cap = Math.max(1, mission.ships || 1);
  mission.vehicleIds = mission.vehicleIds || [];
  if (mission.vehicleIds.includes(shipId)) return null;
  while (mission.vehicleIds.length >= cap) {
    const old = mission.vehicleIds.pop();
    const prev = shipById(state, old);
    if (prev && prev.missionId === mission.id) prev.missionId = null;
  }
  mission.vehicleIds.push(shipId);
  ship.missionId = mission.id;
  return null;
}

export function padBoosters(state) {
  if (!state.vehicles.boosters) state.vehicles.boosters = [];
  return state.vehicles.boosters.filter((b) => b.location === 'pad');
}

export function takeBooster(state) {
  if (!state.vehicles.boosters) state.vehicles.boosters = [];
  const idle = state.vehicles.boosters.find((b) => b.location === 'pad');
  if (idle) {
    idle.location = 'flight';
    idle.flights = (idle.flights || 1) + 1;
    return { booster: idle, reused: true };
  }
  const n = state.vehicles.boosters.length + 1;
  const b = { id: `b_${String(n).padStart(3, '0')}`, name: `BOOSTER ${n}`, location: 'flight', flights: 1 };
  state.vehicles.boosters.push(b);
  return { booster: b, reused: false };
}

export function recoverBooster(state) {
  if (!state.vehicles.boosters) state.vehicles.boosters = [];
  const flying = state.vehicles.boosters.find((b) => b.location === 'flight');
  if (flying) flying.location = 'pad';
}

export function insertLeo(state, data, mission) {
  if (!mission) return 'No stack in flight.';
  if (mission.status === 'completed' || mission.status === 'recovered') return 'That stack is done.';
  if (!mission.vehicleIds?.length) assignOnCommit(state, data, mission);
  mission.status = 'leo';
  arriveLeo(state, mission);
  return null;
}

export function applyFleetCommand(state, data, payload) {
  const cmd = payload?.cmd;
  if (cmd === 'COME_HOME') return comeHome(state, payload.shipId);
  if (cmd === 'DOCK') return dock(state, payload.a, payload.b);
  if (cmd === 'UNDOCK') return undock(state, payload.shipId);
  if (cmd === 'REFUEL') return refuel(state, data, payload.fromId, payload.toId);
  if (cmd === 'TRANSFER_CARGO') return transferStores(state, payload.fromId, payload.toId);
  if (cmd === 'TRANSFER_ITEM') return transferItem(state, payload.fromId, payload.toId, payload.kind);
  if (cmd === 'SEND_LEO') {
    const mission = state.missions.planned.find((m) => m.id === payload.missionId);
    return sendToLeo(state, data, mission);
  }
  if (cmd === 'SET_VEHICLE') {
    const mission = state.missions.planned.find((m) => m.id === payload.missionId);
    return setVehicle(state, mission, payload.shipId);
  }
  if (cmd === 'SERVICE_SHIP') return serviceShip(state, payload.shipId, payload.system);
  if (cmd === 'INSERT_LEO') {
    const mission = state.missions.planned.find((m) => m.id === payload.missionId)
      || state.missions.planned.find((m) => m.status === 'go');
    return insertLeo(state, data, mission);
  }
  if (cmd === 'BOOSTER_RECOVERED') {
    recoverBooster(state);
    return null;
  }
  return undefined;
}
