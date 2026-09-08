# ADR-0011: Mux or Cloudflare Stream for video, not Supabase Storage

## Context

Course lessons include video (Section 26 of the original brief: professional
player with chapters, speed, quality, timestamped notes). Supabase Storage can
hold a video file, but it does not transcode to adaptive bitrate (HLS/DASH) or
serve a player-ready stream — it's a plain object store.

## Decision

Use **Mux** or **Cloudflare Stream** for anything that is a lesson video:

- Teacher uploads a video → `video.transcodificar` job (pg-boss, see
  [ADR-0010](0010-pgboss-queue.md)) creates the asset on the provider, and
  `clases.video_asset_id` stores the returned asset id (not a Supabase Storage
  path).
- Playback issues a short-TTL **playback token** scoped to that asset and that
  viewer's authorization (per `GET /clases/:id` in the API contract) — not a
  permanent public playback URL.
- Supabase Storage remains the store for everything that isn't a
  transcoded/streamed video: documents, images, submissions, avatars.

**Decided 2026-09-07** ([ARCHITECTURE.md §12](../../ARCHITECTURE.md#12-decisions-on-the-handoffs-blocking-questions)):
Phase 1 launches with unlisted YouTube links, deferring the Mux vs. Cloudflare
Stream choice (both bill per minute encoded and per minute watched) until
before Phase 4. Either provider satisfies the same integration shape
(`video_asset_id` + short-lived playback token), so the choice does not block
Phase 1/2/3 scaffolding.

## Alternatives considered

- **Supabase Storage + a client-side video player playing the raw file
  directly**: rejected — no adaptive bitrate (poor experience on the school's
  likely-inconsistent internet, which the handoff separately flags as a
  concern), no chapter/thumbnail support, and every playback would need its own
  signed URL issuance rather than a scoped playback token designed for
  streaming.
- **Self-hosted transcoding (e.g. ffmpeg in a worker + HLS segments in
  Storage)**: rejected for MVP — meaningful operational complexity (encoding
  farm, CDN in front of segments) to reinvent what Mux/Cloudflare Stream
  already sell as a per-minute service, for a single school's content volume.
- **Linking to unlisted YouTube videos**: this is the **chosen Phase 1
  approach** (not just a considered alternative) — Phase 1 launches as "a
  usable LMS without its own video pipeline," per the handoff's phasing,
  deferring this ADR's provider choice to before Phase 4 without blocking the
  rest of the product.

## Consequences

- Video playback code (chapters, notes-at-timestamp, resume position) is built
  once against a `video_asset_id` + playback-token contract, independent of
  which provider is chosen — swapping Mux ↔ Cloudflare Stream later is a
  worker/adapter change, not a frontend rewrite.
- Cost is usage-based and recurring (unlike a one-time Storage cost) — the
  provider choice and "who pays, how many hours" must be resolved before
  Phase 4 starts and before uploading a large video library, not after.
