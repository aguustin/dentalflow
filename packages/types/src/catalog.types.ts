/** Catalog (services and products) and sales. All amounts are integers in cents. */

export type CatalogItemType = 'SERVICE' | 'PRODUCT'

export interface CatalogItem {
  id: string
  type: CatalogItemType
  name: string
  sku: string | null
  price: number
  durationMinutes: number | null
  trackStock: boolean
  isActive: boolean
}

export type SaleStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_PAID' | 'PAID' | 'VOIDED'
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'

export interface SaleLine {
  id: string
  catalogItemId: string | null
  description: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

export interface SalePayment {
  id: string
  method: PaymentMethod
  amount: number
  createdAt: string
}

export interface SaleSummary {
  id: string
  number: number
  status: SaleStatus
  customerId: string | null
  customerName: string | null
  staffName: string | null
  total: number
  paidTotal: number
  balance: number
  createdAt: string
}

export interface SaleDetail extends SaleSummary {
  staffId: string | null
  appointmentId: string | null
  notes: string | null
  subtotal: number
  discountTotal: number
  globalDiscount: number
  taxRateBps: number
  taxTotal: number
  confirmedAt: string | null
  voidedAt: string | null
  items: SaleLine[]
  payments: SalePayment[]
}

export interface CashSession {
  id: string
  openedAt: string
  openingAmount: number
  closedAt: string | null
  byMethod: Record<PaymentMethod, number>
  paymentCount: number
  totalCollected: number
  expectedCash: number
  countedCash: number | null
  difference: number | null
  notes: string | null
}
