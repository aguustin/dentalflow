/** Organization and business vertical (template) as returned by GET /organizations/current. */

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
