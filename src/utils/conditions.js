import { getMoonData } from './moonPhase'
import { getCoeffCategory, getPressureTrend } from './similarity'
import { getFishingScore, getCoeffThresholds } from './scores'
import { calculateCoefficients, getCoefficientForDate, getTidesForDate } from './tidesApi'
import { getDailyForDate } from './weatherApi'

/**
 * Construit une fonction getConditions(date) → conditions complètes du jour
 * (lune, coefficient, pression, score…). Centralise la logique déjà présente
 * dans FishingCalendar pour pouvoir la réutiliser ailleurs (ex: comparaison
 * d'une session enregistrée avec les jours à venir).
 *
 * @param {object|null} tidesData   tides.data (Stormglass)
 * @param {object|null} weatherData weather.data (Open-Meteo)
 */
export function buildConditionsGetter(tidesData, weatherData) {
  const allCoeffs       = tidesData ? calculateCoefficients(tidesData) : []
  const coeffThresholds = getCoeffThresholds(allCoeffs)

  return function getConditions(date) {
    const moon     = getMoonData(date)
    const coeff    = getCoefficientForDate(allCoeffs, date)
    const dayTides = tidesData ? getTidesForDate(tidesData, date) : []
    let trend = 0
    if (weatherData) {
      const d = getDailyForDate(weatherData, date)
      if (d?.pressure && d?.pressurePrev != null) trend = d.pressure - d.pressurePrev
    }
    return {
      moonPhase:     moon.phase,
      moonName:      moon.name,
      moonIcon:      moon.icon,
      moonIllum:     moon.illumination,
      tideCoeff:     coeff,
      coeffCategory: getCoeffCategory(coeff),
      pressureTrend: getPressureTrend(trend),
      fishingScore:  getFishingScore(date, trend, coeff, coeffThresholds),
      tides:         dayTides,
    }
  }
}
