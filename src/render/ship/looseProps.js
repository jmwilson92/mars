import * as THREE from 'three';
import { ARK } from './constants.js';

const KINDS = [
  { geo: () => new THREE.BoxGeometry(0.12, 0.02, 0.02), color: 0x2a2a2a },
  { geo: () => new THREE.BoxGeometry(0.1, 0.14, 0.04), color: 0xc8a050 },
  { geo: () => new THREE.BoxGeometry(0.12, 0.16, 0.02), color: 0xf0ead8 },
  { geo: () => new THREE.CylinderGeometry(0.035, 0.03, 0.08, 6), color: 0x888480 },
];

export function spawnLooseProps(parent, _mats, rng = Math.random) {
  const items = [];
  for (let d = 0; d < 7; d++) {
    for (let i = 0; i < 5; i++) {
      const kind = KINDS[(i + d) % KINDS.length];
      const mesh = new THREE.Mesh(
        kind.geo(),
        new THREE.MeshStandardMaterial({ color: kind.color, roughness: 0.55 }),
      );
      const a = rng() * Math.PI * 2;
      const r = 1.4 + rng() * 1.8;
      mesh.position.set(Math.sin(a) * r, ARK.floorY[d] + 0.09, -Math.cos(a) * r);
      parent.add(mesh);
      items.push({
        mesh,
        deck: d,
        rest: mesh.position.clone(),
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        floating: false,
      });
    }
  }
  return items;
}

export function tickLoose(items, dt, zeroG, returns) {
  for (const it of items) {
    if (!it.mesh.visible) continue;
    if (!zeroG) {
      it.mesh.position.lerp(it.rest, Math.min(1, dt * 2.2));
      it.vel.set(0, 0, 0);
      continue;
    }
    if (!it.floating) {
      it.floating = true;
      it.vel.set((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.1);
      it.spin.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4);
    }
    if (returns) {
      it.vel.x += (returns.x - it.mesh.position.x) * dt * 0.004;
      it.vel.z += (returns.z - it.mesh.position.z) * dt * 0.004;
    }
    it.mesh.position.addScaledVector(it.vel, dt);
    it.mesh.rotation.x += it.spin.x * dt;
    it.mesh.rotation.y += it.spin.y * dt;
    const r = Math.hypot(it.mesh.position.x, it.mesh.position.z);
    if (r > ARK.innerR - 0.3) {
      it.vel.multiplyScalar(-0.25);
      it.mesh.position.multiplyScalar((ARK.innerR - 0.35) / r);
    }
  }
}

export function releaseAll(items) {
  for (const it of items) it.floating = false;
}
