import { useEffect, useState } from 'react'
import { centsToInput, parseMoney } from '../lib/money'

/** Text input for amounts; reports cents (or null while the text is not a valid amount). */
export function MoneyInput({
  value,
  onChange,
  required,
  ...rest
}: {
  value: number | null
  onChange: (cents: number | null) => void
  required?: boolean
  placeholder?: string
  autoFocus?: boolean
  'aria-label'?: string
}) {
  const [text, setText] = useState(value === null ? '' : centsToInput(value))
  // Sync when the value changes from outside (e.g. picking a catalog item)
  useEffect(() => {
    if (value !== parseMoney(text)) setText(value === null ? '' : centsToInput(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const invalid = text.trim() !== '' && parseMoney(text) === null
  return (
    <input
      {...rest}
      inputMode="decimal"
      value={text}
      required={required}
      className={invalid ? 'invalid' : undefined}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parseMoney(e.target.value))
      }}
    />
  )
}
