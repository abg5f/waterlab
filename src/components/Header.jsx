import { useRef } from 'react'
import BurgerMenu from './BurgerMenu'

export default function Header({ location, onLocationEdit, onAdminAccess, onHowItWorks, supabaseConnected, adminUnlocked }) {
  const tapCount = useRef(0)
  const tapTimer = useRef(null)

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  // 5 taps rapides sur le logo = accès admin
  const handleLogoTap = () => {
    tapCount.current += 1
    clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 2000)
    if (tapCount.current >= 5) {
      tapCount.current = 0
      onAdminAccess()
    }
  }

  return (
    <header className="app-header">
      <div className="header-left">
        <BurgerMenu
          items={[
            { label: 'Comment ça marche', icon: '💡', onClick: onHowItWorks },
            { label: 'Paramètres', icon: '⚙️', onClick: onAdminAccess },
          ]}
        />
        <div className="header-brand" onClick={handleLogoTap} style={{ cursor: 'default', userSelect: 'none' }}>
          <span className="header-logo">🎣</span>
          <div>
            <div className="header-title">
              WaterLab
              {adminUnlocked && <span className="admin-dot" title="Mode admin actif" />}
            </div>
            <div className="header-date">{today}</div>
          </div>
        </div>
      </div>

      <div className="header-right">
        {supabaseConnected && (
          <span className="sb-badge" title="Supabase connecté">
            <span className="sb-dot" />DB
          </span>
        )}
        <button className="header-location" onClick={onLocationEdit}>
          <span>📍</span>
          <span className="location-name">{location.name}</span>
          <span style={{ fontSize: 11, opacity: 0.5 }}>✏️</span>
        </button>
      </div>
    </header>
  )
}
