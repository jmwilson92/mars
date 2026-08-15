/** ARK-class crew vehicle. 9 m methalox architecture. 1 unit = 1 m. */

export const ARK = {
  className: 'ARK-class',
  outerR: 4.5,
  hullR: 4.25,
  innerR: 4.1,
  deckH: 2.55,
  headroom: 2.25,
  structure: 0.3,
  decks: 7,
  shaftR: 0.8,
  hatchR: 0.45,
  floorY: [0, -2.55, -5.1, -7.65, -10.2, -12.75, -15.3],
};

export const HULL_NAMES = [
  'OPTIMUS', 'PERSEVERANCE', 'OZYMANDIAS', 'SECOND WIND',
  'MERIDIAN', 'HAVEN', 'LONGHAUL',
];

export const DECK_META = [
  { id: 'D1', name: 'FLIGHT DECK', shaft: 0xe8eef4, temp: 6500 },
  { id: 'D2', name: 'OPS & COMMS', shaft: 0x4fd8e8, temp: 6200 },
  { id: 'D3', name: 'CREW QUARTERS', shaft: 0xe0a040, temp: 3800 },
  { id: 'D4', name: 'COMMONS', shaft: 0xffe8c8, temp: 4200 },
  { id: 'D5', name: 'LABORATORY', shaft: 0xd8e4f0, temp: 6500 },
  { id: 'D6', name: 'AGRICULTURE', shaft: 0xff4aaa, temp: 5000 },
  { id: 'D7', name: 'SYSTEMS & CARGO', shaft: 0x3a7ad8, temp: 5800 },
];

export function deckIndexFromY(y) {
  let best = 0;
  let bestD = 1e9;
  for (let i = 0; i < ARK.floorY.length; i++) {
    const d = Math.abs(y - (ARK.floorY[i] + 1.1));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function polar(r, a, y) {
  return { x: Math.sin(a) * r, z: -Math.cos(a) * r, y };
}
