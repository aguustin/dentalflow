import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Asset } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useTerms } from '../../org/OrganizationContext'
import { AssetForm } from './AssetForm'

/** Section of the customer page listing their equipment (repair verticals). */
export function CustomerAssets({ customerId }: { customerId: string }) {
  const terms = useTerms()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const assets = useQuery({
    queryKey: ['assets', customerId],
    queryFn: () => api<Asset[]>(`/assets?customerId=${customerId}`),
  })
  const plural = terms.asset?.plural ?? 'Equipos'

  return (
    <div className="section">
      <h2>{plural}</h2>
      {assets.data?.length ? (
        <ul className="plain-list">
          {assets.data.map((a) => (
            <li key={a.id}>
              <Link to={`/assets/${a.id}`}>{a.label}</Link>
            </li>
          ))}
        </ul>
      ) : (
        !assets.isPending && <p className="muted">Sin {plural.toLowerCase()}.</p>
      )}
      {adding ? (
        <AssetForm
          customerId={customerId}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            void queryClient.invalidateQueries({ queryKey: ['assets', customerId] })
          }}
        />
      ) : (
        <button className="link" onClick={() => setAdding(true)}>
          + Agregar {terms.asset?.singular.toLowerCase() ?? 'equipo'}
        </button>
      )}
    </div>
  )
}
