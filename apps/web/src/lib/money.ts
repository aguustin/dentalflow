import { useOrganization } from '../org/OrganizationContext'

/** Amounts travel as integers in cents. These helpers only format/parse for the UI. */

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(cents / 100)
}

/** Formatter bound to the organization's currency. */
export function useMoney(): (cents: number) => string {
  const { currency } = useOrganization()
  return (cents) => formatMoney(cents, currency)
}

/**
 * Parses what a user types into cents: "1500", "1500,5", "1.500,50", "1500.50".
 * With a comma, the comma is the decimal separator and dots are thousands.
 * Returns null when it isn't a valid non-negative amount.
 */
export function parseMoney(input: string): number | null {
  let s = input.trim().replace(/\s|\$/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '') // "1.500" = thousands
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  return Math.round(Number(s) * 100)
}

/** Cents → plain editable string ("1500,50") */
export function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ',')
}
