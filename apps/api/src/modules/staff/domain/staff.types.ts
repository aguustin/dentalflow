import { DomainError } from '../../../shared/contracts/errors/domain.error';

export interface WorkingHoursRange {
  /** ISO weekday: 1 = Monday … 7 = Sunday */
  weekday: number;
  /** Minutes from local midnight, [start, end) */
  startMinute: number;
  endMinute: number;
}

export interface TimeOffData {
  id: string;
  startTime: Date;
  endTime: Date;
  reason: string | null;
}

export interface StaffData {
  id: string;
  organizationId: string;
  userId: string | null;
  name: string;
  specialty: string | null;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  workingHours: WorkingHoursRange[];
}

export interface ResourceData {
  id: string;
  organizationId: string;
  name: string;
  isActive: boolean;
}

/**
 * Validates and normalizes a weekly schedule: valid weekday/minutes and
 * no overlapping ranges on the same day. Returns ranges sorted by day and start.
 */
export function normalizeWorkingHours(ranges: WorkingHoursRange[]): WorkingHoursRange[] {
  const sorted = [...ranges].sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);
  for (const [i, r] of sorted.entries()) {
    if (!Number.isInteger(r.weekday) || r.weekday < 1 || r.weekday > 7) {
      throw new DomainError('INVALID', `Invalid weekday ${r.weekday} (1 = Monday … 7 = Sunday)`);
    }
    if (r.startMinute < 0 || r.endMinute > 1440 || r.startMinute >= r.endMinute) {
      throw new DomainError('INVALID', `Invalid time range on weekday ${r.weekday}`);
    }
    const prev = sorted[i - 1];
    if (prev && prev.weekday === r.weekday && r.startMinute < prev.endMinute) {
      throw new DomainError('INVALID', `Overlapping time ranges on weekday ${r.weekday}`);
    }
  }
  return sorted;
}
