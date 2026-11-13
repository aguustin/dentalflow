import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { Placeholder } from './pages/Placeholder'
import { NotFound } from './pages/NotFound'
import { Login } from './pages/Login'
import { RequireAuth } from './auth/RequireAuth'

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
      { index: true, element: <Navigate to="/schedule" replace /> },
      { path: 'customers', element: <Placeholder title="Clientes" step={5} /> },
      { path: 'schedule', element: <Placeholder title="Agenda" step={6} /> },
      { path: 'users', element: <Placeholder title="Usuarios" step={7} /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
