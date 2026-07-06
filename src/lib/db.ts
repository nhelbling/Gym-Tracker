import Dexie, { type EntityTable } from 'dexie'
import type { BodyMetric, Exercise, Workout, WorkoutSet } from '../types'

export const db = new Dexie('gym-tracker') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  workouts: EntityTable<Workout, 'id'>
  sets: EntityTable<WorkoutSet, 'id'>
  bodyMetrics: EntityTable<BodyMetric, 'id'>
}

db.version(1).stores({
  exercises: 'id, name',
  workouts: 'id, date',
  sets: 'id, workoutId, exerciseId',
  bodyMetrics: 'id, date',
})

export function newId(): string {
  return crypto.randomUUID()
}
