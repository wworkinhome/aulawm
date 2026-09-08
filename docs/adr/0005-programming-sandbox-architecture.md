# ADR-0005: Programming sandbox architecture

> **Amended** after the Phase 0 design handoff
> (`LMS Wilmer Moqsuera/design_handoff_aulawm/`) specified a concrete runner:
> **self-hosted Judge0** dispatched via **pg-boss** (not Redis+BullMQ — see
> [ADR-0010](0010-pgboss-queue.md)). The non-negotiable boundary (student code
> never runs in the Next.js/NestJS process) and the escalation path below are
> unchanged; §"Decision" is updated to name Judge0 as the MVP execution engine
> instead of a hand-rolled hardened-container worker.

## Context

AulaWM must execute student-submitted code (HTML/CSS/JS at launch; Python, Java,
C#, SQL planned) to power programming labs and autograded coding exams (Sections
37-41 of the brief). Student code is the one input in this system that must be
treated as adversarial by default — even without malicious intent, infinite
loops, fork bombs, and runaway memory use are routine outcomes of buggy student
code. Section 41 states an absolute rule: this code must never execute inside
Next.js, NestJS, or any process that also serves API traffic.

## Decision

Execute code through an asynchronous, queue-based pipeline, fully separated from
the request/response path of the API:

```
POST /labs/:id/envios (Nest validates, writes lab_envios row, status en_cola)
   → pg-boss job (lab.calificar), enqueued on the same Postgres
   → Worker (separate deployable, no inbound HTTP) picks up the job
   → Worker assembles the package: starter + student code + teacher's
     hidden test file (archivo_pruebas — never sent to the client)
   → Worker submits to Judge0 (self-hosted) with, per test case:
        - 5s CPU limit, 256MB memory limit
        - no network access
        - read-only filesystem
        - stdout/stderr truncated to 64KB
   → Each test case runs as a separate Judge0 submission, so partial credit
     is possible per-case, not just pass/fail on the whole submission
   → Worker writes lab_envios.veredicto, per-case points, and raw output;
     if labs.autocalificar, inserts into calificaciones directly
   → Frontend subscribes to Supabase Realtime on lab_envios filtered by
     id = envioId and updates the console live as veredicto changes
```

**Judge0 is the MVP execution engine**, not a hand-rolled hardened-container
worker — it already implements the isolation primitives above (via `isolate`,
cgroups/namespaces) and is purpose-built for exactly this "run untrusted code,
score against test cases" workload. Self-host it (not the public demo
instance) so submissions and their content stay on infrastructure the project
controls, and size it for the concurrency the classroom actually produces (the
handoff's own open question: ~40 students submitting within the same 5-second
window during a class period — load-test this before relying on it in a live
class, not after).

Per-language runner, per the handoff: JavaScript/Node via `vitest`, Python via
`pytest`, SQL via an ephemeral Postgres/MySQL copy of the `colegio_db` schema
with the student's query run inside a transaction that ends in `ROLLBACK`
(compare the ordered result set, never let the query commit), and HTML/CSS via
`jsdom` + DOM assertions (never a screenshot-based check).

**Upgrade path (build when scale or risk tolerance demands it, not before):**

- **gVisor** — user-space kernel interception, stronger isolation than a bare
  container with lower overhead than a VM. Natural next step if container
  hardening proves insufficient in practice.
- **Firecracker microVMs** — true VM-level isolation with fast boot times;
  appropriate once execution volume and risk justify the added operational
  complexity.
- **Kubernetes Jobs** — once the platform runs on Kubernetes anyway, ephemeral
  Jobs with pod security standards (non-root, read-only rootfs, dropped
  capabilities, network policies) as the execution unit.
- **AWS isolated execution** (e.g. Lambda with strict resource/network config,
  or Fargate tasks in an isolated subnet) — only if/when the platform actually
  migrates toward AWS (see [ADR-0004](0004-supabase-infrastructure.md)); not
  adopted speculatively.

## Alternatives considered

- **In-process execution via Node's `vm` module or a subprocess in the API
  server**: rejected outright — this is the exact anti-pattern Section 41
  prohibits. `vm` is not a security boundary against a determined attacker, and
  even accidental resource exhaustion (an infinite loop) would degrade the API
  for every user.
- **Hand-rolled hardened-container worker** (this ADR's original default,
  before the design handoff was found): superseded — Judge0 already solves
  this exact problem (isolation, per-test-case scoring, multi-language
  support) and self-hosting it keeps student code on infrastructure the
  project controls, avoiding the "moves grading off our infra" objection that
  would apply to a *hosted* third-party judge service. Building a bespoke
  worker from scratch would be reinventing something Judge0 already does
  correctly, for no gain specific to this product.
- **Hosted (non-self-hosted) Judge0 or a similar SaaS judge**: rejected for the
  same reason a third-party code-execution API was originally rejected —
  student code and grading become dependent on a third party in the critical
  path, and self-hosting is not materially harder than integrating a hosted
  one.

## Consequences

- Grading is asynchronous by construction — the UI must show a "running/queued"
  state, not assume an immediate synchronous result (this shapes the frontend
  Coding Exam UI, Section 39).
- The worker is a second deployable with its own release process, health check,
  and monitoring — operational surface the team must own from Phase 4 onward.
- Because isolation is a named, versioned decision (container → gVisor/Firecracker
  → k8s Jobs), a security review is required before *loosening* any limit (e.g.
  raising a timeout or memory ceiling) — not just before initially building it.
