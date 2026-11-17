import { DomainError } from '../../../shared/contracts/errors/domain.error';

export interface VariantAxis {
  /** e.g. "Talle" */
  name: string;
  /** e.g. ["S", "M", "L"] */
  values: string[];
}

export type VariantOptions = Record<string, string>;

export interface PlannedVariant {
  options: VariantOptions;
  /** "Remera básica · M / Rojo" */
  name: string;
  /** "REM-M-ROJO" (null when the group has no SKU prefix) */
  sku: string | null;
}

const MAX_VARIANTS = 300;

/** Stable key of an option set, independent of property order: "Color=Rojo|Talle=M". */
export function optionsKey(options: VariantOptions): string {
  return Object.keys(options)
    .sort()
    .map((k) => `${k}=${options[k]}`)
    .join('|');
}

/** "Azul marino" → "AZULMARINO"; accents removed so SKUs are scanner/keyboard friendly. */
function skuPart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Plans every combination of the axes (cartesian product), skipping the ones that
 * already exist — so generating again after adding a size only creates the new ones.
 */
export function planVariants(
  group: { name: string; skuPrefix?: string | null },
  axes: VariantAxis[],
  existing: VariantOptions[] = [],
): PlannedVariant[] {
  const clean = axes.map((a) => ({
    name: a.name.trim(),
    values: [...new Set(a.values.map((v) => v.trim()).filter(Boolean))],
  }));
  const errors: string[] = [];
  if (clean.length === 0) errors.push('At least one axis is required');
  if (new Set(clean.map((a) => a.name.toLowerCase())).size !== clean.length) errors.push('Axis names must be unique');
  clean.forEach((a, i) => {
    if (!a.name) errors.push(`axis ${i + 1}: name is required`);
    if (a.values.length === 0) errors.push(`axis ${a.name || i + 1}: at least one value is required`);
  });
  if (errors.length > 0) throw new DomainError('INVALID', errors.join('; '), { errors });

  const total = clean.reduce((n, a) => n * a.values.length, 1);
  if (total > MAX_VARIANTS) {
    throw new DomainError('INVALID', `Too many combinations (${total}); the maximum is ${MAX_VARIANTS}`);
  }

  let combos: VariantOptions[] = [{}];
  for (const axis of clean) {
    combos = combos.flatMap((c) => axis.values.map((v) => ({ ...c, [axis.name]: v })));
  }

  const taken = new Set(existing.map(optionsKey));
  const prefix = group.skuPrefix?.trim() ? skuPart(group.skuPrefix) : null;
  return combos
    .filter((o) => !taken.has(optionsKey(o)))
    .map((options) => {
      const values = clean.map((a) => options[a.name]);
      return {
        options,
        name: `${group.name} · ${values.join(' / ')}`,
        sku: prefix ? [prefix, ...values.map(skuPart)].join('-') : null,
      };
    });
}
