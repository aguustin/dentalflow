import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { PaymentMethod, SaleDetail } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useMoney } from '../../lib/money'
import { METHOD_LABELS } from './labels'

/** Return units of a paid sale. The refund amount is computed by the API (discounts and tax included). */
export function ReturnPanel({ sale, onDone }: { sale: SaleDetail; onDone: (s: SaleDetail) => void }) {
  const money = useMoney()
  const navigate = useNavigate()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [serials, setSerials] = useState<Record<string, string[]>>({})
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [reason, setReason] = useState('')
  const [exchange, setExchange] = useState(false)

  const returnable = sale.items.filter((i) => i.quantity - i.returnedQuantity > 0)

  const submit = useMutation({
    mutationFn: () =>
      api<SaleDetail>(`/sales/${sale.id}/returns`, {
        method: 'POST',
        body: {
          refundMethod: method,
          reason: reason || undefined,
          items: returnable
            .filter((i) => (quantities[i.id] ?? 0) > 0)
            .map((i) => ({
              saleItemId: i.id,
              quantity: quantities[i.id],
              ...(i.serials.length > 0 && { serials: serials[i.id] ?? [] }),
            })),
        },
      }),
    onSuccess: (updated) => {
      onDone(updated)
      setQuantities({})
      setSerials({})
      if (exchange) navigate('/pos')
    },
  })

  const toggleSerial = (lineId: string, serial: string, checked: boolean) => {
    const next = checked ? [...(serials[lineId] ?? []), serial] : (serials[lineId] ?? []).filter((s) => s !== serial)
    setSerials((s) => ({ ...s, [lineId]: next }))
    setQuantities((q) => ({ ...q, [lineId]: next.length }))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    submit.mutate()
  }

  if (returnable.length === 0) return <p className="muted">Todas las unidades ya fueron devueltas.</p>
  const selected = Object.values(quantities).reduce((a, b) => a + b, 0)

  return (
    <form className="card form inline-card return-panel" onSubmit={onSubmit}>
      <h3>Devolución</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Producto</th>
            <th className="num">Vendidas</th>
            <th>A devolver</th>
          </tr>
        </thead>
        <tbody>
          {returnable.map((i) => {
            const left = i.quantity - i.returnedQuantity
            const activeSerials = i.serials.filter((s) => !s.returnedAt)
            return (
              <tr key={i.id}>
                <td>{i.description}</td>
                <td className="num">
                  {i.quantity}
                  {i.returnedQuantity > 0 && <span className="muted"> ({i.returnedQuantity} devueltas)</span>}
                </td>
                <td>
                  {activeSerials.length > 0 ? (
                    activeSerials.map((s) => (
                      <label key={s.serial} className="checkbox">
                        <input
                          type="checkbox"
                          checked={(serials[i.id] ?? []).includes(s.serial)}
                          onChange={(e) => toggleSerial(i.id, s.serial, e.target.checked)}
                        />
                        {s.serial}
                      </label>
                    ))
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={left}
                      className="qty"
                      value={quantities[i.id] ?? 0}
                      aria-label={`Unidades a devolver de ${i.description}`}
                      onChange={(e) =>
                        setQuantities((q) => ({ ...q, [i.id]: Math.min(left, Math.max(0, Number(e.target.value) || 0)) }))
                      }
                    />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="row">
        <label>
          Reintegro en
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Motivo
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Talle incorrecto, falla…" />
        </label>
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={exchange} onChange={(e) => setExchange(e.target.checked)} />
        Es un cambio: después de devolver, ir al punto de venta para cobrar lo nuevo
      </label>
      {submit.error && <p className="error">{submit.error.message}</p>}
      <div className="actions">
        <button type="submit" disabled={selected === 0 || submit.isPending}>
          {submit.isPending ? 'Procesando…' : `Devolver ${selected} unidad(es)`}
        </button>
        <span className="muted small">El monto a reintegrar respeta los descuentos de la venta. Pagado: {money(sale.paidTotal)}</span>
      </div>
    </form>
  )
}
