import { SPEEDS } from '../core/constants.js';
import { bindHud } from './hud.js';
import { bindAlertRail } from './alerts.js';
import { bindProgram } from './panels/program.js';
import { bindFlight } from './panels/flight.js';

const NAV = [
  { id: 'world', label: 'SITE', live: true },
  { id: 'program', label: 'PROGRAM', live: true },
  { id: 'research', label: 'RESEARCH', live: true, terminal: 'research' },
  { id: 'vehicles', label: 'VEHICLES', live: false },
  { id: 'missions', label: 'MISSIONS', live: true, terminal: 'fleet' },
  { id: 'mars', label: 'MARS', live: true, terminal: 'site' },
  { id: 'crew', label: 'CREW', live: true, terminal: 'crew' },
  { id: 'systems', label: 'SYSTEMS', live: false },
  { id: 'log', label: 'LOG', live: false },
];

export function mountShell(root, { bus }) {
  root.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="topbar-clock">
          <span data-hud="earth">EARTH —</span>
          <span class="sep">│</span>
          <span data-hud="mars">MARS —</span>
          <span class="sep">│</span>
          <span data-hud="act" class="act">ACT I — PROGRAM</span>
        </div>
        <div class="topbar-status">
          <span data-hud="budget" class="stat muted">BUDGET —</span>
          <span data-hud="support" class="stat muted">SUPPORT —</span>
          <span data-hud="pop" class="stat muted">POP —</span>
          <span data-hud="window" class="window">NEXT WINDOW: —</span>
          <span data-hud="alerts" class="alerts" data-severity="green">NO ALERTS</span>
        </div>
        <div class="speeds" role="group" aria-label="Simulation speed">
          <button type="button" data-speed="0">⏸</button>
          <button type="button" data-speed="1">1×</button>
          <button type="button" data-speed="3">3×</button>
          <button type="button" data-speed="10">10×</button>
          <button type="button" data-speed="30">30×</button>
          <button type="button" data-skip class="skip">SKIP→EVT</button>
        </div>
      </header>

      <aside class="nav">
        <div class="wordmark">MARS</div>
        <div class="wordmark-sub">PROGRAM CONTROL</div>
        <nav>
          ${NAV.map(
            (n) =>
              `<button type="button" class="nav-btn${n.live ? ' is-active' : ''}" data-nav="${n.id}" ${
                n.live ? '' : 'disabled'
              }>${n.label}</button>`,
          ).join('')}
        </nav>
        <div class="nav-footer">
          <button type="button" data-action="save">SAVE</button>
          <button type="button" data-action="load">LOAD</button>
          <button type="button" data-action="new">NEW PROGRAM</button>
        </div>
      </aside>

      <main class="main" data-main>
        <section class="panel program" data-panel="program">
          <header class="panel-head">
            <h1>DIRECTORATE</h1>
            <p>You are not an astronaut. You are the person who decides whether astronauts live.</p>
          </header>
          <div class="metrics">
            <article>
              <h2>EARTH DATE</h2>
              <div class="metric" data-program="date">—</div>
            </article>
            <article>
              <h2>SOLAR LONGITUDE</h2>
              <div class="metric" data-program="ls">—</div>
              <div class="sub" data-program="season">—</div>
            </article>
            <article>
              <h2>ORBITAL INSOLATION</h2>
              <div class="metric" data-program="insolation">—</div>
              <div class="sub" data-program="solar">—</div>
            </article>
            <article class="span">
              <h2>SYNODIC WINDOW</h2>
              <div class="metric window-metric" data-program="window">—</div>
              <div class="bar"><i data-program="window-bar"></i></div>
            </article>
          </div>
          <div class="brief">
            <div>
              <h2>DESIGN PILLARS</h2>
              <ul data-program="pillars" class="pillars"></ul>
            </div>
            <aside class="meta-card">
              <h2>SESSION</h2>
              <dl>
                <div><dt>TICKS</dt><dd data-program="ticks">0</dd></div>
                <div><dt>SEED</dt><dd data-program="seed">—</dd></div>
                <div><dt>QUANTUM</dt><dd data-program="unit">—</dd></div>
                <div><dt>SAVE</dt><dd data-save-status>UNSAVED</dd></div>
              </dl>
              <p class="fine">Act I ticks one Earth day. 10× auto-batches 7 days; 30× batches 30. Mars time advances in lockstep. Same seed, same inputs, same outcome.</p>
              <button type="button" class="cta" data-open-world>ENTER SITE</button>
            </aside>
          </div>
        </section>
        <section class="panel flight" data-panel="world" hidden>
          <canvas data-flight-canvas></canvas>
          <div class="flight-hud" data-flight-hud>
            <div class="mc-hud">
              <div class="mc-loc" data-mc-loc>MISSION CONTROL — HOUSTON</div>
              <div class="mc-clock" data-mc-clock>EARTH —  │  MARS —</div>
              <div class="mc-call" data-mc-call></div>
              <div class="mc-meta" data-mc-meta></div>
              <div class="mc-reticle" data-mc-reticle></div>
              <div class="mc-view" data-flight-view hidden>
                <button type="button" data-cam="cabin">CABIN</button>
                <button type="button" data-cam="out">OUTSIDE</button>
              </div>
              <div class="mc-prompt" data-flight="prompt"></div>
              <div class="mc-alerts" data-mc-alerts hidden></div>
            </div>
            <div class="flight-legacy" hidden>
              <div class="flight-title" data-flight="title"></div>
              <div class="flight-call" data-flight="call"></div>
              <div class="flight-site" data-flight="site"></div>
              <span data-flight="alt"></span>
              <span data-flight="vel"></span>
              <span data-flight="mach"></span>
              <span data-flight="stage"></span>
            </div>
          </div>
          <div class="terminal" data-terminal hidden>
            <header>
              <h2 data-terminal-title>TERMINAL</h2>
              <button type="button" data-terminal-close>CLOSE</button>
            </header>
            <div class="terminal-body" data-terminal-body></div>
          </div>
        </section>
      </main>

      <aside class="rail-wrap">
        <h2>ALERT RAIL</h2>
        <div data-rail class="rail"></div>
      </aside>

      <footer class="ticker" data-ticker>TICKER: —</footer>
    </div>
    <div class="modal" data-modal hidden>
      <div class="modal-card">
        <h2 data-modal-title>SAVES</h2>
        <div data-modal-body></div>
        <div class="modal-actions">
          <button type="button" data-modal-close>CLOSE</button>
        </div>
      </div>
    </div>
  `;

  const hud = bindHud(root);
  const rail = bindAlertRail(root);
  const program = bindProgram(root);
  const flight = bindFlight(root, { bus });
  const saveStatus = root.querySelector('[data-save-status]');
  const mainEl = root.querySelector('[data-main]');
  let currentView = 'program';
  let worldLocked = false;
  const modal = root.querySelector('[data-modal]');
  const modalTitle = root.querySelector('[data-modal-title]');
  const modalBody = root.querySelector('[data-modal-body]');

  function showView(id) {
    const nav = NAV.find((n) => n.id === id);
    currentView = nav?.terminal ? 'world' : id;
    root.querySelectorAll('[data-panel]').forEach((el) => {
      el.hidden = el.dataset.panel !== currentView;
    });
    root.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.nav === id);
    });
    mainEl.classList.toggle('is-world', currentView === 'world');
    bus.emit('ui:view', currentView);
    if (nav?.terminal) {
      setTimeout(() => bus.emit('world:interact', nav.terminal), 80);
    }
  }

  function render(view) {
    hud.render(view);
    rail.render(view);
    if (currentView === 'program') program.render(view);
  }

  function setSaveStatus(text) {
    saveStatus.textContent = text;
  }

  function openModal(title, html) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.hidden = false;
  }

  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = '';
  }

  root.querySelectorAll('[data-nav]').forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => showView(btn.dataset.nav));
  });
  root.querySelector('[data-open-world]').addEventListener('click', () => showView('world'));
  root.querySelectorAll('[data-speed]').forEach((btn) => {
    btn.addEventListener('click', () => bus.emit('ui:speed', Number(btn.dataset.speed)));
  });
  root.querySelector('[data-skip]').addEventListener('click', () => bus.emit('ui:skip'));
  root.querySelector('[data-action="save"]').addEventListener('click', () => bus.emit('ui:save'));
  root.querySelector('[data-action="load"]').addEventListener('click', () => bus.emit('ui:load'));
  root.querySelector('[data-action="new"]').addEventListener('click', () => bus.emit('ui:new'));
  root.querySelector('[data-modal-close]').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('pointerlockchange', () => {
    worldLocked = document.pointerLockElement === flight.canvas;
  });

  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (currentView === 'world') {
      if (e.code === 'Space') e.preventDefault();
      if (e.key === '1') bus.emit('flight:rate', SPEEDS.X1);
      else if (e.key === '3') bus.emit('flight:rate', SPEEDS.X3);
      else if (e.key === '0') bus.emit('flight:rate', SPEEDS.X10);
      else if (e.key === '4') bus.emit('flight:rate', SPEEDS.X30);
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      bus.emit('ui:toggle-pause');
    } else if (e.key === '1') bus.emit('ui:speed', SPEEDS.X1);
    else if (e.key === '3') bus.emit('ui:speed', SPEEDS.X3);
    else if (e.key === '0') bus.emit('ui:speed', SPEEDS.X10);
    else if (e.key === '4') bus.emit('ui:speed', SPEEDS.X30);
    else if (e.key === '.') bus.emit('ui:skip');
    else if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      bus.emit('ui:save');
    }
  });

  return { render, setSaveStatus, openModal, closeModal, showView, flight };
}
