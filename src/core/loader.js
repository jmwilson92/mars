import balance from '../../data/balance.json' with { type: 'json' };
import sites from '../../data/sites.json' with { type: 'json' };
import resources from '../../data/resources.json' with { type: 'json' };
import contractors from '../../data/contractors.json' with { type: 'json' };
import cargo from '../../data/cargo.json' with { type: 'json' };
import tech from '../../data/tech.json' with { type: 'json' };
import roles from '../../data/roles.json' with { type: 'json' };

function fail(file, msg) {
  throw new Error(`data/${file}.json: ${msg}`);
}

function validateBalance(b) {
  if (!b?.economy?.startingAnnual?.ADMINISTRATOR) fail('balance', 'missing economy.startingAnnual');
  if (!b.deltaV_mps?.earthToLeo) fail('balance', 'missing delta-v table');
  if (!b.edl?.stages?.length) fail('balance', 'missing EDL stages');
}

function validateList(name, rows, keys) {
  if (!Array.isArray(rows) || rows.length === 0) fail(name, 'expected a non-empty array');
  for (const row of rows) {
    for (const k of keys) {
      if (row[k] == null) fail(name, `entry missing ${k}`);
    }
  }
}

export async function loadData() {
  const out = { balance, sites, resources, contractors, cargo, tech, roles };
  validateBalance(out.balance);
  validateList('sites', out.sites, ['id', 'name', 'lat', 'lon']);
  validateList('resources', out.resources, ['id', 'class', 'name']);
  validateList('contractors', out.contractors, ['id', 'name', 'costMultiplier']);
  validateList('cargo', out.cargo, ['id', 'name', 'mass_kg', 'cost']);
  validateList('tech', out.tech, ['id', 'name', 'cost_rp']);
  validateList('roles', out.roles, ['id', 'name', 'class']);
  return out;
}

export function applyDataToState(state, data) {
  const annual = data.balance.economy.startingAnnual[state.meta.difficulty]
    ?? data.balance.economy.startingAnnual.ADMINISTRATOR;
  state.earth.budget.annual = annual;
  if (state.earth.budget.remaining === 0) state.earth.budget.remaining = annual;
  if (state.earth.politics.support === 0) {
    state.earth.politics.support = data.balance.economy.startingSupport;
  }
  if (!state.experience) {
    state.experience = {
      phase: 'office',
      siteId: data.balance.experience.defaultSite,
      landed: false,
    };
  }
  if (!state.mars.unplaced) state.mars.unplaced = [];
  if (!state.mars.nodes) state.mars.nodes = [];
  if (!state.earth.budget.ledger) state.earth.budget.ledger = [];
  if (!state.earth.labs) state.earth.labs = [];
  if (!state.earth.research.milestones) state.earth.research.milestones = [];
  if (!state.vehicles) state.vehicles = { designs: {}, fleet: [], boosters: [] };
  if (!state.vehicles.fleet) state.vehicles.fleet = [];
  if (!state.vehicles.boosters) state.vehicles.boosters = [];
  const starters = data.tech.filter((t) => t.startCompleted).map((t) => t.id);
  for (const id of starters) {
    if (!state.earth.research.completed.includes(id)) state.earth.research.completed.push(id);
  }
  if (state.earth.research.points == null) state.earth.research.points = 0;
  if (!state.earth.research.maturity || !Object.keys(state.earth.research.maturity).length) {
    state.earth.research.maturity = Object.fromEntries(
      data.tech.filter((t) => t.startCompleted).map((t) => [t.id, t.startingMaturity]),
    );
  }
  return state;
}
