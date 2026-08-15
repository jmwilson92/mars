import * as THREE from 'three';
import { makeSkyTexture } from './textures.js';
import { BLAST_M, footprintRadius, workRadius } from '../sim/layout.js';

function ringLine(r, color, y = 0.08) {
  const pts = [];
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }));
}

export function buildMarsSurface(tex) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd9a38a);
  scene.fog = new THREE.Fog(0xc48a68, 80, 900);

  scene.add(new THREE.HemisphereLight(0xf0c8a8, 0x6a3a22, 0.85));
  const sun = new THREE.DirectionalLight(0xffe0c0, 1.35);
  sun.position.set(140, 180, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -180;
  sun.shadow.camera.right = 180;
  sun.shadow.camera.top = 180;
  sun.shadow.camera.bottom = -180;
  scene.add(sun);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1400, 24, 16),
    new THREE.MeshBasicMaterial({ map: makeSkyTexture('#e8b89a', '#c1784a'), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400, 48, 48),
    new THREE.MeshStandardMaterial({ map: tex.regolith, roughness: 1, metalness: 0, color: 0xd08a58 }),
  );
  ground.rotation.x = -Math.PI / 2;
  const pos = ground.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const d = Math.hypot(x, y);
    const n = Math.sin(x * 0.03) * Math.cos(y * 0.025) * 2.4 + Math.sin(d * 0.01) * 3.2;
    if (d > 40) pos.setZ(i, n);
  }
  ground.geometry.computeVertexNormals();
  ground.receiveShadow = true;
  scene.add(ground);

  const rockMat = new THREE.MeshStandardMaterial({ map: tex.regolith, color: 0xa86a40, roughness: 1 });
  for (let i = 0; i < 40; i++) {
    const s = 0.6 + (i % 7) * 0.5;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    const a = (i / 40) * Math.PI * 2;
    const r = 28 + (i * 17) % 220;
    rock.position.set(Math.cos(a) * r, s * 0.4, Math.sin(a) * r);
    rock.rotation.set(i * 0.4, i * 0.7, i * 0.2);
    rock.castShadow = true;
    scene.add(rock);
  }

  const marks = new THREE.Group();
  scene.add(marks);
  const props = new THREE.Group();
  scene.add(props);

  const elevatorBase = new THREE.Vector3(7.4, 0, 0);
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0xb8c0c8, metalness: 0.6, roughness: 0.4 }),
  );
  pad.position.set(elevatorBase.x, 0.08, elevatorBase.z);
  scene.add(pad);

  const collisions = [{ type: 'cyl', x: 0, z: 0, r: 6.2, y0: 0, y1: 80 }];
  const meshById = new Map();
  let interactables = [
    { id: 'elevator', kind: 'elevator', x: elevatorBase.x, z: elevatorBase.z, prompt: '[E] ELEVATOR TO SHIP' },
  ];

  function paintRings(site) {
    while (marks.children.length) marks.remove(marks.children[0]);
    marks.add(ringLine(BLAST_M, 0xff3b30));
    marks.add(ringLine(workRadius(site), 0xffb000));
  }

  function nodeMesh(node) {
    const ice = node.kind === 'ice';
    const m = new THREE.Mesh(
      new THREE.DodecahedronGeometry(ice ? 1.4 : 1.1, 0),
      new THREE.MeshStandardMaterial({
        color: ice ? 0x8ab0c4 : 0xa86a40,
        roughness: 0.85,
        emissive: ice ? 0x1a3040 : 0x000000,
        emissiveIntensity: ice ? 0.2 : 0,
      }),
    );
    m.position.set(node.x, ice ? 0.6 : 0.45, node.z);
    m.userData.id = node.id;
    return m;
  }

  function moduleMesh(mod, item) {
    const r = footprintRadius(item);
    const hab = item?.category === 'habitat';
    const geo = hab
      ? new THREE.CylinderGeometry(r * 0.92, r * 0.92, 2.4, 16)
      : item?.category === 'agriculture'
        ? new THREE.BoxGeometry(r * 1.6, 1.6, r * 1.6)
        : item?.id === 'solar_100m2'
          ? new THREE.BoxGeometry(r * 1.8, 0.12, r * 1.8)
          : new THREE.BoxGeometry(r * 1.4, 1.5, r * 1.4);
    const color = hab ? 0xc5ccd3 : item?.category === 'agriculture' ? 0x3d6a40 : item?.category === 'power' ? 0x2a3540 : 0x8a8e94;
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: tex.steel,
      color,
      metalness: hab ? 0.55 : 0.2,
      roughness: 0.5,
    }));
    m.position.set(mod.position.x, hab ? 1.2 : 0.75, mod.position.z);
    m.castShadow = true;
    m.userData.id = mod.id;
    return m;
  }

  function syncFromState(state, site, data) {
    paintRings(site);
    const want = new Set();
    interactables = [
      { id: 'elevator', kind: 'elevator', x: elevatorBase.x, z: elevatorBase.z, prompt: '[E] ELEVATOR TO SHIP' },
    ];
    collisions.length = 1;

    for (const node of state?.mars?.nodes || []) {
      want.add(node.id);
      if (!meshById.has(node.id)) {
        const mesh = nodeMesh(node);
        props.add(mesh);
        meshById.set(node.id, mesh);
      }
      const left = node.reserve > 1;
      meshById.get(node.id).visible = left;
      if (left) {
        interactables.push({
          id: node.id,
          kind: 'node',
          x: node.x,
          z: node.z,
          prompt: node.kind === 'ice' ? '[E] EXTRACT ICE' : '[E] SCOOP REGOLITH',
        });
      }
    }

    for (const mod of state?.mars?.modules || []) {
      if (!mod.position) continue;
      want.add(mod.id);
      const item = data?.cargo?.find((c) => c.id === mod.typeId);
      if (!meshById.has(mod.id)) {
        const mesh = moduleMesh(mod, item);
        props.add(mesh);
        meshById.set(mod.id, mesh);
      }
      const r = footprintRadius(item);
      collisions.push({ type: 'cyl', x: mod.position.x, z: mod.position.z, r: r * 0.9, y0: 0, y1: 4 });
      interactables.push({
        id: mod.id,
        kind: 'module',
        x: mod.position.x,
        z: mod.position.z,
        prompt: '[E] CREW / HAB COMPUTER',
      });
    }

    for (const [id, mesh] of meshById) {
      if (!want.has(id)) {
        props.remove(mesh);
        meshById.delete(id);
      }
    }
  }

  paintRings(null);

  return {
    scene,
    collisions,
    spawn: new THREE.Vector3(18, 1.7, 14),
    elevatorBase,
    get interactables() {
      return interactables;
    },
    syncFromState,
  };
}
