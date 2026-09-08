# ADR-0013: Render over Railway for the API deployment

## Status

Amends the Railway-first framing in [ADR-0004](0004-supabase-infrastructure.md)
and [ARCHITECTURE.md](../../ARCHITECTURE.md). Railway remains a reasonable
choice in the abstract; this ADR records why the *first* real deployment
(2026-09-08) landed on Render instead, so the decision isn't re-litigated
next time someone reads "Railway" in an older doc and wonders why the actual
deployment says otherwise.

## Context

The user's Railway account had already used its free-tier project-provision
limit across five unrelated existing projects. Creating a new project
(`aulawm-api`) failed with `Free plan resource provision limit exceeded`
before we ever reached a code or configuration problem. The user upgraded
their Railway plan; the same error persisted afterward (most likely a
propagation delay on Railway's side, not a configuration mistake on ours —
retried multiple times over several minutes with no change). Given the
project needed a live backend to keep moving, the user chose to switch to
Render rather than wait further on Railway.

## Decision

Deploy `apps/api` to **Render** as a Web Service on Render's free plan:

- Service name `aulawm-api`, region Oregon, connected to
  `github.com/wworkinhome/aulawm`, `rootDir: apps/api`.
- Build command: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter
  @aulawm/shared build && pnpm --filter @aulawm/db build && pnpm --filter api
  build` — the `cd ../..` is required because Render's `rootDir` changes the
  working directory for *both* build and start commands, but the build needs
  to run from the monorepo root for pnpm's workspace resolution
  (`packages/shared`, `packages/db`) to work; the start command then runs
  from `rootDir` again, where `dist/main.js` (built by `nest build`) is
  directly reachable.
- Do **not** run `corepack enable` in the build command on Render — Render's
  Node image ships `pnpm` pre-installed at `/usr/bin/pnpm` on a read-only
  filesystem, and `corepack enable` tries to overwrite that symlink and fails
  with `EROFS`. Render's pre-installed `pnpm` is sufficient; just call it
  directly.
- Env vars set directly on the Render service (via its API, not checked into
  the repo): `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`,
  `DOMINIO_INSTITUCIONAL`.

**A real, confirmed account-linkage bug forced two workarounds**, not just
preference:

1. Render's GitHub App was already installed on the user's GitHub account
   (3 years old, from an unrelated prior project) with "All repositories"
   access. Despite that, Render's own dashboard repo picker showed "No
   repositories found" for the new `aulawm` repo, and — more decisively —
   `POST /v1/services` via Render's REST API rejected the private repo URL
   outright: `"passed in repository URL is invalid or unfetchable"`. This
   confirms Render's account-level Git connection was not actually able to
   read the repo, independent of any dashboard caching theory. **Workaround**:
   made the repo public (`gh repo edit --visibility public`), which routes
   around whatever is broken in Render's private-repo access path since
   public repos don't need it. This is a real, if unfortunate, trade-off —
   see [TD-013](../../TECHNICAL_DEBT.md).
2. Render's `starter` plan requires a card on file; `POST /v1/services`
   returned `"Payment information is required"`. Switched `plan` to `free` in
   the same request, which the account could actually provision.

## Alternatives considered

- **Wait for Railway's plan upgrade to propagate**: rejected for this session
  — no way to know how long that would take, and the project needed to keep
  moving. Railway remains a fine target to revisit later; nothing here rules
  it back in.
- **Fix Render's GitHub connection properly (reconnect/reinstall the App)
  before deploying**: attempted first — confirmed the App was installed with
  "All repositories" scope on GitHub's side, which should have been
  sufficient. The failure is on Render's side (account-to-GitHub-identity
  linkage), not something fixable by reconfiguring the GitHub App's
  permissions. Making the repo public was the fastest unblock; revisit a
  proper fix (see TD-013) before treating "public repo" as permanent.
- **Deploy via Vercel-style raw CLI upload instead of git**: Render doesn't
  offer this — its deploy model is fundamentally git-based (or an existing
  Docker image), unlike Vercel's `vercel deploy` local-upload path. This is a
  structural difference between the two platforms, not a Render
  misconfiguration.

## Consequences

- The API's source is public on GitHub for as long as this Render connection
  issue is unresolved. No secrets are exposed by this (all credentials live
  in Render's env vars and local `.env` files, never in the repo), but it's a
  deliberate, tracked trade-off, not the intended end state for a product
  meant to hold student data.
- Render's free plan cold-starts after inactivity — fine for early
  development, not for anyone's real usage; revisit before this URL is given
  to actual students/teachers (Phase 1 sign-off, not before).
- Future infra docs should treat **Render** as the current deployed reality
  for the API, with Railway as a possible future migration once its plan
  issue is sorted out and/or Render's GitHub linkage bug is understood —
  not the other way around.
