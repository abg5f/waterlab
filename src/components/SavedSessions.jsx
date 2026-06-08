import { useState, useMemo } from 'react'
import StarRating from './StarRating'
import PhotoGallery from './PhotoGallery'
import FavoriteModal from './FavoriteModal'
import { checkPin, hasPinStored } from '../utils/pin'
import { buildConditionsGetter } from '../utils/conditions'
import { saveFavoriteSession } from '../utils/favoriteEntry'
import {
  compareDays, SIMILARITY_THRESHOLD,
  TREND_LABELS, COEFF_LABELS, TOD_LABELS,
} from '../utils/similarity'

/* ── Verrou PIN (même logique que l'accès favoris du calendrier) ── */
function SavedPinLock({ onSuccess, onClose }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')

  const tryUnlock = () => {
    if (checkPin(pin)) onSuccess()
    else setErr('Mot de passe incorrect')
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal fav-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-top">
          <h2>🔒 Sessions enregistrées</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="hint" style={{ marginBottom: 14 }}>
          L'accès aux sessions enregistrées est protégé. Entrez votre mot de passe.
        </p>
        <div className="pin-row">
          <input
            className="pin-input" type="password" value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryUnlock()}
            placeholder="Mot de passe…" autoFocus
          />
          <button className="btn-unlock" onClick={tryUnlock}>OK</button>
        </div>
        {err && <p className="pin-error">{err}</p>}
      </div>
    </div>
  )
}

/* ── Carte résumé d'une session dans la liste ─────────────────── */
function SavedSessionCard({ favorite, onClick }) {
  const date    = new Date(favorite.date + 'T12:00:00')
  const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <button className="saved-card" type="button" onClick={onClick}>
      <div className="saved-card-top">
        <span className="saved-card-date">{dateStr}</span>
        <StarRating score={favorite.fishing_score} size="xs" />
      </div>
      {(favorite.spot || favorite.species || favorite.moon_name || favorite.photos?.length > 0) && (
        <div className="saved-card-meta">
          {favorite.spot       && <span className="saved-tag">📍 {favorite.spot}</span>}
          {favorite.species    && <span className="saved-tag">🐟 {favorite.species}</span>}
          {favorite.moon_name  && <span className="saved-tag">🌙 {favorite.moon_name}</span>}
          {favorite.photos?.length > 0 && <span className="saved-tag">📷 {favorite.photos.length}</span>}
        </div>
      )}
      {favorite.comment && <p className="saved-card-comment">"{favorite.comment}"</p>}
      <span className="saved-card-chevron">›</span>
    </button>
  )
}

/* ── Détail d'une session + jours à venir similaires à CETTE session ── */
function SavedSessionDetail({ favorite, getConditions, onBack, onRemove, onUpsert, isFavorite, onClose, onSaved }) {
  const [editing, setEditing] = useState(false)
  const date    = useMemo(() => new Date(favorite.date + 'T12:00:00'), [favorite.date])
  const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const conditions = useMemo(() => getConditions ? getConditions(date) : null, [getConditions, date])

  const similarDays = useMemo(() => {
    if (!getConditions) return []
    const today = new Date()
    const out = []
    for (let i = 0; i <= 15; i++) {
      const d    = new Date(today); d.setDate(today.getDate() + i)
      const cond = getConditions(d)
      const cmp  = compareDays(favorite, { moonPhase: cond.moonPhase, coeffCategory: cond.coeffCategory, pressureTrend: cond.pressureTrend, tides: cond.tides })
      if (cmp.score >= SIMILARITY_THRESHOLD) out.push({ date: d, ...cond, ...cmp })
    }
    return out.sort((a, b) => b.score - a.score)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorite, getConditions])

  return (
    <>
      <div className="modal-top">
        <button className="btn-back" type="button" onClick={onBack}>‹ Retour</button>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      <p className="fav-date">⭐ {dateStr}</p>

      <div className="fav-conditions">
        {favorite.moon_name && <span className="fav-cond-item">🌙 {favorite.moon_name}</span>}
        {favorite.coeff_category && (
          <span className={`fav-cond-item coeff-pill ${favorite.coeff_category}`}>
            {COEFF_LABELS[favorite.coeff_category]} {favorite.tide_coeff != null ? `(${favorite.tide_coeff})` : ''}
          </span>
        )}
        {favorite.pressure_trend && <span className="fav-cond-item">🌡️ {TREND_LABELS[favorite.pressure_trend]}</span>}
        <StarRating score={favorite.fishing_score} size="sm" />
      </div>

      {(favorite.spot || favorite.species) && (
        <div className="detail-fav-meta" style={{ marginTop: 4, marginBottom: 10 }}>
          {favorite.spot    && <span className="detail-fav-spot">📍 {favorite.spot}</span>}
          {favorite.species && <span className="detail-fav-species">🐟 {favorite.species}</span>}
        </div>
      )}

      {favorite.time_of_day && (
        <p className="hint" style={{ marginBottom: 8 }}>
          ⭐ Créneau : {TOD_LABELS[favorite.time_of_day] || '—'}
          {favorite.tide_period_type && (
            <> — {favorite.tide_period_type === 'high' ? '▲ marée haute' : '▼ marée basse'}
            {favorite.tide_period_hour != null && ` vers ${favorite.tide_period_hour}h`}</>
          )}
        </p>
      )}

      {favorite.comment && (
        <blockquote className="detail-fav-comment">"{favorite.comment}"</blockquote>
      )}

      {favorite.photos?.length > 0 && (
        <>
          <div className="fav-section-label">📷 Photos</div>
          <PhotoGallery photos={favorite.photos} size="md" />
        </>
      )}

      <div className="fav-section-label" style={{ marginTop: 18 }}>🔮 Jours à venir similaires à cette session</div>
      {similarDays.length === 0 ? (
        <p className="hint">Aucun jour similaire dans les 16 prochains jours.</p>
      ) : (
        <div className="similar-list">
          {similarDays.map((day, i) => {
            const dStr = day.date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
            return (
              <div key={i} className="similar-card">
                <div className="similar-card-head">
                  <div className="similar-left">
                    <span className="similar-date">{dStr}</span>
                    <div className="similar-criteria">
                      {day.criteria.map(c => <span key={c.key} className="crit-badge">{c.label}</span>)}
                    </div>
                  </div>
                  <div className="similar-right">
                    <span className="similar-score">{day.score}/4</span>
                    <StarRating score={day.fishingScore} size="xs" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn-delete" type="button" onClick={() => { onRemove(favorite.date); onBack() }}>
          🗑 Supprimer cette session
        </button>
        <button className="btn-cancel" type="button" onClick={() => setEditing(true)}>
          ✏️ Modifier
        </button>
      </div>

      {editing && conditions && (
        <FavoriteModal
          date={date}
          dayTides={conditions.tides}
          existing={favorite}
          conditions={conditions}
          getConditions={getConditions}
          isFavorite={(dateStr) => (dateStr !== favorite.date ? isFavorite?.(dateStr) : null)}
          onSave={(payload) => {
            saveFavoriteSession(date, payload, { upsert: onUpsert, remove: onRemove })
            onSaved?.(payload.date)
          }}
          onDelete={() => { onRemove(favorite.date); onBack() }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

/* ── Panneau principal : liste + détail ───────────────────────── */
export default function SavedSessionsPanel({ favorites, weather, tides, onRemove, onUpsert, isFavorite, onClose }) {
  const [unlocked, setUnlocked] = useState(() => !hasPinStored())
  const [selectedDate, setSelectedDate] = useState(null)

  const getConditions = useMemo(() => buildConditionsGetter(tides, weather?.data), [tides, weather?.data])

  // Dérivé de la liste live `favorites` (et non d'une copie figée) afin de
  // rester synchronisé après une modification (notamment un changement de date).
  const selected = useMemo(
    () => (selectedDate ? favorites?.find(f => f.date === selectedDate) || null : null),
    [favorites, selectedDate]
  )

  if (!unlocked) {
    return <SavedPinLock onSuccess={() => setUnlocked(true)} onClose={onClose} />
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal fav-modal saved-modal" onClick={e => e.stopPropagation()}>
        {selected ? (
          <SavedSessionDetail
            favorite={selected}
            getConditions={getConditions}
            onBack={() => setSelectedDate(null)}
            onRemove={(dateStr) => { onRemove(dateStr); if (dateStr === selectedDate) setSelectedDate(null) }}
            onUpsert={onUpsert}
            isFavorite={isFavorite}
            onSaved={(newDateStr) => setSelectedDate(newDateStr)}
            onClose={onClose}
          />
        ) : (
          <>
            <div className="modal-top">
              <h2>⭐ Sessions enregistrées</h2>
              <button className="modal-close" onClick={onClose}>✕</button>
            </div>
            {!favorites?.length ? (
              <p className="hint">
                Aucune session enregistrée pour le moment. Marque tes meilleures sorties depuis le calendrier pour les retrouver ici !
              </p>
            ) : (
              <div className="saved-list">
                {favorites.map(fav => (
                  <SavedSessionCard key={fav.date} favorite={fav} onClick={() => setSelectedDate(fav.date)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
