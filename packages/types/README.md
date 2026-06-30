# @dentalflow/types

Shared TypeScript type definitions for the entire DentalFlow platform.

## Purpose

This package is the **single source of truth for all shared contracts** between the API, web, and mobile apps. It contains:

- Domain entity interfaces (read models, write models)
- DTO shapes mirrored from the API
- Enum definitions (appointment status, roles, etc.)
- Common utility types (pagination, API response envelope, error shapes)
- Event payload types for the event abstraction layer

## What does NOT belong here

- Runtime logic (use `@dentalflow/shared` for utilities)
- React components (use `@dentalflow/ui`)
- Configuration values (use `@dentalflow/config`)
- Prisma-generated types (stay in `apps/api` — not exported outward)

## Usage

```ts
import type { AppointmentStatus, Patient } from '@dentalflow/types'
```

## Structure (planned)

```
src/
  auth.types.ts
  appointments.types.ts
  patients.types.ts
  treatments.types.ts
  billing.types.ts
  staff.types.ts
  inventory.types.ts
  events.types.ts
  common.types.ts
  index.ts
```

## Conventions

- All types are `interface` or `type` only — no classes, no decorators.
- Enums use `const enum` where string literals would hurt readability; otherwise use union string literals.
- Every type is explicitly exported from `index.ts`.
