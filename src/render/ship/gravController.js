import { ARK } from './constants.js';
import { EYE, stepWalk } from '../locomotion.js';

export function inHatch(pos) {
  return Math.hypot(pos.x, pos.z) < ARK.shaftR + 0.2;
}

export function climbShaft(pose, deck, dir) {
  const next = Math.max(0, Math.min(ARK.decks - 1, deck + dir));
  pose.pos.set(0.05, ARK.floorY[next] + EYE, 0.2);
  pose.vel?.set?.(0, 0, 0);
  return next;
}

export function walkDeck(pose, input, camera, cabin, deck, dt, detachCam) {
  const g = cabin.gravity ?? 1;
  const walls = [
    { type: 'innerCyl', x: 0, z: 0, r: ARK.innerR - 0.18, y0: ARK.floorY[6] - 1, y1: 3 },
  ];
  const stepped = stepWalk(
    pose.pos, pose.vel, input, pose.yaw, pose.pitch, dt,
    g >= 0.5 ? 14 : 6, walls, ARK.innerR - 0.16,
  );
  pose.yaw = stepped.yaw;
  pose.pitch = stepped.pitch;
  pose.roll *= 0.8;
  pose.pos.y = ARK.floorY[deck] + EYE;
  detachCam();
  camera.position.copy(pose.pos);
  camera.rotation.set(pose.pitch, pose.yaw, pose.roll || 0, 'YXZ');
  cabin.setPlayerDeck?.(deck);
}
