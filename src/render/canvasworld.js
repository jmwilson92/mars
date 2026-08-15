import { createInput } from './input.js';
import { nearestInteractable, stepWalk } from './locomotion.js';
import { PHASE } from './phases.js';
import { sizeCanvas } from './webgl.js';
import { TOON, TOON_STAFF, drawToonPerson, drawToonShip, drawCartoonSky } from './cartoon.js';

const EYE = 1.7;
const G_E = 22;
const G_M = 8.4;

const OFFICE = {
  collisions: [
    { type: 'box', minx: -14.2, maxx: 14.2, minz: -9.3, maxz: -8.7, y0: 0, y1: 4 },
    { type: 'box', minx: -14.2, maxx: 14.2, minz: 8.7, maxz: 9.3, y0: 0, y1: 4 },
    { type: 'box', minx: -14.3, maxx: -13.7, minz: -9, maxz: 9, y0: 0, y1: 4 },
    { type: 'box', minx: 13.7, maxx: 14.3, minz: -9, maxz: 9, y0: 0, y1: 4 },
  ],
  interactables: [
    { id: 'budget', label: 'APPROPRIATIONS', prompt: 'E  Talk to Ruiz — appropriations', x: -9, z: -6 },
    { id: 'schedule', label: 'FLIGHT SCHEDULE', prompt: 'E  Talk to Okonkwo — schedule', x: -4, z: -6 },
    { id: 'manifest', label: 'MANIFEST', prompt: 'E  Talk to Chen — cargo / crew / Optimus', x: 4, z: -6 },
    { id: 'research', label: 'RESEARCH', prompt: 'E  Talk to Voss — technology', x: 9, z: -6 },
    { id: 'site', label: 'SITE SELECT', prompt: 'E  Talk to Hale — landing sites', x: -9, z: 5.5 },
    { id: 'pad', label: 'PAD ACCESS', prompt: 'E  Walk out to the vehicle', x: 0, z: 7.6 },
  ],
};

const PAD_BOARD = { x: 16.5, y: 0, z: 0 };

function dist2(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function project(cam, x, y, z, w, h) {
  const dx = x - cam.x;
  const dy = y - cam.eye;
  const dz = z - cam.z;
  // Same basis as the walker: look = (-sin yaw, -cos yaw), i.e. Three.js -Z.
  const c = Math.cos(cam.yaw);
  const s = Math.sin(cam.yaw);
  const rx = dx * c - dz * s;
  const rz = -dx * s - dz * c;
  if (rz < 0.15) return null;
  const f = (h * 0.95) / rz;
  return { x: w * 0.5 + rx * f, y: h * 0.52 - dy * f, z: rz, f };
}

function quad(ctx, pts, fill) {
  if (pts.some((p) => !p)) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function createCanvasWorld(canvas, { bus, balance, getState, getSite }) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const input = createInput(canvas);
  const pos = { x: 0, y: EYE, z: 5.2 };
  const vel = { x: 0, y: 0, z: 0 };
  let yaw = 0;
  let pitch = 0;
  let phase = PHASE.OFFICE;
  let phaseT = 0;
  let running = false;
  let last = 0;
  let terminalOpen = false;
  let usedE = false;
  let telem = { phase, title: 'PROGRAM CONTROL', call: '', prompt: '', alt: 0, vel: 0, mach: 0, stage: 'CANVAS', site: null };
  const cfg = balance.experience;

  function emit() {
    telem = { ...telem, phase, site: getSite() };
    bus.emit('flight:telemetry', telem);
  }

  function resize() {
    sizeCanvas(canvas);
  }

  function canBoard() {
    return Boolean(getState()?.missions.planned.some((m) => m.status === 'go'));
  }

  function enter(next) {
    phase = next;
    phaseT = 0;
    if (next === PHASE.OFFICE) {
      pos.x = 0;
      pos.z = 5.2;
      yaw = 0;
      telem = { ...telem, title: 'MISSION CONTROL', call: 'Walk the floor. Talk to the staff. The stack is out the window.', stage: 'OFFICE', prompt: 'CLICK · WASD · E' };
    } else if (next === PHASE.EARTH_PAD) {
      pos.x = -38;
      pos.z = 42;
      yaw = 0.2;
      telem = { ...telem, title: 'PAD 1 — GULF COAST', call: 'Vehicle stacked. Commit a flight before you board.', stage: 'PAD', prompt: 'E board · Q office' };
    } else if (next === PHASE.CABIN) {
      telem.title = 'CREW CABIN — STARSHIP';
      telem.call = 'L launch · X pad';
      telem.stage = 'BOARDED';
    } else if (next === PHASE.COUNTDOWN) {
      telem.title = 'COUNTDOWN';
      telem.stage = 'HOLD-DOWN';
    } else if (next === PHASE.ASCENT) {
      telem.title = 'ASCENT';
      telem.stage = 'BOOSTER';
    } else if (next === PHASE.ORBIT) {
      telem.title = 'LOW EARTH ORBIT';
      telem.call = 'Insertion. T for trans-Mars injection.';
      telem.alt = 210000;
      telem.vel = 7800;
      telem.stage = 'SHIP';
      telem.prompt = 'T  TMI burn';
    } else if (next === PHASE.TRANSIT) {
      telem.title = 'TRANS-MARS COAST';
      telem.call = 'TMI complete. Mars is getting bigger.';
      telem.stage = 'COAST';
    } else if (next === PHASE.EDL) {
      telem.title = 'ENTRY / BELLY-FLOP';
      telem.call = 'ENTRY INTERFACE 5.8 km/s';
      telem.stage = 'EDL';
      telem.prompt = 'No commanding.';
    } else if (next === PHASE.MARS_SURFACE) {
      pos.x = 18;
      pos.z = 14;
      yaw = -0.9;
      telem.title = (getSite()?.name || 'MARS').toUpperCase();
      telem.call = 'Touchdown. Survive with the manifest.';
      telem.alt = 0;
      telem.vel = 0;
      telem.stage = 'LANDED';
      bus.emit('flight:landed', { siteId: getSite()?.id });
    }
    emit();
  }

  function onUse() {
    if (terminalOpen) return;
    if (phase === PHASE.OFFICE) {
      const near = nearestInteractable(pos, OFFICE.interactables);
      if (!near) return;
      if (near.id === 'pad') enter(PHASE.EARTH_PAD);
      else bus.emit('world:interact', near.id);
    } else if (phase === PHASE.EARTH_PAD && dist2(pos, PAD_BOARD) < 6 && canBoard()) {
      enter(PHASE.CABIN);
    }
  }

  function tick(dt) {
    phaseT += dt;
    if (input.down('KeyE')) {
      if (!usedE) { usedE = true; onUse(); }
    } else usedE = false;

    if (phase === PHASE.OFFICE) {
      if (!terminalOpen) {
        const s = stepWalk(pos, vel, input, yaw, pitch, dt, G_E, OFFICE.collisions, 16);
        yaw = s.yaw;
        pitch = s.pitch;
      } else input.consumeLook();
      const near = nearestInteractable(pos, OFFICE.interactables);
      const fault = window.__MARS_GL_ERROR;
      telem.prompt = terminalOpen ? 'ESC close' : near ? near.prompt : 'CLICK · WASD · E';
      telem.call = fault || (near ? near.label : 'Cartoon control room. The stack is out the window.');
      if (fault) telem.title = 'SITE FAULT';
    } else if (phase === PHASE.EARTH_PAD) {
      const s = stepWalk(pos, vel, input, yaw, pitch, dt, G_E, [], 360);
      yaw = s.yaw;
      pitch = s.pitch;
      const go = canBoard();
      telem.prompt = dist2(pos, PAD_BOARD) < 6 ? (go ? 'E  BOARD STARSHIP' : 'NO COMMITTED FLIGHT') : 'Q office · E at tower';
      if (input.down('KeyQ')) enter(PHASE.OFFICE);
    } else if (phase === PHASE.CABIN) {
      input.consumeLook();
      if (input.down('KeyX')) { pos.x = 16.5; pos.z = 6; enter(PHASE.EARTH_PAD); }
      else if (input.down('KeyL') && canBoard()) enter(PHASE.COUNTDOWN);
    } else if (phase === PHASE.COUNTDOWN) {
      telem.call = `T− ${Math.max(0, 10 - phaseT).toFixed(1)}`;
      if (phaseT >= 10) enter(PHASE.ASCENT);
    } else if (phase === PHASE.ASCENT) {
      const u = Math.min(1, phaseT / cfg.ascentSeconds);
      telem.alt = u ** 1.55 * 185000;
      telem.vel = u ** 1.15 * 7900;
      telem.mach = telem.vel / 340;
      telem.call = u < 0.35 ? 'LIFTOFF' : u < 0.55 ? 'MAX-Q' : u < 0.78 ? 'MECO / HOT-STAGE' : 'INSERTION';
      if (u >= 1) enter(PHASE.ORBIT);
    } else if (phase === PHASE.ORBIT) {
      telem.alt = 210000;
      telem.vel = 7800;
      if (input.down('KeyT')) enter(PHASE.TRANSIT);
    } else if (phase === PHASE.TRANSIT) {
      const u = Math.min(1, phaseT / cfg.transitSeconds);
      telem.alt = 2.25e11 * (0.05 + u * 0.9);
      telem.vel = 26000;
      telem.call = `COAST  day ${Math.round(u * 210)} / 210`;
      if (u >= 1) enter(PHASE.EDL);
    } else if (phase === PHASE.EDL) {
      const u = Math.min(1, phaseT / cfg.edlSeconds);
      telem.alt = (1 - u) * 125000;
      telem.vel = (1 - u) * 5800;
      telem.call = u < 0.42 ? 'BELLY-FLOP  ·  PEAK HEATING' : u < 0.62 ? 'FLIP MANEUVER' : u < 0.85 ? 'LANDING BURN' : 'TOUCHDOWN';
      telem.stage = u < 0.42 ? 'BELLY' : u < 0.62 ? 'FLIP' : 'BURN';
      if (u >= 1) enter(PHASE.MARS_SURFACE);
    } else if (phase === PHASE.MARS_SURFACE) {
      const s = stepWalk(pos, vel, input, yaw, pitch, dt, G_M, [], 360);
      yaw = s.yaw;
      pitch = s.pitch;
    }
    emit();
  }

  function boxSprite(cam, w, h, x, y, z, bw, bh, bd, fill) {
    const pts = [
      project(cam, x - bw, y, z - bd, w, h),
      project(cam, x + bw, y, z - bd, w, h),
      project(cam, x + bw, y + bh, z - bd, w, h),
      project(cam, x - bw, y + bh, z - bd, w, h),
    ];
    quad(ctx, pts, fill);
  }

  function drawOffice(w, h, t) {
    drawCartoonSky(ctx, w, h, t);
    const cam = { x: pos.x, z: pos.z, yaw, eye: EYE };
    const farShip = project(cam, 0, 18, -80, w, h);
    if (farShip) drawToonShip(ctx, farShip.x, farShip.y, Math.min(h * 0.55, farShip.f * 36));
    quad(ctx, [
      project(cam, -16, 0, -9.2, w, h),
      project(cam, 16, 0, -9.2, w, h),
      project(cam, 16, 0, 10, w, h),
      project(cam, -16, 0, 10, w, h),
    ], TOON.carpetA);
    for (let gx = -12; gx <= 12; gx += 2) {
      for (let gz = -8; gz <= 8; gz += 2) {
        if ((gx + gz) % 4 === 0) {
          quad(ctx, [
            project(cam, gx, 0.01, gz, w, h),
            project(cam, gx + 2, 0.01, gz, w, h),
            project(cam, gx + 2, 0.01, gz + 2, w, h),
            project(cam, gx, 0.01, gz + 2, w, h),
          ], TOON.carpetB);
        }
      }
    }
    quad(ctx, [
      project(cam, -14, 0, -9, w, h),
      project(cam, -6, 0, -9, w, h),
      project(cam, -6, 3.8, -9, w, h),
      project(cam, -14, 3.8, -9, w, h),
    ], TOON.wall);
    quad(ctx, [
      project(cam, 6, 0, -9, w, h),
      project(cam, 14, 0, -9, w, h),
      project(cam, 14, 3.8, -9, w, h),
      project(cam, 6, 3.8, -9, w, h),
    ], TOON.wall);
    quad(ctx, [
      project(cam, -6.2, 3.2, -9, w, h),
      project(cam, 6.2, 3.2, -9, w, h),
      project(cam, 6.2, 3.8, -9, w, h),
      project(cam, -6.2, 3.8, -9, w, h),
    ], TOON.trim);
    const people = [];
    for (const st of OFFICE.interactables) {
      if (st.id === 'pad') {
        boxSprite(cam, w, h, st.x, 0, st.z, 1.3, 2.8, 0.2, TOON.trim);
        continue;
      }
      boxSprite(cam, w, h, st.x, 0, st.z, 1.25, 0.95, 0.7, TOON.console);
      boxSprite(cam, w, h, st.x - 0.45, 1.05, st.z - 0.35, 0.4, 0.42, 0.04, TOON.screen);
      boxSprite(cam, w, h, st.x + 0.45, 1.05, st.z - 0.35, 0.4, 0.42, 0.04, TOON.screen);
      const who = TOON_STAFF.find((s) => s.station === st.id);
      const feet = project(cam, st.x + 0.9, 0, st.z + 1.2, w, h);
      const head = project(cam, st.x + 0.9, 1.5, st.z + 1.2, w, h);
      if (who && feet && head) {
        people.push({
          z: feet.z,
          draw: () => drawToonPerson(ctx, feet.x, feet.y, Math.abs(feet.y - head.y) * 1.15, who, t),
        });
      }
    }
    people.sort((a, b) => b.z - a.z).forEach((p) => p.draw());
  }

  function drawPad(w, h, t, flame = 0) {
    drawCartoonSky(ctx, w, h, t);
    ctx.fillStyle = TOON.sand;
    ctx.fillRect(0, h * 0.58, w, h * 0.42);
    ctx.fillStyle = TOON.pad;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.78, w * 0.28, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    drawToonShip(ctx, w * 0.5, h * 0.52, h * 0.42, { flame });
    ctx.fillStyle = TOON.consoleHi;
    ctx.fillRect(w * 0.62, h * 0.38, 18, h * 0.38);
    ctx.fillStyle = TOON.trim;
    ctx.fillRect(w * 0.62, h * 0.38, 18, 10);
  }

  function drawStars(w, h) {
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 180; i++) ctx.fillRect((i * 97) % w, (i * 53) % h, i % 5 === 0 ? 2 : 1, 1);
  }

  function disc(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCinematic(w, h, t) {
    if (phase === PHASE.CABIN || phase === PHASE.COUNTDOWN) {
      drawPad(w, h, t, phase === PHASE.COUNTDOWN ? Math.max(0, phaseT - 8) / 2 : 0);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 18;
      ctx.strokeRect(w * 0.12, h * 0.12, w * 0.76, h * 0.52);
      ctx.strokeStyle = TOON.screen;
      ctx.lineWidth = 4;
      ctx.strokeRect(w * 0.14, h * 0.14, w * 0.72, h * 0.48);
    } else if (phase === PHASE.ASCENT) {
      const u = Math.min(1, phaseT / cfg.ascentSeconds);
      if (u < 0.55) drawCartoonSky(ctx, w, h, t);
      else drawStars(w, h);
      drawToonShip(ctx, w * 0.5, h * (0.72 - u * 0.5), h * 0.28, { flame: 1, tilt: -u * 0.2 });
    } else if (phase === PHASE.ORBIT || phase === PHASE.TRANSIT) {
      drawStars(w, h);
      const u = phase === PHASE.TRANSIT ? Math.min(1, phaseT / cfg.transitSeconds) : 0;
      disc(w * 0.32, h * 0.66, 150 * (1 - u * 0.72), '#3d8bfd');
      disc(w * 0.32 - 40, h * 0.62, 40 * (1 - u * 0.72), '#7bc96f');
      disc(w * (0.84 - u * 0.18), h * 0.4, 16 + u * 150, '#e07a3d');
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 16;
      ctx.strokeRect(8, 8, w - 16, h - 16);
    } else if (phase === PHASE.EDL) {
      const u = Math.min(1, phaseT / cfg.edlSeconds);
      ctx.fillStyle = u < 0.42 ? '#ff7a18' : '#e8b07a';
      ctx.fillRect(0, 0, w, h);
      disc(w * 0.5, h * 0.9, 260 + u * 180, '#c1784a');
      drawToonShip(ctx, w * 0.5, h * 0.38, h * 0.22, {
        tilt: u < 0.42 ? Math.PI / 2 : u < 0.62 ? (Math.PI / 2) * (1 - (u - 0.42) / 0.2) : 0,
        flame: u > 0.62 ? 1 : 0,
      });
    } else if (phase === PHASE.MARS_SURFACE) {
      const grd = ctx.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#f0c4a0');
      grd.addColorStop(1, '#c1784a');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#a85a32';
      ctx.fillRect(0, h * 0.62, w, h * 0.38);
      drawToonShip(ctx, w * 0.38, h * 0.5, h * 0.36);
    }
  }

  function paint() {
    resize();
    const w = canvas.width;
    const h = canvas.height;
    const t = last || 0;
    if (phase === PHASE.OFFICE) drawOffice(w, h, t);
    else if (phase === PHASE.EARTH_PAD) drawPad(w, h, t);
    else drawCinematic(w, h, t);
    ctx.fillStyle = 'rgba(255,176,0,0.55)';
    ctx.fillRect(w / 2 - 3, h / 2 - 3, 6, 6);
  }

  function frame(now) {
    if (!running) return;
    const t = now * 0.001;
    const dt = last ? Math.min(0.05, t - last) : 0.016;
    last = t;
    tick(dt);
    paint();
    requestAnimationFrame(frame);
  }

  async function start() {
    const already = running;
    running = true;
    last = 0;
    resize();
    if (!already) enter(PHASE.OFFICE);
    if (canvas.parentElement && !canvas._ro) {
      canvas._ro = new ResizeObserver(() => resize());
      canvas._ro.observe(canvas.parentElement);
    }
    if (!already) requestAnimationFrame(frame);
    return Promise.resolve();
  }

  function stop() {
    running = false;
    input.unlock();
  }

  bus.on('ui:terminal-open', () => { terminalOpen = true; input.unlock(); });
  bus.on('ui:terminal-close', () => { terminalOpen = false; });
  bus.on('world:goto-pad', () => enter(PHASE.EARTH_PAD));

  return {
    start,
    stop,
    resize,
    resetToOffice() { enter(PHASE.OFFICE); },
    get phase() { return phase; },
    get locked() { return input.locked; },
    software: true,
  };
}
