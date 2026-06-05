import { useState, useCallback } from 'react'
import { fetchTides } from '../utils/tidesApi'
import { useSupabase, getTideCacheFromDB, saveTideCacheToDB } from '../lib/supabase'

const LS_KEY = 'wl_tides_v1'

function todayStr() { return new Date().toISOString().split('T')[0] }
function makeLocKey(location) { return `${location.lat.toFixed(3)}_${location.lng.toFixed(3)}` }

function lsLoad(key) {
  try {
    const c = JSON.parse(localStorage.getItem(`${LS_KEY}_${key}`))
    return c?.date === todayStr() ? c : null
  } catch { return null }
}
function lsSave(key, data, fetchedAt) {
  localStorage.setItem(`${LS_KEY}_${key}`, JSON.stringify({ date: todayStr(), data, fetchedAt }))
}

export function useTides(location, apiKey) {
  const supabase = useSupabase()
  const key = makeLocKey(location)
  const cached = lsLoad(key)

  const [state, setState] = useState({
    data:      cached?.data      || null,
    loading:   false,
    error:     null,
    fetchedAt: cached?.fetchedAt || null,
    source:    cached ? 'cache' : null,
  })

  const refresh = useCallback(async () => {
    if (!apiKey) return
    setState(s => ({ ...s, loading: true, error: null }))

    const date = todayStr()

    try {
      /* 1. Supabase en priorité — cache partagé entre tous les appareils */
      if (supabase) {
        const dbCache = await getTideCacheFromDB(supabase, key, date)
        if (dbCache) {
          const fetchedAt = new Date(dbCache.fetched_at)
            .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          lsSave(key, dbCache.tide_data, fetchedAt)
          setState({ data: dbCache.tide_data, loading: false, error: null, fetchedAt, source: 'supabase' })
          return
        }
      }

      /* 2. Pas en base → appel Stormglass (compte dans les 10/jour) */
      const start = new Date(); start.setHours(0, 0, 0, 0)
      const end   = new Date(); end.setDate(end.getDate() + 9); end.setHours(23, 59, 59, 999)
      const data  = await fetchTides(location.lat, location.lng, apiKey, start, end)

      /* 3. Persister dans Supabase + localStorage */
      await saveTideCacheToDB(supabase, key, date, data)
      const fetchedAt = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      lsSave(key, data, fetchedAt)

      setState({ data, loading: false, error: null, fetchedAt, source: 'stormglass' })
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.message }))
    }
  }, [location.lat, location.lng, apiKey, key, supabase])

  return { ...state, refresh }
}
