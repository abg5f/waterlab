import { useState, useEffect, useRef } from 'react'

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

  const getType = item =>
    ({ city:'Ville', town:'Ville', village:'Village', harbour:'Port', bay:'Baie', beach:'Plage' })[item.type || item.class] || ''

  return (
    <div className="loc-search" ref={wrapper}>
      <label>
        Rechercher un lieu
        <div className="loc-input-wrap">
          <input
            value={query}
            onChange={e => search(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder="Ville, port, spot…"
            autoComplete="off"
            autoFocus
          />
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

export default function LocationModal({ location, onSave, onClose }) {
  const [selected, setSelected] = useState(location)

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-top">
          <h2>📍 Localisation</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <LocationSearch onSelect={setSelected} currentName={location.name} />
        {selected && selected.name !== location.name && (
          <div className="loc-confirmed">
            <span className="loc-check">✓</span>
            <div>
              <div className="loc-cname">{selected.name}</div>
              <div className="loc-ccoords">{selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</div>
            </div>
          </div>
        )}
        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={() => { onSave(selected); onClose() }}>
            Valider
          </button>
        </div>
      </div>
    </div>
  )
}
