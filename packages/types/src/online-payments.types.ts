/** The organization's own Mercado Pago account (GET /payment-accounts/mercadopago). No secrets. */
export interface PaymentAccountStatus {
  /** false when the server lacks the OAuth credentials or the encryption key */
  configured: boolean
  connected: boolean
  account: {
    /** email or nickname of the connected Mercado Pago account */
    label: string | null
    externalUserId: string
    liveMode: boolean
    /** the connection expired or was revoked: connect again */
    needsReconnect: boolean
    connectedAt: string
    expiresAt: string
  } | null
}
