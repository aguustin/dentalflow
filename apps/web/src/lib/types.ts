/** API response types used by the web. Will move to packages/types in step 8. */

export type ModuleKey = 'customers' | 'scheduling'

export interface Terminology {
  singular: string
  plural: string
}

export interface AttributeField {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'boolean'
  required?: boolean
  options?: string[]
}

export interface Vertical {
  key: string
  label: string
  modules: ModuleKey[]
  homeModule: ModuleKey
  terminology: {
    customer: Terminology
    appointment: Terminology
  }
  customerAttributes: AttributeField[]
}

export interface CurrentOrganization {
  id: string
  name: string
  slug: string
  vertical: Vertical
  enabledModules: ModuleKey[]
  isActive: boolean
  createdAt: string
  subscription: { planName: string; status: string; startDate: string } | null
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  documentId: string | null
  attributes: Record<string, string | number | boolean>
  createdAt: string
  updatedAt: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

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
