# Playbook 3 — Advisor Offboarding

**Canonical status:** MANUAL GOVERNED.
**Owner:** KORA_ADMIN.
**Hard Deps exercised:** `KORA-WP-030` (Advisor Identity/Qualification),
`KORA-WP-007` (Operational Case), `KORA-WP-006` (governed audit).
**Constitutional invariant exercised:** "No active Assignment → no Advisor
operational access" (Founder Decision H-A, `KORA-WP-033`/`035`/`036`) — this
playbook is the terminal case of that rule, not a new one.

### 1. Purpose
Fully end an Advisor's operational relationship with KORA — identity
deactivated, qualifications stopped, active Assignments ended, any open
Operational Cases they own reassigned or resolved — while preserving their
Review Assessment / historical record intact.

### 2. Trigger
An Advisor leaves KORA's Advisor pool (voluntary exit, non-renewal,
governance action).

### 3. Owner
KORA_ADMIN (`requireKoraAdminActor()` guards `endAdvisorAssignment()`
already; the identity- and qualification-status writers follow the same
convention).

### 4. Entry conditions
An `advisor.advisor_identity` row exists with `status = 'active'`; it may
have zero or more `active` `advisor.advisor_assignment` rows and zero or
more non-terminal `advisor.advisor_role_qualification` rows.

### 5. Operational Case routing
KORA_ADMIN opens one Operational Case scoped `organisationType: 'admin'`
(the Advisor's own offboarding is not a single Company's business — it is
an internal governance action; `organisationId` is `NULL` by `KORA-WP-007`'s
own contract for `'admin'`), `callerRole: 'KORA_ADMIN'`,
`subject: "Offboarding: Advisor — <advisor_identity id>"`.

If the Advisor holds one or more **active Assignments**, each Assignment's
ending is additionally reflected in that Assignment's own Company-scoped
context via `endAdvisorAssignment()`'s existing governance event
(`ASSIGNMENT_CHANGE`, per-Assignment) — this playbook does not open a
second, redundant Case per Company; the one admin-scoped Case is the
offboarding's own audit trail, and each Assignment-end is independently
governed by the mechanism `KORA-WP-031` already built.

### 6. Ordered steps
1. Open the admin-scoped Case (step 5), transition to `in-progress`.
2. List every `active` Assignment for the Advisor
   (`listAssignmentsForAdvisor()`, `lib/advisor-assignment/advisor-assignment-service.ts`,
   filtered to `status: 'active'`).
3. For each active Assignment, call
   `endAdvisorAssignment({ assignmentId, reason: 'advisor_offboarding', actorRole: 'KORA_ADMIN', actorId })`
   (already existing, unmodified by this WP).
4. List every non-terminal Role Qualification for the Advisor
   (`listRoleQualificationsForAdvisor()`), and for each, call
   `updateAdvisorRoleQualificationStatus(qualificationId, 'REVOKED', actorRole, actorId)`
   (already existing, `KORA-WP-030`, unmodified by this WP).
5. List every Operational Case the Advisor owns
   (`listOperationalCases({ callerRole: 'KORA_ADMIN' })`, filtered
   client-side to `owningAdvisorId === advisorId`) that is not already
   `resolved`. For each: KORA_ADMIN decides, per Case (Manual Governed — no
   bulk/automatic engine), either to **reassign** it
   (`transitionOperationalCaseStatus({ caseId, newStatus: <unchanged current status>, newOwningAdvisorId: <replacement advisor id>, callerRole: 'KORA_ADMIN', actorId })`
   — already existing, `KORA-WP-007`, no new function needed) or to
   **resolve** it directly if it no longer needs an owner.
6. Call `updateAdvisorIdentityStatus(advisorId, 'inactive_offboarded', actorRole, actorId)`
   (`lib/advisor-identity/advisor-identity-service.ts` — **new in this WP**,
   see note below) — done last, after every Assignment/Qualification/Case
   consequence is handled, so the identity-level status change is the
   terminal step, not a precondition of the others.
7. Resolve the offboarding Case.

### 7. Access changes
After step 6.3, `endAdvisorAssignment()`'s own effect applies immediately —
per Founder Decision H-A, no active Assignment means zero Advisor
operational access across messages, appointments, content, and Cases (this
was already enforced by `KORA-WP-033`/`035`/`036`'s active-check
resolvers before this WP existed; this playbook triggers the same, already
correct, enforcement — it does not redefine it). After step 6.6, the
Advisor's identity itself is marked `inactive_offboarded`.

### 8. Data / history preservation
No step in this playbook deletes anything. `advisor.advisor_identity`,
`advisor.advisor_role_qualification`, `advisor.advisor_assignment`, and any
`gov.operational_case` rows the Advisor was tied to all persist with their
full history — status columns change, rows are never removed. Review
Assessment records (`KORA-WP-037`, where issued) are not touched by any
function this playbook calls.

### 9. Audit / governance
Each step writes its own already-existing governance event:
`endAdvisorAssignment()` → `ASSIGNMENT_CHANGE` (per Assignment);
`updateAdvisorRoleQualificationStatus()` → `advisor_role_qualification.status_changed`
(per qualification); `transitionOperationalCaseStatus()` →
`operational_case.reassigned` or `operational_case.status_changed` (per
Case); `updateAdvisorIdentityStatus()` → `advisor_identity.status_changed`
(once, terminal). No new event vocabulary was invented for this playbook.

### 10. Escalation
If any step fails (e.g. an Assignment already ended, a qualification
already terminal), the offboarding Case moves to `blocked`; a human
resolves the discrepancy — the sequence in step 6 is not a single
transaction and is not auto-retried.

### 11. Completion condition
Offboarding Case = `resolved`; zero `active` Assignments remain for the
Advisor; zero non-terminal Qualifications remain; zero
non-`resolved` Cases remain owned by the Advisor; `advisor_identity.status
= 'inactive_offboarded'`.

### 12. Dry-run evidence
See `.kora-audit/output/126_KORA_WP_041_IMPLEMENTATION_REPORT.md` §26.

### 13. Out of scope / handoffs
- Deciding *who* a reassigned Case's new owning Advisor should be: a human
  governance decision, not something this playbook or `KORA-WP-007`
  automates.
- Partner Advisor offboarding specifics beyond what the shared
  `advisor_identity`/`advisor_role_qualification` model already covers:
  Partner offboarding overall is explicitly out of `KORA-WP-041`'s scope
  (registry Out of Scope field).

---

**Note on the two narrow gaps found and closed by this playbook's dry-run:**
see `README.md`'s "Gaps found and closed" section — `endWorkerIdentityAccess()`
is not used by this playbook (Worker Offboarding's own), but
`updateAdvisorIdentityStatus()` (step 6.6 above) was added specifically to
make this playbook's terminal step real rather than aspirational, and the
suspected Case-reassignment gap (step 6.5) turned out to need no new code
at all — `KORA-WP-007`'s `transitionOperationalCaseStatus()` already
supports it.
