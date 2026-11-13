import { DomainError } from '../../../shared/contracts/errors/domain.error';
import {
  assertCanConfirm,
  assertCanPay,
  assertCanVoid,
  assertEditable,
  computeSaleTotals,
  statusAfterPayment,
} from './sale-rules';

describe('computeSaleTotals', () => {
  it('sums lines with quantity, line discounts and no tax', () => {
    const t = computeSaleTotals([
      { quantity: 2, unitPrice: 1500 }, // 3000
      { quantity: 1, unitPrice: 10000, discount: 2500 }, // 7500
    ]);
    expect(t.lines.map((l) => l.total)).toEqual([3000, 7500]);
    expect(t).toMatchObject({ subtotal: 13000, discountTotal: 2500, taxTotal: 0, total: 10500 });
  });

  it('applies the global discount after line discounts and before tax', () => {
    const t = computeSaleTotals([{ quantity: 1, unitPrice: 10000, discount: 1000 }], 2000, 2100);
    // taxable = 9000 - 2000 = 7000; tax 21% = 1470
    expect(t).toMatchObject({ subtotal: 10000, discountTotal: 3000, taxTotal: 1470, total: 8470 });
  });

  it('rounds tax half-up to the cent', () => {
    // 10.5% of 1001 = 105.105 → 105 ; 10.5% of 1010 = 106.05 → 106 ; 21% of 50 = 10.5 → 11
    expect(computeSaleTotals([{ quantity: 1, unitPrice: 1001 }], 0, 1050).taxTotal).toBe(105);
    expect(computeSaleTotals([{ quantity: 1, unitPrice: 1010 }], 0, 1050).taxTotal).toBe(106);
    expect(computeSaleTotals([{ quantity: 1, unitPrice: 50 }], 0, 2100).taxTotal).toBe(11);
  });

  it('allows a free sale and an empty draft', () => {
    expect(computeSaleTotals([{ quantity: 1, unitPrice: 5000, discount: 5000 }]).total).toBe(0);
    expect(computeSaleTotals([]).total).toBe(0);
  });

  it('rejects invalid input, reporting every problem', () => {
    const err = (() => {
      try {
        computeSaleTotals(
          [
            { quantity: 0, unitPrice: 100 },
            { quantity: 1.5, unitPrice: 100 },
            { quantity: 1, unitPrice: -1 },
            { quantity: 1, unitPrice: 10.5 },
            { quantity: 1, unitPrice: 100, discount: 101 },
          ],
          0,
          20000,
        );
      } catch (e) {
        return e as DomainError;
      }
    })();
    expect(err).toBeInstanceOf(DomainError);
    expect((err!.context!.errors as string[]).length).toBe(6);
  });

  it('rejects a global discount larger than the lines', () => {
    expect(() => computeSaleTotals([{ quantity: 1, unitPrice: 100 }], 101)).toThrow(/globalDiscount exceeds/);
  });
});

describe('sale state rules', () => {
  it('only drafts can be edited or confirmed, and confirming needs lines', () => {
    expect(() => assertEditable('DRAFT')).not.toThrow();
    expect(() => assertEditable('CONFIRMED')).toThrow(DomainError);
    expect(() => assertCanConfirm('DRAFT', 1)).not.toThrow();
    expect(() => assertCanConfirm('DRAFT', 0)).toThrow(/at least one line/);
    expect(() => assertCanConfirm('PAID', 2)).toThrow(DomainError);
  });

  it('accepts payments up to the balance on confirmed or partially paid sales', () => {
    expect(() => assertCanPay('CONFIRMED', 1000, 0, 1000)).not.toThrow();
    expect(() => assertCanPay('PARTIALLY_PAID', 1000, 600, 400)).not.toThrow();
    expect(() => assertCanPay('PARTIALLY_PAID', 1000, 600, 401)).toThrow(/exceeds the outstanding balance/);
    expect(() => assertCanPay('CONFIRMED', 1000, 0, 0)).toThrow(/positive/);
    expect(() => assertCanPay('CONFIRMED', 1000, 0, 10.5)).toThrow(/positive integer/);
    for (const status of ['DRAFT', 'PAID', 'VOIDED'] as const) {
      expect(() => assertCanPay(status, 1000, 0, 100)).toThrow(/only accepted/);
    }
  });

  it('derives the status from the amount paid', () => {
    expect(statusAfterPayment(1000, 0)).toBe('CONFIRMED');
    expect(statusAfterPayment(1000, 1)).toBe('PARTIALLY_PAID');
    expect(statusAfterPayment(1000, 1000)).toBe('PAID');
    expect(statusAfterPayment(0, 0)).toBe('CONFIRMED');
  });

  it('voids only sales without payments', () => {
    expect(() => assertCanVoid('DRAFT', 0)).not.toThrow();
    expect(() => assertCanVoid('CONFIRMED', 0)).not.toThrow();
    expect(() => assertCanVoid('PARTIALLY_PAID', 100)).toThrow(/with payments/);
    expect(() => assertCanVoid('VOIDED', 0)).toThrow(/already voided/);
  });
});
