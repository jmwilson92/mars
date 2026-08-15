/** Motivated room sound. No library. */

export function createMcAudio() {
  let ctx = null;
  let hvac = null;
  let master = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    return ctx;
  }

  function startHvac() {
    const c = ensure();
    if (!c || hvac) return;
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    const g = c.createGain();
    g.gain.value = 0.35;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start();
    hvac = { src, g };
  }

  function beep(freq = 880, dur = 0.08, gain = 0.12) {
    const c = ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(c.currentTime + dur);
  }

  function keys() {
    beep(1800 + Math.random() * 400, 0.02, 0.03);
  }

  function step() {
    const c = ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.value = 70 + Math.random() * 20;
    g.gain.setValueAtTime(0.05, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.07);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(c.currentTime + 0.08);
  }

  function alertTone() {
    beep(520, 0.18, 0.16);
    setTimeout(() => beep(420, 0.22, 0.16), 160);
    setTimeout(() => beep(620, 0.28, 0.18), 340);
  }

  function stop() {
    if (hvac) {
      try { hvac.src.stop(); } catch { /* already */ }
      hvac = null;
    }
    if (ctx) ctx.suspend();
  }

  return { startHvac, beep, keys, step, alertTone, stop, resume: () => ctx?.resume() };
}
