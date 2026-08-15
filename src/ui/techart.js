/** Small SVG glyphs for the research board. */

const ALIAS = {
  raptor_block_2: 'starship_cargo',
  orbital_refuel: 'starship_cargo',
  tanker_architecture: 'starship_cargo',
  nuclear_thermal: 'kilopower_reactor',
  nuclear_electric: 'kilopower_reactor',
  vasimr: 'kilopower_reactor',
  precision_landing_10m: 'precision_landing_100m',
  midair_capture: 'uncrewed_landing',
  hiad_decelerator: 'uncrewed_landing',
  water_closed_loop: 'basic_eclss',
  bioregenerative: 'greenhouse_kit',
  storm_shelter: 'basic_eclss',
  torpor_hibernation: 'crewed_rating',
  robot_swarm: 'optimus_deployment',
  autonomous_assembly: 'optimus_deployment',
  sintered_regolith: 'water_ice_extraction',
  metal_3d_print: 'rtg_procurement',
  solar_thinfilm: 'default',
  megawatt_fission: 'kilopower_reactor',
  atmospheric_scoop: 'moxie_oxygen',
  mars_depot: 'sabatier_plant',
  space_medicine: 'crewed_rating',
  surgical_suite: 'crewed_rating',
  genetic_adaptation: 'crewed_rating',
  sample_return: 'precision_landing_100m',
  phobos_survey: 'starship_cargo',
  magnetic_dipole_shield: 'kilopower_reactor',
  terraforming_models: 'greenhouse_kit',
};

export function techGlyph(id) {
  const key = GLYPH[id] ? id : (ALIAS[id] || 'default');
  const body = GLYPH[key] || GLYPH.default;
  return `<svg class="tech-glyph" viewBox="0 0 72 56" aria-hidden="true">${body}</svg>`;
}

const GLYPH = {
  basic_eclss: `
    <rect x="8" y="14" width="18" height="28" rx="3" fill="#4fd8e8"/>
    <rect x="28" y="18" width="18" height="24" rx="3" fill="#8aa0b0"/>
    <rect x="48" y="16" width="16" height="26" rx="3" fill="#4ade80"/>
    <path d="M17 14 V8 H55 V16" stroke="#c8d4e0" fill="none" stroke-width="2"/>`,
  starship_cargo: `
    <rect x="30" y="6" width="12" height="36" rx="6" fill="#c8d4e0"/>
    <rect x="28" y="42" width="16" height="8" fill="#8aa0b0"/>
    <path d="M24 50 L36 56 L48 50" fill="#ffb000"/>`,
  uncrewed_landing: `
    <rect x="22" y="20" width="28" height="10" rx="2" fill="#c8d4e0" transform="rotate(-25 36 25)"/>
    <path d="M18 44 L36 30 L54 44" stroke="#c1784a" fill="none" stroke-width="3"/>`,
  crewed_rating: `
    <circle cx="36" cy="20" r="10" fill="#e8d0b0"/>
    <rect x="24" y="30" width="24" height="18" rx="4" fill="#1e3a5f"/>
    <rect x="20" y="16" width="32" height="8" rx="3" fill="#c8d4e0"/>`,
  optimus_deployment: `
    <rect x="28" y="8" width="16" height="12" rx="2" fill="#d8dde3"/>
    <rect x="24" y="22" width="24" height="16" fill="#c8d4e0"/>
    <rect x="20" y="24" width="6" height="14" fill="#8aa0b0"/>
    <rect x="46" y="24" width="6" height="14" fill="#8aa0b0"/>
    <rect x="26" y="38" width="8" height="14" fill="#8aa0b0"/>
    <rect x="38" y="38" width="8" height="14" fill="#8aa0b0"/>`,
  moxie_oxygen: `
    <circle cx="22" cy="28" r="12" fill="#c1784a" opacity="0.85"/>
    <path d="M34 28 H44" stroke="#ffb000" stroke-width="3"/>
    <circle cx="54" cy="28" r="10" fill="#4fd8e8"/>
    <text x="50" y="32" font-size="10" fill="#0a0c10">O₂</text>`,
  rtg_procurement: `
    <rect x="26" y="10" width="20" height="36" rx="4" fill="#8aa0b0"/>
    <rect x="30" y="16" width="12" height="24" fill="#ffb000"/>`,
  kilopower_reactor: `
    <circle cx="36" cy="28" r="16" fill="#4ade80" opacity="0.85"/>
    <circle cx="36" cy="28" r="7" fill="#ffb000"/>
    <rect x="34" y="6" width="4" height="10" fill="#c8d4e0"/>`,
  water_ice_extraction: `
    <rect x="32" y="8" width="8" height="30" fill="#8aa0b0"/>
    <path d="M20 40 L36 52 L52 40" fill="#8ab0c4"/>
    <rect x="28" y="4" width="16" height="8" fill="#c8d4e0"/>`,
  sabatier_plant: `
    <rect x="10" y="22" width="20" height="18" fill="#8aa0b0"/>
    <rect x="34" y="16" width="14" height="24" fill="#4fd8e8"/>
    <rect x="50" y="20" width="12" height="20" fill="#c1784a"/>
    <path d="M30 30 H34" stroke="#ffb000" stroke-width="2"/>`,
  greenhouse_kit: `
    <rect x="10" y="18" width="52" height="28" rx="4" fill="#1a3a28"/>
    <path d="M14 40 C20 20 28 20 36 40 C44 20 52 20 58 40" stroke="#4ade80" fill="none" stroke-width="3"/>
    <rect x="8" y="44" width="56" height="6" fill="#3d5c58"/>`,
  precision_landing_100m: `
    <circle cx="36" cy="28" r="18" fill="none" stroke="#ffb000" stroke-width="2"/>
    <circle cx="36" cy="28" r="10" fill="none" stroke="#4fd8e8" stroke-width="2"/>
    <circle cx="36" cy="28" r="3" fill="#ff3b30"/>`,
  default: `
    <rect x="16" y="12" width="40" height="32" rx="4" fill="#2a313b"/>
    <circle cx="36" cy="28" r="8" fill="#4fd8e8"/>`,
};
