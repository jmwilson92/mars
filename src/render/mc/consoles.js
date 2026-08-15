import * as THREE from 'three';
import { MC } from './palette.js';
import { TIERS, AISLE_X, AISLE_HALF } from './shell.js';
import { makeDeskScreens } from './screens.js';

function contactShadow(w = 0.9) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 30);
  grd.addColorStop(0, 'rgba(0,0,0,0.45)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, w * 0.7),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.015;
  return m;
}

export function consoleSlots() {
  const slots = [];
  const layout = {
    6: [-11.2, -8.2, -2.2, 2.2, 8.2, 11.2],
    8: [-12.2, -9.4, -7.0, -2.2, 2.2, 7.0, 9.4, 12.2],
  };
  TIERS.forEach((t) => {
    const xs = layout[t.seats];
    xs.forEach((x, i) => {
      if (AISLE_X.some((a) => Math.abs(x - a) < AISLE_HALF + 0.7)) return;
      slots.push({
        x,
        z: t.z0 + 1.15,
        y: t.y,
        tier: t.id,
        i,
      });
    });
  });
  return slots;
}

function buildDesk(screens, variant) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.7, 0.85),
    new THREE.MeshStandardMaterial({ color: MC.consoleBody, roughness: 0.7 }),
  );
  body.position.y = 0.35;
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(1.82, 0.04, 0.87),
    new THREE.MeshStandardMaterial({ color: MC.consoleTop, roughness: 0.45 }),
  );
  top.position.y = 0.72;
  g.add(body, top);

  const bezel = new THREE.MeshStandardMaterial({ color: MC.bezel, roughness: 0.4 });
  const xs = [-0.64, 0, 0.64];
  const yaws = [0.16, 0, -0.16];
  xs.forEach((x, i) => {
    const mon = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.3, 0.03), bezel);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.496, 0.276),
      new THREE.MeshBasicMaterial({ map: screens[(variant + i) % screens.length].texture }),
    );
    glass.position.z = 0.016;
    mon.add(frame, glass);
    mon.position.set(x, 1.04, -0.28);
    mon.rotation.y = yaws[i];
    mon.rotation.x = -0.1;
    g.add(mon);
  });

  const key = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.02, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x1a1e24, emissive: 0x102018, emissiveIntensity: 0.2, roughness: 0.5 }),
  );
  key.position.set(0, 0.75, 0.12);
  g.add(key);
  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.1), new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.4 }));
  mouse.position.set(0.32, 0.75, 0.14);
  g.add(mouse);

  const phone = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.04, 0.16),
    new THREE.MeshStandardMaterial({ color: variant % 2 ? 0x8a2020 : 0xc8b8a0, roughness: 0.5 }),
  );
  phone.position.set(-0.72, 0.76, 0.18);
  g.add(phone);

  if (variant % 5 < 2) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.025, 0.08, 10),
      new THREE.MeshStandardMaterial({ color: 0xe8e0d4, roughness: 0.6 }),
    );
    cup.position.set(0.55 + (variant % 3) * 0.04, 0.78, 0.22);
    g.add(cup);
  }
  if (variant % 10 < 3) {
    const paper = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.01, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.85 }),
    );
    paper.position.set(-0.4, 0.745, 0.2);
    paper.rotation.y = 0.2;
    g.add(paper);
  }

  const placards = ['FLIGHT', 'CAPCOM', 'BOOSTER', 'EECOM', 'FIDO', 'GUIDANCE', 'SURGEON', 'PAO'];
  const tag = makePlacard(placards[variant % placards.length]);
  tag.position.set(0.7, 0.9, -0.36);
  g.add(tag);

  g.add(contactShadow(1.6));
  return g;
}

function makePlacard(text) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#1a1e24';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#c8d4e0';
  g.font = '28px monospace';
  g.textAlign = 'center';
  g.fillText(text, 128, 42);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.07), new THREE.MeshBasicMaterial({ map: tex }));
  return m;
}

function buildChair(rng) {
  const g = new THREE.Group();
  const mesh = new THREE.MeshStandardMaterial({ color: MC.chairMesh, roughness: 0.7 });
  const fabric = new THREE.MeshStandardMaterial({ color: MC.chairFabric, roughness: 0.8 });
  const steel = new THREE.MeshStandardMaterial({ color: MC.steel, roughness: 0.3, metalness: 0.8 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.46), fabric);
  seat.position.y = 0.46;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.06), mesh);
  back.position.set(0, 0.78, -0.2);
  back.rotation.x = -0.21;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), steel);
  post.position.y = 0.24;
  g.add(seat, back, post);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.04), steel);
    arm.position.set(Math.cos(a) * 0.12, 0.06, Math.sin(a) * 0.12);
    arm.rotation.y = -a;
    g.add(arm);
  }
  g.add(contactShadow(0.7));
  // Face the desk (screens are −Z). Small yaw so they don't look bolted.
  g.rotation.y = Math.PI + (rng() - 0.5) * 0.16;
  g.position.x += (rng() - 0.5) * 0.06;
  return g;
}

export function buildConsoles(rng) {
  const screens = makeDeskScreens({ next: rng });
  const slots = consoleSlots();
  const group = new THREE.Group();
  const interactables = [];
  const collisions = [];

  slots.forEach((s, n) => {
    const desk = buildDesk(screens, n);
    desk.position.set(s.x, s.y, s.z);
    group.add(desk);
    const chair = buildChair(rng);
    chair.position.set(s.x, s.y, s.z + 0.72);
    group.add(chair);
    const grommet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10),
      new THREE.MeshStandardMaterial({ color: 0x0e1013, roughness: 0.6 }),
    );
    grommet.position.set(s.x, s.y + 0.01, s.z + 0.2);
    group.add(grommet);
    const stations = [
      { id: 'schedule', label: 'FLIGHT' },
      { id: 'schedule', label: 'CAPCOM' },
      { id: 'manifest', label: 'BOOSTER' },
      { id: 'research', label: 'EECOM' },
      { id: 'manifest', label: 'FIDO' },
      { id: 'site', label: 'GUIDANCE' },
      { id: 'crew', label: 'SURGEON' },
      { id: 'budget', label: 'PAO' },
    ];
    const station = stations[n % stations.length];
    interactables.push({
      id: station.id,
      label: station.label,
      x: s.x,
      y: s.y,
      z: s.z,
      prompt: `[E] ${station.label} CONSOLE`,
    });
    collisions.push({
      type: 'box',
      minx: s.x - 0.95,
      maxx: s.x + 0.95,
      minz: s.z - 0.45,
      maxz: s.z + 0.45,
      y0: s.y,
      y1: s.y + 0.85,
    });
  });

  return { group, interactables, collisions, screens, slots };
}
