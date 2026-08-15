export const PHASE = {
  OFFICE: 'office',
  EARTH_PAD: 'earth_pad',
  CABIN: 'cabin',
  COUNTDOWN: 'countdown',
  ASCENT: 'ascent',
  ORBIT: 'orbit',
  LEO_OPS: 'leo_ops',
  TRANSIT: 'transit',
  EDL: 'edl',
  MARS_SURFACE: 'mars_surface',
};

export const MISSION_TYPES = {
  CARGO: 'CARGO',
  ROBOTIC: 'ROBOTIC',
  CREWED: 'CREWED',
};

export const FLIGHT_RATES = [0, 1, 3, 10, 30];

export function isCabinPhase(phase) {
  return phase === PHASE.CABIN
    || phase === PHASE.COUNTDOWN
    || phase === PHASE.ASCENT
    || phase === PHASE.ORBIT
    || phase === PHASE.LEO_OPS
    || phase === PHASE.TRANSIT
    || phase === PHASE.EDL;
}
