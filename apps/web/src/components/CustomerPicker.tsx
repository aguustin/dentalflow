import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Customer, Paginated } from '@dentalflow/types'

export interface PickedCustomer {
  id: string
  name: string
}

/** Search-as-you-type customer selector (first 10 matches). */
export function CustomerPicker({
  value,
  onChange,
  label,
}: {
  value: PickedCustomer | null
  onChange: (c: PickedCustomer | null) => void
  label: string
}) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  const results = useQuery({
    queryKey: ['customers', 'picker', debounced],
    queryFn: () =>
      api<Paginated<Customer>>(`/customers?limit=10${debounced ? `&name=${encodeURIComponent(debounced)}` : ''}`),
    enabled: !value,
  })

  if (value) {
    return (
      <label>
        {label}
        <div className="picked">
          <strong>{value.name}</strong>
          <button type="button" className="link" onClick={() => onChange(null)}>
            Cambiar
          </button>
        </div>
      </label>
    )
  }

  return (
    <label>
      {label} *
      <input placeholder="Buscar por nombre…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="picker-results">
        {results.isPending && <span className="muted small">Buscando…</span>}
        {results.data?.items.length === 0 && <span className="muted small">Sin resultados</span>}
        {results.data?.items.map((c) => (
          <button type="button" key={c.id} className="link" onClick={() => onChange({ id: c.id, name: c.name })}>
            {c.name}
            {c.documentId && <span className="muted"> · {c.documentId}</span>}
          </button>
        ))}
      </div>
    </label>
  )
}
