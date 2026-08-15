/** Size the drawing buffer before any context is requested. 0×0 canvases throw on many GPUs. */
export function sizeCanvas(canvas, fallbackW = 960, fallbackH = 540) {
  const parent = canvas.parentElement;
  const rect = parent?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
  const cssW = Math.max(64, Math.floor(rect.width) || fallbackW);
  const cssH = Math.max(64, Math.floor(rect.height) || fallbackH);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.max(64, Math.floor(cssW * dpr));
  canvas.height = Math.max(64, Math.floor(cssH * dpr));
  return { cssW, cssH, dpr };
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const attrs = { failIfMajorPerformanceCaveat: false, alpha: false };
    const gl = c.getContext('webgl2', attrs)
      || c.getContext('webgl', attrs)
      || c.getContext('experimental-webgl', attrs);
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function createGlContext(canvas) {
  sizeCanvas(canvas);
  const attrs = {
    alpha: false,
    antialias: false,
    depth: true,
    stencil: false,
    failIfMajorPerformanceCaveat: false,
    powerPreference: 'default',
    preserveDrawingBuffer: false,
    premultipliedAlpha: false,
  };
  const names = ['webgl2', 'webgl', 'experimental-webgl'];
  for (const name of names) {
    try {
      const ctx = canvas.getContext(name, attrs);
      if (ctx) return ctx;
    } catch {
      /* try next */
    }
  }
  return null;
}
