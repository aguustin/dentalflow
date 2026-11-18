import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { WorkOrderSummary } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useMoney } from '../../lib/money'
import { useTerms } from '../../org/OrganizationContext'
import { BOARD_COLUMNS, WO_STATUS_LABELS } from './labels'
import { StatusBadge, WORK_ORDER_CATEGORY } from '../../design-system/StatusBadge'

/** Home of the repair verticals: open orders in columns by status. */
export function WorkOrdersBoard() {
  const terms = useTerms()
  const money = useMoney()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [showClosed, setShowClosed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, error, isPending } = useQuery({
    queryKey: ['work-orders', { debounced, showClosed }],
    queryFn: () => {
      const params = new URLSearchParams({ open: String(!showClosed) })
      if (debounced) params.set('search', debounced)
      return api<WorkOrderSummary[]>(`/work-orders?${params}`)
    },
    placeholderData: keepPreviousData,
  })
  const title = terms.workOrder?.plural ?? 'Órdenes'

  return (
    <section>
      <div className="toolbar">
        <h1>{title}</h1>
        <Link className="button" to="/work-orders/new">
          Nueva {terms.workOrder?.singular.toLowerCase() ?? 'orden'}
        </Link>
      </div>
      <div className="row filters">
        <input
          placeholder={`Buscar por nº, ${terms.customer.singular.toLowerCase()}, ${terms.asset?.singular.toLowerCase() ?? 'equipo'} o falla…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="checkbox">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
          Ver todas (incluye entregadas y canceladas)
        </label>
      </div>

      {isPending ? (
        <p className="muted">Cargando…</p>
      ) : error ? (
        <p className="error">No se pudo cargar: {error.message}</p>
      ) : showClosed ? (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>{terms.customer.singular}</th>
              <th>{terms.asset?.singular ?? 'Equipo'}</th>
              <th>Estado</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link to={`/work-orders/${o.id}`}>#{o.number}</Link>
                </td>
                <td>{o.customerName}</td>
                <td>{o.assetLabel ?? '—'}</td>
                <td>
                  <StatusBadge category={WORK_ORDER_CATEGORY[o.status]} label={WO_STATUS_LABELS[o.status]} />
                </td>
                <td className="num">{money(o.itemsTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="board">
          {BOARD_COLUMNS.map((status) => {
            const cards = data.filter((o) => o.status === status)
            return (
              <div key={status} className="column">
                <div className="column-header">
                  {WO_STATUS_LABELS[status]} <span className="muted">({cards.length})</span>
                </div>
                {cards.map((o) => (
                  <Link key={o.id} to={`/work-orders/${o.id}`} className="wo-card">
                    <strong>#{o.number}</strong> {o.customerName}
                    {o.assetLabel && <span className="small">{o.assetLabel}</span>}
                    <span className="small muted">{o.reportedIssue}</span>
                    {o.staffName && <span className="small">👤 {o.staffName}</span>}
                  </Link>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
