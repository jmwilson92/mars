import * as THREE from 'three';
import { TOON } from './cartoon.js';
import { CREW, buildCharacter } from './people3d.js';

function box(mat, w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function toonMat(hex, extra = {}) {
  return new THREE.MeshLambertMaterial({ color: hex, ...extra });
}

export const STATIONS = [
  { id: 'budget', label: 'APPROPRIATIONS', prompt: 'E  Talk to Ruiz — appropriations', x: -9, z: -6 },
  { id: 'schedule', label: 'FLIGHT SCHEDULE', prompt: 'E  Talk to Okonkwo — schedule', x: -4, z: -6 },
  { id: 'manifest', label: 'MANIFEST', prompt: 'E  Talk to Chen — cargo / crew / Optimus', x: 4, z: -6 },
  { id: 'research', label: 'RESEARCH', prompt: 'E  Talk to Voss — technology', x: 9, z: -6 },
  { id: 'site', label: 'SITE SELECT', prompt: 'E  Talk to Hale — landing sites', x: -9, z: 5.5 },
  { id: 'pad', label: 'PAD ACCESS', prompt: 'E  Walk out to the vehicle', x: 0, z: 7.6 },
];

export function buildOffice() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(TOON.skyTop);
  scene.fog = new THREE.Fog(TOON.skyBot, 28, 90);
  scene.add(new THREE.HemisphereLight(0xfff0d0, 0x6aa85a, 1.0));
  const sun = new THREE.DirectionalLight(0xfff4cc, 1.05);
  sun.position.set(6, 14, 10);
  scene.add(sun);
  const fill = new THREE.PointLight(0xffe8d0, 0.55, 24);
  fill.position.set(0, 2.4, 4);
  scene.add(fill);

  const carpet = toonMat(TOON.carpetA);
  const carpetB = toonMat(TOON.carpetB);
  const wall = toonMat(TOON.wall);
  const trim = toonMat(TOON.trim);
  const cons = toonMat(TOON.console);
  const screen = new THREE.MeshLambertMaterial({ color: TOON.screen, emissive: TOON.screen, emissiveIntensity: 0.35 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), carpet);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  for (let x = -12; x <= 12; x += 4) {
    for (let z = -8; z <= 8; z += 4) {
      if (((x + z) / 4) % 2 === 0) {
        const tile = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), carpetB);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(x, 0.01, z);
        scene.add(tile);
      }
    }
  }

  scene.add(box(wall, 8, 3.8, 0.3, -10, 1.9, -9));
  scene.add(box(wall, 8, 3.8, 0.3, 10, 1.9, -9));
  scene.add(box(trim, 12.4, 0.35, 0.32, 0, 3.7, -9));
  scene.add(box(wall, 28, 3.8, 0.3, 0, 1.9, 9));
  scene.add(box(wall, 0.3, 3.8, 18, -14, 1.9, 0));
  scene.add(box(wall, 0.3, 3.8, 18, 14, 1.9, 0));

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(11.5, 2.8),
    new THREE.MeshLambertMaterial({ color: 0x9adfff, transparent: true, opacity: 0.28 }),
  );
  glass.position.set(0, 1.85, -8.84);
  scene.add(glass);

  const sand = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), toonMat(TOON.sand));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, -0.2, -50);
  scene.add(sand);
  const ship = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 22, 10), toonMat(TOON.steel));
  ship.position.set(0, 10, -48);
  scene.add(ship);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), toonMat(0x2a2a2e));
  nose.position.set(0, 21, -48);
  scene.add(nose);

  STATIONS.forEach((st) => {
    if (st.id === 'pad') {
      scene.add(box(trim, 2.6, 2.8, 0.35, st.x, 1.4, 8.72));
      return;
    }
    scene.add(box(cons, 2.4, 0.9, 1.3, st.x, 0.45, st.z));
    for (const ox of [-0.5, 0.5]) {
      const mon = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.06), screen);
      mon.position.set(st.x + ox, 1.15, st.z - 0.4);
      mon.rotation.x = -0.2;
      scene.add(mon);
    }
    const who = CREW.find((s) => s.station === st.id);
    if (who) {
      const p = buildCharacter(who);
      p.position.set(st.x + 0.85, 0, st.z + 1.2);
      p.rotation.y = Math.PI;
      scene.add(p);
    }
  });

  const collisions = [
    { type: 'box', minx: -14.2, maxx: -6.2, minz: -9.3, maxz: -8.7, y0: 0, y1: 4 },
    { type: 'box', minx: 6.2, maxx: 14.2, minz: -9.3, maxz: -8.7, y0: 0, y1: 4 },
    { type: 'box', minx: -14.2, maxx: 14.2, minz: 8.7, maxz: 9.3, y0: 0, y1: 4 },
    { type: 'box', minx: -14.3, maxx: -13.7, minz: -9, maxz: 9, y0: 0, y1: 4 },
    { type: 'box', minx: 13.7, maxx: 14.3, minz: -9, maxz: 9, y0: 0, y1: 4 },
  ];
  for (const st of STATIONS) {
    if (st.id === 'pad') continue;
    collisions.push({
      type: 'box', minx: st.x - 1.25, maxx: st.x + 1.25, minz: st.z - 0.75, maxz: st.z + 0.75, y0: 0, y1: 1.1,
    });
  }

  return {
    scene,
    collisions,
    interactables: STATIONS.map((st) => ({ id: st.id, x: st.x, z: st.z, prompt: st.prompt, label: st.label })),
    spawn: new THREE.Vector3(0, 1.7, 5.2),
    lookYaw: 0,
  };
}
