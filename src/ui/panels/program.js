import { PILLARS, GAME_VERSION } from '../../core/identity.js';
import { formatSeed } from '../../core/rng.js';
import { formatEarthDate, seasonName } from '../../core/clock.js';
import { SYNODIC_EARTH_DAYS } from '../../core/constants.js';

export function bindProgram(root) {
  const els = {
    date: root.querySelector('[data-program="date"]'),
    ls: root.querySelector('[data-program="ls"]'),
    season: root.querySelector('[data-program="season"]'),
    insolation: root.querySelector('[data-program="insolation"]'),
    solar: root.querySelector('[data-program="solar"]'),
    window: root.querySelector('[data-program="window"]'),
    windowBar: root.querySelector('[data-program="window-bar"]'),
    ticks: root.querySelector('[data-program="ticks"]'),
    seed: root.querySelector('[data-program="seed"]'),
    unit: root.querySelector('[data-program="unit"]'),
    pillars: root.querySelector('[data-program="pillars"]'),
  };

  if (els.pillars && els.pillars.childElementCount === 0) {
    for (const p of PILLARS) {
      const row = document.createElement('li');
      row.innerHTML = `<span class="pid">${p.id}</span><div><strong>${p.name}</strong><p>${p.text}</p></div>`;
      els.pillars.appendChild(row);
    }
  }

  function render(view) {
    const c = view.clock;
    const frac = Math.max(0, Math.min(1, 1 - c.daysToWindow / SYNODIC_EARTH_DAYS));
    els.date.textContent = formatEarthDate(c.earthDay);
    els.ls.textContent = `${c.Ls.toFixed(2)}°`;
    els.season.textContent = seasonName(c.Ls);
    els.insolation.textContent = c.insolationFactor.toFixed(3);
    els.solar.textContent = `${c.solarConstant_wm2.toFixed(1)} W/m²`;
    els.window.textContent = c.daysToWindow <= 0
      ? 'WINDOW OPEN'
      : `${Math.ceil(c.daysToWindow)} days`;
    els.windowBar.style.width = `${(frac * 100).toFixed(2)}%`;
    els.ticks.textContent = String(c.tickCount);
    els.seed.textContent = formatSeed(view.meta.seed);
    els.unit.textContent = c.tickUnit === 'sol' ? '1 tick = 1 sol' : '1 tick = 1 Earth day';
  }

  return { render, version: GAME_VERSION };
}
