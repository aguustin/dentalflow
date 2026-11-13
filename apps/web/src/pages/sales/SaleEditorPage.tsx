import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CatalogItem, Paginated, SaleDetail } from '@dentalflow/types'
import { api, ApiError } from '../../lib/api'
import { useMoney } from '../../lib/money'
import { useOrganization } from '../../org/OrganizationContext'
import { CustomerPicker, PickedCustomer } from '../../components/CustomerPicker'
import { MoneyInput } from '../../components/MoneyInput'
import { useActiveStaff } from '../schedule/AppointmentDialog'

interface Line {
  key: number
  catalogItemId: string | null
  description: string
  quantity: number
  unitPrice: number | null
  discount: number | null
}

let nextKey = 1

/** Client-side preview only; the API recomputes and is authoritative. */
function preview(lines: Line[], globalDiscount: number, taxRateBps: number) {
  const net = lines.reduce((s, l) => s + Math.max(0, l.quantity * (l.unitPrice ?? 0) - (l.discount ?? 0)), 0)
  const taxable = Math.max(0, net - globalDiscount)
  const tax = Math.floor((taxable * taxRateBps + 5000) / 10000)
  return { net, tax, total: taxable + tax }
}

/** New sale (/sales/new) or edit a draft (/sales/:id/edit). */
export function SaleEditorPage() {
  const { id } = useParams()
  const isNew = !id
  const org = useOrganization()
  const terms = org.vertical.terminology
  const money = useMoney()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const staff = useActiveStaff()

  const existing = useQuery({
    queryKey: ['sales', id],
    queryFn: () => api<SaleDetail>(`/sales/${id}`),
    enabled: !isNew,
  })

  const [customer, setCustomer] = useState<PickedCustomer | null>(null)
  const [staffId, setStaffId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [globalDiscount, setGlobalDiscount] = useState<number | null>(0)

  useEffect(() => {
    const s = existing.data
    if (!s) return
    setCustomer(s.customerId ? { id: s.customerId, name: s.customerName ?? '—' } : null)
    setStaffId(s.staffId ?? '')
    setNotes(s.notes ?? '')
    setGlobalDiscount(s.globalDiscount)
    setLines(s.items.map((i) => ({ ...i, key: nextKey++ })))
  }, [existing.data])

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const save = useMutation({
    mutationFn: async (confirm: boolean) => {
      const body = {
        customerId: customer?.id ?? null,
        staffId: staffId || null,
        notes: notes.trim() || null,
        globalDiscount: globalDiscount ?? 0,
        items: lines.map((l) => ({
          catalogItemId: l.catalogItemId ?? undefined,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice ?? 0,
          discount: l.discount ?? 0,
        })),
      }
      if (isNew) return api<SaleDetail>('/sales', { method: 'POST', body: { ...body, confirm } })
      await api(`/sales/${id}`, { method: 'PUT', body })
      return confirm ? api<SaleDetail>(`/sales/${id}/confirm`, { method: 'POST' }) : api<SaleDetail>(`/sales/${id}`)
    },
    onSuccess: (sale) => {
      void queryClient.invalidateQueries({ queryKey: ['sales'] })
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
      navigate(`/sales/${sale.id}`)
    },
    onError: (err) => {
      // Create+confirm failed after the draft was saved: open that draft instead of losing it
      const saleId = err instanceof ApiError ? (err.body as { details?: { saleId?: string } })?.details?.saleId : undefined
      if (saleId) {
        void queryClient.invalidateQueries({ queryKey: ['sales'] })
        navigate(`/sales/${saleId}`, { state: { error: err.message } })
      }
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate(true)
  }

  if (!isNew && existing.isPending) return <p className="muted">Cargando…</p>
  if (!isNew && existing.error) return <p className="error">No se pudo cargar: {existing.error.message}</p>
  if (existing.data && existing.data.status !== 'DRAFT') {
    return (
      <section>
        <p>Esta venta ya no es un borrador y no se puede editar.</p>
        <Link to={`/sales/${id}`}>Ver venta</Link>
      </section>
    )
  }

  const totals = preview(lines, globalDiscount ?? 0, org.taxRateBps)
  const invalid =
    lines.some((l) => l.unitPrice === null || l.discount === null || !l.description.trim() || l.quantity < 1) ||
    globalDiscount === null

  return (
    <section>
      <Link to="/sales">← Volver</Link>
      <h1>{isNew ? 'Nueva venta' : `Borrador #${existing.data?.number}`}</h1>

      <form className="form" onSubmit={onSubmit}>
        <div className="row narrow-row">
          <CustomerPicker label={`${terms.customer.singular} (opcional)`} value={customer} onChange={setCustomer} />
          <label>
            {terms.staff.singular} (opcional)
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">—</option>
              {staff.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <table className="table lines">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cant.</th>
              <th>Precio unit.</th>
              <th>Descuento</th>
              <th className="num">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key}>
                <td>
                  <input
                    value={l.description}
                    onChange={(e) => updateLine(l.key, { description: e.target.value })}
                    required
                    aria-label="Descripción"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    className="qty"
                    value={l.quantity}
                    onChange={(e) => updateLine(l.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                    aria-label="Cantidad"
                  />
                </td>
                <td>
                  <MoneyInput value={l.unitPrice} onChange={(v) => updateLine(l.key, { unitPrice: v })} aria-label="Precio unitario" />
                </td>
                <td>
                  <MoneyInput value={l.discount} onChange={(v) => updateLine(l.key, { discount: v })} aria-label="Descuento" />
                </td>
                <td className="num">{money(Math.max(0, l.quantity * (l.unitPrice ?? 0) - (l.discount ?? 0)))}</td>
                <td>
                  <button type="button" className="link" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="row">
          <CatalogItemPicker
            onPick={(item) =>
              setLines((ls) => [
                ...ls,
                { key: nextKey++, catalogItemId: item.id, description: item.name, quantity: 1, unitPrice: item.price, discount: 0 },
              ])
            }
          />
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setLines((ls) => [...ls, { key: nextKey++, catalogItemId: null, description: '', quantity: 1, unitPrice: null, discount: 0 }])
            }
          >
            + Línea libre
          </button>
        </div>

        <div className="totals narrow">
          <label className="inline">
            Descuento general
            <MoneyInput value={globalDiscount} onChange={setGlobalDiscount} aria-label="Descuento general" />
          </label>
          {org.taxRateBps > 0 && (
            <div>
              Impuesto ({org.taxRateBps / 100}%): <strong>{money(totals.tax)}</strong>
            </div>
          )}
          <div className="grand-total">
            Total estimado: <strong>{money(totals.total)}</strong>
          </div>
        </div>

        <label className="narrow">
          Notas
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
        </label>

        {save.error && <p className="error">{save.error.message}</p>}
        <div className="actions">
          <button type="submit" disabled={save.isPending || invalid || lines.length === 0}>
            Confirmar venta
          </button>
          <button type="button" className="secondary" disabled={save.isPending || invalid} onClick={() => save.mutate(false)}>
            Guardar borrador
          </button>
        </div>
      </form>
    </section>
  )
}

function CatalogItemPicker({ onPick }: { onPick: (item: CatalogItem) => void }) {
  const money = useMoney()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])
  const results = useQuery({
    queryKey: ['catalog', 'picker', debounced],
    queryFn: () => api<Paginated<CatalogItem>>(`/catalog?limit=8&search=${encodeURIComponent(debounced)}`),
    enabled: debounced.length > 0,
  })

  return (
    <div className="picker">
      <input placeholder="Agregar del catálogo…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {debounced && (
        <div className="picker-results">
          {results.data?.items.length === 0 && <span className="muted small">Sin resultados</span>}
          {results.data?.items.map((i) => (
            <button
              type="button"
              key={i.id}
              className="link"
              onClick={() => {
                onPick(i)
                setSearch('')
              }}
            >
              {i.name} <span className="muted">· {money(i.price)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
