export function bindAlertRail(root) {
  const rail = root.querySelector('[data-rail]');
  const ticker = root.querySelector('[data-ticker]');

  function render(view) {
    const active = view.incidents.active;
    rail.innerHTML = '';
    if (active.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'rail-empty';
      empty.textContent = 'ALERT RAIL CLEAR';
      rail.appendChild(empty);
    } else {
      const order = { black: 0, red: 1, amber: 2, green: 3 };
      const sorted = [...active].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
      for (const a of sorted) {
        const el = document.createElement('article');
        el.className = `rail-item severity-${a.severity}`;
        el.innerHTML = `<div class="rail-sev">${a.severity.toUpperCase()}</div>
          <div class="rail-title">${a.title}</div>
          <div class="rail-body">${a.body}</div>`;
        rail.appendChild(el);
      }
    }

    const last = view.incidents.history[view.incidents.history.length - 1];
    if (last) {
      ticker.textContent = `TICKER: Sol ${Math.floor(view.clock.solOfYear)} — ${last.title}`;
    } else {
      ticker.textContent = `TICKER: Sol ${Math.floor(view.clock.solOfYear)} — Program clock live. Awaiting first transfer window.`;
    }
  }

  return { render };
}
