# AulaWM — Roadmap

Phased delivery plan. Each phase must be functionally complete and reviewed
(including a security pass) before the next begins — this is not a strict
waterfall (Phase 2 work can start once Phase 1's foundations are stable), but no
phase ships to users half-finished. See [Definition of Ready](#definition-of-ready)
and [Definition of Done](#definition-of-done) below; every feature in every
phase must satisfy both.

**Revised after Phase 0 found the design handoff** at
`LMS Wilmer Moqsuera/design_handoff_aulawm/`. Phases 1–4 below now follow its
concrete plan and time estimates (built for this exact school/product) instead
of the original abstract 10-phase breakdown. Phases 5+ extend beyond what the
handoff covers and remain as originally scoped.

## Phase 0 — Discovery (current)

- [x] Analyze repository state — initially empty, then found the design
      handoff package (prototype HTML, SQL schema, API contract, design
      tokens) at `LMS Wilmer Moqsuera/design_handoff_aulawm/`
- [x] `ARCHITECTURE.md` (revised to match the handoff's concrete stack)
- [x] `SECURITY.md`, `SECURITY_THREAT_MODEL.md`, `SECURITY_CHECKLIST.md`
- [x] ADRs 0001–0011 (0002 superseded by 0009; 0005 amended for Judge0)
- [x] `ROADMAP.md` (this file), `TECHNICAL_DEBT.md`
- [x] User decisions on the five blocking questions in
      [ARCHITECTURE.md §12](ARCHITECTURE.md#12-decisions-on-the-handoffs-blocking-questions):
      AulaWM is the sole grades source of truth; guardian-consent policy to be
      finalized before real student registration; exam client must buffer
      offline from the start; Phase 1 video via unlisted YouTube links; runner
      concurrency remains an ops load-test task, not a product decision.
- [ ] User sign-off before Phase 1 scaffolding begins

## Phase 1 — Base (est. 4–6 weeks per the handoff)

Ships a usable LMS even without the sandbox or an owned video pipeline
(lesson videos can link to unlisted YouTube as a zero-cost bridge until
[ADR-0011](docs/adr/0011-video-hosting.md)'s provider is chosen).

- [x] Scaffold the monorepo: `apps/web` (Next.js), `apps/api` (NestJS),
  `packages/db`, `packages/shared`, `packages/tokens`, `supabase/migrations` —
  per [ARCHITECTURE.md §5](ARCHITECTURE.md#5-repository-structure-monorepo-pnpm--turborepo).
  Builds, lints, and `turbo run build` pass across all 5 workspace packages.
- [x] Real Supabase project provisioned (`aulawm`, org WM Docente,
  us-east-1) — see [ARCHITECTURE.md "Live infrastructure"](ARCHITECTURE.md#live-infrastructure-as-of-2026-09-07).
  `sql/schema.sql` applied as migrations 0–3 (schema, access-token hook,
  storage buckets, a hook bug fix), hook registered in the dashboard, and
  the whole login → JWKS-verify → role-gate pipeline confirmed end to end
  against real infrastructure with a throwaway test user.
- [x] **Real login page** (`apps/web/src/app/(auth)/login`), wired to
  Supabase Auth via `@supabase/ssr` (browser + server clients,
  `proxy.ts` for session refresh and route protection — Next.js 16's
  rename of `middleware.ts`). Verified end to end in a real browser with
  both seeded test accounts (docente and estudiante), including sign-out.
  A protected `/inicio` page reads the logged-in user's own profile
  directly from Supabase (RLS-scoped, per ADR-0008) and renders their
  name/role — the first real example of the hybrid data-access pattern
  in actual frontend code, not just documented intent.
- [x] Seeded realistic dev/test data (`supabase/seed.sql`): one docente,
  two estudiantes with active matrículas in one grupo, one curso with
  2 módulos/3 clases. Credentials in the seed file's header comment.
- [ ] Auth: registration business logic — `POST /auth/registro` creating
  `matriculas.estado = 'pendiente'`, the teacher/coordination approval
  endpoint, password reset UI. Login itself is done; this is the
  remaining onboarding flow on top of it.
- [x] `JwtSupabaseGuard` (JWKS-based, not the HS256 secret ADR-0009 originally
  assumed — see the architecture doc's live-infrastructure note) +
  `RolesGuard` + `@CurrentUser()`/`@Public()`/`@Roles()` decorators
  (`apps/api/src/auth/`) — verified end to end with both signed test JWTs and
  a real Supabase-issued token from a real (since-deleted) test user. Still
  needed: the ownership-check half of the pattern (a teacher endpoint
  verifying the resource belongs to a group they teach, not just their role)
  once a real resource module exists to demonstrate it on.
- [x] Design System v0 foundation: `@aulawm/tokens` wired into
  `apps/web/src/app/globals.css` via Tailwind v4's `@theme inline`, fonts
  self-hosted via `next/font/google` (Archivo, Azeret Mono), verified
  rendering correctly in-browser. Component library itself (Button, Input,
  Card, Chip, Switch, Badge, Modal, Toast, Skeleton, Empty/Error states) not
  yet built.
- [x] **App shell**: top bar (logo, search box, avatar with gradient
  initials, Alumno/Docente switch — shown only when an account actually
  holds both roles), left rail (own-scroll, numbered, active-state
  highlight, "Periodo 3" card, sign-out), separate `(alumno)`/`(docente)`
  route groups per [ARCHITECTURE.md's structure](ARCHITECTURE.md#5-repository-structure-monorepo-pnpm--turborepo),
  each with its own nav list (13 estudiante items, 18 docente items — brief
  §19–20) and its own role-gated layout. All 29 not-yet-built destinations
  render a shared `ComingSoon` component instead of dead links or 404s.
  Verified in-browser with both seeded accounts, including sign-out and
  active-state highlighting while navigating.
- [x] **Mis cursos + detalle de curso** (estudiante): `/cursos` lists
  enrolled courses with a per-course progress bar (published clases vs.
  the student's own `progreso_clase` rows); `/cursos/[id]` shows the
  módulos/clases accordion (type badge, duration, completion dot) and a
  docente card. RLS policies for `cursos`, `modulos`, and `clases` added
  and verified live (see [TD-015](TECHNICAL_DEBT.md)'s "write it when you
  first need it" rule in practice, three times over). Also found and fixed:
  the original `perfil_propio` policy let a docente read any perfil but
  never let a *student* read their own docente's — PostgREST silently
  returned `perfiles: null` in the embed instead of an error, so the
  teacher's name just disappeared until a `perfil_docente_visible` policy
  was added.
- [x] **Marcar clase como completada**: `/cursos/[id]/clases/[claseId]`
  (video embed slot, descripción, prev/next dentro del curso) con un botón
  cliente `MarcarCompletadaButton`. Pasa por un nuevo módulo Nest
  `progreso` (`PUT /clases/:id/progreso`) en vez de una escritura directa a
  Supabase, aunque la política RLS de `progreso_clase` es lo bastante
  permisiva para permitirlo — según ADR-0008, RLS sola no puede verificar
  que el estudiante esté realmente matriculado en el curso dueño de ese
  `clase_id`, así que esa validación vive en
  `ProgresoService.assertInscrito`. Verificado en navegador: marcar una
  clase actualiza tanto el botón de esa página como la barra de progreso
  de `/cursos` (0/3 → 1/3) tras una recarga real. `recursos`/`asignaciones`
  (recursos de archivo, tareas del docente) siguen sin construirse — el
  siguiente corte de esta fase.
- [x] **ICFES exam-taking vertical slice** (pulled forward from Phase 2 to
  prove the Nest domain-module pattern end to end): `apps/api/src/examenes`
  (`ExamenesService`/`Controller`) owns attempt creation/resume, idempotent
  answer saving, server-computed remaining time, and finalize-with-scoring —
  the answer key never leaves the server (`serializarIntento` strips
  `clave`). `apps/web` has `/examenes` (RLS-scoped direct-Supabase list of
  assigned, currently-open exams) and `/examenes/[id]` (client component:
  timer, question navigator, answer selection, results screen with
  per-competency level 1–4 breakdown). Verified end to end in a real browser
  with Sara's seeded account: 6-question exam, one deliberately wrong
  answer, correct 417/500 global score and correct per-competency levels;
  idempotent finalize and cross-student ownership rejection (404) verified
  earlier via curl. Two bugs found and fixed this slice: the `service_role`
  GRANT was missing (migration 000005 covered `authenticated`/`anon` but not
  `service_role` — first real Nest endpoint hit `permission denied for table
  examenes` until migration 000009 added it) and `seed_icfes.sql`'s first
  draft used non-RFC4122 UUIDs (`...-0000000000a1`) that Postgres accepts
  but `class-validator`'s `@IsUUID()` correctly rejects. Still missing before
  this counts as Phase 2-complete: exam builder UI (docente-authored exams),
  offline answer buffering (mandatory per the decision below, not yet
  built), `intento.expirar` background job, and the results/histogram view
  for teachers.
- [x] **Asignaciones + entregas + calificación** (text and file
  submissions both work now): new `apps/api/src/asignaciones` module owns
  every domain write per
  ADR-0008 (create, publish-on-create, submit, grade), while listing an
  already-published asignación and a student's own entrega/calificación
  stay direct-Supabase reads against the existing `entregas_propias`/
  `calificacion_visible` policies plus a new `asignaciones_visibles` policy
  (migration 000011). `AsignacionesService.crear` resolves the current
  `periodo_id` server-side from the curso's `anio_id` rather than asking the
  teacher to pick one. `/panel/actividades` (create form + list) and
  `/panel/actividades/[id]` (grading view, one input per entrega) on the
  docente side; `/actividades` (list with per-student estado badge) and
  `/actividades/[id]` (instructions + submit form, or the grade once
  published) on the estudiante side. Verified end to end with real
  Wilmer/Sara accounts: created a taller via the actual UI form, graded
  Sara's submission (4.5/5.0), and confirmed — via the *exact* RLS-scoped
  query the student pages run — that Sara can read both her
  `calificaciones` row and the resulting `notas_definitivas` row. That
  second row is the schema's `trg_calificacion_definitiva` trigger firing
  automatically on the `calificaciones` insert — Nest never computes the
  weighted average itself, it only writes the raw grade (see the new
  `ponderaciones` seed rows added so the trigger has weights to work with).
  **File upload** (`entrega_archivos`) went through Nest per ADR-0006's
  explicit exception for anything "requiring content inspection before
  acceptance" — files are proxied through the API (`multer`, 15 MB limit),
  not a client-direct pre-signed upload, because content has to be sniffed
  from actual bytes (`file-type`, magic numbers) before it's accepted, never
  trusting the client-declared MIME type. Verified with a fake `.exe`
  renamed and declared as `application/pdf`: rejected, because its real
  magic bytes don't match anything on the allow-list. Storage paths use
  only a generated UUID (`entregas/{asignacionId}/{estudianteId}/{uuid}`),
  never the user-supplied filename, per ADR-0006's path-traversal note.
  Downloads are short-lived signed URLs issued by
  `GET /entrega-archivos/:id/url` after an ownership check (the owning
  student, or the docente teaching that curso) — confirmed a second
  student gets 404 trying another student's file id. Still open: a full
  teacher planilla grid (today's grading view is per-assignment, not
  all-students × all-assignments).
- [ ] Recursos, apuntes (file resources attached to a clase/curso).
- [ ] Teacher panel v0 (KPIs, submissions to grade) beyond the per-assignment
  grading view above.
- [ ] CI: `.github/workflows/ci.yml` is written (build + lint on every push
  to `main` and every PR) but not yet pushed — the `gh` CLI's stored token
  lacks the `workflow` scope GitHub requires to accept a push that touches
  `.github/workflows/*`, and re-authorizing needs the user to complete a
  device-flow login in their own browser. See [TD-007](TECHNICAL_DEBT.md).

## Phase 2 — ICFES (est. 3–4 weeks)

- Question bank (`preguntas`, `competencias`) with CSV import, tagged by
  competency/difficulty, usage/accuracy stats.
- Exam builder (`examenes`, `examen_preguntas`): config (minutes, shuffle
  flags, show-key-at-end, timer visibility, retake) → question editor (click
  an option to mark it the key) → structure grid (50-question layout) →
  publish to groups with open/close dates.
- [x] Exam-taking client core (pulled into Phase 1 above, see that entry for
  details): server-computed remaining time (never the browser clock),
  idempotent incremental answer saving (`PATCH /intentos/:id/respuestas`),
  finalize-with-scoring. Still open from this bullet: the 3-column layout
  with a reading-context panel (current UI is a simpler single-question +
  navigator layout, no shared-passage grouping since no seed question uses
  one yet) and training-mode immediate feedback.
- **Offline resilience is mandatory in this phase, not optional** (decided
  2026-09-07 — the computer lab's internet is unreliable): the exam client
  buffers answers in IndexedDB and resends on reconnect against the same
  idempotent `PATCH`, rather than assuming a live connection for the whole
  attempt. Build this into the client's initial design, not as a follow-up —
  see [TD-011](TECHNICAL_DEBT.md).
- `intento.expirar` pg-boss job (every minute) closing timed-out attempts.
- Results: global score, competency bars with level 1–4, group histogram,
  "what to review first" recommendations.

## Phase 3 — Labs de código (est. 4–6 weeks)

- Self-hosted Judge0 + pg-boss `lab.calificar` queue per
  [ADR-0005](docs/adr/0005-programming-sandbox-architecture.md) (amended).
- Monaco-based code editor (syntax highlighting matching the prototype's
  token colors, run/reset, console, test panel).
- Lab builder (docente): language selector (JS/Python/SQL/HTML-CSS), starter/
  solución/pruebas tabs, test cases with visible/hidden flag and per-case
  points, hints, `POST /labs/:id/validar` (block publishing a lab whose own
  solution doesn't pass its own tests).
- Student lab view: instructions + file tree + editor + console/tests/preview
  tabs, Realtime-driven verdict updates.
- Load-test Judge0 against the ~40-concurrent-submission target from
  ARCHITECTURE.md §12.3 before relying on it during a live class.

## Phase 4 — Ofimática y video (est. 3–4 weeks)

- Server-side verification of uploaded .xlsx (`exceljs`: formulas, ranges,
  pivot tables, charts), .docx (`mammoth`: styles, heading hierarchy, TOC),
  .pptx (OOXML: slide count, speaker notes, template) against rubric criteria
  — `entrega.verificar` pg-boss job, `GET /entregas/:id/verificacion`.
- SQL labs against an ephemeral `colegio_db` copy (transaction + `ROLLBACK`).
- Video: integrate the chosen provider ([ADR-0011](docs/adr/0011-video-hosting.md)),
  `video.transcodificar` job, playback tokens, timestamped notes.
- Gamification v1: streaks (`rachas`), XP (`xp_eventos`), badges (`insignias`),
  ranking — matching the profile/achievements screen in the prototype.

---

## Phase 5 — Academic depth

Beyond the handoff's four phases: richer competency tracking
(`resultados_competencia` trend over periods, not just per-attempt), a
standalone Projects feature with milestones (not in the current schema —
needs its own migration if prioritized), and rubric reuse across assignment
types beyond what `rubricas`/`rubrica_criterios` already cover.

## Phase 6 — Analytics

Teacher analytics beyond `GET /analitica/:grupoId` (already scoped in the API
contract): trend lines over multiple periods, cross-course comparisons,
exportable reports for coordination.

## Phase 7 — Enterprise Security

MFA, OAuth/OIDC/SSO institucional (mentioned as optional in the login screen —
turn it on), WAF, malware/AV scanning on uploads, the data retention/deletion
tooling that Phase 0's minors'-data decision (ARCHITECTURE.md §12.1) requires,
an authorized penetration test, and a disaster-recovery drill (a Supabase
backup restore actually exercised, not just assumed to work).

## Phase 8 — AI

AI Tutor, question/exercise generation, programming assistant — as a separate
service the core calls into, never coupled directly into `apps/api`'s domain
modules.

---

## Definition of Ready

A feature does not start implementation until these are known:

- Problem it solves, target user, objective
- Requirements and acceptance criteria
- Dependencies and risks
- Security implications and data involved

## Definition of Done

- [ ] Works end to end for the golden path
- [ ] Input validation and error handling in place
- [ ] Authorization enforced server-side: Nest role + ownership check for every
      write; for direct-Supabase reads, the RLS policy reviewed against
      [ADR-0008](docs/adr/0008-hybrid-data-access.md)
- [ ] Automated tests added (unit at minimum; integration/E2E where the feature
      warrants it)
- [ ] Loading, empty, and error states implemented in the UI
- [ ] Responsive (desktop/tablet/mobile)
- [ ] Basic accessibility (keyboard nav, focus states, labels)
- [ ] Documented (README/inline where genuinely non-obvious, ADR if it's an
      architectural decision)
- [ ] Does not break existing functionality
- [ ] Reviewed against [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)
- [ ] Ready for staging deployment

## Not started until explicitly prioritized

Multi-tenancy (institution isolation), marketplace, mobile app — the data model
is kept compatible with these but none are scheduled work.
