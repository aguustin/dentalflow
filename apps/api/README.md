# @dentalflow/api

NestJS REST API for DentalFlow.

## Stack

- **Framework:** NestJS 10
- **Language:** TypeScript (strict)
- **ORM:** Prisma 5
- **Database:** PostgreSQL 16
- **Auth:** JWT (Passport.js)
- **Docs:** Swagger (OpenAPI 3)
- **Validation:** class-validator + class-transformer

## Architecture

The API follows a **modular domain architecture** inside NestJS. Each business domain gets its own NestJS module under `src/modules/`.

```
src/
  main.ts               # Bootstrap, global config
  app.module.ts         # Root module — imports all domain modules
  modules/              # One NestJS module per domain
    auth/
    appointments/
    customers/
    treatments/
    billing/
    staff/
    inventory/
    reports/
  common/               # Guards, decorators, interceptors, filters
    guards/
    decorators/
    interceptors/
    filters/
  infrastructure/       # Database (Prisma), event bus, caching
    prisma/
    events/
```

## Module conventions

Each domain module will follow the pattern:
```
<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.repository.ts
  dto/
  entities/
```

## Development

```bash
pnpm dev          # NestJS watch mode
pnpm build        # Compile to dist/
pnpm test         # Unit tests (Jest)
pnpm test:e2e     # E2E tests (needs Postgres: `pnpm db:test:up`; uses DB dentalflow_test)
pnpm typecheck    # Type-check without emitting
```

## API conventions

- Base path: `/api/v1`
- Auth: `Authorization: Bearer <jwt>`
- Errors follow RFC 7807 (Problem Details)
- All endpoints documented at `/docs` (Swagger UI)

> No domain modules are implemented yet. This is infrastructure scaffolding only.
