import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ModuleKey } from '@dentalflow/types'
import { MODULE_ROUTES, OrganizationProvider, useOrganization } from '../org/OrganizationContext'
import { useLowStockCount } from '../pages/inventory/InventoryPage'

export function AppLayout() {
  return (
    <OrganizationProvider>
      <Shell />
    </OrganizationProvider>
  )
}

function Shell() {
  const { logout } = useAuth()
  const org = useOrganization()
  const terms = org.vertical.terminology

  const moduleLabels: Record<ModuleKey, string> = {
    scheduling: 'Agenda',
    customers: terms.customer.plural,
    catalog: 'Catálogo',
    sales: 'Ventas',
    inventory: 'Inventario',
    clinical: '',
    work_orders: terms.workOrder?.plural ?? 'Órdenes',
  }
  const lowStock = useLowStockCount(org.enabledModules.includes('inventory'))
  // Home module first, then the rest in template order; only enabled ones.
  const modules = [
    org.vertical.homeModule,
    ...org.vertical.modules.filter((m) => m !== org.vertical.homeModule),
  ].filter((m) => org.enabledModules.includes(m) && moduleLabels[m])

  return (
    <div className="layout">
      <aside className="sidebar">
        <div>
          <strong className="brand">{org.name}</strong>
          <div className="muted small">{org.vertical.label}</div>
        </div>
        <nav>
          {modules.map((m) => (
            <NavLink key={m} to={MODULE_ROUTES[m]}>
              {moduleLabels[m]}
              {m === 'inventory' && !!lowStock.data?.count && (
                <span className="nav-badge" title="Productos con stock bajo">
                  {lowStock.data.count}
                </span>
              )}
            </NavLink>
          ))}
          {org.enabledModules.includes('sales') && <NavLink to="/pos">Punto de venta</NavLink>}
          {(org.enabledModules.includes('scheduling') || org.enabledModules.includes('work_orders')) && (
            <NavLink to="/staff">{terms.staff.plural}</NavLink>
          )}
          <NavLink to="/users">Usuarios</NavLink>
        </nav>
        <button className="link logout" onClick={() => void logout()}>
          Cerrar sesión
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
