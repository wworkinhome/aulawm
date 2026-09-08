# ADR-0007: Separate Next.js frontend and NestJS backend (not Next.js API routes)

> **Amended by [ADR-0008](0008-hybrid-data-access.md).** The "never reaching
> into the database directly from the Next.js process" line in the original
> Consequences below is no longer accurate as a blanket rule — the design
> handoff's hybrid model has Next.js Server Components read simple,
> RLS-scoped data directly from Supabase. The core decision here (Next.js and
> NestJS as separate deployables, NestJS owns all trusted business logic) is
> unchanged; only the database-access boundary is refined by ADR-0008.

## Context

Next.js can host API routes/route handlers directly, which would let the whole
product live in one deployable. The brief instead mandates NestJS as a distinct
backend (Section 3), with the frontend never trusted for permissions, roles,
grades, or security decisions (Section 3, Section 62 Zero Trust).

## Decision

Run two deployables: a Next.js frontend and a NestJS backend, communicating over
a versioned REST API (`/api/v1`). Next.js is responsible for rendering and UX
only — it holds no business logic that must be trusted (grading rules,
authorization decisions, exam scoring), even for logic that *could* run at the
edge for latency reasons.

## Alternatives considered

- **Next.js API routes as the entire backend**: rejected. NestJS's structured
  module system (guards, interceptors, pipes, DI) is a better fit for the
  volume of cross-cutting security concerns this product requires (RBAC/ABAC on
  dozens of resource types, audit logging, DTO validation) than hand-rolled
  route handlers. It also keeps the backend deployable independently of the
  frontend's release cadence — relevant once a worker process and queue-based
  sandbox (see [ADR-0005](0005-programming-sandbox-architecture.md)) are part of
  the same backend deployment story.
- **tRPC or a similar type-shared RPC layer instead of REST**: rejected for
  MVP — the brief specifies REST + OpenAPI/Swagger explicitly (Section 3),
  which also gives a natural, tool-supported contract for future non-Next.js
  clients (a future mobile app, partner integrations).

## Consequences

- Two independently deployable services from day one (frontend on Vercel,
  backend on Railway/Render — see [ARCHITECTURE.md §4](../../ARCHITECTURE.md)),
  each with its own build/release pipeline.
- Shared types/DTOs between frontend and backend live in a `packages/shared`
  package to avoid drift, rather than being redefined independently on each
  side.
- Server Components in Next.js may call the NestJS API server-side for
  anything requiring business logic or a domain write, **and** may read
  directly from Supabase via `supabase-js` for simple, RLS-scoped reads —
  see [ADR-0008](0008-hybrid-data-access.md) for exactly which reads qualify
  and why this isn't a Zero Trust violation. What Next.js never does, under
  either path, is write domain data or use the Supabase service-role key.
