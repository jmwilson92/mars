import { qtyOf, evaluateMission, crewCount, robotCount, draftMission } from './planning.js';
import { MISSION_TYPES } from '../core/constants.js';
import { raiseAlert } from './alerts.js';
import { SEVERITY } from '../core/constants.js';
import {
  arriveLeo,
  assignOnCommit,
  dock,
  pushLabFromTick,
  sendToLeo,
  shipById,
  shipsForMission,
  transferStores,
  undock,
} from './fleet.js';

export function awardRp(state, key, amount, label) {
  if (!amount) return false;
  if (!state.earth.research.milestones) state.earth.research.milestones = [];
  if (state.earth.research.milestones.includes(key)) return false;
  state.earth.research.milestones.push(key);
  state.earth.research.points = (state.earth.research.points || 0) + amount;
  if (label) {
    raiseAlert(state, {
      id: `rp_${key}`,
      severity: SEVERITY.GREEN,
      system: 'research',
      title: `+${amount} RP  ·  ${label}`,
      body: 'Flight data posted to the research account. You cannot buy this. You fly it.',
    });
  }
  return true;
}

export function parkLab(state, data, mission) {
  if (!mission || mission.status !== 'go') return 'Commit and pay a stack first.';
  if (mission.type === MISSION_TYPES.CARGO) {
    return 'Cargo does not park as a lab. Put Optimus on a ROBOTIC stack.';
  }
  const robots = robotCount(data, mission);
  const crew = mission.type === MISSION_TYPES.ROBOTIC ? 0 : crewCount(data, mission);
  if (robots < 1) return 'A LEO lab needs at least one Optimus.';
  const ev = evaluateMission(state, data, mission);
  if (ev.flags.some((f) => f.sev === 'red')) return 'Red flags. Fix the stack.';

  let food = 0;
  let water = 0;
  let airDays = 0;
  if (crew > 0) {
    food = qtyOf(mission, 'food_pallet') * 1000;
    water = qtyOf(mission, 'water_pallet') * 1000 + qtyOf(mission, 'water_recycler') * 400;
    airDays = qtyOf(mission, 'eclss_pack') * 360;
    if (food < 400 || water < 200 || airDays < 40) {
      return 'Humans in LEO need food, water, and an ECLSS pack. Optimus-only does not.';
    }
  }

  if (!mission.vehicleIds?.length) assignOnCommit(state, data, mission);
  mission.status = 'leo';
  arriveLeo(state, mission);
  const hull = shipsForMission(state, mission.id)[0];
  if (hull) {
    hull.stores.food = food;
    hull.stores.water = water;
    hull.stores.airDays = airDays;
    hull.crew = crew;
    hull.robots = robots;
  }
  if (!state.earth.labs) state.earth.labs = [];
  state.earth.labs.push({
    id: `lab_${mission.id}`,
    missionId: mission.id,
    shipId: hull?.id || null,
    robots,
    crew,
    food,
    water,
    airDays,
    rpPerDay: crew > 0 ? 4 : 3,
    offline: false,
  });
  if (!state.missions.planned.some((m) => m.status === 'draft')) {
    state.missions.planned.push(draftMission(state));
  }
  return null;
}

export function restockLab(state, data, mission) {
  const lab = (state.earth.labs || []).find((l) => (l.crew || 0) > 0 && (l.offline || l.food < 800 || l.water < 400 || l.airDays < 60));
  if (!lab) return 'No crewed lab needs a tanker. Optimus labs do not eat.';
  if (!mission || mission.status !== 'go') return 'Commit a resupply stack first.';
  const err = sendToLeo(state, data, mission);
  if (err) return err;
  const cargo = shipsForMission(state, mission.id)[0];
  const dest = (lab.shipId && shipById(state, lab.shipId)) || shipsForMission(state, lab.missionId)[0];
  if (cargo && dest) {
    dock(state, cargo.id, dest.id);
    transferStores(state, cargo.id, dest.id);
    undock(state, cargo.id);
  } else {
    lab.food += qtyOf(mission, 'food_pallet') * 1000;
    lab.water += qtyOf(mission, 'water_pallet') * 1000 + qtyOf(mission, 'water_recycler') * 400;
    lab.airDays += qtyOf(mission, 'eclss_pack') * 360;
    if (lab.food > 0 && lab.water > 0 && lab.airDays > 0) lab.offline = false;
  }
  if (!state.missions.planned.some((m) => m.status === 'draft')) {
    state.missions.planned.push(draftMission(state));
  }
  return null;
}

export function tickLabs(state) {
  for (const lab of state.earth.labs || []) {
    if (lab.offline) continue;
    if ((lab.crew || 0) > 0) {
      const n = lab.crew;
      lab.food -= 1.8 * n;
      lab.water -= 3.5 * n;
      lab.airDays -= 1;
      if (lab.food <= 0 || lab.water <= 0 || lab.airDays <= 0) {
        lab.offline = true;
        lab.food = Math.max(0, lab.food);
        lab.water = Math.max(0, lab.water);
        lab.airDays = Math.max(0, lab.airDays);
        raiseAlert(state, {
          id: `lab_starve_${lab.id}`,
          severity: SEVERITY.AMBER,
          system: 'research',
          title: 'LEO LAB OFFLINE',
          body: 'Crew food, water, or air ran out. RP feed stopped. Optimus is fine; the humans are not.',
        });
        pushLabFromTick(state, lab);
        continue;
      }
    }
    state.earth.research.points += lab.rpPerDay || 3;
    pushLabFromTick(state, lab);
  }
}
