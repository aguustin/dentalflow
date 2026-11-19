import { useEffect, useState } from 'react'

/** Appearance preference. "auto" follows the operating system. */
export type ThemePreference = 'light' | 'dark' | 'auto'

// Per product: Clinic's preference never changes Retail, Workshop… on the same domain.
// Same key is read by the inline script in index.html (applied before first render).
const STORAGE_KEY = 'velatrix.clinic.theme'
/** Pre-product key: read once so an existing choice is kept. */
const LEGACY_KEY = 'velatrix.theme'

export const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Claro',
  dark: 'Oscuro',
  auto: 'Automático',
}

export function getThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (value === 'light' || value === 'dark') return value
  } catch {
    // storage unavailable: fall back to the OS preference
  }
  return 'auto'
}

function applyTheme(pref: ThemePreference) {
  const root = document.documentElement
  if (pref === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
}

export function useThemePreference(): [ThemePreference, (pref: ThemePreference) => void] {
  const [pref, setPref] = useState<ThemePreference>(getThemePreference)

  useEffect(() => {
    applyTheme(pref)
    try {
      if (pref === 'auto') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, pref)
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      // preference only lasts for this session
    }
  }, [pref])

  return [pref, setPref]
}
