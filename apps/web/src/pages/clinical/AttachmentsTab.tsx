import { FormEvent, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClinicalAttachment } from '@dentalflow/types'
import { api, apiBlob } from '../../lib/api'

const MAX_MB = 15

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

export function AttachmentsTab({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const key = ['clinical', customerId, 'attachments']

  const list = useQuery({
    queryKey: key,
    queryFn: () => api<ClinicalAttachment[]>(`/clinical/${customerId}/attachments`),
  })

  const upload = useMutation({
    mutationFn: () => {
      const form = new FormData()
      form.append('file', file!)
      if (description.trim()) form.append('description', description.trim())
      return api(`/clinical/${customerId}/attachments`, { method: 'POST', form })
    },
    onSuccess: () => {
      setFile(null)
      setDescription('')
      if (fileInput.current) fileInput.current.value = ''
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/clinical/${customerId}/attachments/${id}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (file) upload.mutate()
  }

  const tooBig = file !== null && file.size > MAX_MB * 1024 * 1024

  return (
    <div>
      <form className="row narrow-row" onSubmit={onSubmit}>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          aria-label="Archivo"
        />
        <input placeholder="Descripción (ej. Panorámica)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        <button type="submit" disabled={!file || tooBig || upload.isPending}>
          {upload.isPending ? 'Subiendo…' : 'Subir'}
        </button>
      </form>
      <p className="muted small">JPG, PNG, WEBP o PDF, hasta {MAX_MB} MB.</p>
      {tooBig && <p className="error">El archivo supera los {MAX_MB} MB.</p>}
      {(upload.error ?? remove.error) && <p className="error">{(upload.error ?? remove.error)!.message}</p>}

      {list.isPending ? (
        <p className="muted">Cargando…</p>
      ) : list.error ? (
        <p className="error">{list.error.message}</p>
      ) : list.data.length === 0 ? (
        <p className="muted">Sin adjuntos.</p>
      ) : (
        <div className="attachments">
          {list.data.map((a) => (
            <AttachmentCard
              key={a.id}
              customerId={customerId}
              attachment={a}
              onDelete={() => window.confirm(`¿Eliminar "${a.filename}"?`) && remove.mutate(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Files require the session token, so they are fetched as blobs (never a public URL). */
function AttachmentCard({
  customerId,
  attachment,
  onDelete,
}: {
  customerId: string
  attachment: ClinicalAttachment
  onDelete: () => void
}) {
  const isImage = attachment.mimeType.startsWith('image/')
  const path = `/clinical/${customerId}/attachments/${attachment.id}/file`
  const [thumb, setThumb] = useState<string | null>(null)

  useEffect(() => {
    if (!isImage) return
    let url: string | null = null
    let cancelled = false
    apiBlob(path)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setThumb(url)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [isImage, path])

  async function open() {
    const blob = await apiBlob(path)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <div className="card attachment">
      <button className="thumb" onClick={() => void open()} title="Abrir">
        {isImage ? thumb ? <img src={thumb} alt={attachment.filename} /> : <span className="muted small">Cargando…</span> : <span>PDF</span>}
      </button>
      <div className="small">
        <strong>{attachment.filename}</strong>
        {attachment.description && <div>{attachment.description}</div>}
        <div className="muted">
          {new Date(attachment.createdAt).toLocaleDateString('es-AR')} · {formatSize(attachment.size)}
        </div>
        <button className="link" onClick={onDelete}>
          Eliminar
        </button>
      </div>
    </div>
  )
}
