/** MARS house cartoon: editorial humans, dry color. */

import { CREW, hexCss, mixHex } from './people3d.js';

export const TOON = {
  skyTop: '#7aa8c4',
  skyBot: '#e8d2b0',
  grass: '#6a8f5a',
  sand: '#d4b888',
  pad: '#b8bcc0',
  wall: '#efe4d2',
  wallDark: '#d2c2a6',
  trim: '#c45c2a',
  carpetA: '#3a5366',
  carpetB: '#314859',
  console: '#3e4a54',
  consoleHi: '#5a6670',
  screen: '#6ec8d4',
  steel: '#cfd3d8',
  heat: '#2c2c30',
  flame: '#e07828',
};

export const TOON_STAFF = CREW.map((c) => ({
  ...c,
  shirt: hexCss(c.shirt),
  pants: hexCss(c.pants),
  skin: hexCss(c.skin),
  hair: hexCss(c.hair),
  shoes: hexCss(c.shoes),
}));

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Volume-shaded adult. Same face parts on every person. Feet at (x, y). */
export function drawToonPerson(ctx, x, y, scale, person) {
  const s = Math.max(28, scale);
  const cx = x;
  const headR = s * 0.09;
  const torsoH = s * 0.26;
  const torsoW = s * 0.18;
  const legH = s * 0.3;
  const hy = y - legH - torsoH - headR * 0.35;
  const skin = typeof person.skin === 'string' ? person.skin : `#${person.skin.toString(16).padStart(6, '0')}`;
  const hi = mixHex(parseInt(skin.slice(1), 16), 0xffffff, 0.28);
  const lo = mixHex(parseInt(skin.slice(1), 16), 0x000000, 0.18);

  ctx.save();
  ctx.fillStyle = 'rgba(20,16,12,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, y - 1, torsoW * 0.75, s * 0.028, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = person.shoes || '#222';
  ctx.fillRect(cx - torsoW * 0.42, y - s * 0.04, torsoW * 0.32, s * 0.04);
  ctx.fillRect(cx + torsoW * 0.1, y - s * 0.04, torsoW * 0.32, s * 0.04);
  ctx.fillStyle = person.pants;
  ctx.fillRect(cx - torsoW * 0.38, y - legH, torsoW * 0.3, legH - s * 0.03);
  ctx.fillRect(cx + torsoW * 0.08, y - legH, torsoW * 0.3, legH - s * 0.03);

  ctx.fillStyle = person.shirt;
  roundRect(ctx, cx - torsoW / 2, y - legH - torsoH, torsoW, torsoH, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(cx - 1, y - legH - torsoH + 6, 2, torsoH * 0.4);

  const hg = ctx.createRadialGradient(cx - headR * 0.35, hy - headR * 0.35, headR * 0.1, cx, hy, headR);
  hg.addColorStop(0, hi);
  hg.addColorStop(0.7, skin);
  hg.addColorStop(1, lo);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(cx, hy, headR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = person.hair;
  ctx.beginPath();
  if (person.hairStyle === 'coils') ctx.arc(cx, hy - headR * 0.15, headR * 1.08, 0, Math.PI * 2);
  else if (person.hairStyle === 'recede') ctx.ellipse(cx, hy - headR * 0.55, headR * 0.7, headR * 0.35, 0, Math.PI, Math.PI * 2);
  else ctx.ellipse(cx, hy - headR * 0.45, headR * 1.02, headR * 0.55, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  if (person.hairStyle === 'ponytail') {
    ctx.beginPath();
    ctx.ellipse(cx, hy + headR * 0.2, headR * 0.22, headR * 0.45, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (person.hairStyle === 'bob') {
    ctx.fillRect(cx - headR * 1.05, hy - headR * 0.1, headR * 0.22, headR * 0.7);
    ctx.fillRect(cx + headR * 0.83, hy - headR * 0.1, headR * 0.22, headR * 0.7);
  }

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(cx - headR * 0.32, hy - headR * 0.08, headR * 0.16, headR * 0.18, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + headR * 0.32, hy - headR * 0.08, headR * 0.16, headR * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a241c';
  ctx.beginPath();
  ctx.arc(cx - headR * 0.28, hy - headR * 0.08, headR * 0.07, 0, Math.PI * 2);
  ctx.arc(cx + headR * 0.36, hy - headR * 0.08, headR * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lo;
  ctx.beginPath();
  ctx.ellipse(cx, hy + headR * 0.12, headR * 0.1, headR * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6a3030';
  ctx.lineWidth = Math.max(1.2, s * 0.012);
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.2, hy + headR * 0.38);
  ctx.quadraticCurveTo(cx, hy + headR * 0.46, cx + headR * 0.2, hy + headR * 0.38);
  ctx.stroke();

  if (person.glasses) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - headR * 0.52, hy - headR * 0.22, headR * 0.38, headR * 0.28);
    ctx.strokeRect(cx + headR * 0.14, hy - headR * 0.22, headR * 0.38, headR * 0.28);
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.14, hy - headR * 0.08);
    ctx.lineTo(cx + headR * 0.14, hy - headR * 0.08);
    ctx.stroke();
  }
  if (person.headset) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, hy, headR * 1.05, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(cx - headR * 1.05, hy, headR * 0.18, 0, Math.PI * 2);
    ctx.arc(cx + headR * 1.05, hy, headR * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#c9a24a';
  ctx.font = `600 ${Math.max(9, s * 0.065)}px "Barlow", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(person.name, cx, y + s * 0.08);
  ctx.fillStyle = '#3a4a52';
  ctx.font = `500 ${Math.max(8, s * 0.05)}px "IBM Plex Mono", monospace`;
  ctx.fillText(person.role, cx, y + s * 0.145);
  ctx.restore();
}

export function drawToonShip(ctx, x, y, h, opts = {}) {
  const w = h * 0.16;
  ctx.save();
  ctx.translate(x, y);
  if (opts.tilt) ctx.rotate(opts.tilt);
  ctx.fillStyle = TOON.steel;
  ctx.strokeStyle = '#5a6068';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.5);
  ctx.lineTo(w, -h * 0.22);
  ctx.lineTo(w, h * 0.36);
  ctx.lineTo(-w, h * 0.36);
  ctx.lineTo(-w, -h * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = TOON.heat;
  ctx.fillRect(-w * 0.55, -h * 0.22, w * 1.1, h * 0.18);
  ctx.fillStyle = TOON.screen;
  ctx.fillRect(-w * 0.2, -h * 0.08, w * 0.4, h * 0.05);
  if (opts.flame) {
    ctx.fillStyle = TOON.flame;
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, h * 0.36);
    ctx.lineTo(0, h * 0.36 + h * 0.26 * opts.flame);
    ctx.lineTo(w * 0.4, h * 0.36);
    ctx.fill();
  }
  ctx.restore();
}

export function drawCartoonSky(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, TOON.skyTop);
  g.addColorStop(0.58, TOON.skyBot);
  g.addColorStop(1, TOON.sand);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 4; i++) {
    const cx = 80 + i * (w / 4);
    const cy = 50 + (i % 2) * 24;
    ctx.fillRect(cx, cy, 70, 14);
    ctx.fillRect(cx + 16, cy - 10, 42, 12);
  }
}
