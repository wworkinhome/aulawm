# AulaWM — Security Threat Model

Initial threat model using STRIDE (Spoofing, Tampering, Repudiation, Information
disclosure, Denial of service, Elevation of privilege). Scope: the eight
highest-risk flows named in the brief. This is a living document — revisit it
whenever one of these flows changes materially, and add new sections as new
domains (forums, certificates, analytics) reach implementation.

Legend for mitigation status: **[Designed]** control is specified and will ship
with the feature · **[Deferred]** acknowledged gap, tracked in
[TECHNICAL_DEBT.md](TECHNICAL_DEBT.md).

---

## 1. Authentication

| Threat | STRIDE | Mitigation |
|---|---|---|
| Credential stuffing / brute force login | Spoofing | Rate limiting + progressive backoff + lockout on repeated failures **[Designed]** |
| Stolen refresh token reused after rotation | Spoofing, Elevation | Refresh token rotation with reuse detection → revoke token family **[Designed]** |
| Session fixation | Spoofing | New session/token issued on login, never reusing a pre-auth session id **[Designed]** |
| Password DB compromise | Information disclosure | argon2id/bcrypt hashing, never reversible storage **[Designed]** |
| No second factor | Elevation | MFA planned, not MVP **[Deferred]** |
| Replay of a captured JWT | Spoofing | Short-lived access tokens, TLS everywhere, refresh rotation limits blast radius **[Designed]** |

## 2. Grades (Gradebook)

| Threat | STRIDE | Mitigation |
|---|---|---|
| Student edits their own grade via API (IDOR) | Tampering, Elevation | Grade write endpoints require `DOCENTE`/`SUPER_ADMIN` role + ownership check that the teacher owns the course the grade belongs to **[Designed]** |
| Teacher modifies a grade for a course they don't teach | Elevation | Ownership check on every grade mutation, not just role check **[Designed]** |
| Silent/unattributed grade change | Repudiation | `GRADE_UPDATED` audit event with actor, timestamp, previous value **[Designed]** |
| Race condition double-submits conflicting grade updates | Tampering | DB transaction + optimistic concurrency (version/updatedAt check) on grade writes **[Designed]** |
| Grade data loss from partial write (grade saved, category total not recalculated) | Tampering (integrity) | Wrap grade + aggregate recalculation in a single DB transaction **[Designed]** |

## 3. Exams (incl. ICFES simulator)

| Threat | STRIDE | Mitigation |
|---|---|---|
| Student accesses another student's exam attempt/answers | Information disclosure | Ownership check: attempt must belong to requesting student **[Designed]** |
| Student fetches exam answer key before/during attempt | Information disclosure | Correct-answer fields excluded from any response served during an active attempt; served only after submission per exam config **[Designed]** |
| Student replays/resubmits an attempt to get extra tries | Tampering | Server-side attempt counter + status machine (`IN_PROGRESS`→`SUBMITTED`), not client-trusted **[Designed]** |
| Client-side timer manipulation to get extra time | Tampering | Server records `startedAt`; expiry enforced server-side on submit, not just UI countdown **[Designed]** |
| Question bank scraped via sequential ID enumeration | Information disclosure | Pagination + authorization scoping (only bank owner/enrolled-course questions returned); rate limiting **[Designed]** |
| Teacher publishes exam with unintended visibility (draft leaked) | Information disclosure | Explicit `DRAFT`/`PUBLISHED` state; unpublished exams return 403/404 to students regardless of ID **[Designed]** |

## 4. Programming Sandbox

| Threat | STRIDE | Mitigation |
|---|---|---|
| Malicious code accesses host filesystem/network | Elevation, Info disclosure | No network access in sandbox; ephemeral, isolated filesystem discarded post-run **[Designed]** |
| Resource exhaustion (fork bomb, infinite loop, memory hog) | Denial of service | CPU/RAM/process/time limits enforced by the sandbox runtime, not the application code **[Designed]** |
| Sandbox escape to host or other tenants' jobs | Elevation | Container hardening (dropped capabilities, read-only rootfs, seccomp) as MVP baseline; gVisor/Firecracker as documented upgrade path **[Designed]**/**[Deferred: hardened runtime]** |
| Hidden test cases exfiltrated by student code | Info disclosure | Hidden tests injected by the worker at execution time, never sent to the client or embedded in code the student can read **[Designed]** |
| Queue poisoning (flood with junk jobs) | Denial of service | Per-user submission rate limiting before a job is enqueued **[Designed]** |
| Worker process compromise affecting grading integrity | Tampering | Worker uses narrower DB credentials than the API (can only write to submission/result tables) **[Designed]** |

## 5. File Upload

| Threat | STRIDE | Mitigation |
|---|---|---|
| Malicious file disguised by extension/MIME (e.g. executable as `.pdf`) | Tampering | Server-side content sniffing, not trusting client-declared MIME/extension **[Designed]** |
| Zip bomb | Denial of service | Compression-ratio check before extraction; size caps **[Designed]** |
| Path traversal via crafted filename | Tampering | Files renamed to generated IDs on storage; original name kept only as metadata **[Designed]** |
| Malware distributed via course resources | Info disclosure / integrity | AV/malware scanning **[Deferred]**, tracked in TECHNICAL_DEBT |
| Oversized upload as DoS vector | Denial of service | Per-endpoint size limits enforced before body is fully buffered where possible **[Designed]** |

## 6. Storage (Supabase Storage)

| Threat | STRIDE | Mitigation |
|---|---|---|
| Guessable/shared URL exposes a private submission or paid video | Info disclosure | Private buckets by default; access only via short-lived signed URLs issued after an API authorization check **[Designed]** |
| Signed URL leaked/shared beyond intended viewer | Info disclosure | Short expiration windows; scoped to a single object **[Designed]** |
| Direct client upload bypassing API validation | Tampering | Uploads proxied/validated through the API before a storage write is authorized (or pre-signed upload URLs are scoped and validated server-side) **[Designed]** |

## 7. Admin (SUPER_ADMIN surface)

| Threat | STRIDE | Mitigation |
|---|---|---|
| Privilege escalation — a DOCENTE/ESTUDIANTE account elevates its own role | Elevation | Role changes only via a `SUPER_ADMIN`-gated endpoint; role field never accepted as user-writable on self-service profile updates **[Designed]** |
| Compromised admin account has unlogged, unlimited blast radius | Repudiation, Elevation | All admin actions audit-logged; MFA strongly recommended for admin accounts **[Designed audit]**/**[Deferred MFA]** |
| Admin panel exposed without stricter auth | Spoofing | Same auth stack, but admin routes additionally require `SUPER_ADMIN` role at both route-guard and UI-routing level **[Designed]** |

## 8. API (general surface)

| Threat | STRIDE | Mitigation |
|---|---|---|
| Mass assignment (client sends extra fields, e.g. `isAdmin: true`) | Tampering, Elevation | DTO whitelist validation rejects unknown fields **[Designed]** |
| Broken object-level authorization across any resource-by-ID endpoint | Info disclosure, Elevation | Ownership/ABAC check on every resource-scoped endpoint, no exceptions **[Designed]** |
| Unbounded list endpoints used for scraping/DoS | Denial of service | Mandatory pagination + rate limiting **[Designed]** |
| Verbose errors reveal stack/framework internals | Info disclosure | Global exception filter strips internals in production, returns correlation ID only **[Designed]** |
| CORS misconfiguration (`*`) allows cross-origin credentialed requests | Spoofing | Explicit origin allow-list **[Designed]** |

---

## Review cadence

Re-run this threat model (or the relevant section) whenever:

1. A new domain from Section 1–8 above changes its authorization logic.
2. The sandbox execution runtime changes (e.g. moving from container to
   gVisor/Firecracker).
3. Multi-tenancy is introduced (new cross-tenant isolation threats appear).
4. Before any Phase 8 (Enterprise Security) penetration test.
