import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PaymentMethod, SaleDetail } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useMoney } from '../../lib/money'
import { useTerms } from '../../org/OrganizationContext'
import { MoneyInput } from '../../components/MoneyInput'
import { METHOD_LABELS, STATUS_LABELS } from './labels'

export function SaleDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const carriedError = (location.state as { error?: string } | null)?.error
  const money = useMoney()
  const terms = useTerms()
  const queryClient = useQueryClient()
  const { data: sale, error, isPending } = useQuery({
    queryKey: ['sales', id],
    queryFn: () => api<SaleDetail>(`/sales/${id}`),
  })

  const refresh = (updated: SaleDetail) => {
    queryClient.setQueryData(['sales', id], updated)
    void queryClient.invalidateQueries({ queryKey: ['sales'], exact: false })
    void queryClient.invalidateQueries({ queryKey: ['cash'] })
    void queryClient.invalidateQueries({ queryKey: ['inventory'] })
  }
  const confirm = useMutation({ mutationFn: () => api<SaleDetail>(`/sales/${id}/confirm`, { method: 'POST' }), onSuccess: refresh })
  const voidSale = useMutation({ mutationFn: () => api<SaleDetail>(`/sales/${id}/void`, { method: 'POST' }), onSuccess: refresh })

  if (isPending) return <p className="muted">Cargando…</p>
  if (error) return <p className="error">No se pudo cargar: {error.message}</p>

  const canPay = sale.status === 'CONFIRMED' || sale.status === 'PARTIALLY_PAID'
  const canVoid = sale.status !== 'VOIDED' && sale.paidTotal === 0
  const actionError = confirm.error ?? voidSale.error

  return (
    <section>
      <Link to="/sales">← Ventas</Link>
      <div className="toolbar">
        <h1>Venta #{sale.number}</h1>
        <span className={`badge sale-${sale.status}`}>{STATUS_LABELS[sale.status]}</span>
      </div>
      <p className="muted">
        {new Date(sale.createdAt).toLocaleString('es-AR')}
        {sale.customerName && ` · ${terms.customer.singular}: ${sale.customerName}`}
        {sale.staffName && ` · ${terms.staff.singular}: ${sale.staffName}`}
      </p>
      {sale.notes && <p>{sale.notes}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th className="num">Cant.</th>
            <th className="num">Precio unit.</th>
            <th className="num">Descuento</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                Sin líneas
              </td>
            </tr>
          )}
          {sale.items.map((i) => (
            <tr key={i.id}>
              <td>{i.description}</td>
              <td className="num">{i.quantity}</td>
              <td className="num">{money(i.unitPrice)}</td>
              <td className="num">{i.discount ? money(i.discount) : '—'}</td>
              <td className="num">{money(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="summary narrow">
        <dt>Subtotal</dt>
        <dd>{money(sale.subtotal)}</dd>
        {sale.discountTotal > 0 && (
          <>
            <dt>Descuentos</dt>
            <dd>−{money(sale.discountTotal)}</dd>
          </>
        )}
        {sale.taxTotal > 0 && (
          <>
            <dt>Impuesto ({sale.taxRateBps / 100}%)</dt>
            <dd>{money(sale.taxTotal)}</dd>
          </>
        )}
        <dt>
          <strong>Total</strong>
        </dt>
        <dd>
          <strong>{money(sale.total)}</strong>
        </dd>
        <dt>Pagado</dt>
        <dd>{money(sale.paidTotal)}</dd>
        <dt>Saldo</dt>
        <dd>{money(sale.balance)}</dd>
      </dl>

      <div className="actions">
        {sale.status === 'DRAFT' && (
          <>
            <Link className="button" to={`/sales/${sale.id}/edit`}>
              Editar
            </Link>
            <button onClick={() => confirm.mutate()} disabled={confirm.isPending || sale.items.length === 0}>
              Confirmar venta
            </button>
          </>
        )}
        {canVoid && (
          <button
            className="danger"
            disabled={voidSale.isPending}
            onClick={() => window.confirm(`¿Anular la venta #${sale.number}?`) && voidSale.mutate()}
          >
            Anular
          </button>
        )}
      </div>
      {actionError && <p className="error">{actionError.message}</p>}
      {!actionError && carriedError && sale.status === 'DRAFT' && (
        <p className="error">No se pudo confirmar: {carriedError}. La venta quedó guardada como borrador.</p>
      )}

      <div className="section">
        <h2>Pagos</h2>
        {sale.payments.length === 0 ? (
          <p className="muted">Sin pagos.</p>
        ) : (
          <ul className="plain-list">
            {sale.payments.map((p) => (
              <li key={p.id}>
                {new Date(p.createdAt).toLocaleString('es-AR')} · {METHOD_LABELS[p.method]} · <strong>{money(p.amount)}</strong>
              </li>
            ))}
          </ul>
        )}
        {canPay && <PaymentForm sale={sale} onPaid={refresh} />}
      </div>
    </section>
  )
}

function PaymentForm({ sale, onPaid }: { sale: SaleDetail; onPaid: (s: SaleDetail) => void }) {
  const money = useMoney()
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [amount, setAmount] = useState<number | null>(sale.balance)
  const [received, setReceived] = useState<number | null>(null)
  useEffect(() => setAmount(sale.balance), [sale.balance])

  const pay = useMutation({
    mutationFn: () => api<SaleDetail>(`/sales/${sale.id}/payments`, { method: 'POST', body: { method, amount } }),
    onSuccess: (s) => {
      setReceived(null)
      onPaid(s)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (amount) pay.mutate()
  }

  const change = method === 'CASH' && received !== null && amount !== null && received > amount ? received - amount : null

  return (
    <form className="row narrow-row payment" onSubmit={onSubmit}>
      <label>
        Medio de pago
        <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
            <option key={m} value={m}>
              {METHOD_LABELS[m]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Monto
        <MoneyInput value={amount} onChange={setAmount} required />
      </label>
      {method === 'CASH' && (
        <label>
          Recibido (para el vuelto)
          <MoneyInput value={received} onChange={setReceived} />
        </label>
      )}
      <button type="submit" disabled={pay.isPending || !amount || amount > sale.balance}>
        Registrar pago
      </button>
      {change !== null && <span>Vuelto: <strong>{money(change)}</strong></span>}
      {amount !== null && amount > sale.balance && <span className="error">Supera el saldo ({money(sale.balance)})</span>}
      {pay.error && <p className="error">{pay.error.message}</p>}
    </form>
  )
}
