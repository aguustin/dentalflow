import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { NotFound } from './pages/NotFound'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { RequireAuth } from './auth/RequireAuth'
import { HomeRedirect, ModuleRoute } from './org/ModuleRoute'
import { CustomersPage } from './pages/customers/CustomersPage'
import { CustomerFormPage } from './pages/customers/CustomerFormPage'
import { SchedulePage } from './pages/schedule/SchedulePage'
import { UsersPage } from './pages/users/UsersPage'
import { StaffPage } from './pages/staff/StaffPage'
import { StaffFormPage } from './pages/staff/StaffFormPage'

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
      {
        path: 'staff',
        element: (
          <ModuleRoute module="scheduling">
            <StaffPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'staff/new',
        element: (
          <ModuleRoute module="scheduling">
            <StaffFormPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'staff/:id',
        element: (
          <ModuleRoute module="scheduling">
            <StaffFormPage key="edit" />
          </ModuleRoute>
        ),
      },
      { path: 'users', element: <UsersPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
