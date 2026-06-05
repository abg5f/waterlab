import { useState, useEffect } from 'react'
import { fetchWeather } from '../utils/weatherApi'

export function useWeather(location) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    setState({ data: null, loading: true, error: null })
    fetchWeather(location.lat, location.lng)
      .then(data => setState({ data, loading: false, error: null }))
      .catch(e  => setState({ data: null, loading: false, error: e.message }))
  }, [location.lat, location.lng])

  return state
}
