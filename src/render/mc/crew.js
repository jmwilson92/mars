import * as THREE from 'three';
import { MC } from './palette.js';

const SKIN = MC.skin;
const HAIR = MC.hair;
const TOPS = MC.tops;
const BOTTOMS = MC.bottoms;

function share(cache, key, make) {
  if (!cache[key]) cache[key] = make();
  return cache[key];
}

export function createCrewMember(seed, mats) {
  let a = seed >>> 0;
  const rng = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const h = 1.62 + rng() * 0.26;
  const skin = pick(SKIN);
  const hairC = pick(HAIR);
  const top = pick(TOPS);
  const bot = pick(BOTTOMS);
  const glasses = rng() < 0.25;
  const headset = rng() < 0.4;
  const hairStyle = Math.floor(rng() * 6);

  const g = new THREE.Group();
  g.scale.setScalar(h / 1.75);
  const skinM = share(mats, `s${skin}`, () => new THREE.MeshStandardMaterial({ color: skin, roughness: 0.65 }));
  const topM = share(mats, `t${top}`, () => new THREE.MeshStandardMaterial({ color: top, roughness: 0.7 }));
  const botM = share(mats, `b${bot}`, () => new THREE.MeshStandardMaterial({ color: bot, roughness: 0.75 }));
  const hairM = share(mats, `h${hairC}`, () => new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.8 }));
  const shoeM = share(mats, 'shoe', () => new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.6 }));
  const dark = share(mats, 'dark', () => new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.5 }));

  const torso = new THREE.Group();
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.24), topM);
  chest.position.y = 1.15;
  torso.add(chest);
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.22), botM);
  hips.position.y = 0.8;
  torso.add(hips);
  g.add(torso);

  const head = new THREE.Group();
  head.position.y = 1.58;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.125, 18, 16), skinM);
  head.add(skull);
  const white = share(mats, 'eyeW', () => new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.4 }));
  const iris = share(mats, 'iris', () => new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 0.35 }));
  const lip = share(mats, 'lip', () => new THREE.MeshStandardMaterial({ color: 0x8a4038, roughness: 0.55 }));
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), white);
  eyeL.position.set(-0.038, 0.018, 0.108);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.038;
  const pupL = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), iris);
  pupL.position.set(-0.036, 0.016, 0.124);
  const pupR = pupL.clone();
  pupR.position.x = 0.036;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.028, 0.024), skinM);
  nose.position.set(0, -0.012, 0.118);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.01, 0.012), lip);
  mouth.position.set(0, -0.048, 0.11);
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), skinM);
  earL.position.set(-0.118, 0, 0);
  const earR = earL.clone();
  earR.position.x = 0.118;
  head.add(eyeL, eyeR, pupL, pupR, nose, mouth, earL, earR);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.06, 8), skinM);
  neck.position.y = -0.17;
  head.add(neck);
  addHair(head, hairStyle, hairM);
  if (glasses) {
    const frame = share(mats, 'frame', () => new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }));
    const gL = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.004, 6, 12), frame);
    gL.position.set(-0.038, 0.018, 0.118);
    const gR = gL.clone();
    gR.position.x = 0.038;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.005, 0.005), frame);
    bridge.position.set(0, 0.018, 0.122);
    head.add(gL, gR, bridge);
  }
  if (headset) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.01, 6, 16, Math.PI), dark);
    band.rotation.z = Math.PI;
    band.position.z = -0.01;
    head.add(band);
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), dark);
    cup.position.set(0.13, 0, 0);
    const cup2 = cup.clone();
    cup2.position.x = -0.13;
    head.add(cup, cup2);
  }
  // lanyard + badge
  const lace = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.28, 0.008), dark);
  lace.position.set(0, 1.28, 0.13);
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.008), share(mats, 'badge', () => new THREE.MeshStandardMaterial({ color: 0xc8cdd4, roughness: 0.4 })));
  badge.position.set(0, 1.12, 0.135);
  g.add(head, lace, badge);

  const armL = new THREE.Group();
  armL.position.set(-0.26, 1.32, 0);
  armL.add(limb(0.3, 0.05, topM, 0, -0.15, 0));
  armL.add(limb(0.28, 0.042, skinM, 0, -0.42, 0.02));
  const handL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.13), skinM);
  handL.position.set(0, -0.58, 0.02);
  armL.add(handL);
  const armR = armL.clone();
  armR.position.x = 0.26;
  g.add(armL, armR);

  const legL = new THREE.Group();
  legL.position.set(-0.1, 0.72, 0);
  legL.add(limb(0.44, 0.07, botM, 0, -0.2, 0));
  legL.add(limb(0.42, 0.055, botM, 0, -0.52, 0));
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.26), shoeM);
  foot.position.set(0, -0.76, 0.05);
  legL.add(foot);
  const legR = legL.clone();
  legR.position.x = 0.1;
  g.add(legL, legR);

  const shadow = contact();
  g.add(shadow);

  g.userData = {
    head, torso, armL, armR, legL, legR,
    phase: rng() * 10,
    blinkIn: 3 + rng() * 4,
    seated: true,
    mode: 'sit',
    wait: 4 + rng() * 16,
    waypoints: [],
    seed,
    rng,
  };
  return g;
}

function limb(len, r, m, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len - r * 2, 3, 6), m);
  mesh.position.set(x, y, z);
  return mesh;
}

function addHair(head, style, mat) {
  // Hair sits on the crown and back only — never a sphere over the face.
  if (style === 0) head.add(cap(0.128, mat, 0, 0.055, -0.02));
  else if (style === 1) head.add(cap(0.118, mat, 0, 0.07, -0.015));
  else if (style === 2) {
    head.add(cap(0.128, mat, 0, 0.055, -0.018));
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), mat);
    bun.position.set(0, 0.1, -0.09);
    head.add(bun);
  } else if (style === 3) {
    head.add(cap(0.126, mat, 0, 0.055, -0.02));
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.14, 3, 6), mat);
    tail.position.set(0, 0.0, -0.12);
    tail.rotation.x = 0.7;
    head.add(tail);
  } else if (style === 4) {
    head.add(cap(0.138, mat, 0, 0.05, -0.012));
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat);
    puff.position.set(0, 0.08, -0.06);
    head.add(puff);
  } else {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 12), mat);
    rim.rotation.x = 1.15;
    rim.position.set(0, 0.05, -0.02);
    head.add(rim);
  }
}

function cap(r, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), mat);
  m.position.set(x, y, z);
  return m;
}

function contact() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 16, 2, 16, 16, 15);
  grd.addColorStop(0, 'rgba(0,0,0,0.4)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 32);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.4),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.35, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  return m;
}

export function setCrewEvent(members, event) {
  members.forEach((m) => {
    m.userData.event = event;
    m.userData.eventT = 0;
  });
}

export function tickCrew(member, dt, lookingAtScreen = true) {
  const u = member.userData;
  u.phase += dt;
  u.eventT = (u.eventT || 0) + dt;
  u.blinkIn -= dt;
  const ev = u.event || 'nominal';
  if (ev === 'loss') {
    u.head.rotation.x = 0.35;
    u.head.rotation.y = 0;
    u.torso.position.y = 0;
    u.armL.rotation.x = 0.4;
    u.armR.rotation.x = 0.4;
    return;
  }
  if (ev === 'launch') {
    u.head.rotation.y = 0;
    u.head.rotation.x = -0.12;
    u.torso.position.y = Math.sin(u.phase * 0.8) * 0.002;
    return;
  }
  if (ev === 'land' && u.eventT < 8) {
    u.torso.position.y = 0.08 + Math.sin(u.phase * 8) * 0.02;
    u.armL.rotation.x = -0.8;
    u.armR.rotation.x = -0.9;
    return;
  }
  const breath = Math.sin(u.phase * 1.57) * 0.006;
  u.torso.position.y = breath;
  if (u.seated) {
    u.head.rotation.y = Math.sin(u.phase * 0.35) * 0.22 + (lookingAtScreen ? 0 : 0.15);
    u.head.rotation.x = -0.04;
    u.legL.rotation.x = -1.52;
    u.legR.rotation.x = -1.48;
    if (u.phase % 8 < 2.4) {
      u.armL.rotation.x = Math.sin(u.phase * 14) * 0.08;
      u.armR.rotation.x = Math.sin(u.phase * 14 + 1) * 0.08;
    } else {
      u.armL.rotation.x = 0.15;
      u.armR.rotation.x = 0.2;
    }
  } else if (u.mode === 'stand') {
    u.head.rotation.y = Math.sin(u.phase * 0.4) * 0.35;
    u.head.rotation.x = 0;
    u.legL.rotation.x = 0;
    u.legR.rotation.x = 0;
    u.armL.rotation.x = 0.05;
    u.armR.rotation.x = -0.04;
  } else {
    const swing = Math.sin(u.phase * 6);
    u.legL.rotation.x = swing * 0.45;
    u.legR.rotation.x = -swing * 0.45;
    u.armL.rotation.x = -swing * 0.35;
    u.armR.rotation.x = swing * 0.35;
    u.torso.position.y = Math.abs(swing) * 0.03;
  }
}

const SIT_Z = 0.70;
const STAND_Z = 0.95;

function sitAt(m) {
  const d = m.userData.desk;
  const scale = m.scale.x || 1;
  // Hip is at local y=0.72. Chair seat is at 0.46. Drop the body onto the cushion.
  const sitY = 0.44 - 0.72 * scale;
  m.position.set(d.x, d.y + sitY, d.z + SIT_Z);
  m.rotation.y = Math.PI;
  m.userData.seated = true;
  m.userData.mode = 'sit';
  m.userData.waypoints = [];
}

function standAt(m, floorYAt) {
  const d = m.userData.desk;
  m.position.set(d.x, floorYAt(d.x, d.z + STAND_Z), d.z + STAND_Z);
  m.rotation.y = Math.PI + (m.userData.rng() - 0.5) * 0.6;
  m.userData.seated = false;
  m.userData.mode = 'stand';
  m.userData.waypoints = [];
}

function startWalk(m) {
  const d = m.userData.desk;
  const rng = m.userData.rng;
  const aisle = d.x < 0 ? -5 : 5;
  const zTrip = -6.2 + rng() * 12.2;
  m.userData.seated = false;
  m.userData.mode = 'walk';
  m.userData.waypoints = [
    { x: aisle, z: d.z + STAND_Z },
    { x: aisle, z: zTrip },
    { x: aisle, z: d.z + STAND_Z },
    { x: d.x, z: d.z + STAND_Z },
  ];
}

function stepTo(m, tx, tz, dt, speed, floorYAt) {
  const dx = tx - m.position.x;
  const dz = tz - m.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.08) return true;
  const step = Math.min(dist, speed * dt);
  m.position.x += (dx / dist) * step;
  m.position.z += (dz / dist) * step;
  m.position.y = floorYAt(m.position.x, m.position.z);
  m.rotation.y = Math.atan2(dx, dz);
  return false;
}

export function populateCrew(slots) {
  const mats = {};
  const seated = [];
  slots.forEach((s, i) => {
    const m = createCrewMember((0xC2E11 + i * 9973) >>> 0, mats);
    m.userData.desk = { x: s.x, y: s.y, z: s.z };
    m.userData.wait = 6 + (i % 7) * 2.4;
    sitAt(m);
    if (i % 11 === 3) {
      m.userData.mode = 'stand';
      m.userData.seated = false;
      m.position.set(s.x, s.y, s.z + STAND_Z);
    }
    seated.push(m);
  });
  return { seated, walkers: [], all: seated };
}

export function tickFloor(members, dt, floorYAt) {
  for (const m of members) {
    const u = m.userData;
    if (u.event === 'launch' || u.event === 'loss') {
      sitAt(m);
      tickCrew(m, dt, true);
      continue;
    }
    u.wait -= dt;
    if (u.mode === 'sit') {
      if (u.wait <= 0) {
        const r = u.rng();
        if (r < 0.45) {
          standAt(m, floorYAt);
          u.wait = 3 + u.rng() * 6;
        } else if (r < 0.75) {
          startWalk(m);
        } else {
          u.wait = 8 + u.rng() * 14;
        }
      }
      tickCrew(m, dt, true);
    } else if (u.mode === 'stand') {
      if (u.wait <= 0) {
        if (u.rng() < 0.55) {
          sitAt(m);
          u.wait = 10 + u.rng() * 16;
        } else {
          startWalk(m);
        }
      }
      tickCrew(m, dt, false);
    } else if (u.mode === 'walk') {
      const wp = u.waypoints[0];
      if (!wp) {
        sitAt(m);
        u.wait = 10 + u.rng() * 18;
      } else if (stepTo(m, wp.x, wp.z, dt, 1.25, floorYAt)) {
        u.waypoints.shift();
        if (!u.waypoints.length) {
          sitAt(m);
          u.wait = 10 + u.rng() * 18;
        }
      }
      tickCrew(m, dt, false);
    }
  }
}
