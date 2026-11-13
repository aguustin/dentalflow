/** Clinical record (dental vertical): anamnesis, progress notes and odontogram. */

export type ToothSurface = 'O' | 'M' | 'D' | 'V' | 'L'

export type ToothConditionType =
  | 'HEALTHY'
  | 'CARIES'
  | 'FILLING'
  | 'SEALANT'
  | 'FRACTURE'
  | 'CROWN'
  | 'ROOT_CANAL'
  | 'IMPLANT'
  | 'MISSING'
  | 'EXTRACTION_NEEDED'

export interface ToothState {
  /** FDI tooth number */
  tooth: number
  /** null = whole tooth */
  surface: ToothSurface | null
  condition: ToothConditionType
  notes: string | null
  recordedAt: string
}

export interface ToothHistoryEntry {
  id: string
  tooth: number
  surface: ToothSurface | null
  condition: ToothConditionType
  notes: string | null
  createdAt: string
}

export interface ClinicalNote {
  id: string
  authorName: string
  content: string
  createdAt: string
}

export interface ClinicalRecord {
  customer: { id: string; name: string }
  anamnesis: Record<string, string | number | boolean>
  anamnesisUpdatedAt: string | null
  notes: { items: ClinicalNote[]; total: number }
  odontogram: ToothState[]
}
