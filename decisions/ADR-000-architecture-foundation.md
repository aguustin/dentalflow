# ADR-000: Architecture Foundation

**Status:** Accepted  
**Date:** 2026-06-26  
**Deciders:** Engineering team

---

## Context

DentalFlow is a new dental clinic management system being built from scratch. Before writing any product code, the team must establish the foundational technology choices that will shape all future development. These decisions are difficult to reverse and affect every engineer and every feature for the lifetime of the product.

The system needs to serve:

- A **web application** for clinic staff and dentists working at desks
- A **mobile application** for dentists and patients on phones
- A **REST API** that both clients consume
- A **PostgreSQL database** as the system of record

The development team is small and must share code aggressively between clients and the API.

---

## Decision

We adopt the following foundational stack:

### Monorepo — TurboRepo + pnpm workspaces

A single git repository containing all applications and shared packages. TurboRepo provides task orchestration with caching; pnpm workspaces handle dependency hoisting and cross-package linking.

**Why TurboRepo over Nx:** Simpler configuration surface, zero-config caching, and better fit for a small team without existing Nx investment.

### Web — React 18 + Vite

React remains the dominant UI library with the largest ecosystem. Vite provides fast HMR and a minimal configuration story. No framework (Next.js, Remix) is chosen yet; routing will be decided once rendering requirements (SSR vs SPA) are better understood.

### Mobile — React Native + Expo

React Native allows sharing TypeScript types and pure logic with the web app without a full code-sharing framework like Tamagui or Solito. Expo is chosen over bare React Native for its managed build pipeline (EAS Build) and OTA update capability.

### API — NestJS 10

NestJS provides a structured, decorator-based architecture that scales well as the domain grows. Its module system, dependency injection, and built-in Swagger integration align well with the planned domain-per-module structure. Express is the underlying HTTP adapter (default).

**Why NestJS over Fastify-native, Hono, or raw Express:** The team needs structure (enforced by the framework) more than maximum throughput at this stage. NestJS CLI scaffolding reduces bike-shedding on folder conventions.

### Database — PostgreSQL 16

PostgreSQL is a proven, feature-rich relational database. Its JSON support, full-text search, and scheduling/calendar query capabilities (date_trunc, exclusion constraints) make it the right fit for a dental management system.

### ORM — Prisma 5

Prisma provides type-safe database access, a declarative schema file, and a built-in migration engine. The generated client eliminates an entire class of type errors at the data access layer.

**Why Prisma over TypeORM or Drizzle:** Prisma's migration story is safer than TypeORM's schema sync, and the type generation is more robust. Drizzle is newer with a smaller ecosystem at time of this decision.

### Authentication — JWT (Access + Refresh token pair)

Stateless JWT-based authentication with:
- Short-lived access tokens (e.g., 15 min)
- Rotating refresh tokens stored in an HTTP-only cookie
- Role-based access control via a `role` claim in the JWT payload

**Why not session-based auth:** Stateless tokens simplify horizontal API scaling and are better suited for the mobile client which cannot use server-side sessions.

**Implementation deferred:** The auth module structure is scaffolded but no logic is implemented in ADR-000. A dedicated ADR will document the refresh token rotation strategy and storage decision.

### Event system — Abstraction layer (transport TBD)

Domain modules publish and subscribe to typed domain events through an `EventBus` interface. The concrete transport (Node.js EventEmitter for v1, Redis Streams or RabbitMQ for later) is deliberately not chosen here.

This abstraction keeps domain modules decoupled from infrastructure and allows the transport to be upgraded without touching domain code.

### API style — REST

REST is chosen over GraphQL for the initial version:
- Simpler mental model for the team
- NestJS + Swagger documentation generation is first-class
- Client-specific query shaping is not yet required
- GraphQL may be reconsidered if the mobile client's over-fetching becomes a documented problem

### Containerization — Docker + docker-compose

The API and database are containerized for local development parity. A `Dockerfile` with multi-stage build (dev / build / prod) is provided in `apps/api`. Production orchestration strategy (ECS, Railway, Fly.io, K8s) is out of scope for this ADR.

---

## Consequences

### Positive

- All engineers work in one repo — shared types enforce contracts at compile time
- TurboRepo caching makes CI incremental once it is set up
- NestJS module structure prevents the "big ball of mud" anti-pattern
- Prisma migrations provide a safe, version-controlled database change history
- The event bus abstraction allows domain isolation without committing to a message broker prematurely

### Negative / Risks

- pnpm workspaces add a learning curve for engineers unfamiliar with monorepos
- NestJS's decorator-heavy style requires `reflect-metadata` and specific `tsconfig` settings — a footgun for newcomers
- Prisma migrations are unidirectional (no automatic rollback) — rollback strategy must be documented separately
- React Native and React cannot fully share UI components — `@dentalflow/ui` is web-only; mobile has its own component layer
- JWT without a server-side session store means tokens cannot be immediately revoked before expiry — a refresh token blocklist will be required for security-sensitive scenarios

---

## Alternatives considered

| Alternative | Reason rejected |
|---|---|
| **Next.js** for web | SSR not yet required; adds complexity before the rendering model is settled |
| **GraphQL** | Over-engineering at this stage; REST + OpenAPI covers the current need |
| **TypeORM** | Migration story is weaker than Prisma; decorators on entity classes mix data and schema concerns |
| **Drizzle ORM** | Ecosystem maturity at time of decision; may be revisited for v2 |
| **Nx** | Heavier toolchain than TurboRepo; more value for very large orgs with complex dependency graphs |
| **Hono / Fastify** | Prioritize structure over raw throughput at this stage |
| **MongoDB** | Relational data (appointments, billing, patients) is a poor fit for a document store |

---

## Related ADRs

- *(none yet)*

---

*This ADR is the foundation. All subsequent ADRs reference this document as the baseline.*
