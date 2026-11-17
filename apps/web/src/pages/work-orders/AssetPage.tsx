import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AssetDetail } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useTerms } from '../../org/OrganizationContext'
import { AssetForm } from './AssetForm'
import { WO_STATUS_LABELS } from './labels'

/** A customer's equipment: its fields and the history of work orders. */
export function AssetPage() {
  const { id } = useParams()
  const terms = useTerms()
  const queryClient = useQueryClient()
  const { data: asset, error, isPending } = useQuery({
    queryKey: ['assets', 'detail', id],
    queryFn: () => api<AssetDetail>(`/assets/${id}`),
  })

  if (isPending) return <p className="muted">Cargando…</p>
  if (error) return <p className="error">No se pudo cargar: {error.message}</p>

  return (
    <section>
      <Link to={`/customers/${asset.customerId}`}>← {asset.customerName}</Link>
      <h1>
        {terms.asset?.singular ?? 'Equipo'}: {asset.label}
      </h1>
      <AssetForm
        key={asset.id + asset.label}
        asset={asset}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: ['assets'] })}
      />

      <div className="section">
        <h2>Historial de {terms.workOrder?.plural.toLowerCase() ?? 'órdenes'}</h2>
        {asset.workOrders.length === 0 ? (
          <p className="muted">Sin órdenes.</p>
        ) : (
          <table className="table">
            <tbody>
              {asset.workOrders.map((w) => (
                <tr key={w.id}>
                  <td>
                    <Link to={`/work-orders/${w.id}`}>#{w.number}</Link>
                  </td>
                  <td>{new Date(w.createdAt).toLocaleDateString('es-AR')}</td>
                  <td>{w.reportedIssue}</td>
                  <td>{WO_STATUS_LABELS[w.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
