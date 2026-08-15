import * as THREE from 'three';
import { PHASE, MISSION_TYPES, FLIGHT_RATES } from './phases.js';
import { EYE, nearestInteractable, stepWalk } from './locomotion.js';
import { SHIP } from './starship.js';
import { CABIN } from './cabin.js';
import { workRadius } from '../sim/layout.js';
import { applyLeoUse, buildLeoTelem, leoMate, setupLeoCabin } from './leoops.js';
import { buildFlightTelem } from './telem.js';
import { climbShaft, inHatch, walkDeck } from './ship/gravController.js';
import { applyShake, shakeAmt, tickCabinSky as skyTick, tickExtCam } from './flightFx.js';

const GRAVITY_M = 8.4;

export function createMission({
  cfg, bus, input, camera, renderer,
  ship, earth, space, mars, cabin, optimus,
  getState, getSite, getData,
  startRumble, setRumble, stopRumble,
}) {
  const pose = {
    pos: new THREE.Vector3(0, EYE, 0),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    roll: 0,
  };
  let phase = PHASE.COUNTDOWN;
  let phaseT = 0;
  let rate = 1;
  let view = 'crew';
  let extView = false;
  let seated = true;
  let belted = true;
  let deck = 0;
  let aboard = true;
  let elevatorT = null;
  let systems = { eclss: 1, plants: 1, water: 1, power: 1 };
  let telem = { phase, title: '', call: '', prompt: '', alt: 0, vel: 0, mach: 0, stage: '' };
  let holdEdl = false;
  let holdEdlT = 0;
  let armed = false;
  let tmiBurn = 0;
  let unbuckledEntry = false;
  const held = {};
  let landedEmitted = false;
  let lastNear = null;
  let skyAcc = 0;
  let boardedShipId = null;
  let carried = null;
  const miles = new Set();

  function mile(name, amount) {
    if (miles.has(name)) return;
    miles.add(name);
    const mid = getState()?.missions?.planned?.find((m) => m.status === 'go')?.id || 'fly';
    bus.emit('flight:milestone', { key: `${mid}_${name}`, amount, label: name.toUpperCase() });
  }

  function edge(code) {
    if (input.pulse(code)) {
      held[code] = input.down(code);
      return true;
    }
    const d = input.down(code);
    if (d && !held[code]) {
      held[code] = true;
      return true;
    }
    if (!d) held[code] = false;
    return false;
  }

  function setRate(n) {
    rate = FLIGHT_RATES.includes(n) ? n : 1;
  }

  function toggleView(mode) {
    if (mode === 'cabin') extView = false;
    else if (mode === 'out' || mode === 'outside') extView = true;
    else extView = !extView;
    if (phase !== PHASE.MARS_SURFACE) {
      const space = phase === PHASE.ORBIT || phase === PHASE.TRANSIT
        || phase === PHASE.EDL || phase === PHASE.LEO_OPS;
      renderer.setClearColor(extView ? (space ? 0x020308 : 0x87a0b8) : 0x1a1814, 1);
    }
  }

  function pollRate() {
    if (edge('Digit1') || edge('Numpad1')) setRate(1);
    if (edge('Digit3') || edge('Numpad3')) setRate(3);
    if (edge('Digit0') || edge('Numpad0')) setRate(10);
    if (edge('Digit4') || edge('Numpad4')) setRate(30);
    if (edge('Minus') || edge('BracketLeft')) {
      const i = FLIGHT_RATES.indexOf(rate);
      setRate(FLIGHT_RATES[Math.max(1, i - 1)]);
    }
    if (edge('Equal') || edge('BracketRight')) {
      const i = FLIGHT_RATES.indexOf(rate);
      setRate(FLIGHT_RATES[Math.min(FLIGHT_RATES.length - 1, i + 1)]);
    }
  }

  function detachCam() {
    if (camera.parent) camera.parent.remove(camera);
  }

  function seatCam() {
    detachCam();
    const seat = cabin.seats[0] || { x: 0, z: -1.3 };
    const fy = CABIN.floorY[0] + 1.18;
    pose.pos.set(seat.x, fy, seat.z);
    camera.position.set(seat.x, fy, seat.z);
    const look = input.consumeLook();
    if (input.locked) {
      pose.yaw -= look.dx;
      pose.pitch = Math.max(-1.0, Math.min(0.55, pose.pitch - look.dy));
    }
    if ((cabin.gravity ?? 1) < 0.05 && belted) {
      camera.position.y += 0.11 + Math.sin((phaseT || 0) * 1.4) * 0.025;
    }
    camera.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
    pose.roll = 0;
  }

  function walkCabin(dt) {
    walkDeck(pose, input, camera, cabin, deck, dt, detachCam);
  }

  function attachShip(scene) {
    if (ship.group.parent !== scene) scene.add(ship.group);
  }

  function enter(next) {
    phase = next;
    phaseT = 0;
    holdEdl = false;
    if (next === PHASE.COUNTDOWN) {
      startRumble();
      seated = belted = aboard = armed = true;
      tmiBurn = holdEdlT = deck = 0;
      unbuckledEntry = false;
      pose.yaw = 0;
      pose.pitch = -0.06;
      ship.showBooster();
      ship.legs.visible = false;
      ship.setPlume(0);
      ship.group.position.set(0, 0, 0);
      ship.group.rotation.set(0, 0, 0);
      earth.resetLook();
      attachShip(earth.scene);
      if (view === 'optimus' && optimus) earth.scene.add(optimus);
      cabin.setView?.('pad', 0);
      cabin.setGravity?.(1);
      cabin.setPlayerDeck?.(0);
      renderer.setClearColor(extView ? 0x87a0b8 : 0x1a1814, 1);
    } else if (next === PHASE.ORBIT) {
      mile('insertion', 15);
      cabin.onMeco?.();
      ship.separateBooster(earth.scene);
      ship.setPlume(0);
      const mid = getState()?.missions?.planned?.find((m) => m.status === 'go' || m.status === 'leo')?.id;
      if (mid) bus.emit('plan:cmd', { cmd: 'INSERT_LEO', missionId: mid });
      setRumble(0);
      space.reset();
      space.earth.visible = true;
      ship.group.position.set(0, -SHIP.midY, 0);
      ship.group.rotation.set(0, 0.4, 0);
      attachShip(space.scene);
      telem.alt = 210000;
      telem.vel = 7800;
    } else if (next === PHASE.TRANSIT) {
      mile('tmi', 15);
      tmiBurn = 6;
      seated = true;
      belted = true;
      const mid = getState()?.missions?.planned?.find((m) => m.status === 'go')?.id;
      if (mid) bus.emit('plan:cmd', { cmd: 'SET_LEG', missionId: mid, leg: 'outbound' });
    } else if (next === PHASE.EDL) {
      mile('edl', 10);
      startRumble();
      extView = true;
      if (!belted) unbuckledEntry = true;
      seated = true;
      deck = 0;
      ship.legs.visible = false;
    } else if (next === PHASE.MARS_SURFACE) {
      stopRumble();
      ship.group.position.set(0, SHIP.landedY, 0);
      ship.group.rotation.set(0, 0, 0);
      ship.legs.visible = true;
      ship.separateBooster();
      ship.setPlume(0);
      mars.scene.add(ship.group);
      mars.syncFromState(getState(), getSite(), getData?.());
      renderer.setClearColor(0xd9a38a, 1);
      if (view === 'crew') {
        aboard = true;
        seated = false;
        belted = false;
        deck = 6;
        cabin.setGravity?.(0.38);
        cabin.setPlayerDeck?.(6);
        pose.pos.set(2.6, CABIN.floorY[6] + EYE, 0.4);
        pose.yaw = 0;
        pose.roll = 0;
      } else {
        aboard = false;
        pose.pos.copy(mars.spawn);
        pose.yaw = -0.9;
        pose.pitch = -0.05;
      }
      if (!landedEmitted) {
        landedEmitted = true;
        mile('landing', 20);
        bus.emit('flight:landed', {
          siteId: getSite()?.id,
          shipHealth: { ...systems },
          crewLost: unbuckledEntry,
        });
      }
    }
  }

  function begin(type) {
    view = type === MISSION_TYPES.ROBOTIC ? 'optimus' : 'crew';
    extView = type !== MISSION_TYPES.CREWED;
    systems = { eclss: 1, plants: 1, water: 1, power: 1 };
    landedEmitted = false;
    miles.clear();
    rate = 1;
    enter(PHASE.COUNTDOWN);
    return true;
  }

  function enterLeo(shipId, viewMode) {
    boardedShipId = shipId;
    carried = null;
    view = viewMode === 'optimus' ? 'optimus' : 'crew';
    extView = false;
    const st = getState();
    const ship = (st?.vehicles?.fleet || []).find((s) => s.id === shipId);
    systems = { eclss: 1, plants: 1, water: 1, power: 1, ...(ship?.systems || {}) };
    const setup = setupLeoCabin(pose, camera, cabin, view);
    seated = setup.seated;
    belted = setup.belted;
    deck = setup.deck;
    aboard = true;
    phase = PHASE.LEO_OPS;
    phaseT = 0;
    holdEdl = false;
    renderer.setClearColor(0x1a1814, 1);
    detachCam();
    camera.position.copy(pose.pos);
    camera.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
  }

  function resumeSurface(type) {
    view = type === MISSION_TYPES.ROBOTIC ? 'optimus' : 'crew';
    landedEmitted = true;
    systems = { ...(getState()?.experience?.ship || systems) };
    enter(PHASE.MARS_SURFACE);
  }

  function cabinItems() {
    return cabin.interactables.filter((it) => it.deck == null || it.deck === deck
      || (it.kind === 'ladder' && Math.abs(it.deck - deck) <= 1));
  }

  function cabinUse() {
    const near = nearestInteractable(pose.pos, cabinItems(), 2.2);
    if (!near) return;
    if (phase === PHASE.LEO_OPS) {
      const out = applyLeoUse({
        near, held: carried, boardedId: boardedShipId, state: getState(), bus, pose, cabin,
      });
      carried = out.held;
      boardedShipId = out.boardedId;
      if (out.seated) seated = true;
      if (out.deck != null) {
        deck = out.deck;
        cabin.setPlayerDeck?.(deck);
      }
      if (near.kind === 'system') {
        systems[near.system] = Math.min(1, (systems[near.system] ?? 0) + 0.4);
      }
      return;
    }
    if (near.kind === 'seat') {
      seated = true;
      deck = 0;
      pose.pos.set(near.x, CABIN.floorY[0] + 1.18, near.z);
      return;
    }
    if (near.kind === 'ladder' || near.kind === 'hatchway') {
      deck = climbShaft(pose, deck, 1);
      cabin.setPlayerDeck?.(deck);
      return;
    }
    if (near.kind === 'system') {
      systems[near.system] = Math.min(1, (systems[near.system] ?? 0) + 0.5);
      return;
    }
    if (near.kind === 'elevator' && phase === PHASE.MARS_SURFACE) {
      elevatorT = 0;
    }
    if (near.kind === 'console' && near.panel) bus.emit('world:interact', near.panel);
  }

  function lookCrew(dt, now) {
    const burn = tmiBurn > 0;
    const locked = phase === PHASE.ASCENT || phase === PHASE.EDL
      || (phase === PHASE.COUNTDOWN && armed) || burn;
    if (locked) { seated = true; if (phase !== PHASE.EDL || !unbuckledEntry) belted = true; }
    const zeroG = (cabin.gravity ?? 1) < 0.05
      || phase === PHASE.ORBIT || phase === PHASE.TRANSIT || phase === PHASE.LEO_OPS;
    if (seated) {
      if (!locked && (edge('KeyB') || edge('KeyE'))) {
        if (belted) belted = false;
        else seated = false;
      }
      seatCam();
    } else if (zeroG && phase !== PHASE.COUNTDOWN) {
      detachCam();
      const zg = cabin.tickZeroG(dt, pose, input, camera);
      deck = zg.deck;
      if (edge('KeyR')) useHatch(-1);
      else if (edge('KeyE')) useHatch(1);
      if (edge('KeyB')) trySit();
    } else {
      walkCabin(dt);
      if (edge('KeyR')) useHatch(-1);
      else if (edge('KeyE')) useHatch(1);
      if (edge('KeyB')) trySit();
    }
    lastNear = seated ? null : nearestInteractable(pose.pos, cabinItems(), 2.4);
    if (seated && !locked) lastNear = { prompt: '[E] UNBUCKLE' };
    else if (!lastNear && inHatch(pose.pos)) lastNear = { prompt: '[E] AFT  ·  [R] FWD  ·  [F] GRAB' };
    else if (!lastNear && zeroG && !seated) lastNear = { prompt: '[F] HOLD GRAB  ·  WASD  ·  [B] SEAT' };
    skyAcc = skyTick(cabin, phase, phaseT, cfg, skyAcc);
    applyShake(camera, now, phase, phaseT, cfg, 1.35);
    cabin.tick?.(dt, phase);
  }

  function useHatch(dir) {
    if (inHatch(pose.pos) || nearestInteractable(pose.pos, cabinItems(), 2.4)?.kind === 'hatchway') {
      deck = climbShaft(pose, deck, dir);
      cabin.setPlayerDeck?.(deck);
      return;
    }
    if (dir > 0) cabinUse();
  }

  function trySit() {
    const seats = cabin.interactables.filter((i) => i.kind === 'seat');
    const near = nearestInteractable(pose.pos, seats, 2.0);
    if (!near && deck !== 0) return;
    seated = true;
    belted = true;
    deck = 0;
    cabin.setPlayerDeck?.(0);
  }

  function surfaceUse() {
    const st = getState();
    const near = nearestInteractable(pose.pos, mars.interactables || [], 3.2);
    if (near?.kind === 'elevator') {
      aboard = true;
      deck = 6;
      cabin.setGravity?.(0.38);
      cabin.setPlayerDeck?.(6);
      pose.pos.set(3.0, CABIN.floorY[6] + EYE, 0);
      return;
    }
    if (near?.kind === 'node') {
      bus.emit('plan:cmd', { cmd: 'GATHER', nodeId: near.id });
      return;
    }
    if (near?.kind === 'module') {
      bus.emit('world:interact', 'crew');
      return;
    }
    const unplaced = st?.mars?.unplaced?.[0];
    if (unplaced) {
      const fx = -Math.sin(pose.yaw);
      const fz = -Math.cos(pose.yaw);
      bus.emit('plan:cmd', {
        cmd: 'PLACE_MODULE',
        typeId: unplaced.typeId,
        x: pose.pos.x + fx * 3.4,
        z: pose.pos.z + fz * 3.4,
      });
    }
  }

  function tickMars(dt) {
    if (view === 'crew' && aboard) {
      if (elevatorT != null) {
        elevatorT += dt / 6;
        const y0 = CABIN.floorY[6] + EYE;
        camera.position.set(3.3, y0 - elevatorT * 8, 0);
        camera.rotation.set(-0.15, Math.PI / 2, 0, 'YXZ');
        if (elevatorT >= 1) {
          elevatorT = null;
          aboard = false;
          pose.pos.set(mars.elevatorBase.x, EYE, mars.elevatorBase.z);
          pose.yaw = Math.PI;
          pose.pitch = -0.05;
        }
        return;
      }
      lookCrew(dt, 0);
      lastNear = seated ? null : nearestInteractable(pose.pos, cabinItems(), 2.2);
      return;
    }
    const site = getSite();
    const stepped = stepWalk(pose.pos, pose.vel, input, pose.yaw, pose.pitch, dt, GRAVITY_M, mars.collisions, workRadius(site));
    pose.yaw = stepped.yaw;
    pose.pitch = stepped.pitch;
    detachCam();
    camera.position.copy(pose.pos);
    camera.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
    lastNear = nearestInteractable(pose.pos, mars.interactables || [], 3.2);
    if (edge('KeyE')) surfaceUse();
    if (edge('KeyQ') && view === 'crew') {
      aboard = true;
      deck = 6;
      seated = false;
      cabin.setGravity?.(0.38);
      cabin.setPlayerDeck?.(6);
      pose.pos.set(3.0, CABIN.floorY[6] + EYE, 0);
    }
    mars.syncFromState(getState(), site, getData?.());
  }

  function tick(dt, now) {
    pollRate();
    if (edge('KeyV') || edge('KeyC')) toggleView();
    const fdt = dt * Math.max(rate, 0);
    if (!holdEdl) phaseT += fdt;
    if (tmiBurn > 0) tmiBurn = Math.max(0, tmiBurn - fdt);

    if (phase === PHASE.LEO_OPS) {
      if (extView) {
        attachShip(space.scene);
        ship.group.position.set(0, -SHIP.midY, 0);
        tickExtCam(camera, ship, input, pose, PHASE.ORBIT);
      } else lookCrew(dt, now);
      if (edge('KeyM')) bus.emit('world:return-mc');
      const { me, mate } = leoMate(getState(), boardedShipId);
      telem = buildLeoTelem({ view, lastNear, held: carried, me, mate, rate, systems, seated, belted, deck, extView });
      return telem;
    }

    if (phase === PHASE.TRANSIT && view === 'crew') {
      const k = 0.011 * fdt;
      systems.eclss = Math.max(0, systems.eclss - k * 0.9);
      systems.plants = Math.max(0, systems.plants - k * 1.15);
      systems.water = Math.max(0, systems.water - k);
      systems.power = Math.max(0, systems.power - k * 0.55);
    }

    if (!extView && phase !== PHASE.MARS_SURFACE) lookCrew(dt, now);
    else if (phase !== PHASE.MARS_SURFACE) tickExtCam(camera, ship, input, pose, phase);

    if (phase === PHASE.COUNTDOWN) {
      attachShip(earth.scene);
      if (edge('KeyL')) phaseT = 10;
      const left = Math.max(0, 10 - phaseT);
      setRumble(0.18 + (10 - left) * 0.05);
      ship.setPlume(phaseT > 8 ? (phaseT - 8) / 2 : 0);
      if (phaseT >= 10) {
        mile('liftoff', 10);
        enter(PHASE.ASCENT);
      }
    } else if (phase === PHASE.ASCENT) {
      attachShip(earth.scene);
      const u = Math.min(1, phaseT / (cfg.ascentSeconds || 540));
      if (u >= 0.55) mile('maxq', 8);
      if (u >= 0.72) mile('meco', 25);
      const alt = u ** 1.55 * 185000;
      ship.group.position.y = u ** 0.68 * 8800;
      const roll = u < 0.07 ? (u / 0.07) * 1.15 : 1.15;
      const pitch = u < 0.1 ? 0 : Math.min(0.85, (u - 0.1) * 1.05);
      ship.group.rotation.set(0, roll, -pitch);
      ship.setPlume(1);
      setRumble(shakeAmt(phase, phaseT, cfg));
      earth.setAltitudeLook(alt);
      telem.alt = alt;
      telem.vel = u ** 1.15 * 7900;
      telem.mach = telem.vel / 340;
      if (u > 0.72) ship.separateBooster(earth.scene);
      if (u >= 1) {
        mile('insertion', 15);
        enter(PHASE.ORBIT);
      }
    } else if (phase === PHASE.ORBIT) {
      attachShip(space.scene);
      space.earth.rotation.y += dt * 0.03;
      telem.alt = 210000;
      telem.vel = 7800;
      const dest = getState()?.missions?.planned?.find((m) => m.status === 'leo' || m.status === 'go')?.dest || 'leo';
      if (dest !== 'mars') {
        lastNear = { prompt: 'LEO INSERTION COMPLETE  ·  [M] MISSION CONTROL' };
        if (phaseT > 8 || edge('KeyM')) bus.emit('flight:leo-done');
      } else if (edge('KeyT') && !(view === 'crew' && (!seated || !belted))) {
        mile('tmi', 15);
        enter(PHASE.TRANSIT);
      } else if (edge('KeyT')) lastNear = { prompt: 'BELT IN FOR TMI  [B] SEAT' };
    } else if (phase === PHASE.TRANSIT) {
      attachShip(space.scene);
      const u = Math.min(1, phaseT / cfg.transitSeconds);
      space.setTransit(u);
      space.earth.rotation.y += dt * 0.02;
      space.mars.rotation.y += dt * 0.015;
      telem.alt = 2.25e11 * (0.05 + u * 0.9);
      telem.vel = 26000;
      if (u >= 1) {
        if (view === 'crew' && (!seated || !belted)) {
          holdEdl = true;
          holdEdlT = 0;
        } else {
          mile('edl', 10);
          enter(PHASE.EDL);
        }
      }
    } else if (phase === PHASE.EDL) {
      attachShip(space.scene);
      const u = Math.min(1, phaseT / cfg.edlSeconds);
      space.setApproach(u);
      if (u < 0.42) ship.group.rotation.x = Math.PI / 2;
      else if (u < 0.62) ship.group.rotation.x = (Math.PI / 2) * (1 - (u - 0.42) / 0.2);
      else {
        ship.group.rotation.x = 0;
        ship.legs.visible = true;
      }
      telem.alt = (1 - u) * 125000;
      telem.vel = (1 - u) * 5800;
      telem.mach = telem.vel / 240;
      const heat = u > 0.05 && u < 0.45 ? Math.sin(((u - 0.05) / 0.4) * Math.PI) : 0;
      renderer.toneMappingExposure = 1.02 + heat * 1.6;
      ship.setPlume(u > 0.62 ? 0.95 : 0.15);
      setRumble(0.35 + heat * 0.55);
      if (u >= 1) {
        renderer.toneMappingExposure = 1.02;
        enter(PHASE.MARS_SURFACE);
      }
    } else if (phase === PHASE.MARS_SURFACE) {
      tickMars(dt);
    }

    if (ship.tickBooster?.(fdt)) bus.emit('plan:cmd', { cmd: 'BOOSTER_RECOVERED' });
    if (holdEdl) {
      holdEdlT += fdt;
      if (seated && belted) enter(PHASE.EDL);
      else if (holdEdlT > 10) {
        unbuckledEntry = true;
        enter(PHASE.EDL);
      }
    }
    telem = buildFlightTelem({
      phase, view, phaseT, cfg, lastNear, holdEdl, seated, belted, rate, extView,
      telem, getSite, getState, elevatorT, aboard, systems, deck, armed, tmiBurn,
    });
    return telem;
  }

  function activeScene() {
    if (phase === PHASE.MARS_SURFACE && !aboard) return mars.scene;
    if (!extView) return cabin.scene;
    if (phase === PHASE.ORBIT || phase === PHASE.TRANSIT || phase === PHASE.EDL || phase === PHASE.LEO_OPS) {
      return space.scene;
    }
    if (phase === PHASE.MARS_SURFACE) return mars.scene;
    return earth.scene;
  }

  return {
    begin,
    enterLeo,
    resumeSurface,
    tick,
    enter,
    setRate,
    toggleView,
    getRate: () => rate,
    get phase() { return phase; },
    get view() { return view; },
    get extView() { return extView; },
    get telem() { return telem; },
    activeScene,
    pose,
  };
}
