import { useState } from 'react'
import { checkPin, savePin, hasPinStored } from '../utils/pin'

export default function AdminPanel({ stormglassKey, supabaseUrl, supabaseKey, onSave, onClose, sessionUnlocked, onSessionUnlock }) {
  const [pinInput,   setPinInput]   = useState('')
  const [pinError,   setPinError]   = useState('')
  const [view,       setView]       = useState(sessionUnlocked ? 'panel' : (hasPinStored() ? 'lock' : 'panel'))

  // Champs API
  const [sgKey, setSgKey] = useState(stormglassKey)
  const [sbUrl, setSbUrl] = useState(supabaseUrl)
  const [sbKey, setSbKey] = useState(supabaseKey)

  // Changer PIN
  const [changingPin, setChangingPin] = useState(false)
  const [newPin,      setNewPin]      = useState('')
  const [confirmPin,  setConfirmPin]  = useState('')
  const [pinMsg,      setPinMsg]      = useState('')

  const unlock = () => {
    if (checkPin(pinInput)) {
      onSessionUnlock()
      setView('panel')
      setPinError('')
    } else {
      setPinError('Mot de passe incorrect')
    }
  }

  const handleSavePin = () => {
    if (newPin.trim().length < 4)   { setPinMsg('Minimum 4 caractères'); return }
    if (newPin !== confirmPin)       { setPinMsg('Les mots de passe ne correspondent pas'); return }
    savePin(newPin)
    setPinMsg('Mot de passe mis à jour ✓')
    setChangingPin(false); setNewPin(''); setConfirmPin('')
  }

  const handleSave = () => {
    onSave({ stormglassKey: sgKey, supabaseUrl: sbUrl, supabaseKey: sbKey })
    onClose()
  }

  /* ── Écran de verrouillage ── */
  if (view === 'lock') return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal admin-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-top">
          <h2>🔐 Administration</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="hint" style={{ marginBottom: 16 }}>Accès réservé. Entrez le mot de passe administrateur.</p>
        <div className="pin-row">
          <input
            className="pin-input" type="password" value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && unlock()}
            placeholder="Mot de passe…" autoFocus
          />
          <button className="btn-unlock" onClick={unlock}>Entrer</button>
        </div>
        {pinError && <p className="pin-error">{pinError}</p>}
      </div>
    </div>
  )

  /* ── Panneau admin déverrouillé ── */
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal admin-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-top">
          <h2>🔓 Administration WaterLab</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <section>
          <h3 className="admin-section-title">🌊 World Tides — Marées</h3>
          <label>
            Clé API
            <input type="password" value={sgKey} onChange={e => setSgKey(e.target.value)} placeholder="Clé World Tides" />
          </label>
          <p className="hint" style={{ marginTop: 8 }}>Gratuit: 5,000 appels/mois | Inscription: worldtides.com</p>
        </section>

        <section style={{ marginTop: 16 }}>
          <h3 className="admin-section-title">🗄️ Supabase — Base de données</h3>
          <label>
            URL du projet
            <input value={sbUrl} onChange={e => setSbUrl(e.target.value)} placeholder="https://xxxx.supabase.co" autoComplete="off" />
          </label>
          <label style={{ marginTop: 10 }}>
            Clé anon
            <input type="password" value={sbKey} onChange={e => setSbKey(e.target.value)} placeholder="eyJhbGci…" />
          </label>
          {sbUrl && sbKey && <div className="sb-status-ok"><span>✓</span> Supabase configuré</div>}
        </section>

        <section style={{ marginTop: 16 }}>
          <h3 className="admin-section-title">🔑 Mot de passe admin</h3>
          {!changingPin ? (
            <button className="btn-set-pin" onClick={() => setChangingPin(true)}>
              Changer le mot de passe
            </button>
          ) : (
            <>
              <label>
                Nouveau mot de passe
                <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="Min. 4 caractères" />
              </label>
              <label style={{ marginTop: 8 }}>
                Confirmer
                <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="Répétez" />
              </label>
              {pinMsg && <p className={pinMsg.includes('✓') ? 'pin-ok' : 'pin-error'}>{pinMsg}</p>}
              <div className="pin-set-actions">
                <button className="btn-cancel" onClick={() => setChangingPin(false)}>Annuler</button>
                <button className="btn-save" onClick={handleSavePin}>Enregistrer</button>
              </div>
            </>
          )}
        </section>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn-cancel" onClick={onClose}>Fermer</button>
          <button className="btn-save" onClick={handleSave}>Enregistrer</button>
        </div>
      </div>
    </div>
  )
}
