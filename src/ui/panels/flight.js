import { formatEarthDate } from '../../core/clock.js';
import { PHASE } from '../../render/phases.js';

export function bindFlight(root, { bus }) {
  const panel = root.querySelector('[data-panel="world"]');
  const canvas = root.querySelector('[data-flight-canvas]');
  const loc = root.querySelector('[data-mc-loc]');
  const clock = root.querySelector('[data-mc-clock]');
  const call = root.querySelector('[data-mc-call]');
  const meta = root.querySelector('[data-mc-meta]');
  const prompt = root.querySelector('[data-flight="prompt"]');
  const reticle = root.querySelector('[data-mc-reticle]');
  const alerts = root.querySelector('[data-mc-alerts]');
  const viewBtns = root.querySelector('[data-flight-view]');

  viewBtns?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cam]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    bus.emit('flight:cam', btn.dataset.cam);
  });

  bus.on('flight:telemetry', (t) => {
    panel.classList.toggle('is-ship', t.hud === 'ship');
    const flying = t.phase && t.phase !== PHASE.OFFICE && t.hud !== 'mc';
    if (viewBtns) {
      viewBtns.hidden = !flying;
      viewBtns.querySelectorAll('[data-cam]').forEach((btn) => {
        const cabin = btn.dataset.cam === 'cabin';
        btn.classList.toggle('is-on', cabin ? !t.extView : Boolean(t.extView));
      });
    }
    if (flying) {
      root.querySelectorAll('[data-speed]').forEach((btn) => {
        btn.classList.toggle('is-active', Number(btn.dataset.speed) === (t.rate ?? 1));
      });
    }
    if (t.phase === PHASE.OFFICE || t.hud === 'mc') {
      if (loc) loc.textContent = 'MISSION CONTROL — HOUSTON';
      if (t.earthDate && clock) clock.textContent = `EARTH ${t.earthDate}  │  SOL ${t.sol ?? '—'}`;
      if (call) call.textContent = '';
      if (meta) meta.textContent = '';
      prompt.textContent = t.prompt || '';
      reticle?.classList.toggle('is-hot', Boolean(t.target));
      if (alerts) {
        const n = t.alertCount || 0;
        alerts.hidden = n === 0;
        alerts.textContent = n ? `${n} ALERT` : '';
      }
    } else if (t.hud === 'ship') {
      if (loc) loc.textContent = t.title || `${t.shipName || 'ARK'} · ${t.deckName || ''}`.trim();
      if (clock) {
        const bits = [t.missionLabel];
        if (t.missionLabel === 'COAST' || t.missionLabel === 'TMI BURN' || t.missionLabel === 'TRANSIT') {
          bits.push(`DAY ${t.transitDay ?? 0} / ${t.transitSpan ?? 251}`);
        }
        if (t.gee != null) bits.push(`${Number(t.gee).toFixed(2)} g`);
        bits.push((t.rate ?? 1) === 0 ? 'PAUSED' : `${t.rate ?? 1}×`);
        clock.textContent = bits.filter(Boolean).join('  ·  ');
      }
      if (call) call.textContent = '';
      if (meta) meta.textContent = '';
      prompt.textContent = t.prompt || '';
      reticle?.classList.toggle('is-hot', Boolean(t.prompt));
      if (alerts) {
        alerts.hidden = !t.alert;
        alerts.textContent = t.alert || '';
      }
    } else {
      if (loc) loc.textContent = t.title || 'FLIGHT';
      if (clock) clock.textContent = t.missionLabel || '';
      if (call) call.textContent = '';
      if (meta) meta.textContent = '';
      prompt.textContent = t.prompt || '';
      reticle?.classList.toggle('is-hot', Boolean(t.target));
    }
    panel.dataset.phase = t.phase;
  });

  return { canvas, panel };
}

void formatEarthDate;
