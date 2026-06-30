# @dentalflow/web

React web application for DentalFlow.

## Stack

- **Framework:** React 18 + Vite
- **Language:** TypeScript (strict)
- **Styling:** TBD (Tailwind CSS / CSS Modules)
- **State:** TBD (Zustand / TanStack Query)
- **Routing:** TBD (React Router v7)

## Intended users

Clinic staff, dentists, and administrative personnel accessing DentalFlow from a desktop or laptop browser.

## Planned feature areas

| Area | Description |
|---|---|
| Auth | Login, session management, role-based access |
| Dashboard | Metrics, upcoming appointments, alerts |
| Appointments | Calendar, scheduling, patient linkage |
| Patients | Records, history, documents |
| Treatments | Procedure tracking, odontogram |
| Billing | Invoice generation, payment status |
| Staff | Personnel management, schedules |
| Inventory | Supply tracking |
| Reports | Analytics, exports |

## Development

```bash
pnpm dev       # Start Vite dev server on :5173
pnpm build     # Production build
pnpm typecheck # Type-check without emitting
pnpm lint      # Lint src/
```

## Structure (planned)

```
src/
  app/          # Root layout, router, global providers
  features/     # One folder per domain (appointments/, patients/, …)
  shared/       # Generic UI primitives, hooks, utils
  types/        # Local type augmentations (extend @dentalflow/types)
```

> No business logic is implemented yet. This is infrastructure scaffolding only.
