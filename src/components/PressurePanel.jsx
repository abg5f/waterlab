import { AreaChart, Area, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts'
import { getHourlyForDate, getPressureTrend } from '../utils/weatherApi'

export default function PressurePanel({ weather }) {
  if (!weather.data) return (
    <div className="panel">
      <div className="panel-label">🌡️ Pression</div>
      <div className="panel-loading">{weather.loading ? 'Chargement…' : '—'}</div>
    </div>
  )

  const today   = new Date()
  const hours   = getHourlyForDate(weather.data, today)
  const trend   = getPressureTrend(weather.data)
  const current = hours.find(h => h.hour === today.getHours())?.pressure

  const chartData = hours.map(h => ({ h: `${h.hour}h`, p: h.pressure ? Math.round(h.pressure) : null }))

  const trendLabel = trend > 1.5  ? { txt: '↗ En hausse', cls: 'trend-up' }
                   : trend < -1.5 ? { txt: '↘ En baisse', cls: 'trend-down' }
                   :                { txt: '→ Stable',    cls: 'trend-stable' }

  const impact = trend > 1.5  ? 'Bonne activité prévue'
               : trend < -1.5 ? 'Poissons en profondeur'
               :                'Conditions normales'

  return (
    <div className="panel">
      <div className="panel-label">🌡️ Pression atmosphérique</div>
      <div className="pressure-value">{current ? `${Math.round(current)} hPa` : '—'}</div>
      <span className={`pressure-trend ${trendLabel.cls}`}>{trendLabel.txt}</span>
      <div className="pressure-impact">{impact}</div>
      <div className="pressure-chart">
        <ResponsiveContainer width="100%" height={60}>
          <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#1e90ff" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#1e90ff" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="p" stroke="#1e90ff" fill="url(#pGrad)" strokeWidth={2} dot={false} />
            <ReferenceLine x={`${today.getHours()}h`} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{ background: '#0d1f3c', border: '1px solid #1e3355', borderRadius: 6, fontSize: 11 }}
              formatter={v => [`${v} hPa`]}
              labelFormatter={l => l}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
