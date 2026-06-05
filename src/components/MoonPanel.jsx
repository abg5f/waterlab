import { getMoonData } from '../utils/moonPhase'
import { getPressureTrend, getHourlyForDate } from '../utils/weatherApi'

export default function MoonPanel({ location, weather }) {
  const today = new Date()
  const moon  = getMoonData(today)

  const hours   = weather.data ? getHourlyForDate(weather.data, today) : []
  const trend   = weather.data ? getPressureTrend(weather.data) : 0
  const current = hours.find(h => h.hour === today.getHours())?.pressure

  const trendLabel = trend > 1.5  ? { txt: '↗ En hausse', cls: 'trend-up'   }
                   : trend < -1.5 ? { txt: '↘ En baisse', cls: 'trend-down' }
                   :                { txt: '→ Stable',     cls: 'trend-stable' }

  const impact = trend > 1.5  ? 'Bonne activité prévue'
               : trend < -1.5 ? 'Poissons en profondeur'
               :                'Conditions normales'

  return (
    <div className="panel panel-moon-pressure">
      {/* Lune */}
      <div className="panel-label">🌙 Lune</div>
      <div className="moon-icon">{moon.icon}</div>
      <div className="moon-name">{moon.name}</div>
      <div className="moon-illum">{moon.illumination}% illuminée</div>

      {/* Séparateur */}
      <div className="mp-divider" />

      {/* Pression */}
      <div className="panel-label">🌡️ Pression</div>
      <div className="pressure-value">{current ? `${Math.round(current)} hPa` : '—'}</div>
      <span className={`pressure-trend ${trendLabel.cls}`}>{trendLabel.txt}</span>
      <div className="pressure-impact">{impact}</div>
    </div>
  )
}
