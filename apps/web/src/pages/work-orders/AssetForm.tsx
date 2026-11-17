import { FormEvent, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Asset } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useOrganization } from '../../org/OrganizationContext'
import { AttributeFields, AttributeValues } from '../../components/AttributeFields'

/** Create (customerId) or edit (asset) a customer's equipment with the vertical's fields. */
export function AssetForm({
  customerId,
  asset,
  onSaved,
  onCancel,
}: {
  customerId?: string
  asset?: Asset
  onSaved: (asset: Asset) => void
  onCancel?: () => void
}) {
  const org = useOrganization()
  const fields = org.vertical.assetAttributes ?? []
  const [label, setLabel] = useState(asset?.label ?? '')
  const [attributes, setAttributes] = useState<AttributeValues>(asset?.attributes ?? {})

  const save = useMutation({
    mutationFn: () =>
      asset
        ? api<Asset>(`/assets/${asset.id}`, { method: 'PUT', body: { label, attributes } })
        : api<Asset>('/assets', { method: 'POST', body: { customerId, label, attributes } }),
    onSuccess: onSaved,
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation() // may be nested inside another form's area
    save.mutate()
  }

  return (
    <form className="form card inline-card" onSubmit={onSubmit}>
      <label>
        Descripción corta *
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          maxLength={200}
          placeholder="Ej. Ford Fiesta · AB123CD"
        />
      </label>
      <AttributeFields fields={fields} values={attributes} onChange={setAttributes} />
      {save.error && <p className="error">{save.error.message}</p>}
      <div className="actions">
        <button type="submit" disabled={save.isPending}>
          {asset ? 'Guardar' : 'Crear'}
        </button>
        {onCancel && (
          <button type="button" className="link" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
