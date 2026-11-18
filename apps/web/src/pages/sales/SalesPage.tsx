import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Paginated, SaleStatus, SaleSummary, SerialLookup } from '@dentalflow/types'
import { api, ApiError } from '../../lib/api'
import { useMoney } from '../../lib/money'
import { useTerms } from '../../org/OrganizationContext'
import { STATUS_LABELS } from './labels'
import { SALE_CATEGORY, StatusBadge } from '../../design-system/StatusBadge'

const PAGE_SIZE = 30

export function SalesPage() {
  const money = useMoney()
  const terms = useTerms()
  const [status, setStatus] = useState<SaleStatus | ''>('')
  const [page, setPage] = useState(0)

  const { data, error, isPending } = useQuery({
    queryKey: ['sales', 'list', { status, page }],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) })
      if (status) params.set('status', status)
      return api<Paginated<SaleSummary>>(`/sales?${params}`)
    },
    placeholderData: keepPreviousData,
  })
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <section>
      <div className="toolbar">
        <h1>Ventas</h1>
        <div className="actions">
          <Link className="button secondary-link" to="/cash">
            Caja
          </Link>
          <Link className="button" to="/sales/new">
            Nueva venta
          </Link>
        </div>
      </div>
      <SerialSearch />
      <div className="row filters">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SaleStatus | '')
            setPage(0)
          }}
        >
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_LABELS) as SaleStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {isPending ? (
        <p className="muted">Cargando…</p>
      ) : error ? (
        <p className="error">No se pudo cargar: {error.message}</p>
      ) : data.items.length === 0 ? (
        <p className="muted">No hay ventas.</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>{terms.customer.singular}</th>
                <th>Estado</th>
                <th className="num">Total</th>
                <th className="num">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s.id} className={s.status === 'VOIDED' ? 'inactive' : undefined}>
                  <td>
                    <Link to={`/sales/${s.id}`}>#{s.number}</Link>
                  </td>
                  <td>{new Date(s.createdAt).toLocaleDateString('es-AR')}</td>
                  <td>{s.customerName ?? '—'}</td>
                  <td>
                    <StatusBadge category={SALE_CATEGORY[s.status]} label={STATUS_LABELS[s.status]} />
                  </td>
                  <td className="num">{money(s.total)}</td>
                  <td className="num">{s.balance > 0 && s.status !== 'DRAFT' && s.status !== 'VOIDED' ? money(s.balance) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
            <span className="muted">
              Página {page + 1} de {pages}
            </span>
            <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  )
}

/** Who bought a serial number, and whether it is still under warranty. */
function SerialSearch() {
  const [serial, setSerial] = useState('')
  const [result, setResult] = useState<SerialLookup[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function search() {
    setError(null)
    setResult(null)
    try {
      setResult(await api<SerialLookup[]>(`/sales/serials/${encodeURIComponent(serial.trim())}`))
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? 'No se encontró ese número de serie.' : String(err))
    }
  }

  return (
    <div className="serial-search">
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          if (serial.trim()) void search()
        }}
      >
        <input placeholder="Buscar Nº de serie / IMEI" value={serial} onChange={(e) => setSerial(e.target.value)} aria-label="Número de serie" />
        <button type="submit" className="secondary">
          Buscar
        </button>
      </form>
      {error && <p className="muted">{error}</p>}
      {result?.map((r, i) => (
        <p key={i} className={r.inWarranty ? 'alert-ok' : 'alert'}>
          {r.serial}: {r.product} · <Link to={`/sales/${r.sale.id}`}>venta #{r.sale.number}</Link> del{' '}
          {new Date(r.sale.date).toLocaleDateString('es-AR')}
          {r.customer && ` · ${r.customer.name}`} ·{' '}
          {r.returnedAt
            ? 'devuelto'
            : r.inWarranty
              ? `en garantía hasta ${new Date(r.warrantyUntil!).toLocaleDateString('es-AR')}`
              : r.warrantyUntil
                ? 'garantía vencida'
                : 'sin garantía'}
        </p>
      ))}
    </div>
  )
}
