/** Appointments (scheduling module). */

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export interface Appointment {
  id: string
  customerId: string
  customerName?: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  durationMinutes: number
  status: AppointmentStatus
}
