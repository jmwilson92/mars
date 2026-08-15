/**
 * Section 3.1 / 14 time & orbit constants.
 * B2 will fold these into /data/balance.json; clock reads this module so that swap is one import.
 */

export const SOL_SECONDS = 88775;
export const EARTH_DAY_SECONDS = 86400;
export const SOLS_PER_EARTH_DAY = EARTH_DAY_SECONDS / SOL_SECONDS;
export const EARTH_DAYS_PER_SOL = SOL_SECONDS / EARTH_DAY_SECONDS;

export const MARS_YEAR_SOLS = 668.6;
export const MARS_YEAR_EARTH_DAYS = 687;
export const SYNODIC_EARTH_DAYS = 779.9;

export const MARS_ECCENTRICITY = 0.0934;
export const MARS_AXIAL_TILT_DEG = 25.19;
/** Spec places perihelion at northern winter solstice (dust-storm season). */
export const LS_PERIHELION_DEG = 270;
export const SOLAR_CONSTANT_MEAN_WM2 = 586;

/** Civil epoch for program Year 0. */
export const EARTH_EPOCH_UTC_MS = Date.UTC(2040, 0, 1);

/**
 * MY46 Ls=0 ≈ 2039-11-30. Used to pin dual-calendar Mars year / Ls
 * so Earth 2040-01-01 is a few weeks into northern spring.
 */
export const LS0_UTC_MS = Date.UTC(2039, 10, 30);
export const MARS_YEAR_AT_LS0 = 46;
export const EARTH_DAYS_LS0_TO_EPOCH = (EARTH_EPOCH_UTC_MS - LS0_UTC_MS) / EARTH_DAY_SECONDS / 1000;

/** First Earth–Mars window of the campaign — enough office time to feel the wait. */
export const FIRST_WINDOW_EARTH_DAY = 210;

export const SPEEDS = Object.freeze({
  PAUSE: 0,
  X1: 1,
  X3: 3,
  X10: 10,
  X30: 30,
});

export const TICK_UNITS = Object.freeze({
  EARTH_DAY: 'earth_day',
  SOL: 'sol',
});

export const POWER_PRIORITY_DEFAULT = Object.freeze([
  'life_support',
  'thermal',
  'medical',
  'water_reclamation',
  'agriculture_lighting',
  'isru',
  'manufacturing',
  'construction',
  'comms_science',
]);

/** Life support is never shed. Reordering other rows is how people die. */
export const POWER_NEVER_CUT = Object.freeze(['life_support']);

export const BROWNOUT_DEFICIT_SOLS = 3;

export const SEVERITY = Object.freeze({
  GREEN: 'green',
  AMBER: 'amber',
  RED: 'red',
  BLACK: 'black',
});
