import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '../lib/supabase'

const TABLE   = 'favorite_days'
const LS_KEY  = 'wl_favorites_v1'

/* ── localStorage fallback ───────────────────────────── */
function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] }
  catch { return [] }
}
function lsSave(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)) } catch { /* rien */ }
}

export function useFavorites() {
  const supabase = useSupabase()
  const [favorites, setFavorites] = useState(lsLoad)
  const [error,     setError]     = useState(null)

  /* Chargement depuis Supabase au démarrage */
  useEffect(() => {
    if (!supabase) return
    supabase
      .from(TABLE)
      .select('*')
      .order('date', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.warn('useFavorites load:', error.message); return }
        if (data) { setFavorites(data); lsSave(data) }
      })
  }, [supabase])

  /**
   * Upsert avec optimistic update :
   * 1. Mise à jour locale immédiate → jamais d'écran noir
   * 2. Sync Supabase en arrière-plan
   * 3. Si Supabase échoue → on garde l'entrée locale (ls)
   */
  const upsert = useCallback(async (dayData) => {
    setError(null)
    const localEntry = {
      ...dayData,
      id:         dayData.date,          // id temporaire = date string
      created_at: new Date().toISOString(),
    }

    // Mise à jour locale immédiate
    setFavorites(prev => {
      const idx = prev.findIndex(f => f?.date === dayData.date)
      const next = idx >= 0
        ? prev.map((f, i) => i === idx ? localEntry : f)
        : [localEntry, ...prev]
      lsSave(next)
      return next
    })

    if (!supabase) return localEntry

    try {
      const { data, error: sbErr } = await supabase
        .from(TABLE)
        .upsert(dayData, { onConflict: 'date' })
        .select()
        .single()

      if (sbErr) throw sbErr

      // Remplacer l'entrée locale par l'entrée DB (avec vrai UUID)
      setFavorites(prev => {
        const next = prev.map(f => f?.date === dayData.date ? data : f)
        lsSave(next)
        return next
      })
      return data
    } catch (e) {
      console.warn('Supabase upsert échoué, favori conservé localement :', e.message)
      setError(`Sauvegarde DB échouée : ${e.message}`)
      return localEntry
    }
  }, [supabase])

  const remove = useCallback(async (date) => {
    setFavorites(prev => {
      const next = prev.filter(f => f?.date !== date)
      lsSave(next)
      return next
    })
    if (!supabase) return
    try {
      await supabase.from(TABLE).delete().eq('date', date)
    } catch (e) {
      console.warn('Supabase delete échoué :', e.message)
    }
  }, [supabase])

  const isFavorite = useCallback((date) => {
    const d = date instanceof Date ? date.toISOString().split('T')[0] : date
    return favorites.find(f => f?.date === d) || null
  }, [favorites])

  return { favorites, error, upsert, remove, isFavorite }
}
