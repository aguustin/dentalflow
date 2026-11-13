import { validateAttributes } from './attributes.validator';
import { AttributeField } from './vertical.types';
import { DomainError } from '../contracts/errors/domain.error';

const fields: AttributeField[] = [
  { key: 'plate', label: 'Patente', type: 'text', required: true },
  { key: 'km', label: 'Km', type: 'number' },
  { key: 'birthDate', label: 'Nacimiento', type: 'date' },
  { key: 'fuel', label: 'Combustible', type: 'select', options: ['nafta', 'diesel'] },
  { key: 'gnc', label: 'GNC', type: 'boolean' },
];

function errorsOf(input: unknown): string[] {
  try {
    validateAttributes(fields, input);
    return [];
  } catch (e) {
    expect(e).toBeInstanceOf(DomainError);
    return ((e as DomainError).context?.errors as string[]) ?? [(e as Error).message];
  }
}

describe('validateAttributes', () => {
  it('accepts valid values, trims strings and drops empty optional fields', () => {
    expect(
      validateAttributes(fields, {
        plate: '  AB123CD ',
        km: 0,
        birthDate: '1990-02-28',
        fuel: 'diesel',
        gnc: false,
      }),
    ).toEqual({ plate: 'AB123CD', km: 0, birthDate: '1990-02-28', fuel: 'diesel', gnc: false });

    expect(validateAttributes(fields, { plate: 'X', km: null, fuel: '' })).toEqual({ plate: 'X' });
  });

  it('reports every invalid field at once', () => {
    const errors = errorsOf({
      km: '10',
      birthDate: '2023-02-30',
      fuel: 'electric',
      gnc: 'yes',
      color: 'red',
    });
    expect(errors).toHaveLength(6);
    expect(errors.join()).toMatch(/color: unknown/);
    expect(errors.join()).toMatch(/plate: is required/);
    expect(errors.join()).toMatch(/birthDate: is not a valid date/);
  });

  it('rejects non-object input', () => {
    expect(errorsOf([])).toEqual(['attributes must be an object']);
    expect(errorsOf('x')).toEqual(['attributes must be an object']);
  });

  it('treats missing input as empty object', () => {
    expect(validateAttributes(fields.slice(1), undefined)).toEqual({});
  });
});
