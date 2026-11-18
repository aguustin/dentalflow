import { FormEvent, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WorkOrderDetail, WorkOrderStatus } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useMoney } from '../../lib/money'
import { useTerms } from '../../org/OrganizationContext'
import { MoneyInput } from '../../components/MoneyInput'
import { useActiveStaff } from '../schedule/AppointmentDialog'
import { CatalogItemPicker } from '../sales/SaleEditorPage'
import { TRANSITION_LABELS, WO_STATUS_LABELS } from './labels'
import { StatusBadge, WORK_ORDER_CATEGORY } from '../../design-system/StatusBadge'

const NEEDS_REASON: WorkOrderStatus[] = ['CANCELLED', 'REJECTED']
const DANGER: WorkOrderStatus[] = ['CANCELLED', 'REJECTED']

export function WorkOrderDetailPage() {
  const { id } = useParams()
  const terms = useTerms()
  const money = useMoney()
  const queryClient = useQueryClient()
  const key = ['work-orders', id]
  const { data: order, error, isPending } = useQuery({
    queryKey: key,
    queryFn: () => api<WorkOrderDetail>(`/work-orders/${id}`),
  })

  const onSaved = (updated: WorkOrderDetail) => {
    queryClient.setQueryData(key, updated)
    void queryClient.invalidateQueries({ queryKey: ['work-orders'], exact: false })
  }
  const transition = useMutation({
    mutationFn: ({ to, note }: { to: WorkOrderStatus; note?: string }) =>
      api<WorkOrderDetail>(`/work-orders/${id}/transition`, { method: 'POST', body: { to, note } }),
    onSuccess: onSaved,
  })

  function move(to: WorkOrderStatus) {
    let note: string | undefined
    if (NEEDS_REASON.includes(to)) {
      note = window.prompt(`Motivo (${WO_STATUS_LABELS[to].toLowerCase()}):`)?.trim()
      if (!note) return
    }
    transition.mutate({ to, note })
  }

  if (isPending) return <p className="muted">Cargando…</p>
  if (error) return <p className="error">No se pudo cargar: {error.message}</p>

  const editableItems = order.status === 'RECEIVED' || order.status === 'DIAGNOSING'
  const closed = order.status === 'DELIVERED' || order.status === 'CANCELLED'

  return (
    <section>
      <Link to="/work-orders">← {terms.workOrder?.plural ?? 'Órdenes'}</Link>
      <div className="toolbar">
        <h1>
          {terms.workOrder?.singular ?? 'Orden'} #{order.number}
        </h1>
        <div className="actions">
          {order.items.length > 0 && (
            <Link className="button secondary-link" to={`/work-orders/${order.id}/print`}>
              Imprimir presupuesto
            </Link>
          )}
          <StatusBadge category={WORK_ORDER_CATEGORY[order.status]} label={WO_STATUS_LABELS[order.status]} />
        </div>
      </div>
      {order.sale && (
        <p className="alert-ok">
          Facturada en la <Link to={`/sales/${order.sale.id}`}>venta #{order.sale.number}</Link>
          {order.sale.status === 'CONFIRMED' && ' — pendiente de cobro'}
        </p>
      )}
      {order.reservations.length > 0 && (
        <p className="muted small">
          Repuestos reservados: {order.reservations.reduce((n, r) => n + r.quantity, 0)} unidad(es). Se descuentan del stock al
          entregar y se liberan si se cancela.
        </p>
      )}
      <p>
        {terms.customer.singular}: <Link to={`/customers/${order.customer.id}`}>{order.customer.name}</Link>
        {order.customer.phone && <span className="muted"> · {order.customer.phone}</span>}
        {order.asset && (
          <>
            {' · '}
            {terms.asset?.singular ?? 'Equipo'}: <Link to={`/assets/${order.asset.id}`}>{order.asset.label}</Link>
          </>
        )}
      </p>
      <p>
        <span className="muted">Falla reportada:</span> {order.reportedIssue}
      </p>

      {order.allowedTransitions.length > 0 && (
        <div className="actions transitions">
          {order.allowedTransitions.map((to) => (
            <button key={to} className={DANGER.includes(to) ? 'danger' : undefined} disabled={transition.isPending} onClick={() => move(to)}>
              {TRANSITION_LABELS[to]}
            </button>
          ))}
        </div>
      )}
      {transition.error && <p className="error">{transition.error.message}</p>}

      <Details order={order} disabled={closed} onSaved={onSaved} />

      <div className="section">
        <h2>Repuestos y mano de obra</h2>
        {editableItems ? (
          <ItemsEditor order={order} onSaved={onSaved} />
        ) : (
          <>
            <ItemsTable order={order} />
            {order.status === 'QUOTED' && (
              <p className="muted small">Para modificar el presupuesto, volvé a “En diagnóstico”.</p>
            )}
          </>
        )}
        <p className="grand-total">
          Total: <strong>{money(order.totals.total)}</strong>
          {order.totals.taxTotal > 0 && <span className="muted small"> (incluye impuesto {money(order.totals.taxTotal)})</span>}
        </p>
      </div>

      <div className="section">
        <h2>Historial</h2>
        <ul className="notes">
          {order.events.map((e) => (
            <li key={e.id}>
              <div className="muted small">
                {new Date(e.createdAt).toLocaleString('es-AR')} · {e.userName}
              </div>
              <div>
                {WO_STATUS_LABELS[e.toStatus]}
                {e.note && <span className="muted"> — {e.note}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Details({ order, disabled, onSaved }: { order: WorkOrderDetail; disabled: boolean; onSaved: (o: WorkOrderDetail) => void }) {
  const terms = useTerms()
  const staff = useActiveStaff()
  const [diagnosis, setDiagnosis] = useState(order.diagnosis ?? '')
  const [notes, setNotes] = useState(order.notes ?? '')
  const [staffId, setStaffId] = useState(order.staff?.id ?? '')
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setDiagnosis(order.diagnosis ?? '')
    setNotes(order.notes ?? '')
    setStaffId(order.staff?.id ?? '')
  }, [order.diagnosis, order.notes, order.staff?.id])

  const save = useMutation({
    mutationFn: () =>
      api<WorkOrderDetail>(`/work-orders/${order.id}`, {
        method: 'PUT',
        body: { diagnosis: diagnosis || null, notes: notes || null, staffId: staffId || null },
      }),
    onSuccess: (o) => {
      setSaved(true)
      onSaved(o)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  return (
    <form className="form narrow" onSubmit={onSubmit}>
      <fieldset disabled={disabled} className="plain">
        <label>
          {terms.staff.singular} asignado
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">— Sin asignar —</option>
            {staff.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            {order.staff && !staff.data?.some((m) => m.id === order.staff!.id) && <option value={order.staff.id}>{order.staff.name}</option>}
          </select>
        </label>
        <label>
          Diagnóstico
          <textarea value={diagnosis} onChange={(e) => { setSaved(false); setDiagnosis(e.target.value) }} rows={3} maxLength={5000} />
        </label>
        <label>
          Observaciones
          <textarea value={notes} onChange={(e) => { setSaved(false); setNotes(e.target.value) }} rows={2} maxLength={2000} />
        </label>
        {save.error && <p className="error">{save.error.message}</p>}
        <div className="actions">
          <button type="submit" disabled={save.isPending}>
            Guardar
          </button>
          {saved && <span className="muted">Guardado ✓</span>}
        </div>
      </fieldset>
    </form>
  )
}

function ItemsTable({ order }: { order: WorkOrderDetail }) {
  const money = useMoney()
  if (order.items.length === 0) return <p className="muted">Sin ítems.</p>
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Tipo</th>
          <th className="num">Cant.</th>
          <th className="num">Precio</th>
          <th className="num">Total</th>
        </tr>
      </thead>
      <tbody>
        {order.items.map((i) => (
          <tr key={i.id}>
            <td>{i.description}</td>
            <td>{i.kind === 'PRODUCT' ? 'Repuesto' : i.kind === 'SERVICE' ? 'Mano de obra' : 'Otro'}</td>
            <td className="num">{i.quantity}</td>
            <td className="num">{money(i.unitPrice)}</td>
            <td className="num">{money(i.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface DraftLine {
  key: number
  catalogItemId: string | null
  description: string
  quantity: number
  unitPrice: number | null
}
let nextKey = 1

function ItemsEditor({ order, onSaved }: { order: WorkOrderDetail; onSaved: (o: WorkOrderDetail) => void }) {
  const money = useMoney()
  const [lines, setLines] = useState<DraftLine[]>(() => order.items.map((i) => ({ ...i, key: nextKey++ })))
  const [dirty, setDirty] = useState(false)
  const update = (key: number, patch: Partial<DraftLine>) => {
    setDirty(true)
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  const save = useMutation({
    mutationFn: () =>
      api<WorkOrderDetail>(`/work-orders/${order.id}/items`, {
        method: 'PUT',
        body: {
          items: lines.map((l) => ({
            catalogItemId: l.catalogItemId ?? undefined,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice ?? 0,
          })),
        },
      }),
    onSuccess: (o) => {
      setDirty(false)
      onSaved(o)
    },
  })

  const invalid = lines.some((l) => l.unitPrice === null || !l.description.trim())

  return (
    <div>
      <table className="table lines">
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Cant.</th>
            <th>Precio unit.</th>
            <th className="num">Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.key}>
              <td>
                <input value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} aria-label="Descripción" />
              </td>
              <td>
                <input
                  type="number"
                  min={1}
                  className="qty"
                  value={l.quantity}
                  onChange={(e) => update(l.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                  aria-label="Cantidad"
                />
              </td>
              <td>
                <MoneyInput value={l.unitPrice} onChange={(v) => update(l.key, { unitPrice: v })} aria-label="Precio unitario" />
              </td>
              <td className="num">{money(l.quantity * (l.unitPrice ?? 0))}</td>
              <td>
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setDirty(true)
                    setLines((ls) => ls.filter((x) => x.key !== l.key))
                  }}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        <CatalogItemPicker
          onPick={(item) => {
            setDirty(true)
            setLines((ls) => [...ls, { key: nextKey++, catalogItemId: item.id, description: item.name, quantity: 1, unitPrice: item.price }])
          }}
        />
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setDirty(true)
            setLines((ls) => [...ls, { key: nextKey++, catalogItemId: null, description: '', quantity: 1, unitPrice: null }])
          }}
        >
          + Línea libre
        </button>
        <button onClick={() => save.mutate()} disabled={!dirty || invalid || save.isPending}>
          Guardar ítems
        </button>
      </div>
      {dirty && <p className="muted small">Hay cambios sin guardar.</p>}
      {save.error && <p className="error">{save.error.message}</p>}
    </div>
  )
}
