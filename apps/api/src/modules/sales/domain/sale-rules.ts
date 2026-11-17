import { DomainError } from '../../../shared/contracts/errors/domain.error';

export * from '../../../shared/sales/sale-totals';

export type SaleStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_PAID' | 'PAID' | 'VOIDED';

// ── State rules ─────────────────────────────────────────────────────────────
//   DRAFT ──confirm──▶ CONFIRMED ──pay──▶ PARTIALLY_PAID ──pay──▶ PAID
//     │                   │                                        ▲
//     └──void──▶ VOIDED ◀─┘ (only without payments)    CONFIRMED ──┘ (full payment)

export function assertEditable(status: SaleStatus): void {
  if (status !== 'DRAFT') throw new DomainError('CONFLICT', `Only draft sales can be edited (status: ${status})`);
}

export function assertCanConfirm(status: SaleStatus, lineCount: number): void {
  if (status !== 'DRAFT') throw new DomainError('CONFLICT', `Only draft sales can be confirmed (status: ${status})`);
  if (lineCount === 0) throw new DomainError('INVALID', 'A sale needs at least one line to be confirmed');
}

export function assertCanPay(status: SaleStatus, total: number, paidTotal: number, amount: number): void {
  if (status !== 'CONFIRMED' && status !== 'PARTIALLY_PAID') {
    throw new DomainError('CONFLICT', `Payments are only accepted on confirmed, unpaid sales (status: ${status})`);
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new DomainError('INVALID', 'Payment amount must be a positive integer');
  }
  if (amount > total - paidTotal) {
    throw new DomainError('INVALID', `Payment exceeds the outstanding balance (${total - paidTotal})`);
  }
}

/** Status implied by the amount paid on a confirmed sale. */
export function statusAfterPayment(total: number, paidTotal: number): SaleStatus {
  if (paidTotal <= 0) return 'CONFIRMED';
  return paidTotal >= total ? 'PAID' : 'PARTIALLY_PAID';
}

/** Voiding is only allowed before any payment; refunds come with returns (Phase 7). */
export function assertCanVoid(status: SaleStatus, paidTotal: number): void {
  if (status === 'VOIDED') throw new DomainError('CONFLICT', 'Sale is already voided');
  if (paidTotal > 0) throw new DomainError('CONFLICT', 'Sales with payments cannot be voided');
}
