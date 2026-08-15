export function createInput(canvas) {
  const keys = new Set();
  const pulses = new Set();
  let locked = false;
  let dx = 0;
  let dy = 0;
  const lookScale = 0.0022;

  function onKey(e, down) {
    if (e.repeat) return;
    if (down) {
      keys.add(e.code);
      pulses.add(e.code);
    } else keys.delete(e.code);
  }

  function onMove(e) {
    if (!locked) return;
    dx += e.movementX;
    dy += e.movementY;
  }

  function onLockChange() {
    locked = document.pointerLockElement === canvas;
  }

  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
  document.addEventListener('pointerlockchange', onLockChange);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('click', () => {
    if (!locked) canvas.requestPointerLock();
  });

  return {
    get locked() {
      return locked;
    },
    down(code) {
      return keys.has(code);
    },
    pulse(code) {
      if (!pulses.has(code)) return false;
      pulses.delete(code);
      return true;
    },
    consumeLook() {
      const out = { dx: dx * lookScale, dy: dy * lookScale };
      dx = 0;
      dy = 0;
      return out;
    },
    unlock() {
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
    clear() {
      keys.clear();
    },
  };
}
