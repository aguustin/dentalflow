import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CatalogItem, Paginated, ToothSurface, TreatmentItem, TreatmentItemStatus, TreatmentPlan } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useMoney } from '../../lib/money'
import { useHasModule } from '../../org/OrganizationContext'
import { MoneyInput } from '../../components/MoneyInput'
import { StatusBadge, TREATMENT_CATEGORY } from '../../design-system/StatusBadge'

const STATUS_LABELS: Record<TreatmentItemStatus, string> = {
  PROPOSED: 'Propuesto',
  ACCEPTED: 'Aceptado',
  DONE: 'Realizado',
  DISCARDED: 'Descartado',
}

/** Mirrors the API transitions, only to decide which buttons to show. */
const NEXT: Record<TreatmentItemStatus, { to: TreatmentItemStatus; label: string }[]> = {
  PROPOSED: [
    { to: 'ACCEPTED', label: 'Aceptar' },
    { to: 'DISCARDED', label: 'Descartar' },
  ],
  ACCEPTED: [
    { to: 'DONE', label: 'Marcar realizado' },
    { to: 'PROPOSED', label: 'Volver a propuesto' },
    { to: 'DISCARDED', label: 'Descartar' },
  ],
  DONE: [],
  DISCARDED: [{ to: 'PROPOSED', label: 'Volver a proponer' }],
}

const SURFACES: ToothSurface[] = ['O', 'M', 'D', 'V', 'L']

export function TreatmentsTab({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const plans = useQuery({
    queryKey: ['clinical', customerId, 'plans'],
    queryFn: () => api<TreatmentPlan[]>(`/clinical/${customerId}/treatment-plans`),
  })
  const create = useMutation({
    mutationFn: () => api(`/clinical/${customerId}/treatment-plans`, { method: 'POST', body: { title } }),
    onSuccess: () => {
      setTitle('')
      void queryClient.invalidateQueries({ queryKey: ['clinical', customerId, 'plans'] })
    },
  })

  function onCreate(e: FormEvent) {
    e.preventDefault()
    if (title.trim()) create.mutate()
  }

  return (
    <div>
      <form className="row narrow" onSubmit={onCreate}>
        <input placeholder="Nombre del nuevo plan (ej. Rehabilitación)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        <button type="submit" disabled={create.isPending || !title.trim()}>
          Crear plan
        </button>
      </form>
      {create.error && <p className="error">{create.error.message}</p>}

      {plans.isPending ? (
        <p className="muted">Cargando…</p>
      ) : plans.error ? (
        <p className="error">{plans.error.message}</p>
      ) : plans.data.length === 0 ? (
        <p className="muted">Sin planes de tratamiento.</p>
      ) : (
        plans.data.map((plan) => <PlanCard key={plan.id} customerId={customerId} plan={plan} />)
      )}
    </div>
  )
}

function PlanCard({ customerId, plan }: { customerId: string; plan: TreatmentPlan }) {
  const money = useMoney()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const hasSales = useHasModule('sales')
  const base = `/clinical/${customerId}/treatment-plans/${plan.id}`
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['clinical', customerId, 'plans'] })

  const setStatus = useMutation({
    mutationFn: ({ item, to }: { item: TreatmentItem; to: TreatmentItemStatus }) =>
      api(`${base}/items/${item.id}`, { method: 'PATCH', body: { status: to } }),
    onSuccess: () => void refresh(),
  })
  const bill = useMutation({
    mutationFn: () => api<{ saleId: string }>(`${base}/bill`, { method: 'POST', body: {} }),
    onSuccess: (r) => {
      void refresh()
      navigate(`/sales/${r.saleId}`)
    },
  })
  const pending = plan.items.filter((i) => i.billable).length
  const error = setStatus.error ?? bill.error

  return (
    <div className="card plan">
      <div className="toolbar">
        <h3>{plan.title}</h3>
        <span className="muted small">{new Date(plan.createdAt).toLocaleDateString('es-AR')}</span>
      </div>
      {plan.items.length === 0 ? (
        <p className="muted small">Sin ítems todavía.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Tratamiento</th>
              <th>Pieza</th>
              <th className="num">Precio</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {plan.items.map((item) => (
              <tr key={item.id} className={item.status === 'DISCARDED' ? 'inactive' : undefined}>
                <td>{item.description}</td>
                <td>
                  {item.tooth ?? '—'}
                  {item.surface && ` (${item.surface})`}
                </td>
                <td className="num">{money(item.price)}</td>
                <td>
                  <StatusBadge category={TREATMENT_CATEGORY[item.status]} label={STATUS_LABELS[item.status]} />
                  {item.sale && item.sale.status !== 'VOIDED' && (
                    <>
                      {' · '}
                      <Link to={`/sales/${item.sale.id}`}>Venta #{item.sale.number}</Link>
                    </>
                  )}
                </td>
                <td className="actions">
                  {NEXT[item.status].map((n) => (
                    <button
                      key={n.to}
                      className="link"
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ item, to: n.to })}
                    >
                      {n.label}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <AddItem customerId={customerId} planId={plan.id} onAdded={refresh} />

      <div className="plan-footer">
        <span>
          Presupuesto: <strong>{money(plan.totals.quoted)}</strong>
        </span>
        <span className="muted">Aceptado: {money(plan.totals.accepted)}</span>
        <span className="muted">Realizado: {money(plan.totals.done)}</span>
        {hasSales && pending > 0 && (
          <button onClick={() => bill.mutate()} disabled={bill.isPending}>
            Facturar realizados ({pending}) · {money(plan.totals.pendingBilling)}
          </button>
        )}
      </div>
      {error && <p className="error">{error.message}</p>}
    </div>
  )
}

function AddItem({ customerId, planId, onAdded }: { customerId: string; planId: string; onAdded: () => void }) {
  const [serviceId, setServiceId] = useState('')
  const [tooth, setTooth] = useState('')
  const [surface, setSurface] = useState('')
  const [price, setPrice] = useState<number | null>(null)
  const services = useQuery({
    queryKey: ['catalog', 'services'],
    queryFn: () => api<Paginated<CatalogItem>>('/catalog?type=SERVICE&limit=200'),
  })

  const add = useMutation({
    mutationFn: () =>
      api(`/clinical/${customerId}/treatment-plans/${planId}/items`, {
        method: 'POST',
        body: {
          catalogItemId: serviceId,
          tooth: tooth ? Number(tooth) : null,
          surface: tooth && surface ? surface : null,
          ...(price !== null && { price }),
        },
      }),
    onSuccess: () => {
      setTooth('')
      setSurface('')
      onAdded()
    },
  })

  function pick(id: string) {
    setServiceId(id)
    setPrice(services.data?.items.find((s) => s.id === id)?.price ?? null)
  }

  if (services.data?.items.length === 0) {
    return <p className="muted small">Cargá servicios en el Catálogo para armar el plan.</p>
  }

  return (
    <form
      className="row add-item"
      onSubmit={(e) => {
        e.preventDefault()
        if (serviceId) add.mutate()
      }}
    >
      <select value={serviceId} onChange={(e) => pick(e.target.value)} required aria-label="Servicio">
        <option value="">Agregar tratamiento…</option>
        {services.data?.items.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Pieza (FDI)"
        value={tooth}
        onChange={(e) => setTooth(e.target.value)}
        aria-label="Pieza"
        className="tooth-input"
      />
      <select value={surface} onChange={(e) => setSurface(e.target.value)} disabled={!tooth} aria-label="Cara">
        <option value="">Cara —</option>
        {SURFACES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <MoneyInput value={price} onChange={setPrice} aria-label="Precio" placeholder="Precio" />
      <button type="submit" disabled={!serviceId || add.isPending}>
        Agregar
      </button>
      {add.error && <span className="error small">{add.error.message}</span>}
    </form>
  )
}
