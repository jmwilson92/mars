/** Earth-side burn and quarterly appropriation. */

export function tickEconomy(state) {
  const b = state.earth.budget;
  if (!b.annual) return;
  const day = Math.floor(state.clock.earthDay);
  const last = b.lastOpsDay ?? -1;
  if (day === last) return;
  b.lastOpsDay = day;

  // Quiet ops burn so idle years still cost something.
  b.remaining = Math.max(0, b.remaining - b.annual * 0.00018);

  if (day > 0 && day % 91 === 0) {
    b.remaining += b.annual / 4;
    const cap = b.annual * 2;
    if (b.remaining > cap) {
      b.remaining = cap;
      b.hoarded = true;
    } else {
      b.hoarded = false;
    }
  }
}
