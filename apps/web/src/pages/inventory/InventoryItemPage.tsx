import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { InventoryItemDetail, StockMovementType } from '@dentalflow/types'
import { api } from '../../lib/api'

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  PURCHASE: 'Compra / ingreso',
  ADJUSTMENT: 'Ajuste por recuento',
  SALE: 'Venta',
  SALE_VOID: 'Venta anulada',
}

export function InventoryItemPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { data: item, error, isPending } = useQuery({
    queryKey: ['inventory', id],
    queryFn: () => api<InventoryItemDetail>(`/inventory/${id}`),
  })

  const [quantity, setQuantity] = useState('')
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')
  const [minStock, setMinStock] = useState('')
  useEffect(() => setMinStock(item?.minStock === null || item?.minStock === undefined ? '' : String(item.minStock)), [item?.minStock])

  const onSaved = (updated: InventoryItemDetail) => {
    queryClient.setQueryData(['inventory', id], updated)
    void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    setQuantity('')
    setCounted('')
    setNote('')
  }
  const purchase = useMutation({
    mutationFn: () =>
      api<InventoryItemDetail>(`/inventory/${id}/purchase`, { method: 'POST', body: { quantity: Number(quantity), note: note || undefined } }),
    onSuccess: onSaved,
  })
  const adjust = useMutation({
    mutationFn: () =>
      api<InventoryItemDetail>(`/inventory/${id}/adjust`, {
        method: 'POST',
        body: { countedQuantity: Number(counted), note: note || undefined },
      }),
    onSuccess: onSaved,
  })
  const saveMin = useMutation({
    mutationFn: () =>
      api<InventoryItemDetail>(`/inventory/${id}/min-stock`, {
        method: 'PUT',
        body: { minStock: minStock === '' ? null : Number(minStock) },
      }),
    onSuccess: onSaved,
  })

  if (isPending) return <p className="muted">Cargando…</p>
  if (error) return <p className="error">No se pudo cargar: {error.message}</p>

  const submit = (fn: () => void) => (e: FormEvent) => {
    e.preventDefault()
    fn()
  }
  const mutationError = purchase.error ?? adjust.error ?? saveMin.error

  return (
    <section>
      <Link to="/inventory">← Inventario</Link>
      <div className="toolbar">
        <h1>{item.name}</h1>
        {item.isLow && <span className="badge low">Stock bajo</span>}
      </div>
      <p className="stock-now">
        Stock actual: <strong>{item.stockQuantity}</strong>
        {item.reservedQuantity > 0 && (
          <span>
            {' '}
            · reservado para órdenes: <strong>{item.reservedQuantity}</strong> · disponible: <strong>{item.available}</strong>
          </span>
        )}
        {item.minStock !== null && <span className="muted"> · mínimo {item.minStock}</span>}
      </p>

      <div className="row stock-forms">
        <form className="card form" onSubmit={submit(() => purchase.mutate())}>
          <h2>Registrar ingreso</h2>
          <label>
            Unidades recibidas
            <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </label>
          <button type="submit" disabled={purchase.isPending}>
            Sumar al stock
          </button>
        </form>
        <form className="card form" onSubmit={submit(() => adjust.mutate())}>
          <h2>Ajustar por recuento</h2>
          <label>
            Unidades contadas
            <input type="number" min={0} value={counted} onChange={(e) => setCounted(e.target.value)} required />
          </label>
          <button type="submit" disabled={adjust.isPending}>
            Ajustar stock
          </button>
        </form>
        <form className="card form" onSubmit={submit(() => saveMin.mutate())}>
          <h2>Stock mínimo</h2>
          <label>
            Avisar cuando queden
            <input type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="Sin aviso" />
          </label>
          <button type="submit" disabled={saveMin.isPending}>
            Guardar
          </button>
        </form>
      </div>
      <label className="narrow">
        Nota para el próximo movimiento (opcional)
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Proveedor, remito, motivo…" />
      </label>
      {mutationError && <p className="error">{mutationError.message}</p>}

      <div className="section">
        <h2>Movimientos</h2>
        {item.movements.length === 0 ? (
          <p className="muted">Sin movimientos.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th className="num">Cambio</th>
                <th className="num">Saldo</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {item.movements.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.createdAt).toLocaleString('es-AR')}</td>
                  <td>{MOVEMENT_LABELS[m.type]}</td>
                  <td className="num">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                  <td className="num">{m.balanceAfter}</td>
                  <td>
                    {m.sale && <Link to={`/sales/${m.sale.id}`}>Venta #{m.sale.number}</Link>}
                    {m.note && <span className="muted"> {m.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
