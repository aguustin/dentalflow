import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CatalogItem, CatalogItemType } from '@dentalflow/types'
import { api } from '../../lib/api'
import { MoneyInput } from '../../components/MoneyInput'
import { TYPE_LABELS } from './CatalogPage'

export function CatalogFormPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const existing = useQuery({
    queryKey: ['catalog', id],
    queryFn: () => api<CatalogItem>(`/catalog/${id}`),
    enabled: !isNew,
  })

  const [type, setType] = useState<CatalogItemType>('SERVICE')
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState<number | null>(null)
  const [duration, setDuration] = useState('30')
  const [trackStock, setTrackStock] = useState(false)
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    const i = existing.data
    if (!i) return
    setType(i.type)
    setName(i.name)
    setSku(i.sku ?? '')
    setPrice(i.price)
    setDuration(i.durationMinutes ? String(i.durationMinutes) : '')
    setTrackStock(i.trackStock)
    setIsActive(i.isActive)
  }, [existing.data])

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        sku: sku.trim() || null,
        price: price ?? 0,
        durationMinutes: type === 'SERVICE' && duration ? Number(duration) : null,
        trackStock: type === 'PRODUCT' ? trackStock : false,
        ...(!isNew && { isActive }),
      }
      return isNew
        ? api('/catalog', { method: 'POST', body: { ...body, type } })
        : api(`/catalog/${id}`, { method: 'PUT', body })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog'] })
      navigate('/catalog')
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (price !== null) save.mutate()
  }

  if (!isNew && existing.isPending) return <p className="muted">Cargando…</p>
  if (!isNew && existing.error) return <p className="error">No se pudo cargar: {existing.error.message}</p>

  return (
    <section>
      <Link to="/catalog">← Volver</Link>
      <h1>{isNew ? 'Nuevo ítem' : name}</h1>
      <form className="form narrow" onSubmit={onSubmit}>
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
        <label>
          Nombre *
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} autoFocus />
        </label>
        <label>
          Precio *
          <MoneyInput value={price} onChange={setPrice} required placeholder="0" />
        </label>
        <label>
          SKU / código
          <input value={sku} onChange={(e) => setSku(e.target.value)} maxLength={100} />
        </label>
        {type === 'SERVICE' ? (
          <label>
            Duración (minutos)
            <input type="number" min={5} max={720} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </label>
        ) : (
          <label className="checkbox">
            <input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} />
            Controlar stock
          </label>
        )}
        {!isNew && (
          <label className="checkbox">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Activo
          </label>
        )}
        {save.error && <p className="error">{save.error.message}</p>}
        <div className="actions">
          <button type="submit" disabled={save.isPending || price === null}>
            {save.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </section>
  )
}
