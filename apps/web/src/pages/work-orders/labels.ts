import { WorkOrderStatus } from '@dentalflow/types'

export const WO_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  RECEIVED: 'Recibido',
  DIAGNOSING: 'En diagnóstico',
  QUOTED: 'Presupuestado',
  APPROVED: 'Aprobado',
  IN_PROGRESS: 'En reparación',
  READY: 'Listo para entregar',
  DELIVERED: 'Entregado',
  REJECTED: 'Presupuesto rechazado',
  CANCELLED: 'Cancelado',
}

/** Button text for moving TO a status. */
export const TRANSITION_LABELS: Record<WorkOrderStatus, string> = {
  RECEIVED: 'Recibir',
  DIAGNOSING: 'Pasar a diagnóstico',
  QUOTED: 'Presentar presupuesto',
  APPROVED: 'Cliente aprobó',
  IN_PROGRESS: 'Iniciar reparación',
  READY: 'Marcar listo',
  DELIVERED: 'Entregar',
  REJECTED: 'Cliente rechazó',
  CANCELLED: 'Cancelar orden',
}

export const BOARD_COLUMNS: WorkOrderStatus[] = ['RECEIVED', 'DIAGNOSING', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'READY']
