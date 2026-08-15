import { PHASE } from './phases.js';
import { DECK_META } from './ship/constants.js';

function hullFrom(getState) {
  const st = getState?.();
  const ship = (st?.vehicles?.fleet || []).find((s) => s.location === 'outbound' || s.location === 'ascent' || s.location === 'leo')
    || (st?.vehicles?.fleet || [])[0];
  return ship?.name || 'ARK-1 OPTIMUS';
}

function fmtT(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function shipHud({
  phase, phaseT, cfg, lastNear, holdEdl, seated, belted, view, deck,
  getState, elevatorT, aboard, getSite, armed, tmiBurn, rate, extView,
}) {
  const hull = hullFrom(getState);
  const meta = DECK_META[deck] || DECK_META[0];
  const deckName = `${meta.id} ${meta.name}`;
  const viewHint = extView ? '[V] CABIN' : '[V] OUTSIDE';
  const ascentU = Math.min(1, phaseT / (cfg.ascentSeconds || 540));
  let missionLabel = 'PAD';
  let gee = 1;
  let day = 0;
  const span = 251;
  if (phase === PHASE.COUNTDOWN) {
    missionLabel = `T− ${Math.max(0, 10 - phaseT).toFixed(1)}`;
  } else if (phase === PHASE.ASCENT) {
    const tag = ascentU < 0.08 ? 'LIFTOFF' : ascentU < 0.35 ? 'ASCENT' : ascentU < 0.55 ? 'MAX-Q'
      : ascentU < 0.78 ? 'MECO' : 'INSERT';
    missionLabel = `${tag}  T+ ${fmtT(phaseT)}`;
    gee = 1 + ascentU * 2.5;
  } else if (phase === PHASE.ORBIT || phase === PHASE.LEO_OPS) {
    missionLabel = 'LEO';
    gee = 0;
  } else if (phase === PHASE.TRANSIT) {
    missionLabel = (tmiBurn || 0) > 0 ? 'TMI BURN' : 'COAST';
    gee = (tmiBurn || 0) > 0 ? 0.3 : 0;
    day = Math.round(Math.min(1, phaseT / (cfg.transitSeconds || 150)) * 250);
  } else if (phase === PHASE.EDL) {
    missionLabel = 'ENTRY';
    gee = 0.4;
  } else if (phase === PHASE.MARS_SURFACE) {
    missionLabel = 'MARS';
    gee = 0.38;
  }
  if ((rate ?? 1) === 0) missionLabel = `PAUSED  ·  ${missionLabel}`;
  let prompt = lastNear?.prompt || '';
  if (phase === PHASE.COUNTDOWN) {
    prompt = `T− ${Math.max(0, 10 - phaseT).toFixed(1)}  ·  [L] SKIP  ·  ${viewHint}`;
  } else if (phase === PHASE.ASCENT) {
    prompt = `T+ ${fmtT(phaseT)}  ·  BELTED  ·  ${viewHint}`;
  } else if (phase === PHASE.ORBIT) {
    prompt = seated
      ? `[E] UNBUCKLE  ·  [T] TMI  ·  ${viewHint}`
      : (lastNear?.prompt || `[B] SEAT  ·  ${viewHint}  ·  [T] TMI`);
  } else if (phase === PHASE.TRANSIT && (tmiBurn || 0) > 0) {
    prompt = 'TMI BURN — STAY BELTED';
  } else if (phase === PHASE.EDL) prompt = belted ? 'BELTED · ENTRY' : 'UNBELTED — YOU MAY NOT SURVIVE';
  if (holdEdl) prompt = 'SIT AND BELT — ENTRY OR YOU DIE';
  if (elevatorT != null) prompt = 'ELEVATOR';
  if (phase === PHASE.MARS_SURFACE && !aboard) {
    const pack = getState()?.mars?.unplaced?.[0];
    prompt = lastNear?.prompt || (pack ? `[E] PLACE ${pack.typeId}` : 'WASD  ·  Q SHIP');
  }
  if (phase !== PHASE.MARS_SURFACE && !prompt.includes('[V]')) prompt = `${prompt}${prompt ? '  ·  ' : ''}${viewHint}`;
  void view;
  void armed;
  const title = phase === PHASE.MARS_SURFACE && !aboard
    ? (getSite()?.name || 'MARS').toUpperCase()
    : `${hull} · ${deckName}`;
  return {
    hud: phase === PHASE.MARS_SURFACE && !aboard ? 'flight' : 'ship',
    phase,
    title,
    shipName: hull,
    deckName,
    call: '',
    prompt,
    stage: '',
    gee,
    transitDay: day,
    transitSpan: span,
    missionLabel,
    alt: 0,
    vel: 0,
    mach: 0,
    rate: rate ?? 1,
    belt: '',
    seated,
    view,
    extView: Boolean(extView),
    systems: null,
    site: getSite?.(),
  };
}

export function buildFlightTelem(ctx) {
  if (ctx.view === 'optimus' && ctx.phase !== PHASE.LEO_OPS && ctx.phase !== PHASE.MARS_SURFACE) {
    const hint = ctx.extView ? '[V] CABIN' : '[V] OUTSIDE';
    const label = ctx.phase === PHASE.ASCENT
      ? `ASCENT  T+ ${fmtT(ctx.phaseT || 0)}`
      : ctx.phase === PHASE.COUNTDOWN
        ? `T− ${Math.max(0, 10 - (ctx.phaseT || 0)).toFixed(1)}`
        : 'PAD';
    return {
      hud: 'flight',
      phase: ctx.phase,
      title: 'OPTIMUS CAM',
      call: '',
      prompt: ctx.lastNear?.prompt || `${hint}  ·  1/3/0/4 RATE`,
      stage: '',
      gee: ctx.phase === PHASE.ASCENT ? 2 : 1,
      transitDay: 0,
      transitSpan: 251,
      missionLabel: (ctx.rate ?? 1) === 0 ? `PAUSED  ·  ${label}` : label,
      alt: 0,
      vel: 0,
      mach: 0,
      rate: ctx.rate,
      belt: '',
      seated: ctx.seated,
      view: ctx.view,
      extView: Boolean(ctx.extView),
      systems: null,
      site: ctx.getSite?.(),
    };
  }
  const out = shipHud(ctx);
  out.rate = ctx.rate;
  return out;
}
