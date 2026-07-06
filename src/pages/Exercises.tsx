import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { createExercise, getExercisesWithStats, seedDefaultExercises } from '../lib/queries'
import { relativeDate } from '../lib/dateUtils'
import { EXERCISE_CATEGORIES, type ExerciseCategory } from '../types'

export default function Exercises() {
  const exercises = useLiveQuery(getExercisesWithStats)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ExerciseCategory>('push')

  async function add() {
    if (!name.trim()) return
    await createExercise(name, category)
    setName('')
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <label className="label" htmlFor="new-exercise">
          New exercise
        </label>
        <div className="flex gap-2">
          <input
            id="new-exercise"
            className="input flex-1"
            placeholder="e.g. Bench Press"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <select
            className="input w-auto"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
          >
            {EXERCISE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={add} disabled={!name.trim()}>
            Add
          </button>
        </div>
      </div>

      {exercises?.length === 0 && (
        <div className="card space-y-2 text-sm text-slate-500 dark:text-slate-400">
          <p>No exercises yet. Add your own above, or start from a common list:</p>
          <button className="btn-secondary" onClick={() => seedDefaultExercises()}>
            Add common exercises
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {exercises?.map((exercise) => (
          <li key={exercise.id}>
            <Link to={`/exercises/${exercise.id}`} className="card flex items-center justify-between">
              <div>
                <p className="font-medium">{exercise.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {exercise.category}
                  {exercise.totalSessions > 0 && (
                    <>
                      {' '}
                      · {exercise.totalSessions} session{exercise.totalSessions === 1 ? '' : 's'} ·
                      last {relativeDate(exercise.lastDate!)}
                    </>
                  )}
                </p>
              </div>
              {exercise.lastWeight !== null && (
                <p className="text-right text-sm">
                  <span className="text-lg font-semibold">{exercise.lastWeight}</span> kg
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
