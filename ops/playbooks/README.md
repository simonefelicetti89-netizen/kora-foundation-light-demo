# KORA — Pre-Pilot Offboarding Playbooks (KORA-WP-041)

**Status:** MANUAL GOVERNED — BASE PILOT BLOCKER — pre-pilot readiness requirement, not an application feature.
**Arch Source:** `.kora-audit/output/92_KORA_MASTER_PLAN_2.1_FINAL_EXECUTION_CONSISTENCY_LOCK.md` §20.
**Registry:** `.kora-audit/output/102_KORA_MASTER_PLAN_FINAL_CANONICAL_EXECUTION_REGISTRY_VERIFIED.md`, `KORA-WP-041`.
**Out of scope:** Partner offboarding — required only before a real Partner pilot, not before pilot #1.

## Why this exists

Before KORA runs its first live Company pilot, there must be a controlled,
documented, auditable way to end each of the three relationships KORA holds
with a person or organisation — without losing history that must be kept,
and without leaving operational access open that should not remain open.
None of this is deferred until real churn happens; it must exist, on paper
and dry-run-proven, before pilot #1.

## Three canonical playbooks, four evidence rows

The architecture source (doc 92 §20) describes four operational scenarios.
The Founder resolved the apparent 3-vs-4 naming tension (raised during this
WP's own pre-implementation review) as follows: **Company Offboarding is
one playbook with two explicit branches**, so the canonical playbook count
remains exactly **three**, while dry-run evidence is produced for **four**
rows:

| # | Playbook | Branch | File |
|---|---|---|---|
| 1 | Company Offboarding | A — Company membership offboarding | [`company-offboarding-playbook.md`](./company-offboarding-playbook.md) |
| 1 | Company Offboarding | B — Company Pilot termination | [`company-offboarding-playbook.md`](./company-offboarding-playbook.md) |
| 2 | Worker Offboarding | — | [`worker-offboarding-playbook.md`](./worker-offboarding-playbook.md) |
| 3 | Advisor Offboarding | — | [`advisor-offboarding-playbook.md`](./advisor-offboarding-playbook.md) |

The two Company branches are kept semantically distinct inside one document
— ending a single Company-side membership is not the same event as
terminating the whole pilot relationship — but they are governed as one
playbook, per Founder decision, matching the registry's own "three
playbooks" Acceptance wording.

## Shared principles across all three playbooks

- **Manual Governed.** No workflow engine, no scheduled cleanup, no
  automatic deletion, no automatic reassignment engine, no offboarding
  wizard. A human (KORA_ADMIN, or an Advisor for their own Case where the
  primitive allows it) explicitly triggers every step.
- **Case-routed, not a new system.** Every playbook execution opens an
  `Operational Case` (`KORA-WP-007`, `lib/operations/operational-case-service.ts`)
  as its auditable record. No new Case schema, no new `linked_object_type`,
  no new Case status was created for this WP — the existing five-status
  lifecycle (`open → in-progress/blocked/escalated → resolved`) and the
  existing `subject`/`priority`/`resolutionNote` fields are what each
  playbook's Case carries.
- **Zero migration.** `Data/Migration Impact: NONE` per the registry. Every
  underlying mechanism this WP dry-runs already existed in the database
  schema before this WP started; where a service-layer *writer* was
  missing (see "Gaps found and closed" below), it was added narrowly, with
  no DDL.
- **No new legal/retention decision.** Where a playbook reaches a point
  that would require a Gate 3 (Legal/DPO — still OPEN) decision — durations,
  deletion schedules, statutory basis — the playbook's own completion
  condition is an explicit **LEGAL / DPO HANDOFF**, not a resolution. Gate 3
  is not, and cannot be, closed by this WP.
- **My KORA identity is never touched by an offboarding step.** No
  function invoked by any of these three playbooks writes to
  `personal.worker_identity`'s identity fields, to
  `personal.worker_profile_private`, or to any other My KORA data — this is
  verified, not merely asserted, by the dry-run evidence in
  `.kora-audit/output/126_KORA_WP_041_IMPLEMENTATION_REPORT.md`.

## Gaps found and closed during this WP's dry-run (narrow, no migration)

Two existing DB-level status values had no writer anywhere in the codebase
— discovered only by attempting a real dry-run, not by reading documentation:

1. `personal.worker_identity.status = 'disabled'` (CHECK constraint present
   since migration `007_worker_provisioning.sql`) had no writer.
   → Added `endWorkerIdentityAccess()` in
   `lib/worker-identity/worker-identity-service.ts` (new file).
2. `advisor.advisor_identity.status = 'inactive_offboarded'` (CHECK
   constraint present since migration `056_advisor_identity_qualification.sql`)
   had no writer.
   → Added `updateAdvisorIdentityStatus()` in
   `lib/advisor-identity/advisor-identity-service.ts` (existing file,
   additive function).

A third suspected gap — Case reassignment on Advisor offboarding
("Assignments/Cases reassigned", doc 92 §20) — turned out to already be
fully supported by `transitionOperationalCaseStatus()`'s existing
`newOwningAdvisorId` parameter (`KORA-WP-007`, verified by direct code
reading before writing any new function). No new code was needed there.

## Dry-run evidence

See `.kora-audit/output/126_KORA_WP_041_IMPLEMENTATION_REPORT.md` for the
full evidence matrix (§29), the worker-leaves-during-pilot test result
(§25), and the per-branch dry-run walkthroughs (§22-§26).
