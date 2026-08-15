import * as THREE from 'three';
import { makeSkyTexture } from './textures.js';

function box(mat, w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildEarthPad(tex) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87a0b8);
  scene.fog = new THREE.Fog(0x9bb0c4, 180, 2400);

  const hemi = new THREE.HemisphereLight(0xc8ddff, 0x6a5a40, 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d0, 1.55);
  sun.position.set(220, 280, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -220;
  sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220;
  sun.shadow.camera.bottom = -220;
  sun.shadow.camera.far = 900;
  scene.add(sun);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(24000, 24, 16),
    new THREE.MeshBasicMaterial({ map: makeSkyTexture('#6ea4d8', '#d9c7a4'), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshStandardMaterial({ map: tex.sand, roughness: 1, metalness: 0 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.receiveShadow = true;
  scene.add(sand);

  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(90, 48),
    new THREE.MeshStandardMaterial({ map: tex.concrete, roughness: 0.9, metalness: 0.05 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.05;
  pad.receiveShadow = true;
  scene.add(pad);

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1a4a68,
    roughness: 0.18,
    metalness: 0.4,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5000, 2200), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.4, -1800);
  scene.add(water);

  const steel = new THREE.MeshStandardMaterial({
    map: tex.steel,
    color: 0xb8c0c8,
    metalness: 0.85,
    roughness: 0.35,
  });
  const paint = new THREE.MeshStandardMaterial({ color: 0xc9cdd2, roughness: 0.6, metalness: 0.1 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.55, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b3036, roughness: 0.5, metalness: 0.3 });

  const tower = box(steel, 8, 146, 10, 22, 73, 0);
  scene.add(tower);
  scene.add(box(steel, 28, 2.2, 4, 10, 118, 0));
  scene.add(box(steel, 28, 2.2, 4, 10, 72, 0));
  scene.add(box(orange, 1.2, 146, 1.2, 18.5, 73, 5.2));
  scene.add(box(orange, 1.2, 146, 1.2, 18.5, 73, -5.2));

  for (let i = 0; i < 18; i++) {
    const deck = box(steel, 7, 0.35, 9, 22, 8 + i * 7.5, 0);
    scene.add(deck);
  }

  const trench = box(dark, 28, 4, 80, 0, -1.6, 20);
  scene.add(trench);

  const tanks = [];
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(8.5, 20, 14), paint);
    t.position.set(-70 - (i % 2) * 24, 8.5, -30 + Math.floor(i / 2) * 28);
    t.castShadow = true;
    scene.add(t);
    tanks.push(t);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(3, 4.5, 4, 12), steel);
    skirt.position.set(t.position.x, 2, t.position.z);
    scene.add(skirt);
  }

  const hangar = box(paint, 70, 22, 48, -130, 11, 70);
  scene.add(hangar);
  scene.add(box(dark, 24, 16, 1, -98, 8, 70));

  const office = box(paint, 36, 10, 22, -90, 5, 130);
  scene.add(office);

  const collisions = [
    { type: 'cyl', x: 0, z: 0, r: 5.4, y0: 0, y1: 130 },
    { type: 'box', minx: 18, maxx: 26, minz: -5, maxz: 5, y0: 0, y1: 146 },
    { type: 'box', minx: -165, maxx: -95, minz: 46, maxz: 94, y0: 0, y1: 22 },
    { type: 'box', minx: -108, maxx: -72, minz: 119, maxz: 141, y0: 0, y1: 10 },
  ];
  for (const t of tanks) {
    collisions.push({ type: 'cyl', x: t.position.x, z: t.position.z, r: 9, y0: 0, y1: 18 });
  }

  return {
    scene,
    sun,
    water,
    collisions,
    boardPoint: new THREE.Vector3(16.5, 0, 0),
    launchPoint: new THREE.Vector3(0, 0, 0),
    setAltitudeLook(alt) {
      const t = Math.min(1, alt / 80000);
      const fogNear = 180 + t * 4000;
      const fogFar = 2400 + t * 20000;
      scene.fog.near = fogNear;
      scene.fog.far = fogFar;
      const c = new THREE.Color().lerpColors(new THREE.Color(0x9bb0c4), new THREE.Color(0x020308), t);
      scene.fog.color.copy(c);
      scene.background.copy(c);
      sun.intensity = 1.55 * (1 - t * 0.7);
    },
    resetLook() {
      this.setAltitudeLook(0);
    },
  };
}
