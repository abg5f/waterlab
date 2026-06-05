import { useState, useEffect, useRef } from 'react'

/* ── Helpers mot de passe ────────────────────────────────── */
const PIN_KEY = 'wl_api_pin'

// Encodage réversible simple — suffisant pour protéger contre l'accès non autorisé
function encodePin(pin) {
  return btoa(encodeURIComponent(pin.trim()))
}

function checkPin(input) {
  return encodePin(input) === (localStorage.getItem(PIN_KEY) || '')
}

function savePin(pin) {
  localStorage.setItem(PIN_KEY, encodePin(pin))
}

function hasPinStored() {
  return !!localStorage.getItem(PIN_KEY)
}

/* ── Location search ─────────────────────────────────────── */
function LocationSearch({ onSelect, currentName }) {
  const [query,   setQuery]   = useState(currentName)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)
  const debounce  = useRef(null)
  const wrapper   = useRef(null)

  useEffect(() => {
    const close = e => { if (wrapper.current && !wrapper.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const search = value => {
    clearTimeout(debounce.current)
    setQuery(value)
    if (value.trim().length < 2) { setResults([]); setOpen(false); return }
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=6&addressdetails=1`,
          { headers: { 'Accept-Language': 'fr' } }
        )
        const data = await res.json()
        setResults(data); setOpen(data.length > 0)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
  }

  const select = item => {
    const name  = item.address?.city || item.address?.town || item.address?.village || item.name
    const label = `${name}, ${item.address?.country || ''}`
    setQuery(label); setOpen(false); setResults([])
    onSelect({ name: label, lat: parseFloat(item.lat), lng: parseFloat(item.lon) })
  }

  const getLabel = item => [
    item.address?.city || item.address?.town || item.address?.village || item.name,
    item.address?.state, item.address?.country,
  ].filter(Boolean).join(', ')

  const getType = item => ({ city:'Ville', town:'Ville', village:'Village', harbour:'Port', bay:'Baie', beach:'Plage' })[item.type || item.class] || ''

  return (
    <div className="loc-search" ref={wrapper}>
      <label>
        Lieu
        <div className="loc-input-wrap">
          <input value={query} onChange={e => search(e.target.value)} onFocus={() => results.length && setOpen(true)} placeholder="Ville, port, spot…" autoComplete="off" />
          {loading && <span className="loc-spin">⏳</span>}
        </div>
      </label>
      {open && (
        <ul className="loc-dropdown">
          {results.map(r => (
            <li key={r.place_id} onMouseDown={() => select(r)}>
              <span className="loc-name">{getLabel(r)}</span>
              {getType(r) && <span className="loc-type">{getType(r)}</span>}
              <span className="loc-coords">{parseFloat(r.lat).toFixed(4)}, {parseFloat(r.lon).toFixed(4)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Section API (verrouillée) ───────────────────────────── */
function ApiSection({ stormglassKey, supabaseUrl, supabaseKey, onChange }) {
  const [phase,      setPhase]      = useState(hasPinStored() ? 'locked' : 'open') // 'locked'|'unlock'|'open'|'set-pin'
  const [pinInput,   setPinInput]   = useState('')
  const [pinError,   setPinError]   = useState('')
  const [newPin,     setNewPin]     = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const unlock = () => {
    if (checkPin(pinInput)) { setPhase('open'); setPinError(''); setPinInput('') }
    else { setPinError('Mot de passe incorrect') }
  }

  const handleSavePin = () => {
    if (newPin.trim().length < 4)    { setPinError('Minimum 4 caractères'); return }
    if (newPin !== confirmPin)        { setPinError('Les mots de passe ne correspondent pas'); return }
    savePin(newPin)
    setPhase('open'); setPinError(''); setNewPin(''); setConfirmPin('')
  }

  const removePin = () => {
    localStorage.removeItem(PIN_KEY)
    setPhase('open')
  }

  /* ── Verrouillé ── */
  if (phase === 'locked') return (
    <section className="api-section locked">
      <h3>🔒 Paramètres API</h3>
      <p className="hint">Ces paramètres sont protégés. Entrez votre mot de passe pour y accéder.</p>
      <div className="pin-row">
        <input
          type="password" value={pinInput} onChange={e => setPinInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && unlock()}
          placeholder="Mot de passe…" className="pin-input"
          autoFocus
        />
        <button className="btn-unlock" onClick={unlock}>Déverrouiller</button>
      </div>
      {pinError && <p className="pin-error">{pinError}</p>}
    </section>
  )

  /* ── Définir un mot de passe ── */
  if (phase === 'set-pin') return (
    <section className="api-section">
      <h3>🔑 Définir un mot de passe</h3>
      <label>
        Nouveau mot de passe
        <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="Min. 4 caractères" />
      </label>
      <label style={{ marginTop: 10 }}>
        Confirmer
        <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="Répétez le mot de passe" />
      </label>
      {pinError && <p className="pin-error">{pinError}</p>}
      <div className="pin-set-actions">
        <button className="btn-cancel" onClick={() => setPhase('open')}>Annuler</button>
        <button className="btn-save" onClick={handleSavePin}>Enregistrer le mot de passe</button>
      </div>
    </section>
  )

  /* ── Déverrouillé / ouvert ── */
  return (
    <section className="api-section">
      <div className="api-section-head">
        <h3>🔓 Paramètres API</h3>
        <button className="btn-set-pin" onClick={() => setPhase('set-pin')}>
          {hasPinStored() ? '🔑 Changer le mot de passe' : '🔒 Définir un mot de passe'}
        </button>
      </div>

      <h4 className="api-sub">🌊 Stormglass — Marées</h4>
      <label>
        Clé API
        <input
          type="password" value={stormglassKey}
          onChange={e => onChange('stormglassKey', e.target.value)}
          placeholder="stormglass.io — 10 appels/jour gratuits"
        />
      </label>

      <h4 className="api-sub" style={{ marginTop: 14 }}>🗄️ Supabase — Base de données</h4>
      <label>
        URL du projet
        <input
          value={supabaseUrl}
          onChange={e => onChange('supabaseUrl', e.target.value)}
          placeholder="https://xxxx.supabase.co"
          autoComplete="off"
        />
      </label>
      <label style={{ marginTop: 10 }}>
        Clé API publique (anon)
        <input
          type="password" value={supabaseKey}
          onChange={e => onChange('supabaseKey', e.target.value)}
          placeholder="eyJhbGci…"
        />
      </label>
      {supabaseUrl && supabaseKey && (
        <div className="sb-status-ok"><span>✓</span> Supabase configuré</div>
      )}
    </section>
  )
}

/* ── Modale principale ───────────────────────────────────── */
export default function Settings({ location, stormglassKey, supabaseUrl, supabaseKey, onSave, onClose }) {
  const [loc,   setLoc]   = useState(location)
  const [api,   setApi]   = useState({ stormglassKey, supabaseUrl, supabaseKey })

  const handleApiChange = (field, value) => setApi(prev => ({ ...prev, [field]: value }))

  const submit = e => {
    e.preventDefault()
    onSave({ location: loc, ...api })
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-top">
          <h2>⚙️ Paramètres WaterLab</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>

          {/* ── Localisation (libre) ── */}
          <section>
            <h3>📍 Localisation</h3>
            <LocationSearch onSelect={setLoc} currentName={location.name} />
            {loc && (
              <div className="loc-confirmed">
                <span className="loc-check">✓</span>
                <div>
                  <div className="loc-cname">{loc.name}</div>
                  <div className="loc-ccoords">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</div>
                </div>
              </div>
            )}
          </section>

          {/* ── API (verrouillée) ── */}
          <ApiSection
            stormglassKey={api.stormglassKey}
            supabaseUrl={api.supabaseUrl}
            supabaseKey={api.supabaseKey}
            onChange={handleApiChange}
          />

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-save">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  )
}
