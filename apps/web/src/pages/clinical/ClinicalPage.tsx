import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClinicalNote, ClinicalRecord } from '@dentalflow/types'
import { api, ApiError } from '../../lib/api'
import { useOrganization } from '../../org/OrganizationContext'
import { AttributeFields, AttributeValues } from '../../components/AttributeFields'
import { Odontogram } from './Odontogram'
import { TreatmentsTab } from './TreatmentsTab'
import { AttachmentsTab } from './AttachmentsTab'

type Tab = 'anamnesis' | 'odontogram' | 'treatments' | 'notes' | 'attachments'

export function ClinicalPage() {
  const { id = '' } = useParams()
  const org = useOrganization()
  const [tab, setTab] = useState<Tab>('odontogram')
  const record = useQuery({
    queryKey: ['clinical', id],
    queryFn: () => api<ClinicalRecord>(`/clinical/${id}`),
    retry: false,
  })

  if (record.isPending) return <p className="muted">Cargando…</p>
  if (record.error) {
    const forbidden = record.error instanceof ApiError && record.error.status === 403
    return (
      <section>
        <Link to={`/customers/${id}`}>← Volver</Link>
        <p className={forbidden ? 'muted' : 'error'}>
          {forbidden ? 'Tu rol no tiene acceso a la historia clínica.' : `No se pudo cargar: ${record.error.message}`}
        </p>
      </section>
    )
  }

  const data = record.data
  const allergies = data.anamnesis.allergies

  return (
    <section>
      <Link to={`/customers/${id}`}>← {data.customer.name}</Link>
      <h1>Historia clínica · {data.customer.name}</h1>
      {allergies && (
        <p className="alert">
          ⚠ Alergias: <strong>{String(allergies)}</strong>
        </p>
      )}

      <div className="tabs">
        {(
          [
            ['odontogram', 'Odontograma'],
            ['treatments', 'Tratamientos'],
            ['anamnesis', 'Anamnesis'],
            ['notes', `Evolución (${data.notes.total})`],
            ['attachments', 'Adjuntos'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button key={key} className={tab === key ? 'tab active' : 'tab'} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'odontogram' && <Odontogram customerId={id} states={data.odontogram} canEdit />}
      {tab === 'anamnesis' && (
        <Anamnesis
          customerId={id}
          fields={org.vertical.clinical?.anamnesisFields ?? []}
          initial={data.anamnesis}
          updatedAt={data.anamnesisUpdatedAt}
        />
      )}
      {tab === 'notes' && <Notes customerId={id} first={data.notes} />}
      {tab === 'treatments' && <TreatmentsTab customerId={id} />}
      {tab === 'attachments' && <AttachmentsTab customerId={id} />}
    </section>
  )
}

function Anamnesis({
  customerId,
  fields,
  initial,
  updatedAt,
}: {
  customerId: string
  fields: NonNullable<ReturnType<typeof useOrganization>['vertical']['clinical']>['anamnesisFields']
  initial: AttributeValues
  updatedAt: string | null
}) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<AttributeValues>(initial)
  const [saved, setSaved] = useState(false)
  useEffect(() => setValues(initial), [initial])

  const save = useMutation({
    mutationFn: () => api<ClinicalRecord>(`/clinical/${customerId}/anamnesis`, { method: 'PUT', body: { anamnesis: values } }),
    onSuccess: (rec) => {
      queryClient.setQueryData(['clinical', customerId], rec)
      setSaved(true)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  return (
    <form className="form narrow" onSubmit={onSubmit}>
      {updatedAt && <p className="muted small">Última actualización: {new Date(updatedAt).toLocaleString('es-AR')}</p>}
      <AttributeFields
        fields={fields}
        values={values}
        onChange={(v) => {
          setSaved(false)
          setValues(v)
        }}
      />
      {save.error && <p className="error">{save.error.message}</p>}
      <div className="actions">
        <button type="submit" disabled={save.isPending}>
          Guardar anamnesis
        </button>
        {saved && <span className="muted">Guardado ✓</span>}
      </div>
    </form>
  )
}

const PAGE = 50

function Notes({ customerId, first }: { customerId: string; first: ClinicalRecord['notes'] }) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [extra, setExtra] = useState<ClinicalNote[]>([])
  const notes = [...first.items, ...extra]

  const add = useMutation({
    mutationFn: () => api<ClinicalNote>(`/clinical/${customerId}/notes`, { method: 'POST', body: { content } }),
    onSuccess: () => {
      setContent('')
      setExtra([])
      void queryClient.invalidateQueries({ queryKey: ['clinical', customerId] })
    },
  })
  const more = useMutation({
    mutationFn: () => api<{ items: ClinicalNote[] }>(`/clinical/${customerId}/notes?limit=${PAGE}&offset=${notes.length}`),
    onSuccess: (page) => setExtra((e) => [...e, ...page.items]),
  })

  return (
    <div>
      <form
        className="form narrow"
        onSubmit={(e) => {
          e.preventDefault()
          if (content.trim()) add.mutate()
        }}
      >
        <label>
          Nueva nota de evolución
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} maxLength={10000} required />
        </label>
        <p className="muted small">Las notas no se pueden editar ni borrar una vez guardadas.</p>
        {add.error && <p className="error">{add.error.message}</p>}
        <div className="actions">
          <button type="submit" disabled={add.isPending || !content.trim()}>
            Agregar nota
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="muted">Sin notas.</p>
      ) : (
        <ul className="notes">
          {notes.map((n) => (
            <li key={n.id}>
              <div className="muted small">
                {new Date(n.createdAt).toLocaleString('es-AR')} · {n.authorName}
              </div>
              <div className="note-content">{n.content}</div>
            </li>
          ))}
        </ul>
      )}
      {notes.length < first.total && (
        <button className="secondary" onClick={() => more.mutate()} disabled={more.isPending}>
          Ver más
        </button>
      )}
    </div>
  )
}
