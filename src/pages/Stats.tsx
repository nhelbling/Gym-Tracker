import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  getExerciseHistory,
  getExercisesWithStats,
  getMonthlyVisits,
  getVisitStats,
  getWeeklyVisits,
  getYearlyVisits,
} from '../lib/queries'
import { formatDate } from '../lib/dateUtils'

type Period = 'week' | 'month' | 'year'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Weeks' },
  { key: 'month', label: 'Months' },
  { key: 'year', label: 'Years' },
]

export default function Stats() {
  const [period, setPeriod] = useState<Period>('week')
  const [exerciseId, setExerciseId] = useState('')
  const stats = useLiveQuery(getVisitStats)
  const data = useLiveQuery(() => {
    if (period === 'week') return getWeeklyVisits()
    if (period === 'month') return getMonthlyVisits()
    return getYearlyVisits()
  }, [period])
  const exercises = useLiveQuery(getExercisesWithStats)
  const history = useLiveQuery(
    () => (exerciseId ? getExerciseHistory(exerciseId) : Promise.resolve(null)),
    [exerciseId],
  )

  const exerciseChart = (history ?? []).map((session) => ({
    date: formatDate(session.date).slice(0, -5),
    maxWeight: session.maxWeight,
  }))
  const bestWeight = history?.length ? Math.max(...history.map((s) => s.maxWeight)) : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3">
          <p className="text-xl font-semibold">{stats?.thisWeek ?? '–'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">this week</p>
        </div>
        <div className="card p-3">
          <p className="text-xl font-semibold">{stats?.thisMonth ?? '–'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">this month</p>
        </div>
        <div className="card p-3">
          <p className="text-xl font-semibold">{stats?.thisYear ?? '–'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">this year</p>
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Gym visits</h3>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  period === key
                    ? 'bg-white shadow-sm dark:bg-slate-700'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                onClick={() => setPeriod(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data ?? []} margin={{ top: 5, right: 10, bottom: 0, left: -25 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip cursor={{ fillOpacity: 0.1 }} />
            <Bar
              dataKey="visits"
              name="visits"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">
            Exercise progress
          </h3>
          <select
            className="input w-auto max-w-[60%] py-1 text-sm"
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
          >
            <option value="">Choose exercise…</option>
            {exercises?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        {!exerciseId ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pick an exercise to see its weight progression.
          </p>
        ) : exerciseChart.length < 2 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Not enough sessions yet — log this exercise at least twice.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={exerciseChart} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="maxWeight"
                  name="kg"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>
                {history?.length} sessions · best <strong>{bestWeight} kg</strong>
              </span>
              <Link to={`/exercises/${exerciseId}`} className="text-indigo-600 dark:text-indigo-400">
                Full details →
              </Link>
            </div>
          </>
        )}
      </div>

      <p className="text-center text-sm text-slate-400">
        {stats?.total ?? 0} gym visits logged in total
      </p>
    </div>
  )
}
