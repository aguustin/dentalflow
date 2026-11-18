/**
 * Product lockup: official icon (unaltered) + product name in plain text.
 * The VELATRIX wordmark is NOT recreated with fonts until the official SVGs exist.
 */
export const PRODUCT_NAME = 'Velatrix One'
export const EDITION_NAME = 'Clinic'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <img src="/brand/velatrix-icon.png" alt={compact ? `${PRODUCT_NAME} ${EDITION_NAME}` : ''} />
      {!compact && (
        <div>
          <div className="brand-name">{PRODUCT_NAME}</div>
          <div className="edition">{EDITION_NAME}</div>
        </div>
      )}
    </div>
  )
}
