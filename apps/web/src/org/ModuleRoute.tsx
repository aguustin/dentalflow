import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { ModuleKey } from '@dentalflow/types'
import { MODULE_ROUTES, useOrganization } from './OrganizationContext'

/** Renders children only if the module (or any of several) is enabled for the organization. */
export function ModuleRoute({ module, children }: { module: ModuleKey | ModuleKey[]; children: ReactNode }) {
  const enabled = useOrganization().enabledModules
  const modules = Array.isArray(module) ? module : [module]
  if (!modules.some((m) => enabled.includes(m))) {
    return (
      <section>
        <h1>Módulo no disponible</h1>
        <p className="muted">Este módulo no está habilitado para tu organización.</p>
      </section>
    )
  }
  return <>{children}</>
}

/** Redirects "/" to the main screen of the organization's vertical. */
export function HomeRedirect() {
  const org = useOrganization()
  const homeEnabled = org.enabledModules.includes(org.vertical.homeModule)
  // A vertical can point to a specific screen of its home module (e.g. retail → POS)
  if (homeEnabled && org.vertical.homeRoute) return <Navigate to={org.vertical.homeRoute} replace />
  const home = homeEnabled ? org.vertical.homeModule : org.enabledModules[0]
  return <Navigate to={home ? MODULE_ROUTES[home] : '/users'} replace />
}
