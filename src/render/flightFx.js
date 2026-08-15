import { PHASE } from './phases.js';
import { SHIP } from './starship.js';

export function shakeAmt(phase, phaseT, cfg) {
  if (phase === PHASE.COUNTDOWN) return 0.12 + Math.min(10, phaseT) * 0.045;
  if (phase === PHASE.ASCENT) {
    const u = Math.min(1, phaseT / cfg.ascentSeconds);
    if (u < 0.35) return 0.88;
    if (u < 0.55) return 1.0;
    if (u < 0.78) return 0.52;
    return 0.22;
  }
  if (phase === PHASE.EDL) {
    const u = Math.min(1, phaseT / cfg.edlSeconds);
    if (u < 0.42) return 0.92;
    if (u < 0.62) return 0.68;
    return 0.78;
  }
  return 0;
}

export function applyShake(camera, t, phase, phaseT, cfg, amp = 1) {
  const a = shakeAmt(phase, phaseT, cfg) * amp;
  if (a <= 0) return;
  camera.position.x += Math.sin(t * 61.3) * a * 0.028;
  camera.position.y += Math.sin(t * 88.7) * a * 0.02;
  camera.position.z += Math.sin(t * 47.1) * a * 0.016;
  camera.rotation.z = Math.sin(t * 37.4) * a * 0.02;
}

/** Mouse-orbit chase cam. Does not consume look without using it. */
export function tickExtCam(camera, ship, input, pose, phase) {
  if (camera.parent) camera.parent.remove(camera);
  const look = input.consumeLook();
  if (input.locked) {
    pose.yaw -= look.dx;
    pose.pitch = Math.max(-1.15, Math.min(1.15, pose.pitch - look.dy));
  }
  const p = ship.group.position;
  const mid = phase === PHASE.ASCENT || phase === PHASE.COUNTDOWN
    ? p.y + 80
    : p.y + SHIP.midY;
  const dist = phase === PHASE.ASCENT ? 120 : phase === PHASE.EDL ? 95 : 80;
  const cp = Math.cos(pose.pitch);
  const sp = Math.sin(pose.pitch);
  camera.position.set(
    p.x + Math.sin(pose.yaw) * cp * dist,
    mid + sp * dist * 0.85,
    p.z + Math.cos(pose.yaw) * cp * dist,
  );
  camera.lookAt(p.x, mid, p.z);
}

export function tickCabinSky(cabin, phase, phaseT, cfg, acc) {
  let kind = 'pad';
  let u = 0;
  if (phase === PHASE.COUNTDOWN) { kind = 'pad'; u = phaseT / 10; }
  else if (phase === PHASE.ASCENT) { kind = 'ascent'; u = Math.min(1, phaseT / cfg.ascentSeconds); }
  else if (phase === PHASE.ORBIT || phase === PHASE.LEO_OPS) { kind = 'orbit'; u = 0; }
  else if (phase === PHASE.TRANSIT) { kind = 'transit'; u = Math.min(1, phaseT / cfg.transitSeconds); }
  else if (phase === PHASE.EDL) { kind = 'edl'; u = Math.min(1, phaseT / cfg.edlSeconds); }
  else if (phase === PHASE.MARS_SURFACE) { kind = 'mars'; u = 1; }
  const n = acc + 1;
  if (n % 4 === 0) cabin.setView(kind, u);
  return n;
}

export function tickOptimusCam(camera, ship, input, pose, phase, detachCam) {
  detachCam();
  tickExtCam(camera, ship, input, pose, phase);
}
