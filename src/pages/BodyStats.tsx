import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { deleteBodyMetric, getBodyMetrics, logBodyWeight } from '../lib/queries'
import { formatDate, todayIso } from '../lib/dateUtils'

export default function BodyStats() {
  const metrics = useLiveQuery(getBodyMetrics)
  const [date, setDate] = useState(todayIso())
  const [weight, setWeight] = useState('')

  async function add() {
    const kg = parseFloat(weight.replace(',', '.'))
    if (Number.isNaN(kg) || kg <= 0) return
    await logBodyWeight(date, kg)
    setWeight('')
  }

  const chartData = (metrics ?? []).map((m) => ({
    date: formatDate(m.date).slice(0, -5),
    weightKg: m.weightKg,
  }))

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <label className="label" htmlFor="body-weight">
          Log body weight
        </label>
        <div className="flex gap-2">
          <input
            type="date"
            className="input w-auto"
            value={date}
            max={todayIso()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <input
            id="body-weight"
            className="input flex-1"
            placeholder="kg"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button className="btn-primary" onClick={add} disabled={!weight.trim()}>
            Save
          </button>
        </div>
      </div>

      {chartData.length >= 2 ? (
        <div className="card">
          <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Body weight over time
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit=" kg" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="weightKg"
                name="kg"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="card text-sm text-slate-500 dark:text-slate-400">
          Log your weight on at least two days to see the trend.
        </div>
      )}

      {(metrics?.length ?? 0) > 0 && (
        <div className="card">
          <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Entries</h3>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...(metrics ?? [])].reverse().map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400">{formatDate(m.date)}</span>
                <span className="flex items-center gap-2">
                  <strong>{m.weightKg} kg</strong>
                  <button
                    aria-label="Delete entry"
                    className="px-1 text-slate-400 hover:text-red-500"
                    onClick={() => {
                      if (confirm(`Delete entry ${formatDate(m.date)} (${m.weightKg} kg)?`)) {
                        deleteBodyMetric(m.id)
                      }
                    }}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
