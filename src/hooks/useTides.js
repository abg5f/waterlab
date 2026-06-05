import { useState, useCallback, useEffect } from 'react'
import { fetchTides } from '../utils/tidesApi'
import { useSupabase, getTideCacheFromDB, saveTideCacheToDB } from '../lib/supabase'

const LS_PREFIX = 'wl_tides_month_v1'
const LS_AUTO_REFRESH = 'wl_tides_auto_refresh_date'

function makeLocKey(loc) { return `${loc.lat.toFixed(3)}_${loc.lng.toFixed(3)}` }

/**
 * Clé mensuelle : location + "YYYY-MM".
 * Les marées étant astronomiques et fixes, on ne les re-télécharge JAMAIS
 * pour le même mois et le même spot.
 */
function monthKey(loc, date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${makeLocKey(loc)}_${date.getFullYear()}-${m}`
}

/* ── localStorage (permanent, pas d'expiry) ──────────────── */
function lsLoad(key) {
  try { return JSON.parse(localStorage.getItem(`${LS_PREFIX}_${key}`)) || null }
  catch { return null }
}
function lsSave(key, data) {
  try { localStorage.setItem(`${LS_PREFIX}_${key}`, JSON.stringify({ data, savedAt: new Date().toISOString() })) }
  catch { /* quota dépassé → silencieux */ }
}

/* ── Supabase : cache_date = 1er du mois ──────────────────── */
async function dbLoad(supabase, locKey, monthStr) {
  if (!supabase) return null
  try {
    const cacheDate = `${monthStr}-01`
    const { data, error } = await supabase
      .from('tide_cache')
      .select('tide_data, fetched_at')
      .eq('location_key', locKey)
      .eq('cache_date', cacheDate)
      .maybeSingle()
    if (error) { console.warn('Supabase tide read:', error.message); return null }
    return data
  } catch { return null }
}
async function dbSave(supabase, locKey, monthStr, tideData) {
  if (!supabase) return
  try {
    const cacheDate = `${monthStr}-01`
    const { error } = await supabase
      .from('tide_cache')
      .upsert({ location_key: locKey, cache_date: cacheDate, tide_data: tideData }, { onConflict: 'location_key,cache_date' })
    if (error) console.warn('Supabase tide write:', error.message)
  } catch { /* non-bloquant */ }
}

/**
 * Vérifie si un refresh automatique est nécessaire (2 fois par mois: 1er et 15)
 */
function shouldAutoRefresh(locKey) {
  const now = new Date()
  const today = now.getDate()
  const lastRefreshStr = localStorage.getItem(`${LS_AUTO_REFRESH}_${locKey}`)
  const lastRefresh = lastRefreshStr ? new Date(lastRefreshStr) : null

  // Auto-refresh aux 1er et 15 du mois
  const refreshDates = [1, 15]
  if (!refreshDates.includes(today)) return false

  // Vérifier qu'on n'a pas déjà fait un refresh aujourd'hui
  if (lastRefresh) {
    const sameDay = lastRefresh.toDateString() === now.toDateString()
    if (sameDay) return false
  }

  return true
}

/**
 * Enregistre la date du dernier auto-refresh
 */
function recordAutoRefresh(locKey) {
  localStorage.setItem(`${LS_AUTO_REFRESH}_${locKey}`, new Date().toISOString())
}

export function useTides(location, apiKey) {
  const supabase  = useSupabase()
  const locKey    = makeLocKey(location)
  const mKey      = monthKey(location)
  const lsCached  = lsLoad(mKey)

  const [state, setState] = useState({
    data:      lsCached?.data  || null,
    loading:   false,
    error:     null,
    fetchedAt: lsCached?.savedAt ? new Date(lsCached.savedAt).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) : null,
    source:    lsCached ? 'cache' : null,
  })

  const refresh = useCallback(async (force = false) => {
    if (!apiKey) return
    setState(s => ({ ...s, loading: true, error: null }))

    const now   = new Date()
    const mStr  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`

    try {
      /* 1. Supabase en priorité (sauf si force=true) */
      if (!force) {
        const dbCache = await dbLoad(supabase, locKey, mStr)
        if (dbCache) {
          const fetchedAt = new Date(dbCache.fetched_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
          lsSave(mKey, dbCache.tide_data)
          setState({ data: dbCache.tide_data, loading: false, error: null, fetchedAt, source: 'supabase' })
          return
        }
      }

      /* 2. Pas en base (ou force=true) → appel Stormglass pour le mois entier + mois suivant */
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      const end   = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59) // dernier jour du mois suivant

      const data = await fetchTides(location.lat, location.lng, apiKey, start, end)

      /* 3. Persister (permanent) dans Supabase + localStorage */
      await dbSave(supabase, locKey, mStr, data)
      lsSave(mKey, data)

      const fetchedAt = now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
      setState({ data, loading: false, error: null, fetchedAt, source: force ? 'stormglass (forced)' : 'stormglass' })
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.message }))
    }
  }, [location.lat, location.lng, apiKey, locKey, mKey, supabase])

  // Auto-refresh 2 fois par mois (1er et 15)
  useEffect(() => {
    if (!apiKey || !shouldAutoRefresh(locKey)) return

    const doAutoRefresh = async () => {
      recordAutoRefresh(locKey)
      // Faire un refresh silencieux (ne pas afficher le loading)
      const now = new Date()
      const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`

      try {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)
        const data = await fetchTides(location.lat, location.lng, apiKey, start, end)
        await dbSave(supabase, locKey, mStr, data)
        lsSave(mKey, data)
        // Mettre à jour l'état silencieusement
        const fetchedAt = now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
        setState(s => ({ ...s, data, fetchedAt, source: 'stormglass' }))
      } catch (e) {
        console.warn('Auto-refresh marées échoué:', e.message)
      }
    }

    doAutoRefresh()
  }, [apiKey, locKey, mKey, location.lat, location.lng, supabase])

  return { ...state, refresh }
}
