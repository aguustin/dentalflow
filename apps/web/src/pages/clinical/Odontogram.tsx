import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ToothConditionType, ToothHistoryEntry, ToothState, ToothSurface } from '@dentalflow/types'
import { api } from '../../lib/api'

export const CONDITION_LABELS: Record<ToothConditionType, string> = {
  HEALTHY: 'Sano',
  CARIES: 'Caries',
  FILLING: 'Obturación',
  SEALANT: 'Sellador',
  FRACTURE: 'Fractura',
  CROWN: 'Corona',
  ROOT_CANAL: 'Tratamiento de conducto',
  IMPLANT: 'Implante',
  MISSING: 'Ausente',
  EXTRACTION_NEEDED: 'Extracción indicada',
}

const COLORS: Partial<Record<ToothConditionType, string>> = {
  CARIES: '#dc2626',
  FILLING: '#2563eb',
  SEALANT: '#16a34a',
  FRACTURE: '#ea580c',
  CROWN: '#9333ea',
  ROOT_CANAL: '#92400e',
  IMPLANT: '#6b7280',
  MISSING: '#111827',
  EXTRACTION_NEEDED: '#dc2626',
}

const SURFACE_LABELS: Record<ToothSurface, string> = {
  O: 'Oclusal / incisal',
  M: 'Mesial',
  D: 'Distal',
  V: 'Vestibular',
  L: 'Lingual / palatino',
}

/** Mirrors the API rules: which conditions apply to a surface vs the whole tooth. */
const SURFACE_CONDITIONS: ToothConditionType[] = ['HEALTHY', 'CARIES', 'FILLING', 'SEALANT', 'FRACTURE']
const WHOLE_CONDITIONS: ToothConditionType[] = [
  'HEALTHY',
  'CROWN',
  'ROOT_CANAL',
  'IMPLANT',
  'MISSING',
  'EXTRACTION_NEEDED',
  'FRACTURE',
]

// FDI rows as seen by the dentist facing the patient (patient's right on the left)
const PERMANENT = {
  upper: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  lower: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
}
const DECIDUOUS = {
  upper: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
  lower: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
}

type Region = 'top' | 'bottom' | 'left' | 'right' | 'center'
const POLYGONS: Record<Exclude<Region, 'center'>, string> = {
  top: '0,0 40,0 28,12 12,12',
  bottom: '0,40 40,40 28,28 12,28',
  left: '0,0 12,12 12,28 0,40',
  right: '40,0 28,12 28,28 40,40',
}

/** Vestibular faces out of the mouth; mesial faces the midline (flips by quadrant). */
function surfaceAt(tooth: number, region: Region): ToothSurface {
  const quadrant = Math.floor(tooth / 10)
  const upper = [1, 2, 5, 6].includes(quadrant)
  const rightSide = [1, 4, 5, 8].includes(quadrant) // drawn on the left half
  switch (region) {
    case 'center':
      return 'O'
    case 'top':
      return upper ? 'V' : 'L'
    case 'bottom':
      return upper ? 'L' : 'V'
    case 'left':
      return rightSide ? 'D' : 'M'
    case 'right':
      return rightSide ? 'M' : 'D'
  }
}

type Selection = { tooth: number; surface: ToothSurface | null }

export function Odontogram({
  customerId,
  states,
  canEdit,
}: {
  customerId: string
  states: ToothState[]
  canEdit: boolean
}) {
  const [deciduous, setDeciduous] = useState(false)
  const [selected, setSelected] = useState<Selection | null>(null)
  const rows = deciduous ? DECIDUOUS : PERMANENT

  const stateOf = (tooth: number, surface: ToothSurface | null) =>
    states.find((s) => s.tooth === tooth && s.surface === surface)

  return (
    <div>
      <div className="toolbar">
        <label className="checkbox">
          <input type="checkbox" checked={deciduous} onChange={(e) => setDeciduous(e.target.checked)} />
          Dentición temporal
        </label>
        <span className="muted small">Clic en una cara para registrarla, o en el número para la pieza entera.</span>
      </div>

      <div className="odontogram">
        {(['upper', 'lower'] as const).map((arch) => (
          <div key={arch} className="arch">
            {rows[arch].map((tooth) => (
              <Tooth
                key={tooth}
                tooth={tooth}
                upper={arch === 'upper'}
                whole={stateOf(tooth, null)}
                surfaceState={(s) => stateOf(tooth, s)}
                selected={selected?.tooth === tooth ? selected.surface : undefined}
                onSelect={(surface) => setSelected({ tooth, surface })}
              />
            ))}
          </div>
        ))}
      </div>

      <Legend />

      {selected && (
        <ToothPanel
          key={`${selected.tooth}-${selected.surface}`}
          customerId={customerId}
          selection={selected}
          current={stateOf(selected.tooth, selected.surface)}
          canEdit={canEdit}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function Tooth({
  tooth,
  upper,
  whole,
  surfaceState,
  selected,
  onSelect,
}: {
  tooth: number
  upper: boolean
  whole?: ToothState
  surfaceState: (s: ToothSurface) => ToothState | undefined
  /** undefined = not selected; null = whole tooth selected; surface = that surface */
  selected?: ToothSurface | null
  onSelect: (surface: ToothSurface | null) => void
}) {
  const fill = (region: Region) => {
    const s = surfaceState(surfaceAt(tooth, region))
    return s ? (COLORS[s.condition] ?? 'transparent') : 'transparent'
  }
  const stroke = (region: Region) => (selected === surfaceAt(tooth, region) ? 'var(--accent)' : 'var(--border-strong)')
  const wholeColor = whole ? COLORS[whole.condition] : undefined
  const crossed = whole?.condition === 'MISSING' || whole?.condition === 'EXTRACTION_NEEDED'

  const number = (
    <button
      type="button"
      className={selected === null ? 'tooth-number selected' : 'tooth-number'}
      style={wholeColor ? { color: wholeColor, fontWeight: 700 } : undefined}
      title={whole ? CONDITION_LABELS[whole.condition] : 'Pieza completa'}
      onClick={() => onSelect(null)}
    >
      {tooth}
    </button>
  )

  return (
    <div className="tooth">
      {upper && number}
      <svg viewBox="-1 -1 42 42" width="34" height="34" aria-label={`Pieza ${tooth}`}>
        {(Object.keys(POLYGONS) as (keyof typeof POLYGONS)[]).map((region) => (
          <polygon
            key={region}
            points={POLYGONS[region]}
            fill={fill(region)}
            stroke={stroke(region)}
            strokeWidth={1.5}
            onClick={() => onSelect(surfaceAt(tooth, region))}
          >
            <title>{SURFACE_LABELS[surfaceAt(tooth, region)]}</title>
          </polygon>
        ))}
        <rect
          x={12}
          y={12}
          width={16}
          height={16}
          fill={fill('center')}
          stroke={stroke('center')}
          strokeWidth={1.5}
          onClick={() => onSelect('O')}
        >
          <title>{SURFACE_LABELS.O}</title>
        </rect>
        {wholeColor && !crossed && (
          <rect x={0} y={0} width={40} height={40} fill="none" stroke={wholeColor} strokeWidth={4} pointerEvents="none" />
        )}
        {crossed && (
          <g stroke={wholeColor} strokeWidth={4} pointerEvents="none">
            <line x1={2} y1={2} x2={38} y2={38} />
            <line x1={38} y1={2} x2={2} y2={38} />
          </g>
        )}
      </svg>
      {!upper && number}
    </div>
  )
}

function Legend() {
  return (
    <div className="legend small">
      {(Object.keys(COLORS) as ToothConditionType[]).map((c) => (
        <span key={c}>
          <span className="dot" style={{ background: COLORS[c] }} />
          {CONDITION_LABELS[c]}
        </span>
      ))}
    </div>
  )
}

function ToothPanel({
  customerId,
  selection,
  current,
  canEdit,
  onClose,
}: {
  customerId: string
  selection: Selection
  current?: ToothState
  canEdit: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const options = selection.surface ? SURFACE_CONDITIONS : WHOLE_CONDITIONS
  const [condition, setCondition] = useState<ToothConditionType>(current?.condition ?? options[1])
  const [notes, setNotes] = useState('')

  const history = useQuery({
    queryKey: ['clinical', customerId, 'history', selection.tooth],
    queryFn: () => api<ToothHistoryEntry[]>(`/clinical/${customerId}/odontogram/history?tooth=${selection.tooth}`),
  })

  const save = useMutation({
    mutationFn: () =>
      api(`/clinical/${customerId}/odontogram`, {
        method: 'POST',
        body: { entries: [{ tooth: selection.tooth, surface: selection.surface, condition, notes: notes || undefined }] },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clinical', customerId] })
      onClose()
    },
  })

  const where = selection.surface ? `cara ${SURFACE_LABELS[selection.surface].toLowerCase()}` : 'pieza completa'

  return (
    <div className="card tooth-panel">
      <div className="toolbar">
        <h3>
          Pieza {selection.tooth} · {where}
        </h3>
        <button className="link" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <p>
        Estado actual: <strong>{current ? CONDITION_LABELS[current.condition] : 'Sin registro'}</strong>
        {current?.notes && <span className="muted"> · {current.notes}</span>}
      </p>
      {canEdit && (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <select value={condition} onChange={(e) => setCondition(e.target.value as ToothConditionType)} aria-label="Estado">
            {options.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABELS[c]}
              </option>
            ))}
          </select>
          <input placeholder="Nota (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          <button type="submit" disabled={save.isPending}>
            Registrar
          </button>
        </form>
      )}
      {save.error && <p className="error">{save.error.message}</p>}
      {!!history.data?.length && (
        <details>
          <summary className="small">Historial de la pieza ({history.data.length})</summary>
          <ul className="plain-list small">
            {history.data.map((h) => (
              <li key={h.id}>
                {new Date(h.createdAt).toLocaleDateString('es-AR')} · {h.surface ? SURFACE_LABELS[h.surface] : 'Pieza'} ·{' '}
                {CONDITION_LABELS[h.condition]}
                {h.notes && <span className="muted"> · {h.notes}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
