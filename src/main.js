import { createEventBus } from './core/eventbus.js';
import { MSG } from './core/protocol.js';
import { createInitialState } from './core/state.js';
import { generateSeed } from './core/rng.js';
import { interpolateClock, formatEarthDate } from './core/clock.js';
import { SPEEDS } from './core/constants.js';
import { saveGame, loadGame, listSaves } from './core/save.js';
import { loadData, applyDataToState } from './core/loader.js';
import { mountShell } from './ui/shell.js';
import { mountBoot } from './ui/boot.js';
import { bindTerminals } from './ui/terminals.js';

const SLOT_AUTOSAVE = 'autosave';
const LAST_SLOT_KEY = 'mars.lastSlot';

const bus = createEventBus();
const worker = new Worker(new URL('./sim/worker.js', import.meta.url), { type: 'module' });

const ui = mountShell(document.getElementById('app'), { bus });

let data = null;
let experience = null;
let lastSnapshot = null;
let receivedAt = 0;
let lastNonZeroSpeed = SPEEDS.X1;
let waitingSave = false;
let worldOn = false;
const devFlight = new URLSearchParams(location.search).get('flight');
let devFlightSent = false;

bindTerminals(document.getElementById('app'), {
  bus,
  getData: () => data,
  getState: () => lastSnapshot,
});

function viewFrom(snapshot, now) {
  if (!snapshot) return null;
  const speed = snapshot.clock.speed;
  if (speed <= 0) return snapshot;
  const elapsed = Math.max(0, (now - receivedAt) / 1000);
  return { ...snapshot, clock: interpolateClock(snapshot.clock, elapsed * speed) };
}

function applySnapshot(payload) {
  lastSnapshot = payload.state;
  receivedAt = performance.now();
  if (lastSnapshot.clock.speed > 0) lastNonZeroSpeed = lastSnapshot.clock.speed;
  ui.render(lastSnapshot);
  bus.emit('snapshot', lastSnapshot);
  if (waitingSave) {
    waitingSave = false;
    persist(SLOT_AUTOSAVE, lastSnapshot);
  }
  if (devFlight && !devFlightSent && lastSnapshot) {
    devFlightSent = true;
    worker.postMessage({ type: MSG.COMMAND, payload: { cmd: 'DEV_PREP_FLIGHT', kind: devFlight } });
  }
}

async function persist(slotId, state) {
  try {
    const info = await saveGame(slotId, state);
    localStorage.setItem(LAST_SLOT_KEY, slotId);
    ui.setSaveStatus(`SAVED ${(info.bytes / 1024).toFixed(1)} KB`);
  } catch (err) {
    ui.setSaveStatus('SAVE FAILED');
    console.error(err);
  }
}

function siteOf(state) {
  const id = state?.experience?.siteId ?? data.balance.experience.defaultSite;
  return data.sites.find((s) => s.id === id) ?? data.sites[0];
}

async function ensureExperience() {
  if (experience) return experience;
  const { createExperience } = await import('./render/experience.js');
  experience = await createExperience(ui.flight.canvas, {
    bus,
    balance: data.balance,
    getState: () => lastSnapshot,
    getSite: () => siteOf(lastSnapshot),
    getData: () => data,
  });
  return experience;
}

function initWith(state) {
  lastSnapshot = null;
  applyDataToState(state, data);
  worker.postMessage({ type: MSG.INIT, payload: { state } });
}

async function startWorld() {
  ui.showView('world');
}

async function newProgram() {
  const ok = window.confirm('Open a new program? Unsaved site progress will be lost.');
  if (!ok) return;
  experience?.stop();
  experience = null;
  mountBoot(document.getElementById('app'), {
    data,
    onPick: (difficulty) => {
      const state = createInitialState(generateSeed(), difficulty);
      state.meta.createdAt = Date.now();
      initWith(state);
      ui.setSaveStatus('UNSAVED');
      startWorld();
    },
  });
}

async function continueOrNew() {
  const last = localStorage.getItem(LAST_SLOT_KEY);
  if (last) {
    try {
      const state = await loadGame(last);
      initWith(state);
      ui.setSaveStatus('LOADED');
      startWorld();
      return;
    } catch {
      /* new */
    }
  }
  mountBoot(document.getElementById('app'), {
    data,
    onPick: (difficulty) => {
      const state = createInitialState(generateSeed(), difficulty);
      state.meta.createdAt = Date.now();
      initWith(state);
      startWorld();
    },
  });
}

worker.onmessage = (event) => {
  const { type, payload } = event.data ?? {};
  if (type === MSG.SNAPSHOT) applySnapshot(payload);
  else if (type === MSG.ERROR) console.error('sim worker', payload);
};

bus.on('ui:speed', (speed) => {
  if (worldOn) {
    if (speed > 0) bus.emit('flight:rate', speed);
    return;
  }
  worker.postMessage({ type: MSG.SET_SPEED, payload: { speed } });
});
bus.on('ui:toggle-pause', () => {
  if (worldOn) {
    bus.emit('flight:pause');
    return;
  }
  const speed = lastSnapshot?.clock.speed ?? 0;
  worker.postMessage({
    type: MSG.SET_SPEED,
    payload: { speed: speed > 0 ? SPEEDS.PAUSE : lastNonZeroSpeed },
  });
});
bus.on('flight:leo-done', () => {
  worker.postMessage({ type: MSG.SET_SPEED, payload: { speed: lastNonZeroSpeed || SPEEDS.X1 } });
  bus.emit('world:return-mc');
});
bus.on('ui:skip', () => worker.postMessage({ type: MSG.SKIP_TO_EVENT }));
bus.on('ui:save', () => {
  if (!lastSnapshot) return;
  waitingSave = true;
  worker.postMessage({ type: MSG.REQUEST_SNAPSHOT, payload: { reason: 'save' } });
});
bus.on('ui:new', () => newProgram());
bus.on('plan:cmd', (payload) => {
  worker.postMessage({ type: MSG.COMMAND, payload });
});

bus.on('world:canvas', (el) => {
  if (ui.flight) ui.flight.canvas = el;
});

bus.on('ui:view', async (id) => {
  if (id === 'world') {
    worldOn = true;
    worker.postMessage({ type: MSG.SET_SPEED, payload: { speed: SPEEDS.PAUSE } });
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const exp = await ensureExperience();
      await exp.start();
      requestAnimationFrame(() => exp.resize());
    } catch (err) {
      console.error('world start', err);
      bus.emit('flight:telemetry', {
        phase: 'office',
        title: 'SITE FAULT',
        call: err.message,
        prompt: 'Check console',
        alt: 0,
        vel: 0,
        mach: 0,
        stage: 'ERROR',
        site: null,
      });
    }
  } else if (worldOn) {
    worldOn = false;
    experience?.stop();
    worker.postMessage({ type: MSG.SET_SPEED, payload: { speed: lastNonZeroSpeed || SPEEDS.X1 } });
  }
});

bus.on('flight:landed', ({ siteId, shipHealth }) => {
  worker.postMessage({ type: MSG.COMMAND, payload: { cmd: 'CREW_LANDED', siteId, shipHealth } });
});
bus.on('flight:milestone', (payload) => {
  worker.postMessage({ type: MSG.COMMAND, payload: { cmd: 'AWARD_RP', ...payload } });
});

bus.on('ui:load', async () => {
  const saves = await listSaves();
  if (saves.length === 0) {
    ui.openModal('SAVES', '<p class="fine">No records in IndexedDB.</p>');
    return;
  }
  const rows = saves
    .map(
      (s) =>
        `<button type="button" class="save-row" data-slot="${s.id}">
          <strong>${s.id}</strong>
          <span>${formatEarthDate(s.earthDay)} · tick ${s.tickCount}</span>
          <span>${new Date(s.savedAt).toISOString().slice(0, 19)}Z · ${(s.bytes / 1024).toFixed(1)} KB</span>
        </button>`,
    )
    .join('');
  ui.openModal('SAVES', rows);
  document.querySelector('[data-modal-body]').onclick = async (e) => {
    const btn = e.target.closest('[data-slot]');
    if (!btn) return;
    const state = await loadGame(btn.dataset.slot);
    localStorage.setItem(LAST_SLOT_KEY, btn.dataset.slot);
    initWith(state);
    ui.setSaveStatus('LOADED');
    ui.closeModal();
    startWorld();
  };
});

function frame(now) {
  if (lastSnapshot && lastSnapshot.clock.speed > 0 && !worldOn) {
    ui.render(viewFrom(lastSnapshot, now));
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

data = await loadData();
await continueOrNew();
