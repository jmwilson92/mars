export const DECK_CONFIGS = [
  {
    id: 'D1',
    index: 0,
    windows: [],
    fixtures: [
      { type: 'cupola' },
      { type: 'flight_seats' },
    ],
  },
  {
    id: 'D2',
    index: 1,
    windows: [0.9, 2.4],
    fixtures: [{ type: 'workstations' }],
  },
  {
    id: 'D3',
    index: 2,
    windows: [0, 1.05, 2.09, 3.14, 4.19, 5.24],
    fixtures: [{ type: 'staterooms' }],
  },
  {
    id: 'D4',
    index: 3,
    windows: [0],
    fixtures: [{ type: 'commons' }],
    bay: true,
  },
  {
    id: 'D5',
    index: 4,
    windows: [5.2],
    fixtures: [{ type: 'laboratory' }],
  },
  {
    id: 'D6',
    index: 5,
    windows: [],
    fixtures: [{ type: 'agriculture' }],
  },
  {
    id: 'D7',
    index: 6,
    windows: [],
    fixtures: [{ type: 'systems' }],
  },
];
