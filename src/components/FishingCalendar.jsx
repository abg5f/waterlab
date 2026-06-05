import { useState, useMemo } from 'react'
import StarRating from './StarRating'
import { getMoonData } from '../utils/moonPhase'
import { getFishingScore, getCoeffThresholds } from '../utils/scores'
import { calculateCoefficients, getCoefficientForDate, getTidesForDate, formatTime, coeffLabel, coeffClass } from '../utils/tidesApi'
import { getDailyForDate } from '../utils/weatherApi'
import {
  getCoeffCategory, getPressureTrend,
  getTidesInPeriod, getDominantTide,
  findSimilarDays,
  TREND_LABELS, COEFF_LABELS, TOD_LABELS, TIME_PERIODS,
} from '../utils/similarity'
import { checkPin, hasPinStored } from '../utils/pin'
import { useFavorites } from '../hooks/useFavorites'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS   = ['Lu','Ma','Me','Je','Ve','Sa','Di']

/* ── Modal favori ─────────────────────────────────────── */
function FavoriteModal({ date, dayTides, existing, conditions, onSave, onDelete, onClose }) {
  const [comment,    setComment]    = useState(existing?.comment    || '')
  const [timeOfDay,  setTimeOfDay]  = useState(existing?.time_of_day || 'morning')

  const tidesInPeriod = getTidesInPeriod(dayTides, timeOfDay)
  const dominantTide  = getDominantTide([...tidesInPeriod])

  const dateStr = date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const handleSave = () => {
    onSave({
      comment,
      time_of_day:      timeOfDay,
      tide_period_type: dominantTide?.type || null,
      tide_period_hour: dominantTide ? new Date(dominantTide.time).getHours() : null,
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

        {/* Résumé des conditions */}
        <div className="fav-conditions">
          <span className="fav-cond-item">🌙 {conditions.moonName}</span>
          {conditions.coeffCategory && (
            <span className={`fav-cond-item coeff-pill ${conditions.coeffCategory}`}>
              {COEFF_LABELS[conditions.coeffCategory]} ({conditions.tideCoeff ?? '—'})
            </span>
          )}
          <span className="fav-cond-item">🌡️ {TREND_LABELS[conditions.pressureTrend] ?? '—'}</span>
          <StarRating score={conditions.fishingScore} size="sm" />
        </div>

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

/* ── Panneau jours similaires ─────────────────────────── */
function SimilarDaysPanel({ similarDays }) {
  const [expanded, setExpanded] = useState(null)

  if (!similarDays.length) return (
    <div className="similar-empty">
      <p>🔍 Aucun jour similaire dans les 16 prochains jours.</p>
      <p className="hint">Marquez des journées favorites dans le calendrier pour activer cette fonctionnalité.</p>
    </div>
  )

  return (
    <div className="similar-list">
      {similarDays.map((day, i) => {
        const isOpen  = expanded === i
        const bestRef = day.refs[0]
        const dateStr = day.date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
        return (
          <div key={i} className={`similar-card ${isOpen ? 'open' : ''}`}>
            <div className="similar-card-head" onClick={() => setExpanded(isOpen ? null : i)}>
              <div className="similar-left">
                <span className="similar-date">{dateStr}</span>
                <div className="similar-criteria">
                  {bestRef.criteria.map(c => (
                    <span key={c.key} className="crit-badge">{c.label}</span>
                  ))}
                </div>
              </div>
              <div className="similar-right">
                <span className="similar-score">{bestRef.score}/4</span>
                <StarRating score={day.score} size="xs" />
                <span>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <div className="similar-refs">
                <p className="similar-refs-title">
                  Référence{day.refs.length > 1 ? 's' : ''} ({day.refs.length}) :
                </p>
                {day.refs.map((ref, j) => {
                  const refDate    = new Date(ref.favorite.date + 'T12:00:00')
                  const refDateStr = refDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                  const tod        = ref.favorite.time_of_day
                  return (
                    <div key={j} className="ref-item">
                      <div className="ref-head">
                        <span className="ref-star">⭐</span>
                        <span className="ref-date">{refDateStr}</span>
                        {tod && <span className="ref-tod">{TOD_LABELS[tod]}</span>}
                        <span className="ref-match">{ref.score}/4</span>
                      </div>
                      <div className="ref-criteria">
                        {ref.criteria.map(c => (
                          <span key={c.key} className="crit-badge">{c.label}</span>
                        ))}
                      </div>
                      {ref.favorite.comment && (
                        <blockquote className="ref-comment">"{ref.favorite.comment}"</blockquote>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Modal PIN pour favoris ───────────────────────────── */
function FavPinModal({ onSuccess, onClose }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')

  const tryUnlock = () => {
    if (checkPin(pin)) { onSuccess(); onClose() }
    else setErr('Mot de passe incorrect')
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal fav-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-top">
          <h2>🔒 Accès favoris</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="hint" style={{ marginBottom: 14 }}>
          L'ajout de favoris est protégé. Entrez votre mot de passe.
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

/* ── Composant principal ──────────────────────────────── */
export default function FishingCalendar({ weather, tides, onDateSelect }) {
  const today = new Date()
  const [view,         setView]         = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [sel,          setSel]          = useState(null)
  const [tab,          setTab]          = useState('calendar')
  const [modal,        setModal]        = useState(null)
  const [favUnlocked,  setFavUnlocked]  = useState(() => !hasPinStored()) // auto-libre si pas de PIN
  const [pinModal,     setPinModal]     = useState(null) // day number en attente

  const { isFavorite, upsert, remove } = useFavorites()

  const year  = view.getFullYear()
  const month = view.getMonth()
  const last  = new Date(year, month + 1, 0).getDate()
  const pad   = (new Date(year, month, 1).getDay() + 6) % 7

  const allCoeffs     = useMemo(() => (tides ? calculateCoefficients(tides) : []), [tides])
  const coeffThresholds = useMemo(() => getCoeffThresholds(allCoeffs), [allCoeffs])

  const getConditions = (dateOrDay) => {
    const date = dateOrDay instanceof Date ? dateOrDay : new Date(year, month, dateOrDay)
    const moon     = getMoonData(date)
    const coeff    = getCoefficientForDate(allCoeffs, date)
    const dayTides = tides ? getTidesForDate(tides, date) : []
    let trend = 0
    if (weather.data) {
      const d = getDailyForDate(weather.data, date)
      if (d?.pressure && d?.pressurePrev) trend = d.pressure - d.pressurePrev
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

  const openModal = (day) => {
    if (!favUnlocked && hasPinStored()) {
      setPinModal(day)   // met en attente, affiche le PIN modal
      return
    }
    const date  = new Date(year, month, day)
    const cond  = getConditions(day)
    setSel(null)
    setModal({ date, conditions: cond, dayTides: cond.tides, existing: isFavorite(date) })
  }

  const openModalAfterPin = (day) => {
    setFavUnlocked(true)
    const date = new Date(year, month, day)
    const cond = getConditions(day)
    setSel(null)
    setModal({ date, conditions: cond, dayTides: cond.tides, existing: isFavorite(date) })
  }

  const saveFavorite = (date, conditions, extra) => {
    upsert({
      date:             date.toISOString().split('T')[0],
      comment:          extra.comment,
      moon_phase:       conditions.moonPhase,
      moon_name:        conditions.moonName,
      coeff_category:   conditions.coeffCategory,
      tide_coeff:       conditions.tideCoeff,
      pressure_trend:   conditions.pressureTrend,
      fishing_score:    conditions.fishingScore,
      time_of_day:      extra.time_of_day,
      tide_period_type: extra.tide_period_type,
      tide_period_hour: extra.tide_period_hour,
    })
  }

  const cells = [...Array(pad).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)]

  return (
    <section className="calendar-section">
      {/* Header navigation */}
      <div className="cal-header">
        <button className="cal-nav" onClick={() => setView(new Date(year, month - 1, 1))}>‹</button>
        <h3>{MONTHS[month]} {year}</h3>
        <button className="cal-nav" onClick={() => setView(new Date(year, month + 1, 1))}>›</button>
      </div>

      {/* Onglets */}
      <div className="cal-tabs">
        <button className={`cal-tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => setTab('calendar')}>
          📅 Calendrier
        </button>
        <button className={`cal-tab ${tab === 'similar' ? 'active' : ''}`} onClick={() => setTab('similar')}>
          🔮 Jours similaires
        </button>
        <button className={`cal-tab ${tab === 'how' ? 'active' : ''}`} onClick={() => setTab('how')}>
          💡 Comment ça marche
        </button>
      </div>

      {/* ── Vue calendrier ── */}
      {tab === 'calendar' && (
        <>
          <div className="cal-grid">
            {DAYS.map(d => <div key={d} className="cal-head">{d}</div>)}
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} className="cal-cell empty" />
              const date     = new Date(year, month, day)
              const cond     = getConditions(day)
              const isToday    = date.toDateString() === today.toDateString()
              const isPast     = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
              const isSelected = sel === day
              const favEntry   = isFavorite(date)
              const coeff      = getCoefficientForDate(allCoeffs, date)
              const moon       = getMoonData(date)
              return (
                <div
                  key={day}
                  className={`cal-cell score-${cond.fishingScore} ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''} ${isSelected ? 'is-selected' : ''} ${favEntry ? 'is-favorite' : ''}`}
                  onClick={() => {
                    const next = isSelected ? null : day
                    setSel(next)
                    onDateSelect?.(next ? new Date(year, month, day) : null)
                  }}
                >
                  <span className="cal-num">{day}</span>
                  {favEntry
                    ? <span className="cal-fav-star" title={TOD_LABELS[favEntry.time_of_day] || ''}>⭐</span>
                    : <span className="cal-moon">{moon.icon}</span>
                  }
                  {coeff != null && <span className={`cal-coeff ${coeffClass(coeff)}`}>{coeff}</span>}
                  <StarRating score={cond.fishingScore} size="xs" />
                </div>
              )
            })}
          </div>

          {/* Détail du jour */}
          {sel && (() => {
            const date     = new Date(year, month, sel)
            const cond     = getConditions(sel)
            const coeff    = getCoefficientForDate(allCoeffs, date)
            const favEntry = isFavorite(date)
            const daily    = weather.data ? getDailyForDate(weather.data, date) : null
            return (
              <div className="cal-detail">
                <div className="cal-detail-top">
                  <strong>{sel} {MONTHS[month]} {year}</strong>
                  <StarRating score={cond.fishingScore} size="md" />
                </div>
                <div className="cal-detail-grid">
                  <div className="cal-det-item"><span>{cond.moonIcon}</span><span>{cond.moonName} ({cond.moonIllum}%)</span></div>
                  {coeff != null && <div className="cal-det-item"><span>🌊</span><span className={coeffClass(coeff)}>Coeff. {coeff} — {coeffLabel(coeff)}</span></div>}
                  <div className="cal-det-item"><span>🌡️</span><span>{TREND_LABELS[cond.pressureTrend]}</span></div>
                  {daily?.windMax != null && <div className="cal-det-item"><span>💨</span><span>{Math.round(daily.windMax)} nœuds</span></div>}
                  {daily?.rain   != null && <div className="cal-det-item"><span>🌧️</span><span>{daily.rain.toFixed(1)} mm</span></div>}
                </div>
                {favEntry && (
                  <div className="detail-fav-info">
                    <span className="detail-fav-tod">⭐ {TOD_LABELS[favEntry.time_of_day] || '—'}</span>
                    {favEntry.tide_period_type && (
                      <span className="detail-fav-tide">
                        {favEntry.tide_period_type === 'high' ? '▲ Haute mer' : '▼ Basse mer'}
                        {favEntry.tide_period_hour != null && ` vers ${favEntry.tide_period_hour}h`}
                      </span>
                    )}
                    {favEntry.comment && <blockquote className="detail-fav-comment">"{favEntry.comment}"</blockquote>}
                  </div>
                )}
                <button className="btn-fav-toggle" onClick={() => openModal(sel)}>
                  {favEntry ? '✏️ Modifier le favori' : '⭐ Ajouter aux favoris'}
                </button>
              </div>
            )
          })()}
        </>
      )}

      {/* ── Vue jours similaires ── */}
      {tab === 'similar' && (
        <SimilarContent
          weather={weather}
          tides={tides}
          getConditions={getConditions}
        />
      )}

      {/* ── Vue "Comment ça marche" ── */}
      {tab === 'how' && <HowItWorks />}

      {/* Modal favori */}
      {modal && (
        <FavoriteModal
          date={modal.date}
          dayTides={modal.dayTides}
          existing={modal.existing}
          conditions={modal.conditions}
          onSave={(extra) => saveFavorite(modal.date, modal.conditions, extra)}
          onDelete={() => remove(modal.date.toISOString().split('T')[0])}
          onClose={() => setModal(null)}
        />
      )}

      {/* Modal PIN pour débloquer les favoris */}
      {pinModal != null && (
        <FavPinModal
          onSuccess={() => openModalAfterPin(pinModal)}
          onClose={() => setPinModal(null)}
        />
      )}
    </section>
  )
}

/* Sous-composant pour accéder à useFavorites sans violer les règles de hooks */
function SimilarContent({ weather, tides, getConditions }) {
  const { favorites } = useFavorites()
  const today = new Date()

  const similarDays = useMemo(() => {
    if (!favorites.length) return []
    const candidates = []
    for (let i = 0; i <= 15; i++) {
      const d    = new Date(today); d.setDate(today.getDate() + i)
      const cond = getConditions(d)
      candidates.push({ date: d, ...cond, score: cond.fishingScore })
    }
    return findSimilarDays(favorites, candidates)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites, tides, weather.data])

  return <SimilarDaysPanel similarDays={similarDays} />
}

/* ── Onglet pédagogique « Comment ça marche » ─────────── */
function HowItWorks() {
  return (
    <div className="hiw">
      <p className="hiw-intro">
        Chaque jour reçoit une note d'activité des poissons de <strong>1 à 3 étoiles</strong>.
        Elle combine trois facteurs naturels qui influencent réellement le comportement
        des poissons : la <strong>lune</strong>, la <strong>pression atmosphérique</strong> et
        la <strong>marée</strong>.
      </p>

      {/* Facteur Lune */}
      <div className="hiw-factor">
        <div className="hiw-factor-head">
          <span className="hiw-factor-icon">🌙</span>
          <h4>La Lune</h4>
          <span className="hiw-pts">0 → 3 pts</span>
        </div>
        <p className="hiw-why">
          La Lune commande les marées et la luminosité nocturne. Autour de la
          <strong> nouvelle lune</strong> et de la <strong>pleine lune</strong>, les marées
          sont les plus fortes (vive-eau) : les courants brassent davantage la nourriture
          et déclenchent des phases d'alimentation intenses. C'est le principe des tables
          solunaires bien connues des pêcheurs.
        </p>
        <ul className="hiw-rules">
          <li><span className="hiw-badge good">+3</span> Pleine lune 🌕 ou nouvelle lune 🌑 — activité maximale</li>
          <li><span className="hiw-badge mid">+2</span> Phases intermédiaires (croissant, gibbeuse)</li>
          <li><span className="hiw-badge low">+1</span> Premier / dernier quartier 🌓🌗 — activité plus faible</li>
        </ul>
      </div>

      {/* Facteur Pression */}
      <div className="hiw-factor">
        <div className="hiw-factor-head">
          <span className="hiw-factor-icon">🌡️</span>
          <h4>La pression atmosphérique</h4>
          <span className="hiw-pts">0 → 2 pts</span>
        </div>
        <p className="hiw-why">
          Les poissons perçoivent les variations de pression via leur vessie natatoire.
          Une pression <strong>stable ou en hausse</strong> annonce du beau temps et les
          rend actifs. Une <strong>chute de pression</strong> (arrivée d'une perturbation)
          les rend apathiques : ils se mettent à l'abri et se nourrissent moins.
        </p>
        <ul className="hiw-rules">
          <li><span className="hiw-badge good">+2</span> Pression en hausse nette — poissons actifs</li>
          <li><span className="hiw-badge mid">+1</span> Pression stable</li>
          <li><span className="hiw-badge low">0</span> Pression en baisse — poissons apathiques</li>
        </ul>
      </div>

      {/* Facteur Marée */}
      <div className="hiw-factor">
        <div className="hiw-factor-head">
          <span className="hiw-factor-icon">🌊</span>
          <h4>La marée (coefficient)</h4>
          <span className="hiw-pts">0 → 3 pts</span>
        </div>
        <p className="hiw-why">
          Plus le coefficient est élevé (<strong>vive-eau</strong>), plus l'eau se déplace :
          les courants remettent la nourriture en mouvement et stimulent les prédateurs.
          La note est <strong>relative à ton spot</strong> : l'app compare chaque jour aux
          autres jours du lieu (tertiles), pour que le système s'adapte aussi bien aux
          fortes marées atlantiques qu'aux marées plus faibles des Caraïbes.
        </p>
        <ul className="hiw-rules">
          <li><span className="hiw-badge good">+3</span> <span className="coeff-spring hiw-cf">Vive-eau locale</span> — tiers des plus forts coefficients</li>
          <li><span className="hiw-badge mid">+2</span> <span className="coeff-medium hiw-cf">Marée moyenne</span> — tiers médian</li>
          <li><span className="hiw-badge low">+1</span> <span className="coeff-neap hiw-cf">Morte-eau locale</span> — tiers des plus faibles</li>
        </ul>
      </div>

      {/* Calcul final */}
      <div className="hiw-factor hiw-total">
        <div className="hiw-factor-head">
          <span className="hiw-factor-icon">⭐</span>
          <h4>Le calcul des étoiles</h4>
        </div>
        <p className="hiw-why">
          On additionne les trois facteurs (jusqu'à <strong>8 points</strong> quand les
          marées sont disponibles), puis on convertit en étoiles selon le pourcentage atteint :
        </p>
        <div className="hiw-stars-table">
          <div className="hiw-star-row">
            <StarRating score={3} size="sm" />
            <span className="hiw-star-thr">≥ 75 % (6+ pts)</span>
            <span className="hiw-star-lbl" style={{ color: 'var(--green)' }}>Excellente activité</span>
          </div>
          <div className="hiw-star-row">
            <StarRating score={2} size="sm" />
            <span className="hiw-star-thr">≥ 42 % (≈ 3,5+ pts)</span>
            <span className="hiw-star-lbl" style={{ color: 'var(--gold)' }}>Bonne activité</span>
          </div>
          <div className="hiw-star-row">
            <StarRating score={1} size="sm" />
            <span className="hiw-star-thr">en dessous</span>
            <span className="hiw-star-lbl" style={{ color: 'var(--text2)' }}>Faible activité</span>
          </div>
        </div>
      </div>

      <p className="hiw-disclaimer">
        ⚠️ Ces notes sont une aide à la décision basée sur des tendances générales.
        La météo locale, le vent, la température de l'eau et ton expérience du spot
        restent déterminants. Note tes belles sessions en favoris ⭐ : l'onglet
        « Jours similaires » retrouvera les jours à conditions comparables.
      </p>
    </div>
  )
}
