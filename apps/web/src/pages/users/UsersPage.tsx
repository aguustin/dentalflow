import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import { Member, Role } from '@dentalflow/types'

/** Display names for the default roles; unknown roles show their raw name. */
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  reception: 'Recepción',
  professional: 'Profesional',
  viewer: 'Solo lectura',
}
const roleLabel = (name: string) => ROLE_LABELS[name] ?? name

export function UsersPage() {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)

  const members = useQuery({ queryKey: ['members'], queryFn: () => api<Member[]>('/organizations/members') })
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => api<Role[]>('/roles') })
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<{ id: string }>('/users/me') })

  const changeRole = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      api('/roles/assign', { method: 'POST', body: { userId, roleId } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  })

  if (members.error instanceof ApiError && members.error.status === 403) {
    return (
      <section>
        <h1>Usuarios</h1>
        <p className="muted">No tenés permiso para ver los usuarios de la organización.</p>
      </section>
    )
  }

  return (
    <section>
      <div className="toolbar">
        <h1>Usuarios</h1>
        {!adding && <button onClick={() => setAdding(true)}>Agregar usuario</button>}
      </div>

      {adding && roles.data && <AddUserForm roles={roles.data} onDone={() => setAdding(false)} />}

      {members.isPending ? (
        <p className="muted">Cargando…</p>
      ) : members.error ? (
        <p className="error">No se pudo cargar el listado: {members.error.message}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
            {members.data.map((m) => {
              const isMe = m.userId === me.data?.id
              return (
                <tr key={m.membershipId}>
                  <td>
                    {m.firstName} {m.lastName} {isMe && <span className="muted">(vos)</span>}
                  </td>
                  <td>{m.email}</td>
                  <td>
                    {isMe || !roles.data ? (
                      roleLabel(m.roleName)
                    ) : (
                      <select
                        value={m.roleId}
                        disabled={changeRole.isPending}
                        onChange={(e) => changeRole.mutate({ userId: m.userId, roleId: e.target.value })}
                      >
                        {roles.data.map((r) => (
                          <option key={r.id} value={r.id}>
                            {roleLabel(r.name)}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {changeRole.error && <p className="error">{changeRole.error.message}</p>}
      <p className="muted small">Los cambios de rol se aplican en los próximos 15 minutos.</p>
    </section>
  )
}

function AddUserForm({ roles, onDone }: { roles: Role[]; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: roles.find((r) => r.name !== 'admin')?.id ?? roles[0]?.id ?? '',
  })
  const set = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const add = useMutation({
    mutationFn: async () => {
      const { roleId, ...user } = form
      const created = await api<{ id: string }>('/users', { method: 'POST', body: user })
      await api('/organizations/members', { method: 'POST', body: { userId: created.id, roleId } })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['members'] })
      onDone()
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    add.mutate()
  }

  const error =
    add.error instanceof ApiError && add.error.status === 409
      ? 'Ese email ya tiene una cuenta. Por ahora solo se pueden agregar usuarios nuevos.'
      : add.error?.message

  return (
    <form className="card form inline-card" onSubmit={onSubmit}>
      <h2>Nuevo usuario</h2>
      <div className="row">
        <label>
          Nombre
          <input value={form.firstName} onChange={set('firstName')} required autoFocus />
        </label>
        <label>
          Apellido
          <input value={form.lastName} onChange={set('lastName')} required />
        </label>
      </div>
      <label>
        Email
        <input type="email" value={form.email} onChange={set('email')} required />
      </label>
      <label>
        Contraseña inicial
        <input type="password" value={form.password} onChange={set('password')} required minLength={6} />
      </label>
      <label>
        Rol
        <select value={form.roleId} onChange={set('roleId')} required>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {roleLabel(r.name)}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="submit" disabled={add.isPending}>
          {add.isPending ? 'Creando…' : 'Crear usuario'}
        </button>
        <button type="button" className="link" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
