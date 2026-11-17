import { ReactNode } from 'react'
import { AttributeField } from '@dentalflow/types'

export type AttributeValue = string | number | boolean
export type AttributeValues = Record<string, AttributeValue>

/**
 * Renders inputs for a vertical's attribute schema (text, number, date, select, boolean).
 * Empty values are removed so optional fields are simply not sent.
 */
export function AttributeFields({
  fields,
  values,
  onChange,
}: {
  fields: AttributeField[]
  values: AttributeValues
  onChange: (values: AttributeValues) => void
}) {
  const set = (key: string, value: AttributeValue | undefined) => {
    const next = { ...values }
    if (value === undefined || value === '') delete next[key]
    else next[key] = value
    onChange(next)
  }

  return (
    <>
      {fields.map((field) => (
        <Field key={field.key} field={field} value={values[field.key]} set={(v) => set(field.key, v)} />
      ))}
    </>
  )
}

function Field({
  field,
  value,
  set,
}: {
  field: AttributeField
  value: AttributeValue | undefined
  set: (value: AttributeValue | undefined) => void
}) {
  const labelled = (control: ReactNode) => (
    <label>
      {field.label}
      {field.required && ' *'}
      {control}
    </label>
  )
  const text = String(value ?? '')

  // Exhaustive: adding a type to AttributeField['type'] without handling it here fails to compile.
  switch (field.type) {
    case 'boolean':
      return (
        <label className="checkbox">
          <input type="checkbox" checked={value === true} onChange={(e) => set(e.target.checked)} />
          {field.label}
        </label>
      )
    case 'select':
      return labelled(
        <select value={text} onChange={(e) => set(e.target.value)} required={field.required}>
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>,
      )
    case 'number':
      return labelled(
        <input
          type="number"
          value={text}
          onChange={(e) => set(e.target.value === '' ? undefined : Number(e.target.value))}
          required={field.required}
        />,
      )
    case 'date':
      return labelled(
        <input type="date" value={text} onChange={(e) => set(e.target.value)} required={field.required} />,
      )
    case 'text':
      return labelled(
        <input type="text" value={text} onChange={(e) => set(e.target.value)} required={field.required} />,
      )
    default: {
      // The schema comes from the API at runtime: show an unknown type as text instead of breaking,
      // but the `never` assignment still forces the compiler to flag unhandled known types.
      const unhandled: never = field.type
      console.warn(`Unsupported attribute type: ${String(unhandled)}`)
      return labelled(<input type="text" value={text} onChange={(e) => set(e.target.value)} />)
    }
  }
}
