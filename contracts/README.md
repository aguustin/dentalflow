# contracts/

Machine-readable and human-readable API and event contracts for DentalFlow.

## Purpose

This folder stores the **contracts between system components** — the agreements that both producers and consumers must uphold. Contracts here are versioned and serve as the ground truth for integration.

## Contents

### REST API contracts

OpenAPI specification snapshots exported from the NestJS Swagger module. Generated automatically by running:

```bash
# (command TBD — will be added when the export script is written)
pnpm --filter @dentalflow/api export:openapi
```

Files:
```
contracts/
  openapi/
    v1/
      openapi.yaml          Current spec
      openapi-YYYY-MM-DD.yaml   Snapshot at a point in time
```

### Event contracts

Typed event payload schemas for all domain events published on the event bus.

```
contracts/
  events/
    appointment.booked.schema.json
    appointment.cancelled.schema.json
    payment.received.schema.json
    stock.low.schema.json
```

### DTO contracts

Canonical request/response DTO shapes documented here for frontend teams, allowing parallel development without running the API locally.

## Conventions

- Never edit snapshot files — regenerate them from the source of truth (NestJS app or TypeScript types)
- Breaking changes in a contract require a version bump and a new ADR
- Event schema files use JSON Schema draft-07
