/** Appointments (scheduling module). */

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export interface Appointment {
  id: string
  customerId: string
  customerName?: string
  staffId: string
  staffName?: string
  staffColor?: string
  resourceId: string | null
  title: string
  description: string | null
  startTime: string
  endTime: string
  durationMinutes: number
  status: AppointmentStatus
}

export interface AvailabilitySlot {
  startTime: string
  endTime: string
}

export interface Availability {
  timezone: string
  slots: AvailabilitySlot[]
}
