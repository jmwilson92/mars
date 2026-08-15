import * as THREE from 'three';
import { ARK, DECK_META } from './constants.js';
import { makeShipMats } from './mats.js';
import { buildShaft } from './shaft.js';
import { buildHandrails } from './handrails.js';
import { buildExterior } from './windows.js';
import { DECK_CONFIGS } from './decks.js';
import { buildDeck } from './deckBuilder.js';
import { buildVessel } from './hullStructure.js';
import { buildLighting } from './shipLighting.js';
import { spawnLooseProps, tickLoose, releaseAll } from './looseProps.js';
import { createZeroG } from './zeroGController.js';

export function buildCabin(tex) {
  try {
    return assembleCabin(tex);
  } catch (err) {
    console.error('ARK cabin failed, using bare hull', err);
    return buildBareCabin();
  }
}

export function buildBareCabin() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3a4038);
  scene.add(new THREE.AmbientLight(0xf2efe6, 0.95));
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x4a4038, 0.7));
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(4.1, 4.1, 2.4, 32, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe6dcc8, side: THREE.DoubleSide, roughness: 0.8 }),
  );
  wall.position.y = 1.2;
  scene.add(wall);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4.1, 32),
    new THREE.MeshStandardMaterial({ color: 0x6a6054, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const ceil = new THREE.Mesh(
    new THREE.CircleGeometry(4.1, 32),
    new THREE.MeshStandardMaterial({ color: 0xc8c0b4, roughness: 0.75 }),
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 2.4;
  scene.add(ceil);
  const seats = [
    { id: 'seat_0', x: -0.55, z: -1.35, y: 0.42 },
    { id: 'seat_1', x: 0.55, z: -1.35, y: 0.42 },
  ];
  return {
    scene,
    root: scene,
    seats,
    interactables: [
      { id: 'seat_0', kind: 'seat', x: -0.55, z: -1.35, y: 0.5, deck: 0, prompt: '[E] SIT' },
    ],
    setView() {},
    setPlayerDeck() {},
    setGravity() {},
    setFoodShield() {},
    setAlert() {},
    tick() {},
    tickZeroG(_dt, pose, _input, camera) {
      camera.position.copy(pose.pos);
      camera.rotation.set(pose.pitch, pose.yaw, pose.roll || 0, 'YXZ');
      return { deck: 0, grabbed: false, nearRail: false };
    },
    onMeco() {},
    playerDeck: 0,
    gravity: 1,
    deckName: () => 'D1 FLIGHT DECK',
    hullClass: ARK.className,
  };
}

function assembleCabin(tex, bare = false) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3a342c);
  scene.fog = null;

  const mats = makeShipMats(tex);
  const root = new THREE.Group();
  scene.add(root);

  const exterior = buildExterior(scene);
  if (exterior.texture) {
    mats.view = new THREE.MeshBasicMaterial({
      map: exterior.texture,
      side: THREE.DoubleSide,
    });
  }
  buildVessel(root, mats);
  const lighting = buildLighting(scene);
  const interactables = [];
  const seats = [];
  const decks = [];
  for (const cfg of DECK_CONFIGS) {
    try {
      const g = buildDeck(cfg, mats, interactables, seats);
      root.add(g);
      decks.push(g);
    } catch (err) {
      console.error('deck failed', cfg.id, err);
    }
  }

  const shaft = buildShaft(root, mats);
  interactables.push(...shaft.interactables);
  const rails = bare ? { grabs: [] } : buildHandrails(root, mats);
  const loose = bare ? [] : spawnLooseProps(root, mats);
  const zeroG = createZeroG({ grabs: [...(rails.grabs || []), ...(shaft.grabs || [])] });

  let playerDeck = 0;
  let gravity = 1;
  let hour = 0.35;
  let alert = 'nominal';
  let foodShield = 1;
  let vent = null;
  const returns = { x: 2.6, z: 2.2 };

  function ensureVent() {
    if (vent) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const filt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 68;
      filt.type = 'lowpass';
      filt.frequency.value = 180;
      g.gain.value = 0.012;
      osc.connect(filt);
      filt.connect(g);
      g.connect(ctx.destination);
      osc.start();
      vent = { ctx, osc, g };
    } catch {
      vent = { failed: true };
    }
  }

  function setPlayerDeck(i) {
    playerDeck = Math.max(0, Math.min(6, i | 0));
    for (const g of decks) {
      const idx = g.userData.index;
      if (g.userData.fit) g.userData.fit.visible = Math.abs(idx - playerDeck) <= 1;
    }
    lighting.setVisibleDecks(Math.max(0, playerDeck - 1), Math.min(6, playerDeck + 1));
  }

  function setGravity(g) {
    gravity = g;
    if (g > 0.05) releaseAll(loose);
  }

  function setFoodShield(t) {
    foodShield = Math.max(0.15, Math.min(1, t));
    const sh = decks[4]?.userData.shelter;
    if (sh) sh.scale.set(0.82 + foodShield * 0.18, 1, 0.82 + foodShield * 0.18);
  }

  function tick(dt, phase) {
    ensureVent();
    hour += dt / 88775;
    const night = phase === 'transit' || phase === 'leo_ops' || phase === 'orbit';
    lighting.setCircadian(night ? hour : 0.3);
    lighting.setAlert(alert, hour * 60);
    lighting.spinSun(dt);
    tickLoose(loose, dt, gravity < 0.05, returns);
    for (const obj of root.children) {
      obj.traverse?.((m) => {
        if (m.userData?.spin) m.rotation.y += m.userData.spin * dt;
        if (m.userData?.streamer) m.rotation.z = Math.sin(hour * 80) * 0.4;
      });
    }
  }

  function tickZeroG(dt, pose, input, camera) {
    const r = zeroG.tick(pose, input, camera, dt);
    setPlayerDeck(r.deck);
    return r;
  }

  function onMeco() {
    setGravity(0);
    releaseAll(loose);
    for (const it of loose) it.floating = false;
    tickLoose(loose, 0.016, true, returns);
  }

  if (!seats.length) {
    seats.push({ id: 'seat_0', x: -0.55, z: -1.35, y: 0.42 });
    seats.push({ id: 'seat_1', x: 0.55, z: -1.35, y: 0.42 });
  }

  setPlayerDeck(0);

  return {
    scene,
    root,
    seats,
    interactables,
    setView: exterior.setView,
    setPlayerDeck,
    setGravity,
    setFoodShield,
    setAlert: (k) => { alert = k; },
    tick,
    tickZeroG,
    onMeco,
    get playerDeck() { return playerDeck; },
    get gravity() { return gravity; },
    deckName: (i = playerDeck) => {
      const m = DECK_META[i] || DECK_META[0];
      return `${m.id} ${m.name}`;
    },
    hullClass: ARK.className,
  };
}
