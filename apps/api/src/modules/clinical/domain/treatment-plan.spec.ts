import { DomainError } from '../../../shared/contracts/errors/domain.error';
import { assertEditable, assertTransition, isBillable, planTotals, TreatmentItemStatus } from './treatment-plan';

describe('treatment plan items', () => {
  it('follows proposed → accepted → done, with discard and re-propose', () => {
    const ok: [TreatmentItemStatus, TreatmentItemStatus][] = [
      ['PROPOSED', 'ACCEPTED'],
      ['PROPOSED', 'DISCARDED'],
      ['ACCEPTED', 'DONE'],
      ['ACCEPTED', 'DISCARDED'],
      ['ACCEPTED', 'PROPOSED'],
      ['DISCARDED', 'PROPOSED'],
    ];
    for (const [from, to] of ok) expect(() => assertTransition(from, to)).not.toThrow();

    const invalid: [TreatmentItemStatus, TreatmentItemStatus][] = [
      ['PROPOSED', 'DONE'], // must be accepted first
      ['DONE', 'PROPOSED'], // done is final
      ['DONE', 'DISCARDED'],
      ['DISCARDED', 'DONE'],
      ['DISCARDED', 'ACCEPTED'],
    ];
    for (const [from, to] of invalid) expect(() => assertTransition(from, to)).toThrow(DomainError);
  });

  it('only proposals can be edited', () => {
    expect(() => assertEditable('PROPOSED')).not.toThrow();
    for (const s of ['ACCEPTED', 'DONE', 'DISCARDED'] as const) expect(() => assertEditable(s)).toThrow(DomainError);
  });

  it('bills only done items without a live sale', () => {
    expect(isBillable({ status: 'DONE', saleStatus: null })).toBe(true);
    expect(isBillable({ status: 'DONE', saleStatus: 'VOIDED' })).toBe(true);
    expect(isBillable({ status: 'DONE', saleStatus: 'DRAFT' })).toBe(false);
    expect(isBillable({ status: 'DONE', saleStatus: 'PAID' })).toBe(false);
    expect(isBillable({ status: 'ACCEPTED', saleStatus: null })).toBe(false);
  });

  it('computes quote, accepted, done and pending billing totals', () => {
    expect(
      planTotals([
        { status: 'PROPOSED', price: 100, saleStatus: null },
        { status: 'ACCEPTED', price: 200, saleStatus: null },
        { status: 'DONE', price: 300, saleStatus: null },
        { status: 'DONE', price: 400, saleStatus: 'PAID' },
        { status: 'DISCARDED', price: 500, saleStatus: null },
      ]),
    ).toEqual({ quoted: 1000, accepted: 900, done: 700, pendingBilling: 300 });
  });
});
