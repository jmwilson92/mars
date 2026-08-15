import * as THREE from 'three';

function canvasTex(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

export function makeShipMats(tex) {
  const panelMap = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ebe4d6';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#cfc8ba';
    for (let i = 0; i < 18; i++) g.fillRect((i * 37) % w, (i * 53) % h, 28, 3);
    g.strokeStyle = '#b7b0a4';
    g.lineWidth = 2;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#9a9488';
    for (const [x, y] of [[10, 10], [w - 14, 10], [10, h - 14], [w - 14, h - 14]]) {
      g.beginPath();
      g.arc(x, y, 3, 0, Math.PI * 2);
      g.fill();
    }
  });

  const floorMap = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5a544c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a453e';
    for (let i = 0; i < 40; i++) {
      g.globalAlpha = 0.25;
      g.fillRect((i * 61) % w, (i * 29) % h, 40, 6);
    }
    g.globalAlpha = 1;
    g.fillStyle = '#6e675c';
    g.fillRect(0, 120, w, 16);
  });

  const mliMap = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#c4a050';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8a7030';
    g.lineWidth = 1;
    for (let y = 0; y < h; y += 10) {
      g.beginPath();
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y + ((x / 8) % 2) * 5);
      g.stroke();
    }
    g.strokeStyle = '#e8c878';
    for (let x = 0; x < w; x += 16) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
  });

  const std = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({
      color, roughness: 0.62, metalness: 0.08, side: THREE.DoubleSide, ...extra,
    });

  return {
    liner: std(0xcfc6b8, { roughness: 0.78, metalness: 0.02 }),
    panel: new THREE.MeshStandardMaterial({
      map: panelMap, color: 0xffffff, roughness: 0.74, metalness: 0.04, side: THREE.DoubleSide,
    }),
    floor: new THREE.MeshStandardMaterial({
      map: floorMap, color: 0xffffff, roughness: 0.9, metalness: 0.02, side: THREE.DoubleSide,
    }),
    ceil: std(0xc4b8a8, { roughness: 0.7 }),
    frame: std(0xa8b0b6, { metalness: 0.72, roughness: 0.32 }),
    steel: new THREE.MeshStandardMaterial({
      map: tex?.steelFine || tex?.steel || null,
      color: 0xc4c8cc, metalness: 0.7, roughness: 0.35,
    }),
    mli: new THREE.MeshStandardMaterial({
      map: mliMap, color: 0xffffff, metalness: 0.55, roughness: 0.42,
    }),
    rail: std(0x3d4c58, { metalness: 0.48, roughness: 0.38 }),
    dark: std(0x2a2e32, { metalness: 0.25, roughness: 0.55 }),
    seat: std(0x3a4550, { roughness: 0.5 }),
    pad: std(0x7a4a30, { roughness: 0.62 }),
    belt: std(0x6a2a22),
    plant: std(0x2f6a38, { emissive: 0x143318, emissiveIntensity: 0.28 }),
    leaf: std(0x4a8a42, { emissive: 0x1a3a18, emissiveIntensity: 0.18 }),
    grow: std(0xff4aaa, { emissive: 0xff2a88, emissiveIntensity: 0.7, roughness: 0.3 }),
    rack: std(0x3e444c, { metalness: 0.4 }),
    crate: std(0x6a5a3a, { roughness: 0.8 }),
    warn: std(0xc8a020),
    fire: std(0xa01818, { emissive: 0x400808, emissiveIntensity: 0.2 }),
    o2: std(0xd0b020),
    glass: new THREE.MeshStandardMaterial({
      color: 0x6a8078,
      metalness: 0.2,
      roughness: 0.12,
      transparent: false,
      emissive: 0x0a1210,
      emissiveIntensity: 0.08,
      side: THREE.DoubleSide,
    }),
    view: new THREE.MeshBasicMaterial({ color: 0x1a2430, side: THREE.DoubleSide }),
    screen: std(0x0c1418, { emissive: 0x1a3040, emissiveIntensity: 0.45, roughness: 0.25 }),
    light: std(0xf2efe4, { emissive: 0xf2efe4, emissiveIntensity: 0.85, roughness: 0.4 }),
    amber: std(0xffc070, { emissive: 0xffa040, emissiveIntensity: 0.55 }),
    fabric: std(0x5a6570, { roughness: 0.85 }),
    book: std(0x6a3030),
    med: std(0x2a6a48, { emissive: 0x0a2818, emissiveIntensity: 0.2 }),
    water: new THREE.MeshStandardMaterial({
      color: 0x3a80b8, transparent: true, opacity: 0.45, roughness: 0.12, metalness: 0.1,
    }),
    velcro: std(0x6a6864, { roughness: 0.95 }),
  };
}

export function add(parent, geo, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = false;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function placard(parent, mats, text, x, y, z, ry = 0, scale = 1) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f2f0e8';
  g.fillRect(0, 0, 256, 64);
  g.strokeStyle = '#1a1a1a';
  g.strokeRect(2, 2, 252, 60);
  g.fillStyle = '#111';
  g.font = 'bold 22px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text.slice(0, 22), 128, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: t });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.28 * scale, 0.07 * scale), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}

export function deckMark(parent, mats, label, x, z, y) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = '#d8c8a0';
  g.font = 'bold 72px monospace';
  g.textAlign = 'center';
  g.fillText(label.split(' ')[0], 128, 100);
  g.font = '28px monospace';
  g.fillText(label.slice(3), 128, 150);
  g.fillText('↑ FWD    AFT ↓', 128, 200);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.4),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.7 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y + 0.012, z);
  parent.add(m);
  return m;
}
