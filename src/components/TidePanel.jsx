import { calculateCoefficients, getTidesForDate, formatTime, coeffLabel, coeffClass } from '../utils/tidesApi'

function errorHint(msg) {
  if (!msg) return msg
  if (msg.includes('401') || msg.includes('403')) return 'Clé API invalide ou expirée — vérifiez les paramètres.'
  if (msg.includes('402')) return 'Quota dépassé (10 appels/jour gratuit Stormglass).'
  if (msg.includes('429')) return 'Trop de requêtes — réessayez dans quelques minutes.'
  return `Erreur : ${msg}`
}


export default function TidePanel({ data, loading, error, hasKey, selectedDate }) {
  const today       = new Date()
  const displayDate = selectedDate || today
  const isToday     = displayDate.toDateString() === today.toDateString()
  const displayTides = data ? getTidesForDate(data, displayDate) : []
  const allCoeffs    = data ? calculateCoefficients(data) : []
  const coeffMap     = Object.fromEntries(allCoeffs.map(c => [c.time, c.coeff]))

  const panelTitle = isToday
    ? 'Marées du jour'
    : displayDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

  if (!hasKey) return (
    <div className="panel panel-wide tide-empty-panel">
      <div className="panel-label">🌊 Marées</div>
      <div className="tide-no-key">
        <span>🔑</span>
        <p>Ajoutez votre clé <strong>Stormglass</strong> dans les paramètres.</p>
        <p className="hint">Gratuit — 10 appels/jour sur stormglass.io</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="panel panel-wide">
      <div className="panel-label">🌊 Marées</div>
      <div className="tide-error">⚠️ {errorHint(error)}</div>
    </div>
  )

  if (loading) return (
    <div className="panel panel-wide">
      <div className="panel-label">🌊 Marées</div>
      <div className="tide-loading"><span className="spinner" /> Chargement…</div>
    </div>
  )

  if (!data && error) return (
    <div className="panel panel-wide">
      <div className="panel-label">🌊 Marées</div>
      <div className="tide-error">⚠️ {errorHint(error)}</div>
      <p className="hint" style={{ marginTop: 12, textAlign: 'center' }}>Mise à jour automatique chaque dimanche.</p>
    </div>
  )

  if (!data && !error) return (
    <div className="panel panel-wide">
      <div className="panel-label">🌊 Marées</div>
      <div className="tide-no-data">
        <p>Aucune donnée de marée en cache.</p>
        <p className="hint" style={{ marginTop: 8 }}>Mise à jour automatique chaque dimanche, ou rafraîchissez manuellement depuis le menu admin.</p>
      </div>
    </div>
  )

  if (displayTides.length === 0) return (
    <div className="panel panel-wide">
      <div className="panel-label">🌊 {panelTitle}</div>
      <div className="tide-no-data">
        <p>Aucune marée disponible pour cette date.</p>
      </div>
    </div>
  )

  return (
    <div className="panel panel-wide">
      <div className="panel-label">🌊 {panelTitle}</div>

      <div className="tide-list">
        {displayTides.map((t, i) => {
          const coeff = t.type === 'high' ? coeffMap[t.time] : null
          return (
            <div key={i} className={`tide-row ${t.type === 'high' ? 'tide-high' : 'tide-low'}`}>
              <span className="tide-arrow">{t.type === 'high' ? '▲' : '▼'}</span>
              <div className="tide-details">
                <span className="tide-name">{t.type === 'high' ? 'Haute mer' : 'Basse mer'}</span>
                {t.height != null && <span className="tide-ht">{t.height.toFixed(2)} m</span>}
              </div>
              <span className="tide-time">{formatTime(t.time)}</span>
              {coeff != null && (
                <div className={`coeff-badge ${coeffClass(coeff)}`}>
                  <span className="coeff-num">{coeff}</span>
                  <span className="coeff-txt">{coeffLabel(coeff)}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}

function TideTimeline({ tides }) {
  if (tides.length < 2) return null
  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd   = new Date(now); dayEnd.setHours(23, 59, 59, 999)
  const total    = dayEnd - dayStart

  const nowPct = Math.min(100, Math.max(0, ((now - dayStart) / total) * 100))

  const points = tides.map(t => {
    const time = new Date(t.time)
    const pct  = Math.min(100, Math.max(0, ((time - dayStart) / total) * 100))
    return { pct, type: t.type, time: formatTime(t.time) }
  })

  return (
    <div className="tide-timeline">
      <div className="timeline-track">
        {points.map((p, i) => (
          <div key={i} className={`timeline-marker ${p.type}`} style={{ left: `${p.pct}%` }}>
            <span className="tl-arrow">{p.type === 'high' ? '▲' : '▼'}</span>
            <span className="tl-time">{p.time}</span>
          </div>
        ))}
        <div className="timeline-now" style={{ left: `${nowPct}%` }} title="Maintenant" />
      </div>
      <div className="timeline-labels">
        <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>24h</span>
      </div>
    </div>
  )
}
