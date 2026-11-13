import { createContext, ReactNode, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { CurrentOrganization, ModuleKey } from '@dentalflow/types'

/** Route of each module's main screen. Add an entry when a module gets a screen. */
export const MODULE_ROUTES: Record<ModuleKey, string> = {
  scheduling: '/schedule',
  customers: '/customers',
  catalog: '/catalog',
  sales: '/sales',
  inventory: '/inventory',
  /** Per-patient screen (/customers/:id/clinical), no menu entry */
  clinical: '/customers',
}

const OrganizationContext = createContext<CurrentOrganization | null>(null)

/**
 * Loads the current organization (vertical template, enabled modules, terminology)
 * and renders children only once it is available, so pages can rely on it.
 */
export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['organization', 'current'],
    queryFn: () => api<CurrentOrganization>('/organizations/current'),
    staleTime: 5 * 60_000,
  })

  if (isPending) return <p className="muted center">Cargando…</p>
  if (error)
    return (
      <div className="center">
        <p className="error">No se pudo cargar la organización: {error.message}</p>
        <button onClick={() => void refetch()}>Reintentar</button>
      </div>
    )
  return <OrganizationContext.Provider value={data}>{children}</OrganizationContext.Provider>
}

export function useOrganization(): CurrentOrganization {
  const org = useContext(OrganizationContext)
  if (!org) throw new Error('useOrganization must be used inside OrganizationProvider')
  return org
}

export function useHasModule(module: ModuleKey): boolean {
  return useOrganization().enabledModules.includes(module)
}

/** Vertical terminology, e.g. terms.customer.plural → "Pacientes" */
export function useTerms() {
  return useOrganization().vertical.terminology
}
