/** Date helpers in the browser's local time zone. */

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - day)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const pad = (n: number) => String(n).padStart(2, '0')

/** yyyy-mm-dd for <input type="date"> */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** HH:mm for <input type="time"> */
export function toTimeInput(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Combines date (yyyy-mm-dd) and time (HH:mm) inputs into a local Date. */
export function fromInputs(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y, m - 1, d, h, min)
}

export const formatTime = (d: Date) => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
export const formatDay = (d: Date) => d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
