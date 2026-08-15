export const EYE = 1.7;

export function collide(pos, list) {
  for (const c of list) {
    if (pos.y < c.y0 || pos.y > c.y1 + EYE) continue;
    if (c.type === 'cyl') {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d < c.r && d > 1e-4) {
        const k = c.r / d;
        pos.x = c.x + dx * k;
        pos.z = c.z + dz * k;
      }
    } else if (c.type === 'innerCyl') {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d > c.r && d > 1e-4) {
        const k = c.r / d;
        pos.x = c.x + dx * k;
        pos.z = c.z + dz * k;
      }
    } else if (pos.x > c.minx && pos.x < c.maxx && pos.z > c.minz && pos.z < c.maxz) {
      const left = pos.x - c.minx;
      const right = c.maxx - pos.x;
      const near = pos.z - c.minz;
      const far = c.maxz - pos.z;
      const m = Math.min(left, right, near, far);
      if (m === left) pos.x = c.minx;
      else if (m === right) pos.x = c.maxx;
      else if (m === near) pos.z = c.minz;
      else pos.z = c.maxz;
    }
  }
}

export function nearestInteractable(pos, items, max = 3.4) {
  let best = null;
  let bestD = max;
  for (const it of items) {
    const d = Math.hypot(pos.x - it.x, pos.z - it.z);
    if (d < bestD) {
      best = it;
      bestD = d;
    }
  }
  return best;
}

export function stepWalk(pos, vel, input, yaw, pitch, dt, g, collisions, bound = 80) {
  const look = input.consumeLook();
  let nextYaw = yaw;
  let nextPitch = pitch;
  if (input.locked) {
    nextYaw -= look.dx;
    nextPitch = Math.max(-1.4, Math.min(1.4, pitch - look.dy));
  }
  if (input.locked) {
    const sp = input.down('ShiftLeft') || input.down('ShiftRight') ? 8.5 : 4.6;
    const fx = -Math.sin(nextYaw);
    const fz = -Math.cos(nextYaw);
    const rx = Math.cos(nextYaw);
    const rz = -Math.sin(nextYaw);
    let wx = 0;
    let wz = 0;
    if (input.down('KeyW')) { wx += fx; wz += fz; }
    if (input.down('KeyS')) { wx -= fx; wz -= fz; }
    if (input.down('KeyD')) { wx += rx; wz += rz; }
    if (input.down('KeyA')) { wx -= rx; wz -= rz; }
    const mag = Math.hypot(wx, wz);
    if (mag > 0) {
      vel.x = (wx / mag) * sp;
      vel.z = (wz / mag) * sp;
    } else {
      vel.x = 0;
      vel.z = 0;
    }
    if ((input.down('Space') || input.down('KeyJ')) && pos.y <= EYE + 0.06) vel.y = g < 12 ? 4.6 : 6.4;
  } else {
    vel.x *= 0.75;
    vel.z *= 0.75;
  }
  vel.y -= g * dt;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
  pos.z += vel.z * dt;
  if (pos.y < EYE) {
    pos.y = EYE;
    vel.y = 0;
  }
  collide(pos, collisions);
  const span = Math.hypot(pos.x, pos.z);
  if (span > bound) {
    pos.x *= bound / span;
    pos.z *= bound / span;
  }
  return { yaw: nextYaw, pitch: nextPitch };
}
