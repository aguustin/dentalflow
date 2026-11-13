import { WorkingHoursRange } from '@dentalflow/types'

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const pad = (n: number) => String(n).padStart(2, '0')

/** 540 → "09:00" */
export const minuteToTime = (m: number) => (m >= 1440 ? '24:00' : `${pad(Math.floor(m / 60))}:${pad(m % 60)}`)

/** "09:00" → 540 ("00:00" as an end time means midnight = 1440) */
export const timeToMinute = (t: string, isEnd = false) => {
  const [h, m] = t.split(':').map(Number)
  const minute = h * 60 + m
  return isEnd && minute === 0 ? 1440 : minute
}

/** "Lun 09:00–13:00, 15:00–19:00 · Mar …" */
export function summarizeHours(ranges: WorkingHoursRange[]): string {
  const byDay = new Map<number, string[]>()
  for (const r of ranges) {
    byDay.set(r.weekday, [...(byDay.get(r.weekday) ?? []), `${minuteToTime(r.startMinute)}–${minuteToTime(r.endMinute)}`])
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, list]) => `${SHORT[day - 1]} ${list.join(', ')}`)
    .join(' · ')
}
