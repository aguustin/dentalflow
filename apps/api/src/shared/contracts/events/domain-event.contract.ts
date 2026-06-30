/**
 * Canonical contract for all domain events in the DentalFlow platform.
 *
 * Every event published to the event bus MUST conform to this interface.
 * This contract is outbox-ready: all fields can be serialized to a
 * persistent store (e.g. a Postgres outbox table) without loss of fidelity.
 *
 * Field semantics:
 *   id            — Globally unique event identifier (UUID v4). Never changes once emitted.
 *   type          — Dot-notation event name (e.g. "appointment.created"). Used for routing.
 *   timestamp     — Wall-clock time at which the event was emitted (UTC).
 *   organizationId — Tenant scope. Empty string ('') for platform/system-level events
 *                   that are not scoped to a single organization.
 *   eventChainId  — Shared by all events emitted during a single HTTP request or
 *                   workflow invocation. Enables end-to-end distributed tracing.
 *   payload       — Event-specific data. Must be a serializable object.
 */
export interface IDomainEvent {
  readonly id: string;
  readonly type: string;
  readonly timestamp: Date;
  readonly organizationId: string;
  readonly eventChainId: string;
  readonly payload: object;
}

/**
 * All recognized event type strings in the platform.
 * New modules MUST add their event types here.
 */
export const DOMAIN_EVENT_TYPES = {
  // Core platform events
  USER_CREATED: 'user.created',
  ORGANIZATION_CREATED: 'organization.created',
  MEMBERSHIP_CREATED: 'membership.created',
  ROLE_ASSIGNED: 'role.assigned',
  // Patients module
  PATIENT_CREATED: 'patient.created',
  PATIENT_UPDATED: 'patient.updated',
  PATIENT_DELETED: 'patient.deleted',
  // Appointments module
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_RESCHEDULED: 'appointment.rescheduled',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_COMPLETED: 'appointment.completed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  // Organizations onboarding
  ORGANIZATION_INITIALIZED: 'organization.initialized',
  ORGANIZATION_OWNER_ASSIGNED: 'organization.owner_assigned',
  // Billing module
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  SUBSCRIPTION_CANCELED: 'subscription.canceled',
  BILLING_FEATURE_BLOCKED: 'billing.feature_blocked',
  BILLING_USAGE_LIMIT_REACHED: 'billing.usage_limit_reached',
} as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[keyof typeof DOMAIN_EVENT_TYPES];
