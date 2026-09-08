# ADR-0008: Hybrid data access — direct Supabase reads (RLS) + Nest-mediated writes

## Context

The design handoff (`LMS Wilmer Moqsuera/design_handoff_aulawm/README.md`)
proposes that Next.js read simple, already-scoped data directly from Supabase
Postgres via `supabase-js`, relying on Row Level Security, while every
domain-write goes through NestJS. This is a deliberate deviation from
[ARCHITECTURE.md](../../ARCHITECTURE.md)'s original, stricter proposal that all
reads and writes go through the API. This ADR records the reconciled decision.

## Decision

Adopt the hybrid model, with explicit rules to keep it from becoming a Zero
Trust violation:

- **Reads that are (a) simple row lookups/listings and (b) already fully
  scoped by a straightforward ownership rule** (my courses, my enrollment, my
  notes, my badges) may be read directly by a Next.js Server Component via
  `supabase-js`, protected by an RLS policy in `sql/schema.sql`.
- **Every write to domain data** (grades, exam attempts/answers, lab
  submissions and their verdicts, publishing anything, role/enrollment
  approval, ponderaciones) goes through NestJS. Nest uses the Supabase
  **service-role key** — called the **secret key** (`sb_secret_...`) under
  Supabase's newer key naming, used on the real `aulawm` project; same
  bypasses-RLS role, new label — which bypasses RLS — meaning RLS provides *zero*
  protection on the write path, and every authorization/business rule for
  writes must be implemented explicitly in a Nest guard or service. This is
  spelled out directly in the schema's RLS section: "las escrituras de dominio
  (notas, calificación de labs, cierre de intentos) las hace Nest con la
  service_role key, que salta RLS — no dependas de RLS para esas reglas."
- **Anything requiring business logic, cross-table consistency, or an external
  service** (weighted grade calculation, exam timing/attempt integrity, signed
  upload URLs, sandbox dispatch, video asset creation) is a write-shaped
  concern even if it superficially looks like a read (e.g., "get my exam
  attempt" actually creates or resumes an attempt row) — it goes through Nest.
- **The client-side Supabase key is always the anon key** (the **publishable
  key**, `sb_publishable_...`, in the newer naming), scoped by RLS. The
  service-role/secret key exists only in the Nest process's environment and
  is never sent to the browser or bundled into the Next.js client build.
- Tables holding data that must never leak to the wrong reader even under a
  direct query — the question bank's `clave` (answer key), a lab's
  `codigo_solucion`/`archivo_pruebas` — either have no student-readable RLS
  policy at all, or are served to students only through a Nest endpoint that
  strips those columns. The schema encodes this directly (see `preguntas`,
  `labs` policies: comments call out that these must go through Nest or a
  column-restricted view, never a raw table read).

**A RLS policy alone is not enough to make a table directly readable —**
confirmed the hard way testing the real login (2026-09-08): every table in
this schema had `enable row level security` but no base `GRANT` to the
`authenticated`/`anon` Postgres roles. Without that grant, PostgREST fails
with `permission denied for table X` *before RLS is even evaluated* — a
correct, permissive RLS policy on a table nobody has been granted access to
still returns nothing but a permission error. Fixed globally in
[20260101000005_grant_authenticated_table_access.sql](../../supabase/migrations/20260101000005_grant_authenticated_table_access.sql)
by granting `select, insert, update, delete` to `authenticated` (and
`select` to `anon`) across the whole `public` schema — matching what
Supabase's own Table Editor does automatically when you create a table
through the dashboard, which raw-SQL migrations don't get for free. **RLS is
now the only real access-control layer**, exactly as intended; the grant is
just the prerequisite that makes RLS reachable at all. Anyone adding a new
table via a raw SQL migration should not need to repeat this grant (the
`alter default privileges` in that migration covers future tables too), but
it's worth knowing why if a fresh table ever mysteriously 403s despite a
correct policy.

## Alternatives considered

- **All reads and writes through Nest** (the originally proposed stricter
  model): rejected as the sole approach once the handoff's schema/RLS design
  was found — it already implements a well-reasoned, tested pattern for this
  exact product, and duplicating every simple list/detail read as a Nest
  endpoint adds latency and code for no security benefit when RLS already
  enforces the same row-ownership rule at the database layer.
- **All reads and writes direct to Supabase, no Nest involvement**: rejected —
  RLS cannot express "the weighted grade recalculation must run inside the same
  transaction as the grade write," "an exam attempt's remaining time is
  computed against the server clock," or "dispatch this submission to Judge0."
  These need a real backend process.

## Consequences

- Two authorization mechanisms exist (RLS policies + Nest guards) and they are
  **not interchangeable** — a bug fixed in one does not fix the other. Every
  new table needs an explicit decision: does this table get a student-readable
  RLS policy, and if so, does any column on it need withholding (answer keys,
  solutions)?
- Code review for any new table/endpoint must check both: (1) is the RLS policy
  on this table correct and did we mean for the client to read it directly, and
  (2) if Nest also touches this table, does Nest independently enforce the same
  invariant rather than assuming RLS already did?
- [SECURITY_CHECKLIST.md](../../SECURITY_CHECKLIST.md) is updated to include an
  explicit RLS-review line item for this reason.
