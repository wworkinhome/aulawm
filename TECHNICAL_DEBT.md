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

### TD-007: No CI/CD pipeline configured yet
- **Description**: No git host/repository exists yet for this project (local
  directory only at Phase 0); no lint/test/build pipeline is running.
- **Impact**: No automated quality gate yet; every check is manual today.
- **Risk**: Low right now (no code exists), rising fast as Phase 1 begins.
- **Priority**: Must land at the start of Phase 1, alongside the first
  scaffolding commit.

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
