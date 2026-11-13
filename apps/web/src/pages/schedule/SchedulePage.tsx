import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Appointment, Paginated } from '../../lib/types'
import { addDays, formatDay, formatTime, sameDay, startOfWeek } from '../../lib/dates'
import { useTerms } from '../../org/OrganizationContext'
import { AppointmentDialog, STATUS_LABELS } from './AppointmentDialog'

/** Loads every appointment starting in [from, to), following pagination (API max page = 100). */
async function fetchRange(from: Date, to: Date): Promise<Appointment[]> {
  const all: Appointment[] = []
  for (let offset = 0; ; offset += 100) {
    const params = new URLSearchParams({
      startAfter: from.toISOString(),
      startBefore: new Date(to.getTime() - 1).toISOString(),
      limit: '100',
      offset: String(offset),
    })
    const page = await api<Paginated<Appointment>>(`/appointments?${params}`)
    all.push(...page.items)
    if (all.length >= page.total || page.items.length === 0) return all
  }
}

type DialogState = { appointment: Appointment } | { defaultStart: Date } | null

export function SchedulePage() {
  const terms = useTerms()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [showCancelled, setShowCancelled] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(null)
  const weekEnd = addDays(weekStart, 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  const { data, error, isPending } = useQuery({
    queryKey: ['appointments', 'week', weekStart.toISOString()],
    queryFn: () => fetchRange(weekStart, weekEnd),
  })

  const byDay = useMemo(() => {
    const visible = (data ?? []).filter((a) => showCancelled || a.status !== 'CANCELLED')
    return days.map((day) =>
      visible
        .filter((a) => sameDay(new Date(a.startTime), day))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, showCancelled, weekStart])

  /** New appointment on a given day: next full hour today, 9:00 otherwise */
  function newOn(day: Date) {
    const start = new Date(day)
    if (sameDay(day, today)) start.setHours(today.getHours() + 1, 0, 0, 0)
    else start.setHours(9, 0, 0, 0)
    setDialog({ defaultStart: start })
  }

  return (
    <section>
      <div className="toolbar">
        <h1>Agenda</h1>
        <button onClick={() => newOn(today)}>Nuevo {terms.appointment.singular.toLowerCase()}</button>
      </div>

      <div className="toolbar week-nav">
        <div className="actions">
          <button className="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ←
          </button>
          <button className="secondary" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            Hoy
          </button>
          <button className="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            →
          </button>
          <strong>
            {formatDay(weekStart)} – {formatDay(addDays(weekEnd, -1))}
          </strong>
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
          Mostrar cancelados
        </label>
      </div>

      {isPending ? (
        <p className="muted">Cargando…</p>
      ) : error ? (
        <p className="error">No se pudo cargar la agenda: {error.message}</p>
      ) : (
        <div className="week">
          {days.map((day, i) => (
            <div key={i} className={sameDay(day, today) ? 'day today' : 'day'}>
              <div className="day-header">
                <span>{formatDay(day)}</span>
                <button className="link" title={`Nuevo ${terms.appointment.singular.toLowerCase()}`} onClick={() => newOn(day)}>
                  +
                </button>
              </div>
              {byDay[i].length === 0 && <span className="muted small">Sin {terms.appointment.plural.toLowerCase()}</span>}
              {byDay[i].map((a) => (
                <button key={a.id} className={`appt ${a.status}`} onClick={() => setDialog({ appointment: a })}>
                  <span className="small">
                    {formatTime(new Date(a.startTime))}–{formatTime(new Date(a.endTime))}
                  </span>
                  <strong>{a.customerName ?? '—'}</strong>
                  <span className="small">{a.title}</span>
                  {a.status !== 'SCHEDULED' && <span className="small">{STATUS_LABELS[a.status]}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {dialog && (
        <AppointmentDialog
          key={'appointment' in dialog ? dialog.appointment.id : 'new'}
          appointment={'appointment' in dialog ? dialog.appointment : undefined}
          defaultStart={'defaultStart' in dialog ? dialog.defaultStart : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  )
}
