import { getMoonData, moonFishingScore } from './moonPhase'

export function getFishingScore(date, pressureTrend = 0, tides = [], coeff = null) {
  let total = 0

  // Lune (0-3)
  const moon = getMoonData(date)
  total += moonFishingScore(moon.phase)

  // Pression (0-2)
  if (pressureTrend > 1.5)       total += 2  // hausse stable → actif
  else if (pressureTrend > -1.5) total += 1  // stable
  // baisse → poissons apathiques → 0

  // Coefficient (0-2) si disponible
  if (coeff != null) {
    if (coeff >= 70)      total += 2  // vive-eau
    else if (coeff >= 45) total += 1  // moyenne
    // morte-eau → 0
  }

  // Marées : présence de pleine mer dans les données = bonus activité
  const highTides = tides.filter(t => t.type === 'high')
  if (highTides.length >= 2) total += 1

  // Normalisation 1-3
  const max = coeff != null ? 8 : 6
  if (total >= max * 0.75) return 3
  if (total >= max * 0.42) return 2
  return 1
}

export const SCORE_LABELS = {
  3: { label: 'Excellente activité', color: '#2ecc71' },
  2: { label: 'Bonne activité',      color: '#f0c040' },
  1: { label: 'Faible activité',     color: '#7da8c8' },
}
