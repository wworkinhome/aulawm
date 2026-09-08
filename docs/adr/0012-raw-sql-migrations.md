# ADR-0012: Raw SQL migrations + generated types, not Prisma (amends ADR-0003)

## Status

**Amends [ADR-0003](0003-database-postgres-prisma.md).** ADR-0003 chose Prisma
as the ORM and migration tool. The design handoff's schema
(`LMS Wilmer Moqsuera/design_handoff_aulawm/sql/schema.sql`) is written as
hand-authored SQL with Postgres-native enums, `citext`, custom functions
(`auth_roles()`, `es_docente()`, `dicta_grupo()`, `recalcular_definitiva()`),
an `AFTER INSERT OR UPDATE` trigger, and 20+ Row Level Security policies. This
ADR resolves the conflict between that schema and ADR-0003's Prisma-Migrate-only
rule.

## Context

Prisma Migrate can execute arbitrary SQL in migrations, but its schema is
defined primarily through `schema.prisma`, and Prisma's query engine does not
natively express: RLS policies, custom SQL functions used inside policies
(`auth_roles()` reading `auth.jwt()`), or triggers that call a `plpgsql`
function on write (`recalcular_definitiva`). Forcing this schema through
Prisma would mean maintaining the real schema logic in raw SQL anyway (via
`prisma migrate diff`/`db push` escape hatches) while keeping a
`schema.prisma` file that can drift from what's actually true in the database
— a worse position than not using Prisma at all here.

## Decision

- **Schema and migrations are raw SQL**, versioned in `supabase/migrations/`
  and applied via the Supabase CLI (`supabase migration up` / `supabase db
  push`), starting from `sql/schema.sql` as the first migration.
- **TypeScript types are generated from the live schema** (e.g.
  `supabase gen types typescript`), not hand-maintained and not derived from a
  Prisma schema — this is what `packages/db` ("migraciones SQL + tipos
  generados" in the handoff) holds: the migration files plus their generated
  types, consumed by both `apps/web` and `apps/api`.
- **NestJS's data access layer** talks to Postgres either via the Supabase
  admin client (service-role key, for straightforward CRUD that doesn't need
  complex joins) or a lightweight, SQL-first query builder (e.g. Kysely) for
  anything requiring hand-tuned queries (the gradebook planilla's "~35 rows ×
  8 columns in one query" requirement, `analitica` aggregations) — chosen at
  implementation time per module, not mandated globally, since neither
  requires a schema-definition tool the way an ORM does.
- Prisma is **not used** anywhere in this project going forward.

## Alternatives considered

- **Keep Prisma, hand-write the RLS/functions/triggers as raw SQL inside
  Prisma migrations**: rejected — this is strictly worse than not using Prisma:
  all the same raw-SQL authorship burden, plus a `schema.prisma` file that
  either omits RLS/functions/triggers entirely (misleading — it doesn't
  reflect reality) or has to be kept in sync by hand with objects Prisma
  doesn't model. It also fights the "recreate the handoff's schema in
  production" goal: the handoff's `sql/schema.sql` is meant to be ported
  close to verbatim, not translated into a different schema DSL.
- **Prisma with `previewFeatures` for RLS-adjacent functionality**: rejected —
  even where Prisma has experimental support for some Postgres features, this
  project's schema leans on custom SQL functions and triggers Prisma has no
  model for at all; there is no partial-Prisma path that avoids maintaining
  the real schema in raw SQL.

## Consequences

- `packages/shared`'s DTOs (zod schemas per the handoff) become the main
  place request/response shapes are validated and typed on the API boundary;
  the generated Supabase types cover the database row shapes. These are two
  different types of "type safety" and are not meant to collapse into one
  generated source — a DTO can legitimately reshape/rename database columns
  for the API contract (see `api/endpoints.md`'s camelCase JSON vs. the
  schema's `snake_case` columns).
- Schema review in PRs is a raw SQL diff review — reviewers need enough SQL
  fluency to review RLS policies and trigger logic directly (this is a real
  skill requirement for this project's backend work, not a Prisma abstraction
  hiding it).
- [ADR-0003](0003-database-postgres-prisma.md)'s non-Prisma-specific
  reasoning (Postgres as sole system of record, FK/constraint discipline, RLS
  prepared conceptually) still holds — only its ORM/migration-tool choice is
  superseded.
