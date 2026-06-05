import StarRating from './StarRating'
import { getFishingScore, getCoeffThresholds, SCORE_LABELS } from '../utils/scores'
import { getPressureTrend } from '../utils/weatherApi'
import { calculateCoefficients, getCoefficientForDate } from '../utils/tidesApi'

export default function ScoreBanner({ tides, weather }) {
  const today = new Date()
  const allCoeffs  = tides.data ? calculateCoefficients(tides.data) : []
  const coeff      = getCoefficientForDate(allCoeffs, today)
  const thresholds = getCoeffThresholds(allCoeffs)
  const trend      = weather.data ? getPressureTrend(weather.data) : 0
  const score      = getFishingScore(today, trend, coeff, thresholds)
  const { label, color } = SCORE_LABELS[score]

  return (
    <div className="score-banner" style={{ '--score-color': color }}>
      <div className="score-left">
        <div className="score-title">Activité des poissons</div>
        <div className="score-label">{label}</div>
      </div>
      <StarRating score={score} size="lg" />
    </div>
  )
}
