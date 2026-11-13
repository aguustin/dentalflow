import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Member, StaffDetail, WorkingHoursRange } from '@dentalflow/types'
import { api } from '../../lib/api'
import { formatDay, toDateInput } from '../../lib/dates'
import { useTerms } from '../../org/OrganizationContext'
import { minuteToTime, timeToMinute, WEEKDAYS } from './hours'

/** Create (/staff/new) and edit (/staff/:id) a staff member. Hours and time off only when editing. */
export function StaffFormPage() {
  const { id } = useParams()
  const isNew = !id
  const allTerms = useTerms()
  const terms = allTerms.staff
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const existing = useQuery({
    queryKey: ['staff', id],
    queryFn: () => api<StaffDetail>(`/staff/${id}`),
    enabled: !isNew,
  })
  // Linking to a user is optional; roles without users.read just don't see the field
  const members = useQuery({
    queryKey: ['members'],
    queryFn: () => api<Member[]>('/organizations/members'),
    retry: false,
  })

  const [form, setForm] = useState({ name: '', specialty: '', color: '#2563eb', userId: '', isActive: true })
  useEffect(() => {
    const s = existing.data
    if (s) setForm({ name: s.name, specialty: s.specialty ?? '', color: s.color, userId: s.userId ?? '', isActive: s.isActive })
  }, [existing.data])

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        specialty: form.specialty.trim() || (isNew ? undefined : null),
        color: form.color,
        userId: form.userId || (isNew ? undefined : null),
        ...(!isNew && { isActive: form.isActive }),
      }
      return isNew
        ? api<StaffDetail>('/staff', { method: 'POST', body })
        : api<StaffDetail>(`/staff/${id}`, { method: 'PUT', body })
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['staff'] })
      // After creating, stay on the member to set working hours
      navigate(isNew ? `/staff/${saved.id}` : '/staff')
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  if (!isNew && existing.isPending) return <p className="muted">Cargando…</p>
  if (!isNew && existing.error) return <p className="error">No se pudo cargar: {existing.error.message}</p>

  const set = (field: 'name' | 'specialty' | 'color' | 'userId') => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <section>
      <Link to="/staff">← Volver</Link>
      <h1>{isNew ? `Nuevo ${terms.singular.toLowerCase()}` : form.name}</h1>

      <form className="form narrow" onSubmit={onSubmit}>
        <label>
          Nombre *
          <input value={form.name} onChange={set('name')} required maxLength={200} autoFocus />
        </label>
        <label>
          Especialidad
          <input value={form.specialty} onChange={set('specialty')} maxLength={200} />
        </label>
        <label>
          Color en la agenda
          <input type="color" value={form.color} onChange={set('color')} />
        </label>
        {members.data && (
          <label>
            Usuario del sistema (opcional)
            <select value={form.userId} onChange={set('userId')}>
              <option value="">— Sin usuario —</option>
              {members.data.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.firstName} {m.lastName} ({m.email})
                </option>
              ))}
            </select>
          </label>
        )}
        {!isNew && (
          <label className="checkbox">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Activo (los inactivos no reciben {allTerms.appointment.plural.toLowerCase()} nuevos)
          </label>
        )}
        {save.error && <p className="error">{save.error.message}</p>}
        <div className="actions">
          <button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : isNew ? 'Crear y cargar horario' : 'Guardar'}
          </button>
        </div>
      </form>

      {existing.data && (
        <>
          <WorkingHoursEditor staffId={existing.data.id} initial={existing.data.workingHours} />
          <TimeOffEditor staff={existing.data} />
        </>
      )}
    </section>
  )
}

type DraftRange = { start: string; end: string }

function WorkingHoursEditor({ staffId, initial }: { staffId: string; initial: WorkingHoursRange[] }) {
  const queryClient = useQueryClient()
  const toDraft = (ranges: WorkingHoursRange[]) =>
    WEEKDAYS.map((_, i) =>
      ranges
        .filter((r) => r.weekday === i + 1)
        .map((r) => ({ start: minuteToTime(r.startMinute), end: minuteToTime(r.endMinute) })),
    )
  const [days, setDays] = useState<DraftRange[][]>(() => toDraft(initial))
  const [saved, setSaved] = useState(false)

  const update = (day: number, next: DraftRange[]) => {
    setSaved(false)
    setDays((d) => d.map((r, i) => (i === day ? next : r)))
  }

  const save = useMutation({
    mutationFn: () => {
      const ranges = days.flatMap((list, i) =>
        list.map((r) => ({ weekday: i + 1, startMinute: timeToMinute(r.start), endMinute: timeToMinute(r.end, true) })),
      )
      return api(`/staff/${staffId}/working-hours`, { method: 'PUT', body: { ranges } })
    },
    onSuccess: () => {
      setSaved(true)
      void queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })

  return (
    <div className="section">
      <h2>Horario semanal</h2>
      <table className="hours">
        <tbody>
          {WEEKDAYS.map((name, day) => (
            <tr key={name}>
              <th>{name}</th>
              <td>
                {days[day].length === 0 && <span className="muted small">No atiende</span>}
                {days[day].map((r, i) => (
                  <span key={i} className="range">
                    <input
                      type="time"
                      value={r.start}
                      onChange={(e) => update(day, days[day].map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                    />
                    –
                    <input
                      type="time"
                      value={r.end}
                      onChange={(e) => update(day, days[day].map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                    />
                    <button type="button" className="link" onClick={() => update(day, days[day].filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    const last = days[day][days[day].length - 1]
                    update(day, [...days[day], last ? { start: last.end, end: last.end } : { start: '09:00', end: '13:00' }])
                  }}
                >
                  + rango
                </button>
                {day > 0 && days[day - 1].length > 0 && (
                  <button type="button" className="link" onClick={() => update(day, days[day - 1].map((r) => ({ ...r })))}>
                    copiar día anterior
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {save.error && <p className="error">{save.error.message}</p>}
      <div className="actions">
        <button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Guardando…' : 'Guardar horario'}
        </button>
        {saved && <span className="muted">Horario guardado ✓</span>}
      </div>
    </div>
  )
}

function TimeOffEditor({ staff }: { staff: StaffDetail }) {
  const queryClient = useQueryClient()
  const today = toDateInput(new Date())
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [reason, setReason] = useState('')
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['staff', staff.id] })

  const add = useMutation({
    mutationFn: () => {
      // Whole days in local time: [from 00:00, day after "to" 00:00)
      const [fy, fm, fd] = from.split('-').map(Number)
      const [ty, tm, td] = to.split('-').map(Number)
      return api(`/staff/${staff.id}/time-off`, {
        method: 'POST',
        body: {
          startTime: new Date(fy, fm - 1, fd).toISOString(),
          endTime: new Date(ty, tm - 1, td + 1).toISOString(),
          reason: reason.trim() || undefined,
        },
      })
    },
    onSuccess: () => {
      setReason('')
      void invalidate()
    },
  })
  const remove = useMutation({
    mutationFn: (timeOffId: string) => api(`/staff/${staff.id}/time-off/${timeOffId}`, { method: 'DELETE' }),
    onSuccess: () => void invalidate(),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    add.mutate()
  }

  return (
    <div className="section">
      <h2>Ausencias</h2>
      {staff.upcomingTimeOff.length === 0 ? (
        <p className="muted">Sin ausencias próximas.</p>
      ) : (
        <ul className="plain-list">
          {staff.upcomingTimeOff.map((t) => (
            <li key={t.id}>
              {formatDay(new Date(t.startTime))} – {formatDay(new Date(new Date(t.endTime).getTime() - 1))}
              {t.reason && <span className="muted"> · {t.reason}</span>}
              <button className="link" onClick={() => window.confirm('¿Eliminar esta ausencia?') && remove.mutate(t.id)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="row narrow" onSubmit={onSubmit}>
        <label>
          Desde
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label>
          Hasta
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} required />
        </label>
        <label>
          Motivo
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Vacaciones" />
        </label>
        <button type="submit" disabled={add.isPending}>
          Agregar
        </button>
      </form>
      {(add.error ?? remove.error) && <p className="error">{(add.error ?? remove.error)!.message}</p>}
    </div>
  )
}
