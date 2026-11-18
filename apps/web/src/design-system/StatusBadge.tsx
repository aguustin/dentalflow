import { Activity, AlertTriangle, CheckCheck, CheckCircle2, Clock, LucideIcon, XCircle } from 'lucide-react'
import {
  AppointmentStatus,
  SaleStatus,
  TreatmentItemStatus,
  WorkOrderStatus,
} from '@dentalflow/types'

/** Shared status categories (docs/product/design-system.md §7). Color + icon + text, never color alone. */
export type StatusCategory = 'pending' | 'confirmed' | 'progress' | 'done' | 'cancelled' | 'problem'

const ICONS: Record<StatusCategory, LucideIcon> = {
  pending: Clock,
  confirmed: CheckCircle2,
  progress: Activity,
  done: CheckCheck,
  cancelled: XCircle,
  problem: AlertTriangle,
}

export const APPOINTMENT_CATEGORY: Record<AppointmentStatus, StatusCategory> = {
  SCHEDULED: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'done',
  CANCELLED: 'cancelled',
  NO_SHOW: 'problem',
}

export const SALE_CATEGORY: Record<SaleStatus, StatusCategory> = {
  DRAFT: 'pending',
  CONFIRMED: 'confirmed',
  PARTIALLY_PAID: 'progress',
  PAID: 'done',
  VOIDED: 'cancelled',
}

export const WORK_ORDER_CATEGORY: Record<WorkOrderStatus, StatusCategory> = {
  RECEIVED: 'pending',
  DIAGNOSING: 'progress',
  QUOTED: 'pending',
  APPROVED: 'confirmed',
  IN_PROGRESS: 'progress',
  READY: 'done',
  DELIVERED: 'done',
  REJECTED: 'cancelled',
  CANCELLED: 'cancelled',
}

export const TREATMENT_CATEGORY: Record<TreatmentItemStatus, StatusCategory> = {
  PROPOSED: 'pending',
  ACCEPTED: 'confirmed',
  DONE: 'done',
  DISCARDED: 'cancelled',
}

export function StatusBadge({ category, label }: { category: StatusCategory; label: string }) {
  const Icon = ICONS[category]
  return (
    <span className={`status status-${category}`}>
      <Icon size={13} strokeWidth={2.25} aria-hidden />
      {label}
    </span>
  )
}
