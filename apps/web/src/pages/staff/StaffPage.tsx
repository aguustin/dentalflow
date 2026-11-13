import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Resource, StaffMember } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useTerms } from '../../org/OrganizationContext'
import { summarizeHours } from './hours'

export function StaffPage() {
  const terms = useTerms()
  const [showInactive, setShowInactive] = useState(false)
  const staff = useQuery({
    queryKey: ['staff', { showInactive }],
    queryFn: () => api<StaffMember[]>(`/staff?includeInactive=${showInactive}`),
  })

  return (
    <section>
      <div className="toolbar">
        <h1>{terms.staff.plural}</h1>
        <Link className="button" to="/staff/new">
          Nuevo {terms.staff.singular.toLowerCase()}
        </Link>
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Mostrar inactivos
      </label>

      {staff.isPending ? (
        <p className="muted">Cargando…</p>
      ) : staff.error ? (
        <p className="error">No se pudo cargar: {staff.error.message}</p>
      ) : staff.data.length === 0 ? (
        <p className="muted">
          Todavía no cargaste {terms.staff.plural.toLowerCase()}. Necesitás al menos uno para dar{' '}
          {terms.appointment.plural.toLowerCase()}.
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Especialidad</th>
              <th>Horario</th>
            </tr>
          </thead>
          <tbody>
            {staff.data.map((m) => (
              <tr key={m.id} className={m.isActive ? undefined : 'inactive'}>
                <td>
                  <span className="dot" style={{ background: m.color }} />
                  <Link to={`/staff/${m.id}`}>{m.name}</Link>
                  {!m.isActive && <span className="muted"> (inactivo)</span>}
                </td>
                <td>{m.specialty ?? '—'}</td>
                <td className="small">{summarizeHours(m.workingHours) || <span className="muted">Sin horario</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Resources />
    </section>
  )
}

function Resources() {
  const terms = useTerms().resource
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const resources = useQuery({
    queryKey: ['resources'],
    queryFn: () => api<Resource[]>('/resources?includeInactive=true'),
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['resources'] })

  const create = useMutation({
    mutationFn: () => api('/resources', { method: 'POST', body: { name: name.trim() } }),
    onSuccess: () => {
      setName('')
      void invalidate()
    },
  })
  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; isActive?: boolean }) =>
      api(`/resources/${id}`, { method: 'PUT', body }),
    onSuccess: () => void invalidate(),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (name.trim()) create.mutate()
  }

  function rename(r: Resource) {
    const next = window.prompt(`Nuevo nombre para ${r.name}`, r.name)?.trim()
    if (next && next !== r.name) update.mutate({ id: r.id, name: next })
  }

  return (
    <div className="section">
      <h2>{terms.plural}</h2>
      <p className="muted small">Opcional: asignalos a los turnos para que no se reserven dos veces al mismo tiempo.</p>
      {resources.data?.length ? (
        <ul className="plain-list">
          {resources.data.map((r) => (
            <li key={r.id} className={r.isActive ? undefined : 'inactive'}>
              {r.name}
              {!r.isActive && <span className="muted"> (inactivo)</span>}
              <button className="link" onClick={() => rename(r)}>
                Renombrar
              </button>
              <button className="link" onClick={() => update.mutate({ id: r.id, isActive: !r.isActive })}>
                {r.isActive ? 'Desactivar' : 'Activar'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !resources.isPending && <p className="muted">Sin {terms.plural.toLowerCase()}.</p>
      )}
      <form className="row narrow" onSubmit={onSubmit}>
        <input placeholder={`Nuevo ${terms.singular.toLowerCase()}`} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" disabled={create.isPending || !name.trim()}>
          Agregar
        </button>
      </form>
      {(create.error ?? update.error) && <p className="error">{(create.error ?? update.error)!.message}</p>}
    </div>
  )
}
