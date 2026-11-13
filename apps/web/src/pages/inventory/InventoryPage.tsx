import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { InventoryItem } from '@dentalflow/types'
import { api } from '../../lib/api'

/** Low-stock count for the menu badge (shared query key). */
export function useLowStockCount(enabled: boolean) {
  return useQuery({
    queryKey: ['inventory', 'low-count'],
    queryFn: () => api<{ count: number }>('/inventory/low-stock-count'),
    enabled,
    staleTime: 60_000,
    retry: false,
  })
}

export function InventoryPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, error, isPending } = useQuery({
    queryKey: ['inventory', 'list', { debounced, lowOnly }],
    queryFn: () => {
      const params = new URLSearchParams({ lowOnly: String(lowOnly) })
      if (debounced) params.set('search', debounced)
      return api<InventoryItem[]>(`/inventory?${params}`)
    },
    placeholderData: keepPreviousData,
  })

  return (
    <section>
      <h1>Inventario</h1>
      <p className="muted small">
        Productos del catálogo con “Controlar stock”. Las ventas confirmadas descuentan stock y las anuladas lo reponen.
      </p>
      <div className="row filters">
        <input placeholder="Buscar por nombre o SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="checkbox">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Solo stock bajo
        </label>
      </div>

      {isPending ? (
        <p className="muted">Cargando…</p>
      ) : error ? (
        <p className="error">No se pudo cargar: {error.message}</p>
      ) : data.length === 0 ? (
        <p className="muted">
          {lowOnly ? 'No hay productos con stock bajo.' : 'No hay productos con control de stock. Activalo desde el Catálogo.'}
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th className="num">Stock</th>
              <th className="num">Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {data.map((i) => (
              <tr key={i.id}>
                <td>
                  <Link to={`/inventory/${i.id}`}>{i.name}</Link>
                  {i.isLow && <span className="badge low">Stock bajo</span>}
                </td>
                <td>{i.sku ?? '—'}</td>
                <td className="num">{i.stockQuantity}</td>
                <td className="num">{i.minStock ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
