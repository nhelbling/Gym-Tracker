import { db } from './db'
import { todayIso } from './dateUtils'
import type { BodyMetric, Exercise, Workout, WorkoutSet } from '../types'

const LAST_BACKUP_KEY = 'gym-tracker:lastBackupAt'

export interface BackupFile {
  app: 'gym-tracker'
  version: 1
  exportedAt: string
  exercises: Exercise[]
  workouts: Workout[]
  sets: WorkoutSet[]
  bodyMetrics: BodyMetric[]
}

export async function buildBackup(): Promise<BackupFile> {
  const [exercises, workouts, sets, bodyMetrics] = await Promise.all([
    db.exercises.toArray(),
    db.workouts.toArray(),
    db.sets.toArray(),
    db.bodyMetrics.toArray(),
  ])
  return {
    app: 'gym-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises,
    workouts,
    sets,
    bodyMetrics,
  }
}

/** Downloads all data as a JSON file (on iOS this opens the share sheet). */
export async function exportBackup(): Promise<void> {
  const backup = await buildBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gym-tracker-backup-${todayIso()}.json`
  a.click()
  URL.revokeObjectURL(url)
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
}

export interface ImportCounts {
  exercises: number
  workouts: number
  sets: number
  bodyMetrics: number
}

/** Replaces ALL local data with the backup's contents. */
export async function importBackup(file: File): Promise<ImportCounts> {
  const parsed = JSON.parse(await file.text()) as Partial<BackupFile>
  if (parsed.app !== 'gym-tracker' || !Array.isArray(parsed.exercises)) {
    throw new Error('Not a Gym Tracker backup file')
  }
  const exercises = parsed.exercises ?? []
  const workouts = parsed.workouts ?? []
  const sets = parsed.sets ?? []
  const bodyMetrics = parsed.bodyMetrics ?? []
  await db.transaction('rw', db.exercises, db.workouts, db.sets, db.bodyMetrics, async () => {
    await Promise.all([
      db.exercises.clear(),
      db.workouts.clear(),
      db.sets.clear(),
      db.bodyMetrics.clear(),
    ])
    await db.exercises.bulkAdd(exercises)
    await db.workouts.bulkAdd(workouts)
    await db.sets.bulkAdd(sets)
    await db.bodyMetrics.bulkAdd(bodyMetrics)
  })
  return {
    exercises: exercises.length,
    workouts: workouts.length,
    sets: sets.length,
    bodyMetrics: bodyMetrics.length,
  }
}

export function lastBackupAt(): Date | null {
  const raw = localStorage.getItem(LAST_BACKUP_KEY)
  return raw ? new Date(raw) : null
}

export function daysSinceBackup(): number | null {
  const last = lastBackupAt()
  if (!last) return null
  return Math.floor((Date.now() - last.getTime()) / 86_400_000)
}

export async function eraseAllData(): Promise<void> {
  await db.transaction('rw', db.exercises, db.workouts, db.sets, db.bodyMetrics, async () => {
    await Promise.all([
      db.exercises.clear(),
      db.workouts.clear(),
      db.sets.clear(),
      db.bodyMetrics.clear(),
    ])
  })
}
