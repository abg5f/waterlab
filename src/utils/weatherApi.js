export async function fetchWeather(lat, lng) {
  const url = [
    'https://api.open-meteo.com/v1/forecast',
    `?latitude=${lat}&longitude=${lng}`,
    '&hourly=wind_speed_10m,wind_direction_10m,surface_pressure,precipitation,temperature_2m',
    '&daily=wind_speed_10m_max,precipitation_sum,surface_pressure_mean,sunrise,sunset',
    '&wind_speed_unit=kn&timezone=auto&forecast_days=16',
  ].join('')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Météo: ${res.status}`)
  return res.json()
}

export function getHourlyForDate(data, date) {
  const prefix = date.toISOString().split('T')[0]
  const hours = []
  data.hourly.time.forEach((t, i) => {
    if (!t.startsWith(prefix)) return
    hours.push({
      hour: new Date(t).getHours(),
      pressure: data.hourly.surface_pressure[i],
      wind: data.hourly.wind_speed_10m[i],
      rain: data.hourly.precipitation[i],
      temp: data.hourly.temperature_2m[i],
    })
  })
  return hours
}

export function getPressureTrend(data) {
  const now = new Date()
  const prefix = now.toISOString().split('T')[0]
  const pressures = []
  data.hourly.time.forEach((t, i) => {
    if (t.startsWith(prefix)) pressures.push(data.hourly.surface_pressure[i])
  })
  if (pressures.length < 4) return 0
  return (pressures[pressures.length - 1] - pressures[0]) / pressures.length
}

export function getDailyForDate(data, date) {
  const dateStr = date.toISOString().split('T')[0]
  const idx = data.daily.time.indexOf(dateStr)
  if (idx < 0) return null
  return {
    windMax: data.daily.wind_speed_10m_max[idx],
    rain: data.daily.precipitation_sum[idx],
    pressure: data.daily.surface_pressure_mean?.[idx],
    pressurePrev: idx > 0 ? data.daily.surface_pressure_mean?.[idx - 1] : null,
    sunrise: data.daily.sunrise?.[idx],
    sunset: data.daily.sunset?.[idx],
  }
}
