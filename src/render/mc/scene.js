import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { MC } from './palette.js';
import { buildShell, floorYAt } from './shell.js';
import { buildConsoles } from './consoles.js';
import { buildDisplayWall } from './wall.js';
import { createMainScreen } from './orbit.js';
import { populateCrew, tickFloor, setCrewEvent } from './crew.js';

let areaInit = false;

export function createMissionControl({ getState, rng }) {
  if (!areaInit) {
    RectAreaLightUniformsLib.init();
    areaInit = true;
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x12161c);
  scene.fog = new THREE.Fog(0x12161c, 28, 48);

  scene.add(new THREE.AmbientLight(0x3a4a5c, 0.48));
  scene.add(new THREE.HemisphereLight(0x5a7090, 0x1a1814, 0.55));

  const main = new THREE.RectAreaLight(MC.screenBlue, 4.0, 11.0, 4.4);
  main.position.set(0, 3.4, -9.7);
  main.lookAt(0, 3.4, 0);
  scene.add(main);
  const leftWash = new THREE.RectAreaLight(0x6fa8c8, 1.15, 6.6, 4.2);
  leftWash.position.set(-8, 3.4, -9.7);
  leftWash.lookAt(-8, 3.4, 0);
  scene.add(leftWash);
  const rightWash = new THREE.RectAreaLight(0x6fa8c8, 1.15, 6.6, 4.2);
  rightWash.position.set(8, 3.4, -9.7);
  rightWash.lookAt(8, 3.4, 0);
  scene.add(rightWash);

  [
    [0, 0, -6.2],
    [0, 0.55, -2.7],
    [0, 1.1, 0.7],
    [0, 1.65, 4.2],
  ].forEach((p) => {
    const l = new THREE.PointLight(0xa8c8e0, 0.85, 11);
    l.position.set(p[0], p[1] + 1.3, p[2]);
    scene.add(l);
  });

  const spotA = new THREE.SpotLight(MC.warmDownlight, 0.65, 14, Math.PI / 4, 0.85);
  spotA.position.set(-4, 4.4, 8);
  spotA.target.position.set(-4, 1.65, 8);
  spotA.castShadow = true;
  spotA.shadow.mapSize.set(1024, 1024);
  scene.add(spotA, spotA.target);
  const spotB = spotA.clone();
  spotB.position.set(4, 4.4, 8);
  spotB.target.position.set(4, 1.65, 8);
  scene.add(spotB, spotB.target);

  const shell = buildShell();
  scene.add(shell.group);
  const consoles = buildConsoles(rng);
  scene.add(consoles.group);
  const wall = buildDisplayWall();
  scene.add(wall.group);
  const wallScreen = createMainScreen(getState);
  scene.add(wallScreen.screen);

  const crew = populateCrew(consoles.slots, rng);
  crew.all.forEach((m) => scene.add(m));

  const collisions = [...shell.collisions, ...consoles.collisions];
  const interactables = [
    ...consoles.interactables,
    { id: 'orbit', label: 'MAIN SCREEN', x: 0, y: 0, z: -8.2, prompt: '[E] MAIN SCREEN' },
    { id: 'crew', label: 'CREW', x: 8.4, y: 1.65, z: 6.4, prompt: '[E] CREW ROSTER' },
    { id: 'program', label: 'EXIT', x: 13.2, y: 1.65, z: 7.2, prompt: '[E] PROGRAM DASHBOARD' },
    { id: 'site', label: 'WX / RANGE', x: -10.4, z: -8.6, prompt: '[E] WX / RANGE — SITES' },
    { id: 'schedule', label: 'RANGE SAFETY', x: -7.1, z: -8.6, prompt: '[E] RANGE SAFETY — FLIGHT' },
    { id: 'schedule', label: 'COUNTDOWN', x: -10.4, z: -8.4, prompt: '[E] COUNTDOWN — FLIGHT' },
    { id: 'manifest', label: 'CONSUMABLES', x: -7.1, z: -8.4, prompt: '[E] CONSUMABLES — CARGO' },
    { id: 'schedule', label: 'CAM A', x: 7.1, z: -8.6, prompt: '[E] CAM A — FLIGHT' },
    { id: 'research', label: 'CAM B', x: 10.4, z: -8.6, prompt: '[E] CAM B — RESEARCH' },
    { id: 'budget', label: 'COMMS', x: 7.1, z: -8.4, prompt: '[E] COMMS — BUDGET' },
    { id: 'research', label: 'POWER / THERMAL', x: 10.4, z: -8.4, prompt: '[E] POWER / THERMAL — RESEARCH' },
  ];

  let sideT = 0;
  let crewAcc = 0;

  function update(dt, renderer) {
    wallScreen.update(dt, renderer);
    sideT += dt;
    if (sideT > 2) {
      sideT = 0;
      wall.sideMeshes.forEach((s) => {
        s.panel.paint(performance.now() * 0.001);
        s.panel.texture.needsUpdate = true;
      });
    }
    crewAcc += dt;
    if (crewAcc > 1 / 30) {
      const step = crewAcc;
      crewAcc = 0;
      tickFloor(crew.all, step, floorYAt);
    }
  }

  function setEvent(name) {
    setCrewEvent(crew.all, name);
  }

  function setScreenMode(mode, call) {
    wallScreen.setMode(mode, call);
  }

  return {
    scene,
    collisions,
    interactables,
    floorYAt,
    update,
    setEvent,
    setScreenMode,
    spawn: { x: 0, z: 0.9, y: 1.1, yaw: 0, pitch: -0.14 },
  };
}
