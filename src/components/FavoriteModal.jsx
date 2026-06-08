import { useState, useMemo, useRef } from 'react'
import StarRating from './StarRating'
import PhotoGallery from './PhotoGallery'
import { resizeImage, MAX_SESSION_PHOTOS } from '../utils/imageResize'
import { formatTime } from '../utils/tidesApi'
import {
  getTidesInPeriod, getDominantTide,
  TREND_LABELS, COEFF_LABELS, TIME_PERIODS,
} from '../utils/similarity'
import { useSupabase, uploadSessionPhoto, deleteSessionPhoto } from '../lib/supabase'

/**
 * Formulaire d'ajout / modification d'une session favorite.
 * Réutilisé depuis le calendrier (FishingCalendar) et depuis la section
 * "Sessions enregistrées" (SavedSessions) — d'où l'extraction dans son
 * propre fichier.
 *
 * @param {Date}     date          Date du jour (telle qu'ouverte par l'appelant)
 * @param {Array}    dayTides      Marées du jour (référence, recalculées si la date est corrigée)
 * @param {object}   existing      Favori existant (ou null pour un ajout)
 * @param {object}   conditions    Conditions calculées pour `date`
 * @param {Function} getConditions (date) => conditions — pour recalcul si la date est corrigée
 * @param {Function} isFavorite    (dateStr) => favori | null — pour détecter les conflits de date
 * @param {Function} onSave        (payload) => void
 * @param {Function} onDelete      () => void
 * @param {Function} onClose       () => void
 */
export default function FavoriteModal({ date, dayTides, existing, conditions, getConditions, isFavorite, onSave, onDelete, onClose }) {
  const initialDateKey = date.toISOString().split('T')[0]

  const [comment,    setComment]    = useState(existing?.comment    || '')
  const [spot,       setSpot]       = useState(existing?.spot       || '')
  const [species,    setSpecies]    = useState(existing?.species    || '')
  const [timeOfDay,  setTimeOfDay]  = useState(existing?.time_of_day || 'morning')
  const [photos,     setPhotos]     = useState(existing?.photos     || [])
  const [dateInput,  setDateInput]  = useState(initialDateKey)
  const [dateError,  setDateError]  = useState('')
  const [uploading,  setUploading]  = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef(null)
  const supabase     = useSupabase()

  const dateChanged = dateInput !== initialDateKey

  // Si la date a été corrigée, on recalcule lune/coefficient/marées pour la nouvelle date
  const liveDate = useMemo(() => {
    if (!dateChanged) return date
    const [y, m, d] = dateInput.split('-').map(Number)
    return (y && m && d) ? new Date(y, m - 1, d, 12) : date
  }, [dateChanged, dateInput, date])

  const liveConditions = useMemo(() => {
    if (!dateChanged || !getConditions) return conditions
    return getConditions(liveDate)
  }, [dateChanged, getConditions, liveDate, conditions])

  const liveDayTides = liveConditions.tides ?? dayTides
  const dateKey      = liveDate.toISOString().split('T')[0]

  const tidesInPeriod = getTidesInPeriod(liveDayTides, timeOfDay)
  const dominantTide  = getDominantTide([...tidesInPeriod])

  const dateStr = liveDate.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const handleFiles = async (fileList) => {
    setPhotoError('')
    const room = MAX_SESSION_PHOTOS - photos.length
    if (room <= 0) { setPhotoError(`Maximum ${MAX_SESSION_PHOTOS} photos par session.`); return }
    const files = Array.from(fileList).slice(0, room)
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      try {
        const blob   = await resizeImage(file)
        const result = await uploadSessionPhoto(supabase, dateKey, blob)
        if (result) setPhotos(prev => [...prev, result])
        else setPhotoError("Échec de l'envoi d'une photo.")
      } catch {
        setPhotoError("Une image n'a pas pu être traitée.")
      }
    }
    setUploading(false)
  }

  const removePhoto = (idx) => {
    const photo = photos[idx]
    setPhotos(prev => prev.filter((_, i) => i !== idx))
    if (photo?.path) deleteSessionPhoto(supabase, photo.path)
  }

  const handleSave = () => {
    setDateError('')
    if (dateChanged) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) { setDateError('Date invalide.'); return }
      if (isFavorite?.(dateInput)) { setDateError('Une autre session est déjà enregistrée à cette date.'); return }
    }
    onSave({
      date:        dateInput,
      dateChanged,
      conditions:  liveConditions,
      comment,
      spot:    spot.trim()    || null,
      species: species.trim() || null,
      time_of_day:      timeOfDay,
      tide_period_type: dominantTide?.type || null,
      tide_period_hour: dominantTide ? new Date(dominantTide.time).getHours() : null,
      photos,
    })
    onClose()
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal fav-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-top">
          <h2>⭐ {existing ? 'Modifier le favori' : 'Ajouter aux favoris'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p className="fav-date">{dateStr}</p>

        {existing && (
          <label className="fav-field-label" style={{ marginBottom: 14 }}>
            📅 Corriger la date (en cas d'erreur de saisie)
            <input
              type="date"
              className="fav-text-input"
              value={dateInput}
              onChange={e => { setDateInput(e.target.value); setDateError('') }}
            />
          </label>
        )}
        {dateError && <p className="pin-error" style={{ marginTop: -8, marginBottom: 12 }}>{dateError}</p>}

        {/* Résumé des conditions (recalculées si la date est corrigée) */}
        <div className="fav-conditions">
          <span className="fav-cond-item">🌙 {liveConditions.moonName}</span>
          {liveConditions.coeffCategory && (
            <span className={`fav-cond-item coeff-pill ${liveConditions.coeffCategory}`}>
              {COEFF_LABELS[liveConditions.coeffCategory]} ({liveConditions.tideCoeff ?? '—'})
            </span>
          )}
          <span className="fav-cond-item">🌡️ {TREND_LABELS[liveConditions.pressureTrend] ?? '—'}</span>
          <StarRating score={liveConditions.fishingScore} size="sm" />
        </div>
        {dateChanged && (
          <p className="hint" style={{ marginTop: -10, marginBottom: 14 }}>
            ℹ️ Conditions recalculées pour la nouvelle date (la pression atmosphérique n'étant pas connue pour les dates passées, sa tendance est neutre par défaut).
          </p>
        )}

        {/* Spot & espèce */}
        <div className="fav-meta-row">
          <label className="fav-field-label">
            📍 Spot
            <input
              type="text"
              className="fav-text-input"
              value={spot}
              onChange={e => setSpot(e.target.value)}
              placeholder="Ex : Canal du François"
            />
          </label>
          <label className="fav-field-label">
            🐟 Espèce
            <input
              type="text"
              className="fav-text-input"
              value={species}
              onChange={e => setSpecies(e.target.value)}
              placeholder="Ex : Tarpon, Snook…"
            />
          </label>
        </div>

        {/* Photos */}
        <div className="fav-section-label">📷 Photos ({photos.length}/{MAX_SESSION_PHOTOS})</div>
        <div className="fav-photos">
          {photos.map((p, i) => (
            <div key={p.path || p.url || i} className="fav-photo-thumb">
              <img src={p.url} alt="" />
              <button
                type="button" className="fav-photo-remove"
                onClick={() => removePhoto(i)} aria-label="Supprimer la photo"
              >✕</button>
            </div>
          ))}
          {photos.length < MAX_SESSION_PHOTOS && (
            <button
              type="button" className="fav-photo-add"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? '…' : '+'}
            </button>
          )}
          <input
            ref={fileInputRef} type="file" accept="image/*" multiple
            style={{ display: 'none' }}
            onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
          />
        </div>
        {photoError && <p className="pin-error">{photoError}</p>}

        {/* Créneau */}
        <div className="fav-section-label">Quand c'était bon ?</div>
        <div className="tod-selector">
          {Object.entries(TIME_PERIODS).map(([key, { label }]) => (
            <button
              key={key}
              className={`tod-btn ${timeOfDay === key ? 'active' : ''}`}
              onClick={() => setTimeOfDay(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Marées du créneau */}
        <div className="fav-tides-period">
          {tidesInPeriod.length === 0 ? (
            <span className="hint">Aucune marée sur ce créneau.</span>
          ) : (
            tidesInPeriod.map((t, i) => (
              <div key={i} className={`fav-tide-row ${t.type === 'high' ? 'tide-high' : 'tide-low'}`}>
                <span className="fav-tide-arrow">{t.type === 'high' ? '▲' : '▼'}</span>
                <span className="fav-tide-name">{t.type === 'high' ? 'Haute mer' : 'Basse mer'}</span>
                <span className="fav-tide-time">{formatTime(t.time)}</span>
                {t.height != null && <span className="fav-tide-ht">{t.height.toFixed(2)} m</span>}
                {i === 0 && tidesInPeriod.length > 0 && (
                  <span className="fav-tide-ref">référence</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Commentaire */}
        <label className="fav-comment-label">
          Notes de session
          <textarea
            className="fav-textarea"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Ex : Barage cap bossé, banc de thazards au large, vent 15 nœuds NO…"
            rows={3}
          />
        </label>

        <div className="modal-actions">
          {existing && (
            <button className="btn-delete" type="button" onClick={() => { onDelete(); onClose() }}>
              🗑 Supprimer
            </button>
          )}
          <button className="btn-cancel" type="button" onClick={onClose}>Annuler</button>
          <button className="btn-save" type="button" onClick={handleSave}>
            {existing ? 'Mettre à jour' : '⭐ Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
