import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { ModuleKey } from '../lib/types'
import { MODULE_ROUTES, useHasModule, useOrganization } from './OrganizationContext'

/** Renders children only if the module is enabled for the organization. */
export function ModuleRoute({ module, children }: { module: ModuleKey; children: ReactNode }) {
  if (!useHasModule(module)) {
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
  const home = org.enabledModules.includes(org.vertical.homeModule)
    ? org.vertical.homeModule
    : org.enabledModules[0]
  return <Navigate to={home ? MODULE_ROUTES[home] : '/users'} replace />
}
