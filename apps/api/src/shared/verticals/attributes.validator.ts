import { DomainError } from '../contracts/errors/domain.error';
import { AttributeField } from './vertical.types';

const MAX_TEXT_LENGTH = 500;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type Attributes = Record<string, string | number | boolean>;

/**
 * Validates and normalizes vertical-specific attributes against a field schema.
 * - Unknown keys are rejected.
 * - `null`/`undefined`/'' on a non-required field removes it.
 * - Throws DomainError('INVALID') listing every failing field.
 */
export function validateAttributes(fields: AttributeField[], input: unknown): Attributes {
  if (input === undefined || input === null) input = {};
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new DomainError('INVALID', 'attributes must be an object');
  }

  const raw = input as Record<string, unknown>;
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const errors: string[] = [];
  const result: Attributes = {};

  for (const key of Object.keys(raw)) {
    if (!byKey.has(key)) errors.push(`${key}: unknown attribute`);
  }

  for (const field of fields) {
    const value = raw[field.key];
    const empty = value === undefined || value === null || value === '';

    if (empty) {
      if (field.required) errors.push(`${field.key}: is required`);
      continue;
    }

    const error = checkType(field, value);
    if (error) {
      errors.push(`${field.key}: ${error}`);
      continue;
    }
    result[field.key] = typeof value === 'string' ? value.trim() : (value as number | boolean);
  }

  if (errors.length > 0) {
    throw new DomainError('INVALID', `Invalid attributes: ${errors.join('; ')}`, { errors });
  }
  return result;
}

function checkType(field: AttributeField, value: unknown): string | null {
  switch (field.type) {
    case 'text':
      if (typeof value !== 'string') return 'must be a string';
      return value.length > MAX_TEXT_LENGTH ? `must be at most ${MAX_TEXT_LENGTH} characters` : null;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? null : 'must be a number';
    case 'boolean':
      return typeof value === 'boolean' ? null : 'must be a boolean';
    case 'date': {
      if (typeof value !== 'string' || !ISO_DATE.test(value)) return 'must be a date (YYYY-MM-DD)';
      const d = new Date(`${value}T00:00:00Z`);
      return !isNaN(d.getTime()) && d.toISOString().startsWith(value) ? null : 'is not a valid date';
    }
    case 'select':
      return typeof value === 'string' && (field.options ?? []).includes(value)
        ? null
        : `must be one of: ${(field.options ?? []).join(', ')}`;
  }
}
