/** Customers (patients in the dental vertical). */

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
