import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BillingOverview } from '@dentalflow/types'
import { api, ApiError } from '../../lib/api'
import { formatMoney } from '../../lib/money'

const STATUS: Record<string, string> = {
  ACTIVE: 'Activa',
  PAST_DUE: 'Pago pendiente',
  CANCELED: 'Cancelada',
}

const PAYMENT_STATUS: Record<string, string> = {
  approved: 'Aprobado',
  rejected: 'Rechazado',
  pending: 'Pendiente',
  in_process: 'En proceso',
}

const limit = (n: number) => (n < 0 ? 'Ilimitados' : String(n))

/** SaaS plan of the organization, paid with Mercado Pago Subscriptions. */
export function BillingPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  // Back from Mercado Pago: the plan changes when the webhook arrives (a few seconds)
  const [waiting, setWaiting] = useState(() => params.has('checkout'))

  const { data, error, isPending } = useQuery({
    queryKey: ['billing'],
    queryFn: () => api<BillingOverview>('/billing/plan'),
    retry: false,
    refetchInterval: waiting ? 3000 : false,
  })

  // Stop waiting after a minute or once the subscription is paid with Mercado Pago
  useEffect(() => {
    if (!waiting) return
    const t = setTimeout(() => setWaiting(false), 60_000)
    return () => clearTimeout(t)
  }, [waiting])
  useEffect(() => {
    if (waiting && data?.subscription?.paidWithMercadoPago) {
      setWaiting(false)
      setParams({}, { replace: true })
    }
  }, [waiting, data, setParams])

  const checkout = useMutation({
    mutationFn: (planName: string) => api<{ initPoint: string }>('/billing/checkout', { method: 'POST', body: { planName } }),
    // Leave the app: the customer authorizes the recurring charge in Mercado Pago
    onSuccess: (r) => window.location.assign(r.initPoint),
  })
  const cancel = useMutation({
    mutationFn: () => api<BillingOverview>('/billing/cancel', { method: 'POST' }),
    onSuccess: (o) => queryClient.setQueryData(['billing'], o),
  })

  if (error instanceof ApiError && error.status === 403) {
    return (
      <section>
        <h1>Plan y facturación</h1>
        <p className="muted">Tu rol no puede ver la facturación de la cuenta.</p>
      </section>
    )
  }
  if (isPending) return <p className="muted">Cargando…</p>
  if (error) return <p className="error">No se pudo cargar: {error.message}</p>

  const sub = data.subscription
  const actionError = checkout.error ?? cancel.error

  return (
    <section>
      <h1>Plan y facturación</h1>

      {waiting && (
        <p className="alert-ok">Procesando la suscripción con Mercado Pago… esto puede tardar unos segundos.</p>
      )}
      {!data.configured && (
        <p className="alert">El servidor no tiene configuradas las credenciales de Mercado Pago (apps/api/.env).</p>
      )}

      {sub && (
        <div className="card inline-card">
          <div>
            Plan actual: <strong>{sub.planDisplayName}</strong> · {STATUS[sub.status] ?? sub.status}
          </div>
          {sub.status === 'PAST_DUE' && (
            <p className="error">
              No se pudo cobrar la última cuota. Mercado Pago reintentará; revisá el medio de pago en tu cuenta de Mercado Pago.
            </p>
          )}
          {sub.paidWithMercadoPago && (
            <div className="muted small">
              Débito automático con Mercado Pago
              {sub.nextPaymentDate && ` · próximo cobro ${new Date(sub.nextPaymentDate).toLocaleDateString('es-AR')}`}
            </div>
          )}
          {sub.planName !== 'free' && (
            <button
              className="danger"
              disabled={cancel.isPending}
              onClick={() =>
                window.confirm('¿Cancelar la suscripción y volver al plan gratuito? Se detienen los cobros en Mercado Pago.') &&
                cancel.mutate()
              }
            >
              Cancelar suscripción
            </button>
          )}
        </div>
      )}
      {actionError && <p className="error">{actionError.message}</p>}

      <div className="plans">
        {data.plans.map((p) => {
          const current = sub?.planName === p.name
          return (
            <div key={p.name} className={current ? 'card plan-card current' : 'card plan-card'}>
              <h2>{p.displayName}</h2>
              <div className="kpi-value">{p.price === 0 ? 'Gratis' : `${formatMoney(p.price, p.currency)} / mes`}</div>
              <ul className="small">
                <li>Clientes: {limit(p.maxCustomers)}</li>
                <li>Turnos: {limit(p.maxAppointments)}</li>
              </ul>
              {current ? (
                <span className="badge">Plan actual</span>
              ) : p.price > 0 ? (
                <button disabled={checkout.isPending || !data.configured} onClick={() => checkout.mutate(p.name)}>
                  {checkout.isPending && checkout.variables === p.name ? 'Abriendo Mercado Pago…' : 'Suscribirme'}
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="section">
        <h2>Historial de cobros</h2>
        {data.payments.length === 0 ? (
          <p className="muted">Sin cobros todavía.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Estado</th>
                <th className="num">Monto</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.paidAt ?? p.createdAt).toLocaleDateString('es-AR')}</td>
                  <td>{PAYMENT_STATUS[p.status] ?? p.status}</td>
                  <td className="num">{formatMoney(p.amount, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
