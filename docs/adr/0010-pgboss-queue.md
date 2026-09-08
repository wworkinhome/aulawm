# ADR-0010: pg-boss on Postgres instead of Redis + BullMQ

## Context

AulaWM needs a job queue for work that must not block the HTTP request/response
cycle: dispatching code submissions to the sandbox, verifying uploaded Office
files, video transcoding callbacks, notification email, nightly statistics
recalculation, gamification evaluation, and expiring timed-out exam attempts
(`intento.expirar`, which must run every minute — an open exam attempt can
never be left open forever just because a student closed their browser). The
generic architecture proposal originally in this repo assumed Redis + BullMQ.
The design handoff instead specifies **pg-boss**, running against the same
Postgres database the application already uses.

## Decision

Use **pg-boss** as the queue, with these jobs (per
`design_handoff_aulawm/api/endpoints.md`):

| Queue | Trigger | Job |
|---|---|---|
| `lab.calificar` | `POST /labs/:id/envios` | Package + send to Judge0, write verdict, insert grade if autograded |
| `entrega.verificar` | `POST /asignaciones/:id/entregas` | Open and score .xlsx/.docx/.pptx against the rubric |
| `video.transcodificar` | teacher uploads a video | Create the Mux/Cloudflare Stream asset, store the asset id |
| `notificacion.enviar` | assignment or grade publication | Email students and guardians |
| `estadistica.preguntas` | daily | Recalculate `vecesUsada`/`tasaAcierto` on bank questions |
| `gamificacion.evaluar` | daily + on lab completion | Streaks, XP, badges |
| `intento.expirar` | every minute | Close attempts whose time ran out and were never finalized |

No separate Redis deployment is provisioned for MVP.

## Alternatives considered

- **Redis + BullMQ** (the generic default this repo originally proposed):
  rejected at this scale — it adds a second stateful service to operate,
  monitor, and back up, for a workload (a single school, dozens of concurrent
  users) that doesn't need Redis's throughput. pg-boss gets transactional
  enqueueing "for free" (a job can be created in the same transaction as the
  row that triggers it, e.g. the `lab_envios` insert and its `lab.calificar`
  job), which is awkward to guarantee across two different datastores with
  BullMQ.
- **A managed queue service** (SQS, Cloud Tasks): rejected for MVP — ties the
  project to a specific cloud provider ahead of the AWS-readiness timeline in
  [ADR-0004](0004-supabase-infrastructure.md), for no benefit at current scale.

## Consequences

- One less piece of infrastructure to run — Postgres is already there for the
  application database.
- pg-boss's throughput ceiling is well below Redis-backed queues; if AulaWM
  ever needs to process a large multi-institution volume of jobs (many
  concurrent classrooms submitting code, many videos transcoding at once),
  revisit this decision — it is not intended to be permanent at arbitrary
  scale, only appropriate for the current single-school size.
- Queue load now shares the same Postgres instance/connection budget as the
  application's transactional workload — job-heavy periods (a whole class
  submitting labs at once) must be accounted for when sizing the database
  connection pool, not treated as isolated from application traffic the way a
  separate Redis instance would be.
