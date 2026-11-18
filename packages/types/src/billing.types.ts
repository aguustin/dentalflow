/** SaaS plan and Mercado Pago subscription (GET /billing/plan). Amounts in cents. */

export interface BillingOverview {
  subscription: {
    planName: string
    planDisplayName: string
    status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED'
    paidWithMercadoPago: boolean
    nextPaymentDate: string | null
  } | null
  plans: {
    name: string
    displayName: string
    price: number
    currency: string
    features: string[]
    maxCustomers: number
    maxAppointments: number
  }[]
  payments: { id: string; amount: number; currency: string; status: string; paidAt: string | null; createdAt: string }[]
  /** false when the server has no Mercado Pago credentials */
  configured: boolean
}
