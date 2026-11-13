import { ResourceData, StaffData, TimeOffData, WorkingHoursRange } from './staff.types';

export interface StaffWriteData {
  name: string;
  specialty?: string | null;
  color?: string;
  userId?: string | null;
  isActive?: boolean;
}

export interface IStaffRepository {
  findAll(organizationId: string, includeInactive: boolean): Promise<StaffData[]>;
  findById(id: string, organizationId: string): Promise<StaffData | null>;
  create(organizationId: string, data: StaffWriteData): Promise<StaffData>;
  update(id: string, data: Partial<StaffWriteData>): Promise<StaffData>;
  replaceWorkingHours(staffId: string, ranges: WorkingHoursRange[]): Promise<void>;
  findUpcomingTimeOff(staffId: string, from: Date): Promise<TimeOffData[]>;
  addTimeOff(staffId: string, data: Omit<TimeOffData, 'id'>): Promise<TimeOffData>;
  /** Deletes only if the time off belongs to the staff member. Returns false if not found. */
  deleteTimeOff(staffId: string, timeOffId: string): Promise<boolean>;
}

export interface IResourceRepository {
  findAll(organizationId: string, includeInactive: boolean): Promise<ResourceData[]>;
  findById(id: string, organizationId: string): Promise<ResourceData | null>;
  create(organizationId: string, name: string): Promise<ResourceData>;
  update(id: string, data: { name?: string; isActive?: boolean }): Promise<ResourceData>;
}
