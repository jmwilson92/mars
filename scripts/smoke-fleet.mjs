import { createInitialState, bindRng } from '../src/core/state.js';
import { loadData, applyDataToState } from '../src/core/loader.js';
import { applyPlanningCommand, evaluateMission, draftMission } from '../src/sim/planning.js';
import { parkLab, restockLab } from '../src/sim/research.js';
import {
  applyFleetCommand,
  comeHome,
  countFleet,
  DEORBIT_FUEL,
  dock,
  refuel,
  sendToLeo,
  shipById,
  tickFleet,
  transferStores,
  undock,
} from '../src/sim/fleet.js';
import { createPipeline } from '../src/sim/pipeline.js';

const data = await loadData();
const state = bindRng(applyDataToState(createInitialState(0x464c4554, 'DIRECTOR'), data));

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

applyPlanningCommand(state, data, { cmd: 'DEV_PREP_FLIGHT', kind: 'ROBOTIC' });
const go = state.missions.planned.find((m) => m.status === 'go');
ok(go, 'dev prep did not commit');
ok(go.vehicleIds?.length, 'commit did not mint a Starship');
const hull = shipById(state, go.vehicleIds[0]);
ok(hull && hull.location === 'pad', 'new hull should sit on the pad');
const firstId = hull.id;

const parkErr = parkLab(state, data, go);
ok(!parkErr, `park failed: ${parkErr}`);
ok(hull.location === 'leo', 'park should put the hull in LEO');
ok(hull.fuel >= DEORBIT_FUEL, 'insertion leftover should cover deorbit');
ok(countFleet(state).leo >= 1, 'wall count should see a LEO stack');

ok(!comeHome(state, hull.id), 'LEO stack with fuel should deorbit');
ok(hull.location === 'return', 'deorbit should mark return');
tickFleet(state);
ok(hull.location === 'pad', 'one tick later the hull is on the pad again');
ok(!hull.missionId, 'recovered hull is unassigned');
ok(countFleet(state).pad >= 1, 'pad count after recovery');

const draft = draftMission(state);
draft.id = 'm_reuse';
draft.type = 'ROBOTIC';
draft.manifest = [
  { cargoId: 'optimus_unit', qty: 2 },
  { cargoId: 'spares_pallet', qty: 1 },
];
state.missions.planned.unshift(draft);
ok(!applyFleetCommand(state, data, { cmd: 'SET_VEHICLE', missionId: draft.id, shipId: firstId }), 'assign recovered hull');
const ev = evaluateMission(state, data, draft);
ok(ev.go, `reuse draft not GO: ${ev.flags.map((f) => f.text).join('; ')}`);
applyPlanningCommand(state, data, { cmd: 'COMMIT_MISSION', missionId: draft.id });
const again = shipById(state, firstId);
ok(again.missionId === 'm_reuse', 'recovered hull should fly the next stack');
ok(again.flights >= 2, 'reuse should increment flight count');
ok(state.vehicles.fleet.filter((s) => s.id === firstId).length === 1, 'reuse must not buy a second hull');

const park2 = parkLab(state, data, draft);
ok(!park2, `second park failed: ${park2}`);
again.fuel = 0.04;
const dry = comeHome(state, again.id);
ok(dry && /tanker/i.test(dry), `dry stack should demand a tanker, got: ${dry}`);

if (!state.earth.research.completed.includes('orbital_refuel')) {
  state.earth.research.completed.push('orbital_refuel');
}
state.earth.budget.remaining = Math.max(state.earth.budget.remaining, 2e9);

const tanker = draftMission(state);
tanker.id = 'm_tanker';
tanker.type = 'CARGO';
tanker.manifest = [{ cargoId: 'methalox_load', qty: 1 }];
state.missions.planned.unshift(tanker);
const tev = evaluateMission(state, data, tanker);
ok(tev.go, `tanker not GO: ${tev.flags.map((f) => f.text).join('; ')}`);
applyPlanningCommand(state, data, { cmd: 'COMMIT_MISSION', missionId: tanker.id });
ok(!sendToLeo(state, data, tanker), 'tanker should reach LEO');
const tankerShip = shipById(state, tanker.vehicleIds[0]);
ok(tankerShip.variant === 'tanker', 'methalox load should mark a tanker');
ok(tankerShip.location === 'leo', 'tanker in LEO');
ok(!dock(state, tankerShip.id, again.id), 'dock tanker to dry stack');
const refErr = refuel(state, data, tankerShip.id, again.id);
ok(!refErr, `refuel failed: ${refErr}`);
ok(again.fuel >= DEORBIT_FUEL, 'dry stack should have deorbit fuel after the tanker');
ok(tankerShip.fuel >= DEORBIT_FUEL, 'tanker keeps a ride home');
ok(!undock(state, tankerShip.id), 'undock after pump');
ok(!comeHome(state, again.id), 'refueled stack goes home');

const crewed = draftMission(state);
crewed.id = 'm_crewleo';
crewed.type = 'CREWED';
crewed.manifest = [
  { cargoId: 'crew_seat', qty: 2 },
  { cargoId: 'optimus_unit', qty: 1 },
  { cargoId: 'eclss_pack', qty: 1 },
  { cargoId: 'food_pallet', qty: 2 },
  { cargoId: 'water_pallet', qty: 2 },
  { cargoId: 'spares_pallet', qty: 1 },
];
state.missions.planned.unshift(crewed);
const cev = evaluateMission(state, data, crewed);
ok(cev.go, `crewed LEO not GO: ${cev.flags.map((f) => f.text).join('; ')}`);
applyPlanningCommand(state, data, { cmd: 'COMMIT_MISSION', missionId: crewed.id });
ok(!parkLab(state, data, crewed), 'crewed park');
const crewShip = shipById(state, crewed.vehicleIds[0]);
ok(crewShip.crew >= 2, 'crewed hull carries people');
ok((state.earth.labs || []).some((l) => l.shipId === crewShip.id && l.crew > 0), 'lab attached to hull');

const cargo = draftMission(state);
cargo.id = 'm_resupply';
cargo.type = 'CARGO';
cargo.manifest = [
  { cargoId: 'food_pallet', qty: 3 },
  { cargoId: 'water_pallet', qty: 2 },
  { cargoId: 'eclss_pack', qty: 1 },
];
state.missions.planned.unshift(cargo);
applyPlanningCommand(state, data, { cmd: 'COMMIT_MISSION', missionId: cargo.id });
ok(!sendToLeo(state, data, cargo), 'resupply to LEO');
const cargoShip = shipById(state, cargo.vehicleIds[0]);
ok(!dock(state, cargoShip.id, crewShip.id), 'dock resupply');
const food0 = crewShip.stores.food;
ok(!transferStores(state, cargoShip.id, crewShip.id), 'auto transfer');
ok(crewShip.stores.food > food0, 'food moved onto the crewed stack');
ok((cargoShip.stores.food || 0) === 0, 'cargo bay emptied');
ok(!undock(state, cargoShip.id), 'undock cargo');
ok(!comeHome(state, cargoShip.id), 'send the cargo Starship home');

const restock = draftMission(state);
restock.id = 'm_auto';
restock.type = 'CARGO';
restock.manifest = [{ cargoId: 'food_pallet', qty: 2 }, { cargoId: 'water_pallet', qty: 1 }];
state.missions.planned.unshift(restock);
applyPlanningCommand(state, data, { cmd: 'COMMIT_MISSION', missionId: restock.id });
const lab = state.earth.labs.find((l) => l.shipId === crewShip.id);
lab.food = 10;
lab.water = 10;
ok(!restockLab(state, data, restock), 'schedule restock shortcut');
ok(crewShip.stores.food > 10, 'autonomous restock filled the lab ship');
const restockShip = shipById(state, restock.vehicleIds[0]);
ok(restockShip.location === 'leo', 'resupply hull stays in LEO to be sent home');
ok(!restockShip.dockedWith, 'shortcut undocks so you can send it home');

const cmdErr = applyFleetCommand(state, data, { cmd: 'COME_HOME', shipId: restockShip.id });
ok(cmdErr === null, `COME_HOME command: ${cmdErr}`);

const pipe = createPipeline();
pipe.tick(state);
ok(restockShip.location === 'pad', 'pipeline tick recovers the cargo hull');

const ids = state.vehicles.fleet.map((s) => s.id);
ok(new Set(ids).size === ids.length, 'fleet ids unique');
ok(state.vehicles.fleet.length >= 3, 'paid hulls persist');

console.log('smoke-fleet ok', {
  fleet: state.vehicles.fleet.map((s) => `${s.name}:${s.location}:f${s.flights}`),
  labs: (state.earth.labs || []).map((l) => `${l.id}:${l.crew}c`),
  counts: countFleet(state),
});
