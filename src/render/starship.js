import * as THREE from 'three';

/** Stainless two-stage methalox stack. 1 unit = 1 meter. */

export const SHIP = {
  radius: 4.5,
  boosterH: 69,
  shipH: 48,
  noseH: 11,
  totalH: 69 + 48 + 11,
  cabinY: 118,
  landedY: -(69 + 2.2),
  midY: 69 + 2.2 + 24,
};

SHIP.cabinYLanded = SHIP.cabinY + SHIP.landedY;

function steelMat(map, metal = 0.92, rough = 0.28) {
  return new THREE.MeshStandardMaterial({
    map,
    color: 0xd8dee6,
    metalness: metal,
    roughness: rough,
  });
}

function tileMat(map) {
  return new THREE.MeshStandardMaterial({
    map,
    color: 0x1a1a1a,
    metalness: 0.15,
    roughness: 0.72,
  });
}

function addEngine(parent, mat, y, r, count, radius) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r, 2.4, 10, 1, true), mat);
    bell.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
    bell.castShadow = true;
    parent.add(bell);
  }
}

export function buildStarship(tex) {
  const group = new THREE.Group();
  group.name = 'starship';

  const steel = steelMat(tex.steel);
  const steelFine = steelMat(tex.steelFine, 0.88, 0.22);
  const tiles = tileMat(tex.heattile);
  const soot = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: 0.4, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111114, metalness: 0.6, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x7ec8ff,
    metalness: 0.2,
    roughness: 0.05,
    transparent: true,
    opacity: 0.45,
    emissive: 0x113344,
    emissiveIntensity: 0.2,
  });
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xffc070,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const boosterRig = new THREE.Group();
  boosterRig.name = 'booster';
  const booster = new THREE.Mesh(new THREE.CylinderGeometry(SHIP.radius, SHIP.radius, SHIP.boosterH, 32), steel);
  booster.position.y = SHIP.boosterH / 2;
  booster.castShadow = true;
  booster.receiveShadow = true;
  boosterRig.add(booster);

  const hot = new THREE.Mesh(new THREE.CylinderGeometry(SHIP.radius * 1.04, SHIP.radius * 1.04, 2.2, 24), soot);
  hot.position.y = SHIP.boosterH + 1.1;
  group.add(hot);

  const ship = new THREE.Mesh(new THREE.CylinderGeometry(SHIP.radius, SHIP.radius, SHIP.shipH, 32), steelFine);
  ship.position.y = SHIP.boosterH + 2.2 + SHIP.shipH / 2;
  ship.castShadow = true;
  group.add(ship);

  const belly = new THREE.Mesh(
    new THREE.CylinderGeometry(SHIP.radius + 0.04, SHIP.radius + 0.04, SHIP.shipH * 0.7, 32, 1, true, Math.PI * 0.65, Math.PI * 0.7),
    tiles,
  );
  belly.position.y = ship.position.y - 4;
  group.add(belly);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(SHIP.radius, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), tiles);
  nose.position.y = SHIP.boosterH + 2.2 + SHIP.shipH;
  nose.scale.set(1, SHIP.noseH / SHIP.radius, 1);
  group.add(nose);

  const windY = SHIP.cabinY;
  for (const a of [-0.18, 0, 0.18]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 1.1), glass);
    w.position.set(Math.cos(a) * (SHIP.radius - 0.05), windY, Math.sin(a) * (SHIP.radius - 0.05));
    w.lookAt(0, windY, 0);
    group.add(w);
  }

  function flap(xSign, y, zSign) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8.5, 3.6), steelFine);
    f.position.set(xSign * (SHIP.radius + 0.4), y, zSign * 2.2);
    f.rotation.z = xSign * 0.18;
    f.castShadow = true;
    group.add(f);
  }
  flap(1, SHIP.boosterH + 12, 1);
  flap(-1, SHIP.boosterH + 12, 1);
  flap(1, SHIP.totalH - 18, -1);
  flap(-1, SHIP.totalH - 18, -1);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 2.6), dark);
    fin.position.set(Math.cos(a) * (SHIP.radius + 1.1), SHIP.boosterH - 8, Math.sin(a) * (SHIP.radius + 1.1));
    fin.lookAt(0, SHIP.boosterH - 8, 0);
    boosterRig.add(fin);
  }

  addEngine(boosterRig, soot, 0.2, 0.85, 12, 3.2);
  addEngine(boosterRig, soot, 0.2, 0.7, 8, 1.6);
  addEngine(group, soot, SHIP.boosterH + 2.4, 0.7, 6, 2.4);

  const plumes = new THREE.Group();
  plumes.name = 'plumes';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.ConeGeometry(0.55, 14, 8, 1, true), plumeMat.clone());
    p.rotation.x = Math.PI;
    p.position.set(Math.cos(a) * 2.2, SHIP.boosterH + 1.2, Math.sin(a) * 2.2);
    plumes.add(p);
  }
  group.add(plumes);

  const boosterPlumes = new THREE.Group();
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.ConeGeometry(0.7, 18, 8, 1, true), plumeMat.clone());
    p.rotation.x = Math.PI;
    p.position.set(Math.cos(a) * 2.8, -8, Math.sin(a) * 2.8);
    boosterPlumes.add(p);
  }
  boosterRig.add(boosterPlumes);
  group.add(boosterRig);

  const legs = new THREE.Group();
  legs.name = 'legs';
  legs.visible = false;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 6, 8), steel);
    leg.position.set(Math.cos(a) * 5.2, SHIP.boosterH + 4.8, Math.sin(a) * 5.2);
    leg.rotation.z = Math.cos(a) * 0.4;
    leg.rotation.x = -Math.sin(a) * 0.4;
    legs.add(leg);
  }
  group.add(legs);

  const lift = new THREE.Group();
  lift.name = 'elevator';
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 46, 0.18), steelFine);
  rail.position.set(SHIP.radius + 0.55, SHIP.boosterH + 25, 0);
  lift.add(rail);
  const cage = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 1.1), steelFine);
  cage.position.set(SHIP.radius + 1.15, SHIP.cabinY - 1.2, 0);
  lift.add(cage);
  group.add(lift);

  let recovered = false;
  let onLand = null;

  function paintPlume(root, amount) {
    for (const child of root.children) {
      child.material.opacity = amount * 0.55;
      child.scale.y = 0.4 + amount * 1.4;
    }
  }

  return {
    group,
    plumes,
    legs,
    booster,
    boosterRig,
    setPlume(amount) {
      paintPlume(plumes, amount);
      if (!boosterRig.userData.rec) paintPlume(boosterPlumes, amount);
    },
    separateBooster(world) {
      if (boosterRig.userData.rec || !world) {
        booster.visible = false;
        hot.visible = false;
        return;
      }
      const wp = new THREE.Vector3();
      const wq = new THREE.Quaternion();
      boosterRig.getWorldPosition(wp);
      boosterRig.getWorldQuaternion(wq);
      if (boosterRig.parent) boosterRig.parent.remove(boosterRig);
      world.add(boosterRig);
      boosterRig.position.copy(wp);
      boosterRig.quaternion.copy(wq);
      boosterRig.userData.rec = { t: 0, done: false };
      hot.visible = false;
    },
    tickBooster(dt) {
      const rec = boosterRig.userData.rec;
      if (!rec || rec.done) return false;
      rec.t += dt;
      const t = rec.t;
      if (t < 1.5) {
        boosterRig.rotation.z = (t / 1.5) * Math.PI;
        paintPlume(boosterPlumes, 0.25);
      } else if (t < 5) {
        paintPlume(boosterPlumes, 1);
        boosterRig.position.x -= 22 * dt;
        boosterRig.position.y -= 10 * dt;
      } else if (t < 9.5) {
        paintPlume(boosterPlumes, 0.9);
        boosterRig.rotation.z += (0 - boosterRig.rotation.z) * Math.min(1, dt * 2);
        boosterRig.position.y = Math.max(SHIP.boosterH / 2, boosterRig.position.y - 28 * dt);
        boosterRig.position.x -= 4 * dt;
      } else {
        paintPlume(boosterPlumes, 0);
        boosterRig.position.y = SHIP.boosterH / 2;
        boosterRig.rotation.set(0, 0, 0);
        rec.done = true;
        recovered = true;
        onLand?.();
        return true;
      }
      return false;
    },
    showBooster() {
      recovered = false;
      booster.visible = true;
      hot.visible = true;
      boosterRig.userData.rec = null;
      boosterRig.position.set(0, 0, 0);
      boosterRig.rotation.set(0, 0, 0);
      if (boosterRig.parent !== group) {
        boosterRig.parent?.remove(boosterRig);
        group.add(boosterRig);
      }
      paintPlume(boosterPlumes, 0);
    },
    onBoosterLand(fn) { onLand = fn; },
    get boosterDown() { return recovered; },
    hot,
  };
}
