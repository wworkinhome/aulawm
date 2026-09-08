# ADR-0002: Authentication strategy

> **Superseded by [ADR-0009](0009-supabase-auth.md).** Kept for the record of
> why Nest-owned auth was the first instinct, and because ADR-0009's
> alternatives analysis builds directly on this one. Do not implement against
> this ADR — implement against ADR-0009 (Supabase Auth).

## Context

AulaWM needs authentication that is secure by default, supports three roles at
launch, and leaves room for MFA, OAuth/OIDC, and passkeys without a rework
(Section 67 of the brief).

## Decision

Implement authentication in the NestJS backend directly (not delegated whole-sale
to a third-party auth-as-a-service), using:

- Password hashing with argon2id (or bcrypt if tooling constraints require it).
- Short-lived JWT access tokens + longer-lived, rotating refresh tokens stored
  server-side (a `Session`/`RefreshToken` table), enabling revocation and
  "sign out all devices."
- Refresh token rotation with reuse detection: a refresh token can be used
  exactly once; reuse of an already-rotated token revokes the whole token family
  (signal of theft).
- Rate limiting + lockout/backoff on login and password-reset endpoints.
- `Role` as a claim embedded in the access token, but always re-validated against
  the database on sensitive operations rather than treated as eternally true for
  the token's lifetime (supports role changes taking effect promptly).

Deferred, but designed for: MFA (TOTP), OAuth/OIDC (Google/Microsoft), and
WebAuthn/passkeys — the `User`/credential model does not assume password is the
only credential type (a user can have zero or more credential records).

## Alternatives considered

- **Fully outsource to Supabase Auth**: considered, since Supabase already hosts
  Postgres/Storage. Rejected for the MVP core because the brief's role model
  (RBAC now, ABAC-ready ownership checks tied deeply into NestJS guards) is
  easier to keep centrally enforced when the backend owns the auth flow end to
  end. Supabase Auth remains an option to revisit if OAuth/social login becomes a
  priority sooner than planned — it would sit *behind* the same NestJS
  authorization layer, not replace it.
- **Stateless-only JWT (no server-side session record)**: rejected — it cannot
  support "view my active sessions" / "sign out everywhere," which the brief
  requires (Section 68).

## Consequences

- Backend owns the full credential lifecycle; more initial implementation work
  than delegating entirely to a hosted auth product.
- Session/device visibility and forced revocation are straightforward because
  sessions are tracked server-side.
- Adding MFA/OAuth later means adding new credential-verification paths into the
  same `auth` module, not restructuring the user/session model.
