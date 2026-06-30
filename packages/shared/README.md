# @dentalflow/shared

Platform-agnostic runtime utilities shared across all DentalFlow apps.

## Purpose

Pure JavaScript/TypeScript helper functions that are useful in both browser and Node.js environments. No framework coupling, no side effects.

## What belongs here

- Date/time helpers (formatting, timezone conversion)
- Locale-specific formatting (currency BRL, phone, CPF/CNPJ, CRM)
- Typed error classes
- Pagination utilities (cursor-based, offset-based)
- Pure validation predicates (not tied to class-validator or Zod)
- String manipulation utilities

## What does NOT belong here

- React hooks or components (use `@dentalflow/ui`)
- TypeScript-only types (use `@dentalflow/types`)
- Config constants (use `@dentalflow/config`)
- Anything requiring `window`, `document`, or Node's `fs`

## Usage

```ts
import { formatCurrency, formatCPF } from '@dentalflow/shared'
```

## Conventions

- Every function is pure (no side effects, same input → same output).
- Tree-shakeable: avoid barrel re-exports of large modules.
- Fully unit-tested (Jest or Vitest).
