# Architecture Decision Records (ADRs)

This folder contains Architecture Decision Records for the DentalFlow platform.

## What is an ADR?

An ADR is a short document that captures an important architectural decision: the context that motivated it, the decision itself, and its consequences. ADRs are immutable once accepted — if a decision changes, a new ADR supersedes the old one (the old one is updated to reference the new one, not deleted).

## Status lifecycle

```
Proposed → Accepted → Superseded
                ↓
            Deprecated
```

## Index

| # | Title | Status | Date |
|---|---|---|---|
| [ADR-000](ADR-000-architecture-foundation.md) | Architecture Foundation | Accepted | 2026-06-26 |

## Writing a new ADR

Copy the template below into a new file named `ADR-NNN-short-title.md`, fill in all sections, and add it to the index above.

```markdown
# ADR-NNN: Title

**Status:** Proposed  
**Date:** YYYY-MM-DD  
**Deciders:** (names or roles)

## Context

What is the situation forcing this decision?

## Decision

What did we decide?

## Consequences

What are the positive and negative outcomes?

## Alternatives considered

What else was evaluated and why was it rejected?
```
