export function toIsoDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

/** Monday of the week containing d */
export function startOfWeekIso(d: Date = new Date()): string {
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return toIsoDate(monday)
}

export function startOfMonthIso(d: Date = new Date()): string {
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function startOfYearIso(d: Date = new Date()): string {
  return `${d.getFullYear()}-01-01`
}

export function addDays(iso: string, days: number): string {
  const d = fromIsoDate(iso)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

export function fromIsoDate(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number)
  return new Date(y, m - 1, day)
}

/** e.g. "6.7.2026" */
export function formatDate(iso: string): string {
  const d = fromIsoDate(iso)
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
}

export function daysSince(iso: string): number {
  const ms = fromIsoDate(todayIso()).getTime() - fromIsoDate(iso).getTime()
  return Math.round(ms / 86_400_000)
}

export function relativeDate(iso: string): string {
  const days = daysSince(iso)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  return formatDate(iso)
}
