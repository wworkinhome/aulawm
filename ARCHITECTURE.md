# AulaWM — Architecture

## 0. Status of this document

**Revised.** Phase 0 discovery found a design handoff package at
`LMS Wilmer Moqsuera/design_handoff_aulawm/` (extracted from
`LMS Wilmer Moqsuera.zip`) containing a high-fidelity HTML prototype (19 screens),
a complete Postgres/Supabase schema with RLS (`sql/schema.sql`), a full REST API
contract (`api/endpoints.md`), and production-ready design tokens
(`tokens/tokens.css`, `tokens/tokens.json`). That package makes several concrete
architecture decisions that are more specific than — and in a few places different
from — the generic proposal originally written here. This document now reflects
the handoff's decisions as the working plan. Sections below flag where this
diverges from the original mega-brief's generic guidance and why.

The handoff package is a **design reference**, not production code: it's one
static HTML file with inline styles and hand-written data, meant to be recreated
screen-by-screen as real Next.js routes backed by the real API — not copied or
wrapped wholesale (its own README says this explicitly).

## 1. Product summary

AulaWM is the LMS for the school where Wilmer Mosquera teaches Tecnología e
Informática, Excel, Word, PowerPoint, bases de datos, derecho laboral y
emprendimiento, and coordinates the *Auxiliar en Sistemas de Información*
technical track (fullstack JavaScript). Four capabilities:

1. **Courses** — video + support material + timestamped notes.
2. **ICFES-style timed simulations** — training mode and full simulation mode,
   scored and reported by competency.
3. **Labs** — autograded programming labs (Replit-like) and office labs (Excel,
   Word, PowerPoint, SQL) with step-by-step guidance and file submission.
4. **Teacher authoring & management** — build exams and labs, publish
   assignments, grade.

Built to start as one teacher's platform and stay compatible with growing into a
multi-institution product later (Section 130 of the original brief) without a
rewrite — see [ROADMAP.md](ROADMAP.md).

## 2. Style: Modular Monolith, split by trust boundary

**Decision (unchanged, now more concrete):** one Next.js app (`apps/web`), one
NestJS app (`apps/api`), organized as a pnpm + Turborepo monorepo. See
[ADR-0001](docs/adr/0001-modular-monolith.md). Rule of thumb from the handoff,
which this document adopts:

> Lecturas simples desde Next.js directo a Supabase con RLS; toda escritura de
> dominio a través de Nest. Así el navegador nunca puede escribir una nota.

I.e.: **simple reads** may go straight from a Next.js Server Component to
Supabase Postgres via `supabase-js`, protected by Row Level Security.
**Every domain write** — grades, exam attempts, lab submissions, publishing,
role/enrollment changes — goes exclusively through the NestJS API, which is
where authorization, business rules (weighted grade calculation, attempt
integrity, rounding), and integration with external services (sandbox runner,
video, signed uploads) live. See [ADR-0008](docs/adr/0008-hybrid-data-access.md)
for the full reasoning and the boundary rules that keep this from becoming a
security gap.

## 3. High-level system diagram

```
                    ┌───────────────────────────────┐
                    │        Next.js 15 (Vercel)      │
                    │  App Router · RSC               │
                    │  /app/(auth) /(alumno) /(docente)│
                    └───────┬──────────────┬──────────┘
                            │              │
                 fetch(JWT) │              │ supabase-js
                            │              │ (SELECT only, RLS-enforced)
                            ▼              ▼
                 ┌────────────────┐   ┌───────────────────────────┐
                 │   NestJS API    │──▶│   Supabase                │
                 │ (Fly.io/Render) │   │   Postgres · Auth · Storage │
                 │  - JwtSupabase  │   │   · Realtime                │
                 │    Guard        │   └───────────────────────────┘
                 │  - RolesGuard   │
                 │  - pg-boss      │
                 └───┬────────┬────┘
                     │        │
                     ▼        ▼
              ┌───────────┐ ┌──────────────┐
              │  Judge0    │ │ Mux / Cloud- │
              │  sandbox   │ │ flare Stream │
              │ (code exec)│ │  (video)     │
              └───────────┘ └──────────────┘
```

Key points:

- The browser never holds a Supabase **service-role** key — only the anon key,
  scoped by RLS.
- Next.js reading directly from Supabase is an *optimization for simple,
  already-authorized reads*, not a bypass of authorization: RLS policies
  (`sql/schema.sql` §8) enforce "a student sees their own rows; a teacher sees
  the rows of groups they teach; coordination sees everything" at the database
  level, keyed off a `roles`/`grupos` claim embedded in the Supabase JWT via a
  custom access token hook.
- NestJS talks to Supabase using the **service-role key** (bypasses RLS) — which
  is exactly why every domain-write rule (ownership, attempt state, grade
  ponderación, publication gating) must be enforced in Nest guards/services, not
  assumed to be covered by RLS once Nest is in the path.
- Student code never executes in the Next.js or NestJS process — it's queued
  (pg-boss) and run by Judge0, isolated, no network, resource-limited. See
  [ADR-0005](docs/adr/0005-programming-sandbox-architecture.md) (amended).

## 4. Tech stack (per the design handoff)

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 15 (App Router, React 19, TS) + Tailwind | SSR for dashboards, Server Components for listings, streaming for large tables |
| Backend | NestJS 11, REST, TypeScript | Domain modules, role guards, `class-validator` DTOs |
| Database | Supabase Postgres | Single provider for Postgres + Auth + Storage + Realtime |
| Auth | **Supabase Auth** (email/password + optional institutional SSO) | JWT verifiable in Nest without Nest owning the credential store — see [ADR-0009](docs/adr/0009-supabase-auth.md) (supersedes [ADR-0002](docs/adr/0002-authentication-strategy.md)) |
| Files | Supabase Storage | Private buckets (`material`, `entregas`, `avatares`), signed URLs only |
| Video | **Mux** or **Cloudflare Stream** | Supabase Storage doesn't transcode or serve HLS — see [ADR-0011](docs/adr/0011-video-hosting.md) |
| Code runner | **Judge0** (self-hosted) or ephemeral containers on Fly.io/Cloud Run | Student code never runs in the API process — [ADR-0005](docs/adr/0005-programming-sandbox-architecture.md) |
| Queue | **pg-boss** (on the same Postgres) | Grading, notifications, transcoding — see [ADR-0010](docs/adr/0010-pgboss-queue.md) (supersedes the Redis+BullMQ default in the original brief) |
| Realtime | Supabase Realtime | Simulation timer resync, live submission status, exam presence |

## 5. Repository structure (monorepo, pnpm + Turborepo)

```
aulawm/
├── apps/
│   ├── web/                        # Next.js 15
│   │   ├── app/
│   │   │   ├── (auth)/             # login, registro, recuperar — no shell
│   │   │   ├── (alumno)/           # inicio, cursos, simulacros, labs, perfil…
│   │   │   └── (docente)/          # panel, examenes, labs, notas, publicar…
│   │   ├── components/
│   │   │   ├── ui/                 # Button, Card, Chip, Switch, Badge…
│   │   │   ├── rail/                # left nav
│   │   │   ├── examen/              # Cuadernillo, Cronometro, OpcionRespuesta
│   │   │   ├── lab/                  # EditorMonaco, PanelPruebas, Consola
│   │   │   └── notas/                # PlanillaGrid (sticky column + editable cells)
│   │   └── lib/
│   │       ├── supabase/            # createBrowserClient / createServerClient
│   │       └── api.ts                # typed client to Nest
│   └── api/                         # NestJS
│       └── src/
│           ├── auth/                # JwtSupabaseGuard, RolesGuard, @Roles()
│           ├── cursos/ clases/
│           ├── examenes/            # bank, templates, attempts, grading
│           ├── labs/                # definitions, test cases, submissions
│           ├── entregas/            # assignments, files
│           ├── notas/               # weighting, definitiva, publishing
│           ├── analitica/
│           ├── runner/              # Judge0 client
│           ├── storage/             # signed URLs
│           └── jobs/                # pg-boss workers
├── packages/
│   ├── db/                          # SQL migrations + generated types
│   ├── shared/                      # DTOs, zod schemas shared web/api
│   └── tokens/                      # design tokens (from the handoff)
└── supabase/
    └── migrations/
```

This supersedes the `apps/frontend` / `apps/backend` naming originally proposed
in this document — use `apps/web` / `apps/api` to match the handoff and its
`api/endpoints.md`.

## 6. Data model

**Canonical source: `LMS Wilmer Moqsuera/design_handoff_aulawm/sql/schema.sql`.**
22 tables across 6 groups — do not re-derive an English-named schema from
scratch; port this schema (Spanish table/column names, `snake_case`, `uuid`
PKs, `timestamptz`) into `supabase/migrations/` as the first real migration.

- **Identidad y organización**: `perfiles` (extends `auth.users`),
  `roles_usuario`, `consentimientos` (guardian consent, Ley 1581/2012),
  `anios_academicos`, `periodos`, `grupos`, `matriculas`.
- **Contenido**: `cursos`, `curso_grupos`, `modulos`, `clases`,
  `clase_capitulos`, `recursos`, `apuntes`, `progreso_clase`.
- **Evaluación ICFES**: `competencias`, `preguntas` (bank — `clave` never
  reaches the student client), `examenes`, `examen_preguntas`,
  `examen_asignaciones`, `intentos`, `respuestas`, `resultados_competencia`.
- **Laboratorios**: `labs` (`codigo_solucion`/`archivo_pruebas` never exposed),
  `lab_casos`, `lab_pistas`, `lab_envios`.
- **Entregas y notas**: `asignaciones`, `asignacion_grupos`,
  `asignacion_adjuntos`, `rubricas`, `rubrica_criterios`, `entregas`,
  `entrega_archivos`, `calificaciones`, `ponderaciones`, `notas_definitivas`
  (materialized, recalculated by an `AFTER INSERT OR UPDATE ON calificaciones`
  trigger — see `recalcular_definitiva()` in the schema).
- **Gamificación**: `insignias`, `insignias_usuario`, `xp_eventos`, `rachas`.

RLS is enabled on every student-facing table; the pattern is
"student sees/writes their own rows; teacher sees/writes rows of groups they
teach; coordination sees everything" (functions `es_docente()`,
`dicta_grupo()` in the schema). RLS is a **defense-in-depth read boundary for
direct Supabase access**, not the enforcement point for domain writes — those
happen in Nest with the service-role key, per [ADR-0008](docs/adr/0008-hybrid-data-access.md).

## 7. API contract

**Canonical source: `LMS Wilmer Moqsuera/design_handoff_aulawm/api/endpoints.md`.**
Base path `/api/v1`, `problem+json` (RFC 9457) errors, cursor pagination,
`Idempotency-Key` on retryable writes. Module surface: `auth`, `cursos`,
`clases`, `examenes`/`icfes`/`intentos`, `labs`/`lab-envios`, `asignaciones`/
`entregas`, `storage`, `preguntas` (bank, teacher-only), `notas`, `analitica`.
Do not redesign this contract from the abstract module list in the original
brief (Section 105) — the handoff's version is already concrete, with request/
response shapes and status codes worked out; treat Section 105 as satisfied by
it.

## 8. Backend cross-cutting concerns

- `JwtSupabaseGuard` verifies the Supabase-issued JWT (HS256 via
  `SUPABASE_JWT_SECRET`, or JWKS if the project moves to asymmetric keys) and
  populates `req.user = { sub, roles, grupos }`.
- `RolesGuard` + `@Roles('docente'|'coordinacion')` on every authoring endpoint.
- **Every** teacher-scoped endpoint additionally validates that the resource
  (course, exam, lab, group) belongs to a group/course the caller actually
  teaches — role alone is never sufficient (IDOR/BOLA defense, matches
  [SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md)).
- Global `ValidationPipe` (whitelist), global exception filter emitting
  `problem+json` with a correlation id, never leaking internals.
- Sensitive mutations (grade writes, exam publish, role/enrollment approval,
  lab publish) emit an `AuditLog` entry.

## 9. Programming sandbox — non-negotiable boundary

Unchanged rule, concrete implementation: student code is packaged (starter +
student code + teacher's hidden test file) and sent to **Judge0** with CPU (5s),
memory (256MB), no-network, read-only-filesystem, and 64KB output-truncation
limits, per test case (for partial credit). See
[ADR-0005](docs/adr/0005-programming-sandbox-architecture.md) for the full flow
and the escalation path (gVisor/Firecracker/k8s Jobs) if Judge0's isolation
proves insufficient at scale.

Languages at launch per the handoff: JavaScript/Node (vitest), Python (pytest),
SQL (ephemeral Postgres/MySQL copy, query run in a transaction with
`ROLLBACK`), HTML/CSS (jsdom + DOM assertions, not screenshot capture).

## 10. Office labs (Excel/Word/PowerPoint)

The prototype draws an Excel sheet but doesn't compute anything. Concrete
plan (in order of cost, per the handoff — start with #1):

1. **File submission + server-side verification** (MVP): student works in real
   Excel/Word/PowerPoint, uploads the file; a worker opens it with `exceljs`
   (formulas, ranges, pivot tables, charts), `mammoth` (Word styles/heading
   hierarchy/TOC), or OOXML reading (PowerPoint slide count, speaker notes,
   template) and scores against the rubric criteria.
2. **Embedded editor** (OnlyOffice Docs Community / Collabora in a container) —
   student edits inside the LMS, file stays in Storage.
3. **Microsoft Graph** with the school's education licensing — real Office
   editing + API read. Best UX, most dependent on institutional paperwork.

## 11. Multi-tenancy readiness (not built yet)

Unchanged from the original proposal: no tenant table exists yet. Every
top-level entity in `sql/schema.sql` is scoped by `anio_id`/`grupo_id`/
`curso_id` rather than assuming a single implicit global tenant, which keeps a
future `institucion_id` column additive rather than a restructuring.

## 12. Decisions on the handoff's blocking questions

The handoff's own README listed five decisions it said must be made **before**
the first migration/screen is built. Resolved with the user as follows:

1. **Menores de edad** — **decided: define the guardian-consent/data-treatment
   policy and retention rule before Phase 1's registration flow goes live.**
   Ley 1581/2012 + Decreto 1377/2013 requires guardian consent, a published
   data-treatment policy, and a defined retention/deletion path (does data get
   deleted at graduation?). The schema already has a `consentimientos` table;
   the policy text and retention rule are the remaining work — treat this as a
   Phase 1 blocker for enabling real student registration (development/testing
   with fictitious accounts is not blocked). Tracked as
   [TD-008](TECHNICAL_DEBT.md).
2. **Sistema de verdad de las notas** — **decided: AulaWM's gradebook
   (`notas_definitivas`) is the sole source of truth.** No sync to an external
   academic system, no export-format requirement for MVP. Revisit only if an
   institutional system is introduced later.
3. **Escala del runner** — still open, but not a decision for the user to make
   now — it's an ops/load-testing task before Phase 3 goes live in a real
   classroom. Tracked as [TD-010](TECHNICAL_DEBT.md).
4. **Conectividad** — **decided: the lab's internet is unreliable.** The
   Phase 2 exam-taking client must be designed from the start with local
   (IndexedDB) answer buffering and resend-on-reconnect, not added later. See
   [ROADMAP.md Phase 2](ROADMAP.md#phase-2--icfes-est-34-weeks) and
   [TD-011](TECHNICAL_DEBT.md).
5. **Video budget** — **decided: start Phase 1 with unlisted YouTube links**
   (no owned video pipeline yet); pick Mux vs. Cloudflare Stream
   ([ADR-0011](docs/adr/0011-video-hosting.md)) before Phase 4. Tracked as
   [TD-012](TECHNICAL_DEBT.md).

## Related documents

- [SECURITY.md](SECURITY.md), [SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md), [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)
- [ROADMAP.md](ROADMAP.md), [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md)
- [docs/adr/](docs/adr/)
- Design handoff: `LMS Wilmer Moqsuera/design_handoff_aulawm/` (prototype HTML,
  SQL schema, API contract, design tokens)
