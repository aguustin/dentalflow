import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Asset, WorkOrderDetail } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useTerms } from '../../org/OrganizationContext'
import { CustomerPicker, PickedCustomer } from '../../components/CustomerPicker'
import { useActiveStaff } from '../schedule/AppointmentDialog'
import { AssetForm } from './AssetForm'

/** Equipment intake: customer → equipment (or create it) → technician → reported issue. */
export function WorkOrderNewPage() {
  const terms = useTerms()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const staff = useActiveStaff()
  const [customer, setCustomer] = useState<PickedCustomer | null>(null)
  const [assetId, setAssetId] = useState('')
  const [creatingAsset, setCreatingAsset] = useState(false)
  const [staffId, setStaffId] = useState('')
  const [reportedIssue, setReportedIssue] = useState('')
  const [notes, setNotes] = useState('')
  const assetName = terms.asset?.singular ?? 'Equipo'

  const assets = useQuery({
    queryKey: ['assets', customer?.id],
    queryFn: () => api<Asset[]>(`/assets?customerId=${customer!.id}`),
    enabled: !!customer,
  })

  const create = useMutation({
    mutationFn: () =>
      api<WorkOrderDetail>('/work-orders', {
        method: 'POST',
        body: {
          customerId: customer!.id,
          assetId: assetId || undefined,
          staffId: staffId || undefined,
          reportedIssue,
          notes: notes || undefined,
        },
      }),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      navigate(`/work-orders/${order.id}`)
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (customer) create.mutate()
  }

  return (
    <section>
      <Link to="/work-orders">← Volver</Link>
      <h1>Nueva {terms.workOrder?.singular.toLowerCase() ?? 'orden'}</h1>

      <div className="form narrow">
        <CustomerPicker
          label={terms.customer.singular}
          value={customer}
          onChange={(c) => {
            setCustomer(c)
            setAssetId('')
            setCreatingAsset(false)
          }}
        />
        {customer && (
          <>
            <label>
              {assetName}
              <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                <option value="">— Sin {assetName.toLowerCase()} —</option>
                {assets.data?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            {creatingAsset ? (
              <AssetForm
                customerId={customer.id}
                onCancel={() => setCreatingAsset(false)}
                onSaved={(a) => {
                  void queryClient.invalidateQueries({ queryKey: ['assets', customer.id] })
                  setAssetId(a.id)
                  setCreatingAsset(false)
                }}
              />
            ) : (
              <button type="button" className="link" onClick={() => setCreatingAsset(true)}>
                + Nuevo {assetName.toLowerCase()}
              </button>
            )}
          </>
        )}
      </div>

      <form className="form narrow" onSubmit={onSubmit}>
        <label>
          {terms.staff.singular} asignado
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">— Sin asignar —</option>
            {staff.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Falla reportada por el {terms.customer.singular.toLowerCase()} *
          <textarea value={reportedIssue} onChange={(e) => setReportedIssue(e.target.value)} rows={3} required maxLength={2000} />
        </label>
        <label>
          Observaciones de recepción
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} placeholder="Estado visible, rayones, accesorios…" />
        </label>
        {create.error && <p className="error">{create.error.message}</p>}
        <div className="actions">
          <button type="submit" disabled={!customer || !reportedIssue.trim() || create.isPending}>
            Crear orden
          </button>
        </div>
      </form>
    </section>
  )
}
