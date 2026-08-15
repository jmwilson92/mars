import * as THREE from 'three';
import { MC } from './palette.js';

function ctx2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#0c1016';
  g.fillRect(0, 0, w, h);
  return { c, g };
}

function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter;
  return t;
}

export function makeDeskScreens(rng) {
  const makers = [telemTable, lineGraph, groundTrack, stackWire, statusGrid, termLog, radar, camFeed];
  return makers.map((fn, i) => {
    const { c, g } = ctx2d(512, 320);
    fn(g, 512, 320, rng, 0);
    const texture = tex(c);
    return { canvas: c, g, texture, paint: (t) => fn(g, 512, 320, rng, t), kind: i };
  });
}

export function makeSidePanels() {
  const labels = [
    'WX / RANGE',
    'RANGE SAFETY',
    'COUNTDOWN',
    'CONSUMABLES',
    'CAM A',
    'CAM B',
    'COMMS',
    'POWER / THERMAL',
    'ALERTS',
  ];
  return labels.map((label, i) => {
    const { c, g } = ctx2d(640, 400);
    paintSide(g, 640, 400, label, i, 0);
    const texture = tex(c);
    return {
      texture,
      paint: (t) => paintSide(g, 640, 400, label, i, t),
    };
  });
}

function telemTable(g, w, h, rng, t) {
  g.fillStyle = '#0c1016';
  g.fillRect(0, 0, w, h);
  g.font = '14px monospace';
  const rows = ['T+ 00:00:00', 'ALT  000.0 km', 'VEL  7.62 km/s', 'Q    12.4 kPa', 'PITCH  1.2°', 'YAW    0.1°', 'ROLL   0.0°', 'THRUST  94%'];
  rows.forEach((r, i) => {
    g.fillStyle = i === (Math.floor(t * 2) % rows.length) ? '#ffb000' : '#8aa0b0';
    g.fillText(r, 24, 36 + i * 32);
  });
}

function lineGraph(g, w, h) {
  g.fillStyle = '#0c1016';
  g.fillRect(0, 0, w, h);
  const cols = ['#4ade80', '#ffb000', '#4fd8e8'];
  cols.forEach((col, k) => {
    g.strokeStyle = col;
    g.beginPath();
    for (let x = 0; x < w; x += 4) {
      const y = h * 0.5 + Math.sin(x * 0.03 + k) * (30 + k * 12) + Math.sin(x * 0.01 + k * 2) * 18;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  });
}

function groundTrack(g, w, h) {
  g.fillStyle = '#0c1016';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2a3844';
  g.strokeRect(40, 40, w - 80, h - 80);
  g.strokeStyle = '#4fd8e8';
  g.beginPath();
  for (let x = 40; x < w - 40; x++) {
    const y = h * 0.5 + Math.sin((x - 40) * 0.04) * 70;
    if (x === 40) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
}

function stackWire(g, w, h) {
  g.fillStyle = '#0c1016';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#c8d4e0';
  g.strokeRect(w / 2 - 28, 40, 56, 180);
  g.strokeRect(w / 2 - 32, 220, 64, 50);
  g.fillStyle = '#ffb000';
  g.font = '12px monospace';
  g.fillText('S2', w / 2 + 40, 120);
  g.fillText('S1', w / 2 + 40, 250);
}

function statusGrid(g, w, h) {
  g.fillStyle = '#0c1016';
  g.fillRect(0, 0, w, h);
  const n = 40;
  for (let i = 0; i < n; i++) {
    const x = 24 + (i % 8) * 58;
    const y = 24 + Math.floor(i / 8) * 56;
    g.fillStyle = i === 7 || i === 22 ? '#ffb000' : '#4ade80';
    g.fillRect(x, y, 44, 40);
  }
}

function termLog(g, w, h, rng, t) {
  g.fillStyle = '#0c1016';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#4ade80';
  g.font = '13px monospace';
  const lines = [
    '> LINK NOMINAL',
    '> UMBILICAL SAFE',
    '> APU-1 STANDBY',
    '> GUIDANCE INERTIAL',
    '> EECOM GO',
    '> FIDO GO',
    '> CAPCOM HOLDING',
  ];
  const off = Math.floor(t) % lines.length;
  for (let i = 0; i < 8; i++) g.fillText(lines[(i + off) % lines.length], 16, 28 + i * 34);
}

function radar(g, w, h, rng, t) {
  g.fillStyle = '#0c1016';
  g.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  g.strokeStyle = '#1e3a2a';
  for (let r = 30; r < 140; r += 30) {
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.strokeStyle = '#4ade80';
  g.beginPath();
  g.moveTo(cx, cy);
  const a = t * 1.4;
  g.lineTo(cx + Math.cos(a) * 140, cy + Math.sin(a) * 140);
  g.stroke();
}

function camFeed(g, w, h, rng, t) {
  g.fillStyle = '#10140e';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(180,200,160,${0.04 + ((i * 17) % 10) / 80})`;
    g.fillRect((i * 47 + t * 30) % w, (i * 31) % h, 2, 2);
  }
  g.strokeStyle = '#4ade80';
  g.strokeRect(w / 2 - 40, h / 2 - 24, 80, 48);
  g.fillStyle = '#4ade80';
  g.font = '12px monospace';
  g.fillText(`CAM 0${(Math.floor(t) % 4) + 1}  ${String(Math.floor(t * 10) % 1000).padStart(3, '0')}`, 16, h - 16);
}

function paintSide(g, w, h, label, i, t) {
  g.fillStyle = '#0b0e14';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffb000';
  g.font = '16px monospace';
  g.fillText(label, 18, 28);
  g.fillStyle = '#4fd8e8';
  g.font = i === 2 ? '72px monospace' : '18px monospace';
  if (i === 2) g.fillText('T- 04:12:08', 24, 200);
  else if (i === 8) {
    g.fillStyle = '#ff3b30';
    g.fillText('NO ACTIVE RED', 24, 80);
    g.fillStyle = '#ffb000';
    g.fillText('0 AMBER', 24, 120);
  } else {
    g.fillStyle = '#8aa0b0';
    g.fillText('NOMINAL', 24, 80);
    g.fillRect(24, 120, (Math.sin(t + i) * 0.3 + 0.6) * (w - 48), 12);
  }
}

export { MC };
