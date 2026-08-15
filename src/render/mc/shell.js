import * as THREE from 'three';
import { MC } from './palette.js';

export const TIERS = [
  { id: 'T1', z0: -8.0, z1: -4.5, y: 0.0, seats: 6 },
  { id: 'T2', z0: -4.5, z1: -1.0, y: 0.55, seats: 8 },
  { id: 'T3', z0: -1.0, z1: 2.5, y: 1.1, seats: 8 },
  { id: 'T4', z0: 2.5, z1: 6.0, y: 1.65, seats: 6 },
];

export const AISLE_X = [-5, 5];
export const AISLE_HALF = 0.9;

export function floorYAt(x, z) {
  const aisle = Math.abs(x + 5) < AISLE_HALF || Math.abs(x - 5) < AISLE_HALF;
  if (z <= -8) return 0;
  if (z >= 6) return 1.65;
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i];
    if (z >= t.z0 && z < t.z1) {
      if (!aisle) return t.y;
      if (i === 0) return t.y;
      const prev = TIERS[i - 1];
      const span = 0.9;
      if (z < t.z0 + span) {
        const u = (z - t.z0) / span;
        return prev.y + (t.y - prev.y) * u;
      }
      return t.y;
    }
  }
  return 1.65;
}

function std(color, roughness, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function box(mat, w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

export function buildShell() {
  const group = new THREE.Group();
  const collisions = [];

  const carpet = std(MC.floorCarpet, 0.95);
  const carpetAlt = std(MC.floorCarpetAlt, 0.95);
  const wall = std(MC.wallPanel, 0.85);
  const seam = std(MC.wallSeam, 0.85);
  const ceil = std(MC.ceiling, 0.8);
  const steel = std(MC.steel, 0.3, 0.85);
  const led = new THREE.MeshStandardMaterial({
    color: MC.ledStrip,
    emissive: MC.ledStrip,
    emissiveIntensity: 0.6,
    roughness: 0.4,
  });

  // Enclosed box — no sky
  group.add(box(wall, 28.2, 6.4, 0.25, 0, 3.1, -10.12));
  group.add(box(wall, 28.2, 5.0, 0.25, 0, 2.5, 10.12));
  group.add(box(wall, 0.25, 6.4, 20.4, -14.12, 3.1, 0));
  group.add(box(wall, 0.25, 6.4, 20.4, 14.12, 3.1, 0));
  collisions.push(
    { type: 'box', minx: -14.4, maxx: 14.4, minz: -10.3, maxz: -9.95, y0: 0, y1: 6.4 },
    { type: 'box', minx: -14.4, maxx: 14.4, minz: 9.95, maxz: 10.3, y0: 0, y1: 5 },
    { type: 'box', minx: -14.3, maxx: -13.95, minz: -10.2, maxz: 10.2, y0: 0, y1: 6.4 },
    { type: 'box', minx: 13.95, maxx: 14.3, minz: -10.2, maxz: 10.2, y0: 0, y1: 6.4 },
  );

  for (let x = -13.2; x < 13.2; x += 1.2) {
    group.add(box(seam, 0.02, 6.0, 0.02, x, 3.0, -9.98));
    group.add(box(seam, 0.02, 4.6, 0.02, x, 2.3, 9.98));
  }

  // Floor tiles 0.5 m, <4% contrast — instanced, not a warehouse checker
  const tileGeo = new THREE.PlaneGeometry(0.49, 0.49);
  tileGeo.rotateX(-Math.PI / 2);
  const dummy = new THREE.Object3D();
  const slots = [[], []];
  for (let x = -14; x < 14; x += 0.5) {
    for (let z = -10; z < 10; z += 0.5) {
      const even = Math.abs(((x + z) / 0.5) % 2) < 1;
      slots[even ? 0 : 1].push([x + 0.25, floorYAt(x + 0.25, z + 0.25) + 0.003, z + 0.25]);
    }
  }
  [carpet, carpetAlt].forEach((mat, i) => {
    const inst = new THREE.InstancedMesh(tileGeo, mat, slots[i].length);
    inst.receiveShadow = true;
    slots[i].forEach((p, n) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.updateMatrix();
      inst.setMatrixAt(n, dummy.matrix);
    });
    group.add(inst);
  });

  // Solid under-floors so stairs don't show voids
  TIERS.forEach((t) => {
    group.add(box(carpet, 28, 0.08, t.z1 - t.z0, 0, t.y - 0.04, (t.z0 + t.z1) / 2));
    if (t.y > 0) {
      const riser = box(std(MC.wallSeam, 0.7), 28, t.y - (t.y - 0.55), 0.06, 0, t.y / 2, t.z0);
      // actual riser height is 0.55 except first
      riser.scale.y = 1;
      group.add(box(std(MC.wallPanel, 0.8), 28, 0.55, 0.08, 0, t.y - 0.275, t.z0 + 0.02));
      group.add(box(led, 28, 0.02, 0.03, 0, t.y - 0.54, t.z0 + 0.05));
    }
  });
  group.add(box(carpet, 28, 0.08, 3.5, 0, 1.61, 7.75));

  // Stairs in aisles
  for (const ax of AISLE_X) {
    for (let i = 1; i < TIERS.length; i++) {
      const prev = TIERS[i - 1];
      const next = TIERS[i];
      for (let s = 0; s < 3; s++) {
        const sy = prev.y + (s + 1) * 0.183;
        const sz = next.z0 + s * 0.3;
        group.add(box(carpet, 1.8, 0.04, 0.28, ax, sy, sz + 0.12));
      }
      // handrails
      const railZ = (next.z0 + next.z0 + 0.9) / 2;
      group.add(box(steel, 0.03, 0.95, 0.9, ax - 0.88, prev.y + 0.7, railZ));
      group.add(box(steel, 0.03, 0.95, 0.9, ax + 0.88, prev.y + 0.7, railZ));
    }
  }

  // Raked ceiling
  const roof = new THREE.Mesh(new THREE.BoxGeometry(28.2, 0.12, 20.6), ceil);
  roof.position.set(0, 5.3, 0);
  roof.rotation.x = Math.atan2(1.8, 20);
  group.add(roof);
  // Stop short of the display wall at z ≈ −9.7
  for (let i = -4; i <= 4; i++) {
    group.add(box(std(MC.steel, 0.4, 0.7), 0.16, 0.08, 14.2, i * 2.8, 5.12 - i * 0.015, 0.9));
  }

  // VIP glass + silhouettes
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 2.6),
    new THREE.MeshStandardMaterial({
      color: 0x1a222c,
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.4,
    }),
  );
  glass.position.set(0, 2.9, 9.48);
  group.add(glass);
  const sil = std(0x0e1014, 0.9);
  [-1.4, 0, 1.5].forEach((x) => {
    group.add(box(sil, 0.28, 1.5, 0.16, x * 1.6, 2.4, 9.85));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), sil);
    head.position.set(x * 1.6, 3.25, 9.85);
    group.add(head);
  });

  collisions.push(
    { type: 'box', minx: -14, maxx: 14, minz: 9.4, maxz: 9.7, y0: 1.65, y1: 4.2 },
  );

  return { group, collisions, floorYAt };
}
