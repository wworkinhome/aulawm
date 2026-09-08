# ADR-0004: Supabase as initial infrastructure provider

> **Amended.** Originally scoped Supabase to Postgres + Storage only, with auth
> owned by NestJS ([ADR-0002](0002-authentication-strategy.md)) and access via
> Prisma. The design handoff found in Phase 0 uses more of the Supabase
> platform deliberately — Auth ([ADR-0009](0009-supabase-auth.md)) and
> Realtime — and raw SQL rather than Prisma
> ([ADR-0012](0012-raw-sql-migrations.md)). Updated below to match.

## Context

The brief specifies Supabase for initial PostgreSQL hosting and object storage,
while requiring the architecture stay decoupled enough to migrate to AWS or
another provider later without a rewrite (Section 5, Section 136-137).

## Decision

Use Supabase for four things:

1. **Managed PostgreSQL** — connected to via raw SQL migrations and generated
   types ([ADR-0012](0012-raw-sql-migrations.md)), not an ORM. The schema
   deliberately uses Postgres-native RLS, custom functions, and triggers — see
   `sql/schema.sql`.
2. **Auth** — Supabase Auth issues and verifies credentials and JWTs, with a
   custom access token hook embedding roles/groups as claims (
   [ADR-0009](0009-supabase-auth.md)). This is a reversal of this ADR's
   original position; ADR-0009 has the full reasoning.
3. **Storage** — private buckets for documents, submissions, and avatars
   (video is handled separately — see [ADR-0011](0011-video-hosting.md)),
   accessed by the backend using the service-role key (never exposed to the
   frontend) to generate short-lived signed URLs.
4. **Realtime** — used narrowly, for pushing live status to the client on
   things a client would otherwise have to poll: a code submission's grading
   verdict (`lab_envios`), an exam attempt's timer resync. Not used as a
   general pub/sub backbone for the whole app.

The backend depends on Supabase's Postgres protocol (for its raw-SQL access
path), the Supabase Auth JWT contract, and signed URLs — not on the Supabase
JS SDK as an unavoidable hard dependency for every concern. This keeps a future
migration to, e.g., RDS + S3 + a different auth provider a matter of swapping
each piece independently, not a single all-or-nothing redesign — though
adopting Auth and Realtime directly (vs. this ADR's original Postgres+Storage
-only scope) does mean more of the platform would need replacing at once if
Supabase itself were ever dropped entirely. That tradeoff is accepted because
building equivalents of Auth/Realtime in-house would cost more than the lock-in
risk it avoids, at this project's scale.

## Alternatives considered

- **Self-hosted Postgres from day one**: rejected for MVP — adds operational
  burden (backups, patching, HA) with no immediate benefit over a managed
  offering the brief already specifies.
- **AWS RDS + S3 from day one**: rejected for MVP — more setup overhead and cost
  for a single-institution launch; the architecture is deliberately kept ready
  for this migration (Section 137) rather than adopting it prematurely.

## Consequences

- Fast initial setup, managed backups/TLS out of the box.
- A storage-adapter interface (`upload`, `getSignedUrl`, `delete`) should be
  defined in the backend so swapping the underlying provider later touches one
  module, not every feature that stores files.
- If/when RLS is adopted as an additional defense-in-depth layer, it must be
  designed against the same authorization rules already enforced in NestJS — not
  as a replacement for them.
