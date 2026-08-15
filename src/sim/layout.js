/** Starship and landing-site footprints. 1 unit = 1 meter. */

export const BLAST_M = 22;
export const WORK_RADIUS_MAX = 88;
export const WORK_RADIUS_MIN = 40;
export const HAB_KEEP = 1.2;

export function workRadius(site) {
  const rough = site?.terrainRoughness ?? 0.5;
  return Math.round(WORK_RADIUS_MAX - rough * (WORK_RADIUS_MAX - WORK_RADIUS_MIN));
}

export function footprintRadius(item) {
  if (!item) return 2;
  if (item.placeRadius_m) return item.placeRadius_m;
  if (item.footprint_m2) return Math.sqrt(item.footprint_m2 / Math.PI);
  if (item.category === 'habitat') return 4.2;
  if (item.category === 'agriculture') return 4.0;
  if (item.id === 'solar_100m2') return 5.8;
  if (item.category === 'power') return 2.2;
  if (item.category === 'isru') return 3.2;
  return 2.0;
}

export function isPlaceable(item) {
  if (!item) return false;
  if (item.placeRadius_m) return true;
  return item.category === 'habitat'
    || item.category === 'power'
    || item.category === 'isru'
    || item.category === 'agriculture';
}

export function canPlaceAt(state, site, data, typeId, x, z) {
  const item = data.cargo.find((c) => c.id === typeId);
  const r = footprintRadius(item);
  const wr = workRadius(site);
  if (Math.hypot(x, z) < BLAST_M + r) return 'Engine keep-out. The pad is still hot.';
  if (Math.hypot(x, z) + r > wr) return 'Outside the surveyed work ellipse.';
  for (const m of state.mars.modules) {
    if (m.position == null) continue;
    const other = data.cargo.find((c) => c.id === m.typeId);
    const or = footprintRadius(other);
    if (Math.hypot(m.position.x - x, m.position.z - z) < r + or + HAB_KEEP) {
      return 'Overlaps an existing module.';
    }
  }
  return null;
}

export function spiralCandidates(count = 48) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = i * 2.399;
    const r = BLAST_M + 8 + i * 1.7;
    pts.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
  }
  return pts;
}

export function habCapacity(state, data) {
  let n = 0;
  for (const m of state.mars.modules) {
    if (m.position == null) continue;
    const item = data.cargo.find((c) => c.id === m.typeId);
    n += item?.crewCapacity ?? 0;
  }
  return n;
}
