import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, ShieldCheck, Unplug } from 'lucide-react'
import { PaymentAccountStatus } from '@dentalflow/types'
import { api, ApiError } from '../../lib/api'
import { StatusBadge } from '../../design-system/StatusBadge'

const CONNECT_ERRORS: Record<string, string> = {
  denied: 'Cancelaste la autorización en Mercado Pago. Podés intentarlo de nuevo cuando quieras.',
  invalid_state: 'El enlace de conexión venció o no es válido. Volvé a tocar "Conectar Mercado Pago".',
  rejected: 'Mercado Pago no aceptó la autorización. Probá conectar de nuevo.',
  failed: 'No se pudo completar la conexión con Mercado Pago. Probá de nuevo en unos minutos.',
}

/** The organization's own Mercado Pago account, to collect from its customers with card. */
export function OnlinePaymentsPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const result = params.get('mp')
  const reason = params.get('reason') ?? 'failed'

  const { data, error, isPending } = useQuery({
    queryKey: ['payment-account'],
    queryFn: () => api<PaymentAccountStatus>('/payment-accounts/mercadopago'),
    retry: false,
  })

  const connect = useMutation({
    mutationFn: () => api<{ authorizationUrl: string }>('/payment-accounts/mercadopago/connect', { method: 'POST' }),
    // Leave the app: the clinic logs into its Mercado Pago account and authorizes Velatrix
    onSuccess: (r) => window.location.assign(r.authorizationUrl),
  })
  const disconnect = useMutation({
    mutationFn: () => api<PaymentAccountStatus>('/payment-accounts/mercadopago', { method: 'DELETE' }),
    onSuccess: (s) => {
      queryClient.setQueryData(['payment-account'], s)
      setParams({}, { replace: true })
    },
  })

  if (error instanceof ApiError && error.status === 403) {
    return (
      <section>
        <h1>Cobros online</h1>
        <p className="muted">Tu rol no puede ver la configuración de cobros.</p>
      </section>
    )
  }
  if (isPending) return <p className="muted">Cargando…</p>
  if (error) return <p className="error">No se pudo cargar: {error.message}</p>

  const account = data.account
  const actionError = connect.error ?? disconnect.error
  const forbidden = actionError instanceof ApiError && actionError.status === 403

  return (
    <section>
      <h1>Cobros online</h1>
      <p className="muted" style={{ maxWidth: 640 }}>
        Conectá la cuenta de Mercado Pago de tu negocio para cobrarles a tus clientes con Visa, Mastercard y otras
        tarjetas mediante un link o código QR. El dinero se acredita directamente en tu cuenta.
      </p>

      {result === 'connected' && <p className="alert-ok">¡Listo! Tu cuenta de Mercado Pago quedó conectada.</p>}
      {result === 'error' && <p className="alert">{CONNECT_ERRORS[reason] ?? CONNECT_ERRORS.failed}</p>}
      {!data.configured && (
        <p className="alert">
          El servidor no tiene configurada la conexión con Mercado Pago (MERCADOPAGO_CLIENT_ID, MERCADOPAGO_CLIENT_SECRET y
          PAYMENT_TOKENS_KEY en apps/api/.env).
        </p>
      )}
      {actionError && (
        <p className="alert">{forbidden ? 'Solo el dueño o un administrador puede cambiar esta conexión.' : actionError.message}</p>
      )}

      <div className="card inline-card account-card">
        <div className="toolbar">
          <h2>Mercado Pago</h2>
          {!account ? (
            <StatusBadge category="cancelled" label="Sin conectar" />
          ) : account.needsReconnect ? (
            <StatusBadge category="problem" label="Hay que volver a conectar" />
          ) : (
            <StatusBadge category="done" label="Conectada" />
          )}
        </div>

        {account ? (
          <dl className="summary">
            <dt>Cuenta</dt>
            <dd>{account.label ?? `ID ${account.externalUserId}`}</dd>
            <dt>Modo</dt>
            <dd>{account.liveMode ? 'Producción' : 'Prueba'}</dd>
            <dt>Conectada el</dt>
            <dd>{new Date(account.connectedAt).toLocaleDateString('es-AR')}</dd>
          </dl>
        ) : (
          <p className="muted">Todavía no conectaste una cuenta.</p>
        )}

        {account?.needsReconnect && (
          <p className="error">
            La autorización venció o fue revocada desde Mercado Pago. Volvé a conectar la cuenta para seguir cobrando online.
          </p>
        )}

        <div className="actions">
          {(!account || account.needsReconnect) && (
            <button disabled={!data.configured || connect.isPending} onClick={() => connect.mutate()}>
              <Link2 size={16} aria-hidden />
              {connect.isPending ? 'Abriendo Mercado Pago…' : account ? 'Volver a conectar' : 'Conectar Mercado Pago'}
            </button>
          )}
          {account && (
            <button
              className="secondary"
              disabled={disconnect.isPending}
              onClick={() =>
                window.confirm('¿Desconectar la cuenta de Mercado Pago? No vas a poder cobrar online hasta conectarla de nuevo.') &&
                disconnect.mutate()
              }
            >
              <Unplug size={16} aria-hidden />
              Desconectar
            </button>
          )}
        </div>

        <p className="secure-note small">
          <ShieldCheck size={14} aria-hidden />
          Velatrix nunca ve tu contraseña de Mercado Pago. Las credenciales de acceso se guardan cifradas y podés revocar
          el permiso en cualquier momento desde tu cuenta de Mercado Pago.
        </p>
      </div>
    </section>
  )
}
