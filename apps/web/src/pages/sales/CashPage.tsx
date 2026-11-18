import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CashSession, PaymentMethod } from '@dentalflow/types'
import { api } from '../../lib/api'
import { useMoney } from '../../lib/money'
import { MoneyInput } from '../../components/MoneyInput'
import { METHOD_LABELS } from './labels'

export function CashPage() {
  const money = useMoney()
  const queryClient = useQueryClient()
  // The API answers 200 with an empty body (→ undefined) when no session is open
  const current = useQuery({
    queryKey: ['cash', 'current'],
    queryFn: async () => (await api<CashSession | undefined>('/cash/current')) ?? null,
  })
  const history = useQuery({ queryKey: ['cash', 'sessions'], queryFn: () => api<CashSession[]>('/cash/sessions') })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cash'] })

  const [opening, setOpening] = useState<number | null>(0)
  const [counted, setCounted] = useState<number | null>(null)
  const [notes, setNotes] = useState('')

  const open = useMutation({
    mutationFn: () => api('/cash/open', { method: 'POST', body: { openingAmount: opening ?? 0 } }),
    onSuccess: () => void invalidate(),
  })
  const close = useMutation({
    mutationFn: () => api<CashSession>('/cash/close', { method: 'POST', body: { countedCash: counted, notes: notes || undefined } }),
    onSuccess: () => {
      setCounted(null)
      setNotes('')
      void invalidate()
    },
  })

  function onOpen(e: FormEvent) {
    e.preventDefault()
    open.mutate()
  }
  function onClose(e: FormEvent) {
    e.preventDefault()
    if (counted !== null && window.confirm('¿Cerrar la caja?')) close.mutate()
  }

  const session = current.data

  return (
    <section>
      <Link to="/sales">← Ventas</Link>
      <h1>Caja</h1>

      {current.isPending ? (
        <p className="muted">Cargando…</p>
      ) : current.error ? (
        <p className="error">{current.error.message}</p>
      ) : !session ? (
        <form className="card form inline-card" onSubmit={onOpen}>
          <h2>La caja está cerrada</h2>
          <p className="muted small">Los pagos registrados con la caja cerrada no quedan asociados a ninguna caja.</p>
          <label>
            Efectivo inicial
            <MoneyInput value={opening} onChange={setOpening} required />
          </label>
          {open.error && <p className="error">{open.error.message}</p>}
          <button type="submit" disabled={open.isPending || opening === null}>
            Abrir caja
          </button>
        </form>
      ) : (
        <div className="card inline-card">
          <h2>Caja abierta desde {new Date(session.openedAt).toLocaleString('es-AR')}</h2>
          <Breakdown session={session} />
          <form className="form" onSubmit={onClose}>
            <label>
              Efectivo contado al cerrar
              <MoneyInput value={counted} onChange={setCounted} required />
            </label>
            {counted !== null && (
              <p>
                Diferencia: <strong>{money(counted - session.expectedCash)}</strong>
              </p>
            )}
            <label>
              Notas
              <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            </label>
            {close.error && <p className="error">{close.error.message}</p>}
            <button type="submit" disabled={close.isPending || counted === null}>
              Cerrar caja
            </button>
          </form>
        </div>
      )}

      <div className="section">
        <h2>Cierres anteriores</h2>
        {history.data?.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Apertura</th>
                <th>Cierre</th>
                <th className="num">Cobrado</th>
                <th className="num">Efectivo esperado</th>
                <th className="num">Contado</th>
                <th className="num">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {history.data.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.openedAt).toLocaleString('es-AR')}</td>
                  <td>{s.closedAt && new Date(s.closedAt).toLocaleString('es-AR')}</td>
                  <td className="num">{money(s.totalCollected)}</td>
                  <td className="num">{money(s.expectedCash)}</td>
                  <td className="num">{s.countedCash !== null ? money(s.countedCash) : '—'}</td>
                  <td className={s.difference ? 'num error' : 'num'}>{s.difference !== null ? money(s.difference) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Sin cierres todavía.</p>
        )}
      </div>
    </section>
  )
}

function Breakdown({ session }: { session: CashSession }) {
  const money = useMoney()
  return (
    <dl className="summary">
      <dt>Efectivo inicial</dt>
      <dd>{money(session.openingAmount)}</dd>
      {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
        <FragmentRow key={m} label={METHOD_LABELS[m]} value={money(session.byMethod[m])} />
      ))}
      {Object.values(session.refundsByMethod).some((v) => v > 0) && (
        <FragmentRow
          label="Reintegros por devoluciones"
          value={`−${money(Object.values(session.refundsByMethod).reduce((a, b) => a + b, 0))}`}
        />
      )}
      <dt>
        <strong>Total cobrado (neto)</strong>
      </dt>
      <dd>
        <strong>{money(session.totalCollected)}</strong> ({session.paymentCount} pagos)
      </dd>
      <dt>Efectivo esperado en caja</dt>
      <dd>{money(session.expectedCash)}</dd>
    </dl>
  )
}

function FragmentRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  )
}
