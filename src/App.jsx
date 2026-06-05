import { useState, useMemo } from 'react'
import { SupabaseContext, createSupabaseClient } from './lib/supabase'
import Header from './components/Header'
import Settings from './components/Settings'
import ScoreBanner from './components/ScoreBanner'
import TidePanel from './components/TidePanel'
import MoonPanel from './components/MoonPanel'
import SolunarPanel from './components/SolunarPanel'
import FishingCalendar from './components/FishingCalendar'
import { useTides } from './hooks/useTides'
import { useWeather } from './hooks/useWeather'

const DEFAULT_LOC = { lat: 14.6833, lng: -60.9167, name: 'Le Robert, Martinique' }
const load = (key, fb) => { try { return JSON.parse(localStorage.getItem(key)) || fb } catch { return fb } }

;(function migrateLocation() {
  try {
    const stored = JSON.parse(localStorage.getItem('wl_location'))
    if (stored?.name === 'La Rochelle') localStorage.removeItem('wl_location')
  } catch { /* rien */ }
})()

const ENV_SB_URL = import.meta.env.VITE_SUPABASE_URL      || ''
const ENV_SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const ENV_SG_KEY = import.meta.env.VITE_STORMGLASS_KEY    || ''

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [location, setLocation] = useState(() => load('wl_location', DEFAULT_LOC))
  const [apiKey,   setApiKey]   = useState(() => localStorage.getItem('wl_stormglass_key') || ENV_SG_KEY)
  const [sbUrl,    setSbUrl]    = useState(() => localStorage.getItem('wl_supabase_url')   || ENV_SB_URL)
  const [sbKey,    setSbKey]    = useState(() => localStorage.getItem('wl_supabase_key')   || ENV_SB_KEY)

  const supabase = useMemo(() => createSupabaseClient(sbUrl, sbKey), [sbUrl, sbKey])

  const saveSettings = ({ location: loc, stormglassKey, supabaseUrl, supabaseKey }) => {
    setLocation(loc);         localStorage.setItem('wl_location',       JSON.stringify(loc))
    setApiKey(stormglassKey); localStorage.setItem('wl_stormglass_key', stormglassKey)
    setSbUrl(supabaseUrl);    localStorage.setItem('wl_supabase_url',   supabaseUrl)
    setSbKey(supabaseKey);    localStorage.setItem('wl_supabase_key',   supabaseKey)
    setShowSettings(false)
  }

  const weather = useWeather(location)

  return (
    <SupabaseContext.Provider value={supabase}>
      <div className="app">
        <Header location={location} onSettings={() => setShowSettings(true)} supabaseConnected={!!supabase} />
        <main className="main-content">
          <TidesWrapper location={location} apiKey={apiKey} weather={weather} />
        </main>
        {showSettings && (
          <Settings
            location={location} stormglassKey={apiKey}
            supabaseUrl={sbUrl} supabaseKey={sbKey}
            onSave={saveSettings} onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </SupabaseContext.Provider>
  )
}

function TidesWrapper({ location, apiKey, weather }) {
  const tides = useTides(location, apiKey)
  return (
    <>
      <ScoreBanner tides={tides} weather={weather} />
      <div className="panels-row">
        <MoonPanel location={location} weather={weather} />
        <TidePanel
          data={tides.data} loading={tides.loading} error={tides.error}
          fetchedAt={tides.fetchedAt} source={tides.source}
          refresh={tides.refresh} hasKey={!!apiKey}
        />
        <SolunarPanel location={location} />
      </div>
      <FishingCalendar weather={weather} tides={tides.data} location={location} />
    </>
  )
}
