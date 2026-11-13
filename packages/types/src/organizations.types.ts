/** Organization and business vertical (template) as returned by GET /organizations/current. */

export type ModuleKey = 'customers' | 'scheduling' | 'catalog' | 'sales' | 'inventory' | 'clinical'

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
    staff: Terminology
    resource: Terminology
  }
  customerAttributes: AttributeField[]
  /** Health-care verticals only */
  clinical?: { anamnesisFields: AttributeField[] }
}

export interface CurrentOrganization {
  id: string
  name: string
  slug: string
  vertical: Vertical
  enabledModules: ModuleKey[]
  /** IANA time zone; working hours and availability are expressed in it */
  timezone: string
  /** ISO 4217, for formatting amounts */
  currency: string
  /** Sales tax in basis points (2100 = 21%) */
  taxRateBps: number
  isActive: boolean
  createdAt: string
  subscription: { planName: string; status: string; startDate: string } | null
}
