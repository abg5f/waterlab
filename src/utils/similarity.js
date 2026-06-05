/**
 * Moteur de similarité — 4 critères :
 * 1. 🌙 Lune          — même grande catégorie (syzygie / quadrature / intermédiaire)
 * 2. 🌊 Coefficient    — même catégorie (morte-eau / moyenne / vive-eau / grande)
 * 3. 🌡️ Pression       — même tendance (hausse / stable / baisse)
 * 4. ⏰ Marée créneau  — même type de marée (haute/basse) dans le même créneau (matin/après-midi)
 *
 * Seuil : 3/4 → très similaire, 2/4 → similaire
 */

export function getMoonCategory(phase) {
  if (phase < 0.1 || phase > 0.9) return 'new_moon'
  if (phase > 0.45 && phase < 0.55) return 'full_moon'
  if (phase > 0.2 && phase < 0.3)   return 'first_quarter'
  if (phase > 0.7 && phase < 0.8)   return 'last_quarter'
  return phase < 0.5 ? 'waxing' : 'waning'
}

export function getCoeffCategory(coeff) {
  if (!coeff && coeff !== 0) return null
  if (coeff >= 95) return 'extreme'
  if (coeff >= 70) return 'spring'
  if (coeff >= 45) return 'medium'
  return 'neap'
}

export function getPressureTrend(trend) {
  if (trend > 1.5)  return 'rising'
  if (trend < -1.5) return 'falling'
  return 'stable'
}

/* Créneau horaire */
export const TIME_PERIODS = {
  morning:   { label: '🌅 Matin',         hours: [5,  12] },
  afternoon: { label: '🌇 Après-midi',    hours: [12, 20] },
  all_day:   { label: '☀️ Toute la journée', hours: [0, 24] },
}

export function getTidesInPeriod(tides, timeOfDay) {
  if (!tides?.length) return []
  const [from, to] = (TIME_PERIODS[timeOfDay] || TIME_PERIODS.all_day).hours
  return tides.filter(t => {
    const h = new Date(t.time).getHours()
    return h >= from && h < to
  })
}

/** Marée dominante d'un créneau (priorité haute mer) */
export function getDominantTide(tidesInPeriod) {
  if (!tidesInPeriod.length) return null
  return tidesInPeriod.sort((a, b) => (a.type === 'high' ? -1 : 1))[0]
}

export const TREND_LABELS = {
  rising:  '↗ En hausse',
  stable:  '→ Stable',
  falling: '↘ En baisse',
}
export const COEFF_LABELS = {
  neap:    'Morte-eau',
  medium:  'Moyenne',
  spring:  'Vive-eau',
  extreme: 'Grande vive-eau',
}
export const TOD_LABELS = {
  morning:   'Matin',
  afternoon: 'Après-midi',
  all_day:   'Toute la journée',
}

/**
 * Compare un favori à une journée candidate.
 * @param {object} fav        — ligne Supabase (favorite_days)
 * @param {object} candidate  — { moonPhase, coeffCategory, pressureTrend, tides }
 */
export function compareDays(fav, candidate) {
  const criteria = []

  /* 1. Lune ─ même grande catégorie */
  const broad = c => {
    if (c === 'new_moon' || c === 'full_moon')           return 'syzygy'
    if (c === 'first_quarter' || c === 'last_quarter')   return 'quadrature'
    return 'intermediate'
  }
  if (broad(getMoonCategory(fav.moon_phase)) === broad(getMoonCategory(candidate.moonPhase)))
    criteria.push({ key: 'moon', label: '🌙 Lune' })

  /* 2. Coefficient ─ même catégorie */
  if (fav.coeff_category && candidate.coeffCategory && fav.coeff_category === candidate.coeffCategory)
    criteria.push({ key: 'coeff', label: '🌊 Coefficient' })

  /* 3. Pression ─ même tendance */
  if (fav.pressure_trend && candidate.pressureTrend && fav.pressure_trend === candidate.pressureTrend)
    criteria.push({ key: 'pressure', label: '🌡️ Pression' })

  /* 4. Marée créneau ─ même type de marée dans le même créneau */
  if (fav.time_of_day && fav.tide_period_type && candidate.tides?.length) {
    const tidesInPeriod = getTidesInPeriod(candidate.tides, fav.time_of_day)
    const hasSameTide   = tidesInPeriod.some(t => t.type === fav.tide_period_type)
    if (hasSameTide)
      criteria.push({ key: 'tide_time', label: `⏰ Marée ${fav.tide_period_type === 'high' ? 'haute' : 'basse'} au ${TOD_LABELS[fav.time_of_day].toLowerCase()}` })
  }

  return { score: criteria.length, criteria }
}

export const SIMILARITY_THRESHOLD = 2   // sur 4

export function findSimilarDays(favorites, candidates) {
  if (!favorites?.length || !candidates?.length) return []
  return candidates
    .map(candidate => {
      const refs = favorites
        .map(fav => ({ favorite: fav, ...compareDays(fav, candidate) }))
        .filter(r => r.score >= SIMILARITY_THRESHOLD)
        .sort((a, b) => b.score - a.score)
      return { ...candidate, refs }
    })
    .filter(c => c.refs.length > 0)
}
