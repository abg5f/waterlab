import { getMoonData, moonFishingScore } from './moonPhase'

/**
 * Seuils de coefficient RELATIFS au lieu.
 * Le coefficient est déjà normalisé sur l'amplitude max locale, mais sa
 * distribution varie selon le régime de marée (Atlantique semi-diurne fort
 * vs Caraïbes faible/mixte). On calcule donc les tertiles (p33/p66) de la
 * distribution des coefficients quotidiens du lieu → le score de marée
 * s'adapte automatiquement à n'importe quel spot.
 *
 * @param {{time:string, coeff:number}[]} allCoeffs  tous les coeffs de la période
 * @returns {{p33:number, p66:number}|null}
 */
export function getCoeffThresholds(allCoeffs) {
  if (!allCoeffs?.length) return null
  // Coefficient MAX par jour
  const byDay = {}
  for (const c of allCoeffs) {
    const day = c.time.split('T')[0]
    byDay[day] = Math.max(byDay[day] ?? 0, c.coeff)
  }
  const vals = Object.values(byDay).sort((a, b) => a - b)
  if (vals.length < 3) return null // pas assez de données pour des tertiles fiables
  const q = (p) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))]
  return { p33: q(0.34), p66: q(0.67) }
}

/**
 * Score de pêche 1-3 étoiles.
 * Composantes : Lune (0-3) + Pression (0-2) + Marée adaptative (0-3).
 *
 * @param coeffThresholds  tertiles locaux issus de getCoeffThresholds().
 *                         Si null → repli sur seuils absolus 70/45.
 */
export function getFishingScore(date, pressureTrend = 0, coeff = null, coeffThresholds = null) {
  let total = 0

  // Lune (0-3)
  const moon = getMoonData(date)
  total += moonFishingScore(moon.phase)

  // Pression (0-2)
  if (pressureTrend > 1.5)       total += 2  // hausse stable → actif
  else if (pressureTrend > -1.5) total += 1  // stable
  // baisse → poissons apathiques → 0

  // Marée adaptative (0-3) : note RELATIVE à la distribution locale.
  let tideScore = 0
  if (coeff != null) {
    if (coeffThresholds) {
      if (coeff >= coeffThresholds.p66)      tideScore = 3  // tiers haut (vive-eau locale)
      else if (coeff >= coeffThresholds.p33) tideScore = 2  // tiers médian
      else                                   tideScore = 1  // tiers bas (morte-eau locale)
    } else {
      // Repli absolu (calibré Atlantique) si distribution indisponible
      if (coeff >= 70)      tideScore = 3
      else if (coeff >= 45) tideScore = 2
      else                  tideScore = 1
    }
  }
  total += tideScore

  // Normalisation 1-3. Max = 8 avec marées, 5 sans.
  const max = coeff != null ? 8 : 5
  if (total >= max * 0.75) return 3
  if (total >= max * 0.42) return 2
  return 1
}

export const SCORE_LABELS = {
  3: { label: 'Excellente activité', color: '#2ecc71' },
  2: { label: 'Bonne activité',      color: '#f0c040' },
  1: { label: 'Faible activité',     color: '#7da8c8' },
}
