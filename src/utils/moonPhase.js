import SunCalc from 'suncalc'

const PHASES = [
  { max: 0.03, name: 'Nouvelle lune',          icon: '🌑' },
  { max: 0.22, name: 'Croissant croissant',     icon: '🌒' },
  { max: 0.28, name: 'Premier quartier',        icon: '🌓' },
  { max: 0.47, name: 'Gibbeuse croissante',     icon: '🌔' },
  { max: 0.53, name: 'Pleine lune',             icon: '🌕' },
  { max: 0.72, name: 'Gibbeuse décroissante',   icon: '🌖' },
  { max: 0.78, name: 'Dernier quartier',        icon: '🌗' },
  { max: 0.97, name: 'Croissant décroissant',   icon: '🌘' },
  { max: 1.00, name: 'Nouvelle lune',           icon: '🌑' },
]

export function getMoonData(date) {
  const illum = SunCalc.getMoonIllumination(date)
  const phase = illum.phase
  const entry = PHASES.find(p => phase <= p.max) || PHASES[PHASES.length - 1]
  return {
    phase,
    name: entry.name,
    icon: entry.icon,
    illumination: Math.round(illum.fraction * 100),
  }
}

export function getMoonTimes(date, lat, lng) {
  return SunCalc.getMoonTimes(date, lat, lng)
}

export function getSunTimes(date, lat, lng) {
  return SunCalc.getTimes(date, lat, lng)
}

/** Score lune pour la pêche : 3 = nouvelle/pleine, 2 = intermédiaire, 1 = quartiers */
export function moonFishingScore(phase) {
  if (phase < 0.05 || phase > 0.95) return 3   // nouvelle lune
  if (phase > 0.45 && phase < 0.55) return 3   // pleine lune
  if ((phase > 0.22 && phase < 0.28) || (phase > 0.72 && phase < 0.78)) return 1
  return 2
}
