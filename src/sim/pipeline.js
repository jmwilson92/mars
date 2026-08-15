import { advance } from '../core/clock.js';
import { SEVERITY } from '../core/constants.js';
import { raiseAlert } from './alerts.js';
import { tickBrownout } from './brownout.js';
import { tickResearch } from './planning.js';
import { awardRp, tickLabs } from './research.js';
import { tickEconomy } from './economy.js';
import { tickPolitics } from './politics.js';
import { tickFleet } from './fleet.js';

/**
 * Strict tick order (Section 3.2). Missing systems are skipped, not stubbed —
 * later blocks register by exporting a `tick(state, ctx)` and adding the name here.
 */
export const TICK_PHASES = Object.freeze([
  'clock',
  'environment',
  'power',
  'brownout',
  'isru',
  'lifesupport',
  'agriculture',
  'maintenance',
  'incidents',
  'colonists',
  'construction',
  'logistics',
  'manufacturing',
  'research',
  'trajectory',
  'economy',
  'politics',
  'autonomy',
]);

const CORE = {
  research(state) {
    tickResearch(state);
    tickLabs(state);
  },
  trajectory(state) {
    tickFleet(state);
  },
  economy: tickEconomy,
  politics: tickPolitics,
  clock(state) {
    const result = advance(state);
    if (result.windowOpened) {
      raiseAlert(state, {
        id: `window_${state.clock.windowIndex}`,
        severity: SEVERITY.GREEN,
        system: 'trajectory',
        title: 'TRANSFER WINDOW OPEN',
        body: 'Earth–Mars synodic window is open. Next window is one 779.9-day cycle from this epoch.',
      });
      awardRp(state, `window_${state.clock.windowIndex}`, 25, 'TRANSFER WINDOW');
    }
  },
  brownout: tickBrownout,
};

export function createPipeline(extras = {}) {
  const systems = { ...CORE, ...extras };
  return {
    tick(state, ctx = {}) {
      for (const name of TICK_PHASES) {
        const fn = systems[name];
        if (typeof fn === 'function') fn(state, ctx);
      }
    },
  };
}
