# @dentalflow/config

Shared static configuration constants for the DentalFlow platform.

## Purpose

A single place for configuration values that are used across multiple apps and have no runtime dependency on environment variables.

## What belongs here

- API path prefixes and version strings
- Role/permission constant names (string literals)
- Business rule constants (max upload size, max appointment duration)
- Supported locales and default timezone
- Shared route name constants (to avoid magic strings)

## What does NOT belong here

- Environment variables — read from `.env` files inside each app
- Secrets of any kind
- Runtime config (things that change between dev/prod)
- Types — use `@dentalflow/types` for that

## Usage

```ts
import { APP_NAME, API_PREFIX } from '@dentalflow/config'
```

## Conventions

- All exports are `const`, typed narrowly (use `as const`).
- No functions — if you need to derive a value, compute it at import time and export the result.
- Changes here affect all apps — treat modifications carefully.
