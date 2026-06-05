export default function Header({ location, onSettings, supabaseConnected }) {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="header-logo">🎣</span>
        <div>
          <div className="header-title">WaterLab</div>
          <div className="header-date">{today}</div>
        </div>
      </div>
      <div className="header-right">
        {supabaseConnected && (
          <span className="sb-badge" title="Supabase connecté — cache marées partagé">
            <span className="sb-dot" />DB
          </span>
        )}
        <button className="header-location" onClick={onSettings}>
          <span>📍</span>
          <span className="location-name">{location.name}</span>
          <span className="settings-icon">⚙️</span>
        </button>
      </div>
    </header>
  )
}
