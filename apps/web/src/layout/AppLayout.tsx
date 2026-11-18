import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  LogOut,
  LucideIcon,
  Monitor,
  Moon,
  Package,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Sun,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { ModuleKey } from '@dentalflow/types'
import { MODULE_ROUTES, OrganizationProvider, useOrganization } from '../org/OrganizationContext'
import { useLowStockCount } from '../pages/inventory/InventoryPage'
import { Brand } from '../design-system/Brand'
import { THEME_LABELS, ThemePreference, useThemePreference } from '../design-system/theme'

export function AppLayout() {
  return (
    <OrganizationProvider>
      <Shell />
    </OrganizationProvider>
  )
}

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badge?: number
}

const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  scheduling: CalendarDays,
  customers: Users,
  catalog: Package,
  sales: Receipt,
  inventory: Boxes,
  clinical: Users,
  work_orders: Wrench,
}
const OPERATION_MODULES: ModuleKey[] = ['scheduling', 'work_orders', 'customers', 'sales']
const COLLAPSED_KEY = 'velatrix.sidebar-collapsed'

function useCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      // ignore: only a per-device convenience
    }
  }, [collapsed])
  return [collapsed, () => setCollapsed((c) => !c)]
}

function Shell() {
  const { logout } = useAuth()
  const org = useOrganization()
  const terms = org.vertical.terminology
  const [collapsed, toggleCollapsed] = useCollapsed()
  const has = (m: ModuleKey) => org.enabledModules.includes(m)

  const moduleLabels: Record<ModuleKey, string> = {
    scheduling: 'Agenda',
    customers: terms.customer.plural,
    catalog: 'Catálogo',
    sales: 'Ventas',
    inventory: 'Inventario',
    clinical: '', // reached from the customer record, not from the menu
    work_orders: terms.workOrder?.plural ?? 'Órdenes',
  }
  const lowStock = useLowStockCount(has('inventory'))
  // Home module first, then the rest in template order; only enabled ones.
  const modules = [
    org.vertical.homeModule,
    ...org.vertical.modules.filter((m) => m !== org.vertical.homeModule),
  ].filter((m) => has(m) && moduleLabels[m])

  const moduleItem = (m: ModuleKey): NavItem => ({
    to: MODULE_ROUTES[m],
    label: moduleLabels[m],
    icon: MODULE_ICONS[m],
    badge: m === 'inventory' ? lowStock.data?.count : undefined,
  })

  const operation: NavItem[] = modules.filter((m) => OPERATION_MODULES.includes(m)).map(moduleItem)
  if (has('sales')) operation.push({ to: '/pos', label: 'Punto de venta', icon: ShoppingCart })

  const management: NavItem[] = modules.filter((m) => !OPERATION_MODULES.includes(m)).map(moduleItem)
  if (has('scheduling') || has('work_orders')) {
    management.push({ to: '/staff', label: terms.staff.plural, icon: UserRound })
  }
  management.push({ to: '/reports', label: 'Reportes', icon: BarChart3 })

  const settings: NavItem[] = [
    { to: '/users', label: 'Usuarios', icon: ShieldCheck },
    { to: '/billing', label: 'Plan y facturación', icon: CreditCard },
  ]

  return (
    <div className={`layout${collapsed ? ' collapsed' : ''}`}>
      <aside className="sidebar">
        <Brand compact={collapsed} />
        {!collapsed && (
          <div className="org">
            {org.name}
            <small>{org.vertical.label}</small>
          </div>
        )}
        <NavGroup title="Operación" items={operation} collapsed={collapsed} />
        <NavGroup title="Gestión" items={management} collapsed={collapsed} />
        <NavGroup title="Configuración" items={settings} collapsed={collapsed} />

        <div className="sidebar-footer">
          <ThemeSwitcher collapsed={collapsed} />
          <button
            className="link"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            title={collapsed ? 'Expandir menú' : undefined}
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            {!collapsed && 'Contraer menú'}
          </button>
          <button
            className="link logout"
            onClick={() => void logout()}
            aria-label="Cerrar sesión"
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <LogOut size={18} />
            {!collapsed && 'Cerrar sesión'}
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

function NavGroup({ title, items, collapsed }: { title: string; items: NavItem[]; collapsed: boolean }) {
  if (items.length === 0) return null
  return (
    <>
      {collapsed ? <hr className="nav-sep" /> : <div className="nav-group">{title}</div>}
      <nav aria-label={title}>
        {items.map(({ to, label, icon: Icon, badge }) => (
          <NavLink key={to} to={to} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined}>
            <Icon size={18} aria-hidden />
            {!collapsed && <span className="nav-label">{label}</span>}
            {!!badge && (
              <span className="nav-badge" title="Productos con stock bajo">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  )
}

const THEME_ICONS: Record<ThemePreference, LucideIcon> = { light: Sun, dark: Moon, auto: Monitor }
const THEME_ORDER: ThemePreference[] = ['light', 'dark', 'auto']

function ThemeSwitcher({ collapsed }: { collapsed: boolean }) {
  const [pref, setPref] = useThemePreference()

  if (collapsed) {
    // One button that cycles Claro → Oscuro → Automático.
    const Icon = THEME_ICONS[pref]
    const next = THEME_ORDER[(THEME_ORDER.indexOf(pref) + 1) % THEME_ORDER.length]
    return (
      <button
        className="link"
        onClick={() => setPref(next)}
        aria-label={`Apariencia: ${THEME_LABELS[pref]}. Cambiar a ${THEME_LABELS[next]}`}
        title={`Apariencia: ${THEME_LABELS[pref]}`}
      >
        <Icon size={18} />
      </button>
    )
  }

  return (
    <div className="theme-switch" role="radiogroup" aria-label="Apariencia">
      {THEME_ORDER.map((p) => {
        const Icon = THEME_ICONS[p]
        return (
          <button
            key={p}
            role="radio"
            aria-checked={pref === p}
            className={pref === p ? 'active' : ''}
            onClick={() => setPref(p)}
            title={THEME_LABELS[p]}
          >
            <Icon size={15} aria-hidden />
            <span>{THEME_LABELS[p]}</span>
          </button>
        )
      })}
    </div>
  )
}
