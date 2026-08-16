export { PHASE, MISSION_TYPES } from '../core/constants.js';
import { PHASE } from '../core/constants.js';

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
