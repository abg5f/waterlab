import { getSolunarPeriods, formatSolunarTime, getCurrentPeriod } from '../utils/solunar'

export default function SolunarPanel({ location }) {
  const today   = new Date()
  const periods = getSolunarPeriods(today, location.lat, location.lng)
  const active  = getCurrentPeriod(periods)

  return (
    <div className="panel">
      <div className="panel-label">🐟 Solunaire</div>
      {active && (
        <div className="solunar-active">
          <span className="active-dot" />
          Période active : <strong>{active.label}</strong>
        </div>
      )}
      <div className="solunar-list">
        {periods.length === 0 && <p className="hint">Aucune période calculée pour aujourd'hui.</p>}
        {periods.map((p, i) => {
          const isNow = active === p
          const start = new Date(p.time.getTime() - (p.duration / 2) * 60000)
          const end   = new Date(p.time.getTime() + (p.duration / 2) * 60000)
          return (
            <div key={i} className={`solunar-row ${p.type} ${isNow ? 'solunar-now' : ''}`}>
              <span className={`solunar-dot ${p.type}`} />
              <div className="solunar-info">
                <span className="solunar-label">{p.label}</span>
                <span className="solunar-range">
                  {formatSolunarTime(start)} – {formatSolunarTime(end)}
                </span>
              </div>
              <span className={`solunar-badge ${p.type}`}>
                {p.type === 'major' ? 'Majeure' : 'Mineure'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
