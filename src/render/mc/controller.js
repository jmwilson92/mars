import * as THREE from 'three';
import { floorYAt } from './shell.js';

const EYE = 1.68;
const WALK = 2.8;
const SPRINT = 6.2;
const ACC = 14;
const DEC = 16;
const STEP = 0.25;
const GRAV = 24;
const JUMP = 5.6;

export function createMcController(camera, input, extraColliders) {
  const pos = new THREE.Vector3(0, 1.1 + EYE, 0.8);
  const vel = new THREE.Vector3();
  let yaw = 0;
  let pitch = -0.12;
  const look = new THREE.Vector3();
  const wish = new THREE.Vector3();
  let bob = 0;

  function collideMove(next) {
    for (const c of extraColliders) {
      if (next.y < c.y0 - 0.2 || next.y > c.y1 + 1.2) continue;
      if (c.type !== 'box') continue;
      if (next.x > c.minx && next.x < c.maxx && next.z > c.minz && next.z < c.maxz) {
        const left = next.x - c.minx;
        const right = c.maxx - next.x;
        const near = next.z - c.minz;
        const far = c.maxz - next.z;
        const m = Math.min(left, right, near, far);
        if (m === left) next.x = c.minx;
        else if (m === right) next.x = c.maxx;
        else if (m === near) next.z = c.minz;
        else next.z = c.maxz;
      }
    }
    next.x = THREE.MathUtils.clamp(next.x, -13.4, 13.4);
    next.z = THREE.MathUtils.clamp(next.z, -9.2, 9.0);
  }

  function update(dt) {
    const l = input.consumeLook();
    if (input.locked) {
      yaw -= l.dx;
      pitch = THREE.MathUtils.clamp(pitch - l.dy, -1.35, 1.35);
    }
    const speed = input.down('ShiftLeft') || input.down('ShiftRight') ? SPRINT : WALK;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    wish.set(0, 0, 0);
    if (input.locked) {
      if (input.down('KeyW')) wish.add(new THREE.Vector3(fx, 0, fz));
      if (input.down('KeyS')) wish.add(new THREE.Vector3(-fx, 0, -fz));
      if (input.down('KeyD')) wish.add(new THREE.Vector3(rx, 0, rz));
      if (input.down('KeyA')) wish.add(new THREE.Vector3(-rx, 0, -rz));
    }
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);
    const a = wish.lengthSq() > 0 ? ACC : DEC;
    vel.x += (wish.x - vel.x) * Math.min(1, a * dt);
    vel.z += (wish.z - vel.z) * Math.min(1, a * dt);

    const next = pos.clone();
    next.x += vel.x * dt;
    next.z += vel.z * dt;

    const aheadY = floorYAt(next.x + fx * 0.35, next.z + fz * 0.35);
    const hereY = floorYAt(pos.x, pos.z);
    const gy = floorYAt(next.x, next.z);
    const grounded = pos.y <= hereY + EYE + 0.08 && vel.y <= 0.05;
    if (grounded && (input.down('Space') || input.down('KeyJ'))) vel.y = JUMP;
    if (grounded && aheadY - hereY > 0 && aheadY - hereY < STEP + 0.35 && vel.y <= 0) {
      next.y = aheadY + EYE;
      vel.y = 0;
    } else {
      vel.y -= GRAV * dt;
      next.y = pos.y + vel.y * dt;
      if (next.y <= gy + EYE) {
        next.y = gy + EYE;
        vel.y = 0;
      }
    }

    collideMove(next);
    if (vel.y <= 0 && next.y < gy + EYE) next.y = gy + EYE;
    pos.copy(next);

    const spd = Math.hypot(vel.x, vel.z);
    bob += dt * spd * 1.6;
    const hb = Math.sin(bob) * 0.018 * Math.min(1, spd / WALK);
    const hs = Math.cos(bob) * 0.008 * Math.min(1, spd / WALK);

    camera.position.set(pos.x + rx * hs, pos.y + hb, pos.z + rz * hs);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    look.set(fx, 0, fz);
  }

  function nearest(items) {
    let best = null;
    let bestD = 3.5;
    for (const it of items) {
      const dx = it.x - pos.x;
      const dz = it.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > bestD) continue;
      const fwd = dx * -Math.sin(yaw) + dz * -Math.cos(yaw);
      if (fwd < 0.15) continue;
      best = it;
      bestD = d;
    }
    return best;
  }

  return {
    pos,
    update,
    nearest,
    get yaw() {
      return yaw;
    },
    get moving() {
      return Math.hypot(vel.x, vel.z) > 0.4;
    },
    setPose(x, z, yFloor, lookYaw, lookPitch) {
      pos.set(x, yFloor + EYE, z);
      yaw = lookYaw;
      pitch = lookPitch;
    },
    sitFlight() {
      pos.set(0, 1.1 + EYE, 1.35);
      yaw = 0;
      pitch = -0.16;
      vel.set(0, 0, 0);
    },
    cinematic(t) {
      const pts = [
        { x: 0, y: 2.78, z: 1.15, yaw: 0, pitch: -0.16 },
        { x: -0.8, y: 2.45, z: -1.6, yaw: 0.06, pitch: -0.06 },
        { x: 0.2, y: 2.15, z: -4.1, yaw: 0, pitch: 0.08 },
      ];
      const u = Math.min(1, t / 18);
      const scaled = u * (pts.length - 1);
      const i = Math.min(pts.length - 2, Math.floor(scaled));
      const f = scaled - i;
      const a = pts[i];
      const b = pts[i + 1];
      camera.position.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f);
      yaw = a.yaw + (b.yaw - a.yaw) * f;
      pitch = a.pitch + (b.pitch - a.pitch) * f;
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
    },
  };
}
