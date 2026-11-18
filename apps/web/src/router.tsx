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
import { CatalogPage } from './pages/catalog/CatalogPage'
import { CatalogFormPage } from './pages/catalog/CatalogFormPage'
import { SalesPage } from './pages/sales/SalesPage'
import { SaleEditorPage } from './pages/sales/SaleEditorPage'
import { SaleDetailPage } from './pages/sales/SaleDetailPage'
import { CashPage } from './pages/sales/CashPage'
import { PosPage } from './pages/sales/PosPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { BillingPage } from './pages/billing/BillingPage'
import { OnlinePaymentsPage } from './pages/settings/OnlinePaymentsPage'
import { InventoryPage } from './pages/inventory/InventoryPage'
import { InventoryItemPage } from './pages/inventory/InventoryItemPage'
import { ClinicalPage } from './pages/clinical/ClinicalPage'
import { WorkOrdersBoard } from './pages/work-orders/WorkOrdersBoard'
import { WorkOrderNewPage } from './pages/work-orders/WorkOrderNewPage'
import { WorkOrderDetailPage } from './pages/work-orders/WorkOrderDetailPage'
import { AssetPage } from './pages/work-orders/AssetPage'
import { WorkOrderPrintPage } from './pages/work-orders/WorkOrderPrintPage'
import { FieldsPreview } from './design-system/FieldsPreview'

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
      ...(import.meta.env.DEV ? [{ path: 'dev/campos', element: <FieldsPreview /> }] : []),
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
          <ModuleRoute module={['scheduling', 'work_orders']}>
            <StaffPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'staff/new',
        element: (
          <ModuleRoute module={['scheduling', 'work_orders']}>
            <StaffFormPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'staff/:id',
        element: (
          <ModuleRoute module={['scheduling', 'work_orders']}>
            <StaffFormPage key="edit" />
          </ModuleRoute>
        ),
      },
      {
        path: 'catalog',
        element: (
          <ModuleRoute module="catalog">
            <CatalogPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'catalog/new',
        element: (
          <ModuleRoute module="catalog">
            <CatalogFormPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'catalog/:id',
        element: (
          <ModuleRoute module="catalog">
            <CatalogFormPage key="edit" />
          </ModuleRoute>
        ),
      },
      {
        path: 'sales',
        element: (
          <ModuleRoute module="sales">
            <SalesPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'sales/new',
        element: (
          <ModuleRoute module="sales">
            <SaleEditorPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'sales/:id',
        element: (
          <ModuleRoute module="sales">
            <SaleDetailPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'sales/:id/edit',
        element: (
          <ModuleRoute module="sales">
            <SaleEditorPage key="edit" />
          </ModuleRoute>
        ),
      },
      {
        path: 'pos',
        element: (
          <ModuleRoute module="sales">
            <PosPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'cash',
        element: (
          <ModuleRoute module="sales">
            <CashPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'inventory',
        element: (
          <ModuleRoute module="inventory">
            <InventoryPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'inventory/:id',
        element: (
          <ModuleRoute module="inventory">
            <InventoryItemPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'customers/:id/clinical',
        element: (
          <ModuleRoute module="clinical">
            <ClinicalPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'work-orders',
        element: (
          <ModuleRoute module="work_orders">
            <WorkOrdersBoard />
          </ModuleRoute>
        ),
      },
      {
        path: 'work-orders/new',
        element: (
          <ModuleRoute module="work_orders">
            <WorkOrderNewPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'work-orders/:id',
        element: (
          <ModuleRoute module="work_orders">
            <WorkOrderDetailPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'work-orders/:id/print',
        element: (
          <ModuleRoute module="work_orders">
            <WorkOrderPrintPage />
          </ModuleRoute>
        ),
      },
      {
        path: 'assets/:id',
        element: (
          <ModuleRoute module="work_orders">
            <AssetPage />
          </ModuleRoute>
        ),
      },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'settings/payments', element: <OnlinePaymentsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
