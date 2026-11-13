import { FormEvent, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Appointment, AppointmentStatus } from '@dentalflow/types'
import { fromInputs, toDateInput, toTimeInput } from '../../lib/dates'
import { useTerms } from '../../org/OrganizationContext'
import { CustomerPicker, PickedCustomer } from '../../components/CustomerPicker'

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Ausente',
}

/** Mirrors the API's allowed transitions, only to decide which buttons to show. */
const ACTIONS: Record<AppointmentStatus, ('CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCEL')[]> = {
  SCHEDULED: ['CONFIRMED', 'NO_SHOW', 'CANCEL'],
  CONFIRMED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
}

const DURATIONS = [15, 30, 45, 60, 90, 120]

interface Props {
  /** Existing appointment to edit, or a start date for a new one */
  appointment?: Appointment
  defaultStart?: Date
  onClose: () => void
}

export function AppointmentDialog({ appointment, defaultStart, onClose }: Props) {
  const terms = useTerms()
  const queryClient = useQueryClient()
  const isNew = !appointment
  const readOnly = !!appointment && ACTIONS[appointment.status].length === 0

  const start = appointment ? new Date(appointment.startTime) : (defaultStart ?? new Date())
  const [customer, setCustomer] = useState<PickedCustomer | null>(
    appointment ? { id: appointment.customerId, name: appointment.customerName ?? '—' } : null,
  )
  const [date, setDate] = useState(toDateInput(start))
  const [time, setTime] = useState(toTimeInput(start))
  const [duration, setDuration] = useState(appointment?.durationMinutes ?? 30)
  const [title, setTitle] = useState(appointment?.title ?? '')
  const [description, setDescription] = useState(appointment?.description ?? '')

  const done = () => {
    void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    onClose()
  }

  const save = useMutation({
    mutationFn: () => {
      const startTime = fromInputs(date, time)
      const endTime = new Date(startTime.getTime() + duration * 60_000)
      const body = {
        title: title.trim(),
        description: description.trim() || (isNew ? undefined : null),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      }
      return isNew
        ? api('/appointments', { method: 'POST', body: { ...body, customerId: customer!.id } })
        : api(`/appointments/${appointment.id}`, { method: 'PUT', body })
    },
    onSuccess: done,
  })

  const transition = useMutation({
    mutationFn: (action: (typeof ACTIONS)[AppointmentStatus][number]) =>
      action === 'CANCEL'
        ? api(`/appointments/${appointment!.id}`, { method: 'DELETE' })
        : api(`/appointments/${appointment!.id}`, { method: 'PUT', body: { status: action } }),
    onSuccess: done,
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!customer) return
    save.mutate()
  }

  function runAction(action: (typeof ACTIONS)[AppointmentStatus][number]) {
    if (action === 'CANCEL' && !window.confirm(`¿Cancelar este ${terms.appointment.singular.toLowerCase()}?`)) return
    transition.mutate(action)
  }

  const error = save.error ?? transition.error
  const busy = save.isPending || transition.isPending

  return (
    <div className="overlay" onClick={onClose}>
      <form className="card form dialog" onSubmit={onSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="toolbar">
          <h1>{isNew ? `Nuevo ${terms.appointment.singular.toLowerCase()}` : terms.appointment.singular}</h1>
          {appointment && <span className={`badge ${appointment.status}`}>{STATUS_LABELS[appointment.status]}</span>}
        </div>

        {isNew ? (
          <CustomerPicker label={terms.customer.singular} value={customer} onChange={setCustomer} />
        ) : (
          <label>
            {terms.customer.singular}
            <strong>{customer?.name}</strong>
          </label>
        )}

        <fieldset disabled={readOnly} className="plain">
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
          <label>
            Notas
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} />
          </label>
        </fieldset>

        {error && <p className="error">{error.message}</p>}

        <div className="actions">
          {!readOnly && (
            <button type="submit" disabled={busy || !customer}>
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
                {action === 'CANCEL' ? 'Cancelar turno' : `Marcar ${STATUS_LABELS[action].toLowerCase()}`}
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
