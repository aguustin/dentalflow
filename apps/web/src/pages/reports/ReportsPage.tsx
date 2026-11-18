import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ReportSummary } from '@dentalflow/types'
import { api, apiBlob, ApiError } from '../../lib/api'
import { toDateInput } from '../../lib/dates'
import { useMoney } from '../../lib/money'
import { useTerms } from '../../org/OrganizationContext'
import { METHOD_LABELS } from '../sales/labels'
import { WO_STATUS_LABELS } from '../work-orders/labels'
import { STATUS_LABELS as APPT_STATUS_LABELS } from '../schedule/AppointmentDialog'

type Preset = 'today' | '7d' | 'month' | 'lastMonth' | 'custom'

function presetRange(p: Exclude<Preset, 'custom'>): [string, string] {
  const now = new Date()
  const day = (d: Date) => toDateInput(d)
  switch (p) {
    case 'today':
      return [day(now), day(now)]
    case '7d':
      return [day(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), day(now)]
    case 'month':
      return [day(new Date(now.getFullYear(), now.getMonth(), 1)), day(now)]
    case 'lastMonth':
      return [day(new Date(now.getFullYear(), now.getMonth() - 1, 1)), day(new Date(now.getFullYear(), now.getMonth(), 0))]
  }
}

const PRESETS: [Preset, string][] = [
  ['today', 'Hoy'],
  ['7d', 'Últimos 7 días'],
  ['month', 'Este mes'],
  ['lastMonth', 'Mes anterior'],
  ['custom', 'Personalizado'],
]

export function ReportsPage() {
  const money = useMoney()
  const terms = useTerms()
  const [preset, setPreset] = useState<Preset>('month')
  const [range, setRange] = useState(() => presetRange('month'))
  const [from, to] = range

  const { data, error, isPending, isFetching } = useQuery({
    queryKey: ['reports', from, to],
    queryFn: () => api<ReportSummary>(`/reports/summary?from=${from}&to=${to}`),
    placeholderData: keepPreviousData,
    retry: false,
  })

  function choose(p: Preset) {
    setPreset(p)
    if (p !== 'custom') setRange(presetRange(p))
  }

  async function downloadCsv() {
    const blob = await apiBlob(`/reports/sales.csv?from=${from}&to=${to}`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ventas_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error instanceof ApiError && error.status === 403) {
    return (
      <section>
        <h1>Reportes</h1>
        <p className="muted">Tu rol no tiene acceso a los reportes.</p>
      </section>
    )
  }

  return (
    <section>
      <div className="toolbar">
        <h1>Reportes</h1>
        {data?.sales && (
          <button className="secondary" onClick={() => void downloadCsv()}>
            Descargar ventas (CSV)
          </button>
        )}
      </div>

      <div className="row filters">
        {PRESETS.map(([key, label]) => (
          <button key={key} className={preset === key ? undefined : 'secondary'} onClick={() => choose(key)}>
            {label}
          </button>
        ))}
        {preset === 'custom' && (
          <>
            <input type="date" value={from} onChange={(e) => setRange([e.target.value, to])} aria-label="Desde" />
            <input type="date" value={to} min={from} onChange={(e) => setRange([from, e.target.value])} aria-label="Hasta" />
          </>
        )}
      </div>

      {isPending ? (
        <p className="muted">Cargando…</p>
      ) : error ? (
        <p className="error">No se pudo cargar: {error.message}</p>
      ) : (
        <div className={isFetching ? 'reports loading' : 'reports'}>
          <div className="kpis">
            {data.sales && (
              <>
                <Kpi label="Ventas netas" value={money(data.sales.net)} hint={data.sales.refunded ? `${money(data.sales.refunded)} reintegrado` : undefined} />
                <Kpi label="Cantidad de ventas" value={String(data.sales.count)} />
                <Kpi label="Ticket promedio" value={money(data.sales.averageTicket)} />
              </>
            )}
            <Kpi label={`${terms.customer.plural} nuevos`} value={String(data.customers.new)} />
            {data.scheduling && (
              <>
                <Kpi label={terms.appointment.plural} value={String(data.scheduling.total)} />
                <Kpi label="Ausentismo" value={`${Math.round(data.scheduling.noShowRate * 100)}%`} />
              </>
            )}
            {data.workOrders && (
              <>
                <Kpi label="Órdenes ingresadas" value={String(data.workOrders.created)} />
                <Kpi label="Órdenes entregadas" value={String(data.workOrders.delivered)} />
                <Kpi
                  label="Tiempo promedio de reparación"
                  value={data.workOrders.averageRepairHours === null ? '—' : formatHours(data.workOrders.averageRepairHours)}
                />
              </>
            )}
            {data.inventory && (
              <Kpi
                label="Stock valorizado (a precio de venta)"
                value={money(data.inventory.valueAtSalePrice)}
                hint={`${data.inventory.units} unidades · ${data.inventory.lowStock} con stock bajo`}
              />
            )}
          </div>

          {data.sales && (
            <>
              <div className="section">
                <h2>Ventas por día</h2>
                <DayBars days={data.sales.byDay} money={money} />
              </div>
              <div className="row report-tables">
                <div>
                  <h2>Más vendidos</h2>
                  {data.sales.topItems.length === 0 ? (
                    <p className="muted">Sin ventas en el período.</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Producto / servicio</th>
                          <th className="num">Unidades</th>
                          <th className="num">Facturado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.sales.topItems.map((t) => (
                          <tr key={t.description}>
                            <td>{t.description}</td>
                            <td className="num">{t.quantity}</td>
                            <td className="num">{money(t.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div>
                  <h2>Cobrado por medio de pago</h2>
                  <table className="table">
                    <tbody>
                      {Object.entries(METHOD_LABELS).map(([m, label]) => (
                        <tr key={m}>
                          <td>{label}</td>
                          <td className="num">{money(data.sales!.collectedByMethod[m as keyof typeof METHOD_LABELS] ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {data.scheduling && data.scheduling.total > 0 && (
            <div className="row report-tables">
              <div>
                <h2>{terms.appointment.plural} por estado</h2>
                <table className="table">
                  <tbody>
                    {Object.entries(data.scheduling.byStatus).map(([s, count]) => (
                      <tr key={s}>
                        <td>{APPT_STATUS_LABELS[s as keyof typeof APPT_STATUS_LABELS] ?? s}</td>
                        <td className="num">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h2>Por {terms.staff.singular.toLowerCase()}</h2>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{terms.staff.singular}</th>
                      <th className="num">Atendidos</th>
                      <th className="num">Agendados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.scheduling.byStaff.map((s) => (
                      <tr key={s.name}>
                        <td>{s.name}</td>
                        <td className="num">{s.completed}</td>
                        <td className="num">{s.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.workOrders && Object.keys(data.workOrders.openByStatus).length > 0 && (
            <div className="section">
              <h2>Órdenes abiertas ahora</h2>
              <div className="kpis">
                {Object.entries(data.workOrders.openByStatus).map(([s, count]) => (
                  <Kpi key={s} label={WO_STATUS_LABELS[s as keyof typeof WO_STATUS_LABELS] ?? s} value={String(count)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card kpi">
      <div className="muted small">{label}</div>
      <div className="kpi-value">{value}</div>
      {hint && <div className="muted small">{hint}</div>}
    </div>
  )
}

/** Minimal bar chart (no chart library until the design phase). */
function DayBars({ days, money }: { days: { day: string; amount: number; count: number }[]; money: (c: number) => string }) {
  if (days.length === 0) return <p className="muted">Sin ventas en el período.</p>
  const max = Math.max(...days.map((d) => d.amount), 1)
  return (
    <div className="bars">
      {days.map((d) => (
        <div key={d.day} className="bar-row" title={`${d.count} venta(s)`}>
          <span className="small">{d.day.split('-').reverse().slice(0, 2).join('/')}</span>
          <div className="bar" style={{ width: `${Math.max(2, (d.amount / max) * 100)}%` }} />
          <span className="small num">{money(d.amount)}</span>
        </div>
      ))}
    </div>
  )
}

function formatHours(h: number): string {
  return h < 48 ? `${h} h` : `${Math.round((h / 24) * 10) / 10} días`
}
