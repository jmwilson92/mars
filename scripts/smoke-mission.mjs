import * as THREE from 'three';
import { createMission } from '../src/render/mission.js';
import { PHASE, MISSION_TYPES } from '../src/render/phases.js';

const pulses = new Set();
const keys = new Set();
const input = {
  locked: false,
  down: (c) => keys.has(c),
  pulse: (c) => {
    if (!pulses.has(c)) return false;
    pulses.delete(c);
    return true;
  },
  consumeLook: () => ({ dx: 0, dy: 0 }),
};

const cabin = {
  scene: new THREE.Scene(),
  seats: [{ x: 0, z: -1.3 }],
  interactables: [],
  gravity: 1,
  setView() {},
  setGravity() {},
  setPlayerDeck() {},
  tick() {},
  tickZeroG() { return { deck: 0 }; },
  onMeco() {},
};

const ship = {
  group: new THREE.Group(),
  legs: { visible: false },
  setPlume() {},
  showBooster() {},
  separateBooster() {},
  tickBooster() { return false; },
};

const earth = {
  scene: new THREE.Scene(),
  resetLook() {},
  setAltitudeLook() {},
};

const space = {
  scene: new THREE.Scene(),
  earth: { visible: true, rotation: { y: 0 } },
  mars: { rotation: { y: 0 } },
  reset() {},
  setTransit() {},
  setApproach() {},
};

const mars = {
  scene: new THREE.Scene(),
  spawn: new THREE.Vector3(),
  interactables: [],
  collisions: [],
  elevatorBase: { x: 0, z: 0 },
  syncFromState() {},
};

const bus = { emit() {} };
const camera = new THREE.PerspectiveCamera();
const renderer = { setClearColor() {} };

const mission = createMission({
  cfg: { ascentSeconds: 540, transitSeconds: 160, edlSeconds: 20 },
  bus,
  input,
  camera,
  renderer,
  ship,
  earth,
  space,
  mars,
  cabin,
  optimus: null,
  getState: () => ({
    missions: { planned: [{ id: 'm1', status: 'go', dest: 'leo', type: 'CREWED' }] },
    vehicles: { fleet: [] },
  }),
  getSite: () => ({ id: 'jezero_north', name: 'Jezero' }),
  getData: () => ({}),
  startRumble() {},
  setRumble() {},
  stopRumble() {},
});

mission.begin(MISSION_TYPES.CREWED);
if (mission.phase !== PHASE.COUNTDOWN) throw new Error('begin should sit on the pad');
if (mission.extView) throw new Error('crewed launch should start in the cabin');
if (mission.activeScene() !== cabin.scene) throw new Error('cabin scene not active');

// Countdown must run without a second L.
for (let i = 0; i < 22; i += 1) mission.tick(0.5, i * 0.5);
if (mission.phase !== PHASE.ASCENT) throw new Error(`expected ascent after 11s, got ${mission.phase}`);

const y0 = ship.group.position.y;
for (let i = 0; i < 40; i += 1) mission.tick(0.5, 20 + i);
const y1 = ship.group.position.y;
if (!(y1 > y0 + 20)) throw new Error(`stack did not climb (${y0} → ${y1})`);

pulses.add('KeyV');
mission.tick(0.016, 50);
if (!mission.extView) throw new Error('V should switch to outside');
if (mission.activeScene() !== earth.scene) throw new Error('outside should show the pad scene');

mission.toggleView('cabin');
if (mission.extView) throw new Error('CABIN button should return inside');
if (mission.activeScene() !== cabin.scene) throw new Error('cabin button left the interior');

mission.setRate(1);
pulses.add('Minus');
mission.tick(0.016, 51);
if (mission.getRate() !== 1) throw new Error(`Minus must not freeze ascent, rate=${mission.getRate()}`);

console.log('smoke-mission ok', {
  phase: mission.phase,
  climb: Math.round(y1),
  rate: mission.getRate(),
  extView: mission.extView,
});
