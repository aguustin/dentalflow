/**
 * Cross-Module Communication Rules for DentalFlow Platform
 *
 * These types and interfaces enforce architectural boundaries between
 * domain modules at the TypeScript type level.
 *
 * ─── ALLOWED CROSS-MODULE PATTERNS ──────────────────────────────────────────
 *
 * 1. Read-only application services (via interface)
 *    A module may expose a read-only query interface in its application layer.
 *    The consuming module declares the interface, the providing module's
 *    infrastructure layer implements it — NO import of the provider module.
 *
 *    Example: ICustomerExistenceChecker is declared in appointments/application,
 *    implemented in appointments/infrastructure querying Prisma directly.
 *
 * 2. Domain events (via event bus)
 *    Modules MUST NOT call each other's use cases directly. Side effects that
 *    cross module boundaries must be expressed as domain events published to
 *    the shared IEventBus.
 *
 * ─── FORBIDDEN CROSS-MODULE PATTERNS ────────────────────────────────────────
 *
 * ✗ Importing a repository from another module:
 *     import { CustomerPrismaRepository } from '../customers/...'  ← FORBIDDEN
 *
 * ✗ Importing a use case from another module:
 *     import { CreateCustomerUseCase } from '../customers/...'     ← FORBIDDEN
 *
 * ✗ Importing a domain entity from another module directly:
 *     import { CustomerEntity } from '../customers/domain/...'     ← FORBIDDEN
 *     (use a shared read-only DTO or an existence-checker interface instead)
 *
 * ✗ Importing infrastructure from another module:
 *     import { CustomerPrismaRepository } from '../customers/infra' ← FORBIDDEN
 *
 * ─── CROSS-MODULE CHECKER PATTERN ────────────────────────────────────────────
 *
 * When Module A needs to verify that an entity in Module B exists:
 *
 *   Module A application layer declares:
 *     interface IFooExistenceChecker {
 *       existsInOrganization(id: string, organizationId: string): Promise<boolean>;
 *     }
 *
 *   Module A infrastructure layer implements:
 *     class PrismaFooExistenceChecker implements IFooExistenceChecker {
 *       constructor(private prisma: PrismaService) {}
 *       async existsInOrganization(id, orgId) {
 *         return (await this.prisma.foo.count({ where: { id, organizationId: orgId } })) > 0;
 *       }
 *     }
 *
 *   This approach:
 *     ✓ Avoids importing from Module B entirely
 *     ✓ Keeps tenant isolation (organizationId is always required)
 *     ✓ Is easily replaceable (swap Prisma for HTTP call or cache)
 */

/** Marker type for read-only cross-module query interfaces. */
export type CrossModuleQuery<TResult> = () => Promise<TResult>;

/** Marker type for existence checks — the most common cross-module query. */
export interface IExistenceChecker {
  existsInOrganization(id: string, organizationId: string): Promise<boolean>;
}

/**
 * Every module that exposes cross-module services MUST document them here.
 * This serves as the authoritative registry of public module contracts.
 */
export interface ModuleCrossModuleContracts {
  /** Customers module: verifies a customer belongs to an organization */
  'customers:existence': IExistenceChecker;
  // Future contracts:
  // 'billing:subscription-active': IExistenceChecker;
  // 'staff:membership': IExistenceChecker;
}
