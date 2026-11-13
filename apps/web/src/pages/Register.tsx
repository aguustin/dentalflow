import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'

interface VerticalOption {
  key: string
  label: string
}

/** "Clínica Sonrisa Feliz" → "clinica-sonrisa-feliz" (matches the API slug rule: [a-z0-9-]) */
function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}

export function Register() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const verticals = useQuery({
    queryKey: ['verticals'],
    queryFn: () => api<VerticalOption[]>('/verticals', { anonymous: true }),
  })

  const [form, setForm] = useState({
    organizationName: '',
    slug: '',
    vertical: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPassword: '',
  })
  const [slugEdited, setSlugEdited] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to="/" replace />

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((f) => ({
      ...f,
      [field]: value,
      // Auto-fill the slug from the name until the user edits it manually
      ...(field === 'organizationName' && !slugEdited && { slug: toSlug(value) }),
    }))

  const vertical = form.vertical || verticals.data?.[0]?.key || ''

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api('/organizations', {
        method: 'POST',
        anonymous: true,
        body: { ...form, vertical, timezone: browserTimeZone() },
      })
      await login(form.ownerEmail, form.ownerPassword, form.slug)
      try {
        localStorage.setItem('df.lastOrganizationSlug', form.slug)
      } catch {
        /* ignore */
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el registro')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="center">
      <form className="card form" onSubmit={onSubmit}>
        <h1>Registrá tu negocio</h1>

        <label>
          Rubro
          <select
            value={vertical}
            onChange={(e) => set('vertical')(e.target.value)}
            disabled={!verticals.data}
            required
          >
            {verticals.data?.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
          {verticals.error && <span className="error">No se pudieron cargar los rubros</span>}
        </label>
        <label>
          Nombre del negocio
          <input
            value={form.organizationName}
            onChange={(e) => set('organizationName')(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Identificador (para iniciar sesión)
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugEdited(true)
              set('slug')(toSlug(e.target.value))
            }}
            pattern="[a-z0-9-]+"
            required
          />
        </label>
        <label>
          Nombre
          <input value={form.ownerFirstName} onChange={(e) => set('ownerFirstName')(e.target.value)} required />
        </label>
        <label>
          Apellido
          <input value={form.ownerLastName} onChange={(e) => set('ownerLastName')(e.target.value)} required />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.ownerEmail}
            onChange={(e) => set('ownerEmail')(e.target.value)}
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={form.ownerPassword}
            onChange={(e) => set('ownerPassword')(e.target.value)}
            minLength={6}
            required
          />
        </label>

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting || !vertical}>
          {submitting ? 'Creando…' : 'Crear cuenta'}
        </button>
        <p className="muted">
          ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
        </p>
      </form>
    </div>
  )
}
