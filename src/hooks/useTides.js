import { useState, useCallback, useEffect } from 'react'
import { fetchTides } from '../utils/tidesApi'
import { useSupabase, getTideCacheFromDB, saveTideCacheToDB } from '../lib/supabase'

const LS_PREFIX = 'wl_tides_month_v1'
const LS_WEEKLY_REFRESH = 'wl_tides_weekly_refresh_date'
const LS_DAILY_CALLS = 'wl_tides_daily_calls' // Compteur d'appels du jour

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
 * Vérifie si un refresh hebdomadaire est nécessaire (dimanche)
 */
function shouldWeeklyRefresh(locKey) {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = dimanche, 6 = samedi
  if (dayOfWeek !== 0) return false // Pas dimanche

  const lastRefreshStr = localStorage.getItem(`${LS_WEEKLY_REFRESH}_${locKey}`)
  if (!lastRefreshStr) return true

  const lastRefresh = new Date(lastRefreshStr)
  const sameWeek = lastRefresh.getTime() > (now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return !sameWeek
}

/**
 * Enregistre la date du dernier refresh hebdomadaire
 */
function recordWeeklyRefresh(locKey) {
  localStorage.setItem(`${LS_WEEKLY_REFRESH}_${locKey}`, new Date().toISOString())
}

/**
 * Compte les appels API du jour
 */
function incrementDailyCallCount() {
  const today = new Date().toISOString().split('T')[0]
  const stored = localStorage.getItem(LS_DAILY_CALLS)
  let data = stored ? JSON.parse(stored) : { date: today, count: 0 }

  // Reset si c'est un nouveau jour
  if (data.date !== today) {
    data = { date: today, count: 0 }
  }

  data.count += 1
  localStorage.setItem(LS_DAILY_CALLS, JSON.stringify(data))
  return data.count
}

/**
 * Retourne les appels restants du jour (10 max par jour gratuit)
 */
function getDailyCallsRemaining() {
  const today = new Date().toISOString().split('T')[0]
  const stored = localStorage.getItem(LS_DAILY_CALLS)
  let data = stored ? JSON.parse(stored) : { date: today, count: 0 }

  // Reset si c'est un nouveau jour
  if (data.date !== today) {
    return 10
  }

  return Math.max(0, 10 - data.count)
}

export function useTides(location, apiKey) {
  const supabase  = useSupabase()
  const locKey    = makeLocKey(location)
  const mKey      = monthKey(location)
  const lsCached  = lsLoad(mKey)

  const [state, setState] = useState({
    data:           lsCached?.data  || null,
    loading:        false,
    error:          null,
    fetchedAt:      lsCached?.savedAt ? new Date(lsCached.savedAt).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) : null,
    source:         lsCached ? 'cache' : null,
    callsRemaining: getDailyCallsRemaining(),
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
      // Aussi sauvegarder pour le mois suivant (pour accès cohérent en fin de mois)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const nextMKey = monthKey(location, nextMonth)
      const nextMStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2,'0')}`
      lsSave(nextMKey, data)
      await dbSave(supabase, locKey, nextMStr, data)

      // Incrémenter le compteur d'appels
      const callCount = incrementDailyCallCount()
      const remaining = getDailyCallsRemaining()

      const fetchedAt = now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
      setState({ data, loading: false, error: null, fetchedAt, source: force ? 'stormglass (forced)' : 'stormglass', callsRemaining: remaining })
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.message }))
    }
  }, [location.lat, location.lng, apiKey, locKey, mKey, supabase])

  // Retourner aussi la fonction pour incrementer les appels
  const refreshWithTracking = useCallback(async (force = false) => {
    const result = await refresh(force)
    return { ...result, callsRemaining: getDailyCallsRemaining() }
  }, [refresh])

  // Charger les données au démarrage ou quand la clé change
  useEffect(() => {
    if (!apiKey) return
    // Charger au démarrage si pas de données
    if (!lsCached) {
      refresh()
    }
  }, [apiKey, locKey]) // Dépendances: quand la clé change ou la localisation

  // Auto-refresh hebdomadaire (dimanche seulement)
  useEffect(() => {
    if (!apiKey || !shouldWeeklyRefresh(locKey)) return

    const doWeeklyRefresh = async () => {
      recordWeeklyRefresh(locKey)
      // Faire un refresh silencieux (ne pas afficher le loading)
      const now = new Date()
      const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`

      try {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)
        const data = await fetchTides(location.lat, location.lng, apiKey, start, end)

        // Incrémenter le compteur d'appels
        incrementDailyCallCount()

        await dbSave(supabase, locKey, mStr, data)
        lsSave(mKey, data)
        // Aussi sauvegarder pour le mois suivant
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        const nextMKey = monthKey(location, nextMonth)
        const nextMStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2,'0')}`
        lsSave(nextMKey, data)
        await dbSave(supabase, locKey, nextMStr, data)
        // Mettre à jour l'état silencieusement
        const fetchedAt = now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })
        setState(s => ({ ...s, data, fetchedAt, source: 'stormglass', callsRemaining: getDailyCallsRemaining() }))
      } catch (e) {
        console.warn('Refresh hebdomadaire marées échoué:', e.message)
      }
    }

    doWeeklyRefresh()
  }, [apiKey, locKey, mKey, location.lat, location.lng, supabase])

  return { ...state, refresh, callsRemaining: state.callsRemaining }
}
