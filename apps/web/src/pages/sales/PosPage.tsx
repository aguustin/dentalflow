import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CatalogItem, Paginated, PaymentMethod, SaleDetail } from '@dentalflow/types'
import { api, ApiError } from '../../lib/api'
import { useMoney } from '../../lib/money'
import { useOrganization } from '../../org/OrganizationContext'
import { CustomerPicker, PickedCustomer } from '../../components/CustomerPicker'
import { MoneyInput } from '../../components/MoneyInput'
import { METHOD_LABELS } from './labels'

interface CartLine {
  item: CatalogItem
  quantity: number
}

/**
 * Point of sale. The search box keeps the focus so a barcode scanner (which types the
 * code and presses Enter) adds products directly to the cart.
 */
export function PosPage() {
  const org = useOrganization()
  const money = useMoney()
  const queryClient = useQueryClient()
  const searchRef = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState('')
  const [results, setResults] = useState<CatalogItem[] | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState<PickedCustomer | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [received, setReceived] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [lastSale, setLastSale] = useState<SaleDetail | null>(null)

  const cash = useQuery({
    queryKey: ['cash', 'current'],
    queryFn: async () => (await api<{ id: string } | undefined>('/cash/current')) ?? null,
  })

  const focusSearch = () => {
    setTimeout(() => searchRef.current?.focus(), 0)
  }
  useEffect(focusSearch, [])

  function add(item: CatalogItem) {
    setCart((c) => {
      const existing = c.find((l) => l.item.id === item.id)
      return existing
        ? c.map((l) => (l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...c, { item, quantity: 1 }]
    })
    setCode('')
    setResults(null)
    setMessage(null)
    focusSearch()
  }

  /** Enter: exact barcode/SKU first (scanner), otherwise a name search. */
  async function onScan(e: FormEvent) {
    e.preventDefault()
    const value = code.trim()
    if (!value) return
    try {
      add(await api<CatalogItem>(`/catalog/lookup?code=${encodeURIComponent(value)}`))
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        setMessage(err instanceof Error ? err.message : 'Error al buscar')
        return
      }
      const found = await api<Paginated<CatalogItem>>(`/catalog?sellable=true&limit=10&search=${encodeURIComponent(value)}`)
      if (found.items.length === 1) add(found.items[0])
      else {
        setResults(found.items)
        setMessage(found.items.length === 0 ? `Sin resultados para "${value}"` : null)
      }
    }
  }

  const total = cart.reduce((sum, l) => sum + l.item.price * l.quantity, 0)
  const tax = Math.floor((total * org.taxRateBps + 5000) / 10000)
  const grandTotal = total + tax
  const change = method === 'CASH' && received !== null && received >= grandTotal ? received - grandTotal : null

  const checkout = useMutation({
    mutationFn: () =>
      api<SaleDetail>('/sales/checkout', {
        method: 'POST',
        body: {
          customerId: customer?.id,
          items: cart.map((l) => ({ catalogItemId: l.item.id, quantity: l.quantity })),
          payment: { method },
        },
      }),
    onSuccess: (sale) => {
      setLastSale(sale)
      setCart([])
      setCustomer(null)
      setReceived(null)
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
      void queryClient.invalidateQueries({ queryKey: ['cash'] })
      void queryClient.invalidateQueries({ queryKey: ['sales'] })
      focusSearch()
    },
  })

  return (
    <section className="pos">
      <div className="toolbar">
        <h1>Punto de venta</h1>
        <div className="actions">
          {cash.data === null && (
            <Link to="/cash" className="muted small">
              ⚠ La caja está cerrada — abrirla
            </Link>
          )}
          <Link className="button secondary-link" to="/sales">
            Ventas
          </Link>
        </div>
      </div>

      <div className="pos-grid">
        <div>
          <form onSubmit={onScan}>
            <input
              ref={searchRef}
              className="scan"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Escaneá o escribí código, SKU o nombre y presioná Enter"
              aria-label="Código o producto"
              autoComplete="off"
            />
          </form>
          {message && <p className="muted">{message}</p>}
          {results && results.length > 0 && (
            <div className="picker-results">
              {results.map((i) => (
                <button key={i.id} type="button" className="link" onClick={() => add(i)}>
                  {i.name}
                  {i.sku && <span className="muted"> · {i.sku}</span>} · {money(i.price)}
                  {i.trackStock && <span className="muted"> · stock {i.stockQuantity - i.reservedQuantity}</span>}
                </button>
              ))}
            </div>
          )}

          {cart.length === 0 ? (
            <p className="muted">El carrito está vacío.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th className="num">Precio</th>
                  <th className="num">Subtotal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cart.map((l) => (
                  <tr key={l.item.id}>
                    <td>{l.item.name}</td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        className="qty"
                        value={l.quantity}
                        aria-label={`Cantidad de ${l.item.name}`}
                        onChange={(e) =>
                          setCart((c) =>
                            c.map((x) => (x.item.id === l.item.id ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)),
                          )
                        }
                      />
                    </td>
                    <td className="num">{money(l.item.price)}</td>
                    <td className="num">{money(l.item.price * l.quantity)}</td>
                    <td>
                      <button className="link" onClick={() => setCart((c) => c.filter((x) => x.item.id !== l.item.id))}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="card pos-pay">
          <div className="grand-total">
            Total: <strong>{money(grandTotal)}</strong>
          </div>
          {tax > 0 && <div className="muted small">Incluye impuesto {money(tax)}</div>}
          <CustomerPicker label="Cliente (opcional)" required={false} value={customer} onChange={setCustomer} />
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
          {method === 'CASH' && (
            <label>
              Recibido
              <MoneyInput value={received} onChange={setReceived} />
            </label>
          )}
          {change !== null && (
            <div>
              Vuelto: <strong>{money(change)}</strong>
            </div>
          )}
          {checkout.error && <p className="error">{checkout.error.message}</p>}
          <button className="pay" disabled={cart.length === 0 || checkout.isPending} onClick={() => checkout.mutate()}>
            {checkout.isPending ? 'Cobrando…' : `Cobrar ${money(grandTotal)}`}
          </button>
          {lastSale && (
            <p className="alert-ok">
              Venta <Link to={`/sales/${lastSale.id}`}>#{lastSale.number}</Link> cobrada · {money(lastSale.total)}
            </p>
          )}
        </aside>
      </div>
    </section>
  )
}
