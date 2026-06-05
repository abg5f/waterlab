export async function fetchTides(lat, lng, apiKey, start, end) {
  // World Tides API v3: https://www.worldtides.info/api/v3
  // Duration en secondes = nombre de secondes à partir du timestamp start
  const duration = Math.ceil((end - start) / 1000)
  const startTimestamp = Math.floor(start.getTime() / 1000)

  const url = `https://www.worldtides.info/api/v3/predictions?lon=${lng}&lat=${lat}&key=${apiKey}&start=${startTimestamp}&length=${duration}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`WorldTides: ${res.status}`)
  const json = await res.json()

  if (!json.tides) throw new Error('WorldTides: Invalid response')

  // Transformer le format WorldTides au format attendu
  return json.tides.map(tide => ({
    time: new Date(tide.pt * 1000).toISOString(),
    type: tide.type === 'High Water' ? 'high' : 'low',
    height: tide.height
  }))
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
