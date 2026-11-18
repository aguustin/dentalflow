import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CatalogItemDetail, CatalogItemType } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useMoney } from '../../lib/money'
import { useOrganization } from '../../org/OrganizationContext'
import { MoneyInput } from '../../components/MoneyInput'
import { AttributeFields, AttributeValues } from '../../components/AttributeFields'
import { TYPE_LABELS } from './CatalogPage'

export function CatalogFormPage() {
  const { id } = useParams()
  const isNew = !id
  const org = useOrganization()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const existing = useQuery({
    queryKey: ['catalog', id],
    queryFn: () => api<CatalogItemDetail>(`/catalog/${id}`),
    enabled: !isNew,
  })

  const [type, setType] = useState<CatalogItemType>(org.vertical.productAttributes ? 'PRODUCT' : 'SERVICE')
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [price, setPrice] = useState<number | null>(null)
  const [duration, setDuration] = useState('30')
  const [trackStock, setTrackStock] = useState(false)
  const [isVariantGroup, setIsVariantGroup] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [attributes, setAttributes] = useState<AttributeValues>({})

  useEffect(() => {
    const i = existing.data
    if (!i) return
    setType(i.type)
    setName(i.name)
    setSku(i.sku ?? '')
    setBarcode(i.barcode ?? '')
    setPrice(i.price)
    setDuration(i.durationMinutes ? String(i.durationMinutes) : '')
    setTrackStock(i.trackStock)
    setIsVariantGroup(i.isVariantGroup)
    setIsActive(i.isActive)
    setAttributes(i.attributes ?? {})
  }, [existing.data])

  const productFields = type === 'PRODUCT' ? (org.vertical.productAttributes ?? []) : []

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: isVariantGroup ? null : barcode.trim() || null,
        price: price ?? 0,
        durationMinutes: type === 'SERVICE' && duration ? Number(duration) : null,
        trackStock: type === 'PRODUCT' && !isVariantGroup ? trackStock : false,
        attributes,
        ...(!isNew && { isActive }),
      }
      return isNew
        ? api<CatalogItemDetail>('/catalog', { method: 'POST', body: { ...body, type, isVariantGroup } })
        : api<CatalogItemDetail>(`/catalog/${id}`, { method: 'PUT', body })
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['catalog'] })
      // A new group goes straight to generating its variants
      navigate(isNew && saved.isVariantGroup ? `/catalog/${saved.id}` : '/catalog')
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (price !== null) save.mutate()
  }

  if (!isNew && existing.isPending) return <p className="muted">Cargando…</p>
  if (!isNew && existing.error) return <p className="error">No se pudo cargar: {existing.error.message}</p>

  const parentId = existing.data?.parentId

  return (
    <section>
      <Link to={parentId ? `/catalog/${parentId}` : '/catalog'}>← Volver</Link>
      <h1>{isNew ? 'Nuevo ítem' : name}</h1>
      {existing.data?.parentId && <p className="muted">Variante: {variantLabel(existing.data.name)}</p>}
      <form className="form narrow form-panel" onSubmit={onSubmit}>
        <label>
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value as CatalogItemType)} disabled={!isNew}>
            {(['SERVICE', 'PRODUCT'] as const).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        {isNew && type === 'PRODUCT' && (
          <label className="checkbox">
            <input type="checkbox" checked={isVariantGroup} onChange={(e) => setIsVariantGroup(e.target.checked)} />
            Tiene variantes (talles, colores, capacidades…)
          </label>
        )}
        <label>
          Nombre *
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} autoFocus />
        </label>
        <label>
          {isVariantGroup ? 'Precio base de las variantes *' : 'Precio *'}
          <MoneyInput value={price} onChange={setPrice} required placeholder="0" />
        </label>
        <label>
          {isVariantGroup ? 'Prefijo de SKU (ej. REM → REM-M-NEGRO)' : 'SKU / código interno'}
          <input value={sku} onChange={(e) => setSku(e.target.value)} maxLength={100} />
        </label>
        {type === 'PRODUCT' && !isVariantGroup && (
          <label>
            Código de barras
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} maxLength={100} placeholder="Escaneá o escribí el código" />
          </label>
        )}
        {type === 'SERVICE' ? (
          <label>
            Duración (minutos)
            <input type="number" min={5} max={720} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </label>
        ) : (
          !isVariantGroup && (
            <label className="checkbox">
              <input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} />
              Controlar stock
            </label>
          )
        )}
        {productFields.length > 0 && <AttributeFields fields={productFields} values={attributes} onChange={setAttributes} />}
        {!isNew && (
          <label className="checkbox">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Activo
          </label>
        )}
        {save.error && <p className="error">{save.error.message}</p>}
        <div className="actions">
          <button type="submit" disabled={save.isPending || price === null}>
            {save.isPending ? 'Guardando…' : isNew && isVariantGroup ? 'Crear y generar variantes' : 'Guardar'}
          </button>
        </div>
      </form>

      {existing.data?.isVariantGroup && <Variants group={existing.data} />}
    </section>
  )
}

/**
 * "Remera básica · M / Negro" → "M / Negro". Taken from the name because it keeps the axis
 * order (variantOptions is stored as JSONB, which does not preserve key order).
 */
function variantLabel(name: string): string {
  const i = name.indexOf(' · ')
  return i >= 0 ? name.slice(i + 3) : name
}

function Variants({ group }: { group: CatalogItemDetail }) {
  const org = useOrganization()
  const money = useMoney()
  const queryClient = useQueryClient()
  // Prefill axes from the vertical's suggestions, or from the existing variants
  const fromExisting = group.variants.reduce<Record<string, Set<string>>>((acc, v) => {
    for (const [k, val] of Object.entries(v.variantOptions ?? {})) (acc[k] ??= new Set()).add(val)
    return acc
  }, {})
  const initialAxes =
    Object.keys(fromExisting).length > 0
      ? Object.entries(fromExisting).map(([name, values]) => ({ name, values: [...values].join(', ') }))
      : (org.vertical.variantAxes ?? [{ name: 'Talle', values: [] }]).map((a) => ({ name: a.name, values: a.values.join(', ') }))
  const [axes, setAxes] = useState(initialAxes)

  const generate = useMutation({
    mutationFn: () =>
      api<{ created: number }>(`/catalog/${group.id}/variants`, {
        method: 'POST',
        body: {
          axes: axes
            .map((a) => ({ name: a.name.trim(), values: a.values.split(',').map((v) => v.trim()).filter(Boolean) }))
            .filter((a) => a.name && a.values.length > 0),
        },
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['catalog'] }),
  })

  return (
    <div className="section">
      <h2>Variantes ({group.variants.length})</h2>
      {group.variants.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Variante</th>
              <th>SKU</th>
              <th>Código de barras</th>
              <th className="num">Precio</th>
              <th className="num">Stock</th>
            </tr>
          </thead>
          <tbody>
            {group.variants.map((v) => (
              <tr key={v.id} className={v.isActive ? undefined : 'inactive'}>
                <td>
                  <Link to={`/catalog/${v.id}`}>{variantLabel(v.name)}</Link>
                </td>
                <td>{v.sku ?? '—'}</td>
                <td>{v.barcode ?? '—'}</td>
                <td className="num">{money(v.price)}</td>
                <td className="num">{v.trackStock ? v.stockQuantity : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="card inline-card form">
        <h3>Generar variantes</h3>
        <p className="muted small">
          Se crean todas las combinaciones que todavía no existen. Escribí los valores separados por coma.
        </p>
        {axes.map((axis, i) => (
          <div key={i} className="row">
            <input
              value={axis.name}
              onChange={(e) => setAxes((a) => a.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              placeholder="Eje (ej. Talle)"
              aria-label={`Eje ${i + 1}`}
              className="axis-name"
            />
            <input
              value={axis.values}
              onChange={(e) => setAxes((a) => a.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))}
              placeholder="Valores (ej. S, M, L)"
              aria-label={`Valores del eje ${i + 1}`}
            />
            <button type="button" className="link" onClick={() => setAxes((a) => a.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
        {axes.length < 4 && (
          <button type="button" className="link" onClick={() => setAxes((a) => [...a, { name: '', values: '' }])}>
            + Eje
          </button>
        )}
        {generate.error && <p className="error">{generate.error.message}</p>}
        {generate.data && <p className="muted">Se crearon {generate.data.created} variante(s).</p>}
        <div className="actions">
          <button onClick={() => generate.mutate()} disabled={generate.isPending}>
            Generar variantes
          </button>
        </div>
      </div>
    </div>
  )
}
