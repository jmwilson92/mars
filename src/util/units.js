export function formatMoney(usd) {
  const abs = Math.abs(usd);
  const sign = usd < 0 ? '−' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatMass(kg) {
  if (kg >= 1e6) return `${(kg / 1e6).toFixed(2)} kt`;
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  if (kg >= 1) return `${kg.toFixed(1)} kg`;
  return `${(kg * 1000).toFixed(0)} g`;
}

export function formatPower(kw) {
  if (Math.abs(kw) >= 1000) return `${(kw / 1000).toFixed(2)} MW`;
  return `${kw.toFixed(1)} kW`;
}

export function formatEnergy(kwh) {
  if (Math.abs(kwh) >= 1000) return `${(kwh / 1000).toFixed(2)} MWh`;
  return `${kwh.toFixed(1)} kWh`;
}

export function formatPressure(kpa) {
  return `${kpa.toFixed(1)} kPa`;
}

export function formatDeltaV(mps) {
  if (mps >= 1000) return `${(mps / 1000).toFixed(2)} km/s`;
  return `${mps.toFixed(0)} m/s`;
}

export function formatAltitude(m) {
  if (m >= 1e6) return `${(m / 1e6).toFixed(2)} Mm`;
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${m.toFixed(0)} m`;
}

export function formatSpeed(mps) {
  if (mps >= 1000) return `${(mps / 1000).toFixed(2)} km/s`;
  return `${mps.toFixed(0)} m/s`;
}
