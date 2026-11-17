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

export type TreatmentItemStatus = 'PROPOSED' | 'ACCEPTED' | 'DONE' | 'DISCARDED'

export interface TreatmentItem {
  id: string
  catalogItemId: string | null
  description: string
  tooth: number | null
  surface: ToothSurface | null
  /** cents */
  price: number
  status: TreatmentItemStatus
  doneAt: string | null
  sale: { id: string; number: number; status: string } | null
  /** Done and not billed by a live sale */
  billable: boolean
}

export interface TreatmentPlan {
  id: string
  title: string
  notes: string | null
  createdAt: string
  items: TreatmentItem[]
  /** cents */
  totals: { quoted: number; accepted: number; done: number; pendingBilling: number }
}

export interface ClinicalAttachment {
  id: string
  filename: string
  mimeType: string
  size: number
  description: string | null
  createdAt: string
}
