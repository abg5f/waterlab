import { createContext, useContext } from 'react'
import { createClient } from '@supabase/supabase-js'

export const SupabaseContext = createContext(null)
export const useSupabase = () => useContext(SupabaseContext)

export function createSupabaseClient(url, key) {
  if (!url?.trim() || !key?.trim()) return null
  try {
    return createClient(url.trim(), key.trim())
  } catch {
    return null
  }
}

/* ── Tide cache ──────────────────────────────────────────
   Table: tide_cache (location_key TEXT, cache_date DATE, tide_data JSONB)
   Un seul appel Stormglass par jour par spot, partagé entre tous les appareils.
──────────────────────────────────────────────────────── */

export async function getTideCacheFromDB(supabase, locationKey, dateStr) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('tide_cache')
      .select('tide_data, fetched_at')
      .eq('location_key', locationKey)
      .eq('cache_date', dateStr)
      .maybeSingle()
    if (error) { console.warn('Supabase read:', error.message); return null }
    return data
  } catch { return null }
}

export async function saveTideCacheToDB(supabase, locationKey, dateStr, tideData) {
  if (!supabase) return
  try {
    const { error } = await supabase
      .from('tide_cache')
      .upsert(
        { location_key: locationKey, cache_date: dateStr, tide_data: tideData },
        { onConflict: 'location_key,cache_date' }
      )
    if (error) console.warn('Supabase write:', error.message)
  } catch { /* non-bloquant */ }
}

/* ── Spots (lieux favoris) ───────────────────────────── */

export async function getSpotsFromDB(supabase) {
  if (!supabase) return []
  try {
    const { data, error } = await supabase.from('spots').select('*').order('created_at', { ascending: true })
    if (error) { console.warn('Supabase spots read:', error.message); return [] }
    return data || []
  } catch { return [] }
}

export async function saveSpotToDB(supabase, spot) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from('spots').insert(spot).select().single()
    if (error) { console.warn('Supabase spot insert:', error.message); return null }
    return data
  } catch { return null }
}

export async function deleteSpotFromDB(supabase, id) {
  if (!supabase) return
  try {
    await supabase.from('spots').delete().eq('id', id)
  } catch { /* non-bloquant */ }
}

/* ── Photos de session (Supabase Storage) ──────────────
   Bucket : session-photos (public en lecture)
   Chemin : {date}/{timestamp}-{rand}.jpg
   Stocké dans favorite_days.photos (jsonb) → [{ url, path }]
──────────────────────────────────────────────────────── */

const PHOTOS_BUCKET = 'session-photos'

export async function uploadSessionPhoto(supabase, dateStr, blob) {
  if (!supabase) return null
  try {
    const path = `${dateStr}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    })
    if (error) { console.warn('Supabase photo upload:', error.message); return null }
    const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path)
    return { url: data.publicUrl, path }
  } catch (e) {
    console.warn('Photo upload échoué :', e.message)
    return null
  }
}

export async function deleteSessionPhoto(supabase, path) {
  if (!supabase || !path) return
  try { await supabase.storage.from(PHOTOS_BUCKET).remove([path]) }
  catch { /* non-bloquant */ }
}
