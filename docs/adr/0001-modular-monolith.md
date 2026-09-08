# ADR-0001: Modular monolith over microservices

## Context

AulaWM must eventually scale from one teacher to potentially multiple
institutions. The brief explicitly asks for an architecture that can *evolve*
toward that scale without over-engineering from day one (Section 6, Section 142
of the brief: "NO SOBREINGENIERÍA").

## Decision

Build one NestJS backend deployable and one Next.js frontend deployable. Enforce
domain boundaries in code (module-per-domain, no cross-module direct database
access) so
individual domains can be extracted into separate services later if a real
scaling or team-ownership need arises. The one exception from day one is the
programming-execution sandbox, which runs as a separate worker process/deployable
for security isolation, not for scaling reasons (see
[ADR-0005](0005-programming-sandbox-architecture.md)).

## Alternatives considered

- **Microservices per domain from day one**: rejected. Multiplies deployment,
  observability, and network-failure surface for a single-institution MVP with no
  team-ownership boundaries yet to justify the split.
- **Single undifferentiated Express/Next.js API**: rejected. Without enforced
  module boundaries, the codebase would accumulate cross-domain coupling that
  makes any future extraction (or even reasoning about ownership/authorization)
  harder.

## Consequences

- Faster initial delivery, one CI/CD pipeline, one set of infra to operate.
- Requires discipline: code review must catch modules reaching into each other's
  internals; this ADR is the standing justification for rejecting such PRs.
- Extraction of a module into its own service later is possible without a
  rewrite, because the boundary already exists in code — but it is *not* free;
  expect a scoped migration project (new deployable, new inter-service auth) when
  that day comes.
