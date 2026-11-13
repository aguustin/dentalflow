import { DomainError } from '../../../shared/contracts/errors/domain.error';

/** All amounts are integers in minor units (cents). Never use floats for money. */

export type SaleStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_PAID' | 'PAID' | 'VOIDED';

export interface LineInput {
  quantity: number;
  unitPrice: number;
  /** Discount on the whole line (not per unit) */
  discount?: number;
}

export interface LineTotals {
  gross: number;
  discount: number;
  total: number;
}

export interface SaleTotals {
  lines: LineTotals[];
  /** Σ gross (quantity × unit price) */
  subtotal: number;
  /** Σ line discounts + global discount */
  discountTotal: number;
  taxTotal: number;
  total: number;
}

const isNonNegativeInt = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;

/**
 * Totals of a sale.
 *   line total = quantity × unitPrice − line discount
 *   taxable    = Σ line totals − global discount
 *   tax        = round_half_up(taxable × taxRateBps / 10000)
 *   total      = taxable + tax
 */
export function computeSaleTotals(lines: LineInput[], globalDiscount = 0, taxRateBps = 0): SaleTotals {
  const errors: string[] = [];
  if (!isNonNegativeInt(globalDiscount)) errors.push('globalDiscount must be a non-negative integer');
  if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10_000) {
    errors.push('taxRateBps must be an integer between 0 and 10000');
  }

  const lineTotals = lines.map((line, i) => {
    const discount = line.discount ?? 0;
    const lineErrors = errors.length;
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) errors.push(`line ${i + 1}: quantity must be a positive integer`);
    if (!isNonNegativeInt(line.unitPrice)) errors.push(`line ${i + 1}: unitPrice must be a non-negative integer`);
    if (!isNonNegativeInt(discount)) errors.push(`line ${i + 1}: discount must be a non-negative integer`);
    const gross = line.quantity * line.unitPrice;
    // Only meaningful when the line values themselves are valid
    if (errors.length === lineErrors && discount > gross) errors.push(`line ${i + 1}: discount exceeds the line amount`);
    return { gross, discount, total: gross - discount };
  });

  const linesNet = lineTotals.reduce((sum, l) => sum + l.total, 0);
  if (globalDiscount > linesNet) errors.push('globalDiscount exceeds the sale amount');
  if (errors.length > 0) throw new DomainError('INVALID', errors.join('; '), { errors });

  const taxable = linesNet - globalDiscount;
  // Integer half-up rounding (taxable and bps are non-negative)
  const taxTotal = Math.floor((taxable * taxRateBps + 5_000) / 10_000);

  return {
    lines: lineTotals,
    subtotal: lineTotals.reduce((sum, l) => sum + l.gross, 0),
    discountTotal: lineTotals.reduce((sum, l) => sum + l.discount, 0) + globalDiscount,
    taxTotal,
    total: taxable + taxTotal,
  };
}

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
