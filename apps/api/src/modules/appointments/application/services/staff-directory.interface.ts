import { Interval, WeeklyRange } from '../../domain/services/availability';

/**
 * Read-only view of the staff module, declared by the appointments module
 * (cross-module rule: no imports from the staff module).
 */
export interface IStaffDirectory {
  isActiveStaff(staffId: string, organizationId: string): Promise<boolean>;
  isActiveResource(resourceId: string, organizationId: string): Promise<boolean>;
  /** Weekly hours + time off overlapping [from, to) */
  getSchedule(
    staffId: string,
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<{ workingHours: WeeklyRange[]; timeOff: Interval[] } | null>;
  /** Display info by staff id, for listings. */
  findStaffInfo(
    staffIds: string[],
    organizationId: string,
  ): Promise<Map<string, { name: string; color: string }>>;
}
