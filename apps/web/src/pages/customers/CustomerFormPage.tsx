import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Customer } from '@dentalflow/types'
import { useOrganization } from '../../org/OrganizationContext'
import { AttributeFields, AttributeValues } from '../../components/AttributeFields'

interface FormState {
  name: string
  documentId: string
  phone: string
  email: string
  attributes: AttributeValues
}

const EMPTY: FormState = { name: '', documentId: '', phone: '', email: '', attributes: {} }

/** Create (/customers/new) and edit (/customers/:id) a customer. */
export function CustomerFormPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const org = useOrganization()
  const terms = org.vertical.terminology.customer

  const existing = useQuery({
    queryKey: ['customers', id],
    queryFn: () => api<Customer>(`/customers/${id}`),
    enabled: !isNew,
  })

  const [form, setForm] = useState<FormState>(EMPTY)
  useEffect(() => {
    if (existing.data) {
      const c = existing.data
      setForm({
        name: c.name,
        documentId: c.documentId ?? '',
        phone: c.phone ?? '',
        email: c.email ?? '',
        attributes: c.attributes ?? {},
      })
    }
  }, [existing.data])

  const save = useMutation({
    mutationFn: () => {
      // Empty optional fields: omitted on create, cleared (null) on update
      const empty = isNew ? undefined : null
      const body = {
        name: form.name.trim(),
        documentId: form.documentId.trim() || empty,
        phone: form.phone.trim() || empty,
        email: form.email.trim() || empty,
        attributes: form.attributes,
      }
      return isNew
        ? api<Customer>('/customers', { method: 'POST', body })
        : api<Customer>(`/customers/${id}`, { method: 'PUT', body })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      navigate('/customers')
    },
  })

  const remove = useMutation({
    mutationFn: () => api(`/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
      navigate('/customers')
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  function onDelete() {
    const ok = window.confirm(
      `¿Eliminar a ${form.name}? También se eliminarán todos sus turnos. Esta acción no se puede deshacer.`,
    )
    if (ok) remove.mutate()
  }

  if (!isNew && existing.isPending) return <p className="muted">Cargando…</p>
  if (!isNew && existing.error)
    return (
      <section>
        <p className="error">No se pudo cargar: {existing.error.message}</p>
        <Link to="/customers">Volver</Link>
      </section>
    )

  const set = (field: keyof Omit<FormState, 'attributes'>) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))
  const error = save.error ?? remove.error

  return (
    <section>
      <Link to="/customers">← Volver</Link>
      <h1>{isNew ? `Nuevo ${terms.singular.toLowerCase()}` : form.name || terms.singular}</h1>

      <form className="form narrow" onSubmit={onSubmit}>
        <label>
          Nombre *
          <input value={form.name} onChange={set('name')} required minLength={2} maxLength={200} autoFocus />
        </label>
        <label>
          Documento
          <input value={form.documentId} onChange={set('documentId')} maxLength={100} />
        </label>
        <label>
          Teléfono
          <input value={form.phone} onChange={set('phone')} maxLength={50} />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} />
        </label>

        {org.vertical.customerAttributes.length > 0 && (
          <fieldset>
            <legend>Datos de {terms.singular.toLowerCase()}</legend>
            <AttributeFields
              fields={org.vertical.customerAttributes}
              values={form.attributes}
              onChange={(attributes) => setForm((f) => ({ ...f, attributes }))}
            />
          </fieldset>
        )}

        {error && <p className="error">{error.message}</p>}
        <div className="actions">
          <button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar'}
          </button>
          {!isNew && (
            <button type="button" className="danger" onClick={onDelete} disabled={remove.isPending}>
              {remove.isPending ? 'Eliminando…' : 'Eliminar'}
            </button>
          )}
        </div>
      </form>
    </section>
  )
}
