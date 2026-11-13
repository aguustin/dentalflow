import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { Placeholder } from './pages/Placeholder'
import { NotFound } from './pages/NotFound'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { RequireAuth } from './auth/RequireAuth'
import { HomeRedirect, ModuleRoute } from './org/ModuleRoute'
import { CustomersPage } from './pages/customers/CustomersPage'
import { CustomerFormPage } from './pages/customers/CustomerFormPage'
import { SchedulePage } from './pages/schedule/SchedulePage'

/**
 * Routes. Pages are placeholders until their step of Phase 1 is implemented:
 *   step 7 → /users
 */
export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
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
            <CustomersPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'customers/new',
        element: (
          <ModuleRoute module="customers">
            <CustomerFormPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'customers/:id',
        element: (
          <ModuleRoute module="customers">
            <CustomerFormPage key="edit" />
          </ModuleRoute>
        ),
      },
      {
        path: 'schedule',
        element: (
          <ModuleRoute module="scheduling">
            <SchedulePage />
          </ModuleRoute>
        ),
      },
      { path: 'users', element: <Placeholder title="Usuarios" step={7} /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
