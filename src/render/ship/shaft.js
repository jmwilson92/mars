import * as THREE from 'three';
import { ARK, DECK_META } from './constants.js';
import { add, placard } from './mats.js';

export function buildShaft(parent, mats) {
  const top = ARK.floorY[0] + ARK.headroom + 0.2;
  const bot = ARK.floorY[6] - 0.05;
  const mid = (top + bot) / 2;
  const h = top - bot;

  const well = new THREE.Mesh(
    new THREE.CylinderGeometry(ARK.shaftR, ARK.shaftR, h, 24, 1, true),
    mats.dark.clone(),
  );
  well.material.side = THREE.DoubleSide;
  well.position.y = mid;
  parent.add(well);

  const rails = [];
  for (let q = 0; q < 4; q++) {
    const a = (q / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.sin(a) * (ARK.shaftR - 0.06);
    const z = -Math.cos(a) * (ARK.shaftR - 0.06);
    add(parent, new THREE.CylinderGeometry(0.028, 0.028, h - 0.2, 6), mats.rail, x, mid, z);
    rails.push({ x, z });
  }

  const rungs = [];
  const rungGeo = new THREE.CylinderGeometry(0.012, 0.012, ARK.shaftR * 1.15, 5);
  const rungMesh = new THREE.InstancedMesh(rungGeo, mats.rail, 80);
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let y = bot + 0.2; y < top - 0.2; y += 0.3) {
    dummy.position.set(0, y, 0);
    dummy.rotation.set(0, 0, Math.PI / 2);
    dummy.updateMatrix();
    rungMesh.setMatrixAt(n++, dummy.matrix);
    rungs.push({ x: 0, y, z: 0 });
  }
  rungMesh.count = n;
  parent.add(rungMesh);

  const grabs = [];
  for (const rail of rails) {
    for (let y = bot + 0.25; y < top - 0.25; y += 0.35) {
      grabs.push({ x: rail.x, y, z: rail.z });
    }
  }

  const interactables = [];
  for (let d = 0; d < 7; d++) {
    const y = ARK.floorY[d];
    const col = DECK_META[d].shaft;
    const strip = add(
      parent,
      new THREE.TorusGeometry(ARK.shaftR - 0.02, 0.018, 6, 24),
      new THREE.MeshStandardMaterial({
        color: col, emissive: col, emissiveIntensity: 0.7, roughness: 0.35,
      }),
      0, y + 0.04, 0,
    );
    strip.rotation.x = Math.PI / 2;

    const ring = add(parent, new THREE.TorusGeometry(ARK.shaftR + 0.04, 0.045, 6, 24), mats.frame, 0, y + 0.03, 0);
    ring.rotation.x = Math.PI / 2;
    add(parent, new THREE.TorusGeometry(ARK.hatchR + 0.08, 0.03, 6, 16), mats.steel, 0, y + 0.06, 0)
      .rotation.x = Math.PI / 2;
    add(parent, new THREE.TorusGeometry(0.09, 0.014, 6, 12), mats.steel, 0.55, y + 0.12, 0);
    placard(parent, mats, `HATCH ${DECK_META[d].id}`, 0.95, y + 0.55, 0.15, -Math.PI / 2);

    if (d === 4) {
      add(parent, new THREE.BoxGeometry(0.18, 0.06, 0.55), mats.warn, 0.55, y + 0.12, 0);
      add(parent, new THREE.BoxGeometry(0.18, 0.06, 0.18), mats.dark, 0.55, y + 0.12, 0.28);
      placard(parent, mats, 'STORM SHELTER', 0.72, y + 0.28, 0, -Math.PI / 2);
    }

    interactables.push({
      id: `hatch_${d}`,
      kind: 'hatchway',
      x: 0,
      z: 0,
      y: y + 1.0,
      deck: d,
      prompt: d === 0
        ? `[E] AFT — ${DECK_META[1].id}`
        : d === 6
          ? `[R] FWD — ${DECK_META[5].id}`
          : `[E] AFT ${DECK_META[d + 1].id}   [R] FWD ${DECK_META[d - 1].id}`,
    });
  }

  const figure = new THREE.Group();
  add(figure, new THREE.CapsuleGeometry(0.09, 0.42, 3, 6), mats.fabric, 0, 0, 0);
  add(figure, new THREE.SphereGeometry(0.1, 8, 6), mats.pad, 0, 0.38, 0.02);
  figure.position.set(0.28, ARK.floorY[3] + 1.4, 0);
  figure.rotation.z = 0.55;
  figure.rotation.x = 0.2;
  parent.add(figure);

  return { interactables, rails, rungs, grabs };
}
