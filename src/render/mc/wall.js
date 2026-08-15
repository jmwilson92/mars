import * as THREE from 'three';
import { MC } from './palette.js';
import { makeSidePanels } from './screens.js';

export function buildDisplayWall() {
  const g = new THREE.Group();
  const bezel = new THREE.MeshStandardMaterial({ color: MC.bezel, roughness: 0.4 });
  const frame = new THREE.MeshStandardMaterial({ color: MC.rackBlack, roughness: 0.55 });
  const rack = new THREE.MeshStandardMaterial({ color: MC.rackBlack, roughness: 0.7 });

  const structure = new THREE.Mesh(new THREE.BoxGeometry(24.4, 4.7, 0.25), frame);
  structure.position.set(0, 3.4, -9.88);
  g.add(structure);

  const sides = makeSidePanels();
  const layout = [
    { x: -10.4, y: 4.4 },
    { x: -7.1, y: 4.4 },
    { x: -10.4, y: 2.3 },
    { x: -7.1, y: 2.3 },
    { x: 7.1, y: 4.4 },
    { x: 10.4, y: 4.4 },
    { x: 7.1, y: 2.3 },
    { x: 10.4, y: 2.3 },
    { x: 0, y: 0 }, // unused slot mapped later
  ];
  const sideMeshes = [];
  layout.slice(0, 8).forEach((p, i) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(3.28, 2.08, 0.06), bezel);
    b.position.set(p.x, p.y, -9.72);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(3.12, 1.92),
      new THREE.MeshBasicMaterial({ map: sides[i].texture }),
    );
    face.position.set(p.x, p.y, -9.68);
    g.add(b, face);
    sideMeshes.push({ mesh: face, panel: sides[i] });
  });

  const mainBezel = new THREE.Mesh(new THREE.BoxGeometry(11.16, 4.56, 0.08), bezel);
  mainBezel.position.set(0, 3.4, -9.74);
  g.add(mainBezel);

  // racks
  for (let x = -11.5; x <= 11.5; x += 1.15) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.15, 0.4), rack);
    cab.position.set(x, 0.58, -9.75);
    g.add(cab);
    for (let i = 0; i < 6; i++) {
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 0.02),
        new THREE.MeshStandardMaterial({
          color: i % 3 ? MC.dataGreen : MC.dataAmber,
          emissive: i % 3 ? MC.dataGreen : MC.dataAmber,
          emissiveIntensity: 0.8,
        }),
      );
      led.position.set(x - 0.3 + (i % 3) * 0.3, 0.3 + Math.floor(i / 3) * 0.35, -9.54);
      g.add(led);
    }
  }

  const soffit = new THREE.Mesh(new THREE.BoxGeometry(24.4, 0.35, 0.6), frame);
  soffit.position.set(0, 5.85, -9.7);
  g.add(soffit);

  // clocks
  const clock = makeClocks();
  clock.position.set(11.2, 4.8, -9.86);
  g.add(clock);

  // program seal
  const seal = makeSeal();
  seal.position.set(-13.86, 3.2, 0);
  seal.rotation.y = Math.PI / 2;
  g.add(seal);

  // doors
  const doorMat = new THREE.MeshStandardMaterial({ color: MC.consoleBody, roughness: 0.6 });
  [-0.55, 0.55].forEach((dx) => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.08), doorMat);
    door.position.set(13.9, 2.75, 7.2 + dx);
    door.rotation.y = Math.PI / 2;
    g.add(door);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.04, 0.04),
      new THREE.MeshStandardMaterial({ color: MC.steel, metalness: 0.8, roughness: 0.3 }),
    );
    bar.position.set(13.84, 2.6, 7.2 + dx);
    bar.rotation.y = Math.PI / 2;
    g.add(bar);
  });

  return { group: g, sideMeshes, mainBezel };
}

function makeClocks() {
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#0a0c10';
  g.fillRect(0, 0, 768, 128);
  g.fillStyle = '#c8d4e0';
  g.font = '18px monospace';
  ['UTC', 'MET', 'MARS', 'WINDOW'].forEach((l, i) => {
    g.fillStyle = '#6a7884';
    g.fillText(l, 20 + i * 190, 28);
    g.fillStyle = '#ffb000';
    g.font = '22px monospace';
    g.fillText('--:--:--', 20 + i * 190, 78);
    g.font = '18px monospace';
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.4), new THREE.MeshBasicMaterial({ map: tex }));
  m.userData.canvas = c;
  m.userData.ctx = g;
  m.userData.tex = tex;
  return m;
}

function makeSeal() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#0e1218';
  g.beginPath();
  g.arc(256, 256, 240, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#ffb000';
  g.lineWidth = 10;
  g.stroke();
  g.strokeStyle = '#4fd8e8';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(256, 256, 210, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#c1784a';
  g.beginPath();
  g.arc(256, 270, 70, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#c8d4e0';
  g.font = 'bold 36px sans-serif';
  g.textAlign = 'center';
  g.fillText('MARS', 256, 180);
  g.font = '20px monospace';
  g.fillText('PROGRAM', 256, 400);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 32),
    new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0x221800,
      emissiveIntensity: 0.35,
      roughness: 0.5,
    }),
  );
  return m;
}
