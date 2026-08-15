/** Section 1 — identity. Acts overlap; Act I never fully ends. */

export const GAME_TITLE = 'MARS';
export const GAME_VERSION = '1.0.0';

export const PILLARS = [
  {
    id: 'P1',
    name: 'LOGISTICS IS THE ENEMY',
    text: 'The antagonist is mass, transfer windows, and 225 million km. Every gram matters.',
  },
  {
    id: 'P2',
    name: 'DECISIONS ECHO FOR YEARS',
    text: 'Consequence chains must be legible in hindsight and opaque in the moment.',
  },
  {
    id: 'P3',
    name: 'REAL PHYSICS, GAME PACING',
    text: 'Delta-v, Hohmann windows, and dose are real. The player never solves a DE. Physics constrains; UI abstracts.',
  },
  {
    id: 'P4',
    name: 'THE COLONY IS A CHARACTER',
    text: 'Named people with skills, grudges, and death dates. When they die, systems forget.',
  },
  {
    id: 'P5',
    name: 'SELF-SUFFICIENCY IS THE REAL WIN',
    text: 'Not arrive. Not survive. Earth stops shipping and the colony does not notice for six months.',
  },
];

export const ACTS = [
  {
    id: 'I',
    name: 'PROGRAM',
    yearStart: 0,
    yearEnd: 8,
    focus: 'Budget, politics, R&D, vehicle design, uncrewed precursors',
  },
  {
    id: 'II',
    name: 'TRANSIT',
    yearStart: 6,
    yearEnd: 12,
    focus: 'Launch windows, crewed missions, EDL, first boots',
  },
  {
    id: 'III',
    name: 'OUTPOST',
    yearStart: 10,
    yearEnd: 25,
    focus: 'Survival, ISRU, power, food, base construction',
  },
  {
    id: 'IV',
    name: 'COLONY',
    yearStart: 20,
    yearEnd: 45,
    focus: 'Population growth, industry, autonomy, independence',
  },
];

export function programYear(earthDay) {
  return earthDay / 365.2425;
}

export function activeActs(year) {
  return ACTS.filter((a) => year >= a.yearStart && year < a.yearEnd + 2);
}

/** Primary act is the latest one whose start year has been reached. */
export function primaryAct(year) {
  let current = ACTS[0];
  for (const act of ACTS) {
    if (year >= act.yearStart) current = act;
  }
  return current;
}

export const TONE = {
  register: 'institutional',
  uiVoice: 'dry NASA-adjacent anomaly language',
  warmth: 'colonist logs only',
  forbidden: ['space opera', 'aliens', 'magic tech'],
};
