import * as THREE from 'three';
import { ARK, polar } from './constants.js';

export function buildHandrails(parent, mats) {
  const runs = [];
  for (let d = 0; d < ARK.decks; d++) {
    const y0 = ARK.floorY[d];
    wallRuns(runs, y0);
    ceilingRuns(runs, y0);
    shaftRuns(runs, y0);
  }

  const railGeo = new THREE.CylinderGeometry(0.022, 0.022, 1, 6);
  const brkGeo = new THREE.BoxGeometry(0.028, 0.06, 0.028);
  const railMesh = new THREE.InstancedMesh(railGeo, mats.rail, runs.length);
  const brkMesh = new THREE.InstancedMesh(brkGeo, mats.frame, runs.length * 2);
  const dummy = new THREE.Object3D();
  const grabs = [];
  let bi = 0;

  runs.forEach((run, i) => {
    const dx = run.bx - run.ax;
    const dy = run.by - run.ay;
    const dz = run.bz - run.az;
    const len = Math.hypot(dx, dy, dz) || 0.3;
    dummy.position.set((run.ax + run.bx) / 2, (run.ay + run.by) / 2, (run.az + run.bz) / 2);
    dummy.scale.set(1, len, 1);
    dummy.lookAt(run.bx, run.by, run.bz);
    dummy.rotateX(Math.PI / 2);
    dummy.updateMatrix();
    railMesh.setMatrixAt(i, dummy.matrix);
    dummy.scale.set(1, 1, 1);
    dummy.position.set(run.ax, run.ay, run.az);
    dummy.updateMatrix();
    brkMesh.setMatrixAt(bi++, dummy.matrix);
    dummy.position.set(run.bx, run.by, run.bz);
    dummy.updateMatrix();
    brkMesh.setMatrixAt(bi++, dummy.matrix);
    const steps = 3;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      grabs.push({
        x: run.ax + dx * t,
        y: run.ay + dy * t,
        z: run.az + dz * t,
      });
    }
  });
  parent.add(railMesh);
  parent.add(brkMesh);
  return { grabs, count: runs.length };
}

function wallRuns(runs, y0) {
  const r = ARK.innerR - 0.2;
  const ys = [y0 + 0.98, y0 + 1.52];
  for (const y of ys) {
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * Math.PI * 2;
      const a1 = ((i + 0.7) / 10) * Math.PI * 2;
      const a = polar(r, a0, y);
      const b = polar(r, a1, y);
      runs.push({ ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z });
    }
  }
}

function ceilingRuns(runs, y0) {
  const y = y0 + ARK.headroom - 0.12;
  const r = ARK.innerR - 0.55;
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2;
    const a1 = ((i + 0.55) / 8) * Math.PI * 2;
    const a = polar(r, a0, y);
    const b = polar(r, a1, y);
    runs.push({ ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z });
  }
}

function shaftRuns(runs, y0) {
  const r = ARK.shaftR + 0.07;
  const y = y0 + 1.15;
  for (let i = 0; i < 4; i++) {
    const a0 = (i / 4) * Math.PI * 2;
    const a1 = a0 + 0.9;
    const a = polar(r, a0, y);
    const b = polar(r, a1, y);
    runs.push({ ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z });
  }
}

export function nearestRail(pos, grabs, max = 0.55) {
  let best = null;
  let bestD = max;
  for (const g of grabs) {
    const d = Math.hypot(pos.x - g.x, pos.y - g.y, pos.z - g.z);
    if (d < bestD) {
      best = g;
      bestD = d;
    }
  }
  return best;
}
