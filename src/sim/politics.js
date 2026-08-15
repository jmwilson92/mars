import { raiseAlert } from './alerts.js';
import { SEVERITY } from '../core/constants.js';

export function tickPolitics(state) {
  const p = state.earth.politics;
  const day = Math.floor(state.clock.earthDay);
  if (p.lastDay === day) return;
  p.lastDay = day;

  const landed = Boolean(state.mars.site);
  const inFlight = state.missions.planned.some((m) => m.status === 'go' || m.status === 'in_flight');
  let drift = -0.012;
  if (landed) drift = 0.004;
  else if (inFlight) drift = -0.004;
  if (state.earth.budget.hoarded) drift -= 0.03;
  p.support = Math.max(0, Math.min(100, p.support + drift));

  if (p.support < 20) {
    if (day % 91 === 0) p.quartersUnderThreshold = (p.quartersUnderThreshold || 0) + 1;
  } else {
    p.quartersUnderThreshold = 0;
  }

  if (p.quartersUnderThreshold >= 4 && !p.cancellation) {
    p.cancellation = landed ? 'abandonment' : 'cancelled';
    raiseAlert(state, {
      id: 'program_risk',
      severity: SEVERITY.RED,
      title: landed ? 'ABANDONMENT CRISIS' : 'PROGRAM CANCELLATION',
      body: landed
        ? 'Support collapsed. Funding drops to skeleton. The colony must reach autonomy or die.'
        : 'Support held under 20 for four quarters. The program is finished.',
    });
  }
}
