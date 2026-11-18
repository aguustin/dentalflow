/** KPIs of a period (GET /reports/summary). Amounts in cents; null section = module not enabled. */

export interface ReportSummary {
  from: string
  to: string
  timezone: string
  currency: string
  customers: { new: number }
  sales: {
    count: number
    gross: number
    refunded: number
    net: number
    averageTicket: number
    collectedByMethod: Partial<Record<'CASH' | 'CARD' | 'TRANSFER' | 'OTHER', number>>
    byDay: { day: string; amount: number; count: number }[]
    topItems: { description: string; quantity: number; revenue: number }[]
  } | null
  scheduling: {
    total: number
    byStatus: Record<string, number>
    noShowRate: number
    byStaff: { name: string; completed: number; total: number }[]
  } | null
  inventory: { units: number; valueAtSalePrice: number; reservedUnits: number; lowStock: number } | null
  workOrders: {
    openByStatus: Record<string, number>
    created: number
    delivered: number
    rejected: number
    averageRepairHours: number | null
  } | null
}
