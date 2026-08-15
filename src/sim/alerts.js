import { SEVERITY } from '../core/constants.js';

let seq = 0;

export function raiseAlert(state, spec) {
  seq += 1;
  const entry = {
    id: spec.id ?? `a_${state.clock.tickCount}_${seq}`,
    severity: spec.severity,
    title: spec.title,
    body: spec.body ?? '',
    system: spec.system ?? null,
    raisedTick: state.clock.tickCount,
    raisedEarthDay: state.clock.earthDay,
    raisedSol: state.clock.sol,
    acknowledged: false,
  };

  if (spec.severity === SEVERITY.GREEN) {
    state.incidents.history.push(entry);
    return entry;
  }

  const exists = state.incidents.active.some((a) => a.id === entry.id);
  if (!exists) state.incidents.active.push(entry);
  return entry;
}

export function acknowledgeAlert(state, id) {
  const idx = state.incidents.active.findIndex((a) => a.id === id);
  if (idx < 0) return;
  const [item] = state.incidents.active.splice(idx, 1);
  item.acknowledged = true;
  state.incidents.history.push(item);
}

export function countBySeverity(state) {
  const counts = { green: 0, amber: 0, red: 0, black: 0 };
  for (const a of state.incidents.active) {
    if (counts[a.severity] != null) counts[a.severity] += 1;
  }
  return counts;
}
