export async function fetchTides(lat, lng, apiKey, start, end) {
  // Open-Meteo Maritime API: Gratuit, mondial, pas de clé requise
  // Récupère les prédictions de marées
  const startDate = start.toISOString().split('T')[0]
  const endDate = end.toISOString().split('T')[0]

  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&tidal_predictions=true&start_date=${startDate}&end_date=${endDate}&timezone=auto`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`MarineAPI: ${res.status}`)
  const json = await res.json()

  if (!json.tidal_predictions || !json.tidal_predictions.tidal_height_predictions) {
    return [] // Pas de données de marées disponibles
  }

  const predictions = json.tidal_predictions.tidal_height_predictions
  const times = json.tidal_predictions.time

  // Transformer en format attendu (identifier les hauts et bas)
  const tides = []
  for (let i = 0; i < predictions.length; i++) {
    const prev = i > 0 ? predictions[i - 1] : null
    const curr = predictions[i]
    const next = i < predictions.length - 1 ? predictions[i + 1] : null

    if (prev && next) {
      // Déterminer si c'est un haut ou bas
      if (curr > prev && curr > next) {
        tides.push({
          time: new Date(times[i] + 'Z').toISOString(),
          type: 'high',
          height: curr
        })
      } else if (curr < prev && curr < next) {
        tides.push({
          time: new Date(times[i] + 'Z').toISOString(),
          type: 'low',
          height: curr
        })
      }
    }
  }

  return tides
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
