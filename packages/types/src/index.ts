/**
 * @dentalflow/types
 *
 * API response types shared by the clients (web, mobile). Types only — no runtime code.
 * The API defines its own DTOs (it compiles to CommonJS and can't import raw .ts packages);
 * keep these in sync when an endpoint's response changes.
 */

export * from './common.types'
export * from './organizations.types'
export * from './customers.types'
export * from './appointments.types'
export * from './users.types'
export * from './staff.types'
export * from './catalog.types'
export * from './inventory.types'
export * from './clinical.types'
export * from './work-orders.types'
export * from './reports.types'
export * from './billing.types'
export * from './online-payments.types'
