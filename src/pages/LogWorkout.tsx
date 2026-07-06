import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  deleteSet,
  getBestWeight,
  getExercisesWithStats,
  getLastSession,
  getWorkoutDay,
  logSet,
  seedDefaultExercises,
  updateSet,
} from '../lib/queries'
import { formatDate, todayIso } from '../lib/dateUtils'
import type { Exercise, ExerciseWithStats, WorkoutSet } from '../types'

export default function LogWorkout() {
  const [searchParams] = useSearchParams()
  const [date, setDate] = useState(() => searchParams.get('date') ?? todayIso())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ExerciseWithStats | null>(null)
  const [editingSetId, setEditingSetId] = useState<string | null>(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  const day = useLiveQuery(() => getWorkoutDay(date), [date])
  const exercises = useLiveQuery(getExercisesWithStats, [])
  const lastSession = useLiveQuery(
    () => (selected ? getLastSession(selected.id, date) : Promise.resolve(null)),
    [selected?.id, date],
  )
  const bestWeight = useLiveQuery(
    () => (selected ? getBestWeight(selected.id) : Promise.resolve(null)),
    [selected?.id],
  )

  function toStats(exercise: Exercise): ExerciseWithStats {
    return (
      (exercises ?? []).find((e) => e.id === exercise.id) ?? {
        ...exercise,
        lastWeight: null,
        lastReps: null,
        lastDate: null,
        totalSessions: 0,
      }
    )
  }

  function selectExercise(exercise: ExerciseWithStats) {
    setSelected(exercise)
    setEditingSetId(null)
    setPickerOpen(false)
    setSearch('')
    const todaySets = day?.groups.find((g) => g.exercise.id === exercise.id)?.sets
    const lastToday = todaySets?.[todaySets.length - 1]
    if (lastToday) {
      setWeight(String(lastToday.weight))
      setReps(String(lastToday.reps))
    } else if (exercise.lastWeight !== null) {
      setWeight(String(exercise.lastWeight))
      setReps(exercise.lastReps !== null ? String(exercise.lastReps) : '')
    } else {
      setWeight('')
      setReps('')
    }
  }

  function startEditSet(set: WorkoutSet, exercise: Exercise) {
    setSelected(toStats(exercise))
    setEditingSetId(set.id)
    setPickerOpen(false)
    setWeight(String(set.weight))
    setReps(String(set.reps))
  }

  function closeForm() {
    setSelected(null)
    setEditingSetId(null)
  }

  function stepWeight(delta: number) {
    const current = parseFloat(weight.replace(',', '.')) || 0
    setWeight(String(Math.max(0, Math.round((current + delta) * 100) / 100)))
  }

  function stepReps(delta: number) {
    const current = parseInt(reps, 10) || 0
    setReps(String(Math.max(1, current + delta)))
  }

  async function submitSet() {
    if (!selected) return
    const w = parseFloat(weight.replace(',', '.'))
    const r = parseInt(reps, 10)
    if (Number.isNaN(w) || w < 0 || Number.isNaN(r) || r <= 0) return
    if (editingSetId) {
      await updateSet(editingSetId, w, r)
      setEditingSetId(null)
    } else {
      await logSet(date, selected.id, w, r)
    }
  }

  const filtered = (exercises ?? []).filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {date === todayIso() ? "Today's workout" : `Workout ${formatDate(date)}`}
        </h2>
        <input
          type="date"
          className="input w-auto py-1 text-sm"
          value={date}
          max={todayIso()}
          onChange={(e) => {
            if (!e.target.value) return
            setDate(e.target.value)
            closeForm()
          }}
        />
      </div>

      {day?.groups.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {date === todayIso()
            ? 'No sets logged yet. Add an exercise to get going.'
            : 'Nothing logged on this day. Pick another date or add sets here.'}
        </p>
      )}

      {day?.groups.map(({ exercise, sets }) => (
        <div key={exercise.id} className="card space-y-2">
          <div className="flex items-center justify-between">
            <Link to={`/exercises/${exercise.id}`} className="font-medium">
              {exercise.name}
            </Link>
            <button
              className="btn-secondary px-2 py-1 text-xs"
              onClick={() => selectExercise(toStats(exercise))}
            >
              + Set
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {sets.map((set) => (
              <li
                key={set.id}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ${
                  editingSetId === set.id
                    ? 'bg-indigo-100 ring-1 ring-indigo-400 dark:bg-indigo-950'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                <button aria-label="Edit set" onClick={() => startEditSet(set, exercise)}>
                  <strong>{set.weight}</strong> kg × {set.reps}
                </button>
                <button
                  aria-label="Delete set"
                  className="px-1 text-slate-400 hover:text-red-500"
                  onClick={() => {
                    if (confirm(`Delete set ${set.weight} kg × ${set.reps}?`)) {
                      if (editingSetId === set.id) closeForm()
                      deleteSet(set.id)
                    }
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {selected && (
        <div className="card space-y-3 border-indigo-300 dark:border-indigo-800">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              {selected.name}
              {editingSetId && (
                <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-normal text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  editing set
                </span>
              )}
            </h3>
            <button className="text-sm text-slate-400" onClick={closeForm}>
              Close
            </button>
          </div>
          {(lastSession || bestWeight !== null) && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {lastSession && (
                <>
                  Last time ({formatDate(lastSession.date)}):{' '}
                  {lastSession.sets.map((s) => `${s.weight}×${s.reps}`).join(', ')}
                </>
              )}
              {lastSession && bestWeight !== null && ' · '}
              {bestWeight !== null && (
                <>
                  Best ever: <strong>{bestWeight} kg</strong>
                </>
              )}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="weight">
                Weight (kg)
              </label>
              <div className="flex gap-1.5">
                <button className="btn-secondary px-2.5" onClick={() => stepWeight(-2.5)}>
                  −
                </button>
                <input
                  id="weight"
                  className="input text-center"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
                <button className="btn-secondary px-2.5" onClick={() => stepWeight(2.5)}>
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="reps">
                Reps
              </label>
              <div className="flex gap-1.5">
                <button className="btn-secondary px-2.5" onClick={() => stepReps(-1)}>
                  −
                </button>
                <input
                  id="reps"
                  className="input text-center"
                  inputMode="numeric"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                />
                <button className="btn-secondary px-2.5" onClick={() => stepReps(1)}>
                  +
                </button>
              </div>
            </div>
          </div>
          <button className="btn-primary w-full" onClick={submitSet}>
            {editingSetId ? 'Save changes' : 'Add set'}
          </button>
        </div>
      )}

      {pickerOpen ? (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Pick an exercise</h3>
            <button className="text-sm text-slate-400" onClick={() => setPickerOpen(false)}>
              Close
            </button>
          </div>
          <input
            className="input"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {exercises?.length === 0 && (
            <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <p>No exercises yet.</p>
              <button className="btn-secondary" onClick={() => seedDefaultExercises()}>
                Add common exercises
              </button>
            </div>
          )}
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((exercise) => (
              <li key={exercise.id}>
                <button
                  className="flex w-full items-center justify-between py-2.5 text-left"
                  onClick={() => selectExercise(exercise)}
                >
                  <span>{exercise.name}</span>
                  <span className="text-sm text-slate-400">
                    {exercise.lastWeight !== null
                      ? `${exercise.lastWeight} kg × ${exercise.lastReps}`
                      : 'new'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button
          className="btn-secondary w-full"
          onClick={() => {
            setPickerOpen(true)
            closeForm()
          }}
        >
          + Add exercise
        </button>
      )}

      <p className="text-center text-xs text-slate-400">
        Tap a set to edit it · use the date picker to fix past days
      </p>
    </div>
  )
}
