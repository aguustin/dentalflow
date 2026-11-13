import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Appointment, AppointmentStatus, Availability, CatalogItem, Paginated, Resource, StaffMember } from '@dentalflow/types'
import { ApiError } from '../../lib/api'
import { useHasModule } from '../../org/OrganizationContext'
import { api } from '../../lib/api'
import { formatTime, fromInputs, toDateInput, toTimeInput } from '../../lib/dates'
import { useTerms } from '../../org/OrganizationContext'
import { CustomerPicker, PickedCustomer } from '../../components/CustomerPicker'

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Ausente',
}

type Action = 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCEL'

/** Mirrors the API's allowed transitions, only to decide which buttons to show. */
const ACTIONS: Record<AppointmentStatus, Action[]> = {
  SCHEDULED: ['CONFIRMED', 'NO_SHOW', 'CANCEL'],
  CONFIRMED: ['COMPLETED', 'NO_SHOW', 'CANCEL'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
}

const DURATIONS = [15, 30, 45, 60, 90, 120]

/** Active staff, shared cache with the staff page and the agenda filter. */
export function useActiveStaff() {
  return useQuery({
    queryKey: ['staff', { showInactive: false }],
    queryFn: () => api<StaffMember[]>('/staff?includeInactive=false'),
  })
}

interface Props {
  /** Existing appointment to edit, or defaults for a new one */
  appointment?: Appointment
  defaultStart?: Date
  defaultStaffId?: string
  onClose: () => void
}

export function AppointmentDialog({ appointment, defaultStart, defaultStaffId, onClose }: Props) {
  const terms = useTerms()
  const queryClient = useQueryClient()
  const isNew = !appointment
  const readOnly = !!appointment && ACTIONS[appointment.status].length === 0

  const staff = useActiveStaff()
  const resources = useQuery({ queryKey: ['resources', 'active'], queryFn: () => api<Resource[]>('/resources') })
  const hasCatalog = useHasModule('catalog')
  const hasSales = useHasModule('sales')
  const navigate = useNavigate()
  const services = useQuery({
    queryKey: ['catalog', 'services'],
    queryFn: () => api<Paginated<CatalogItem>>('/catalog?type=SERVICE&limit=200'),
    enabled: hasCatalog,
    retry: false,
  })

  const start = appointment ? new Date(appointment.startTime) : (defaultStart ?? new Date())
  const [customer, setCustomer] = useState<PickedCustomer | null>(
    appointment ? { id: appointment.customerId, name: appointment.customerName ?? '—' } : null,
  )
  const [staffId, setStaffId] = useState(appointment?.staffId ?? defaultStaffId ?? '')
  const [resourceId, setResourceId] = useState(appointment?.resourceId ?? '')
  const [serviceId, setServiceId] = useState(appointment?.serviceId ?? '')
  const [date, setDate] = useState(toDateInput(start))
  const [time, setTime] = useState(toTimeInput(start))
  const [duration, setDuration] = useState(appointment?.durationMinutes ?? 30)
  const [title, setTitle] = useState(appointment?.title ?? '')
  const [description, setDescription] = useState(appointment?.description ?? '')

  // Default to the first active staff member once loaded
  const effectiveStaffId = staffId || staff.data?.[0]?.id || ''

  const availability = useQuery({
    queryKey: ['appointments', 'availability', effectiveStaffId, date, duration],
    queryFn: () =>
      api<Availability>(`/appointments/availability?staffId=${effectiveStaffId}&date=${date}&duration=${duration}`),
    enabled: !readOnly && !!effectiveStaffId && !!date,
  })

  const done = () => {
    void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    onClose()
  }

  const save = useMutation({
    mutationFn: () => {
      const startTime = fromInputs(date, time)
      const endTime = new Date(startTime.getTime() + duration * 60_000)
      const body = {
        staffId: effectiveStaffId,
        serviceId: serviceId || (isNew ? undefined : null),
        title: title.trim(),
        description: description.trim() || (isNew ? undefined : null),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }
      return isNew
        ? api('/appointments', {
            method: 'POST',
            body: { ...body, customerId: customer!.id, resourceId: resourceId || undefined },
          })
        : api(`/appointments/${appointment.id}`, {
            method: 'PUT',
            body: { ...body, resourceId: resourceId || null },
          })
    },
    onSuccess: done,
  })

  const transition = useMutation({
    mutationFn: (action: Action) =>
      action === 'CANCEL'
        ? api(`/appointments/${appointment!.id}`, { method: 'DELETE' })
        : api(`/appointments/${appointment!.id}`, { method: 'PUT', body: { status: action } }),
    onSuccess: done,
  })

  // One sale per appointment: if it already exists, the API says which one
  const bill = useMutation({
    mutationFn: () => api<{ id: string }>(`/sales/from-appointment/${appointment!.id}`, { method: 'POST' }),
    onSuccess: (sale) => navigate(`/sales/${sale.id}`),
    onError: (err) => {
      const saleId = err instanceof ApiError ? (err.body as { details?: { saleId?: string } })?.details?.saleId : undefined
      if (saleId) navigate(`/sales/${saleId}`)
    },
  })

  function pickService(id: string) {
    setServiceId(id)
    const service = services.data?.items.find((s) => s.id === id)
    if (!service) return
    if (service.durationMinutes) setDuration(service.durationMinutes)
    if (!title.trim()) setTitle(service.name)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!customer || !effectiveStaffId) return
    save.mutate()
  }

  function runAction(action: Action) {
    if (action === 'CANCEL' && !window.confirm(`¿Cancelar este ${terms.appointment.singular.toLowerCase()}?`)) return
    transition.mutate(action)
  }

  const error = save.error ?? transition.error
  const busy = save.isPending || transition.isPending
  const noStaff = staff.data?.length === 0

  return (
    <div className="overlay" onClick={onClose}>
      <form className="card form dialog" onSubmit={onSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="toolbar">
          <h1>{isNew ? `Nuevo ${terms.appointment.singular.toLowerCase()}` : terms.appointment.singular}</h1>
          {appointment && <span className={`badge ${appointment.status}`}>{STATUS_LABELS[appointment.status]}</span>}
        </div>

        {noStaff && (
          <p className="error">
            Primero cargá al menos un {terms.staff.singular.toLowerCase()} en la sección {terms.staff.plural}.
          </p>
        )}

        {isNew ? (
          <CustomerPicker label={terms.customer.singular} value={customer} onChange={setCustomer} />
        ) : (
          <label>
            {terms.customer.singular}
            <strong>{customer?.name}</strong>
          </label>
        )}

        <fieldset disabled={readOnly} className="plain">
          <div className="row">
            <label>
              {terms.staff.singular} *
              <select value={effectiveStaffId} onChange={(e) => setStaffId(e.target.value)} required>
                {staff.data?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
                {/* Keep the current value visible if that staff member was deactivated */}
                {appointment && !staff.data?.some((m) => m.id === appointment.staffId) && (
                  <option value={appointment.staffId}>{appointment.staffName ?? '—'}</option>
                )}
              </select>
            </label>
            {!!resources.data?.length && (
              <label>
                {terms.resource.singular}
                <select value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
                  <option value="">—</option>
                  {resources.data.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {hasCatalog && !!services.data?.items.length && (
            <label>
              Servicio
              <select value={serviceId} onChange={(e) => pickService(e.target.value)}>
                <option value="">—</option>
                {services.data.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.durationMinutes ? ` (${s.durationMinutes} min)` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Motivo *
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </label>
          <div className="row">
            <label>
              Fecha
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label>
              Hora
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required step={300} />
            </label>
            <label>
              Duración
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {[...new Set([...DURATIONS, duration])].sort((a, b) => a - b).map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!readOnly && effectiveStaffId && (
            <div>
              <span className="small muted">Horarios disponibles</span>
              <div className="slots">
                {availability.isPending ? (
                  <span className="muted small">Buscando…</span>
                ) : availability.error ? (
                  <span className="error small">{availability.error.message}</span>
                ) : availability.data.slots.length === 0 ? (
                  <span className="muted small">
                    Sin horarios libres ese día (revisá el horario del {terms.staff.singular.toLowerCase()}). Podés
                    elegir una hora manualmente.
                  </span>
                ) : (
                  availability.data.slots.map((s) => {
                    const t = toTimeInput(new Date(s.startTime))
                    return (
                      <button
                        type="button"
                        key={s.startTime}
                        className={t === time ? 'slot selected' : 'slot'}
                        onClick={() => setTime(t)}
                      >
                        {formatTime(new Date(s.startTime))}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          <label>
            Notas
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} />
          </label>
        </fieldset>

        {error && <p className="error">{error.message}</p>}
        {bill.error && !(bill.error instanceof ApiError && bill.error.status === 409) && (
          <p className="error">{bill.error.message}</p>
        )}

        <div className="actions">
          {hasSales && appointment?.status === 'COMPLETED' && (
            <button type="button" onClick={() => bill.mutate()} disabled={bill.isPending}>
              {bill.isPending ? 'Generando…' : 'Generar venta'}
            </button>
          )}
          {!readOnly && (
            <button type="submit" disabled={busy || !customer || !effectiveStaffId}>
              {save.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          )}
          {appointment &&
            ACTIONS[appointment.status].map((action) => (
              <button
                type="button"
                key={action}
                className={action === 'CANCEL' ? 'danger' : 'secondary'}
                disabled={busy}
                onClick={() => runAction(action)}
              >
                {action === 'CANCEL' ? `Cancelar ${terms.appointment.singular.toLowerCase()}` : `Marcar ${STATUS_LABELS[action].toLowerCase()}`}
              </button>
            ))}
          <button type="button" className="link" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </form>
    </div>
  )
}
