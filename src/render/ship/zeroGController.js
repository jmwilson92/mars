import { ARK, deckIndexFromY } from './constants.js';
import { nearestRail } from './handrails.js';

const MAX = 2.0;
const REST = 0.25;

export function createZeroG({ grabs }) {
  let grabbed = null;
  let nudgeT = 20 + Math.random() * 20;

  function tick(pose, input, camera, dt) {
    const look = input.consumeLook();
    if (input.locked) {
      pose.yaw -= look.dx;
      pose.pitch = Math.max(-1.45, Math.min(1.45, pose.pitch - look.dy));
      if (input.down('KeyQ')) pose.roll += dt * 1.4;
      if (input.down('KeyZ')) pose.roll -= dt * 1.4;
    }

    const cy = Math.cos(pose.yaw);
    const sy = Math.sin(pose.yaw);
    const cp = Math.cos(pose.pitch);
    const sp = Math.sin(pose.pitch);
    const fx = -sy * cp;
    const fy = sp;
    const fz = -cy * cp;
    const rx = cy;
    const rz = -sy;
    const ux = -sy * -sp;
    const uy = cp;
    const uz = -cy * -sp;

    const near = nearestRail(pose.pos, grabs, 0.95);
    if (input.down('KeyF') && near) {
      grabbed = near;
      pose.vel.set(0, 0, 0);
      pose.pos.x += (near.x - pose.pos.x) * Math.min(1, dt * 8);
      pose.pos.z += (near.z - pose.pos.z) * Math.min(1, dt * 8);
      if (input.down('KeyW')) pose.pos.y += 1.7 * dt;
      else if (input.down('KeyS')) pose.pos.y -= 1.7 * dt;
      else pose.pos.y += (near.y - pose.pos.y) * Math.min(1, dt * 6);
    } else {
      grabbed = null;
      const wish = { x: 0, y: 0, z: 0 };
      if (input.locked) {
        if (input.down('KeyW')) { wish.x += fx; wish.y += fy; wish.z += fz; }
        if (input.down('KeyS')) { wish.x -= fx; wish.y -= fy; wish.z -= fz; }
        if (input.down('KeyD')) { wish.x += rx; wish.z += rz; }
        if (input.down('KeyA')) { wish.x -= rx; wish.z -= rz; }
        if (input.down('Space')) { wish.x += ux; wish.y += uy; wish.z += uz; }
        if (input.down('ControlLeft') || input.down('ControlRight')) {
          wish.x -= ux; wish.y -= uy; wish.z -= uz;
        }
      }
      const mag = Math.hypot(wish.x, wish.y, wish.z);
      const push = input.down('ShiftLeft') || input.down('ShiftRight');
      const touching = nearSurface(pose.pos);
      if (mag > 0) {
        const s = (push && touching ? 1.6 : 0.35) * dt;
        pose.vel.x += (wish.x / mag) * s;
        pose.vel.y += (wish.y / mag) * s;
        pose.vel.z += (wish.z / mag) * s;
      }
      nudgeT -= dt;
      if (nudgeT <= 0) {
        pose.vel.x += (Math.random() - 0.5) * 0.04;
        pose.vel.z += (Math.random() - 0.5) * 0.04;
        nudgeT = 20 + Math.random() * 20;
      }
    }

    const spd = Math.hypot(pose.vel.x, pose.vel.y, pose.vel.z);
    if (spd > MAX) pose.vel.multiplyScalar(MAX / spd);

    if (!grabbed) {
      pose.pos.x += pose.vel.x * dt;
      pose.pos.y += pose.vel.y * dt;
      pose.pos.z += pose.vel.z * dt;
      bounce(pose);
    } else {
      const r = Math.hypot(pose.pos.x, pose.pos.z);
      if (r > ARK.innerR - 0.22) {
        const k = (ARK.innerR - 0.22) / r;
        pose.pos.x *= k;
        pose.pos.z *= k;
      }
      pose.pos.y = Math.max(ARK.floorY[6] + 0.2, Math.min(ARK.floorY[0] + ARK.headroom - 0.2, pose.pos.y));
    }

    camera.position.copy(pose.pos);
    camera.rotation.set(pose.pitch, pose.yaw, pose.roll || 0, 'YXZ');
    return {
      deck: deckIndexFromY(pose.pos.y),
      grabbed: Boolean(grabbed),
      nearRail: Boolean(near),
    };
  }

  return { tick };
}

function nearSurface(pos) {
  const r = Math.hypot(pos.x, pos.z);
  if (r > ARK.innerR - 0.45) return true;
  if (r < ARK.shaftR + 0.25) return true;
  const deck = deckIndexFromY(pos.y);
  const y0 = ARK.floorY[deck];
  if (pos.y < y0 + 0.4 || pos.y > y0 + ARK.headroom - 0.25) return true;
  return false;
}

function bounce(pose) {
  const r = Math.hypot(pose.pos.x, pose.pos.z);
  const inShaft = r < ARK.shaftR + 0.15;
  if (r > ARK.innerR - 0.22) {
    const k = (ARK.innerR - 0.22) / r;
    pose.pos.x *= k;
    pose.pos.z *= k;
    pose.vel.x *= -REST;
    pose.vel.z *= -REST;
    pose.vel.y += (Math.random() - 0.5) * 0.08;
  }
  const top = ARK.floorY[0] + ARK.headroom - 0.15;
  const bot = ARK.floorY[6] + 0.2;
  if (pose.pos.y > top) {
    pose.pos.y = top;
    pose.vel.y *= -REST;
  }
  if (pose.pos.y < bot) {
    pose.pos.y = bot;
    pose.vel.y *= -REST;
  }
  if (!inShaft) {
    const deck = deckIndexFromY(pose.pos.y);
    const y0 = ARK.floorY[deck];
    const y1 = y0 + ARK.headroom - 0.12;
    if (pose.pos.y < y0 + 0.18) {
      pose.pos.y = y0 + 0.18;
      pose.vel.y *= -REST;
    }
    if (pose.pos.y > y1) {
      pose.pos.y = y1;
      pose.vel.y *= -REST;
    }
  }
}
