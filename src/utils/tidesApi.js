export async function fetchTides(lat, lng, apiKey, start, end) {
  const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lng}&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
  const res = await fetch(url, { headers: { Authorization: apiKey } })
  if (!res.ok) throw new Error(`Stormglass: ${res.status}`)
  const json = await res.json()
  return json.data || []
}

export function getTidesForDate(tides, date) {
  const dateStr = date.toISOString().split('T')[0]
  return tides.filter(t => t.time.startsWith(dateStr))
}

export function formatTime(isoTime) {
  return new Date(isoTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function calculateCoefficients(tides) {
  if (!tides || tides.length < 2) return []
  const pairs = []
  for (let i = 0; i < tides.length; i++) {
    if (tides[i].type !== 'high' || tides[i].height == null) continue
    const neighbors = [tides[i - 1], tides[i + 1]].filter(t => t?.type === 'low' && t.height != null)
    if (!neighbors.length) continue
    const loMean = neighbors.reduce((a, b) => a + b.height, 0) / neighbors.length
    pairs.push({ time: tides[i].time, range: tides[i].height - loMean })
  }
  if (!pairs.length) return []
  const maxRange = Math.max(...pairs.map(p => p.range))
  const ref = maxRange / 0.93
  return pairs.map(({ time, range }) => ({
    time,
    coeff: Math.max(20, Math.min(120, Math.round(20 + (range / ref) * 100))),
  }))
}

export function getCoefficientForDate(coeffs, date) {
  const dateStr = date.toISOString().split('T')[0]
  const day = coeffs.filter(c => c.time.startsWith(dateStr))
  if (!day.length) return null
  return Math.max(...day.map(c => c.coeff))
}

export function coeffLabel(c) {
  if (c >= 95) return 'Grande vive-eau'
  if (c >= 70) return 'Vive-eau'
  if (c >= 45) return 'Moyenne'
  return 'Morte-eau'
}

export function coeffClass(c) {
  if (c >= 95) return 'coeff-extreme'
  if (c >= 70) return 'coeff-spring'
  if (c >= 45) return 'coeff-medium'
  return 'coeff-neap'
}
