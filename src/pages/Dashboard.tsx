import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getExercisesWithStats, getLastWorkoutSummary, getVisitStats } from '../lib/queries'
import { daysSince, relativeDate } from '../lib/dateUtils'
import { daysSinceBackup } from '../lib/backup'

export default function Dashboard() {
  const stats = useLiveQuery(getVisitStats)
  const lastWorkout = useLiveQuery(getLastWorkoutSummary)
  const exercises = useLiveQuery(getExercisesWithStats)

  const neglected = (exercises ?? [])
    .filter((e) => e.lastDate !== null && daysSince(e.lastDate) >= 7)
    .sort((a, b) => a.lastDate!.localeCompare(b.lastDate!))
    .slice(0, 3)

  const backupDays = daysSinceBackup()
  const needsBackup = (stats?.total ?? 0) > 0 && (backupDays === null || backupDays > 14)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-3xl font-semibold">{stats?.thisWeek ?? '–'}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">visits this week</p>
        </div>
        <div className="card">
          <p className="text-3xl font-semibold">{stats?.thisMonth ?? '–'}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">visits this month</p>
        </div>
      </div>

      <Link to="/log" className="btn-primary block w-full py-3 text-center text-base">
        Log workout
      </Link>

      {needsBackup && (
        <Link to="/settings" className="card block border-amber-300 dark:border-amber-800">
          <p className="text-sm">
            <strong>Backup reminder:</strong>{' '}
            {backupDays === null
              ? 'you have never exported a backup.'
              : `last backup was ${backupDays} days ago.`}{' '}
            Your data only lives on this device.
          </p>
        </Link>
      )}

      {lastWorkout && (
        <div className="card">
          <h3 className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Last workout · {relativeDate(lastWorkout.date)}
          </h3>
          <p className="text-sm">
            {lastWorkout.exerciseNames.join(', ')}{' '}
            <span className="text-slate-400">({lastWorkout.totalSets} sets)</span>
          </p>
        </div>
      )}

      {neglected.length > 0 && (
        <div className="card">
          <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Not done in a while
          </h3>
          <ul className="space-y-1.5">
            {neglected.map((e) => (
              <li key={e.id} className="flex justify-between text-sm">
                <Link to={`/exercises/${e.id}`}>{e.name}</Link>
                <span className="text-slate-400">{daysSince(e.lastDate!)} days</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats?.total === 0 && (
        <div className="card text-sm text-slate-500 dark:text-slate-400">
          <p>
            Welcome! Start by adding your exercises under{' '}
            <Link to="/exercises" className="text-indigo-600 underline dark:text-indigo-400">
              Exercises
            </Link>
            , then log your first workout. Everything is stored only on this device — no account,
            no cloud.
          </p>
        </div>
      )}
    </div>
  )
}
