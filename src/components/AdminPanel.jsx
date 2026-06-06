import { useState } from 'react'
import { checkPin, savePin } from '../utils/pin'

export default function AdminPanel({ stormglassKey, supabaseUrl, supabaseKey, onSave, onClose, sessionUnlocked, onSessionUnlock, tidesRefresh, callsRemaining }) {
  const [pinInput,   setPinInput]   = useState('')
  const [pinError,   setPinError]   = useState('')
  // Espace toujours protégé : on exige le mot de passe (défaut 0000) à chaque
  // ouverture, sauf s'il a déjà été déverrouillé pendant la session.
  const [view,       setView]       = useState(sessionUnlocked ? 'panel' : 'lock')

  // Champs API
  const [sgKey, setSgKey] = useState(stormglassKey)
  const [sbUrl, setSbUrl] = useState(supabaseUrl)
  const [sbKey, setSbKey] = useState(supabaseKey)

  // Changer PIN
  const [changingPin, setChangingPin] = useState(false)
  const [newPin,      setNewPin]      = useState('')
  const [confirmPin,  setConfirmPin]  = useState('')
  const [pinMsg,      setPinMsg]      = useState('')

  // Refresh marées
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')

  const refreshErrorMsg = (msg) => {
    if (!msg) return 'Échec du rafraîchissement'
    if (msg.includes('402')) return 'Quota dépassé (10 appels/jour). Réessayez demain.'
    if (msg.includes('401') || msg.includes('403')) return 'Clé API invalide ou expirée.'
    if (msg.includes('429')) return 'Trop de requêtes. Réessayez dans quelques minutes.'
    return msg
  }

  const handleRefreshTides = async () => {
    if (!tidesRefresh) return
    setRefreshing(true)
    setRefreshMsg('')
    try {
      const result = await tidesRefresh(true) // force = true pour ignorer le cache
      if (result?.ok) {
        setRefreshMsg('✓ Marées mises à jour !')
        setTimeout(() => setRefreshMsg(''), 4000)
      } else {
        setRefreshMsg(`✗ ${refreshErrorMsg(result?.error)}`)
      }
    } catch (e) {
      setRefreshMsg(`✗ ${refreshErrorMsg(e?.message)}`)
    } finally {
      setRefreshing(false)
    }
  }


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
          <h3 className="admin-section-title">🌊 Stormglass — Marées</h3>
          <label>
            Clé API
            <input type="password" value={sgKey} onChange={e => setSgKey(e.target.value)} placeholder="Clé Stormglass" />
          </label>
          <p className="hint" style={{ marginTop: 8 }}>Gratuit: 10 appels/jour | Refresh auto dimanche | Données en cache local</p>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #ccc' }}>
            <h4 style={{ marginBottom: 12 }}>Quota API aujourd'hui</h4>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: callsRemaining === 0 ? '#d32f2f' : '#2e7d32' }}>
                {callsRemaining || 0}/10
              </div>
              <span style={{ fontSize: 12, color: '#666' }}>
                {callsRemaining === 0 ? '❌ Quota épuisé' : `✓ ${callsRemaining} appel${callsRemaining !== 1 ? 's' : ''} restant${callsRemaining !== 1 ? 's' : ''}`}
              </span>
            </div>

            <button
              className="btn-save"
              onClick={handleRefreshTides}
              disabled={refreshing || !tidesRefresh}
              style={{
                marginTop: 12,
                opacity: refreshing || !tidesRefresh ? 0.6 : 1,
                cursor: refreshing || !tidesRefresh ? 'not-allowed' : 'pointer',
              }}
            >
              {refreshing ? '⟳ Rafraîchissement…' : '↻ Rafraîchir maintenant'}
            </button>

            {refreshMsg && (
              <p style={{
                marginTop: 8,
                fontSize: 12,
                color: refreshMsg.includes('✓') ? '#2e7d32' : '#d32f2f'
              }}>
                {refreshMsg}
              </p>
            )}
          </div>
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
