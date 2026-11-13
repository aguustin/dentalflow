import { PaymentMethod, SaleStatus } from '@dentalflow/types'

export const STATUS_LABELS: Record<SaleStatus, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Pendiente de pago',
  PARTIALLY_PAID: 'Pago parcial',
  PAID: 'Pagada',
  VOIDED: 'Anulada',
}

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
}
