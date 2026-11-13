import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { Placeholder } from './pages/Placeholder'
import { NotFound } from './pages/NotFound'
import { Login } from './pages/Login'
import { RequireAuth } from './auth/RequireAuth'
import { HomeRedirect, ModuleRoute } from './org/ModuleRoute'
import { useTerms } from './org/OrganizationContext'

/**
 * Routes. Pages are placeholders until their step of Phase 1 is implemented:
 *   step 4 → /register · step 5 → /customers
 *   step 6 → /schedule · step 7 → /users
 */
export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Placeholder title="Registro" step={4} /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      {
        path: 'customers',
        element: (
          <ModuleRoute module="customers">
            <CustomersPlaceholder />
          </ModuleRoute>
        ),
      },
      {
        path: 'schedule',
        element: (
          <ModuleRoute module="scheduling">
            <Placeholder title="Agenda" step={6} />
          </ModuleRoute>
        ),
      },
      { path: 'users', element: <Placeholder title="Usuarios" step={7} /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

function CustomersPlaceholder() {
  return <Placeholder title={useTerms().customer.plural} step={5} />
}
