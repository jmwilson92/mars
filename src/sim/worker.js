import { MSG, PAUSE_REASON } from '../core/protocol.js';
import { bindRng, hasBlockingAlert, hasRedAlert, snapshotOf } from '../core/state.js';
import { SEVERITY, SPEEDS } from '../core/constants.js';
import { createPipeline } from './pipeline.js';
import { raiseAlert } from './alerts.js';
import { loadData } from '../core/loader.js';
import { applyPlanningCommand } from './planning.js';
import { applyLanding, tickBase } from './colony.js';
import { tickCrew } from './crew.js';
import { awardRp, parkLab, restockLab } from './research.js';
import { applyFleetCommand, markMars } from './fleet.js';

let data = null;

let state = null;
let pipeline = null;
let timer = null;
let lastTs = 0;
let carry = 0;
let skipping = false;

function post(type, payload) {
  self.postMessage({ type, payload });
}

function publish(reason = 'tick') {
  if (!state) return;
  const snap = snapshotOf(state);
  post(MSG.SNAPSHOT, { state: snap, reason });
}

function stopTimer() {
  if (timer != null) {
    clearTimeout(timer);
    timer = null;
  }
}

function pause(reason) {
  skipping = false;
  carry = 0;
  lastTs = 0;
  if (state) state.clock.speed = SPEEDS.PAUSE;
  stopTimer();
  publish(reason);
  post(MSG.PAUSED, { reason });
}

function afterTick() {
  if (!state) return false;
  if (hasRedAlert(state)) {
    pause(PAUSE_REASON.RED_ALERT);
    return true;
  }
  return false;
}

function tickOnce() {
  pipeline.tick(state);
  return afterTick();
}

function batchSize(speed) {
  if (speed >= SPEEDS.X30) return 30;
  if (speed >= SPEEDS.X10) return 7;
  return Math.max(1, speed);
}

function slice() {
  timer = null;
  if (!state) return;

  if (skipping) {
    const cap = 400;
    for (let i = 0; i < cap; i++) {
      const halted = tickOnce();
      if (halted) return;
      if (state.clock.windowJustOpened || hasBlockingAlert(state)) {
        pause(PAUSE_REASON.EVENT);
        return;
      }
    }
    publish('skip');
    timer = setTimeout(slice, 0);
    return;
  }

  const speed = state.clock.speed;
  if (speed <= 0) return;

  const now = Date.now();
  if (!lastTs) lastTs = now;
  carry += now - lastTs;
  lastTs = now;

  const msPerTick = 1000 / speed;
  const max = batchSize(speed);
  let n = 0;
  while (carry >= msPerTick && n < max) {
    const halted = tickOnce();
    carry -= msPerTick;
    n += 1;
    if (halted) return;
  }
  if (n > 0) publish('tick');
  if (state.clock.speed > 0) timer = setTimeout(slice, speed >= SPEEDS.X10 ? 0 : 16);
}

function run() {
  stopTimer();
  lastTs = 0;
  carry = 0;
  if (skipping || (state && state.clock.speed > 0)) timer = setTimeout(slice, 0);
}

self.onmessage = async (event) => {
  const { type, payload } = event.data ?? {};
  try {
    switch (type) {
      case MSG.INIT: {
        if (!data) data = await loadData();
        state = payload.state;
        bindRng(state);
        pipeline = createPipeline({
          colonists(s) { tickCrew(s, data); },
          isru(s) { tickBase(s, data); },
        });
        skipping = false;
        stopTimer();
        post(MSG.READY, { seed: state.meta.seed });
        publish('init');
        if (state.clock.speed > 0) run();
        break;
      }
      case MSG.SET_SPEED: {
        if (!state) return;
        skipping = false;
        state.clock.speed = payload.speed;
        if (state.clock.speed <= 0) pause(PAUSE_REASON.USER);
        else {
          publish('speed');
          run();
        }
        break;
      }
      case MSG.SET_TICK_UNIT: {
        if (!state) return;
        state.clock.tickUnit = payload.tickUnit;
        publish('unit');
        break;
      }
      case MSG.SKIP_TO_EVENT: {
        if (!state) return;
        skipping = true;
        state.clock.speed = SPEEDS.X30;
        run();
        break;
      }
      case MSG.REQUEST_SNAPSHOT: {
        publish(payload?.reason ?? 'request');
        break;
      }
      case MSG.COMMAND: {
        if (!state) return;
        if (payload?.cmd === 'AWARD_RP') {
          awardRp(state, payload.key, payload.amount | 0, payload.label);
          publish('rp');
        } else if (payload?.cmd === 'PARK_LEO') {
          const flown = state.missions.planned.find((m) => m.id === payload.missionId)
            ?? state.missions.planned.find((m) => m.status === 'go');
          const err = parkLab(state, data, flown);
          if (err) {
            raiseAlert(state, {
              id: `leo_${state.clock.tickCount}`,
              severity: SEVERITY.AMBER,
              system: 'research',
              title: 'LEO LAB REJECTED',
              body: err,
            });
          }
          publish('leo');
        } else if (payload?.cmd === 'RESTOCK_LAB') {
          const flown = state.missions.planned.find((m) => m.id === payload.missionId)
            ?? state.missions.planned.find((m) => m.status === 'go');
          const err = restockLab(state, data, flown);
          if (err) {
            raiseAlert(state, {
              id: `restock_${state.clock.tickCount}`,
              severity: SEVERITY.AMBER,
              system: 'research',
              title: 'RESTOCK REJECTED',
              body: err,
            });
          }
          publish('leo');
        } else if (payload?.cmd === 'CREW_LANDED') {
          state.mars.site = payload.siteId;
          state.experience.landed = true;
          state.experience.phase = 'mars_surface';
          state.clock.tickUnit = 'sol';
          const flown = state.missions.planned.find((m) => m.status === 'go');
          if (flown) {
            applyLanding(state, data, flown, { shipHealth: payload.shipHealth });
            markMars(state, flown);
            flown.status = 'completed';
            const sci = flown.manifest.find((l) => l.cargoId === 'science_pack');
            if (sci) {
              state.earth.budget.remaining += 80000000 * sci.qty;
              state.earth.research.points += 40 * sci.qty;
              state.earth.politics.support = Math.min(100, state.earth.politics.support + 4 * sci.qty);
            }
            if (flown.type === 'CREWED') state.earth.politics.support = Math.min(100, state.earth.politics.support + 25);
            else state.earth.politics.support = Math.min(100, state.earth.politics.support + 6);
          }
          if (payload.crewLost && flown?.type === 'CREWED') {
            for (const c of state.colonists.living) {
              if (c.kind === 'human') c.health = 0;
            }
            state.colonists.dead.push(...state.colonists.living.filter((c) => c.kind === 'human' && c.health <= 0));
            state.colonists.living = state.colonists.living.filter((c) => c.health > 0);
            state.earth.politics.support = Math.max(0, state.earth.politics.support - 30);
            raiseAlert(state, {
              id: 'unbelted_edl',
              severity: SEVERITY.RED,
              system: 'trajectory',
              title: 'CREW LOST — UNBELTED ENTRY',
              body: 'They were not strapped in for EDL. The ship is down. The people are not.',
            });
          } else {
            raiseAlert(state, {
              id: 'first_boots',
              severity: SEVERITY.GREEN,
              system: 'trajectory',
              title: flown?.type === 'CREWED' ? 'FIRST BOOTS' : 'LANDING CONFIRMED',
              body: `Touchdown at ${payload.siteId}. Science return posts to the appropriation. Unpack what you manifested.`,
            });
          }
          publish('landed');
        } else if (data) {
          const fleetErr = applyFleetCommand(state, data, payload);
          if (fleetErr !== undefined) {
            if (fleetErr) {
              raiseAlert(state, {
                id: `fleet_${state.clock.tickCount}`,
                severity: SEVERITY.AMBER,
                system: 'trajectory',
                title: 'FLEET',
                body: fleetErr,
              });
            } else if (payload.cmd === 'SEND_LEO') {
              applyPlanningCommand(state, data, { cmd: 'ENSURE_DRAFT' });
            }
            publish('fleet');
          } else {
            applyPlanningCommand(state, data, payload);
            publish('cmd');
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    post(MSG.ERROR, { message: err.message, stack: err.stack });
  }
};
