import { DomainError } from '../../../shared/contracts/errors/domain.error';

/**
 * Refund math for returns. Amounts are integers in cents.
 *
 * What the customer paid for a line is not just `line.total`: the sale's global discount and
 * tax are spread over the lines. So:
 *   1. allocateSaleTotal: split sale.total across lines proportionally to their totals
 *      (largest-remainder rounding → the parts add up EXACTLY to sale.total);
 *   2. refundAmount: refund for returning `q` units when `r` were already returned is
 *      share(r + q) − share(r), with share(k) = round(lineShare · k / quantity).
 *      Cumulative by construction: returning everything, in any number of steps,
 *      refunds exactly the line share — never a cent more or less.
 */

export function allocateSaleTotal(lineTotals: number[], saleTotal: number): number[] {
  const base = lineTotals.reduce((a, b) => a + b, 0);
  if (base === 0) {
    // Nothing to weigh by (all lines free): only possible when saleTotal is 0 too
    return lineTotals.map(() => 0);
  }
  const exact = lineTotals.map((t) => (t * saleTotal) / base);
  const floors = exact.map(Math.floor);
  let remainder = saleTotal - floors.reduce((a, b) => a + b, 0);
  // Give the leftover cents to the largest fractional parts (ties: earlier line first)
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] += 1;
    remainder -= 1;
  }
  return floors;
}

export function refundAmount(
  line: { share: number; quantity: number; returnedQuantity: number },
  quantity: number,
): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new DomainError('INVALID', 'Return quantity must be a positive integer');
  }
  const after = line.returnedQuantity + quantity;
  if (after > line.quantity) {
    throw new DomainError(
      'INVALID',
      `Only ${line.quantity - line.returnedQuantity} unit(s) of this line can still be returned`,
    );
  }
  const shareFor = (k: number) => Math.round((line.share * k) / line.quantity);
  return shareFor(after) - shareFor(line.returnedQuantity);
}
