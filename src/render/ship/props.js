import * as THREE from 'three';
import { ARK, polar } from './constants.js';
import { add, placard } from './mats.js';

export function buildFixture(type, spec, ctx) {
  const fn = FIX[type];
  if (fn) fn(spec, ctx);
}

const FIX = {
  cupola(_s, ctx) {
    /* built in windows.buildCupola */
  },
  flight_seats(s, ctx) {
    const y = ctx.y0;
    [[-0.55, -1.35], [0.55, -1.35], [-0.55, -0.15], [0.55, -0.15]].forEach((p, i) => {
      seat(ctx, p[0], y, p[1], i < 2);
      ctx.seats.push({ id: `seat_${i}`, x: p[0], z: p[1], y: y + 0.42 });
      ctx.interactables.push({
        id: `seat_${i}`, kind: 'seat', x: p[0], z: p[1], y: y + 0.5, deck: 0,
        prompt: i < 2 ? '[E] PILOT STATION' : '[E] SIT  [B] BELT',
      });
    });
    horseshoe(ctx, y);
    add(ctx.parent, new THREE.BoxGeometry(1.6, 0.08, 0.55), ctx.mats.dark, 0, y + 1.72, -1.15, -0.45, 0, 0);
    for (let i = 0; i < 8; i++) {
      add(ctx.parent, new THREE.BoxGeometry(0.06, 0.03, 0.04), ctx.mats.warn, -0.5 + i * 0.14, y + 1.74, -1.12, -0.45, 0, 0);
    }
  },
  workstations(s, ctx) {
    for (let i = 0; i < 4; i++) {
      const a = 0.6 + i * 0.7;
      const p = polar(ARK.innerR - 0.7, a, ctx.y0 + 0.85);
      add(ctx.parent, new THREE.BoxGeometry(0.9, 0.08, 0.55), ctx.mats.dark, p.x, ctx.y0 + 0.78, p.z, 0, -a, 0);
      add(ctx.parent, new THREE.BoxGeometry(0.42, 0.28, 0.04), ctx.mats.screen, p.x, ctx.y0 + 1.12, p.z, 0, -a, 0);
      add(ctx.parent, new THREE.BoxGeometry(0.08, 0.45, 0.08), ctx.mats.frame, p.x, ctx.y0 + 1.35, p.z);
      const ids = ['schedule', 'research', 'fleet', 'crew'];
      ctx.interactables.push({
        id: ids[i], kind: 'console', x: p.x, z: p.z, y: ctx.y0 + 1.0, deck: 1,
        prompt: `[E] ${['FLIGHT', 'SCIENCE', 'FLEET', 'CREW'][i]} CONSOLE`,
        panel: ids[i],
      });
    }
    add(ctx.parent, new THREE.BoxGeometry(0.7, 1.9, 0.35), ctx.mats.rack, 2.6, ctx.y0 + 0.95, 1.4);
    for (let i = 0; i < 10; i++) {
      add(ctx.parent, new THREE.BoxGeometry(0.08, 0.05, 0.02), ctx.mats.grow, 2.58, ctx.y0 + 0.3 + i * 0.16, 1.58);
    }
    placard(ctx.parent, ctx.mats, 'COMMS', 2.45, ctx.y0 + 1.95, 1.4, Math.PI);
    add(ctx.parent, new THREE.BoxGeometry(1.4, 0.08, 0.9), ctx.mats.screen, 0, ctx.y0 + 0.92, 1.5);
    add(ctx.parent, new THREE.BoxGeometry(1.45, 0.06, 0.95), ctx.mats.frame, 0, ctx.y0 + 0.86, 1.5);
    for (const a of [0.3, 1.1, 2.0, 2.8]) {
      const p = polar(0.85, a, ctx.y0 + 0.05);
      add(ctx.parent, new THREE.TorusGeometry(0.06, 0.01, 5, 10), ctx.mats.rail, p.x, ctx.y0 + 0.04, p.z);
    }
    placard(ctx.parent, ctx.mats, 'MED-2', 3.3, ctx.y0 + 1.2, -0.4, -1.2);
    placard(ctx.parent, ctx.mats, 'TOOL-A', 3.2, ctx.y0 + 1.2, 0.2, -1.4);
    placard(ctx.parent, ctx.mats, 'EVA-3', 3.1, ctx.y0 + 1.2, 0.8, -1.6);
  },
  staterooms(_s, ctx) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const hasPort = i % 2 === 0;
      const inner = polar(1.55, a, ctx.y0 + 1.1);
      const outer = polar(ARK.innerR - 0.55, a, ctx.y0 + 1.1);
      add(ctx.parent, new THREE.BoxGeometry(0.04, ARK.headroom - 0.1, 1.85), ctx.mats.panel, inner.x, ctx.y0 + 1.12, inner.z, 0, -a, 0);
      add(ctx.parent, new THREE.BoxGeometry(0.55, 0.12, 1.7), ctx.mats.pad, outer.x, ctx.y0 + 0.55, outer.z, 0, -a, 0);
      add(ctx.parent, new THREE.BoxGeometry(0.08, 0.04, 1.5), ctx.mats.belt, outer.x, ctx.y0 + 0.64, outer.z, 0, -a, 0);
      add(ctx.parent, new THREE.BoxGeometry(0.35, 0.04, 0.4), ctx.mats.dark, outer.x * 0.85, ctx.y0 + 0.95, outer.z * 0.85, 0, -a, 0);
      add(ctx.parent, new THREE.BoxGeometry(0.12, 0.16, 0.18), ctx.mats.screen, outer.x * 0.84, ctx.y0 + 1.12, outer.z * 0.84, 0, -a, 0);
      for (let b = 0; b < 3; b++) {
        add(ctx.parent, new THREE.BoxGeometry(0.16, 0.1, 0.22), ctx.mats.fabric, outer.x * 0.78, ctx.y0 + 0.35 + b * 0.14, outer.z * 0.78, 0, -a, 0);
      }
      const fx = [['plant', ctx.mats.plant], ['book', ctx.mats.book], ['pad', ctx.mats.o2]][i % 3];
      add(ctx.parent, new THREE.BoxGeometry(0.08, 0.12, 0.06), fx[1], outer.x * 0.7, ctx.y0 + 1.15, outer.z * 0.7);
      if (hasPort) {
        const wp = polar(ARK.innerR - 0.04, a, ctx.y0 + 1.4);
        add(ctx.parent, new THREE.TorusGeometry(0.16, 0.03, 6, 12), ctx.mats.frame, wp.x, wp.y, wp.z).lookAt(0, wp.y, 0);
        add(ctx.parent, new THREE.CircleGeometry(0.15, 12), ctx.mats.view || ctx.mats.glass, wp.x * 0.97, wp.y, wp.z * 0.97).lookAt(0, wp.y, 0);
      }
    }
    for (const a of [0.4, 3.5]) {
      const p = polar(ARK.innerR - 0.85, a, ctx.y0 + 1.0);
      add(ctx.parent, new THREE.BoxGeometry(0.7, 1.8, 0.7), ctx.mats.dark, p.x, ctx.y0 + 0.9, p.z, 0, -a, 0);
      add(ctx.parent, new THREE.CylinderGeometry(0.12, 0.14, 0.4, 10), ctx.mats.steel, p.x, ctx.y0 + 0.45, p.z);
      add(ctx.parent, new THREE.BoxGeometry(0.25, 0.7, 0.25), ctx.mats.frame, p.x * 0.95, ctx.y0 + 1.15, p.z * 0.95);
      placard(ctx.parent, ctx.mats, 'HYGIENE', p.x, ctx.y0 + 1.9, p.z, -a);
    }
    add(ctx.parent, new THREE.BoxGeometry(0.8, 1.1, 0.45), ctx.mats.rack, -2.4, ctx.y0 + 0.6, 2.0);
    placard(ctx.parent, ctx.mats, 'LAUNDRY', -2.4, ctx.y0 + 1.25, 2.2);
  },
  commons(_s, ctx) {
    add(ctx.parent, new THREE.CylinderGeometry(0.55, 0.55, 0.06, 16), ctx.mats.dark, 0, ctx.y0 + 0.78, 1.35);
    add(ctx.parent, new THREE.BoxGeometry(2.35, 0.05, 1.15), ctx.mats.frame, 0, ctx.y0 + 0.8, 1.35);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add(ctx.parent, new THREE.BoxGeometry(0.32, 0.55, 0.32), ctx.mats.seat, Math.sin(a) * 1.05, ctx.y0 + 0.4, 1.35 + Math.cos(a) * 0.75);
      add(ctx.parent, new THREE.TorusGeometry(0.05, 0.008, 4, 8), ctx.mats.rail, Math.sin(a) * 0.7, ctx.y0 + 0.05, 1.35 + Math.cos(a) * 0.5);
    }
    add(ctx.parent, new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10), ctx.mats.pad, 0.3, ctx.y0 + 0.84, 1.2);
    const ga = 2.3;
    const gp = polar(ARK.innerR - 0.7, ga, ctx.y0 + 0.9);
    add(ctx.parent, new THREE.BoxGeometry(1.6, 1.15, 0.45), ctx.mats.rack, gp.x, ctx.y0 + 0.7, gp.z, 0, -ga, 0);
    add(ctx.parent, new THREE.BoxGeometry(0.25, 0.35, 0.18), ctx.mats.steel, gp.x, ctx.y0 + 1.15, gp.z, 0, -ga, 0);
    add(ctx.parent, new THREE.BoxGeometry(0.3, 0.2, 0.2), ctx.mats.amber, gp.x * 0.95, ctx.y0 + 1.0, gp.z * 0.95);
    add(ctx.parent, new THREE.BoxGeometry(0.4, 0.25, 0.2), ctx.mats.dark, gp.x * 0.92, ctx.y0 + 0.7, gp.z * 0.92);
    placard(ctx.parent, ctx.mats, 'GALLEY', gp.x, ctx.y0 + 1.4, gp.z, -ga);
    ctx.interactables.push({
      id: 'galley', kind: 'system', system: 'plants', x: gp.x, z: gp.z, y: ctx.y0 + 1, deck: 3,
      prompt: '[E] GALLEY',
    });
    exercise(ctx, 4.2, ctx.y0);
    add(ctx.parent, new THREE.BoxGeometry(0.9, 1.2, 0.12), ctx.mats.dark, -2.4, ctx.y0 + 1.1, -2.2);
    add(ctx.parent, new THREE.BoxGeometry(0.7, 0.4, 0.04), ctx.mats.screen, -2.38, ctx.y0 + 1.35, -2.14);
    for (let i = 0; i < 8; i++) {
      add(ctx.parent, new THREE.BoxGeometry(0.08, 0.18, 0.04), ctx.mats.book, -2.55 + (i % 4) * 0.1, ctx.y0 + 0.55 + Math.floor(i / 4) * 0.22, -2.15);
    }
  },
  laboratory(_s, ctx) {
    for (let i = 0; i < 5; i++) {
      const a = -0.4 + i * 0.35;
      const p = polar(ARK.innerR - 0.65, a, ctx.y0 + 0.9);
      add(ctx.parent, new THREE.BoxGeometry(0.7, 0.08, 0.5), ctx.mats.steel, p.x, ctx.y0 + 0.85, p.z, 0, -a, 0);
      add(ctx.parent, new THREE.BoxGeometry(0.28, 0.22, 0.22), ctx.mats.glass, p.x, ctx.y0 + 1.05, p.z);
    }
    const spin = add(ctx.parent, new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), ctx.mats.frame, 2.4, ctx.y0 + 1.05, 0.4);
    spin.userData.spin = 2.4;
    add(ctx.parent, new THREE.BoxGeometry(0.9, 0.7, 0.45), ctx.mats.dark, -2.2, ctx.y0 + 0.5, 1.8);
    add(ctx.parent, new THREE.BoxGeometry(1.6, 0.08, 0.55), ctx.mats.med, -1.6, ctx.y0 + 0.95, -1.8);
    add(ctx.parent, new THREE.BoxGeometry(0.35, 0.08, 0.35), ctx.mats.light, -1.6, ctx.y0 + 1.85, -1.8);
    add(ctx.parent, new THREE.BoxGeometry(0.16, 0.16, 0.02), ctx.mats.med, -1.2, ctx.y0 + 1.45, -2.0);
    placard(ctx.parent, ctx.mats, 'MED BAY', -1.6, ctx.y0 + 1.55, -1.6);
    const sh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 2.1, 20, 1, true),
      ctx.mats.crate,
    );
    sh.material.side = THREE.DoubleSide;
    sh.position.y = ctx.y0 + 1.05;
    sh.userData.shelter = true;
    ctx.parent.add(sh);
    ctx.shelter = sh;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const p = polar(1.42, a, ctx.y0 + 0.55 + (i % 4) * 0.35);
      add(ctx.parent, new THREE.BoxGeometry(0.16, 0.12, 0.08), ctx.mats.pad, p.x, p.y, p.z, 0, -a, 0);
    }
    add(ctx.parent, new THREE.BoxGeometry(0.08, 0.7, 0.08), ctx.mats.water, 1.52, ctx.y0 + 1.1, 0);
    add(ctx.parent, new THREE.BoxGeometry(0.55, 1.9, 0.08), ctx.mats.frame, 1.55, ctx.y0 + 1.05, 0.4);
    ctx.interactables.push({
      id: 'shelter', kind: 'system', system: 'eclss', x: 1.6, z: 0.2, y: ctx.y0 + 1, deck: 4,
      prompt: '[E] STORM SHELTER',
    });
  },
  agriculture(_s, ctx) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.2;
      const p = polar(ARK.innerR - 0.7, a, ctx.y0 + 1.1);
      add(ctx.parent, new THREE.BoxGeometry(0.55, 2.05, 0.4), ctx.mats.rack, p.x, ctx.y0 + 1.05, p.z, 0, -a, 0);
      for (let s = 0; s < 5; s++) {
        add(ctx.parent, new THREE.BoxGeometry(0.5, 0.03, 0.32), ctx.mats.grow, p.x, ctx.y0 + 0.28 + s * 0.38, p.z, 0, -a, 0);
        add(ctx.parent, new THREE.BoxGeometry(0.4, 0.12, 0.08), ctx.mats.plant, p.x, ctx.y0 + 0.38 + s * 0.38, p.z, 0, -a, 0);
      }
      add(ctx.parent, new THREE.BoxGeometry(0.22, 0.22, 0.06), ctx.mats.glass, p.x * 0.92, ctx.y0 + 1.4, p.z * 0.92);
    }
    add(ctx.parent, new THREE.BoxGeometry(0.7, 0.9, 0.5), ctx.mats.steel, -0.2, ctx.y0 + 0.5, 2.4);
    add(ctx.parent, new THREE.CylinderGeometry(0.12, 0.12, 0.4, 10), ctx.mats.water, 0.15, ctx.y0 + 0.55, 2.4);
    add(ctx.parent, new THREE.BoxGeometry(0.9, 0.08, 0.5), ctx.mats.dark, 1.4, ctx.y0 + 0.85, 2.2);
    add(ctx.parent, new THREE.BoxGeometry(0.45, 0.7, 0.4), ctx.mats.steel, -2.2, ctx.y0 + 0.55, -1.6);
    add(ctx.parent, new THREE.BoxGeometry(0.48, 0.72, 0.06), ctx.mats.frame, -2.2, ctx.y0 + 0.55, -1.38);
    placard(ctx.parent, ctx.mats, 'SEED VAULT', -2.2, ctx.y0 + 1.05, -1.35);
    ctx.interactables.push({
      id: 'plants', kind: 'system', system: 'plants', x: 2.6, z: 0, y: ctx.y0 + 1, deck: 5,
      prompt: '[E] TEND PLANTS',
    });
  },
  systems(_s, ctx) {
    for (let i = 0; i < 6; i++) {
      const a = 0.3 + i * 0.32;
      const p = polar(ARK.innerR - 0.55, a, ctx.y0 + 1.0);
      add(ctx.parent, new THREE.BoxGeometry(0.55, 1.7, 0.4), ctx.mats.rack, p.x, ctx.y0 + 0.9, p.z, 0, -a, 0);
      add(ctx.parent, new THREE.BoxGeometry(0.12, 0.08, 0.04), i === 2 ? ctx.mats.grow : ctx.mats.amber, p.x, ctx.y0 + 1.45, p.z, 0, -a, 0);
      if (i === 1) add(ctx.parent, new THREE.BoxGeometry(0.12, 0.25, 0.08), ctx.mats.steel, p.x * 0.9, ctx.y0 + 1.15, p.z * 0.9);
    }
    placard(ctx.parent, ctx.mats, 'ECLSS', 2.8, ctx.y0 + 1.85, 1.2, -0.8);
    ctx.interactables.push({
      id: 'eclss', kind: 'system', system: 'eclss', x: 2.6, z: 1.4, y: ctx.y0 + 1, deck: 6,
      prompt: '[E] SERVICE ECLSS',
    });
    ctx.interactables.push({
      id: 'water', kind: 'system', system: 'water', x: 2.9, z: 0.4, y: ctx.y0 + 1, deck: 6,
      prompt: '[E] SERVICE WATER LOOP',
    });
    const pb = polar(ARK.innerR - 0.6, 3.4, ctx.y0 + 0.95);
    add(ctx.parent, new THREE.BoxGeometry(1.2, 1.5, 0.4), ctx.mats.dark, pb.x, ctx.y0 + 0.8, pb.z, 0, -3.4, 0);
    for (let i = 0; i < 8; i++) {
      add(ctx.parent, new THREE.BoxGeometry(0.08, 0.14, 0.04), ctx.mats.amber, pb.x, ctx.y0 + 0.4 + i * 0.16, pb.z, 0, -3.4, 0);
    }
    ctx.interactables.push({
      id: 'power', kind: 'system', system: 'power', x: pb.x, z: pb.z, y: ctx.y0 + 1, deck: 6,
      prompt: '[E] CHECK POWER',
    });
    add(ctx.parent, new THREE.CylinderGeometry(1.1, 1.1, 2.05, 16, 1, true), ctx.mats.steel, -2.2, ctx.y0 + 1.05, -1.6);
    add(ctx.parent, new THREE.CircleGeometry(1.05, 16), ctx.mats.dark, -2.2, ctx.y0 + 0.04, -1.6).rotation.x = -Math.PI / 2;
    add(ctx.parent, new THREE.TorusGeometry(0.42, 0.04, 6, 16), ctx.mats.frame, -1.15, ctx.y0 + 1.05, -1.6);
    add(ctx.parent, new THREE.CircleGeometry(0.4, 14), ctx.mats.dark, -1.12, ctx.y0 + 1.05, -1.6);
    placard(ctx.parent, ctx.mats, 'AIRLOCK', -2.2, ctx.y0 + 2.05, -1.6);
    ctx.interactables.push({
      id: 'hatch', kind: 'hatch', x: -1.2, z: -1.6, y: ctx.y0 + 1, deck: 6,
      prompt: '[E] DOCK HATCH',
    });
    ctx.interactables.push({
      id: 'elevator', kind: 'elevator', x: 3.15, z: 0, y: ctx.y0 + 1, deck: 6,
      prompt: '[E] ELEVATOR TO SURFACE',
    });
    for (let i = 0; i < 4; i++) {
      add(ctx.parent, new THREE.BoxGeometry(0.28, 1.45, 0.18), ctx.mats.fabric, -0.6 + i * 0.38, ctx.y0 + 0.8, 2.5);
      add(ctx.parent, new THREE.SphereGeometry(0.12, 8, 6), ctx.mats.dark, -0.6 + i * 0.38, ctx.y0 + 1.65, 2.5);
    }
    for (let i = 0; i < 6; i++) {
      add(ctx.parent, new THREE.BoxGeometry(0.45, 0.28, 0.35), ctx.mats.crate, 1.2 + (i % 3) * 0.5, ctx.y0 + 0.22, 1.6 + Math.floor(i / 3) * 0.45);
    }
    add(ctx.parent, new THREE.BoxGeometry(1.6, 0.04, 1.1), ctx.mats.rail, 1.7, ctx.y0 + 0.55, 1.8);
    ctx.interactables.push(
      { id: 'crate_food', kind: 'crate', item: 'food', x: 1.2, z: 1.6, y: ctx.y0 + 0.3, deck: 6, prompt: '[E] MOVE FOOD PALLET' },
      { id: 'crate_water', kind: 'crate', item: 'water', x: 1.7, z: 1.6, y: ctx.y0 + 0.3, deck: 6, prompt: '[E] MOVE WATER' },
      { id: 'crate_air', kind: 'crate', item: 'air', x: 2.2, z: 1.6, y: ctx.y0 + 0.3, deck: 6, prompt: '[E] MOVE ECLSS BOTTLES' },
      { id: 'crate_fuel', kind: 'crate', item: 'fuel', x: 1.2, z: 2.05, y: ctx.y0 + 0.3, deck: 6, prompt: '[E] MOVE PROPELLANT UMBILICAL' },
      { id: 'refuel', kind: 'refuel', x: 0.2, z: 2.7, y: ctx.y0 + 1, deck: 6, prompt: '[E] REFUEL VALVE' },
    );
    add(ctx.parent, new THREE.CircleGeometry(ARK.shaftR + 0.15, 16), ctx.mats.warn, 0, ctx.y0 + 0.01, 0)
      .rotation.x = -Math.PI / 2;
    placard(ctx.parent, ctx.mats, 'TANK DECK — SEALED', 0.9, ctx.y0 + 0.35, -0.2);
  },
};

function seat(ctx, x, y, z, pilot) {
  add(ctx.parent, new THREE.BoxGeometry(0.48, 0.08, 0.5), ctx.mats.frame, x, y + 0.42, z);
  add(ctx.parent, new THREE.BoxGeometry(0.48, 0.08, 0.5), ctx.mats.pad, x, y + 0.46, z);
  add(ctx.parent, new THREE.BoxGeometry(0.48, 0.55, 0.08), ctx.mats.frame, x, y + 0.72, z + 0.22);
  add(ctx.parent, new THREE.BoxGeometry(0.44, 0.45, 0.04), ctx.mats.pad, x, y + 0.72, z + 0.18);
  add(ctx.parent, new THREE.BoxGeometry(0.03, 0.02, 0.4), ctx.mats.belt, x - 0.12, y + 0.5, z);
  add(ctx.parent, new THREE.BoxGeometry(0.03, 0.02, 0.4), ctx.mats.belt, x + 0.12, y + 0.5, z);
  add(ctx.parent, new THREE.BoxGeometry(0.03, 0.35, 0.02), ctx.mats.belt, x, y + 0.62, z + 0.05);
  if (pilot) add(ctx.parent, new THREE.BoxGeometry(0.16, 0.08, 0.16), ctx.mats.steel, x + 0.28, y + 0.7, z - 0.15);
}

function horseshoe(ctx, y) {
  add(ctx.parent, new THREE.BoxGeometry(2.2, 0.08, 0.55), ctx.mats.dark, 0, y + 0.78, -2.15);
  for (let i = 0; i < 6; i++) {
    add(ctx.parent, new THREE.BoxGeometry(0.28, 0.18, 0.03), ctx.mats.screen, -0.85 + i * 0.34, y + 0.98, -2.32);
  }
  add(ctx.parent, new THREE.BoxGeometry(0.12, 0.06, 0.08), ctx.mats.fire, 0.95, y + 0.86, -2.05);
}

function exercise(ctx, a, y0) {
  const p = polar(ARK.innerR - 0.85, a, y0 + 0.7);
  add(ctx.parent, new THREE.BoxGeometry(0.7, 1.15, 0.35), ctx.mats.frame, p.x, y0 + 0.7, p.z, 0, -a, 0);
  add(ctx.parent, new THREE.BoxGeometry(1.4, 0.12, 0.5), ctx.mats.dark, p.x * 0.7, y0 + 0.18, p.z * 0.7, 0, -a, 0);
  add(ctx.parent, new THREE.BoxGeometry(0.04, 0.7, 0.04), ctx.mats.belt, p.x * 0.7, y0 + 0.7, p.z * 0.7);
  add(ctx.parent, new THREE.BoxGeometry(0.04, 0.7, 0.04), ctx.mats.belt, p.x * 0.62, y0 + 0.7, p.z * 0.62);
  const q = polar(ARK.innerR - 0.9, a + 0.55, y0 + 0.45);
  add(ctx.parent, new THREE.BoxGeometry(0.35, 0.7, 0.7), ctx.mats.seat, q.x, y0 + 0.45, q.z, 0, -a, 0);
}

export function warnStripe(mats) {
  return new THREE.MeshStandardMaterial({
    color: 0xc8a020, roughness: 0.6, emissive: 0x3a2a00, emissiveIntensity: 0.2,
  });
}
