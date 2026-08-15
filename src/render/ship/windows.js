import * as THREE from 'three';
import { ARK, polar } from './constants.js';
import { add } from './mats.js';

export function buildExterior(scene) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  paintExterior(g, 'pad', 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(70, 32, 20),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide }),
  );
  scene.add(sky);
  return {
    sky,
    texture: tex,
    setView(kind, u) {
      paintExterior(g, kind, u);
      tex.needsUpdate = true;
    },
  };
}

export function paintExterior(g, kind, u) {
  const w = 1024;
  const h = 512;
  if (kind === 'pad') {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#6ea8d8');
    grd.addColorStop(0.5, '#c8d4c0');
    grd.addColorStop(0.62, '#b89a68');
    grd.addColorStop(1, '#8a7048');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    return;
  }
  if (kind === 'ascent') {
    const t = Math.min(1, u);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, t < 0.5 ? '#4a7ab0' : '#07080c');
    grd.addColorStop(0.5, t < 0.55 ? '#8aa8c4' : '#101018');
    grd.addColorStop(1, t < 0.4 ? '#d8c8a0' : '#050508');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    return;
  }
  g.fillStyle = '#020308';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff';
  for (let i = 0; i < 420; i++) {
    g.fillRect((i * 73) % w, (i * 47) % h, i % 11 === 0 ? 2 : 1, 1);
  }
  g.fillStyle = '#fff6c0';
  g.beginPath();
  g.arc(820, 90, 4, 0, Math.PI * 2);
  g.fill();

  let earthR = 4;
  let marsR = 3;
  if (kind === 'orbit') {
    earthR = 110;
    marsR = 5;
  } else if (kind === 'transit') {
    const day = u * 250;
    if (day < 14) earthR = 90 - day * 4;
    else if (day < 60) earthR = 8;
    else earthR = 2;
    if (day < 130) marsR = 3;
    else if (day < 200) marsR = 8;
    else marsR = 18 + (day - 200) * 1.4;
  } else if (kind === 'edl' || kind === 'mars') {
    earthR = 2;
    marsR = 140;
  }
  if (earthR > 3) {
    g.fillStyle = '#2f6fbf';
    g.beginPath();
    g.arc(280, 340, earthR, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#4a8a48';
    g.beginPath();
    g.arc(260, 320, earthR * 0.32, 0, Math.PI * 2);
    g.fill();
  }
  if (marsR > 2) {
    g.fillStyle = '#c1784a';
    g.beginPath();
    g.arc(760, 200, marsR, 0, Math.PI * 2);
    g.fill();
  }
}

function paneMat(mats) {
  return mats.view || mats.glass;
}

export function framedPort(parent, mats, angle, y, radius, pits = 4) {
  const p = polar(ARK.innerR - 0.1, angle, y);
  add(parent, new THREE.BoxGeometry(radius * 2.4, radius * 2.4, 0.14), mats.frame, p.x, p.y, p.z, 0, -angle, 0);
  const pane = add(
    parent,
    new THREE.CircleGeometry(radius, 16),
    paneMat(mats),
    p.x * 0.97, p.y, p.z * 0.97,
  );
  pane.lookAt(0, p.y, 0);
  add(parent, new THREE.TorusGeometry(radius + 0.02, 0.018, 6, 14), mats.steel, p.x * 0.96, p.y, p.z * 0.96)
    .lookAt(0, p.y, 0);
  for (let i = 0; i < pits; i++) {
    const ox = (i * 0.05) - 0.08;
    add(parent, new THREE.CircleGeometry(0.006, 6), mats.dark, p.x * 0.965, p.y + ox, p.z * 0.965);
  }
  return { angle, y, radius };
}

export function bayWindow(parent, mats, y) {
  const width = 3.2;
  const height = 1.1;
  const angle = 0;
  const p = polar(ARK.innerR - 0.12, angle, y + 1.15);
  add(parent, new THREE.BoxGeometry(width + 0.28, height + 0.28, 0.16), mats.frame, p.x, p.y, p.z, 0, -angle, 0);
  add(parent, new THREE.BoxGeometry(width, height, 0.04), paneMat(mats), p.x * 0.96, p.y, p.z * 0.96, 0, -angle, 0);
  add(parent, new THREE.BoxGeometry(width + 0.08, 0.05, 0.05), mats.steel, p.x, p.y + height / 2, p.z, 0, -angle, 0);
  add(parent, new THREE.BoxGeometry(width * 0.96, 0.16, 0.42), mats.pad, p.x * 0.88, y + 0.42, p.z * 0.88, 0, -angle, 0);
  add(parent, new THREE.TorusGeometry(0.05, 0.012, 5, 10), mats.rail, p.x * 0.84, y + 0.55, p.z * 0.84 + 0.4);
  add(parent, new THREE.TorusGeometry(0.05, 0.012, 5, 10), mats.rail, p.x * 0.84, y + 0.55, p.z * 0.84 - 0.4);
  return { kind: 'bay_window', x: p.x * 0.86, z: p.z * 0.86, y: y + 1.0, deck: 3, prompt: '[E] BAY WINDOW' };
}

export function buildCupola(parent, mats) {
  const y = ARK.floorY[0] + 2.05;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const p = polar(1.45, a, y + 0.12);
    add(parent, new THREE.BoxGeometry(0.95, 0.72, 0.14), mats.frame, p.x, p.y, p.z, 0.55, -a, 0);
    add(parent, new THREE.BoxGeometry(0.72, 0.5, 0.04), paneMat(mats), p.x * 0.96, p.y + 0.02, p.z * 0.96, 0.55, -a, 0);
  }
  add(parent, new THREE.TorusGeometry(0.42, 0.06, 8, 16), mats.frame, 0, y + 0.58, 0);
  const top = add(parent, new THREE.CircleGeometry(0.36, 16), paneMat(mats), 0, y + 0.6, 0);
  top.rotation.x = -Math.PI / 2;
  add(parent, new THREE.TorusGeometry(1.55, 0.05, 6, 28), mats.frame, 0, y - 0.18, 0)
    .rotation.x = Math.PI / 2;
}
