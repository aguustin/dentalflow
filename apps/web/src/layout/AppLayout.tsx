import { NavLink, Outlet } from 'react-router-dom'

/** Menu items. Step 3 will filter them by the organization's enabled modules and terminology. */
const NAV_ITEMS = [
  { to: '/schedule', label: 'Agenda' },
  { to: '/customers', label: 'Clientes' },
  { to: '/users', label: 'Usuarios' },
]

export function AppLayout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <strong className="brand">DentalFlow</strong>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
