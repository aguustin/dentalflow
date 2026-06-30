# DentalFlow — Architecture Documentation

This folder contains living architectural documentation. It describes the intended structure, constraints, and design principles of the DentalFlow platform. It is updated as decisions are made.

---

## 1. System Overview

DentalFlow is a **dental clinic management platform** that provides:

- Appointment scheduling and calendar management
- Patient record management (anamnesis, odontogram, documents)
- Treatment and procedure tracking
- Billing and payment management
- Staff and schedule management
- Inventory and supply control
- Analytics and reporting

The system is built to serve small-to-medium dental clinics (single-dentist to multi-chair practices).

---

## 2. High-Level Architecture

```
┌───────────────────────────────────────────────────────────┐
│                         Clients                           │
│   ┌──────────────────┐      ┌──────────────────────────┐  │
│   │   Web (React)    │      │  Mobile (React Native)   │  │
│   │   apps/web       │      │      apps/mobile         │  │
│   └────────┬─────────┘      └─────────────┬────────────┘  │
└────────────┼────────────────────────────────┼─────────────┘
             │   REST (HTTPS / JSON)           │
             ▼                                ▼
┌────────────────────────────────────────────────────────────┐
│                   API  (NestJS)  apps/api                  │
│                                                            │
│   ┌─────────────────────────────────────────────────────┐  │
│   │                  Core Layer                         │  │
│   │  AuthModule · ConfigModule · ThrottlerModule        │  │
│   │  PrismaModule · EventBusModule (abstraction)        │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                            │
│   ┌─────────────────────────────────────────────────────┐  │
│   │                 Domain Layer                        │  │
│   │  Appointments · Patients · Treatments · Billing     │  │
│   │  Staff · Inventory · Reports                        │  │
│   └─────────────────────────────────────────────────────┘  │
└──────────────────────────┬─────────────────────────────────┘
                           │ Prisma ORM
                           ▼
             ┌─────────────────────────┐
             │     PostgreSQL 16       │
             └─────────────────────────┘
```

---

## 3. Monorepo Layout

```
dentalflow/
  apps/
    web/          React 18 + Vite — browser client
    mobile/       React Native + Expo — iOS / Android
    api/          NestJS — REST API + business logic
  packages/
    types/        Shared TypeScript types (no runtime code)
    shared/       Platform-agnostic utility functions
    ui/           React component design system
    config/       Shared static configuration constants
  docs/           ← You are here — architecture documentation
  decisions/      Architecture Decision Records (ADRs)
  workspace/      Ongoing technical work-in-progress notes
  contracts/      API contracts, OpenAPI snapshots, event schemas
  research/       Technical spikes, vendor comparisons, POCs
  archive/        Deprecated documents
```

---

## 4. Core Layer

The Core layer contains cross-cutting infrastructure that every domain module depends on. It is configured once in `AppModule` and provided globally.

| Module | Responsibility |
|---|---|
| `ConfigModule` | Environment variable loading and validation |
| `PrismaModule` | Single Prisma client instance, global scope |
| `AuthModule` | JWT strategy, guards, user context decorators |
| `ThrottlerModule` | Rate limiting on all public endpoints |
| `EventBusModule` | Internal event abstraction (see §8) |

### Auth model (structure)

- JWT issued on login (access token + refresh token pair)
- Access token is short-lived; refresh token is rotated on use
- Every request attaches `Authorization: Bearer <access_token>`
- A `@CurrentUser()` decorator extracts the validated user from the JWT payload
- Role-based access control via `@Roles()` decorator + `RolesGuard`

### Roles (planned)

| Role | Description |
|---|---|
| `ADMIN` | Full clinic access |
| `DENTIST` | Own appointments, all patient records |
| `RECEPTIONIST` | Scheduling, patient intake |
| `PATIENT` | Own records and appointment history only |

---

## 5. Domain Layer

Each domain is an isolated NestJS module. Domains communicate via the **EventBus abstraction** (§8), not direct imports, to maintain loose coupling.

### Domain map

| Domain | Key responsibilities |
|---|---|
| **Appointments** | Create, reschedule, cancel, calendar queries, slot availability |
| **Patients** | Patient profile, anamnesis, document storage, odontogram state |
| **Treatments** | Procedure library, treatment plan, procedure execution records |
| **Billing** | Invoice generation, payment registration, financial summary |
| **Staff** | Dentist and employee profiles, work schedule, specialties |
| **Inventory** | Supply catalogue, stock movements, low-stock alerts |
| **Reports** | Aggregate queries, clinic KPIs, exportable reports |

### Module internal structure

Every domain module follows this layout:

```
<domain>/
  <domain>.module.ts        NestJS module definition
  <domain>.controller.ts    HTTP handlers — thin, only DTOs
  <domain>.service.ts       Business orchestration
  <domain>.repository.ts    Prisma data access layer
  dto/
    create-<entity>.dto.ts
    update-<entity>.dto.ts
    <entity>.response.dto.ts
  entities/
    <entity>.entity.ts      Optional domain entity class
```

---

## 6. Data Layer

- **Database:** PostgreSQL 16
- **ORM:** Prisma 5 (type-safe queries, migration engine)
- **Schema location:** `apps/api/prisma/schema.prisma`
- **Migration strategy:** Prisma Migrate (versioned, committed to repo)
- **Connection:** Single `PrismaService` shared via NestJS DI

### Multi-tenancy (TBD)

The initial version targets single-clinic deployment. Multi-tenancy (row-level or schema-level isolation) is under evaluation — see `decisions/`.

---

## 7. REST API Design

- **Base path:** `/api/v1`
- **Auth header:** `Authorization: Bearer <jwt>`
- **Content-Type:** `application/json`
- **Errors:** RFC 7807 Problem Details format
- **Documentation:** Swagger UI at `/docs` (auto-generated from decorators)
- **Versioning:** URL path versioning (`/v1`, `/v2`) when breaking changes are needed

### Standard response envelope

```json
{
  "data": { ... },
  "meta": { "page": 1, "total": 42 }
}
```

### Error shape

```json
{
  "type": "https://dentalflow.app/errors/not-found",
  "title": "Appointment not found",
  "status": 404,
  "detail": "No appointment with id 'abc-123' exists."
}
```

---

## 8. Event System Abstraction

Domains communicate internally via an **event bus**. The abstraction is defined now; the transport (in-process EventEmitter, Redis pub/sub, or a proper message broker) is decided later without changing domain code.

### Interface (planned)

```ts
interface EventBus {
  publish<T>(event: DomainEvent<T>): Promise<void>
  subscribe<T>(eventName: string, handler: EventHandler<T>): void
}
```

### Example events (not yet implemented)

| Event | Publisher | Subscriber(s) |
|---|---|---|
| `appointment.booked` | Appointments | Billing, Notifications |
| `appointment.cancelled` | Appointments | Billing, Staff |
| `payment.received` | Billing | Appointments |
| `stock.low` | Inventory | Notifications |

---

## 9. Deployment Model

### Development

```bash
docker compose up         # PostgreSQL + API
pnpm dev                  # TurboRepo runs all apps in parallel
```

### Production (planned)

| Component | Target |
|---|---|
| API | Dockerized container (single or orchestrated) |
| Web | Static build (Vercel / S3+CDN / Nginx) |
| Mobile | Expo EAS Build → App Store / Google Play |
| Database | Managed PostgreSQL (e.g., Supabase, Railway, RDS) |
| Secrets | Environment variables injected at runtime |

---

## 10. Cross-Cutting Concerns

| Concern | Approach |
|---|---|
| Validation | `class-validator` on all DTOs, `ValidationPipe` globally |
| Logging | Structured JSON logs (NestJS Logger → future: Pino) |
| Error handling | Global `ExceptionFilter` in `common/filters/` |
| Security | Helmet, CORS, throttling, parameterized Prisma queries |
| Observability | OpenTelemetry integration (planned) |
| Testing | Unit (Jest), E2E (Jest + Supertest), component (Vitest) |

---

## 11. Package Dependency Graph

```
apps/web    ──depends on──▶  @dentalflow/ui
                         ──▶  @dentalflow/types
                         ──▶  @dentalflow/config
                         ──▶  @dentalflow/shared

apps/mobile ──depends on──▶  @dentalflow/types
                         ──▶  @dentalflow/config
                         ──▶  @dentalflow/shared

apps/api    ──depends on──▶  @dentalflow/types
                         ──▶  @dentalflow/config

@dentalflow/ui     ──▶  @dentalflow/types
@dentalflow/shared ──▶  @dentalflow/types
```

No circular dependencies are allowed. Packages do not import from apps.

---

*Last updated: 2026-06-26*
