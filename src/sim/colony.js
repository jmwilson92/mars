import { BLAST_M, canPlaceAt, isPlaceable, workRadius } from './layout.js';
import { spawnManifestPeople } from './crew.js';

function cargoById(data, id) {
  return data.cargo.find((c) => c.id === id);
}

function ensureNodes(state, data) {
  if (state.mars.nodes?.length) return;
  const site = data.sites.find((s) => s.id === state.mars.site) ?? data.sites[0];
  const rng = state.rng.stream('site');
  const wr = workRadius(site);
  const nodes = [];
  const iceN = 1 + Math.round((site.waterIce_abundance ?? 0.1) * 3);
  for (let i = 0; i < iceN; i++) {
    const a = rng.float(0, Math.PI * 2);
    const r = BLAST_M + 8 + rng.float(0, Math.max(6, wr - BLAST_M - 12));
    nodes.push({
      id: `ice_${i}`,
      kind: 'ice',
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      reserve: 18000 + (site.waterIce_abundance ?? 0.1) * 90000,
    });
  }
  for (let i = 0; i < 3; i++) {
    const a = rng.float(0, Math.PI * 2);
    const r = BLAST_M + 10 + rng.float(0, Math.max(6, wr - BLAST_M - 14));
    nodes.push({
      id: `reg_${i}`,
      kind: 'regolith',
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      reserve: 420000,
    });
  }
  state.mars.nodes = nodes;
}

/** Unpack a completed manifest. Modules wait in the warehouse until placed. */
export function applyLanding(state, data, mission, extras = {}) {
  if (!mission) return;
  if (!state.mars.unplaced) state.mars.unplaced = [];
  if (!state.mars.resources) state.mars.resources = {};
  state.mars.site = mission.siteId || state.experience.siteId;
  ensureNodes(state, data);

  const res = state.mars.resources;
  for (const line of mission.manifest) {
    const item = cargoById(data, line.cargoId);
    if (!item) continue;
    const n = line.qty || 1;
    if (isPlaceable(item)) {
      for (let i = 0; i < n; i++) {
        state.mars.unplaced.push({
          id: `${item.id}_${state.mars.modules.length + state.mars.unplaced.length}`,
          typeId: item.id,
        });
      }
    } else if (item.category === 'crew' || item.category === 'robot') {
      continue;
    } else {
      const key = item.id === 'food_pallet' ? 'food_dry'
        : item.id === 'spares_pallet' ? 'spare_parts'
          : item.id === 'water_pallet' ? 'water'
            : item.id;
      res[key] = (res[key] || 0) + item.mass_kg * n;
    }
  }

  if (!state.colonists.living.length) spawnManifestPeople(state, data, mission);
  state.experience.landed = true;

  const health = extras.shipHealth;
  if (health) {
    state.experience.ship = { ...health };
    if ((health.eclss ?? 1) < 0.35) {
      for (const c of state.colonists.living) {
        if (c.kind === 'human') c.health = Math.max(0.35, (c.health ?? 1) - 0.2);
      }
    }
  }
}

export function placeModule(state, data, typeId, x, z) {
  const site = data.sites.find((s) => s.id === state.mars.site) ?? data.sites[0];
  const entry = (state.mars.unplaced || []).find((u) => !typeId || u.typeId === typeId);
  if (!entry) return 'Nothing left to unpack.';
  const err = canPlaceAt(state, site, data, entry.typeId, x, z);
  if (err) return err;
  state.mars.unplaced = state.mars.unplaced.filter((u) => u.id !== entry.id);
  state.mars.modules.push({
    id: entry.id,
    typeId: entry.typeId,
    condition: 1,
    position: { x, z },
    connections: [],
    powered: false,
  });
  return null;
}

/** Gardens, recyclers, and ice rigs run every sol once placed. */
export function tickBase(state, data) {
  const res = state.mars.resources;
  if (!res) return;
  const site = data.sites.find((s) => s.id === state.mars.site);
  const ice = (state.mars.nodes || []).filter((n) => n.kind === 'ice' && n.reserve > 0);

  for (const m of state.mars.modules) {
    if (!m.position) continue;
    if (m.typeId === 'greenhouse_kit') {
      res.food_fresh = (res.food_fresh || 0) + 6.5;
      res.food_dry = (res.food_dry || 0) + 1.5;
    } else if (m.typeId === 'water_recycler') {
      res.water = (res.water || 0) + 20;
    } else if (m.typeId === 'water_ice_rig') {
      const node = nearestNode(ice, m.position.x, m.position.z);
      if (node && Math.hypot(node.x - m.position.x, node.z - m.position.z) < 16) {
        const take = Math.min(240 * (0.4 + (site?.waterIce_abundance ?? 0.15)), node.reserve);
        node.reserve -= take;
        res.water_ice = (res.water_ice || 0) + take;
        res.water = (res.water || 0) + take * 0.4;
      }
    } else if (m.typeId === 'moxie_unit') {
      res.o2 = (res.o2 || 0) + 2.6;
    }
  }

  const humans = (state.colonists.living || []).filter((c) => c.kind === 'human');
  if (!humans.length) return;
  const waterNeed = humans.length * (data.balance.human.waterDrink_kg_per_sol || 3.5);
  const o2Need = humans.length * (data.balance.human.o2_kg_per_sol || 0.84);
  const hadWater = res.water || 0;
  const hadO2 = res.o2 || 0;
  res.water = Math.max(0, hadWater - waterNeed);
  res.o2 = Math.max(0, hadO2 - o2Need);
  if (hadWater < waterNeed || hadO2 < o2Need) {
    for (const h of humans) h.health = Math.max(0, (h.health ?? 1) - 0.035);
  }
}

function nearestNode(nodes, x, z) {
  let best = null;
  let bestD = Infinity;
  for (const n of nodes) {
    const d = Math.hypot(n.x - x, n.z - z);
    if (d < bestD) {
      best = n;
      bestD = d;
    }
  }
  return best;
}

export function gatherNode(state, nodeId) {
  const node = (state.mars.nodes || []).find((n) => n.id === nodeId);
  if (!node || node.reserve <= 0) return 'That vein is spent.';
  const take = Math.min(node.kind === 'ice' ? 90 : 140, node.reserve);
  node.reserve -= take;
  const key = node.kind === 'ice' ? 'water_ice' : 'regolith';
  state.mars.resources[key] = (state.mars.resources[key] || 0) + take;
  return null;
}
