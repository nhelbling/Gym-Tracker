import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { db } from '../lib/db'
import { deleteExercise, getExerciseHistory } from '../lib/queries'
import { formatDate, relativeDate } from '../lib/dateUtils'

export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const exercise = useLiveQuery(() => db.exercises.get(id!), [id])
  const history = useLiveQuery(() => getExerciseHistory(id!), [id])

  if (!exercise || !history) return null

  const chartData = history.map((session) => ({
    date: formatDate(session.date).slice(0, -5),
    maxWeight: session.maxWeight,
  }))
  const bestWeight = history.length ? Math.max(...history.map((s) => s.maxWeight)) : null
  const lastSession = history[history.length - 1]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{exercise.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{exercise.category}</p>
        </div>
        <Link to="/exercises" className="text-sm text-slate-400">
          ← All exercises
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3">
          <p className="text-xl font-semibold">{history.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">sessions</p>
        </div>
        <div className="card p-3">
          <p className="text-xl font-semibold">{bestWeight ?? '–'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">best kg</p>
        </div>
        <div className="card p-3">
          <p className="truncate text-xl font-semibold">
            {lastSession ? relativeDate(lastSession.date) : '–'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">last done</p>
        </div>
      </div>

      {chartData.length >= 2 ? (
        <div className="card">
          <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Top weight per session
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
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
        </div>
      ) : (
        <div className="card text-sm text-slate-500 dark:text-slate-400">
          Log at least two sessions to see the progression chart.
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">History</h3>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...history].reverse().map((session) => (
              <li key={session.date} className="flex items-center justify-between gap-2 py-2 text-sm">
                <Link
                  to={`/log?date=${session.date}`}
                  className="shrink-0 text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
                  title="Edit this day"
                >
                  {formatDate(session.date)}
                </Link>
                <span className="text-right">
                  {session.sets.map((s) => `${s.weight}×${s.reps}`).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        className="btn-danger w-full"
        onClick={async () => {
          if (confirm(`Delete "${exercise.name}" and all its logged sets?`)) {
            await deleteExercise(exercise.id)
            navigate('/exercises')
          }
        }}
      >
        Delete exercise
      </button>
    </div>
  )
}
