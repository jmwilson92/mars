import { MISSION_TYPES } from '../core/constants.js';
import { setCrewRole, setCrewTask, spawnManifestPeople } from './crew.js';
import { gatherNode, placeModule } from './colony.js';
import { applyLeg, assignOnCommit, takeBooster } from './fleet.js';

export function cargoById(data, id) {
  return data.cargo.find((c) => c.id === id);
}

export function techById(data, id) {
  return data.tech.find((t) => t.id === id);
}

export function isUnlocked(state, data, cargoId) {
  const item = cargoById(data, cargoId);
  if (!item) return false;
  if (!item.techRequired) return true;
  return state.earth.research.completed.includes(item.techRequired);
}

export function missionMass(data, mission) {
  return mission.manifest.reduce((s, line) => {
    const item = cargoById(data, line.cargoId);
    return s + (item ? item.mass_kg * line.qty : 0);
  }, 0);
}

export function missionVolume(data, mission) {
  return mission.manifest.reduce((s, line) => {
    const item = cargoById(data, line.cargoId);
    return s + (item ? item.volume_m3 * line.qty : 0);
  }, 0);
}

export function missionHardwareCost(data, mission) {
  return mission.manifest.reduce((s, line) => {
    const item = cargoById(data, line.cargoId);
    return s + (item ? item.cost * line.qty : 0);
  }, 0);
}

export function missionLaunchCost(data, mission, state) {
  const n = mission.ships || 1;
  const full = data.balance.economy.starshipLaunch_usd;
  const refuel = data.balance.economy.boosterRefuel_usd ?? Math.round(full * 0.06);
  const pad = (state?.vehicles?.boosters || []).filter((b) => b.location === 'pad').length;
  let cost = 0;
  for (let i = 0; i < n; i++) cost += i < pad ? refuel : full;
  return cost;
}

export function missionTotalCost(data, mission, state) {
  return missionLaunchCost(data, mission, state) + missionHardwareCost(data, mission);
}

export function debit(state, amount, label, kind) {
  state.earth.budget.remaining -= amount;
  if (!state.earth.budget.ledger) state.earth.budget.ledger = [];
  state.earth.budget.ledger.push({ kind, amount, label });
}

export function qtyOf(mission, cargoId) {
  return mission.manifest.find((l) => l.cargoId === cargoId)?.qty || 0;
}

export function crewCount(data, mission) {
  return mission.manifest.reduce((s, line) => {
    const item = cargoById(data, line.cargoId);
    return s + (item?.crew ? item.crew * line.qty : 0);
  }, 0);
}

export function robotCount(data, mission) {
  return mission.manifest.reduce((s, line) => {
    const item = cargoById(data, line.cargoId);
    return s + (item?.category === 'robot' ? line.qty : 0);
  }, 0);
}

export function lifeSupportSeats(data, mission) {
  return mission.manifest.reduce((s, line) => {
    const item = cargoById(data, line.cargoId);
    return s + (item?.crewSupported ? item.crewSupported * line.qty : 0);
  }, 0);
}

export function evaluateMission(state, data, mission) {
  const flags = [];
  const mass = missionMass(data, mission);
  const vol = missionVolume(data, mission);
  const cost = missionTotalCost(data, mission, state);
  const seated = crewCount(data, mission);
  const robots = robotCount(data, mission);
  const robotic = mission.type === MISSION_TYPES.ROBOTIC;
  const crew = robotic ? 0 : seated;
  const ls = lifeSupportSeats(data, mission);
  const payKg = data.balance.economy.starshipPayload_kg * (mission.ships || 1);
  const payM3 = data.balance.economy.starshipPayload_m3 * (mission.ships || 1);

  if (mass > payKg) {
    flags.push({
      sev: 'red',
      text: `OVERBURDENED — ${Math.round(mass - payKg)} kg over the ${payKg} kg payload. Dump cargo or add a stack.`,
    });
  }
  if (vol > payM3) {
    flags.push({
      sev: 'red',
      text: `NO VOLUME LEFT — ${vol.toFixed(0)} m³ in a ${payM3} m³ bay.`,
    });
  }
  if (cost > state.earth.budget.remaining) flags.push({ sev: 'red', text: 'Insufficient remaining appropriation.' });
  if (mission.type === MISSION_TYPES.CREWED && !state.earth.research.completed.includes('crewed_rating')) {
    flags.push({ sev: 'red', text: 'Crewed rating not unlocked.' });
  }
  if (robotic && !state.earth.research.completed.includes('optimus_deployment')) {
    flags.push({ sev: 'red', text: 'Optimus deployment not unlocked.' });
  }
  if (robotic && robots < 1) flags.push({ sev: 'red', text: 'Robotic flight has no Optimus units.' });
  if (mission.type === MISSION_TYPES.CREWED && crew < 1) flags.push({ sev: 'red', text: 'Crewed flight has no seats.' });
  if (!robotic && crew > 0 && ls < crew) flags.push({ sev: 'red', text: `ECLSS seats ${ls} < crew ${crew}.` });
  if (!robotic && crew > 0) {
    const foodKg = qtyOf(mission, 'food_pallet') * 1000;
    const garden = qtyOf(mission, 'greenhouse_kit');
    const foodNeed = crew * (data.balance.human.foodDry_kg_per_sol || 1.8) * 210;
    const foodHave = foodKg + garden * 380;
    if (foodHave < foodNeed) {
      flags.push({
        sev: foodHave < foodNeed * 0.45 ? 'red' : 'amber',
        text: `Food ${Math.round(foodHave)} kg vs ${Math.round(foodNeed)} kg for ${crew} people × 210 d. Ship gardens offset some. Mars gardens refill after landing.`,
      });
    }
    const waterKg = qtyOf(mission, 'water_pallet') * 1000;
    const recyc = qtyOf(mission, 'water_recycler') + (qtyOf(mission, 'eclss_pack') > 0 ? 1 : 0);
    const waterNeed = crew * (data.balance.human.waterDrink_kg_per_sol || 3.5) * 210;
    const waterHave = waterKg + (recyc ? waterNeed * 0.88 : 0);
    if (waterHave < waterNeed) {
      flags.push({
        sev: 'amber',
        text: 'Water short for transit. Pack a recycler or water pallets. Ice harvesting is after you land.',
      });
    }
    if (qtyOf(mission, 'moxie_unit') < 1) {
      flags.push({ sev: 'amber', text: 'No MOXIE. Cabin air is ECLSS only until you land.' });
    }
  }
  if (!mission.manifest.some((l) => l.cargoId === 'spares_pallet')) {
    flags.push({ sev: 'amber', text: 'No spares. Projected shortfall is a later funeral.' });
  }
  if (mission.type === MISSION_TYPES.CARGO && crew === 0 && robots === 0) {
    flags.push({ sev: 'green', text: 'Deadhead cargo. Someone has to unpack it on the other side.' });
  }

  const go = !flags.some((f) => f.sev === 'red');
  let consumables = null;
  if (!robotic && crew > 0) {
    const foodKg = qtyOf(mission, 'food_pallet') * 1000;
    const garden = qtyOf(mission, 'greenhouse_kit');
    const foodNeed = crew * (data.balance.human.foodDry_kg_per_sol || 1.8) * 210;
    const waterKg = qtyOf(mission, 'water_pallet') * 1000;
    const recyc = qtyOf(mission, 'water_recycler') + (qtyOf(mission, 'eclss_pack') > 0 ? 1 : 0);
    const waterNeed = crew * (data.balance.human.waterDrink_kg_per_sol || 3.5) * 210;
    consumables = {
      foodHave: foodKg + garden * 380,
      foodNeed,
      waterHave: waterKg + (recyc ? waterNeed * 0.88 : 0),
      waterNeed,
      airSeats: ls,
      airNeed: crew,
    };
  }
  return { mass, vol, cost, crew, robots, ls, payKg, payM3, flags, go, consumables };
}

export function draftMission(state) {
  const n = state.missions.planned.length + 1;
  return {
    id: `m_${String(n).padStart(3, '0')}`,
    type: MISSION_TYPES.CARGO,
    vehicle: 'starship',
    siteId: state.experience.siteId || 'jezero_north',
    ships: 1,
    dest: 'leo',
    manifest: [
      { cargoId: 'hab_landed', qty: 1 },
      { cargoId: 'solar_100m2', qty: 4 },
      { cargoId: 'battery_bank', qty: 2 },
      { cargoId: 'eclss_pack', qty: 1 },
      { cargoId: 'spares_pallet', qty: 2 },
      { cargoId: 'food_pallet', qty: 2 },
    ],
    status: 'draft',
  };
}

export function activeDraft(state) {
  return state.missions.planned.find((m) => m.status === 'draft')
    ?? state.missions.planned.find((m) => m.status === 'go')
    ?? null;
}

export function applyPlanningCommand(state, data, payload) {
  const cmd = payload.cmd;
  if (cmd === 'SET_DIFFICULTY') {
    state.meta.difficulty = payload.difficulty;
    const annual = data.balance.economy.startingAnnual[payload.difficulty]
      ?? data.balance.economy.startingAnnual.ADMINISTRATOR;
    state.earth.budget.annual = annual;
    state.earth.budget.remaining = annual;
    return;
  }
  if (cmd === 'SET_SITE') {
    state.experience.siteId = payload.siteId;
    const draft = activeDraft(state);
    if (draft && draft.status === 'draft') draft.siteId = payload.siteId;
    return;
  }
  if (cmd === 'ENSURE_DRAFT') {
    if (!state.missions.planned.some((m) => m.status === 'draft')) {
      state.missions.planned.push(draftMission(state));
    }
    return;
  }
  const mission = state.missions.planned.find((m) => m.id === payload.missionId) ?? activeDraft(state);
  if (cmd === 'SET_DEST' && mission && mission.status === 'draft') {
    mission.dest = payload.dest === 'mars' ? 'mars' : 'leo';
    return;
  }
  if (cmd === 'SET_MISSION_TYPE' && mission && mission.status === 'draft') {
    mission.type = payload.missionType;
    if (payload.missionType === MISSION_TYPES.CREWED && !mission.manifest.some((l) => l.cargoId === 'crew_seat')) {
      mission.manifest.push({ cargoId: 'crew_seat', qty: 4 });
    }
    if (payload.missionType === MISSION_TYPES.ROBOTIC) {
      mission.manifest = mission.manifest.filter((l) => l.cargoId !== 'crew_seat');
      if (!mission.manifest.some((l) => l.cargoId === 'optimus_unit')) {
        mission.manifest.push({ cargoId: 'optimus_unit', qty: 2 });
      }
    }
    return;
  }
  if (cmd === 'SET_LEG' && mission) {
    applyLeg(state, mission, payload.leg);
    return;
  }
  if (cmd === 'SET_SHIPS' && mission && mission.status === 'draft') {
    mission.ships = Math.max(1, Math.min(6, payload.ships | 0));
    return;
  }
  if (cmd === 'ADD_CARGO' && mission && (mission.status === 'draft' || mission.status === 'go')) {
    if (!isUnlocked(state, data, payload.cargoId)) return;
    const item = cargoById(data, payload.cargoId);
    const qty = payload.qty ?? 1;
    if (mission.status === 'go') {
      const extra = item ? item.cost * qty : 0;
      if (extra > state.earth.budget.remaining) return;
      if (extra) debit(state, extra, `Add ${item.name} to ${mission.id}`, 'mission');
    }
    const line = mission.manifest.find((l) => l.cargoId === payload.cargoId);
    if (line) line.qty += qty;
    else mission.manifest.push({ cargoId: payload.cargoId, qty });
    return;
  }
  if (cmd === 'REMOVE_CARGO' && mission && (mission.status === 'draft' || mission.status === 'go')) {
    const line = mission.manifest.find((l) => l.cargoId === payload.cargoId);
    if (!line) return;
    const item = cargoById(data, payload.cargoId);
    const qty = Math.min(line.qty, payload.qty ?? 1);
    if (mission.status === 'go' && item) {
      state.earth.budget.remaining += item.cost * qty;
    }
    line.qty -= qty;
    if (line.qty <= 0) mission.manifest = mission.manifest.filter((l) => l.cargoId !== payload.cargoId);
    return;
  }
  if (cmd === 'COMMIT_MISSION' && mission && mission.status === 'draft') {
    const ev = evaluateMission(state, data, mission);
    if (!ev.go) return;
    debit(state, ev.cost, `Launch ${mission.id}`, 'mission');
    mission.status = 'go';
    mission.committedCost = ev.cost;
    assignOnCommit(state, data, mission);
    for (let i = 0; i < (mission.ships || 1); i++) takeBooster(state);
    if (mission.type !== MISSION_TYPES.CARGO) {
      spawnManifestPeople(state, data, mission, mission.vehicleIds?.[0]);
    }
    return;
  }
  if (cmd === 'START_RESEARCH') {
    const tech = techById(data, payload.techId);
    if (!tech || tech.startCompleted) return;
    if (state.earth.research.completed.includes(tech.id)) return;
    if (state.earth.research.active) return;
    if ((tech.prereqs || []).some((p) => !state.earth.research.completed.includes(p))) return;
    const buy = tech.cost_usd ?? 0;
    if (buy > state.earth.budget.remaining) return;
    if ((state.earth.research.points ?? 0) < tech.cost_rp) return;
    debit(state, buy, `Research ${tech.name}`, 'research');
    state.earth.research.points -= tech.cost_rp;
    // Calendar floor still applies later. Money bought the slot; duration is the remaining enemy.
    state.earth.research.active = {
      id: tech.id,
      progress: 0,
      durationDays: Math.ceil(tech.minDuration_days * 0.6),
    };
    return;
  }
  if (cmd === 'SET_CREW_ROLE') {
    setCrewRole(state, data, payload.colonistId, payload.roleId);
    return;
  }
  if (cmd === 'SET_CREW_TASK') {
    setCrewTask(state, data, payload.colonistId, payload.taskId);
    return;
  }
  if (cmd === 'PLACE_MODULE') {
    placeModule(state, data, payload.typeId, payload.x, payload.z);
    return;
  }
  if (cmd === 'GATHER') {
    gatherNode(state, payload.nodeId);
    return;
  }
  if (cmd === 'DEV_PREP_FLIGHT') {
    prepDevFlight(state, data, payload.kind);
    return;
  }
}

function prepDevFlight(state, data, kind) {
  for (const t of data.tech) {
    if (!state.earth.research.completed.includes(t.id)) state.earth.research.completed.push(t.id);
  }
  state.earth.budget.remaining = Math.max(state.earth.budget.remaining, 5e9);
  const m = draftMission(state);
  m.id = 'm_dev';
  m.type = kind === 'robot' || kind === 'ROBOTIC' ? MISSION_TYPES.ROBOTIC
    : kind === 'cargo' || kind === 'CARGO' ? MISSION_TYPES.CARGO
      : MISSION_TYPES.CREWED;
  if (m.type === MISSION_TYPES.CREWED && !m.manifest.some((l) => l.cargoId === 'crew_seat')) {
    m.manifest.push({ cargoId: 'crew_seat', qty: 4 });
  }
  if (m.type === MISSION_TYPES.ROBOTIC && !m.manifest.some((l) => l.cargoId === 'optimus_unit')) {
    m.manifest.push({ cargoId: 'optimus_unit', qty: 3 });
  }
  const ev = evaluateMission(state, data, m);
  if (!ev.go) return;
  debit(state, ev.cost, `Launch ${m.id}`, 'mission');
  m.status = 'go';
  m.committedCost = ev.cost;
  assignOnCommit(state, data, m);
  for (let i = 0; i < (m.ships || 1); i++) takeBooster(state);
  if (m.type !== MISSION_TYPES.CARGO) spawnManifestPeople(state, data, m, m.vehicleIds?.[0]);
  state.missions.planned = [m, ...state.missions.planned.filter((x) => x.id !== m.id)];
}

export function tickResearch(state) {
  const active = state.earth.research.active;
  if (!active) return;
  active.progress += 1;
  if (active.progress >= active.durationDays) {
    state.earth.research.completed.push(active.id);
    state.earth.research.active = null;
  }
}
