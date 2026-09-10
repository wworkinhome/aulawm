# AulaWM — Technical Debt Register

Every entry: description, impact, risk, priority, planned resolution. Add an
entry whenever a shortcut is knowingly taken — the point is visibility, not
guilt. Remove an entry only once it's actually resolved (move it to a "Resolved"
section with the date, don't just delete it).

## Open

### TD-001: No MFA at launch
- **Description**: Authentication supports password only; TOTP/MFA is designed
  for (credential model supports multiple credential types) but not implemented.
- **Impact**: Account takeover via credential theft has no second factor to stop it.
- **Risk**: Medium (SUPER_ADMIN and DOCENTE accounts are the highest-value
  targets — they can alter grades and content).
- **Priority**: High for admin/teacher roles specifically; scheduled Phase 8.
- **Mitigation until resolved**: strong password hashing, login rate
  limiting/lockout, session visibility/revocation (see [SECURITY.md §2](SECURITY.md#2-authentication)).

### TD-002: No malware/AV scanning on uploads
- **Description**: File uploads are validated for type/size/zip-bomb ratio but
  not scanned for malware content.
- **Impact**: A malicious document could be uploaded and later downloaded by
  another user.
- **Risk**: Medium — mitigated somewhat by files being served via signed URLs
  to authorized users only, not executed server-side.
- **Priority**: Medium; scheduled Phase 8, sooner if resource/file sharing usage
  grows quickly.

### TD-003: Sandbox isolation baseline is container-level, not gVisor/Firecracker
- **Description**: MVP programming sandbox (Phase 4) uses hardened containers
  (dropped capabilities, no network, read-only rootfs) rather than a stronger
  VM-level isolation boundary.
- **Impact**: Container escape vulnerabilities, while rare, are a real risk
  class for arbitrary code execution products.
- **Risk**: High in principle, mitigated by defense-in-depth (no network, no DB
  access from the worker's execution context, ephemeral filesystem, narrow
  worker DB credentials).
- **Priority**: Revisit before opening programming labs to a large/external
  user base. See [ADR-0005](docs/adr/0005-programming-sandbox-architecture.md).

### TD-004: No WAF / SIEM integration
- **Description**: No web application firewall or centralized security event
  correlation yet.
- **Impact**: Slower detection of coordinated attack patterns (scraping,
  distributed brute force).
- **Risk**: Low at current scale; grows with user count and public exposure.
- **Priority**: Phase 8.

### TD-005: No formal data retention / deletion / export tooling
- **Description**: Privacy principle of minimization is followed in what's
  collected, but there's no user-facing "export my data" or "delete my account
  and data" flow yet.
- **Impact**: Cannot fully satisfy a user or institutional data-rights request
  today.
- **Risk**: Low until the platform has real end users beyond initial testing;
  becomes a hard requirement before any institutional/multi-tenant rollout.
- **Priority**: Phase 8, earlier if a specific institution requires it sooner.

### TD-006: No disaster-recovery drill performed
- **Description**: Backups are expected from the managed Postgres provider
  (Supabase), but a restore has not been exercised.
- **Impact**: Unknown actual RPO/RTO — a backup that's never been restored is
  not a validated backup (Section 91 of the brief).
- **Risk**: Medium — low probability, high impact if a real incident occurs
  first.
- **Priority**: Before any production launch with real student/grade data.

### TD-007: CI workflow written but not yet pushed
- **Description**: `.github/workflows/ci.yml` (build + lint on every push
  to `main` and every PR, confirmed to need no secrets) exists locally but
  git rejected the push: `refusing to allow an OAuth App to create or
  update workflow .github/workflows/ci.yml without workflow scope`. The
  `gh` CLI's stored token only has `gist`, `read:org`, `repo` — adding
  `workflow` requires `gh auth refresh -s workflow`, which is a device-flow
  login only the user can complete (open github.com/login/device, enter the
  code, approve) — same category of "needs a human in the loop" as the
  earlier GitHub CLI Authorize-button issue in
  [ADR-0013](docs/adr/0013-render-over-railway.md).
- **Impact**: No automated build/lint gate on PRs yet; still fully manual.
- **Risk**: Low — the workflow file is correct and tested locally
  (`pnpm build`/`pnpm lint` both pass), just not live on GitHub.
- **Priority**: Push it the next time the user completes the `gh auth
  refresh -s workflow` device-flow login.

### TD-008: Minors' data protection compliance not implemented
- **Description**: The design handoff's schema already includes a
  `consentimientos` table (guardian name/document/relationship,
  granted/revoked timestamps), but there is no published data-treatment
  policy text, no enforced "no content until consent is on file" gate, and no
  defined data retention/deletion rule (e.g., what happens to a student's data
  at graduation).
- **Impact**: Legal exposure under Ley 1581 de 2012 / Decreto 1377 de 2013
  (Colombia) if students under 18 are onboarded before this is resolved.
- **Risk**: High — this is a legal compliance gap, not just a technical one.
- **Priority**: Must be resolved (policy text + retention rule) before Phase
  1's registration flow goes live with real students. **Decided 2026-09-07**:
  resolve this before enabling real registration; development/testing with
  fictitious accounts is not blocked. See
  [ARCHITECTURE.md §12.1](ARCHITECTURE.md#12-decisions-on-the-handoffs-blocking-questions).

### TD-010: Judge0 concurrency not load-tested
- **Description**: The sandbox (Judge0, [ADR-0005](docs/adr/0005-programming-sandbox-architecture.md))
  has not been sized or load-tested against real classroom concurrency
  (~40 students submitting within the same few seconds).
- **Impact**: A live class could see submissions queue up or time out if the
  self-hosted Judge0 instance is undersized.
- **Risk**: Medium — a bad first impression in a live class, not a security
  issue.
- **Priority**: Before Phase 3 (Labs de código) is used in an actual class,
  not just before it ships code-complete.

### TD-011: Offline resilience required in the exam-taking client, not yet built
- **Description**: **Decided 2026-09-07**: the computer lab's internet is
  unreliable, so the ICFES simulator client (Phase 2) must be built from the
  start with IndexedDB answer buffering and resend-on-reconnect — not a
  retrofit. Not yet implemented (Phase 2 hasn't started).
- **Impact**: A dropped connection mid-simulacro could lose answers or confuse
  the attempt's timing if this isn't in the initial Phase 2 design.
- **Risk**: Medium — known and decided, just not yet built.
- **Priority**: Build into Phase 2's exam client from day one; see
  [ROADMAP.md Phase 2](ROADMAP.md#phase-2--icfes-est-34-weeks).

### TD-012: Video hosting provider (Mux vs. Cloudflare Stream) not yet chosen
- **Description**: **Decided 2026-09-07**: Phase 1 launches with unlisted
  YouTube links, no owned video pipeline. [ADR-0011](docs/adr/0011-video-hosting.md)
  leaves the Mux vs. Cloudflare Stream choice open pending a cost/usage
  decision before Phase 4.
- **Impact**: None for Phase 1–3. Phase 4 (Ofimática y video) scope depends on
  this being resolved.
- **Risk**: Low — deferrable, not blocking near-term work.
- **Priority**: Resolve before Phase 4 starts.

## Resolved

### TD-009 (resolved 2026-09-07): Gradebook source-of-truth vs. institutional academic system
- **Resolution**: AulaWM's `notas_definitivas` is the sole source of truth for
  grades. No sync to an external academic system, no export-format
  requirement for MVP. Revisit only if an institutional system is introduced
  later. See [ARCHITECTURE.md §12.2](ARCHITECTURE.md#12-decisions-on-the-handoffs-blocking-questions).

## Open (continued)

### TD-013: `github.com/wworkinhome/aulawm` is public, not private
- **Description**: Made public on 2026-09-08 to unblock Render's deploy —
  Render's account-level GitHub connection could not fetch the repo while
  private (`POST /v1/services` returned "invalid or unfetchable" despite the
  Render GitHub App showing "All repositories" access on GitHub's side). See
  [ADR-0013](docs/adr/0013-render-over-railway.md) for the full investigation.
- **Impact**: Source code (not secrets — no credentials are committed) is
  publicly readable. For a product that will hold student data, this should
  not be the permanent state.
- **Risk**: Low today (no student data in the repo, no secrets), but grows
  as real content/business logic accumulates.
- **Priority**: Revisit before Phase 1 sign-off — either fix Render's
  GitHub App connection properly (may require uninstalling and reinstalling
  the App, or contacting Render support) and revert to private, or move the
  API deploy to a platform whose account is cleanly linked to this GitHub
  account from the start.

### TD-014: Render free plan cold-starts; Railway plan issue unresolved
- **Description**: `aulawm-api` runs on Render's free tier, which spins down
  after inactivity (cold start on next request). Railway was the originally
  planned platform but its free-tier project-provision limit blocked
  creation, and the limit persisted even after the user upgraded their plan
  (likely a propagation delay, not confirmed resolved).
- **Impact**: Noticeable latency on the first request after idle periods;
  not acceptable once real users depend on this.
- **Risk**: Low now (development/testing only), real before any live usage.
- **Priority**: Revisit before Phase 1 sign-off — either confirm Railway's
  plan issue is resolved and migrate, or upgrade Render to a paid plan.

### TD-015: Most tables still have RLS enabled but no policy at all
- **Description**: Only the tables needed so far — the login vertical slice
  (`perfiles`, `roles_usuario`, `matriculas`, `grupos`), what the initial
  migration already covered (`apuntes`, `progreso_clase`, `intentos`, etc.),
  `cursos`/`modulos`/`clases` (added 2026-09-08 building `/panel` and
  the course list/detail pages), and `examenes`/`examen_asignaciones`
  (added 2026-09-08 for the `/examenes` list page, metadata-only —
  `preguntas`/`resultados_competencia` deliberately still have no
  direct-Supabase policy, since those are only ever read through
  `apps/api`'s `ExamenesService` with the service-role key, never via
  PostgREST) — have RLS policies. Everything else with
  `enable row level security` but no policy — `recursos`,
  `entrega_archivos`, `insignias_usuario`,
  `xp_eventos`, `rachas`, `consentimientos` — denies all direct-Supabase
  access by default (safe failure mode, per
  [ADR-0008](docs/adr/0008-hybrid-data-access.md)'s "decide deliberately per
  table" rule), which also means **no one can read them directly yet, not
  even their owner**.
- **Impact**: Building any Phase 1/2 feature against these tables (course
  listing, module/lesson content, etc.) will hit the same "permission
  denied" surprise found today with `perfiles`/`matriculas` until each
  table's RLS policy is written and tested with a real logged-in request —
  not just reasoned about.
- **Risk**: Low (fails closed, not open) but will block feature work
  repeatedly if not anticipated.
- **Priority**: Write the RLS policy for each table as part of the PR that
  first needs to read it — per the [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)
  "New or changed table" section — rather than batching it later.

## Resolved (continued)

### TD (resolved 2026-09-08): Tables lacked base GRANTs to `authenticated`/`anon`
- **Resolution**: Found testing the real login end to end — every table had
  RLS enabled but no base `GRANT` to the `authenticated`/`anon` Postgres
  roles, so PostgREST returned `permission denied for table X` regardless of
  how permissive the RLS policy was (RLS restricts an access the role
  already has; it doesn't substitute for the grant). Fixed globally via
  `supabase/migrations/20260101000005_grant_authenticated_table_access.sql`
  (`grant ... on all tables in schema public` + `alter default privileges`
  so future tables get it automatically). See
  [ADR-0008](docs/adr/0008-hybrid-data-access.md) for the full explanation.


### TD (resolved 2026-09-08): `service_role` was missing the same base GRANT
- **Description**: TD-015's fix (migration 000005) granted table access to
  `authenticated`/`anon` but not `service_role` — an oversight, since
  `apps/api`'s admin client (used for anything that must bypass RLS, per
  ADR-0008) authenticates as `service_role`. Not caught until the first real
  Nest domain endpoint (`GET /examenes/:id/intento`) was tested against
  production Supabase and returned a generic "Examen no encontrado" that
  was actually a swallowed `permission denied for table examenes`.
- **Resolution**: `supabase/migrations/20260101000009_grant_service_role.sql`
  applies the same grant to `service_role`. Added to
  [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md): when granting table access,
  grant to all three roles (`authenticated`, `anon`, `service_role`) that
  might touch the table, not just the ones the current feature happens to use.

### TD (resolved 2026-09-08): Seed UUIDs with an invalid version nibble passed Postgres but failed `@IsUUID()`
- **Description**: `supabase/seed_icfes.sql`'s first draft used
  human-readable fake UUIDs (`00000000-0000-0000-0000-0000000000a1`) — valid
  as far as Postgres's `uuid` type cares, but the version nibble (must be
  1–5) was `0`, which `class-validator`'s `@IsUUID()` correctly rejects. The
  DTO validation error only surfaced once the real Nest endpoint was called
  with those ids — SQL-level testing never would have caught it.
- **Resolution**: Regenerated with proper v4-format ids
  (`10000000-0000-4000-8000-00000000000X` — version nibble `4`, variant
  nibble `8`). Worth remembering for any future seed data referenced by a
  DTO with `@IsUUID()`: use real UUIDs (`gen_random_uuid()` or a proper v4
  generator), not hand-typed placeholders, even for throwaway seed rows.
