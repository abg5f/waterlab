import { useMemo } from 'react'
import StarRating from './StarRating'
import { getFishingScore, getCoeffThresholds, SCORE_LABELS } from '../utils/scores'
import { getPressureTrend, getDailyForDate } from '../utils/weatherApi'
import { calculateCoefficients, getCoefficientForDate } from '../utils/tidesApi'

export default function ScoreBanner({ tides, weather, selectedDate }) {
  const today       = new Date()
  const displayDate = selectedDate || today
  const isToday     = displayDate.toDateString() === today.toDateString()

  // Coefficients et seuils (mémoïsés — données astronomiques stables)
  const allCoeffs  = useMemo(() => tides.data ? calculateCoefficients(tides.data) : [], [tides.data])
  const thresholds = useMemo(() => getCoeffThresholds(allCoeffs), [allCoeffs])
  const coeff      = getCoefficientForDate(allCoeffs, displayDate)

  // Tendance pression pour la date affichée
  let trend = 0
  if (weather.data) {
    if (isToday) {
      trend = getPressureTrend(weather.data)
    } else {
      const daily = getDailyForDate(weather.data, displayDate)
      if (daily?.pressure && daily?.pressurePrev != null) {
        trend = daily.pressure - daily.pressurePrev
      }
    }
  }

  const score = getFishingScore(displayDate, trend, coeff, thresholds)
  const { label, color } = SCORE_LABELS[score]

  // Prochaine journée 3★ (calculée depuis aujourd'hui, pas depuis selectedDate)
  const nextBestDay = useMemo(() => {
    if (!tides.data) return null
    // Si aujourd'hui est déjà 3★, pas besoin d'afficher
    const todayCoeff = getCoefficientForDate(allCoeffs, today)
    let todayTrend = 0
    if (weather.data) todayTrend = getPressureTrend(weather.data)
    if (getFishingScore(today, todayTrend, todayCoeff, thresholds) === 3) return null

    for (let i = 1; i <= 30; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const c = getCoefficientForDate(allCoeffs, d)
      // Open-Meteo couvre 16 jours ; au-delà → tendance neutre (0)
      let t = 0
      if (weather.data) {
        const daily = getDailyForDate(weather.data, d)
        if (daily?.pressure && daily?.pressurePrev != null) t = daily.pressure - daily.pressurePrev
      }
      if (getFishingScore(d, t, c, thresholds) === 3) return d
    }
    return null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCoeffs, thresholds, weather.data])

  return (
    <div className="score-banner" style={{ '--score-color': color }}>
      <div className="score-left">
        {!isToday && (
          <div className="score-date">
            {displayDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        )}
        <div className="score-title">Activité des poissons</div>
        <div className="score-label">{label}</div>
        {isToday && score === 3 && (
          <div className="score-next-best score-today-best">✨ Journée idéale aujourd'hui !</div>
        )}
        {isToday && score < 3 && nextBestDay && (
          <div className="score-next-best">
            🎯 Prochaine 3★ :{' '}
            <strong>
              {nextBestDay.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
            </strong>
          </div>
        )}
        {isToday && score < 3 && !nextBestDay && tides.data && (
          <div className="score-next-best">📅 Aucune 3★ dans les 30 prochains jours.</div>
        )}
      </div>
      <StarRating score={score} size="lg" />
    </div>
  )
}
