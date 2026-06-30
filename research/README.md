# research/

Technical spikes, vendor evaluations, and proof-of-concept notes.

## Purpose

This folder documents **research done before a decision is made**. It contains the raw material that informs ADRs — benchmarks, comparisons, POC results, and vendor evaluations.

## Conventions

- Name files descriptively: `styling-engine-comparison.md`, `push-notifications-poc.md`
- Each file should state its conclusion clearly at the top
- Include data, not just opinions — link to benchmarks or paste results inline
- When research leads to a formal decision, link the ADR from the research document

## Potential topics

| Topic | Status |
|---|---|
| Styling engine (Tailwind v4 vs CSS Modules vs vanilla-extract) | Not started |
| State management (Zustand vs Jotai vs TanStack Query) | Not started |
| Push notifications for mobile (Expo Notifications vs OneSignal) | Not started |
| Event transport (EventEmitter vs Redis Streams vs RabbitMQ) | Not started |
| Multi-tenancy model (row-level vs schema-level) | Not started |
| File storage (local vs S3-compatible for patient documents) | Not started |
| PDF generation for invoices | Not started |
| Odontogram rendering (SVG library evaluation) | Not started |

## Format template

```markdown
# Research: <Topic>

**Conclusion:** <One sentence>
**Recommendation:** <What to do>
**Date:** YYYY-MM-DD

## Context
## Options evaluated
## Findings
## Recommendation rationale
## Links
```
