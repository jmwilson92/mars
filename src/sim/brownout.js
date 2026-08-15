import { BROWNOUT_DEFICIT_SOLS, SEVERITY, SOLS_PER_EARTH_DAY, TICK_UNITS } from '../core/constants.js';
import { raiseAlert } from './alerts.js';

/**
 * Section 3.3. Runs after the power phase (when one exists).
 * No-ops until a colony actually draws power — demand 0 is not a deficit.
 */
export function tickBrownout(state) {
  const power = state.mars.power;
  const drawing = power.demand_kw > 0 || power.generation_kw > 0 || (state.mars.modules?.length ?? 0) > 0;
  if (!drawing) {
    power.deficitSols = 0;
    return;
  }

  const short = power.generation_kw + power.storage_kwh > 0
    ? power.generation_kw < power.demand_kw
    : power.demand_kw > 0;

  const dtSol = state.clock.tickUnit === TICK_UNITS.SOL ? 1 : SOLS_PER_EARTH_DAY;
  if (short) power.deficitSols += dtSol;
  else power.deficitSols = 0;

  if (power.lifeSupportPowered === false) {
    raiseAlert(state, {
      id: `ls_power_loss_${state.clock.tickCount}`,
      severity: SEVERITY.RED,
      system: 'life_support',
      title: 'ANOMALY REPORT: LIFE SUPPORT POWER LOSS',
      body: 'Habitat life support lost allocated power this tick. Casualty rolls are pending medical resolution.',
    });
  }

  if (power.deficitSols > BROWNOUT_DEFICIT_SOLS) {
    raiseAlert(state, {
      id: 'brownout_persistent',
      severity: SEVERITY.AMBER,
      system: 'power',
      title: 'ANOMALY REPORT: PERSISTENT BROWNOUT',
      body: `Power deficit has held for ${power.deficitSols.toFixed(1)} sols. Load-shed order is in effect.`,
    });
  }
}
