import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Appointment, Paginated } from '@dentalflow/types'
import { addDays, formatDay, formatTime, sameDay, startOfWeek } from '../../lib/dates'
import { useTerms } from '../../org/OrganizationContext'
import { AppointmentDialog, STATUS_LABELS, useActiveStaff } from './AppointmentDialog'

/** Loads every appointment starting in [from, to), following pagination (API max page = 100). */
async function fetchRange(from: Date, to: Date, staffId: string): Promise<Appointment[]> {
  const all: Appointment[] = []
  for (let offset = 0; ; offset += 100) {
    const params = new URLSearchParams({
      startAfter: from.toISOString(),
      startBefore: new Date(to.getTime() - 1).toISOString(),
      limit: '100',
      offset: String(offset),
    })
    if (staffId) params.set('staffId', staffId)
    const page = await api<Paginated<Appointment>>(`/appointments?${params}`)
    all.push(...page.items)
    if (all.length >= page.total || page.items.length === 0) return all
  }
}

type DialogState = { appointment: Appointment } | { defaultStart: Date } | null

const STAFF_FILTER_KEY = 'df.agendaStaff'

export function SchedulePage() {
  const terms = useTerms()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [showCancelled, setShowCancelled] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(null)
  // Per-browser convenience: remember the selected professional
  const [staffFilter, setStaffFilterState] = useState(() => {
    try {
      return localStorage.getItem(STAFF_FILTER_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const setStaffFilter = (id: string) => {
    setStaffFilterState(id)
    try {
      localStorage.setItem(STAFF_FILTER_KEY, id)
    } catch {
      /* ignore */
    }
  }
  const staff = useActiveStaff()
  // Ignore a remembered filter that no longer exists
  const activeFilter = staff.data?.some((m) => m.id === staffFilter) ? staffFilter : ''
  const weekEnd = addDays(weekStart, 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  const { data, error, isPending } = useQuery({
    queryKey: ['appointments', 'week', weekStart.toISOString(), activeFilter],
    queryFn: () => fetchRange(weekStart, weekEnd, activeFilter),
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
        <label className="inline">
          {terms.staff.singular}
          <select value={activeFilter} onChange={(e) => setStaffFilter(e.target.value)}>
            <option value="">Todos</option>
            {staff.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
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
                <button
                  key={a.id}
                  className={`appt ${a.status}`}
                  style={a.staffColor ? { borderLeftColor: a.staffColor } : undefined}
                  onClick={() => setDialog({ appointment: a })}
                >
                  <span className="small">
                    {formatTime(new Date(a.startTime))}–{formatTime(new Date(a.endTime))}
                  </span>
                  <strong>{a.customerName ?? '—'}</strong>
                  <span className="small">{a.title}</span>
                  {!activeFilter && a.staffName && <span className="small muted">{a.staffName}</span>}
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
          defaultStaffId={activeFilter || undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  )
}
