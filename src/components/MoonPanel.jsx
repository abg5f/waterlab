import { getMoonData } from '../utils/moonPhase'
import { getPressureTrend, getHourlyForDate, getDailyForDate } from '../utils/weatherApi'

export default function MoonPanel({ location, weather, selectedDate }) {
  const today       = new Date()
  const displayDate = selectedDate || today
  const isToday     = displayDate.toDateString() === today.toDateString()

  // Lune calculée pour la date affichée (SunCalc fonctionne sur n'importe quelle date)
  const moon = getMoonData(displayDate)

  // Pression : heure en cours si aujourd'hui, sinon moyenne journalière prévue
  let pressureValue = null
  let trend         = 0
  if (weather.data) {
    if (isToday) {
      const hours = getHourlyForDate(weather.data, today)
      pressureValue = hours.find(h => h.hour === today.getHours())?.pressure
      trend = getPressureTrend(weather.data)
    } else {
      const daily     = getDailyForDate(weather.data, displayDate)
      const dailyPrev = getDailyForDate(weather.data, new Date(displayDate.getTime() - 86400000))
      pressureValue = daily?.pressure ?? null
      if (daily?.pressure && dailyPrev?.pressure) trend = daily.pressure - dailyPrev.pressure
    }
  }

  const trendLabel = trend > 1.5  ? { txt: '↗ En hausse', cls: 'trend-up'    }
                   : trend < -1.5 ? { txt: '↘ En baisse', cls: 'trend-down'  }
                   :                { txt: '→ Stable',     cls: 'trend-stable' }

  const impact = trend > 1.5  ? 'Bonne activité prévue'
               : trend < -1.5 ? 'Poissons en profondeur'
               :                'Conditions normales'

  return (
    <div className="panel panel-moon-pressure">
      <div className="panel-label">🌙 Lune{!isToday && <span className="panel-date-badge">{displayDate.toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}</span>}</div>
      <div className="moon-icon">{moon.icon}</div>
      <div className="moon-name">{moon.name}</div>
      <div className="moon-illum">{moon.illumination}% illuminée</div>

      <div className="mp-divider" />

      <div className="panel-label">🌡️ Pression</div>
      <div className="pressure-value">{pressureValue ? `${Math.round(pressureValue)} hPa` : '—'}</div>
      <span className={`pressure-trend ${trendLabel.cls}`}>{trendLabel.txt}</span>
      <div className="pressure-impact">{impact}</div>
    </div>
  )
}
