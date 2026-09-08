# AulaWM — Security

Security is a first-order design constraint, not a hardening pass added later. This
document states the controls that apply to every feature built on AulaWM. It is a
living document — update it when a control changes, not just when a new one is
added.

## 1. Guiding principles

- **Zero Trust**: never trust a request because it came from an authenticated
  session alone. Every sensitive action re-verifies identity, session validity,
  role, permission, resource ownership, and resource state.
- **Least privilege**: a user, service account, or worker gets only the access it
  needs for its job — nothing broader "to be safe."
- **Defense in depth**: no single control is assumed sufficient. Authorization is
  checked at the API layer even though the frontend also hides unauthorized UI;
  the database enforces constraints even though the API also validates.
- **Priority order when principles conflict** (Section 143 of the brief):
  Security → Integrity → Correctness → Availability → Performance → Velocity.

## 2. Authentication

- Passwords hashed with a modern adaptive algorithm (argon2id or bcrypt with a
  sufficient cost factor) — never reversible encryption, never a custom scheme.
- Short-lived access tokens (JWT) + rotating refresh tokens. Refresh token reuse
  after rotation is treated as a compromise signal (revoke the token family).
- Rate limiting and lockout/backoff on login, password reset, and any endpoint
  that accepts a secret guess.
- Sessions are tracked server-side (device/session table) so a user can view
  active sessions and revoke them ("cerrar todas mis sesiones").
- MFA, OAuth/OIDC (Google/Microsoft), and passkeys/WebAuthn are **designed for**
  (auth module does not hardcode "password is the only credential type") but not
  required for MVP.

## 3. Authorization

- RBAC (`SUPER_ADMIN`, `DOCENTE`, `ESTUDIANTE`) enforced via a `RolesGuard` on
  every controller method that isn't explicitly public.
- Ownership/relationship checks (a teacher's own course, a student's own
  enrollment) are enforced in the service layer for every mutating and every
  sensitive read endpoint — never inferred from the caller simply supplying a
  valid ID. This is the primary defense against IDOR/BOLA.
- Role claims are only ever read from the server-issued, signed token. The
  frontend sending a `role` field in a request body changes nothing about what
  the backend permits.

## 4. Input handling & injection

- All backend input validated via DTOs (class-validator) with whitelist mode —
  unknown fields are rejected, not silently dropped or accepted (defends against
  mass assignment).
- All queries use parameter binding (via the query builder or the Supabase
  client) — never raw string-concatenated SQL or template interpolation of
  user input, including inside pg-boss job payloads that end up in a query.
- Output encoding / React's default escaping prevents stored/reflected XSS;
  any `dangerouslySetInnerHTML` usage requires sanitization (e.g. DOMPurify) and
  a documented reason.
- CSRF: cookie-based auth (if used for the web session) requires
  `SameSite`/CSRF tokens; bearer-token API calls from the SPA are inherently less
  CSRF-exposed but CORS must still be locked down (Section 9).

## 5. File & storage security

- Uploads are validated on the server by actual content (magic-byte/MIME
  sniffing), not the client-supplied `Content-Type` or filename extension alone.
- Files are renamed to a generated internal identifier on storage; the original
  filename is metadata, never a path component.
- Size limits enforced per upload type. Archive uploads (zip) are checked against
  zip-bomb ratios before extraction, if extraction is ever performed server-side.
- Private buckets by default. A student's submission or a paid course video is
  never reachable by guessing/crafting a URL — access requires a short-lived
  **signed URL** issued only after the API confirms the requester is authorized
  for that specific object.
- Malware/antivirus scanning of uploads is planned (Section 65 of the brief) —
  tracked in [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) until an MVP-appropriate
  scanner is selected.

## 6. API security

- Every endpoint: authentication check → authorization/ownership check → DTO
  validation → business logic. In that order.
- Rate limiting per IP, per user, and per endpoint class (login, code
  submission, uploads, public/anonymous endpoints get the tightest limits).
- Pagination required on any list endpoint that can grow unbounded.
- Request body size limits set explicitly (protects against large-payload DoS).
- `/api/v1` versioning from day one so breaking changes don't require a
  coordinated frontend/backend deploy later.

## 7. Secrets & configuration

- No secret ever committed to the repository (`.env` files gitignored,
  `.env.example` documents required keys with placeholder values only).
- Secrets are injected via platform environment variables in every environment;
  `AWS Secrets Manager` or an equivalent is the documented upgrade path if/when
  infrastructure moves to AWS.
- Service-role keys (e.g. Supabase service role) are used only in trusted
  backend/worker contexts, never shipped to the frontend bundle.

## 8. Transport & headers

- TLS everywhere (enforced by the hosting platform for MVP; HSTS enabled once a
  stable custom domain is in place).
- Security headers on every response: CSP (no `unsafe-eval` without a documented
  exception), `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy`.
- CORS: explicit allow-list of origins for the API. No `*` on any endpoint that
  reads or writes user data.

## 9. Error handling & logging

- Production error responses never include stack traces, raw SQL errors,
  internal file paths, or framework/version fingerprints.
- Every error response carries a `correlationId` that maps to a structured,
  detailed log entry server-side — support/debugging without leaking internals
  to the client.
- Structured (JSON) logs. Never log passwords, tokens, full card/ID numbers, or
  other secrets — log the *fact* of an action ("password changed") not the
  value.

## 10. Audit logging

A dedicated, append-only audit trail (`AuditLog` entity) records at minimum:

```
LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, PASSWORD_CHANGED, ROLE_CHANGED,
COURSE_CREATED, EXAM_CREATED, EXAM_PUBLISHED, GRADE_CREATED, GRADE_UPDATED,
FILE_UPLOADED, FILE_DOWNLOADED, SUBMISSION_CREATED, CODE_EXECUTED,
PERMISSION_DENIED, SUSPICIOUS_ACTIVITY, ACCOUNT_LOCKED
```

Grade changes in particular must be attributable (who, when, previous value) —
this is academic-record integrity, not just security hygiene.

## 11. Sandbox isolation (programming execution)

See [ARCHITECTURE.md §7](ARCHITECTURE.md#7-programming-sandbox--non-negotiable-boundary)
and [ADR-0005](docs/adr/0005-programming-sandbox-architecture.md). Restated here
because it is a security-critical boundary: student-submitted code is the one
input in this system that is *expected* to be adversarial some fraction of the
time (deliberately or by accident — infinite loops, fork bombs, network scanning
attempts). It must never run with access to the database, other students' data,
the internet, or the host filesystem beyond its ephemeral sandbox.

## 12. Privacy & data minimization

- Collect only data the feature needs. Academic integrity features (Section 122
  of the brief — attempt logs, time tracking) must stay within what's needed to
  detect misconduct, not become invasive surveillance.
- Data retention, deletion, and export capabilities are planned per
  [ROADMAP.md](ROADMAP.md) Phase 8, tracked as debt until built.

## 13. Dependency & supply chain

- Lockfiles committed. `npm audit`/Dependabot (or Renovate) enabled once the
  repository exists on a git host.
- New dependencies are justified, not added reflexively — fewer dependencies is
  a smaller attack surface.

## 14. What is explicitly deferred (tracked, not ignored)

See [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) for the live list. Known-deferred at
Phase 0: MFA, OAuth providers, WAF, SIEM integration, malware scanning,
penetration testing, full data retention/export tooling.

## Related documents

- [SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md)
- [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
