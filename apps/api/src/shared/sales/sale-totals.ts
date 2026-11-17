/**
 * Sale money math, shared because other modules (e.g. clinical treatment plans) create sales too.
 */
import { DomainError } from '../contracts/errors/domain.error';

/** All amounts are integers in minor units (cents). Never use floats for money. */

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
