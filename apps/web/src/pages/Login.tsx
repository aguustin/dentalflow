import { FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const LAST_SLUG_KEY = 'df.lastOrganizationSlug'

function readLastSlug(): string {
  try {
    return localStorage.getItem(LAST_SLUG_KEY) ?? ''
  } catch {
    return ''
  }
}

export function Login() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [organizationSlug, setOrganizationSlug] = useState(readLastSlug)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password, organizationSlug.trim())
      try {
        localStorage.setItem(LAST_SLUG_KEY, organizationSlug.trim())
      } catch {
        /* ignore */
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="center">
      <form className="card form" onSubmit={onSubmit}>
        <h1>Iniciar sesión</h1>
        <label>
          Organización
          <input
            value={organizationSlug}
            onChange={(e) => setOrganizationSlug(e.target.value)}
            placeholder="mi-clinica"
            required
          />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="muted">
          ¿No tenés cuenta? <Link to="/register">Registrá tu negocio</Link>
        </p>
      </form>
    </div>
  )
}
