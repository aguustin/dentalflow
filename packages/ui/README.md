# @dentalflow/ui

DentalFlow design system — shared React component library.

## Purpose

Headless or lightly-styled React primitives used by `apps/web`. Components are generic and reusable, with no domain knowledge.

## Scope

- Atomic UI components: Button, Input, Modal, Toast, Badge, Avatar, Table, Skeleton, Calendar picker
- Layout components: Stack, Grid, Container, Divider
- Design tokens: color palette, spacing scale, typography, shadows, border radii
- Generic UI hooks: `useDisclosure`, `useDebounce`, `useClickOutside`, `useMediaQuery`

## What does NOT belong here

- Domain-specific components (a `PatientCard` belongs in `apps/web`)
- Business logic, API calls, or state
- React Native components (mobile has its own component set)

## Usage

```tsx
import { Button, Modal } from '@dentalflow/ui'
```

## Design decisions (TBD)

- **Styling engine:** Tailwind CSS v4 (preferred) or CSS Modules — decision pending (see `decisions/`)
- **Accessibility:** WCAG 2.1 AA compliance target for all interactive components
- **Storybook:** will document components visually once primitives are built

## Conventions

- One component per file, co-located with its types and tests.
- No default exports — named exports only.
- Props interfaces exported alongside the component.
