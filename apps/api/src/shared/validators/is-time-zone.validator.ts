import { ValidateBy, ValidationOptions } from 'class-validator';
import { IANAZone } from 'luxon';

/** Validates an IANA time zone name, e.g. "America/Argentina/Buenos_Aires". */
export function IsTimeZone(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isTimeZone',
      validator: {
        validate: (value: unknown) => typeof value === 'string' && IANAZone.isValidZone(value),
        defaultMessage: () => '$property must be a valid IANA time zone',
      },
    },
    options,
  );
}
