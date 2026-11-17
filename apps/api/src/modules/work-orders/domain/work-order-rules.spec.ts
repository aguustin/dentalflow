import { DomainError } from '../../../shared/contracts/errors/domain.error';
import { assertItemsEditable, assertTransition, WorkOrderStatus } from './work-order-rules';

const ok = { itemCount: 1, note: 'motivo' };

describe('work order rules', () => {
  it('follows the repair flow, with requote and rework loops', () => {
    const path: [WorkOrderStatus, WorkOrderStatus][] = [
      ['RECEIVED', 'DIAGNOSING'],
      ['DIAGNOSING', 'QUOTED'],
      ['QUOTED', 'DIAGNOSING'], // requote
      ['QUOTED', 'APPROVED'],
      ['APPROVED', 'IN_PROGRESS'],
      ['IN_PROGRESS', 'READY'],
      ['READY', 'IN_PROGRESS'], // rework
      ['READY', 'DELIVERED'],
      ['QUOTED', 'REJECTED'],
      ['REJECTED', 'DELIVERED'], // returned unrepaired
    ];
    for (const [from, to] of path) expect(() => assertTransition(from, to, ok)).not.toThrow();
  });

  it('rejects skipping steps and leaving final states', () => {
    const invalid: [WorkOrderStatus, WorkOrderStatus][] = [
      ['RECEIVED', 'QUOTED'],
      ['DIAGNOSING', 'APPROVED'],
      ['QUOTED', 'IN_PROGRESS'],
      ['APPROVED', 'DELIVERED'],
      ['READY', 'CANCELLED'], // work done: deliver instead
      ['DELIVERED', 'IN_PROGRESS'],
      ['CANCELLED', 'RECEIVED'],
      ['REJECTED', 'APPROVED'],
    ];
    for (const [from, to] of invalid) expect(() => assertTransition(from, to, ok)).toThrow(DomainError);
  });

  it('needs items to quote and a reason to cancel or reject', () => {
    expect(() => assertTransition('DIAGNOSING', 'QUOTED', { itemCount: 0 })).toThrow(/at least one/);
    expect(() => assertTransition('RECEIVED', 'CANCELLED', { itemCount: 0, note: '  ' })).toThrow(/reason/);
    expect(() => assertTransition('QUOTED', 'REJECTED', { itemCount: 2 })).toThrow(/reason/);
    expect(() => assertTransition('QUOTED', 'REJECTED', { itemCount: 2, note: 'Muy caro' })).not.toThrow();
  });

  it('items are editable only before quoting', () => {
    expect(() => assertItemsEditable('RECEIVED')).not.toThrow();
    expect(() => assertItemsEditable('DIAGNOSING')).not.toThrow();
    for (const s of ['QUOTED', 'APPROVED', 'IN_PROGRESS', 'READY', 'DELIVERED'] as const) {
      expect(() => assertItemsEditable(s)).toThrow(DomainError);
    }
  });
});
