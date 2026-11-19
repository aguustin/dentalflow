import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react'
import { CreditCard, Lock, X } from 'lucide-react'
import { BillingOverview, CardSubscriptionResult } from '@dentalflow/types'
import { api, ApiError } from '../../lib/api'
import { formatMoney } from '../../lib/money'

type Plan = BillingOverview['plans'][number]

let initializedKey: string | null = null
function ensureMercadoPago(publicKey: string) {
  if (initializedKey === publicKey) return
  initMercadoPago(publicKey, { locale: 'es-AR' })
  initializedKey = publicKey
}

/** Brick colors taken from the active Velatrix theme tokens (the brick needs literal values). */
function brickStyle() {
  const root = document.documentElement
  const css = getComputedStyle(root)
  const v = (name: string) => css.getPropertyValue(name).trim()
  const forced = root.getAttribute('data-theme')
  const dark = forced ? forced === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  return {
    theme: dark ? 'dark' : 'default',
    customVariables: {
      baseColor: v('--accent'),
      baseColorFirstVariant: v('--accent-hover'),
      baseColorSecondVariant: v('--accent-pressed'),
      buttonTextColor: v('--on-accent'), // never white on the accent
      textPrimaryColor: v('--text'),
      textSecondaryColor: v('--text-muted'),
      inputBackgroundColor: v('--field-bg'),
      formBackgroundColor: v('--surface-3'),
      outlinePrimaryColor: v('--input-border'),
      outlineSecondaryColor: v('--border'),
      errorColor: v('--st-problem-fg'),
      successColor: v('--st-done-fg'),
      inputFocusedBoxShadow: `0 0 0 3px color-mix(in srgb, ${v('--focus-ring')} 22%, transparent)`,
      borderRadiusSmall: '6px',
      borderRadiusMedium: '8px',
      borderRadiusLarge: '14px',
      formPadding: '0px',
    },
  }
}

function cardErrorMessage(error: Error): string {
  if (error instanceof ApiError) {
    const reason = (error.body as { details?: { reason?: string } } | undefined)?.details?.reason
    if (reason === 'CARD_REJECTED') {
      return 'La tarjeta fue rechazada o no se pudo validar. Revisá los datos o probá con otra tarjeta.'
    }
    if (error.status === 409) return 'Ya estás pagando este plan.'
    if (error.status === 503) return 'Mercado Pago no responde en este momento. Probá de nuevo en unos minutos.'
  }
  return error.message
}

/**
 * Subscribe to a paid plan with a card entered in the app. Mercado Pago's card form tokenizes
 * the card in the browser: only a single-use token reaches our API.
 */
export function CardSubscriptionDialog({
  plan,
  publicKey,
  payerEmail,
  onDone,
  onClose,
  onRedirectInstead,
}: {
  plan: Plan
  publicKey: string
  payerEmail: string | null
  onDone: (result: CardSubscriptionResult) => void
  onClose: () => void
  onRedirectInstead: () => void
}) {
  ensureMercadoPago(publicKey)
  const style = useMemo(brickStyle, [])
  const [loadError, setLoadError] = useState(false)
  const [ready, setReady] = useState(false)

  const subscribe = useMutation({
    mutationFn: (cardTokenId: string) =>
      api<CardSubscriptionResult>('/billing/subscribe-card', {
        method: 'POST',
        body: { planName: plan.name, cardTokenId },
      }),
    onSuccess: onDone,
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !subscribe.isPending && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, subscribe.isPending])

  return (
    <div className="overlay" role="presentation">
      <div className="card dialog card-dialog" role="dialog" aria-modal="true" aria-labelledby="card-dialog-title">
        <div className="toolbar">
          <h2 id="card-dialog-title">
            <CreditCard size={20} aria-hidden /> Suscribirme al plan {plan.displayName}
          </h2>
          <button className="link icon-button" onClick={onClose} disabled={subscribe.isPending} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="plan-summary">
          <span>Plan {plan.displayName}</span>
          <strong>{formatMoney(plan.price, plan.currency)} / mes</strong>
        </div>
        <p className="muted small">
          Se cobra hoy y luego todos los meses en la misma tarjeta. Podés cancelar cuando quieras desde esta página.
        </p>

        {subscribe.error && <p className="alert">{cardErrorMessage(subscribe.error)}</p>}
        {loadError ? (
          <p className="alert">No se pudo cargar el formulario de tarjeta de Mercado Pago.</p>
        ) : (
          <>
            {!ready && <p className="muted">Cargando formulario seguro…</p>}
            <CardPayment
              locale="es-AR"
              initialization={{ amount: plan.price / 100, payer: payerEmail ? { email: payerEmail } : undefined }}
              customization={{
                paymentMethods: { maxInstallments: 1 },
                visual: { hideFormTitle: true, texts: { formSubmit: 'Suscribirme' }, style },
              }}
              onReady={() => setReady(true)}
              onError={(e) => {
                console.error('Mercado Pago card form error', e)
                if (!ready) setLoadError(true)
              }}
              onSubmit={async (form) => {
                // Errors are shown above; resolving lets the form be used again with a new token
                await subscribe.mutateAsync(form.token).catch(() => undefined)
              }}
            />
          </>
        )}

        <p className="secure-note small">
          <Lock size={14} aria-hidden />
          Aceptamos Visa, Mastercard y otras tarjetas de crédito y débito. Los datos de la tarjeta los procesa
          Mercado Pago; Velatrix no los guarda.
        </p>
        <button className="link" onClick={onRedirectInstead} disabled={subscribe.isPending}>
          Prefiero pagar desde el sitio de Mercado Pago
        </button>
      </div>
    </div>
  )
}
