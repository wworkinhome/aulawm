# ADR-0006: File storage strategy

## Context

AulaWM stores videos, PDFs, Office documents, images, code, and student
submissions (Sections 5, 27, 29 of the brief). Some of this content is meant to
be broadly viewable by enrolled students (a lesson video); some is private
between one student and their teacher (a submission); none of it should ever be
reachable by a guessed or shared URL alone.

## Decision

- All storage goes through Supabase Storage (see
  [ADR-0004](0004-supabase-infrastructure.md)), behind a backend storage
  adapter — application code calls `upload()`, `getSignedUrl()`, `delete()`, not
  the Supabase SDK directly, so the provider can change later without touching
  every feature.
- **Buckets are private by default.** There is no bucket a client can read from
  or write to directly with an anonymous or long-lived public key.
- Every read/download goes through the API, which:
  1. Authenticates and authorizes the request against the specific resource
     (does this user have a right to this file — enrollment, ownership,
     teacher-of-course, etc.).
  2. Issues a short-lived signed URL scoped to that one object.
  3. Logs a `FILE_DOWNLOADED` audit event for sensitive categories (submissions,
     grade-related attachments).
- Every upload is validated server-side before being accepted into storage:
  actual content/MIME sniffing (not client-declared type), size limits, and
  zip-bomb ratio checks for archives (see [SECURITY.md §5](../../SECURITY.md#5-file--storage-security)).
- Uploaded files are renamed to a generated internal identifier; the
  user-supplied filename is retained only as metadata, never used as or
  concatenated into a storage path (defends against path traversal).

## Alternatives considered

- **Public buckets for "non-sensitive" content (e.g. course thumbnails)**:
  allowed narrowly for content that is genuinely meant to be public (marketing
  images, published course cover art) — evaluated per bucket, not a blanket
  policy. Student work, submissions, and any paid/gated video content are never
  public.
- **Direct client-to-Supabase uploads using scoped, pre-signed upload URLs**
  (skipping proxying the file bytes through the NestJS API): acceptable
  optimization for large files (e.g. videos) *once* the API has first validated
  the request and issued a narrowly-scoped upload URL — the authorization
  decision still happens in the API, only the byte transfer is offloaded. Not
  used for anything requiring content inspection before acceptance (e.g. small
  document submissions) in the MVP, to keep validation simple.

## Consequences

- No feature may reach for a public bucket or a permanent public URL as a
  shortcut — that shortcut is exactly what Section 66 of the brief forbids
  ("Un usuario NO debe acceder a un archivo solamente porque conoce la URL").
- Large video uploads/downloads will need the pre-signed direct-transfer path
  for acceptable performance; this is planned, not deferred indefinitely,
  because course videos are core content (tracked for Phase 2 in
  [ROADMAP.md](../../ROADMAP.md)).
- Malware/AV scanning of uploaded files remains a tracked gap (see
  [TECHNICAL_DEBT.md](../../TECHNICAL_DEBT.md)) until an MVP-appropriate scanner
  is integrated into the upload validation step.
