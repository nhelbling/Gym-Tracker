import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import {
  eraseAllData,
  exportBackup,
  importBackup,
  lastBackupAt,
} from '../lib/backup'
import { seedDefaultExercises } from '../lib/queries'

export default function Settings() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [message, setMessage] = useState('')
  const counts = useLiveQuery(async () => ({
    exercises: await db.exercises.count(),
    workouts: await db.workouts.count(),
    sets: await db.sets.count(),
    bodyMetrics: await db.bodyMetrics.count(),
  }))

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  const backup = lastBackupAt()

  async function onImportFile(file: File) {
    if (
      !confirm(
        'Importing replaces ALL data on this device with the backup file. Continue?',
      )
    ) {
      return
    }
    try {
      const imported = await importBackup(file)
      setMessage(
        `Imported ${imported.workouts} workouts, ${imported.sets} sets, ` +
          `${imported.exercises} exercises, ${imported.bodyMetrics} body entries.`,
      )
    } catch (error) {
      setMessage(`Import failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h3 className="font-medium">Backup & sync</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your data lives only on this device. To back it up or move it to another device
          (e.g. iPhone ↔ Mac), export a file here and save it to iCloud Drive or AirDrop it,
          then import it on the other device.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Last backup: <strong>{backup ? backup.toLocaleDateString() : 'never'}</strong>
        </p>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={() => exportBackup()}>
            Export backup
          </button>
          <button className="btn-secondary flex-1" onClick={() => fileInput.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImportFile(file)
              e.target.value = ''
            }}
          />
        </div>
        {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
      </div>

      <div className="card space-y-2">
        <h3 className="font-medium">Storage</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {counts
            ? `${counts.workouts} workouts · ${counts.sets} sets · ${counts.exercises} exercises · ${counts.bodyMetrics} body entries`
            : '…'}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Durable storage:{' '}
          <strong>{persisted === null ? 'unknown' : persisted ? 'granted' : 'not granted'}</strong>
          {persisted === false &&
            ' — install the app to your home screen to protect data from browser cleanup.'}
        </p>
      </div>

      <div className="card space-y-2">
        <h3 className="font-medium">Exercises</h3>
        <button
          className="btn-secondary"
          onClick={async () => {
            const added = await seedDefaultExercises()
            setMessage(added > 0 ? `Added ${added} common exercises.` : 'Nothing new to add.')
          }}
        >
          Add common exercises
        </button>
      </div>

      <div className="card space-y-2 border-red-200 dark:border-red-900">
        <h3 className="font-medium text-red-600 dark:text-red-400">Danger zone</h3>
        <button
          className="btn-danger w-full"
          onClick={async () => {
            if (!confirm('Erase ALL data on this device? This cannot be undone.')) return
            if (prompt('Type ERASE to confirm') !== 'ERASE') return
            await eraseAllData()
            setMessage('All data erased.')
          }}
        >
          Erase all data
        </button>
      </div>
    </div>
  )
}
