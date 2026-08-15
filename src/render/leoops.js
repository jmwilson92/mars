import { PHASE } from './phases.js';
import { CABIN } from './cabin.js';
import { EYE } from './locomotion.js';

export function setupLeoCabin(pose, camera, cabin, view) {
  pose.pos.set(0.4, CABIN.floorY[3] + EYE, 2.2);
  pose.yaw = Math.PI;
  pose.pitch = -0.04;
  pose.roll = 0;
  camera.position.copy(pose.pos);
  camera.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
  cabin.setView('orbit', 0);
  cabin.setGravity?.(0);
  cabin.setPlayerDeck?.(3);
  return { seated: false, belted: false, deck: 3, view: view === 'optimus' ? 'optimus' : 'crew' };
}

export function leoMate(state, boardedId) {
  const fleet = state?.vehicles?.fleet || [];
  const me = fleet.find((s) => s.id === boardedId);
  if (!me?.dockedWith) return { me: me || null, mate: null };
  return { me, mate: fleet.find((s) => s.id === me.dockedWith) || null };
}

export function applyLeoUse({ near, held, boardedId, state, bus, pose, cabin }) {
  const { me, mate } = leoMate(state, boardedId);
  if (!near) return { held, boardedId };
  if (near.kind === 'hatch') {
    if (!mate) return { held, boardedId };
    pose.pos.set(-1.2, CABIN.floorY[6] + EYE, -1.6);
    return { held, boardedId: mate.id, deck: 6 };
  }
  if (near.kind === 'refuel' && mate && me) {
    const from = (mate.variant === 'tanker' || (mate.fuel ?? 0) > (me.fuel ?? 0)) ? mate : me;
    const to = from.id === me.id ? mate : me;
    bus.emit('plan:cmd', { cmd: 'REFUEL', fromId: from.id, toId: to.id });
    return { held, boardedId };
  }
  if (near.kind === 'crate') {
    if (held) {
      if (held.from !== boardedId) {
        bus.emit('plan:cmd', {
          cmd: 'TRANSFER_ITEM',
          fromId: held.from,
          toId: boardedId,
          kind: held.kind,
        });
      }
      return { held: null, boardedId };
    }
    const key = near.item === 'air' ? 'airDays' : near.item === 'fuel' ? 'fuel' : near.item;
    const have = key === 'fuel' ? (me?.fuel ?? 0) : (me?.stores?.[key] || 0);
    if (have <= 0) return { held, boardedId };
    return { held: { kind: near.item, from: boardedId }, boardedId };
  }
  if (near.kind === 'system') {
    bus.emit('plan:cmd', { cmd: 'SERVICE_SHIP', shipId: boardedId, system: near.system });
    return { held, boardedId };
  }
  if (near.kind === 'seat') {
    pose.pos.set(near.x, CABIN.floorY[0] + 1.18, near.z);
    return { held, boardedId, seated: true };
  }
  if (near.kind === 'ladder' || near.kind === 'hatchway') {
    const dir = near.to != null ? Math.sign(near.to - (near.deck ?? 0)) || 1 : 1;
    const next = Math.max(0, Math.min(6, (near.deck ?? 0) + dir));
    pose.pos.set(0.05, CABIN.floorY[next] + EYE, 0.2);
    return { held, boardedId, deck: next };
  }
  void cabin;
  return { held, boardedId };
}

export function leoPrompt(near, { held, me, mate, view }) {
  if (held) {
    if (near?.kind === 'hatch' && mate) return `[E] CARRY ${held.kind.toUpperCase()} INTO ${mate.name}`;
    if (near?.kind === 'crate') return `[E] SET DOWN ${held.kind.toUpperCase()}`;
    return `CARRYING ${held.kind.toUpperCase()}  ·  hatch to the other ship`;
  }
  if (near?.kind === 'hatch') {
    return mate ? `[E] ENTER ${mate.name}` : 'HATCH SEALED — dock from Mission Control';
  }
  if (near?.kind === 'refuel') {
    return mate ? '[E] PUMP PROPELLANT' : 'NO TANKER ON THE HATCH';
  }
  if (near?.prompt) return near.prompt;
  return view === 'optimus' ? '[E] USE  ·  [F] GRAB  ·  [M] MISSION CONTROL' : '[E] USE  ·  [F] GRAB  ·  [M] MISSION CONTROL';
}

export function buildLeoTelem({ view, lastNear, held, me, mate, rate, systems, seated, belted, deck = 3, extView }) {
  const hint = extView ? '[V] CABIN' : '[V] OUTSIDE';
  const prompt = `${leoPrompt(lastNear, { held, me, mate, view })}  ·  ${hint}`;
  return {
    hud: 'ship',
    phase: PHASE.LEO_OPS,
    title: `${me?.name || 'ARK-1 OPTIMUS'} · ${['D1 FLIGHT DECK', 'D2 OPS & COMMS', 'D3 CREW QUARTERS', 'D4 COMMONS', 'D5 LABORATORY', 'D6 AGRICULTURE', 'D7 SYSTEMS & CARGO'][deck] || 'D4 COMMONS'}`,
    shipName: me?.name || 'ARK-1 OPTIMUS',
    deckName: ['D1 FLIGHT DECK', 'D2 OPS & COMMS', 'D3 CREW QUARTERS', 'D4 COMMONS', 'D5 LABORATORY', 'D6 AGRICULTURE', 'D7 SYSTEMS & CARGO'][deck] || 'D4 COMMONS',
    call: '',
    prompt,
    stage: '',
    gee: 0,
    transitDay: 0,
    transitSpan: 251,
    missionLabel: 'LEO',
    alt: 0,
    vel: 0,
    mach: 0,
    rate,
    belt: '',
    seated,
    belted,
    view,
    extView: Boolean(extView),
    systems: { ...systems },
    site: null,
  };
}
