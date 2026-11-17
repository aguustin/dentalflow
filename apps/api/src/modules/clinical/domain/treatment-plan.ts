import { DomainError } from '../../../shared/contracts/errors/domain.error';

export type TreatmentItemStatus = 'PROPOSED' | 'ACCEPTED' | 'DONE' | 'DISCARDED';

/**
 *   PROPOSED ──▶ ACCEPTED ──▶ DONE
 *      │  ▲         │
 *      ▼  │         ▼
 *    DISCARDED ◀────┘          (a discarded item can be proposed again)
 */
const TRANSITIONS: Record<TreatmentItemStatus, TreatmentItemStatus[]> = {
  PROPOSED: ['ACCEPTED', 'DISCARDED'],
  ACCEPTED: ['DONE', 'DISCARDED', 'PROPOSED'],
  DONE: [],
  DISCARDED: ['PROPOSED'],
};

export function assertTransition(from: TreatmentItemStatus, to: TreatmentItemStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new DomainError('CONFLICT', `Invalid treatment item transition: ${from} → ${to}`);
  }
}

/** Price, tooth and surface can only change while the item is a proposal (the quote). */
export function assertEditable(status: TreatmentItemStatus): void {
  if (status !== 'PROPOSED') {
    throw new DomainError('CONFLICT', `Only proposed items can be edited (status: ${status})`);
  }
}

/**
 * Items that can be billed now: done, and not billed by a live sale
 * (an item whose sale was voided can be billed again).
 */
export function isBillable(item: { status: TreatmentItemStatus; saleStatus: string | null }): boolean {
  return item.status === 'DONE' && (item.saleStatus === null || item.saleStatus === 'VOIDED');
}

export interface PlanTotals {
  /** Quote: everything not discarded */
  quoted: number;
  accepted: number;
  done: number;
  pendingBilling: number;
}

export function planTotals(
  items: { status: TreatmentItemStatus; price: number; saleStatus: string | null }[],
): PlanTotals {
  const sum = (pred: (i: (typeof items)[number]) => boolean) =>
    items.filter(pred).reduce((total, i) => total + i.price, 0);
  return {
    quoted: sum((i) => i.status !== 'DISCARDED'),
    accepted: sum((i) => i.status === 'ACCEPTED' || i.status === 'DONE'),
    done: sum((i) => i.status === 'DONE'),
    pendingBilling: sum(isBillable),
  };
}
