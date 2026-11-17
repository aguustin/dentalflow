import { DomainError } from '../../../shared/contracts/errors/domain.error';

export type WorkOrderStatus =
  | 'RECEIVED'
  | 'DIAGNOSING'
  | 'QUOTED'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'READY'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED';

/**
 *  RECEIVED → DIAGNOSING → QUOTED → APPROVED → IN_PROGRESS → READY → DELIVERED
 *                 ▲           │                      ▲          │
 *                 └─ requote ─┤                      └ rework ──┘
 *                             └→ REJECTED → DELIVERED (equipment returned unrepaired)
 *  CANCELLED from any open state before READY.
 */
const TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  RECEIVED: ['DIAGNOSING', 'CANCELLED'],
  DIAGNOSING: ['QUOTED', 'CANCELLED'],
  QUOTED: ['APPROVED', 'REJECTED', 'DIAGNOSING', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY', 'CANCELLED'],
  READY: ['DELIVERED', 'IN_PROGRESS'],
  REJECTED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const OPEN_STATUSES: WorkOrderStatus[] = ['RECEIVED', 'DIAGNOSING', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'READY'];

export function allowedTransitions(from: WorkOrderStatus): WorkOrderStatus[] {
  return TRANSITIONS[from];
}

/**
 * Validates a transition and its preconditions:
 *  - a quote needs at least one item;
 *  - a cancellation or rejection needs a reason (the customer will ask why).
 */
export function assertTransition(
  from: WorkOrderStatus,
  to: WorkOrderStatus,
  ctx: { itemCount: number; note?: string | null },
): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new DomainError('CONFLICT', `Invalid work order transition: ${from} → ${to}`, {
      allowed: TRANSITIONS[from],
    });
  }
  if (to === 'QUOTED' && ctx.itemCount === 0) {
    throw new DomainError('INVALID', 'Add at least one part or labor item before quoting');
  }
  if ((to === 'CANCELLED' || to === 'REJECTED') && !ctx.note?.trim()) {
    throw new DomainError('INVALID', 'A reason is required to cancel or reject');
  }
}

/** Items (the quote) can only change before it is presented; to change it later, go back to diagnosis. */
export function assertItemsEditable(status: WorkOrderStatus): void {
  if (status !== 'RECEIVED' && status !== 'DIAGNOSING') {
    throw new DomainError(
      'CONFLICT',
      `Items can only be edited while receiving or diagnosing (status: ${status}). Go back to diagnosis to requote.`,
    );
  }
}
