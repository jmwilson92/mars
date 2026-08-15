import {
  EARTH_DAYS_LS0_TO_EPOCH,
  EARTH_DAYS_PER_SOL,
  EARTH_EPOCH_UTC_MS,
  FIRST_WINDOW_EARTH_DAY,
  LS_PERIHELION_DEG,
  MARS_ECCENTRICITY,
  MARS_YEAR_AT_LS0,
  MARS_YEAR_SOLS,
  SOLAR_CONSTANT_MEAN_WM2,
  SOLS_PER_EARTH_DAY,
  SYNODIC_EARTH_DAYS,
  TICK_UNITS,
} from './constants.js';
import { meanToTrueAnomaly, trueToMeanAnomaly, wrapDeg } from '../util/math.js';

/** Mean anomaly at Ls = 0 (true anomaly = 90° when perihelion is pinned at 270°). */
const MEAN_ANOMALY_AT_LS0 = trueToMeanAnomaly(wrapDeg(0 - LS_PERIHELION_DEG), MARS_ECCENTRICITY);

export function createClockState() {
  const clock = {
    earthDay: 0,
    sol: 0,
    marsYear: MARS_YEAR_AT_LS0,
    solOfYear: 0,
    Ls: 0,
    tickCount: 0,
    speed: 0,
    tickUnit: TICK_UNITS.EARTH_DAY,
    insolationFactor: 1,
    solarConstant_wm2: SOLAR_CONSTANT_MEAN_WM2,
    windowIndex: 0,
    nextWindowEarthDay: FIRST_WINDOW_EARTH_DAY,
    daysToWindow: FIRST_WINDOW_EARTH_DAY,
    windowJustOpened: false,
  };
  refreshDerived(clock);
  return clock;
}

export function earthDateFromDay(earthDay) {
  const whole = Math.floor(earthDay);
  const ms = EARTH_EPOCH_UTC_MS + whole * 86400000;
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { year, month, day, iso };
}

export function formatEarthDate(earthDay) {
  return earthDateFromDay(earthDay).iso;
}

export function formatSol(sol) {
  return Math.floor(sol).toLocaleString('en-US');
}

export function seasonName(Ls) {
  const x = wrapDeg(Ls);
  if (x < 90) return 'northern spring';
  if (x < 180) return 'northern summer';
  if (x < 270) return 'northern autumn';
  return 'northern winter';
}

export function orbitalDistanceFactor(Ls) {
  const nu = wrapDeg(Ls - LS_PERIHELION_DEG) * (Math.PI / 180);
  const r = (1 - MARS_ECCENTRICITY * MARS_ECCENTRICITY) / (1 + MARS_ECCENTRICITY * Math.cos(nu));
  return 1 / (r * r);
}

export function refreshDerived(clock) {
  const solsSinceLs0 = (EARTH_DAYS_LS0_TO_EPOCH + clock.earthDay) * SOLS_PER_EARTH_DAY;
  const myOffset = solsSinceLs0 / MARS_YEAR_SOLS;
  clock.marsYear = MARS_YEAR_AT_LS0 + Math.floor(myOffset);
  let soy = solsSinceLs0 - Math.floor(myOffset) * MARS_YEAR_SOLS;
  if (soy < 0) soy += MARS_YEAR_SOLS;
  clock.solOfYear = soy;

  const M = MEAN_ANOMALY_AT_LS0 + (360 * solsSinceLs0) / MARS_YEAR_SOLS;
  const nu = meanToTrueAnomaly(M, MARS_ECCENTRICITY);
  clock.Ls = wrapDeg(nu + LS_PERIHELION_DEG);
  clock.insolationFactor = orbitalDistanceFactor(clock.Ls);
  clock.solarConstant_wm2 = SOLAR_CONSTANT_MEAN_WM2 * clock.insolationFactor;

  clock.nextWindowEarthDay = FIRST_WINDOW_EARTH_DAY + clock.windowIndex * SYNODIC_EARTH_DAYS;
  clock.daysToWindow = clock.nextWindowEarthDay - clock.earthDay;
  return clock;
}

function consumeWindows(clock) {
  clock.windowJustOpened = false;
  // A single monthly batch can theoretically skip a window; consume all crossed indices.
  while (clock.earthDay + 1e-9 >= FIRST_WINDOW_EARTH_DAY + clock.windowIndex * SYNODIC_EARTH_DAYS) {
    clock.windowJustOpened = true;
    clock.windowIndex += 1;
  }
  clock.nextWindowEarthDay = FIRST_WINDOW_EARTH_DAY + clock.windowIndex * SYNODIC_EARTH_DAYS;
  clock.daysToWindow = clock.nextWindowEarthDay - clock.earthDay;
}

export function advance(state) {
  const clock = state.clock;
  if (clock.tickUnit === TICK_UNITS.SOL) {
    clock.sol += 1;
    clock.earthDay += EARTH_DAYS_PER_SOL;
  } else {
    clock.earthDay += 1;
    clock.sol += SOLS_PER_EARTH_DAY;
  }
  clock.tickCount += 1;
  refreshDerived(clock);
  consumeWindows(clock);
  return { windowOpened: clock.windowJustOpened };
}

export function interpolateClock(clock, extraTicks) {
  if (extraTicks === 0) return clock;
  const copy = { ...clock };
  if (copy.tickUnit === TICK_UNITS.SOL) {
    copy.sol += extraTicks;
    copy.earthDay += extraTicks * EARTH_DAYS_PER_SOL;
  } else {
    copy.earthDay += extraTicks;
    copy.sol += extraTicks * SOLS_PER_EARTH_DAY;
  }
  refreshDerived(copy);
  copy.windowJustOpened = false;
  return copy;
}
