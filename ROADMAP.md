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
- [x] Port `sql/schema.sql` (all sections) as the first migration
  (`supabase/migrations/20260101000000_initial_schema.sql`). Not yet applied
  to a real Supabase project — no project exists yet — and the custom access
  token hook it depends on ([ADR-0009](docs/adr/0009-supabase-auth.md)) is
  not yet registered anywhere; both are needed before real login works.
- [ ] Auth: Supabase Auth email/password, registration → `matriculas.estado =
  'pendiente'` → teacher/coordination approval flow, password reset.
- [x] `JwtSupabaseGuard` + `RolesGuard` + `@CurrentUser()`/`@Public()`/`@Roles()`
  decorators (`apps/api/src/auth/`) — verified end to end with signed test
  JWTs (public route, authenticated route, role-gated route, invalid-token
  rejection all behave correctly). Still needed: the ownership-check half of
  the pattern (a teacher endpoint verifying the resource belongs to a group
  they teach, not just their role) once a real resource module exists to
  demonstrate it on.
- [x] Design System v0 foundation: `@aulawm/tokens` wired into
  `apps/web/src/app/globals.css` via Tailwind v4's `@theme inline`, fonts
  self-hosted via `next/font/google` (Archivo, Azeret Mono), verified
  rendering correctly in-browser. Component library itself (Button, Input,
  Card, Chip, Switch, Badge, Modal, Toast, Skeleton, Empty/Error states) not
  yet built.
- [ ] App shell: top bar, left rail (16 nav items), Alumno/Docente switch — per
  the prototype's shell spec.
- [ ] Cursos, módulos, clases (video/lectura/lab/quiz), recursos, apuntes,
  progreso_clase.
- [ ] Asignaciones + entregas (file submission via `POST /storage/url-subida` +
  `POST /asignaciones/:id/entregas`), teacher review/feedback.
- [ ] Gradebook: `ponderaciones`, `calificaciones`, `notas_definitivas` (trigger-
  recalculated per the schema), planilla UI with sticky first column.
- [ ] Teacher panel v0 (KPIs, submissions to grade).
- [ ] CI: lint, typecheck, unit tests on every PR (no git host/remote yet to
  attach CI to — see [TD-007](TECHNICAL_DEBT.md)).

## Phase 2 — ICFES (est. 3–4 weeks)

- Question bank (`preguntas`, `competencias`) with CSV import, tagged by
  competency/difficulty, usage/accuracy stats.
- Exam builder (`examenes`, `examen_preguntas`): config (minutes, shuffle
  flags, show-key-at-end, timer visibility, retake) → question editor (click
  an option to mark it the key) → structure grid (50-question layout) →
  publish to groups with open/close dates.
- Exam-taking client: 3-column layout (reading context / question / 50-cell
  navigator), server-computed remaining time
  (`intentos.inicio`, never the browser clock), idempotent incremental answer
  saving (`PATCH /intentos/:id/respuestas`), training-mode immediate feedback.
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
