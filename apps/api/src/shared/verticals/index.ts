import { DENTAL_VERTICAL } from './dental.vertical';
import { REPAIR_MECHANIC_VERTICAL, REPAIR_TECH_VERTICAL } from './repair.verticals';
import { RETAIL_CLOTHING_VERTICAL, RETAIL_TECH_VERTICAL } from './retail.verticals';
import { VerticalTemplate } from './vertical.types';

export * from './vertical.types';
export * from './attributes.validator';

/** Registry of available verticals. Add a new template file and register it here. */
export const VERTICALS: Record<string, VerticalTemplate> = {
  [DENTAL_VERTICAL.key]: DENTAL_VERTICAL,
  [REPAIR_MECHANIC_VERTICAL.key]: REPAIR_MECHANIC_VERTICAL,
  [REPAIR_TECH_VERTICAL.key]: REPAIR_TECH_VERTICAL,
  [RETAIL_CLOTHING_VERTICAL.key]: RETAIL_CLOTHING_VERTICAL,
  [RETAIL_TECH_VERTICAL.key]: RETAIL_TECH_VERTICAL,
};

export const VERTICAL_KEYS = Object.keys(VERTICALS);
export const DEFAULT_VERTICAL = DENTAL_VERTICAL.key;

export function getVertical(key: string): VerticalTemplate {
  const vertical = VERTICALS[key];
  if (!vertical) throw new Error(`Unknown vertical '${key}'`);
  return vertical;
}
