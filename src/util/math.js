export function clamp(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function wrapDeg(d) {
  return ((d % 360) + 360) % 360;
}

export function degToRad(d) {
  return (d * Math.PI) / 180;
}

export function radToDeg(r) {
  return (r * 180) / Math.PI;
}

export function wrapRadPi(a) {
  const tau = Math.PI * 2;
  let x = ((a % tau) + tau) % tau;
  if (x > Math.PI) x -= tau;
  return x;
}

/** Kepler: true anomaly (deg) → mean anomaly (deg). */
export function trueToMeanAnomaly(nuDeg, e) {
  const nu = degToRad(wrapDeg(nuDeg));
  const half = nu / 2;
  // tan(nu/2) is undefined at 180°; perihelion-frame Mars never sits exactly there at Ls0.
  const E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(half));
  const M = E - e * Math.sin(E);
  return wrapDeg(radToDeg(M));
}

/** Kepler: mean anomaly (deg) → true anomaly (deg). Newton on the eccentric anomaly. */
export function meanToTrueAnomaly(mDeg, e) {
  const M = wrapRadPi(degToRad(mDeg));
  let E = M;
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-14) break;
  }
  const nu = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));
  return wrapDeg(radToDeg(nu));
}
