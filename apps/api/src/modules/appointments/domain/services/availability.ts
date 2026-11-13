import { DateTime } from 'luxon';

export interface WeeklyRange {
  /** ISO weekday: 1 = Monday … 7 = Sunday */
  weekday: number;
  /** Minutes from local midnight, [start, end) */
  startMinute: number;
  endMinute: number;
}

export interface Interval {
  start: Date;
  end: Date;
}

export interface AvailabilityInput {
  /** Day to compute, YYYY-MM-DD, interpreted in `timezone` */
  date: string;
  /** IANA time zone of the organization */
  timezone: string;
  durationMinutes: number;
  /** Distance between candidate start times (default 15) */
  stepMinutes?: number;
  workingHours: WeeklyRange[];
  /** Time off + existing active appointments */
  blocked: Interval[];
  /** Slots starting before this instant are excluded (default: no filter) */
  notBefore?: Date;
}

/**
 * Free slots of one staff member on one day.
 *
 * A slot [s, s + duration) is free when it fits entirely inside a working range of
 * that weekday and does not overlap any blocked interval. Touching intervals don't
 * overlap (an appointment ending at 10:00 leaves 10:00 free).
 *
 * Local wall-clock times are built with the zone's rules for that specific date
 * (not "midnight + N minutes"), so days with DST changes are handled correctly.
 */
export function computeAvailableSlots(input: AvailabilityInput): Interval[] {
  const step = input.stepMinutes ?? 15;
  const day = DateTime.fromISO(input.date, { zone: input.timezone });
  if (!day.isValid) throw new Error(`Invalid date or time zone: ${input.date} ${input.timezone}`);
  if (input.durationMinutes <= 0 || step <= 0) return [];

  const at = (minute: number): DateTime =>
    minute >= 1440
      ? day.plus({ days: 1 }).startOf('day')
      : day.set({ hour: Math.floor(minute / 60), minute: minute % 60, second: 0, millisecond: 0 });

  const blocked = input.blocked.map((b) => ({ start: b.start.getTime(), end: b.end.getTime() }));
  const notBefore = input.notBefore?.getTime() ?? -Infinity;
  const slots = new Map<number, Interval>();

  for (const range of input.workingHours) {
    if (range.weekday !== day.weekday) continue;
    const windowEnd = at(range.endMinute).toMillis();

    for (let minute = range.startMinute; minute < range.endMinute; minute += step) {
      const start = at(minute).toMillis();
      const end = start + input.durationMinutes * 60_000;
      if (end > windowEnd) break;
      if (start < notBefore) continue;
      if (blocked.some((b) => b.start < end && b.end > start)) continue;
      slots.set(start, { start: new Date(start), end: new Date(end) });
    }
  }

  return [...slots.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}
