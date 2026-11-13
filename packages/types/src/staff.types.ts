/** Staff members, their schedules, and bookable resources. */

export interface WorkingHoursRange {
  /** ISO weekday: 1 = Monday … 7 = Sunday */
  weekday: number
  /** Minutes from local midnight, [start, end) */
  startMinute: number
  endMinute: number
}

export interface StaffMember {
  id: string
  userId: string | null
  name: string
  specialty: string | null
  color: string
  isActive: boolean
  workingHours: WorkingHoursRange[]
}

export interface TimeOff {
  id: string
  startTime: string
  endTime: string
  reason: string | null
}

export interface StaffDetail extends StaffMember {
  upcomingTimeOff: TimeOff[]
}

export interface Resource {
  id: string
  name: string
  isActive: boolean
}
