import { formatMoney, formatMass } from '../util/units.js';
import { TOON_STAFF } from '../render/cartoon.js';

function staffAt(station) {
  return TOON_STAFF.find((s) => s.station === station) ?? null;
}
import { MISSION_TYPES } from '../render/phases.js';
import {
  activeDraft,
  evaluateMission,
  isUnlocked,
  missionHardwareCost,
  missionLaunchCost,
} from '../sim/planning.js';
import { TASKS } from '../sim/crew.js';
import { techGlyph } from './techart.js';
import { DEORBIT_FUEL, peopleOnShip } from '../sim/fleet.js';

export function bindTerminals(root, { bus, getData, getState }) {
  const el = root.querySelector('[data-terminal]');
  const title = root.querySelector('[data-terminal-title]');
  const body = root.querySelector('[data-terminal-body]');
  let openId = null;

  function cmd(payload) {
    bus.emit('plan:cmd', payload);
  }

  function close() {
    openId = null;
    el.hidden = true;
    bus.emit('ui:terminal-close');
  }

  function renderBudget(state, data) {
    const b = state.earth.budget;
    const who = staffAt('budget');
    title.textContent = who ? `${who.name}  ·  ${who.role}` : 'APPROPRIATIONS';
    const ledger = b.ledger || [];
    const byKind = { mission: 0, research: 0, other: 0 };
    for (const row of ledger) byKind[row.kind] = (byKind[row.kind] || 0) + row.amount;
    const spent = b.annual - b.remaining;
    const draft = activeDraft(state);
    const ev = draft ? evaluateMission(state, data, draft) : null;
    const rows = ledger.slice(-8).reverse().map((r) =>
      `<div><dt>${r.label}</dt><dd>−${formatMoney(r.amount)}</dd></div>`).join('');
    body.innerHTML = `
      <p class="fine">Where the appropriation went. Hoarding still looks worse than spending.</p>
      <dl class="term-dl">
        <div><dt>MANDATE</dt><dd>${state.meta.difficulty}</dd></div>
        <div><dt>ANNUAL</dt><dd>${formatMoney(b.annual)}</dd></div>
        <div><dt>SPENT</dt><dd>${formatMoney(spent)}</dd></div>
        <div><dt>  · MISSIONS</dt><dd>${formatMoney(byKind.mission || 0)}</dd></div>
        <div><dt>  · RESEARCH</dt><dd>${formatMoney(byKind.research || 0)}</dd></div>
        <div><dt>REMAINING</dt><dd>${formatMoney(b.remaining)}</dd></div>
        <div><dt>SUPPORT</dt><dd>${Math.round(state.earth.politics.support)}</dd></div>
      </dl>
      ${ev ? `<p>THIS DRAFT  ${formatMoney(ev.cost)}  ·  AFTER  ${formatMoney(b.remaining - (draft.status === 'draft' ? ev.cost : 0))}</p>` : ''}
      <h2>LEDGER</h2>
      <dl class="term-dl">${rows || '<div><dt>Nothing posted.</dt><dd>—</dd></div>'}</dl>
    `;
  }

  function renderSchedule(state, data) {
    const m = activeDraft(state);
    if (!m) {
      title.textContent = 'A. OKONKWO  ·  CAPCOM';
      body.innerHTML = `<button type="button" class="cta" data-act="ensure">OPEN A DRAFT WINDOW</button>`;
      return;
    }
    const ev = evaluateMission(state, data, m);
    title.textContent = 'A. OKONKWO  ·  CAPCOM';
    body.innerHTML = `
      <p class="fine">${m.id}  ·  ${m.status.toUpperCase()}  ·  ${m.ships} stack(s). Live hulls: MISSIONS tab.</p>
      <div class="term-row">
        ${Object.values(MISSION_TYPES).map((t) =>
          `<button type="button" class="${m.type === t ? 'is-on' : ''}" data-act="type" data-type="${t}">${t}</button>`).join('')}
      </div>
      <div class="term-row">
        <span>DESTINATION</span>
        <button type="button" class="${(m.dest || 'leo') === 'leo' ? 'is-on' : ''}" data-act="dest" data-dest="leo">LEO</button>
        <button type="button" class="${m.dest === 'mars' ? 'is-on' : ''}" data-act="dest" data-dest="mars">MARS</button>
      </div>
      <div class="term-row">
        <span>STACKS THIS WINDOW</span>
        <button type="button" data-act="ships" data-n="-1">−</button>
        <strong>${m.ships}</strong>
        <button type="button" data-act="ships" data-n="1">+</button>
      </div>
      <dl class="term-dl">
        <div><dt>LAUNCH</dt><dd>${formatMoney(missionLaunchCost(data, m, state))}</dd></div>
        <div><dt>HARDWARE</dt><dd>${formatMoney(missionHardwareCost(data, m))}</dd></div>
        <div><dt>TOTAL</dt><dd>${formatMoney(ev.cost)}</dd></div>
        <div><dt>MASS</dt><dd>${formatMass(ev.mass)} / ${formatMass(ev.payKg)}</dd></div>
        <div><dt>VOLUME</dt><dd>${ev.vol.toFixed(0)} / ${ev.payM3} m³</dd></div>
        <div><dt>ROOM LEFT</dt><dd>${formatMass(Math.max(0, ev.payKg - ev.mass))}  ·  ${Math.max(0, ev.payM3 - ev.vol).toFixed(0)} m³</dd></div>
      </dl>
      <div class="load-bars">
        <div class="load-bar"><i style="width:${Math.min(100, (ev.mass / ev.payKg) * 100)}%" class="${ev.mass > ev.payKg ? 'is-over' : ''}"></i></div>
        <div class="load-bar"><i style="width:${Math.min(100, (ev.vol / ev.payM3) * 100)}%" class="${ev.vol > ev.payM3 ? 'is-over' : ''}"></i></div>
      </div>
      ${ev.mass > ev.payKg || ev.vol > ev.payM3 ? `<p class="sev-red">STACK REPORT — OVERBURDENED. Cut cargo or add a ship.</p>` : `<p class="sev-green">STACK REPORT — mass and volume inside the bay.</p>`}
      ${m.type === 'CREWED' && ev.consumables ? `<p>FOOD ${Math.round(ev.consumables.foodHave)}/${Math.round(ev.consumables.foodNeed)} kg  ·  WATER ${Math.round(ev.consumables.waterHave)}/${Math.round(ev.consumables.waterNeed)} kg  ·  ECLSS ${ev.consumables.airSeats}/${ev.consumables.airNeed}</p>` : ''}
      <ul class="term-flags">${ev.flags.map((f) => `<li class="sev-${f.sev}">${f.text}</li>`).join('') || '<li>No flags.</li>'}</ul>
      <button type="button" class="cta" data-act="commit" ${ev.go && m.status === 'draft' ? '' : 'disabled'}>
        ${m.status === 'go' ? 'COMMITTED — add cargo on CARGO INTEGRATION, then GO at the wall' : 'COMMIT AND PAY'}
      </button>
      ${m.status === 'go' && m.type !== 'CARGO' ? `<button type="button" data-act="leo">PARK IN LEO — OPTIMUS LAB</button>` : ''}
      ${m.status === 'go' && m.type === 'CARGO' ? `<button type="button" data-act="sendleo" data-mid="${m.id}">SEND TO LEO — TANKER / RESUPPLY</button>` : ''}
      ${(state.earth.labs || []).some((l) => (l.crew || 0) > 0 && (l.offline || l.food < 800)) && m.status === 'go' ? `<button type="button" data-act="restock">RESTOCK CREWED LAB</button>` : ''}
      ${m.vehicleIds?.length ? `<p class="fine">HULL ${m.vehicleIds.join(', ')} — stays in the fleet after landing.</p>` : ''}
      ${(state.vehicles?.boosters || []).some((b) => b.location === 'pad')
        ? `<p class="sev-green">Reused booster on the pad — this stack pays refuel, not a new booster.</p>`
        : `<p class="fine">First booster is in the launch price. After MECO it flips, boosts back, and you only refuel it next time.</p>`}
      ${state.colonists.living.length ? `<button type="button" data-act="roster">CREW ROSTER</button>` : ''}
      ${renderLabs(state)}
    `;
  }

  function renderLabs(state) {
    const labs = state.earth.labs || [];
    if (!labs.length) {
      return `<p class="fine">Park a ROBOTIC stack (Optimus) in LEO for a slow RP feed. Cargo cannot be a lab. Food, water, and air only matter if humans are aboard.</p>`;
    }
    return `<h2>LEO LABS</h2>${labs.map((l) => {
      const crew = l.crew || 0;
      const stocks = crew > 0
        ? ` ·  food ${Math.round(l.food)} kg  ·  water ${Math.round(l.water)} kg  ·  air ${Math.round(l.airDays)} d`
        : ' ·  Optimus only — no consumables';
      return `<p class="${l.offline ? 'sev-red' : 'sev-green'}">${l.id}  ·  ${l.robots || 0} OPT  ·  ${crew} crew  ·  ${l.offline ? 'OFFLINE' : '+' + (l.rpPerDay || 3) + ' RP/day'}${stocks}</p>`;
    }).join('')}`;
  }

  function renderManifest(state, data) {
    const m = activeDraft(state);
    title.textContent = 'L. CHEN  ·  CARGO INTEGRATION';
    if (!m) {
      body.innerHTML = `<p class="fine">Open a draft on the schedule terminal first.</p>`;
      return;
    }
    const ev = evaluateMission(state, data, m);
    const rows = data.cargo.map((c) => {
      const line = m.manifest.find((l) => l.cargoId === c.id);
      const qty = line?.qty ?? 0;
      const lock = !isUnlocked(state, data, c.id);
      const frozen = m.status !== 'draft' && m.status !== 'go';
      const hide = m.type === 'ROBOTIC' && (c.category === 'crew' || c.id === 'food_pallet' || c.id === 'water_pallet');
      if (hide) return '';
      return `<tr class="${lock ? 'is-lock' : ''}">
        <td>${c.name}</td>
        <td>${formatMass(c.mass_kg)}</td>
        <td>${formatMoney(c.cost)}</td>
        <td>
          <button type="button" data-act="sub" data-id="${c.id}" ${lock || frozen ? 'disabled' : ''}>−</button>
          ${qty}
          <button type="button" data-act="add" data-id="${c.id}" ${lock || frozen ? 'disabled' : ''}>+</button>
        </td>
        <td>${lock ? `LOCKED  ${c.techRequired}` : c.category}</td>
      </tr>`;
    }).join('');
    const paid = m.status === 'go';
    body.innerHTML = `
      <p class="fine">${m.type === 'ROBOTIC' ? 'Optimus only. No food, water, or crew seats.' : 'Mass is the enemy.'} ${m.type}. ${paid ? 'PAID — add more cargo here; you pay the hardware.' : 'Open CARGO INTEGRATION to load the stack.'}</p>
      <p>MASS ${formatMass(ev.mass)} / ${formatMass(ev.payKg)}  ·  ROOM ${formatMass(Math.max(0, ev.payKg - ev.mass))}  ·  VOL ${ev.vol.toFixed(0)}/${ev.payM3} m³${m.type === 'CREWED' ? `  ·  CREW ${ev.crew}` : `  ·  OPT ${ev.robots}`}</p>
      <div class="load-bar"><i style="width:${Math.min(100, (ev.mass / ev.payKg) * 100)}%" class="${ev.mass > ev.payKg ? 'is-over' : ''}"></i></div>
      ${ev.mass > ev.payKg ? `<p class="sev-red">OVERBURDENED — ${formatMass(ev.mass - ev.payKg)} over payload.</p>` : ''}
      ${m.type === 'CREWED' ? consumableBlock(ev) : ''}
      <ul class="term-flags">${ev.flags.filter((f) => f.sev !== 'green').map((f) => `<li class="sev-${f.sev}">${f.text}</li>`).join('')}</ul>
      <table class="term-table">${rows}</table>
    `;
  }

  function consumableBlock(ev) {
    const c = ev.consumables;
    if (!c) return '';
    return `<dl class="term-dl">
      <div><dt>FOOD</dt><dd>${Math.round(c.foodHave)} / ${Math.round(c.foodNeed)} kg</dd></div>
      <div><dt>WATER</dt><dd>${Math.round(c.waterHave)} / ${Math.round(c.waterNeed)} kg</dd></div>
      <div><dt>AIR / ECLSS</dt><dd>${c.airSeats} seats / ${c.airNeed} crew</dd></div>
    </dl>`;
  }

  function renderResearch(state, data) {
    title.textContent = 'D. VOSS  ·  CHIEF SCIENTIST';
    const active = state.earth.research.active;
    const branches = [];
    for (const t of data.tech) {
      if (!branches.includes(t.branch)) branches.push(t.branch);
    }
    const sections = branches.map((br) => {
      const cards = data.tech.filter((t) => t.branch === br).map((t) => {
        const done = state.earth.research.completed.includes(t.id);
        const blocked = (t.prereqs || []).some((p) => !state.earth.research.completed.includes(p));
        const on = active?.id === t.id;
        const spec = t.speculative ? '<span class="spec">UNPROVEN</span>' : '';
        const need = t.cost_rp || t.cost_usd
          ? `${t.cost_rp ? t.cost_rp + ' RP' : ''}${t.cost_rp && t.cost_usd ? ' + ' : ''}${t.cost_usd ? formatMoney(t.cost_usd) : ''}`
          : 'STARTING';
        return `<article class="tech ${done ? 'is-done' : ''} ${blocked ? 'is-lock' : ''} ${t.speculative ? 'is-spec' : ''}">
          ${techGlyph(t.id)}
          <div class="tech-copy">
            <header><strong>${t.name}</strong><span>${done ? 'UNLOCKED' : on ? `RUNNING ${active.progress}/${active.durationDays}d` : need}</span></header>
            <p>${spec}${t.description}${t.prereqs?.length ? `  Needs: ${t.prereqs.join(', ')}.` : ''}</p>
            ${done || on || blocked || t.startCompleted ? '' : `<button type="button" data-act="res" data-id="${t.id}">START</button>`}
          </div>
        </article>`;
      }).join('');
      return `<h2 class="tech-branch">${br.replace(/_/g, ' ')}</h2>${cards}`;
    }).join('');
    const labRp = (state.earth.labs || []).filter((l) => !l.offline).reduce((s, l) => s + (l.rpPerDay || 3), 0);
    body.innerHTML = `
      <p>RP ON HAND  <strong>${state.earth.research.points || 0}</strong>
        ${labRp ? ` ·  LEO LAB +${labRp}/day` : ''}
      </p>
      <p class="fine">You cannot buy RP. Fly. Hit MECO. Park Optimus in LEO. Humans in that lab need food, water, and air — robots do not.</p>
      <div class="tech-list">${sections}</div>
    `;
  }

  function renderCrew(state, data) {
    title.textContent = 'CREW ROSTER';
    const living = state.colonists.living || [];
    if (!living.length) {
      body.innerHTML = `<p class="fine">No crew on Mars yet. Manifest seats or Optimus units, then fly them.</p>`;
      return;
    }
    const roles = data.roles || [];
    const rows = living.map((c) => {
      const roleOpts = roles
        .filter((r) => c.kind === 'robot' ? r.class === 'crew' : true)
        .map((r) => `<option value="${r.id}" ${c.role === r.id ? 'selected' : ''}>${r.name}</option>`)
        .join('');
      const role = roles.find((r) => r.id === c.role);
      const allowed = new Set(['idle', ...(role?.tasks || [])]);
      const taskOpts = TASKS.filter((t) => allowed.has(t.id))
        .map((t) => `<option value="${t.id}" ${c.task === t.id ? 'selected' : ''}>${t.name}</option>`)
        .join('');
      return `<tr>
        <td><strong>${c.name}</strong><div class="fine">${c.kind} · hp ${Math.round((c.health ?? 1) * 100)}</div></td>
        <td><select data-act="role" data-id="${c.id}">${roleOpts}</select></td>
        <td><select data-act="task" data-id="${c.id}">${taskOpts}</select></td>
      </tr>`;
    }).join('');
    const ice = Math.round(state.mars.resources.water_ice || 0);
    const food = Math.round(state.mars.resources.food_dry || 0);
    const wait = (state.mars.unplaced || []).length;
    body.innerHTML = `
      <p class="fine">Assign roles. Tasks run every sol. Citizens unlock once the city can house 24.</p>
      <p>ICE ${ice} kg  ·  FOOD ${food} kg  ·  UNPLACED ${wait}  ·  POP ${living.length}</p>
      <table class="term-table">${rows}</table>
    `;
  }

  function renderFleet(state) {
    title.textContent = 'MISSION CONTROL  ·  FLEET';
    const fleet = state.vehicles?.fleet || [];
    const draft = activeDraft(state);
    const padIdle = fleet.filter((s) => s.location === 'pad' && !s.missionId);
    if (!fleet.length) {
      body.innerHTML = `<p class="fine">No hulls yet. Commit a stack on the schedule console. Once you pay for a Starship it stays in the fleet and you fly it again.</p>`;
      return;
    }
    const cards = fleet.map((s) => shipCard(state, s, fleet)).join('');
    const assign = draft && draft.status === 'draft' && padIdle.length
      ? `<h2>PAD — REUSE</h2><p class="fine">Assign a recovered hull to ${draft.id} instead of buying another.</p>${
        padIdle.map((s) =>
          `<button type="button" data-act="assign" data-ship="${s.id}">ASSIGN ${s.name} TO DRAFT</button>`).join(' ')
      }`
      : '';
    body.innerHTML = `
      <p class="fine">Command current vehicles from here. Jump POV into a LEO stack. Deorbit if you have fuel; otherwise send a tanker, dock, and refuel.</p>
      ${cards}
      ${assign}
    `;
  }

  function shipCard(state, s, fleet) {
    const fuelPct = Math.round((s.fuel ?? 0) * 100);
    const dry = (s.fuel ?? 0) < DEORBIT_FUEL;
    const stores = s.stores || {};
    const mate = s.dockedWith ? fleet.find((x) => x.id === s.dockedWith) : null;
    const leo = fleet.filter((x) => x.location === 'leo' && x.id !== s.id);
    const people = peopleOnShip(state, s.id);
    const humans = people.filter((p) => p.kind === 'human');
    const bots = people.filter((p) => p.kind === 'robot');
    const canRefuel = Boolean(mate) && state.earth.research.completed.includes('orbital_refuel');
    const from = mate && ((mate.variant === 'tanker' || (mate.fuel ?? 0) > (s.fuel ?? 0)) ? mate : s);
    const to = from && mate ? (from.id === s.id ? mate : s) : null;
    const loc = (s.location || 'pad').replace('_', ' ').toUpperCase();
    const actions = [];
    if (s.location === 'pad' && s.missionId) {
      const mission = (state.missions.planned || []).find((m) => m.id === s.missionId);
      if (mission && mission.type !== 'CARGO') {
        actions.push(`<button type="button" data-act="leo" data-mid="${s.missionId}">PARK IN LEO</button>`);
      } else {
        actions.push(`<button type="button" data-act="sendleo" data-mid="${s.missionId}">SEND TO LEO</button>`);
      }
    }
    if (s.location === 'leo') {
      actions.push(`<button type="button" data-act="home" data-ship="${s.id}" ${dry || mate ? 'disabled' : ''}>COME HOME</button>`);
      if (s.crew > 0 || humans.length) {
        actions.push(`<button type="button" data-act="board" data-ship="${s.id}" data-view="crew">JUMP TO CREW</button>`);
      }
      if (s.robots > 0 || bots.length) {
        actions.push(`<button type="button" data-act="board" data-ship="${s.id}" data-view="optimus">JUMP TO OPTIMUS</button>`);
      }
      if (!s.crew && !s.robots && !humans.length && !bots.length) {
        actions.push(`<button type="button" data-act="board" data-ship="${s.id}" data-view="optimus">JUMP ABOARD</button>`);
      }
      if (mate) {
        actions.push(`<button type="button" data-act="undock" data-ship="${s.id}">UNDOCK</button>`);
        const dest = (s.crew > 0 || s.robots > 0) ? s : ((mate.crew > 0 || mate.robots > 0) ? mate : s);
        const src = dest.id === s.id ? mate : s;
        actions.push(`<button type="button" data-act="xfer" data-from="${src.id}" data-to="${dest.id}">CREW TRANSFER CARGO</button>`);
        if (canRefuel && to) {
          actions.push(`<button type="button" data-act="refuel" data-from="${from.id}" data-to="${to.id}">REFUEL</button>`);
        }
      } else {
        for (const o of leo) {
          actions.push(`<button type="button" data-act="dock" data-a="${s.id}" data-b="${o.id}">DOCK ${o.name}</button>`);
        }
      }
    }
    const fuelNote = s.location === 'leo'
      ? (dry ? 'DRY — tanker required' : `deorbit reserve ${Math.round(DEORBIT_FUEL * 100)}%`)
      : '';
    return `<article class="fleet-card">
      <header><strong>${s.name}</strong><span>${s.variant.toUpperCase()}  ·  ${loc}</span></header>
      <p>FUEL ${fuelPct}%${fuelNote ? `  ·  ${fuelNote}` : ''}  ·  CREW ${s.crew || 0}  ·  OPT ${s.robots || 0}</p>
      <p>FOOD ${Math.round(stores.food || 0)} kg  ·  WATER ${Math.round(stores.water || 0)} kg  ·  AIR ${Math.round(stores.airDays || 0)} d</p>
      <p class="fine">${mate ? `DOCKED  ${mate.name}` : s.missionId ? `MISSION ${s.missionId}` : 'UNASSIGNED — ready to reuse'}
        ${s.flights ? `  ·  FLIGHTS ${s.flights}` : ''}</p>
      ${dry && s.location === 'leo' ? `<p class="sev-amber">No deorbit propellant. Get a tanker up, dock, refuel, then send this hull home.</p>` : ''}
      <div class="fleet-actions">${actions.join('')}</div>
    </article>`;
  }

  function renderSite(state, data) {
    title.textContent = 'K. HALE  ·  LANDING SITES';
    body.innerHTML = data.sites.map((s) => `
      <button type="button" class="site ${state.experience.siteId === s.id ? 'is-on' : ''}" data-act="site" data-id="${s.id}">
        <strong>${s.name}</strong>
        <span>${s.lat.toFixed(1)}°, ${s.lon.toFixed(1)}°  ·  ice ${s.waterIce_abundance} @ ${s.waterIce_depth_m} m  ·  solar ${s.solarFactor}</span>
        <em>${s.notes}${s.waterIce_abundance >= 0.2 ? '  Ice rigs will auto-harvest here once placed.' : ''}</em>
      </button>
    `).join('');
  }

  function paint() {
    if (!openId) return;
    const state = getState();
    const data = getData();
    if (!state) return;
    if (openId === 'budget') renderBudget(state, data);
    else if (openId === 'schedule') renderSchedule(state, data);
    else if (openId === 'manifest') renderManifest(state, data);
    else if (openId === 'research') renderResearch(state, data);
    else if (openId === 'site') renderSite(state, data);
    else if (openId === 'crew') renderCrew(state, data);
    else if (openId === 'fleet') renderFleet(state);
  }

  function open(id) {
    if (id === 'pad') {
      bus.emit('world:goto-pad');
      return;
    }
    openId = id;
    el.hidden = false;
    paint();
    bus.emit('ui:terminal-open');
  }

  body.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const act = btn.dataset.act;
    const state = getState();
    const draft = state ? activeDraft(state) : null;
    if (act === 'ensure') cmd({ cmd: 'ENSURE_DRAFT' });
    else if (act === 'type') cmd({ cmd: 'SET_MISSION_TYPE', missionId: draft?.id, missionType: btn.dataset.type });
    else if (act === 'dest') cmd({ cmd: 'SET_DEST', missionId: draft?.id, dest: btn.dataset.dest });
    else if (act === 'ships') cmd({ cmd: 'SET_SHIPS', missionId: draft?.id, ships: (draft?.ships || 1) + Number(btn.dataset.n) });
    else if (act === 'commit') cmd({ cmd: 'COMMIT_MISSION', missionId: draft?.id });
    else if (act === 'add') cmd({ cmd: 'ADD_CARGO', missionId: draft?.id, cargoId: btn.dataset.id, qty: 1 });
    else if (act === 'sub') cmd({ cmd: 'REMOVE_CARGO', missionId: draft?.id, cargoId: btn.dataset.id, qty: 1 });
    else if (act === 'res') cmd({ cmd: 'START_RESEARCH', techId: btn.dataset.id });
    else if (act === 'site') cmd({ cmd: 'SET_SITE', siteId: btn.dataset.id });
    else if (act === 'roster') open('crew');
    else if (act === 'leo') cmd({ cmd: 'PARK_LEO', missionId: btn.dataset.mid || draft?.id });
    else if (act === 'restock') cmd({ cmd: 'RESTOCK_LAB', missionId: draft?.id });
    else if (act === 'sendleo') cmd({ cmd: 'SEND_LEO', missionId: btn.dataset.mid || draft?.id });
    else if (act === 'home') cmd({ cmd: 'COME_HOME', shipId: btn.dataset.ship });
    else if (act === 'dock') cmd({ cmd: 'DOCK', a: btn.dataset.a, b: btn.dataset.b });
    else if (act === 'undock') cmd({ cmd: 'UNDOCK', shipId: btn.dataset.ship });
    else if (act === 'refuel') cmd({ cmd: 'REFUEL', fromId: btn.dataset.from, toId: btn.dataset.to });
    else if (act === 'xfer') cmd({ cmd: 'TRANSFER_CARGO', fromId: btn.dataset.from, toId: btn.dataset.to });
    else if (act === 'assign') cmd({ cmd: 'SET_VEHICLE', missionId: draft?.id, shipId: btn.dataset.ship });
    else if (act === 'board') {
      close();
      bus.emit('world:board-ship', { shipId: btn.dataset.ship, view: btn.dataset.view || 'crew' });
    }
  });

  body.addEventListener('change', (e) => {
    const el = e.target.closest('select');
    if (!el) return;
    if (el.dataset.act === 'role') cmd({ cmd: 'SET_CREW_ROLE', colonistId: el.dataset.id, roleId: el.value });
    if (el.dataset.act === 'task') cmd({ cmd: 'SET_CREW_TASK', colonistId: el.dataset.id, taskId: el.value });
  });

  root.querySelector('[data-terminal-close]').addEventListener('click', close);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openId) close();
  });
  bus.on('snapshot', paint);
  bus.on('world:interact', open);
  bus.on('world:goto-pad', close);

  return { open, close, paint, isOpen: () => Boolean(openId) };
}
