/** Repair verticals: customer equipment and work orders. Amounts in cents. */

export type WorkOrderStatus =
  | 'RECEIVED'
  | 'DIAGNOSING'
  | 'QUOTED'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'READY'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED'

export interface Asset {
  id: string
  customerId: string
  customerName: string
  label: string
  attributes: Record<string, string | number | boolean>
  isActive: boolean
  createdAt: string
}

export interface AssetDetail extends Asset {
  workOrders: { id: string; number: number; status: WorkOrderStatus; reportedIssue: string; createdAt: string }[]
}

export interface WorkOrderSummary {
  id: string
  number: number
  status: WorkOrderStatus
  customerName: string
  assetLabel: string | null
  staffName: string | null
  reportedIssue: string
  itemsTotal: number
  createdAt: string
  updatedAt: string
}

export interface WorkOrderItem {
  id: string
  catalogItemId: string | null
  /** PRODUCT = part, SERVICE = labor, null = free text */
  kind: 'PRODUCT' | 'SERVICE' | null
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface WorkOrderEvent {
  id: string
  fromStatus: WorkOrderStatus | null
  toStatus: WorkOrderStatus
  note: string | null
  userName: string
  createdAt: string
}

export interface WorkOrderDetail {
  id: string
  number: number
  status: WorkOrderStatus
  allowedTransitions: WorkOrderStatus[]
  customer: { id: string; name: string; phone: string | null }
  asset: { id: string; label: string; attributes: Record<string, string | number | boolean> } | null
  staff: { id: string; name: string } | null
  reportedIssue: string
  diagnosis: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  items: WorkOrderItem[]
  totals: { subtotal: number; taxRateBps: number; taxTotal: number; total: number }
  events: WorkOrderEvent[]
}
