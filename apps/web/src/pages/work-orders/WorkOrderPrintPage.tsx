import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { WorkOrderDetail } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useMoney } from '../../lib/money'
import { useOrganization } from '../../org/OrganizationContext'

/** Printable quote for the customer (print or "save as PDF" from the browser). */
export function WorkOrderPrintPage() {
  const { id } = useParams()
  const org = useOrganization()
  const terms = org.vertical.terminology
  const money = useMoney()
  const { data: order, error, isPending } = useQuery({
    queryKey: ['work-orders', id],
    queryFn: () => api<WorkOrderDetail>(`/work-orders/${id}`),
  })

  // Open the print dialog once the data is on screen
  useEffect(() => {
    if (order) {
      const t = setTimeout(() => window.print(), 300)
      return () => clearTimeout(t)
    }
  }, [order])

  if (isPending) return <p className="muted">Cargando…</p>
  if (error) return <p className="error">No se pudo cargar: {error.message}</p>

  return (
    <section className="print-page">
      <div className="no-print actions">
        <Link to={`/work-orders/${order.id}`}>← Volver</Link>
        <button onClick={() => window.print()}>Imprimir</button>
      </div>

      <header className="print-header">
        <div>
          <h1>{org.name}</h1>
          <div className="muted">{org.vertical.label}</div>
        </div>
        <div className="print-meta">
          <strong>Presupuesto</strong>
          <div>
            {terms.workOrder?.singular ?? 'Orden'} #{order.number}
          </div>
          <div>{new Date().toLocaleDateString('es-AR')}</div>
        </div>
      </header>

      <p>
        <strong>{terms.customer.singular}:</strong> {order.customer.name}
        {order.customer.phone && ` · ${order.customer.phone}`}
      </p>
      {order.asset && (
        <p>
          <strong>{terms.asset?.singular ?? 'Equipo'}:</strong> {order.asset.label}
        </p>
      )}
      <p>
        <strong>Falla reportada:</strong> {order.reportedIssue}
      </p>
      {order.diagnosis && (
        <p>
          <strong>Diagnóstico:</strong> {order.diagnosis}
        </p>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th className="num">Cant.</th>
            <th className="num">Precio unit.</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id}>
              <td>{i.description}</td>
              <td className="num">{i.quantity}</td>
              <td className="num">{money(i.unitPrice)}</td>
              <td className="num">{money(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="summary print-totals">
        {order.totals.taxTotal > 0 && (
          <>
            <dt>Subtotal</dt>
            <dd>{money(order.totals.subtotal)}</dd>
            <dt>Impuesto ({order.totals.taxRateBps / 100}%)</dt>
            <dd>{money(order.totals.taxTotal)}</dd>
          </>
        )}
        <dt>
          <strong>Total</strong>
        </dt>
        <dd>
          <strong>{money(order.totals.total)}</strong>
        </dd>
      </dl>

      <div className="signature">
        <div>Firma y aclaración del {terms.customer.singular.toLowerCase()} (conformidad del presupuesto)</div>
      </div>
    </section>
  )
}
