import { formatMoney } from '../util/units.js';

const DIFFS = [
  { id: 'DIRECTOR', label: 'DIRECTOR', note: 'Learn the systems. Budget is generous. The planet is not.' },
  { id: 'ADMINISTRATOR', label: 'ADMINISTRATOR', note: 'Intended experience. First crew often dies. That is the lesson.' },
  { id: 'AUSTERITY', label: 'AUSTERITY', note: 'Everything is tight. You will leave things on the dock.' },
  { id: 'IRONMAN', label: 'IRONMAN', note: 'Single save. No reload. Autosave only.' },
];

export function mountBoot(root, { data, onPick }) {
  const layer = document.createElement('div');
  layer.className = 'boot';
  layer.innerHTML = `
    <div class="boot-card">
      <p class="boot-kicker">MARS PROGRAM  ·  YEAR 0</p>
      <h1>SELECT MANDATE</h1>
      <p class="boot-lede">Appropriation is set by difficulty. You do not get a second first window.</p>
      <div class="boot-grid">
        ${DIFFS.map((d) => {
          const usd = data.balance.economy.startingAnnual[d.id];
          return `<button type="button" class="boot-opt" data-diff="${d.id}">
            <strong>${d.label}</strong>
            <span class="boot-usd">${formatMoney(usd)} / year</span>
            <span>${d.note}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
  `;
  layer.querySelectorAll('[data-diff]').forEach((btn) => {
    btn.addEventListener('click', () => {
      layer.remove();
      onPick(btn.dataset.diff);
    });
  });
  root.appendChild(layer);
  return layer;
}
