import { DomainError } from '../../../shared/contracts/errors/domain.error';
import { computeSaleTotals } from '../../../shared/sales/sale-totals';
import { allocateSaleTotal, refundAmount } from './refund-rules';

describe('allocateSaleTotal', () => {
  it('splits proportionally and always adds up exactly to the sale total', () => {
    expect(allocateSaleTotal([1000, 2000], 3000)).toEqual([1000, 2000]);
    // 1000 left after a global discount of 200 on 400+800: 333.33 / 666.67
    expect(allocateSaleTotal([400, 800], 1000)).toEqual([333, 667]);
    const parts = allocateSaleTotal([333, 333, 334], 1001);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1001);
  });

  it('gives leftover cents to the largest remainders (ties to the first line)', () => {
    expect(allocateSaleTotal([1, 1, 1], 2)).toEqual([1, 1, 0]);
  });

  it('handles free lines and free sales', () => {
    expect(allocateSaleTotal([0, 500], 500)).toEqual([0, 500]);
    expect(allocateSaleTotal([0, 0], 0)).toEqual([0, 0]);
  });
});

describe('refundAmount', () => {
  it('refunds proportionally to the units returned', () => {
    expect(refundAmount({ share: 3000, quantity: 3, returnedQuantity: 0 }, 1)).toBe(1000);
    expect(refundAmount({ share: 3000, quantity: 3, returnedQuantity: 1 }, 2)).toBe(2000);
  });

  it('returning everything in any number of steps refunds exactly the share', () => {
    const line = { share: 1001, quantity: 3 }; // 333.67 per unit
    for (const steps of [[1, 1, 1], [2, 1], [1, 2], [3]]) {
      let returned = 0;
      let refunded = 0;
      for (const q of steps) {
        refunded += refundAmount({ ...line, returnedQuantity: returned }, q);
        returned += q;
      }
      expect(refunded).toBe(1001);
    }
  });

  it('end to end with a global discount and tax: full return = what was paid', () => {
    const lines = [
      { quantity: 2, unitPrice: 1_999 }, // 3998
      { quantity: 1, unitPrice: 5_000, discount: 1 }, // 4999
    ];
    const totals = computeSaleTotals(lines, 333, 2100); // 21% tax
    const shares = allocateSaleTotal(totals.lines.map((l) => l.total), totals.total);
    const refunded =
      refundAmount({ share: shares[0], quantity: 2, returnedQuantity: 0 }, 1) +
      refundAmount({ share: shares[0], quantity: 2, returnedQuantity: 1 }, 1) +
      refundAmount({ share: shares[1], quantity: 1, returnedQuantity: 0 }, 1);
    expect(refunded).toBe(totals.total);
  });

  it('rejects returning more than what is left, or non-positive quantities', () => {
    expect(() => refundAmount({ share: 100, quantity: 2, returnedQuantity: 2 }, 1)).toThrow(/0 unit/);
    expect(() => refundAmount({ share: 100, quantity: 2, returnedQuantity: 0 }, 3)).toThrow(DomainError);
    expect(() => refundAmount({ share: 100, quantity: 2, returnedQuantity: 0 }, 0)).toThrow(/positive/);
  });
});
