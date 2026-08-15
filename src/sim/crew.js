import { canPlaceAt, habCapacity, spiralCandidates } from './layout.js';

const NAMES = [
  ['AMINA', 'OKOYE'], ['DIEGO', 'REYES'], ['PRIYA', 'NAIR'],
  ['JONAH', 'ADLER'], ['SOREN', 'BERG'], ['KEIKO', 'MORI'],
  ['LEILA', 'HADDAD'], ['MATEO', 'SILVA'], ['NYALA', 'TESFAYE'],
  ['OWEN', 'PARK'], ['FARAH', 'QASIM'], ['INES', 'KOWAL'],
];

const DEFAULT_ORDER = [
  'commander', 'pilot', 'engineer', 'scientist',
  'surgeon', 'technician', 'navigator', 'botanist',
];

export const TASKS = [
  { id: 'idle', name: 'Stand by' },
  { id: 'command', name: 'Command' },
  { id: 'science', name: 'Science' },
  { id: 'maintain', name: 'Maintain' },
  { id: 'construct', name: 'Construct' },
  { id: 'medical', name: 'Medical' },
  { id: 'grow', name: 'Grow' },
  { id: 'extract', name: 'Extract ice' },
  { id: 'explore', name: 'Explore / rover' },
  { id: 'eva', name: 'EVA' },
  { id: 'labor', name: 'Labor' },
  { id: 'cook', name: 'Cook' },
  { id: 'teach', name: 'Teach' },
  { id: 'mine', name: 'Mine' },
];

export function roleById(data, id) {
  return data.roles.find((r) => r.id === id) ?? null;
}

export function nextCrewName(state) {
  const used = new Set(state.colonists.living.map((c) => c.name));
  for (const [a, b] of NAMES) {
    const n = `${a} ${b}`;
    if (!used.has(n)) return n;
  }
  return `CREW ${state.colonists.living.length + 1}`;
}

export function makeColonist(state, spec) {
  return {
    id: `c_${String(state.colonists.living.length + state.colonists.dead.length + 1).padStart(4, '0')}`,
    name: spec.name,
    kind: spec.kind || 'human',
    role: spec.role ?? null,
    task: spec.task ?? 'idle',
    health: 1,
    morale: 0.72,
    arrivedSol: state.clock.sol ?? 0,
    vehicleId: spec.vehicleId ?? null,
  };
}

export function spawnManifestPeople(state, data, mission, vehicleId = null) {
  const seats = mission.manifest.find((l) => l.cargoId === 'crew_seat');
  const humans = seats ? seats.qty : 0;
  const robots = mission.manifest.reduce((s, l) => s + (l.cargoId === 'optimus_unit' ? (l.qty || 1) : 0), 0);

  for (let i = 0; i < humans; i++) {
    const role = DEFAULT_ORDER[i] ?? 'botanist';
    const def = roleById(data, role);
    state.colonists.living.push(makeColonist(state, {
      name: nextCrewName(state),
      kind: 'human',
      role,
      task: def?.defaultTask ?? 'idle',
      vehicleId,
    }));
  }
  for (let i = 0; i < robots; i++) {
    state.colonists.living.push(makeColonist(state, {
      name: `OPT-${String(i + 1).padStart(2, '0')}`,
      kind: 'robot',
      role: 'technician',
      task: 'construct',
      vehicleId,
    }));
  }
}

export function setCrewRole(state, data, colonistId, roleId) {
  const c = state.colonists.living.find((x) => x.id === colonistId);
  const role = roleById(data, roleId);
  if (!c || !role) return;
  if (c.kind === 'robot' && role.class === 'citizen') return;
  c.role = role.id;
  c.task = role.defaultTask;
}

export function setCrewTask(state, data, colonistId, taskId) {
  const c = state.colonists.living.find((x) => x.id === colonistId);
  if (!c) return;
  const role = roleById(data, c.role);
  const allowed = new Set(['idle', ...(role?.tasks || [])]);
  if (!allowed.has(taskId)) return;
  c.task = taskId;
}

function autoPlace(state, data, entry) {
  const site = data.sites.find((s) => s.id === state.mars.site) ?? data.sites[0];
  for (const p of spiralCandidates(64)) {
    if (canPlaceAt(state, site, data, entry.typeId, p.x, p.z)) continue;
    state.mars.unplaced = state.mars.unplaced.filter((u) => u.id !== entry.id);
    state.mars.modules.push({
      id: entry.id,
      typeId: entry.typeId,
      condition: 1,
      position: { x: p.x, z: p.z },
      connections: [],
      powered: false,
    });
    return true;
  }
  return false;
}

export function tickCrew(state, data) {
  const living = state.colonists.living;
  if (!living.length) return;

  for (const c of living) {
    const task = c.task || 'idle';
    if (task === 'extract') {
      const node = (state.mars.nodes || []).find((n) => n.reserve > 0 && n.kind === 'ice');
      if (node) {
        const take = Math.min(c.kind === 'robot' ? 260 : 160, node.reserve);
        node.reserve -= take;
        state.mars.resources.water_ice = (state.mars.resources.water_ice || 0) + take;
      }
    } else if (task === 'construct') {
      const next = (state.mars.unplaced || [])[0];
      if (next) autoPlace(state, data, next);
    } else if (task === 'grow') {
      state.mars.resources.food_fresh = (state.mars.resources.food_fresh || 0) + 2.2;
    } else if (task === 'science') {
      state.earth.research.points += 1;
    } else if (task === 'maintain') {
      for (const m of state.mars.modules) {
        if (m.position) m.condition = Math.min(1, (m.condition || 1) + 0.02);
      }
    } else if (task === 'medical') {
      for (const o of living) o.health = Math.min(1, (o.health ?? 1) + 0.04);
    } else if (task === 'mine') {
      const node = (state.mars.nodes || []).find((n) => n.reserve > 0 && n.kind === 'regolith');
      if (node) {
        const take = Math.min(300, node.reserve);
        node.reserve -= take;
        state.mars.resources.regolith = (state.mars.resources.regolith || 0) + take;
      }
    }
  }

  const humans = living.filter((c) => c.kind === 'human');
  const food = state.mars.resources.food_dry || 0;
  const need = humans.length * (data.balance.human.foodDry_kg_per_sol || 1.8);
  state.mars.resources.food_dry = Math.max(0, food - need);
  if (food < need) {
    for (const h of humans) h.health = Math.max(0, (h.health ?? 1) - 0.04);
  }

  const cap = habCapacity(state, data);
  if (humans.length && cap < humans.length) {
    for (const h of humans) h.morale = Math.max(0, (h.morale ?? 0.7) - 0.03);
  }

}

export function cityReady(state, data) {
  const humans = state.colonists.living.filter((c) => c.kind === 'human').length;
  return humans >= 24 && habCapacity(state, data) >= 24;
}
