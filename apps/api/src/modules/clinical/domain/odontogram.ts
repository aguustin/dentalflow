import { DomainError } from '../../../shared/contracts/errors/domain.error';

/** Tooth surfaces: Oclusal/incisal, Mesial, Distal, Vestibular, Lingual/palatino */
export const SURFACES = ['O', 'M', 'D', 'V', 'L'] as const;
export type Surface = (typeof SURFACES)[number];

/**
 * Conditions recorded on the odontogram. Some only make sense for the whole tooth.
 * HEALTHY clears a previous condition (the log keeps the history).
 */
export const CONDITIONS = {
  HEALTHY: { wholeTooth: true, surface: true },
  CARIES: { wholeTooth: false, surface: true },
  FILLING: { wholeTooth: false, surface: true },
  SEALANT: { wholeTooth: false, surface: true },
  FRACTURE: { wholeTooth: true, surface: true },
  CROWN: { wholeTooth: true, surface: false },
  ROOT_CANAL: { wholeTooth: true, surface: false },
  IMPLANT: { wholeTooth: true, surface: false },
  MISSING: { wholeTooth: true, surface: false },
  EXTRACTION_NEEDED: { wholeTooth: true, surface: false },
} as const;
export type Condition = keyof typeof CONDITIONS;
export const CONDITION_KEYS = Object.keys(CONDITIONS) as Condition[];

/** FDI: permanent quadrants 1–4 with teeth 1–8; deciduous quadrants 5–8 with teeth 1–5. */
export function isValidTooth(tooth: number): boolean {
  if (!Number.isInteger(tooth)) return false;
  const quadrant = Math.floor(tooth / 10);
  const position = tooth % 10;
  if (quadrant >= 1 && quadrant <= 4) return position >= 1 && position <= 8;
  if (quadrant >= 5 && quadrant <= 8) return position >= 1 && position <= 5;
  return false;
}

export interface ToothEntry {
  tooth: number;
  surface: string | null;
  condition: string;
  notes?: string | null;
}

/** Validates a batch of odontogram entries, reporting every problem. */
export function validateToothEntries(entries: ToothEntry[]): void {
  const errors: string[] = [];
  const seen = new Set<string>();
  entries.forEach((e, i) => {
    const at = `entry ${i + 1} (tooth ${e.tooth})`;
    // The current state is "latest entry per tooth+surface": duplicates in one batch would be ambiguous
    const key = `${e.tooth}:${e.surface ?? '*'}`;
    if (seen.has(key)) errors.push(`${at}: duplicated tooth/surface in the same change`);
    seen.add(key);
    if (!isValidTooth(e.tooth)) errors.push(`${at}: invalid FDI tooth number`);
    if (e.surface !== null && !(SURFACES as readonly string[]).includes(e.surface)) {
      errors.push(`${at}: invalid surface '${e.surface}'`);
    }
    const rule = CONDITIONS[e.condition as Condition];
    if (!rule) {
      errors.push(`${at}: unknown condition '${e.condition}'`);
    } else if (e.surface === null && !rule.wholeTooth) {
      errors.push(`${at}: ${e.condition} must be recorded on a surface`);
    } else if (e.surface !== null && !rule.surface) {
      errors.push(`${at}: ${e.condition} applies to the whole tooth`);
    }
  });
  if (errors.length > 0) throw new DomainError('INVALID', errors.join('; '), { errors });
}
