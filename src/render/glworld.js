import * as THREE from 'three';
import { loadTextures } from './textures.js';
import { createInput } from './input.js';
import { buildStarship } from './starship.js';
import { buildEarthPad } from './earthpad.js';
import { buildSpace } from './space.js';
import { buildMarsSurface } from './marssurface.js';
import { buildCabin } from './cabin.js';
import { buildBareCabin } from './ship/shipScene.js';
import { buildOptimus } from './optimus.js';
import { createMission } from './mission.js';
import { createMissionControl } from './mc/scene.js';
import { createMcController } from './mc/controller.js';
import { createRng } from '../core/rng.js';
import { formatEarthDate } from '../core/clock.js';
import { PHASE } from './phases.js';
import { sizeCanvas, createGlContext } from './webgl.js';
import { createMcAudio } from './mc/audio.js';

export function createGlWorld(canvas, { bus, balance, getState, getSite, getData }) {
  let renderer = null;
  let camera = null;
  const input = createInput(canvas);

  let tex = null;
  let mc = null;
  let mcCtrl = null;
  let earth = null;
  let space = null;
  let mars = null;
  let ship = null;
  let cabin = null;
  let optimus = null;
  let mission = null;
  let ready = false;
  let running = false;
  let last = 0;
  let phase = PHASE.OFFICE;
  let telem = { phase, title: 'PROGRAM CONTROL', call: 'Loading…', prompt: '', alt: 0, vel: 0, mach: 0, stage: '—' };
  let rumble = null;
  let terminalOpen = false;
  let usedE = false;
  let usedTab = false;
  let usedL = false;
  let watch = null;
  let pendingBoard = null;
  const audio = createMcAudio();
  const cfg = balance.experience;

  function emit() {
    telem = { ...telem, phase, site: getSite() };
    bus.emit('flight:telemetry', telem);
  }

  function resize() {
    if (!renderer || !camera) {
      sizeCanvas(canvas);
      return;
    }
    const { cssW, cssH } = sizeCanvas(canvas);
    renderer.setSize(cssW, cssH, false);
    camera.aspect = cssW / Math.max(1, cssH);
    camera.updateProjectionMatrix();
  }

  function bootRenderer() {
    if (renderer) return;
    sizeCanvas(canvas);
    const context = createGlContext(canvas);
    if (!context) throw new Error('Error creating WebGL context');
    renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      antialias: false,
      alpha: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
    });
    renderer.setClearColor(0x87a0b8, 1);
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    camera = new THREE.PerspectiveCamera(72, 1, 0.1, 90000);
    resize();
  }

  function startRumble() {
    if (rumble) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 42;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    rumble = { ctx, osc, gain };
  }
  function setRumble(amt) {
    if (!rumble) return;
    rumble.gain.gain.setTargetAtTime(amt * 0.045, rumble.ctx.currentTime, 0.05);
  }
  function stopRumble() {
    if (!rumble) return;
    rumble.osc.stop();
    rumble.ctx.close();
    rumble = null;
  }

  function goMission() {
    return getState()?.missions.planned.find((m) => m.status === 'go') ?? null;
  }

  function canBoard() {
    return Boolean(goMission());
  }

  function enterOffice() {
    phase = PHASE.OFFICE;
    if (camera.parent) camera.parent.remove(camera);
    const s = mc?.spawn || { x: 0, z: 0.9, y: 1.1, yaw: 0, pitch: -0.14 };
    mcCtrl?.setPose(s.x, s.z, s.y, s.yaw, s.pitch);
    renderer.setClearColor(0x0c0e12, 1);
    telem = { ...telem, hud: 'mc', phase: PHASE.OFFICE, prompt: '', target: false };
    emit();
  }

  function mile(name, amount) {
    if (!watch || watch.miles?.has(name)) return;
    if (!watch.miles) watch.miles = new Set();
    watch.miles.add(name);
    const mid = goMission()?.id || 'fly';
    bus.emit('flight:milestone', { key: `${mid}_${name}`, amount, label: name.toUpperCase() });
  }

  function beginWatch() {
    watch = { t: 0, lastBeep: -1, landed: false, miles: new Set() };
    mc.setEvent('launch');
    mcCtrl.sitFlight();
    audio.beep(520, 0.12, 0.14);
    audio.resume();
  }

  function tickWatch(dt) {
    watch.t += dt;
    const t = watch.t;
    mcCtrl.cinematic(t);
    const a0 = 10;
    const a1 = a0 + cfg.ascentSeconds;
    const a2 = a1 + cfg.transitSeconds;
    const a3 = a2 + cfg.edlSeconds;
    if (t < a0) {
      mc.setScreenMode('ascent', `T− ${(a0 - t).toFixed(1)}`);
      const b = Math.floor(t);
      if (b !== watch.lastBeep) {
        watch.lastBeep = b;
        audio.beep(b >= 9 ? 990 : 660);
      }
    } else if (t < a1) {
      const u = (t - a0) / cfg.ascentSeconds;
      if (u >= 0.02) mile('liftoff', 10);
      if (u >= 0.55) mile('maxq', 8);
      if (u >= 0.72) mile('meco', 25);
      if (u >= 0.95) mile('insertion', 15);
      mc.setScreenMode('ascent', u < 0.35 ? 'LIFTOFF' : u < 0.55 ? 'MAX-Q' : u < 0.78 ? 'MECO' : 'INSERTION');
    } else if (t < a2) {
      const u = (t - a1) / cfg.transitSeconds;
      if (u >= 0.02) mile('tmi', 15);
      mc.setScreenMode('transit', `COAST  DAY ${Math.round(u * 210)} / 210`);
    } else if (t < a3) {
      const u = (t - a2) / cfg.edlSeconds;
      mc.setScreenMode(
        'edl',
        u < 0.42 ? 'BELLY-FLOP' : u < 0.62 ? 'FLIP' : u < 0.85 ? 'LANDING BURN' : 'TOUCHDOWN',
      );
    } else if (t < a3 + 8) {
      if (!watch.landed) {
        watch.landed = true;
        mile('edl', 10);
        mile('landing', 20);
        mc.setEvent('land');
        mc.setScreenMode('idle', 'TOUCHDOWN CONFIRMED');
        bus.emit('flight:landed', { siteId: getSite()?.id });
        audio.beep(440, 0.2, 0.1);
      }
    } else {
      mc.setEvent('nominal');
      watch = null;
      mcCtrl.sitFlight();
    }
  }

  function beginLaunch() {
    const flown = goMission();
    if (!flown) return;
    bus.emit('plan:cmd', { cmd: 'SET_LEG', missionId: flown.id, leg: 'ascent' });
    const type = flown.type || 'CARGO';
    mission.begin(type);
    phase = mission.phase;
    audio.beep(520, 0.12, 0.14);
    audio.resume();
  }

  function onUse() {
    if (terminalOpen) return;
    if (phase !== PHASE.OFFICE) return;
    if (watch) return;
    const near = mcCtrl.nearest(mc.interactables);
    if (!near) return;
    if (near.id === 'program') {
      bus.emit('ui:view', 'program');
      return;
    }
    if (canBoard() && (near.label === 'FLIGHT' || near.id === 'orbit')) {
      beginLaunch();
      return;
    }
    bus.emit('world:interact', near.id === 'orbit' ? 'schedule' : near.id);
  }

  function tickOffice(dt) {
    if (input.down('Tab')) {
      if (!usedTab && !watch) mcCtrl.sitFlight();
      usedTab = true;
    } else usedTab = false;
    if (input.down('KeyM')) bus.emit('ui:view', 'program');
    if ((input.pulse('KeyL') || input.down('KeyL')) && canBoard() && !watch && phase === PHASE.OFFICE) {
      if (!usedL) beginLaunch();
      usedL = true;
    } else usedL = false;

    if (watch) tickWatch(dt);
    else if (!terminalOpen) {
      mcCtrl.update(dt);
      if (mcCtrl.moving && Math.random() < dt * 2.2) audio.step();
    } else input.consumeLook();
    if (!watch && Math.random() < dt * 1.4) audio.keys();
    mc.update(dt, renderer);
    const near = mcCtrl.nearest(mc.interactables);
    const go = canBoard();
    const launchSpot = near && (near.label === 'FLIGHT' || near.id === 'orbit');
    const st = getState();
    const kind = goMission()?.type;
    const goPrompt = kind === 'CREWED'
      ? '[E] BOARD STARSHIP'
      : kind === 'ROBOTIC'
        ? '[E] OPTIMUS VIEW'
        : '[E] GO FOR LAUNCH';
    telem = {
      hud: 'mc',
      phase: PHASE.OFFICE,
      prompt: watch
        ? ''
        : terminalOpen
          ? ''
          : go && launchSpot
            ? goPrompt
            : near
              ? near.prompt
              : '',
      target: Boolean(near) && !watch,
      earthDate: st ? formatEarthDate(st.clock.earthDay) : '—',
      sol: st ? Math.floor(st.clock.solOfYear) : '—',
      alertCount: st?.incidents?.active?.length || 0,
    };
  }

  function tick(dt, now) {
    if (phase === PHASE.OFFICE) {
      if (input.pulse('KeyE') || input.down('KeyE')) {
        if (!usedE) {
          usedE = true;
          onUse();
        }
      } else usedE = false;
      tickOffice(dt);
    } else if (mission) {
      telem = mission.tick(dt, now);
      phase = mission.phase;
    }
    emit();
  }

  function activeScene() {
    if (phase === PHASE.OFFICE) return mc.scene;
    return mission ? mission.activeScene() : mc.scene;
  }

  function frame(now) {
    if (!running) return;
    const t = now * 0.001;
    const dt = last ? Math.min(0.05, t - last) : 0.016;
    last = t;
    if (ready) {
      tick(dt, t);
      renderer.render(activeScene(), camera);
    }
    requestAnimationFrame(frame);
  }

  async function start() {
    if (!ready) {
      bootRenderer();
      try { tex = await loadTextures(); } catch (err) { console.error('textures', err); tex = null; }
      const roomRng = createRng(0x4d43544c).stream('room');
      try {
        mc = createMissionControl({ getState, rng: () => roomRng.next() });
      } catch (err) {
        console.error('mc', err);
        mc = { scene: new THREE.Scene(), collisions: [], interactables: [], spawn: { x: 0, z: 1, y: 1.1, yaw: 0, pitch: -0.1 }, update() {}, setEvent() {}, setScreenMode() {} };
        mc.scene.background = new THREE.Color(0x12161c);
        mc.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      }
      mcCtrl = createMcController(camera, input, mc.collisions || []);
      try { earth = buildEarthPad(tex); } catch (err) { console.error('earth', err); }
      try { space = buildSpace(tex); } catch (err) { console.error('space', err); }
      try { mars = buildMarsSurface(tex); } catch (err) { console.error('mars', err); }
      try { ship = buildStarship(tex); } catch (err) { console.error('ship', err); }
      try { cabin = buildCabin(tex); } catch (err) {
        console.error('cabin', err);
        cabin = buildBareCabin();
      }
      if (!cabin?.scene) cabin = buildBareCabin();
      try { optimus = buildOptimus(); } catch (err) { console.error('optimus', err); }
      try { if (earth?.scene && ship?.group) earth.scene.add(ship.group); } catch (err) { console.error(err); }
      try {
        mission = createMission({
          cfg, bus, input, camera, renderer, ship, earth, space, mars, cabin, optimus,
          getState, getSite, getData, startRumble, setRumble, stopRumble,
        });
      } catch (err) {
        console.error('mission', err);
      }
      ready = true;
      try {
        const st = getState();
        if (st?.experience?.landed && mission) {
          const last = st.missions.completed?.slice(-1)[0];
          mission.resumeSurface(last?.type || 'CREWED');
          phase = PHASE.MARS_SURFACE;
        } else if (pendingBoard && mission) {
          mission.enterLeo(pendingBoard.shipId, pendingBoard.view);
          phase = mission.phase;
          pendingBoard = null;
        } else if (new URLSearchParams(location.search).has('interior') && mission) {
          mission.enterLeo('preview', 'crew');
          phase = mission.phase;
        } else {
          enterOffice();
        }
      } catch (err) {
        console.error('enter', err);
        enterOffice();
      }
    }
    const already = running;
    running = true;
    last = 0;
    resize();
    if (canvas.parentElement && !canvas._ro) {
      canvas._ro = new ResizeObserver(() => resize());
      canvas._ro.observe(canvas.parentElement);
    }
    emit();
    try { audio.startHvac(); } catch (err) { console.error('hvac', err); }
    canvas.addEventListener('click', () => { try { audio.resume(); } catch { /* ignore */ } }, { once: true });
    if (!already) requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    input.unlock();
    stopRumble();
    audio.stop();
  }

  function resetToOffice() {
    stopRumble();
    if (ready) enterOffice();
  }

  function setTerminalOpen(v) {
    terminalOpen = v;
    if (v) input.unlock();
  }

  bus.on('ui:terminal-open', () => setTerminalOpen(true));
  bus.on('ui:terminal-close', () => setTerminalOpen(false));
  bus.on('world:goto-pad', () => {
    if (ready && canBoard()) beginLaunch();
  });
  bus.on('world:board-ship', ({ shipId, view }) => {
    if (!ready || !mission) {
      pendingBoard = { shipId, view };
      return;
    }
    watch = null;
    stopRumble();
    mission.enterLeo(shipId, view);
    phase = mission.phase;
    audio.beep(440, 0.1, 0.1);
    audio.resume();
  });
  bus.on('world:return-mc', () => {
    stopRumble();
    if (ready) enterOffice();
  });
  bus.on('flight:rate', (n) => {
    mission?.setRate(n);
  });
  bus.on('flight:cam', (mode) => {
    mission?.toggleView?.(mode);
  });
  bus.on('flight:pause', () => {
    if (!mission) return;
    const r = mission.getRate();
    mission.setRate(r > 0 ? 0 : 1);
  });

  window.addEventListener('resize', resize);

  return {
    start,
    stop,
    resize,
    resetToOffice,
    get phase() { return phase; },
    get locked() { return input.locked; },
  };
}
