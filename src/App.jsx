import { useState, useMemo, useEffect } from 'react'
import { SupabaseContext, createSupabaseClient } from './lib/supabase'
import Header from './components/Header'
import LocationModal from './components/LocationModal'
import AdminPanel from './components/AdminPanel'
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
  const [showLocation, setShowLocation] = useState(false)
  const [showAdmin,    setShowAdmin]    = useState(false)
  const [adminUnlocked, setAdminUnlocked] = useState(false) // session-level

  const [location, setLocation] = useState(() => load('wl_location', DEFAULT_LOC))
  const [apiKey,   setApiKey]   = useState(() => localStorage.getItem('wl_stormglass_key') || ENV_SG_KEY)
  const [sbUrl,    setSbUrl]    = useState(() => localStorage.getItem('wl_supabase_url')   || ENV_SB_URL)
  const [sbKey,    setSbKey]    = useState(() => localStorage.getItem('wl_supabase_key')   || ENV_SB_KEY)

  const supabase = useMemo(() => createSupabaseClient(sbUrl, sbKey), [sbUrl, sbKey])

  const saveLocation = (loc) => {
    setLocation(loc)
    localStorage.setItem('wl_location', JSON.stringify(loc))
  }

  const saveAdmin = ({ stormglassKey, supabaseUrl, supabaseKey }) => {
    setApiKey(stormglassKey);  localStorage.setItem('wl_stormglass_key', stormglassKey)
    setSbUrl(supabaseUrl);     localStorage.setItem('wl_supabase_url',   supabaseUrl)
    setSbKey(supabaseKey);     localStorage.setItem('wl_supabase_key',   supabaseKey)
  }

  const weather = useWeather(location)

  return (
    <SupabaseContext.Provider value={supabase}>
      <div className="app">
        <Header
          location={location}
          onLocationEdit={() => setShowLocation(true)}
          onAdminAccess={() => setShowAdmin(true)}
          supabaseConnected={!!supabase}
          adminUnlocked={adminUnlocked}
        />

        <main className="main-content">
          <TidesWrapper location={location} apiKey={apiKey} weather={weather} />
        </main>

        {showLocation && (
          <LocationModal
            location={location}
            onSave={saveLocation}
            onClose={() => setShowLocation(false)}
          />
        )}

        {showAdmin && (
          <AdminPanel
            stormglassKey={apiKey}
            supabaseUrl={sbUrl}
            supabaseKey={sbKey}
            sessionUnlocked={adminUnlocked}
            onSessionUnlock={() => setAdminUnlocked(true)}
            onSave={saveAdmin}
            onClose={() => setShowAdmin(false)}
          />
        )}
      </div>
    </SupabaseContext.Provider>
  )
}

function TidesWrapper({ location, apiKey, weather }) {
  const tides = useTides(location, apiKey)
  const [selectedDate, setSelectedDate] = useState(null) // null = aujourd'hui

  return (
    <>
      <ScoreBanner tides={tides} weather={weather} />
      <div className="panels-row">
        <MoonPanel location={location} weather={weather} selectedDate={selectedDate} />
        <TidePanel
          data={tides.data} loading={tides.loading} error={tides.error}
          hasKey={!!apiKey}
          selectedDate={selectedDate}
        />
        <SolunarPanel location={location} />
      </div>
      <FishingCalendar
        weather={weather} tides={tides.data} location={location}
        onDateSelect={setSelectedDate}
      />
    </>
  )
}
