import { createInitialState, bindRng } from '../src/core/state.js';
import { loadData, applyDataToState } from '../src/core/loader.js';
import { applyPlanningCommand, evaluateMission, draftMission } from '../src/sim/planning.js';
import { applyLanding, placeModule, gatherNode } from '../src/sim/colony.js';
import { tickCrew, setCrewRole, setCrewTask } from '../src/sim/crew.js';
import { canPlaceAt, workRadius, BLAST_M } from '../src/sim/layout.js';

const data = await loadData();
const state = bindRng(applyDataToState(createInitialState(0x4d415253, 'DIRECTOR'), data));

applyPlanningCommand(state, data, { cmd: 'DEV_PREP_FLIGHT', kind: 'CREWED' });
const go = state.missions.planned.find((m) => m.status === 'go');
if (!go) throw new Error('dev prep did not commit a crewed flight');
const ev = evaluateMission(state, data, go);
if (!ev.go) throw new Error(`committed flight is not GO: ${ev.flags.map((f) => f.text).join('; ')}`);
if (state.colonists.living.filter((c) => c.kind === 'human').length < 4) {
  throw new Error('expected 4 named crew after commit');
}
if (!state.colonists.living.some((c) => c.role === 'commander')) {
  throw new Error('first seat should be commander');
}

applyLanding(state, data, go, { shipHealth: { eclss: 0.9, plants: 0.8, water: 1, power: 1 } });
if (!state.mars.unplaced.length) throw new Error('expected unplaced modules');
if (!state.mars.nodes.some((n) => n.kind === 'ice')) throw new Error('expected ice node');

const site = data.sites.find((s) => s.id === state.mars.site);
const wr = workRadius(site);
if (wr <= BLAST_M) throw new Error('work ellipse inside blast keep-out');

const blastErr = canPlaceAt(state, site, data, 'hab_landed', 0, 0);
if (!blastErr) throw new Error('habitat should not sit on the pad');

const ok = placeModule(state, data, 'hab_landed', 30, 0);
if (ok) throw new Error(`valid pad placement rejected: ${ok}`);
if (!state.mars.modules.some((m) => m.typeId === 'hab_landed' && m.position)) {
  throw new Error('habitat did not land in modules');
}

const ice = state.mars.nodes.find((n) => n.kind === 'ice');
const before = ice.reserve;
gatherNode(state, ice.id);
if (ice.reserve >= before) throw new Error('gather did not reduce ice');

const botanist = state.colonists.living.find((c) => c.role === 'botanist')
  ?? state.colonists.living[state.colonists.living.length - 1];
setCrewRole(state, data, botanist.id, 'botanist');
setCrewTask(state, data, botanist.id, 'grow');
const food0 = state.mars.resources.food_fresh || 0;
tickCrew(state, data);
if ((state.mars.resources.food_fresh || 0) <= food0) throw new Error('botanist grow did not add food');

const draft = draftMission(state);
if (!draft.manifest.some((l) => l.cargoId === 'hab_landed')) throw new Error('draft missing hab');

const { buildFlightTelem } = await import('../src/render/telem.js');
const { PHASE } = await import('../src/render/phases.js');
const telem = buildFlightTelem({
  phase: PHASE.ASCENT,
  phaseT: 125,
  cfg: { ascentSeconds: 540, transitSeconds: 160 },
  view: 'crew',
  rate: 1,
  seated: true,
  belted: true,
  armed: true,
  extView: false,
  lastNear: null,
  holdEdl: false,
  deck: 0,
  getState: () => ({ vehicles: { fleet: [] } }),
});
if (!String(telem.prompt || '').includes('[V] OUTSIDE')) throw new Error('ascent HUD missing cabin/outside toggle');
if (!String(telem.missionLabel || '').includes('T+')) throw new Error('ascent HUD missing T+ clock');
const paused = buildFlightTelem({
  phase: PHASE.ASCENT,
  phaseT: 12,
  cfg: { ascentSeconds: 540 },
  view: 'crew',
  rate: 0,
  seated: true,
  belted: true,
  armed: true,
  extView: true,
  lastNear: null,
  holdEdl: false,
  deck: 0,
  getState: () => ({ vehicles: { fleet: [] } }),
});
if (!String(paused.missionLabel || '').includes('PAUSED')) throw new Error('rate 0 should show PAUSED');

console.log('smoke-flight ok', {
  crew: state.colonists.living.map((c) => `${c.name}:${c.role}`),
  workRadius: wr,
  unplaced: state.mars.unplaced.length,
  placed: state.mars.modules.length,
  iceKg: Math.round(state.mars.resources.water_ice || 0),
});
