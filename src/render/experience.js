import { PHASE } from './phases.js';
import { sizeCanvas, webglAvailable } from './webgl.js';

export { PHASE };

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function reclaimFor2d(canvas) {
  try {
    if (canvas.getContext('2d')) return canvas;
  } catch {
    /* already bound to WebGL */
  }
  const next = canvas.cloneNode(false);
  next.dataset.flightCanvas = '';
  canvas.replaceWith(next);
  return next;
}

/** Prefer WebGL. Cartoon 2D is last resort — a failed cabin must not dump the FCR. */
export async function createExperience(canvas, opts) {
  sizeCanvas(canvas);
  await nextFrame();
  await nextFrame();
  sizeCanvas(canvas);

  let lastErr = null;
  if (webglAvailable()) {
    try {
      const { createGlWorld } = await import('./glworld.js');
      const gl = createGlWorld(canvas, opts);
      await gl.start();
      return gl;
    } catch (err) {
      lastErr = err;
      console.error('WebGL world failed', err);
    }
  } else {
    lastErr = new Error('No WebGL (GPU busy or too many tabs). Close other tabs, then hard-refresh.');
  }

  window.__MARS_GL_ERROR = lastErr?.message || 'WebGL failed';
  const banner = document.createElement('div');
  banner.textContent = `3D FAILED — ${window.__MARS_GL_ERROR}  ·  Close extra tabs and hard-refresh (Ctrl+Shift+R)`;
  banner.style.cssText = 'position:fixed;left:0;right:0;top:64px;z-index:50;padding:10px 16px;background:#4a1010;color:#ffb0a0;font:13px monospace;';
  document.body.appendChild(banner);

  const target = reclaimFor2d(canvas);
  if (target !== canvas) opts.bus.emit('world:canvas', target);
  const { createCanvasWorld } = await import('./canvasworld.js');
  return createCanvasWorld(target, opts);
}
