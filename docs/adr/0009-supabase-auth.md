# ADR-0009: Use Supabase Auth (supersedes ADR-0002)

## Status

**Supersedes [ADR-0002](0002-authentication-strategy.md).** ADR-0002 proposed
NestJS own the full credential lifecycle. The design handoff found during Phase
0 (`LMS Wilmer Moqsuera/design_handoff_aulawm/`) already made a different,
well-justified choice for this exact product, and this ADR adopts it instead.

## Context

ADR-0002 chose NestJS-owned auth mainly to keep RBAC/ABAC centrally enforced.
The handoff shows that concern is addressable a different way: Supabase Auth
issues the JWT, and a **custom access token hook** embeds the user's roles and
taught/enrolled groups directly into the token's claims, so both RLS policies
(evaluated in Postgres) and NestJS's `RolesGuard` read the *same* claims from
the *same* token — there is no dual source of truth for "what can this user
do" between two separately-built auth systems.

## Decision

- **Supabase Auth** (email/password now; institutional SSO is a config change,
  not a rebuild) issues and verifies credentials, handles password reset
  (`resetPasswordForEmail`, 30-minute link, matching the prototype's copy), and
  issues the JWT.
- A **custom access token hook** (`public.custom_access_token_hook`, see
  `supabase/migrations/20260101000001_custom_access_token_hook.sql`, registered
  under Authentication > Hooks in the dashboard) adds `app_metadata.roles`
  (`estudiante` | `docente` | `coordinacion`) and the user's group associations
  to the JWT.
- NestJS verifies the JWT signature (`JwtSupabaseGuard`) against the project's
  **JWKS** (`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, via `jose`'s
  `createRemoteJWKSet`) and builds `req.user = { sub, roles, grupos }` from its
  claims — it does not re-derive roles from a separate Nest-owned table on
  every request. **Confirmed against the real `aulawm` project (created
  2026-09-07): new Supabase projects default to asymmetric "JWT Signing Keys"
  (ECC P-256), not the legacy shared HS256 secret** — the dashboard's own
  "Legacy JWT Secret" tab says outright "Legacy JWT secret has been migrated to
  new JWT Signing Keys" and steers toward the new key model. JWKS verification
  needs no shared secret on the API side at all, which is strictly better for
  this ADR's own goals (fewer secrets to protect) than the HS256 path
  originally assumed here.
- Postgres RLS policies read the same roles via the `auth_roles()` /
  `es_docente()` SQL functions defined in `sql/schema.sql`, operating on
  `auth.jwt()` — again, the same claims, no duplication.
- New student registration is created in `pendiente` state
  (`matriculas.estado = 'pendiente'`) until a teacher or coordination approves
  and assigns a group — this is the control that stops "anyone with the
  institutional email domain" from landing in an arbitrary group, and it lives
  in application/domain logic, not in Supabase Auth itself.
- MFA, OAuth/OIDC providers, and passkeys remain deferred (unchanged from
  ADR-0002) — Supabase Auth supports adding these later as configuration.

## Alternatives considered

(Carried over from ADR-0002, re-evaluated against the handoff)

- **Nest-owned auth (ADR-0002's original choice)**: rejected on reflection —
  it would mean building and maintaining password hashing, reset flows, and
  session/refresh-token rotation by hand for no benefit over Supabase Auth,
  while *also* needing to keep a separate roles table in sync with whatever
  Nest issues in its own JWT so that RLS (which must read `auth.jwt()`, a
  Supabase Auth concept) can see the same roles. That synchronization problem
  is exactly the kind of dual-source-of-truth bug this project should avoid.
- **Fully client-side trust of Supabase Auth with no Nest involvement**:
  rejected, unchanged from ADR-0002/ARCHITECTURE.md — Nest still independently
  enforces ownership/business rules on every write; Supabase Auth is a
  credential and claims issuer, not the authorization system.

## Consequences

- `packages/db` migrations must include the custom access token hook function
  and its registration with Supabase Auth as part of Phase 1 setup — without
  it, `req.user.roles` and every RLS policy relying on `auth_roles()` are
  empty and everything silently fails closed (deny-by-default, which is the
  safe failure mode, but must be caught in Phase 1 testing, not discovered
  later).
- Role changes take effect on next token refresh, not instantly — acceptable
  for this product's scale; document the refresh interval so support requests
  ("I was just approved but still can't see my group") have a known answer.
- Removes an entire credential-lifecycle codebase (password hashing, reset
  token generation/expiry, session table) from AulaWM's own responsibility —
  net reduction in security surface Nest has to get right on its own.
