import * as THREE from 'three';

/**
 * One body plan for every character. Identity is clothes, hair, and extras —
 * never a simpler face on darker skin.
 */
export const CREW = [
  {
    id: 'ruiz', name: 'RUIZ', role: 'BUDGET', station: 'budget',
    skin: 0xd4a07a, shirt: 0x1f3d73, pants: 0xc4b08a, hair: 0x3a2a22, shoes: 0x1a1a1a,
    hairStyle: 'bob', glasses: false, headset: true, height: 1.0,
  },
  {
    id: 'okonkwo', name: 'OKONKWO', role: 'FLIGHT', station: 'schedule',
    skin: 0x8d5a38, shirt: 0x6f8fad, pants: 0x2f3540, hair: 0x1a120c, shoes: 0x111111,
    hairStyle: 'short', glasses: false, headset: true, height: 1.06,
  },
  {
    id: 'chen', name: 'CHEN', role: 'CARGO', station: 'manifest',
    skin: 0xe2b896, shirt: 0x8a4030, pants: 0x2a3038, hair: 0x1c1c1c, shoes: 0x888888,
    hairStyle: 'ponytail', glasses: true, headset: false, height: 0.97,
  },
  {
    id: 'voss', name: 'VOSS', role: 'RESEARCH', station: 'research',
    skin: 0xefd0b4, shirt: 0xe8e0d4, pants: 0x6b5a48, hair: 0xb8a078, shoes: 0x5a4030,
    hairStyle: 'recede', glasses: true, headset: false, height: 1.04,
  },
  {
    id: 'hale', name: 'HALE', role: 'SITES', station: 'site',
    skin: 0x7a4a2c, shirt: 0x3d5c58, pants: 0x2a3038, hair: 0x1a1410, shoes: 0x1a1a1a,
    hairStyle: 'coils', glasses: false, headset: false, height: 1.02,
  },
];

function mat(hex, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: 0.62,
    metalness: 0.04,
    ...extra,
  });
}

function add(parent, geo, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

function addHair(head, spec, hm) {
  const hair = mat(spec.hair);
  if (spec.hairStyle === 'bob') {
    add(head, new THREE.SphereGeometry(0.137, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hair, 0, 0.04, -0.01);
    add(head, new THREE.BoxGeometry(0.06, 0.12, 0.04), hair, 0.12, -0.02, 0);
    add(head, new THREE.BoxGeometry(0.06, 0.12, 0.04), hair, -0.12, -0.02, 0);
  } else if (spec.hairStyle === 'ponytail') {
    add(head, new THREE.SphereGeometry(0.132, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, 0.05, 0);
    add(head, new THREE.CapsuleGeometry(0.035, 0.16, 4, 8), hair, 0, -0.02, -0.13, 0.9, 0, 0);
  } else if (spec.hairStyle === 'recede') {
    add(head, new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), hair, 0, 0.07, -0.03);
  } else if (spec.hairStyle === 'coils') {
    add(head, new THREE.SphereGeometry(0.138, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 0.05, -0.02);
    add(head, new THREE.SphereGeometry(0.06, 10, 8), hair, 0, 0.08, -0.07);
  } else {
    add(head, new THREE.SphereGeometry(0.132, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), hair, 0, 0.05, -0.01);
  }
  void hm;
}

export function buildCharacter(spec) {
  const h = spec.height || 1;
  const g = new THREE.Group();
  g.scale.setScalar(h);

  const skin = mat(spec.skin);
  const shirt = mat(spec.shirt);
  const pants = mat(spec.pants);
  const shoe = mat(spec.shoes);
  const dark = mat(0x1a1a1a);
  const white = mat(0xf4f4f4);
  const iris = mat(0x2a241c);

  add(g, new THREE.BoxGeometry(0.09, 0.05, 0.16), shoe, -0.08, 0.03, 0.02);
  add(g, new THREE.BoxGeometry(0.09, 0.05, 0.16), shoe, 0.08, 0.03, 0.02);
  add(g, new THREE.CapsuleGeometry(0.055, 0.38, 4, 8), pants, -0.08, 0.28, 0);
  add(g, new THREE.CapsuleGeometry(0.055, 0.38, 4, 8), pants, 0.08, 0.28, 0);
  add(g, new THREE.BoxGeometry(0.28, 0.14, 0.16), pants, 0, 0.5, 0);
  add(g, new THREE.BoxGeometry(0.32, 0.42, 0.2), shirt, 0, 0.8, 0);
  add(g, new THREE.CapsuleGeometry(0.04, 0.32, 4, 8), shirt, -0.2, 0.78, 0, 0, 0, 0.2);
  add(g, new THREE.CapsuleGeometry(0.04, 0.32, 4, 8), shirt, 0.2, 0.78, 0, 0, 0, -0.2);
  add(g, new THREE.SphereGeometry(0.042, 10, 8), skin, -0.22, 0.58, 0.02);
  add(g, new THREE.SphereGeometry(0.042, 10, 8), skin, 0.22, 0.58, 0.02);
  add(g, new THREE.CylinderGeometry(0.045, 0.05, 0.08, 10), skin, 0, 1.04, 0);

  const head = new THREE.Group();
  head.position.y = 1.2;
  add(head, new THREE.SphereGeometry(0.125, 18, 16), skin, 0, 0, 0);
  add(head, new THREE.SphereGeometry(0.028, 8, 8), skin, 0.11, 0, 0);
  add(head, new THREE.SphereGeometry(0.028, 8, 8), skin, -0.11, 0, 0);
  add(head, new THREE.SphereGeometry(0.028, 8, 8), white, 0.038, 0.02, 0.1);
  add(head, new THREE.SphereGeometry(0.028, 8, 8), white, -0.038, 0.02, 0.1);
  add(head, new THREE.SphereGeometry(0.014, 8, 8), iris, 0.04, 0.018, 0.118);
  add(head, new THREE.SphereGeometry(0.014, 8, 8), iris, -0.036, 0.018, 0.118);
  add(head, new THREE.BoxGeometry(0.028, 0.034, 0.028), skin, 0, -0.01, 0.12);
  add(head, new THREE.BoxGeometry(0.05, 0.01, 0.012), mat(0x8a4038), 0, -0.045, 0.112);
  addHair(head, spec, hair);
  g.add(head);

  const badge = mat(0xd8dde3);
  add(g, new THREE.BoxGeometry(0.012, 0.22, 0.012), mat(0x1f3d73), 0, 0.86, 0.11);
  add(g, new THREE.BoxGeometry(0.05, 0.07, 0.01), badge, 0, 0.74, 0.12);

  if (spec.glasses) {
    const frame = mat(0x222222);
    add(head, new THREE.TorusGeometry(0.032, 0.004, 6, 12), frame, 0.04, 0.02, 0.108);
    add(head, new THREE.TorusGeometry(0.032, 0.004, 6, 12), frame, -0.04, 0.02, 0.108);
    add(head, new THREE.BoxGeometry(0.03, 0.006, 0.006), frame, 0, 0.02, 0.118);
  }
  if (spec.headset) {
    add(head, new THREE.TorusGeometry(0.13, 0.01, 6, 16, Math.PI), dark, 0, 0.02, 0, 0, 0, 0);
    add(head, new THREE.SphereGeometry(0.035, 8, 8), dark, 0.13, 0.02, 0);
    add(head, new THREE.SphereGeometry(0.035, 8, 8), dark, -0.13, 0.02, 0);
  }

  g.userData.spec = spec;
  return g;
}

export function hexCss(n) {
  return `#${n.toString(16).padStart(6, '0')}`;
}

export function mixHex(n, toward, t) {
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const r2 = (toward >> 16) & 255;
  const g2 = (toward >> 8) & 255;
  const b2 = toward & 255;
  const rr = Math.round(r + (r2 - r) * t);
  const gg = Math.round(g + (g2 - g) * t);
  const bb = Math.round(b + (b2 - b) * t);
  return `#${((rr << 16) | (gg << 8) | bb).toString(16).padStart(6, '0')}`;
}
