import { formatEarthDate, formatSol, seasonName } from '../core/clock.js';
import { primaryAct, programYear } from '../core/identity.js';
import { countBySeverity } from '../sim/alerts.js';
import { formatMoney } from '../util/units.js';

function padLs(Ls) {
  return `${Ls.toFixed(1)}°`;
}

function windowLabel(days) {
  if (days <= 0) return 'OPEN';
  if (days < 1) return `${Math.ceil(days * 24)} h`;
  return `${Math.ceil(days)} d`;
}

export function bindHud(root) {
  const els = {
    earth: root.querySelector('[data-hud="earth"]'),
    mars: root.querySelector('[data-hud="mars"]'),
    act: root.querySelector('[data-hud="act"]'),
    window: root.querySelector('[data-hud="window"]'),
    alerts: root.querySelector('[data-hud="alerts"]'),
    budget: root.querySelector('[data-hud="budget"]'),
    support: root.querySelector('[data-hud="support"]'),
    pop: root.querySelector('[data-hud="pop"]'),
    speeds: [...root.querySelectorAll('[data-speed]')],
  };

  function setSpeed(speed) {
    for (const btn of els.speeds) {
      btn.classList.toggle('is-active', Number(btn.dataset.speed) === speed);
    }
  }

  function render(view) {
    const clock = view.clock;
    const year = programYear(clock.earthDay);
    const act = primaryAct(year);
    const counts = countBySeverity(view);

    els.earth.textContent = `EARTH ${formatEarthDate(clock.earthDay)}`;
    els.mars.textContent = `MARS Sol ${formatSol(clock.solOfYear)} (MY${clock.marsYear}) Ls ${padLs(clock.Ls)}`;
    els.mars.title = seasonName(clock.Ls);
    els.act.textContent = `ACT ${act.id} — ${act.name}`;
    els.window.textContent = `NEXT WINDOW: ${windowLabel(clock.daysToWindow)}`;
    els.window.classList.toggle('is-warning', clock.daysToWindow <= 45);
    if (els.budget) {
      els.budget.textContent = `BUDGET ${formatMoney(view.earth.budget.remaining)}`;
      els.budget.classList.remove('muted');
    }
    if (els.support) {
      els.support.textContent = `SUPPORT ${Math.round(view.earth.politics.support)}`;
      els.support.classList.remove('muted');
    }
    if (els.pop) {
      els.pop.textContent = `POP ${view.colonists.living.length}`;
    }

    const world = root.querySelector('[data-panel="world"]');
    if (!world || world.hidden) setSpeed(clock.speed);

    const red = counts.red + counts.black;
    const amber = counts.amber;
    if (red > 0) els.alerts.textContent = `⚠ ${red} RED`;
    else if (amber > 0) els.alerts.textContent = `⚠ ${amber} AMBER`;
    else els.alerts.textContent = 'NO ALERTS';
    els.alerts.dataset.severity = red ? 'red' : amber ? 'amber' : 'green';
  }

  return { render, setSpeed };
}
