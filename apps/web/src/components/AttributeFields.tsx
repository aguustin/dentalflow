import { AttributeField } from '@dentalflow/types'

export type AttributeValues = Record<string, string | number | boolean>

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
  const set = (key: string, value: string | number | boolean | undefined) => {
    const next = { ...values }
    if (value === undefined || value === '') delete next[key]
    else next[key] = value
    onChange(next)
  }

  return (
    <>
      {fields.map((field) => {
        const value = values[field.key]
        if (field.type === 'boolean') {
          return (
            <label key={field.key} className="checkbox">
              <input
                type="checkbox"
                checked={value === true}
                onChange={(e) => set(field.key, e.target.checked)}
              />
              {field.label}
            </label>
          )
        }
        return (
          <label key={field.key}>
            {field.label}
            {field.required && ' *'}
            {field.type === 'select' ? (
              <select
                value={String(value ?? '')}
                onChange={(e) => set(field.key, e.target.value)}
                required={field.required}
              >
                <option value="">—</option>
                {field.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={String(value ?? '')}
                onChange={(e) =>
                  set(
                    field.key,
                    field.type === 'number' && e.target.value !== ''
                      ? Number(e.target.value)
                      : e.target.value,
                  )
                }
                required={field.required}
              />
            )}
          </label>
        )
      })}
    </>
  )
}
