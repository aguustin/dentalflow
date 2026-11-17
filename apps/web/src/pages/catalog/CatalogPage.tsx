import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CatalogItem, CatalogItemType, Paginated } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useMoney } from '../../lib/money'

export const TYPE_LABELS: Record<CatalogItemType, string> = { SERVICE: 'Servicio', PRODUCT: 'Producto' }

export function CatalogPage() {
  const money = useMoney()
  const [type, setType] = useState<CatalogItemType | ''>('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, error, isPending } = useQuery({
    queryKey: ['catalog', { type, debounced, showInactive }],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '200', includeInactive: String(showInactive) })
      if (type) params.set('type', type)
      if (debounced) params.set('search', debounced)
      return api<Paginated<CatalogItem>>(`/catalog?${params}`)
    },
    placeholderData: keepPreviousData,
  })

  return (
    <section>
      <div className="toolbar">
        <h1>Catálogo</h1>
        <Link className="button" to="/catalog/new">
          Nuevo ítem
        </Link>
      </div>
      <div className="row filters">
        <select value={type} onChange={(e) => setType(e.target.value as CatalogItemType | '')}>
          <option value="">Servicios y productos</option>
          <option value="SERVICE">Servicios</option>
          <option value="PRODUCT">Productos</option>
        </select>
        <input placeholder="Buscar por nombre o SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="checkbox">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Mostrar inactivos
        </label>
      </div>

      {isPending ? (
        <p className="muted">Cargando…</p>
      ) : error ? (
        <p className="error">No se pudo cargar: {error.message}</p>
      ) : data.items.length === 0 ? (
        <p className="muted">{debounced ? 'Sin resultados.' : 'Todavía no cargaste servicios ni productos.'}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>SKU</th>
              <th className="num">Precio</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={i.id} className={i.isActive ? undefined : 'inactive'}>
                <td>
                  <Link to={`/catalog/${i.id}`}>{i.name}</Link>
                  {i.isVariantGroup && <span className="badge">Con variantes</span>}
                </td>
                <td>{TYPE_LABELS[i.type]}</td>
                <td>{i.sku ?? '—'}</td>
                <td className="num">{money(i.price)}</td>
                <td>{i.durationMinutes ? `${i.durationMinutes} min` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
