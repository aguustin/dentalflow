import { computeAvailableSlots, Interval, WeeklyRange } from './availability';

const BA = 'America/Argentina/Buenos_Aires'; // UTC-3, no DST
const NY = 'America/New_York'; // DST: 2026-03-08 springs forward, 2026-11-01 falls back

// 2026-11-16 is a Monday
const MONDAY = '2026-11-16';
const morning: WeeklyRange = { weekday: 1, startMinute: 9 * 60, endMinute: 13 * 60 };
const afternoon: WeeklyRange = { weekday: 1, startMinute: 15 * 60, endMinute: 17 * 60 };

const utc = (iso: string) => new Date(iso);
const starts = (slots: Interval[]) => slots.map((s) => s.start.toISOString());

function slots(overrides: Partial<Parameters<typeof computeAvailableSlots>[0]> = {}) {
  return computeAvailableSlots({
    date: MONDAY,
    timezone: BA,
    durationMinutes: 60,
    stepMinutes: 60,
    workingHours: [morning],
    blocked: [],
    ...overrides,
  });
}

describe('computeAvailableSlots', () => {
  it('generates slots inside the working range, in the org time zone', () => {
    // 09:00 local (UTC-3) = 12:00Z; last 1h slot starts 12:00 local = 15:00Z
    expect(starts(slots())).toEqual([
      '2026-11-16T12:00:00.000Z',
      '2026-11-16T13:00:00.000Z',
      '2026-11-16T14:00:00.000Z',
      '2026-11-16T15:00:00.000Z',
    ]);
    expect(slots()[0].end.toISOString()).toBe('2026-11-16T13:00:00.000Z');
  });

  it('only fits slots that end within the range', () => {
    // 90 min every 60 min in 9–13: 9:00, 10:00, 11:00 (11:00–12:30); 12:00 would end 13:30
    expect(slots({ durationMinutes: 90 })).toHaveLength(3);
  });

  it('combines several ranges on the same day and ignores other weekdays', () => {
    const result = slots({
      workingHours: [morning, afternoon, { weekday: 2, startMinute: 0, endMinute: 1440 }],
    });
    expect(result).toHaveLength(6);
    expect(starts(result).slice(-2)).toEqual(['2026-11-16T18:00:00.000Z', '2026-11-16T19:00:00.000Z']);
  });

  it('returns nothing on a day without working hours', () => {
    expect(slots({ date: '2026-11-15' })).toEqual([]); // Sunday
  });

  it('excludes slots overlapping blocked intervals, but touching ones are free', () => {
    const result = slots({
      blocked: [
        // appointment 10:00–11:00 local
        { start: utc('2026-11-16T13:00:00.000Z'), end: utc('2026-11-16T14:00:00.000Z') },
      ],
    });
    expect(starts(result)).toEqual([
      '2026-11-16T12:00:00.000Z', // 09:00 ends exactly when the appointment starts
      '2026-11-16T14:00:00.000Z', // 11:00 starts exactly when it ends
      '2026-11-16T15:00:00.000Z',
    ]);
  });

  it('a partial overlap blocks the slot (15-min step)', () => {
    const result = slots({
      stepMinutes: 15,
      durationMinutes: 30,
      // 10:10–10:20 local
      blocked: [{ start: utc('2026-11-16T13:10:00.000Z'), end: utc('2026-11-16T13:20:00.000Z') }],
    });
    const local = starts(result);
    expect(local).toContain('2026-11-16T12:30:00.000Z'); // 09:30–10:00
    expect(local).not.toContain('2026-11-16T12:45:00.000Z'); // 09:45–10:15 overlaps
    expect(local).not.toContain('2026-11-16T13:00:00.000Z');
    expect(local).not.toContain('2026-11-16T13:15:00.000Z');
    expect(local).toContain('2026-11-16T13:30:00.000Z'); // 10:30
  });

  it('a multi-day time off blocks the whole day', () => {
    expect(
      slots({ blocked: [{ start: utc('2026-11-15T00:00:00.000Z'), end: utc('2026-11-18T00:00:00.000Z') }] }),
    ).toEqual([]);
  });

  it('drops slots before notBefore (e.g. now)', () => {
    expect(starts(slots({ notBefore: utc('2026-11-16T13:30:00.000Z') }))).toEqual([
      '2026-11-16T14:00:00.000Z',
      '2026-11-16T15:00:00.000Z',
    ]);
  });

  it('supports a range ending at midnight', () => {
    const result = slots({ workingHours: [{ weekday: 1, startMinute: 22 * 60, endMinute: 1440 }] });
    expect(starts(result)).toEqual(['2026-11-17T01:00:00.000Z', '2026-11-17T02:00:00.000Z']);
  });

  it('keeps local wall-clock times across a DST change', () => {
    // Before (EST, UTC-5) and after (EDT, UTC-4) the spring-forward of 2026-03-08 (Sunday)
    const range = (weekday: number) => [{ weekday, startMinute: 9 * 60, endMinute: 10 * 60 }];
    const sat = slots({ date: '2026-03-07', timezone: NY, workingHours: range(6) });
    const sun = slots({ date: '2026-03-08', timezone: NY, workingHours: range(7) });
    expect(starts(sat)).toEqual(['2026-03-07T14:00:00.000Z']); // 09:00 EST
    expect(starts(sun)).toEqual(['2026-03-08T13:00:00.000Z']); // 09:00 EDT
  });

  it('rejects an invalid date', () => {
    expect(() => slots({ date: '2026-02-30' })).toThrow();
  });
});
