import { DomainError } from '../../../shared/contracts/errors/domain.error';
import { optionsKey, planVariants } from './variants';

const group = { name: 'Remera básica', skuPrefix: 'rem' };

describe('planVariants', () => {
  it('creates every combination with readable names and scanner-friendly SKUs', () => {
    const plan = planVariants(group, [
      { name: 'Talle', values: ['S', 'M'] },
      { name: 'Color', values: ['Rojo', 'Azul marino'] },
    ]);
    expect(plan.map((v) => v.name)).toEqual([
      'Remera básica · S / Rojo',
      'Remera básica · S / Azul marino',
      'Remera básica · M / Rojo',
      'Remera básica · M / Azul marino',
    ]);
    expect(plan.map((v) => v.sku)).toEqual(['REM-S-ROJO', 'REM-S-AZULMARINO', 'REM-M-ROJO', 'REM-M-AZULMARINO']);
    expect(plan[0].options).toEqual({ Talle: 'S', Color: 'Rojo' });
  });

  it('skips existing combinations, so it can be re-run after adding a value', () => {
    const plan = planVariants(
      group,
      [
        { name: 'Talle', values: ['S', 'M', 'L'] },
        { name: 'Color', values: ['Rojo'] },
      ],
      [
        { Color: 'Rojo', Talle: 'S' }, // different key order, same combination
        { Talle: 'M', Color: 'Rojo' },
      ],
    );
    expect(plan.map((v) => v.options)).toEqual([{ Talle: 'L', Color: 'Rojo' }]);
  });

  it('removes accents in SKUs, trims and de-duplicates values, no prefix means no SKU', () => {
    const plan = planVariants({ name: 'Celular' }, [{ name: 'Capacidad', values: [' 128 GB', '128 GB', 'Único'] }]);
    expect(plan.map((v) => v.name)).toEqual(['Celular · 128 GB', 'Celular · Único']);
    expect(plan.every((v) => v.sku === null)).toBe(true);
    expect(planVariants({ name: 'X', skuPrefix: 'x' }, [{ name: 'A', values: ['Único'] }])[0].sku).toBe('X-UNICO');
  });

  it('rejects empty or duplicated axes and too many combinations', () => {
    expect(() => planVariants(group, [])).toThrow(DomainError);
    expect(() => planVariants(group, [{ name: 'Talle', values: [' '] }])).toThrow(/at least one value/);
    expect(() =>
      planVariants(group, [
        { name: 'Talle', values: ['S'] },
        { name: 'talle', values: ['M'] },
      ]),
    ).toThrow(/unique/);
    const many = Array.from({ length: 20 }, (_, i) => String(i));
    expect(() =>
      planVariants(group, [
        { name: 'A', values: many },
        { name: 'B', values: many },
      ]),
    ).toThrow(/Too many combinations/);
  });

  it('optionsKey ignores property order', () => {
    expect(optionsKey({ b: '2', a: '1' })).toBe(optionsKey({ a: '1', b: '2' }));
  });
});
