import SunCalc from 'suncalc'

/**
 * Calcule les périodes solunaires du jour.
 * Majeures : lune au zénith ou nadir → meilleures conditions
 * Mineures : lever/coucher de lune → bonnes conditions
 */
export function getSolunarPeriods(date, lat, lng) {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)

  // Échantillonner l'altitude lunaire toutes les 4 minutes
  const samples = []
  for (let min = 0; min <= 1440; min += 4) {
    const t = new Date(dayStart.getTime() + min * 60000)
    const pos = SunCalc.getMoonPosition(t, lat, lng)
    samples.push({ t, alt: pos.altitude })
  }

  const periods = []

  // Détecter les extremums locaux (zénith/nadir)
  for (let i = 3; i < samples.length - 3; i++) {
    const { alt } = samples[i]
    const isMax = samples.slice(i - 3, i).every(s => s.alt <= alt) &&
                  samples.slice(i + 1, i + 4).every(s => s.alt <= alt)
    const isMin = samples.slice(i - 3, i).every(s => s.alt >= alt) &&
                  samples.slice(i + 1, i + 4).every(s => s.alt >= alt)
    if (isMax) periods.push({ time: samples[i].t, type: 'major', label: 'Zénith lunaire', duration: 120 })
    if (isMin) periods.push({ time: samples[i].t, type: 'major', label: 'Nadir lunaire',  duration: 120 })
  }

  // Lever/coucher de lune = périodes mineures
  const mt = SunCalc.getMoonTimes(date, lat, lng)
  if (mt.rise) periods.push({ time: mt.rise, type: 'minor', label: 'Lever de lune', duration: 60 })
  if (mt.set)  periods.push({ time: mt.set,  type: 'minor', label: 'Coucher de lune', duration: 60 })

  return periods
    .filter(p => p.time >= dayStart && p.time < new Date(dayStart.getTime() + 86400000))
    .sort((a, b) => a.time - b.time)
}

export function formatSolunarTime(date) {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Retourne la période active en ce moment (ou null) */
export function getCurrentPeriod(periods) {
  const now = Date.now()
  return periods.find(p => {
    const start = p.time.getTime() - (p.duration / 2) * 60000
    const end   = p.time.getTime() + (p.duration / 2) * 60000
    return now >= start && now <= end
  }) || null
}
