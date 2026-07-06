import { db, newId } from './db'
import { startOfMonthIso, startOfWeekIso, startOfYearIso, todayIso } from './dateUtils'
import type {
  BodyMetric,
  Exercise,
  ExerciseCategory,
  ExerciseWithStats,
  Workout,
  WorkoutSet,
} from '../types'

function nowIso() {
  return new Date().toISOString()
}

// ---------- exercises ----------

export async function createExercise(
  name: string,
  category: ExerciseCategory,
): Promise<Exercise> {
  const exercise: Exercise = { id: newId(), name: name.trim(), category, createdAt: nowIso() }
  await db.exercises.add(exercise)
  return exercise
}

/** Deletes the exercise, all its sets, and any workouts left empty by that. */
export async function deleteExercise(exerciseId: string): Promise<void> {
  await db.transaction('rw', db.exercises, db.sets, db.workouts, async () => {
    const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray()
    const workoutIds = [...new Set(sets.map((s) => s.workoutId))]
    await db.sets.where('exerciseId').equals(exerciseId).delete()
    for (const workoutId of workoutIds) {
      if ((await db.sets.where('workoutId').equals(workoutId).count()) === 0) {
        await db.workouts.delete(workoutId)
      }
    }
    await db.exercises.delete(exerciseId)
  })
}

/**
 * All exercises annotated with their most recent session's top set
 * (heaviest weight of that day) and how many sessions they appear in.
 */
export async function getExercisesWithStats(): Promise<ExerciseWithStats[]> {
  const [exercises, sets, workouts] = await Promise.all([
    db.exercises.orderBy('name').toArray(),
    db.sets.toArray(),
    db.workouts.toArray(),
  ])
  const dateByWorkout = new Map(workouts.map((w) => [w.id, w.date]))

  const byExercise = new Map<string, WorkoutSet[]>()
  for (const set of sets) {
    const list = byExercise.get(set.exerciseId) ?? []
    list.push(set)
    byExercise.set(set.exerciseId, list)
  }

  return exercises.map((exercise) => {
    const rows = byExercise.get(exercise.id) ?? []
    const sessions = new Set(rows.map((r) => r.workoutId))
    let lastDate: string | null = null
    for (const row of rows) {
      const date = dateByWorkout.get(row.workoutId) ?? null
      if (date && (!lastDate || date > lastDate)) lastDate = date
    }
    const lastSets = rows.filter((r) => dateByWorkout.get(r.workoutId) === lastDate)
    const topSet = lastSets.reduce<WorkoutSet | null>(
      (best, s) => (best === null || s.weight > best.weight ? s : best),
      null,
    )
    return {
      ...exercise,
      lastWeight: topSet?.weight ?? null,
      lastReps: topSet?.reps ?? null,
      lastDate,
      totalSessions: sessions.size,
    }
  })
}

// ---------- workouts & sets ----------

export interface WorkoutDay {
  workout: Workout | null
  /** sets grouped per exercise, groups ordered by first set logged */
  groups: { exercise: Exercise; sets: WorkoutSet[] }[]
}

export async function getWorkoutDay(date: string): Promise<WorkoutDay> {
  const workout = (await db.workouts.where('date').equals(date).first()) ?? null
  if (!workout) return { workout: null, groups: [] }

  const sets = await db.sets.where('workoutId').equals(workout.id).sortBy('createdAt')
  const exercises = await db.exercises.bulkGet([...new Set(sets.map((s) => s.exerciseId))])
  const exerciseById = new Map(
    exercises.filter((e): e is Exercise => e !== undefined).map((e) => [e.id, e]),
  )

  const groups: WorkoutDay['groups'] = []
  const groupByExercise = new Map<string, WorkoutSet[]>()
  for (const set of sets) {
    const exercise = exerciseById.get(set.exerciseId)
    if (!exercise) continue
    let group = groupByExercise.get(set.exerciseId)
    if (!group) {
      group = []
      groupByExercise.set(set.exerciseId, group)
      groups.push({ exercise, sets: group })
    }
    group.push(set)
  }
  return { workout, groups }
}

/** Adds a set for the given day, creating the day's workout if needed. */
export async function logSet(
  date: string,
  exerciseId: string,
  weight: number,
  reps: number,
): Promise<void> {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    let workout = await db.workouts.where('date').equals(date).first()
    if (!workout) {
      workout = { id: newId(), date, createdAt: nowIso() }
      await db.workouts.add(workout)
    }
    const setOrder = await db.sets
      .where('workoutId')
      .equals(workout.id)
      .filter((s) => s.exerciseId === exerciseId)
      .count()
    await db.sets.add({
      id: newId(),
      workoutId: workout.id,
      exerciseId,
      weight,
      reps,
      setOrder: setOrder + 1,
      createdAt: nowIso(),
    })
  })
}

export async function updateSet(setId: string, weight: number, reps: number): Promise<void> {
  await db.sets.update(setId, { weight, reps })
}

/** Heaviest weight ever logged for an exercise, or null if never done. */
export async function getBestWeight(exerciseId: string): Promise<number | null> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray()
  return sets.length ? Math.max(...sets.map((s) => s.weight)) : null
}

/** Deletes a set; removes the workout too if it was its last set. */
export async function deleteSet(setId: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.sets, async () => {
    const set = await db.sets.get(setId)
    if (!set) return
    await db.sets.delete(setId)
    if ((await db.sets.where('workoutId').equals(set.workoutId).count()) === 0) {
      await db.workouts.delete(set.workoutId)
    }
  })
}

export interface LastSession {
  date: string
  sets: WorkoutSet[]
}

/** Most recent session for an exercise before the given date. */
export async function getLastSession(
  exerciseId: string,
  beforeDate: string,
): Promise<LastSession | null> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray()
  if (sets.length === 0) return null
  const workouts = await db.workouts.bulkGet([...new Set(sets.map((s) => s.workoutId))])
  const dateByWorkout = new Map(
    workouts.filter((w): w is Workout => w !== undefined).map((w) => [w.id, w.date]),
  )
  let lastDate: string | null = null
  for (const date of dateByWorkout.values()) {
    if (date < beforeDate && (!lastDate || date > lastDate)) lastDate = date
  }
  if (!lastDate) return null
  const sessionSets = sets
    .filter((s) => dateByWorkout.get(s.workoutId) === lastDate)
    .sort((a, b) => a.setOrder - b.setOrder)
  return { date: lastDate, sets: sessionSets }
}

// ---------- per-exercise history ----------

export interface ExerciseSession {
  date: string
  sets: WorkoutSet[]
  maxWeight: number
  volume: number
}

/** All sessions of an exercise, oldest first (chart-ready). */
export async function getExerciseHistory(exerciseId: string): Promise<ExerciseSession[]> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray()
  const workouts = await db.workouts.bulkGet([...new Set(sets.map((s) => s.workoutId))])
  const dateByWorkout = new Map(
    workouts.filter((w): w is Workout => w !== undefined).map((w) => [w.id, w.date]),
  )
  const byDate = new Map<string, WorkoutSet[]>()
  for (const set of sets) {
    const date = dateByWorkout.get(set.workoutId)
    if (!date) continue
    const list = byDate.get(date) ?? []
    list.push(set)
    byDate.set(date, list)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sessionSets]) => ({
      date,
      sets: sessionSets.sort((a, b) => a.setOrder - b.setOrder),
      maxWeight: Math.max(...sessionSets.map((s) => s.weight)),
      volume: sessionSets.reduce((sum, s) => sum + s.weight * s.reps, 0),
    }))
}

// ---------- visit statistics ----------

export interface VisitStats {
  thisWeek: number
  thisMonth: number
  thisYear: number
  total: number
}

export async function getVisitStats(): Promise<VisitStats> {
  const dates = (await db.workouts.toArray()).map((w) => w.date)
  const week = startOfWeekIso()
  const month = startOfMonthIso()
  const year = startOfYearIso()
  return {
    thisWeek: dates.filter((d) => d >= week).length,
    thisMonth: dates.filter((d) => d >= month).length,
    thisYear: dates.filter((d) => d >= year).length,
    total: dates.length,
  }
}

export interface VisitBucket {
  label: string
  visits: number
}

/** Visits per calendar week (Mon-based), most recent `weeks` weeks. */
export async function getWeeklyVisits(weeks = 12): Promise<VisitBucket[]> {
  const dates = (await db.workouts.toArray()).map((w) => w.date)
  const buckets: VisitBucket[] = []
  const monday = new Date()
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(monday)
    start.setDate(monday.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    const startIso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
    const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    buckets.push({
      label: `${start.getDate()}.${start.getMonth() + 1}.`,
      visits: dates.filter((d) => d >= startIso && d < endIso).length,
    })
  }
  return buckets
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Visits per month, most recent `months` months. */
export async function getMonthlyVisits(months = 12): Promise<VisitBucket[]> {
  const dates = (await db.workouts.toArray()).map((w) => w.date)
  const buckets: VisitBucket[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.push({
      label: MONTH_LABELS[d.getMonth()],
      visits: dates.filter((date) => date.startsWith(prefix)).length,
    })
  }
  return buckets
}

/** Visits per year, for every year with data (plus the current year). */
export async function getYearlyVisits(): Promise<VisitBucket[]> {
  const dates = (await db.workouts.toArray()).map((w) => w.date)
  const years = new Set(dates.map((d) => d.slice(0, 4)))
  years.add(String(new Date().getFullYear()))
  return [...years].sort().map((year) => ({
    label: year,
    visits: dates.filter((d) => d.startsWith(year)).length,
  }))
}

// ---------- body metrics ----------

/** One entry per day: logging twice on the same date replaces the value. */
export async function logBodyWeight(date: string, weightKg: number): Promise<void> {
  const existing = await db.bodyMetrics.where('date').equals(date).first()
  if (existing) {
    await db.bodyMetrics.update(existing.id, { weightKg })
  } else {
    await db.bodyMetrics.add({ id: newId(), date, weightKg, createdAt: nowIso() })
  }
}

export async function deleteBodyMetric(id: string): Promise<void> {
  await db.bodyMetrics.delete(id)
}

export async function getBodyMetrics(): Promise<BodyMetric[]> {
  return db.bodyMetrics.orderBy('date').toArray()
}

// ---------- seed data ----------

const DEFAULT_EXERCISES: [string, ExerciseCategory][] = [
  ['Bench Press', 'push'],
  ['Overhead Press', 'push'],
  ['Incline Dumbbell Press', 'push'],
  ['Lat Pulldown', 'pull'],
  ['Seated Row', 'pull'],
  ['Biceps Curl', 'pull'],
  ['Squat', 'legs'],
  ['Leg Press', 'legs'],
  ['Romanian Deadlift', 'legs'],
  ['Plank', 'core'],
  ['Cable Crunch', 'core'],
]

export async function seedDefaultExercises(): Promise<number> {
  const existing = new Set(
    (await db.exercises.toArray()).map((e) => e.name.toLowerCase()),
  )
  const missing = DEFAULT_EXERCISES.filter(([name]) => !existing.has(name.toLowerCase()))
  await db.exercises.bulkAdd(
    missing.map(([name, category]) => ({ id: newId(), name, category, createdAt: nowIso() })),
  )
  return missing.length
}

// ---------- dashboard ----------

export interface LastWorkoutSummary {
  date: string
  exerciseNames: string[]
  totalSets: number
}

export async function getLastWorkoutSummary(): Promise<LastWorkoutSummary | null> {
  const workouts = await db.workouts.orderBy('date').reverse().limit(1).toArray()
  const workout = workouts[0]
  if (!workout) return null
  const sets = await db.sets.where('workoutId').equals(workout.id).toArray()
  const exercises = await db.exercises.bulkGet([...new Set(sets.map((s) => s.exerciseId))])
  return {
    date: workout.date,
    exerciseNames: exercises.filter((e) => e !== undefined).map((e) => e.name),
    totalSets: sets.length,
  }
}

export { todayIso }
