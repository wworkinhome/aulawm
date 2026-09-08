# ADR-0003: PostgreSQL + Prisma

> **Amended by [ADR-0012](0012-raw-sql-migrations.md).** The Prisma/migration
> tooling decision below is superseded — the project uses raw SQL migrations
> and generated types instead, because the design handoff's schema depends on
> RLS policies, custom SQL functions, and triggers that Prisma doesn't model
> well. The reasoning in this ADR about PostgreSQL itself (sole system of
> record, FK/constraint discipline, RLS readiness) still stands; only "via
> Prisma" is no longer accurate.

## Context

The brief mandates PostgreSQL (via Supabase) and Prisma explicitly (Section 4).
This ADR records the reasoning so it isn't re-litigated per-module.

## Decision

Use PostgreSQL as the sole system of record, accessed exclusively through Prisma
from the NestJS backend (and, for the sandbox worker, a separate, narrower-scoped
Prisma client/credentials — see [ADR-0005](0005-programming-sandbox-architecture.md)).

- All schema changes go through Prisma Migrate — no manual schema edits against
  any environment, including staging.
- Every relationship that represents real referential integrity (enrollment →
  course, submission → assignment, grade → student) is a database-level foreign
  key, not just an application-level reference.
- Unique constraints enforce invariants the application must never violate
  (e.g., one enrollment per student per course section) at the database layer,
  not only in service code.
- Row Level Security (RLS) is prepared conceptually (Supabase supports it
  natively) but not required for MVP since the NestJS API is the sole authorized
  writer/reader of the database — RLS becomes more valuable if/when any client
  ever talks to Supabase directly (it currently does not, by design; see
  [ADR-0004](0004-supabase-infrastructure.md)).

## Alternatives considered

- **NoSQL (e.g. MongoDB) for flexible content shapes** (lessons, questions):
  rejected — grades, enrollments, and exam attempts are inherently relational
  and transactional; a document store would push referential-integrity
  enforcement into application code exactly where the brief says not to trust it
  (Section 133).
- **Direct Supabase client SDK calls from the frontend, bypassing NestJS**:
  rejected for anything beyond public/anonymous read-only content — it would
  make the frontend, not the API, the authorization boundary, which contradicts
  the Zero Trust principle in [SECURITY.md](../../SECURITY.md).

## Consequences

- Every schema change is reviewable as a migration diff.
- The Prisma schema becomes the canonical, versioned description of the domain
  model — useful as living documentation alongside [ARCHITECTURE.md](../../ARCHITECTURE.md) §9.
- RLS is available as a defense-in-depth layer to add later without a data model
  change, if a future client (mobile app, partner integration) needs to talk to
  Supabase more directly.
