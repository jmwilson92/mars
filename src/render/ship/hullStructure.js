import * as THREE from 'three';
import { ARK, DECK_META, polar } from './constants.js';
import { add, deckMark, placard } from './mats.js';

/** One closed hull. Walls are this cylinder — nothing else shares its radius. */
export function buildVessel(parent, mats) {
  const top = ARK.floorY[0] + ARK.headroom + 0.35;
  const bot = ARK.floorY[6] - 0.02;
  const h = top - bot;
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(ARK.innerR, ARK.innerR, h, 48, 1, true),
    mats.panel,
  );
  wall.position.y = bot + h / 2;
  parent.add(wall);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(ARK.innerR, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.3),
    mats.panel,
  );
  dome.position.y = ARK.floorY[0] + ARK.headroom - 0.05;
  parent.add(dome);

  const aft = new THREE.Mesh(new THREE.CircleGeometry(ARK.innerR, 40), mats.steel);
  aft.rotation.x = Math.PI / 2;
  aft.position.y = bot + 0.01;
  parent.add(aft);

  const tank = new THREE.Mesh(new THREE.CircleGeometry(ARK.shaftR + 0.1, 20), mats.steel);
  tank.rotation.x = -Math.PI / 2;
  tank.position.y = ARK.floorY[6] + 0.015;
  parent.add(tank);
}

export function buildDeckShell(parent, mats, deck) {
  const y0 = ARK.floorY[deck];
  const h = ARK.headroom;
  const r = ARK.innerR;
  const meta = DECK_META[deck];

  const floor = new THREE.Mesh(new THREE.RingGeometry(ARK.shaftR + 0.07, r - 0.04, 40), mats.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = y0;
  parent.add(floor);

  if (deck > 0) {
    const ceil = new THREE.Mesh(new THREE.RingGeometry(ARK.shaftR + 0.07, r - 0.04, 40), mats.ceil);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = y0 + h;
    parent.add(ceil);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = polar(r - 0.45, a, y0 + h - 0.07);
      add(parent, new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), mats.dark, p.x, p.y, p.z, Math.PI / 2, 0, a);
    }
  }

  for (const yy of [y0 + 0.08, y0 + h * 0.5, y0 + h - 0.08]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(r - 0.14, 0.04, 6, 36), mats.frame);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = yy;
    parent.add(hoop);
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = polar(r - 0.13, a, y0 + h / 2);
    add(parent, new THREE.BoxGeometry(0.05, h - 0.08, 0.06), mats.frame, p.x, p.y, p.z, 0, -a, 0);
  }

  for (let i = 0; i < 3; i++) {
    const a = 0.4 + i * 2.0 + deck * 0.15;
    const p = polar(r - 0.16, a, y0 + 1.15);
    add(parent, new THREE.BoxGeometry(0.06, 1.15, 0.72), mats.frame, p.x, p.y, p.z, 0, -a, 0);
    add(parent, new THREE.BoxGeometry(0.04, 0.95, 0.58), mats.mli, p.x * 0.99, p.y, p.z * 0.99, 0, -a, 0);
  }

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.5;
    const p = polar(2.1, a, y0 + h - 0.05);
    add(parent, new THREE.BoxGeometry(0.56, 0.05, 0.56), mats.frame, p.x, p.y, p.z);
    add(parent, new THREE.BoxGeometry(0.46, 0.02, 0.46), mats.light, p.x, p.y - 0.025, p.z);
  }

  const extA = 1.2 + deck * 0.35;
  const ep = polar(r - 0.22, extA, y0 + 0.52);
  add(parent, new THREE.CylinderGeometry(0.07, 0.07, 0.4, 8), mats.fire, ep.x, ep.y, ep.z);
  placard(parent, mats, `${meta.id}-FIRE`, ep.x * 0.96, y0 + 0.9, ep.z * 0.96, -extA);

  const op = polar(r - 0.22, extA + 0.8, y0 + 1.85);
  add(parent, new THREE.BoxGeometry(0.32, 0.14, 0.1), mats.o2, op.x, op.y, op.z, 0, -(extA + 0.8), 0);
  placard(parent, mats, 'EMERG O2', op.x * 0.96, y0 + 2.02, op.z * 0.96, -(extA + 0.8));

  placard(parent, mats, `${meta.id}-STBD-07`, polar(r - 0.08, 2.2, y0 + 1.6).x, y0 + 1.6, polar(r - 0.08, 2.2, y0 + 1.6).z, -2.2);
  placard(parent, mats, 'NO STEP', polar(r - 0.08, 3.4, y0 + 1.15).x, y0 + 1.15, polar(r - 0.08, 3.4, y0 + 1.15).z, -3.4);

  deckMark(parent, mats, `${meta.id} ${meta.name}`, 1.4, 0.15, y0);
}
