export type ExerciseCategory =
  | 'push'
  | 'pull'
  | 'legs'
  | 'core'
  | 'cardio'
  | 'other'

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  'push',
  'pull',
  'legs',
  'core',
  'cardio',
  'other',
]

export interface Exercise {
  id: string
  name: string
  category: ExerciseCategory
  createdAt: string
}

export interface Workout {
  id: string
  /** ISO date (YYYY-MM-DD), one workout per gym visit/day */
  date: string
  createdAt: string
}

export interface WorkoutSet {
  id: string
  workoutId: string
  exerciseId: string
  weight: number
  reps: number
  setOrder: number
  createdAt: string
}

export interface BodyMetric {
  id: string
  /** ISO date (YYYY-MM-DD), one entry per day */
  date: string
  weightKg: number
  createdAt: string
}

export interface ExerciseWithStats extends Exercise {
  lastWeight: number | null
  lastReps: number | null
  lastDate: string | null
  totalSessions: number
}
