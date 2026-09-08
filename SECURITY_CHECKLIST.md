# AulaWM — Security Checklist

A per-feature checklist derived from [SECURITY.md](SECURITY.md) and
[SECURITY_THREAT_MODEL.md](SECURITY_THREAT_MODEL.md). Copy the relevant section
into a PR description (or a feature's tracking issue) and check items off before
calling the feature done — this is the security half of the project's
[Definition of Done](ROADMAP.md#definition-of-done).

## New or changed table (RLS + Nest, per [ADR-0008](docs/adr/0008-hybrid-data-access.md))

- [ ] Decided deliberately: does this table get a student/teacher-readable RLS
      policy for direct Supabase reads, or is it Nest-only?
- [ ] If RLS-readable: policy matches "own rows / rows of groups taught /
      coordination sees all" — tested with a real non-owner account, not just
      reasoned about
- [ ] If the table has any column that must never reach a student (an answer
      key, a lab's solution/test file): confirmed no student-readable policy
      exposes that column, either by excluding the table from student RLS
      entirely or serving it through a Nest endpoint/view that strips it
- [ ] Domain writes to this table go through Nest (service-role key bypasses
      RLS) with an explicit ownership/business-rule check in code — RLS is
      never assumed to protect the write path

## Every endpoint

- [ ] Requires authentication unless explicitly and deliberately public
- [ ] Role check (`RolesGuard`) matches who should be able to call it
- [ ] Ownership/ABAC check if the resource has an owner (course, exam, submission…)
      — never authorized by ID possession alone
- [ ] Request body validated by a DTO in whitelist mode (unknown fields rejected)
- [ ] Response never includes fields the caller isn't authorized to see (e.g.
      correct answers during an active exam attempt, other students' data)
- [ ] List endpoints are paginated
- [ ] Rate limited appropriately for its sensitivity (login/upload/code-exec get
      the tightest limits)
- [ ] Errors go through the global exception filter (no stack trace, no SQL
      error, no internal path leaks; correlation ID present)
- [ ] Sensitive mutation (grade, role, exam publish, file access) emits an
      `AuditLog` entry

## File / upload features

- [ ] Server validates actual file content, not client-declared MIME/extension
- [ ] Size limit enforced
- [ ] Archive uploads checked for zip-bomb ratio before extraction (if extracted)
- [ ] Stored file renamed to a generated ID; original name kept as metadata only
- [ ] Private bucket + signed URL for anything not meant to be public
- [ ] Signed URL has a short expiration and is scoped to one object

## Grades / academic-record data

- [ ] Write path checks teacher owns the course/student relationship
- [ ] Write wrapped in a transaction with any dependent aggregate recalculation
- [ ] Previous value retained/audited on update
- [ ] Optimistic concurrency check to prevent silent overwrite from concurrent edits

## Exams / attempts

- [ ] Draft exams return 403/404 to students regardless of ID
- [ ] Correct answers never present in a response served during an active attempt
- [ ] Attempt count and timer enforced server-side, not just in the client UI
- [ ] Attempt ownership checked before returning/accepting answers

## Programming submissions

- [ ] Code never executes in the API or frontend process
- [ ] Job enqueued, executed by an isolated worker with no network access
- [ ] CPU/RAM/time/process limits enforced by the sandbox runtime
- [ ] Hidden test cases are never sent to or derivable by the client
- [ ] Per-user rate limit on submissions before enqueue

## Auth changes

- [ ] Passwords hashed with argon2id/bcrypt, never stored/logged in plaintext
- [ ] Refresh token rotation implemented; reuse triggers family revocation
- [ ] Login/reset endpoints rate-limited with backoff/lockout
- [ ] New/changed sessions are visible and revocable by the user

## Admin-only features

- [ ] Gated by `SUPER_ADMIN` role at both API guard and frontend routing
- [ ] Role/permission changes are never accepted as a field on a general
      "update my profile" endpoint
- [ ] Action is audit-logged with actor identity

## Before merge / deploy (project-wide gate)

- [ ] No secret committed (scan diff, not just `.env`-named files)
- [ ] `npm audit`/dependency scan has no new critical vulnerability
- [ ] Lint + typecheck pass
- [ ] Relevant unit/integration tests added and passing
- [ ] CORS origin allow-list unchanged or deliberately/reviewed if changed
