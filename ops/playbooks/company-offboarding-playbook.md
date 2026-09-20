# Playbook 1 — Company Offboarding

**Canonical status:** MANUAL GOVERNED. One playbook, two explicit branches
(Founder decision, KORA-WP-041 review round — see `README.md`).
**Owner:** KORA_ADMIN.
**Hard Deps exercised:** `KORA-WP-004` (Company Membership), `KORA-WP-007`
(Operational Case), `KORA-WP-006` (governed audit).

---

## Branch A — Company membership offboarding

### 1. Purpose
End one Company-side membership relationship (today: a `COMPANY_ADMIN` row
in `analytics.company_memberships`) without touching the underlying
authenticated identity, without deleting Company history, and without
affecting any other membership on the same tenant.

### 2. Trigger
A specific Company Admin's access must end (role change, offboarding from
the client organisation, access-review finding) while the Company's own
pilot relationship with KORA continues.

### 3. Owner
KORA_ADMIN. Not self-service — `analytics.company_memberships` is reachable
only via the service-role client (migration `050`'s own RLS design), by
construction, until `KORA-WP-010`.

### 4. Entry conditions
- A `analytics.company_memberships` row exists with `status = 'active'` for
  the membership being ended.
- The KORA_ADMIN operator has verified (outside this system, per Manual
  Governed) that ending this membership is the intended action.

### 5. Operational Case routing
KORA_ADMIN opens an Operational Case:
`organisationType: 'company'`, `organisationId: <tenantId>`,
`callerRole: 'KORA_ADMIN'`, `subject: "Offboarding: Company membership ended — <auth_user_id>"`.
No `linkedObjectType` is set — `KORA-WP-007`'s existing
`CASE_LINKED_OBJECT_TYPES` enum (`commitment`, `program`, `review`,
`certification`, `capability_validation`) has no slot for a membership
record, and none was added for this WP (Step 18 of this WP's own
authorization: no `linked_object` invention). The membership identity lives
in the Case's free-text `subject` only.

### 6. Ordered steps
1. Open the Case (step 5).
2. Transition the Case to `in-progress`.
3. Call `endCompanyMembership({ membershipId, actor })`
   (`lib/company-membership/membership-service.ts`, `KORA-WP-004`, already
   existing, unmodified by this WP).
4. Verify the returned row has `status: 'ended'`, `endedAt` set.
5. Verify the row's `tenantId` and `authUserId` are unchanged (nothing else
   was touched).
6. Resolve the Case with a `resolutionNote` referencing the ended
   membership id.

### 7. Access changes
The ended membership's `auth_user_id` loses whatever access was granted
purely by virtue of `analytics.company_memberships.status = 'active'` for
that tenant. No other membership on the same tenant, and no membership on
any other tenant for the same `auth_user_id` (`listCompanyMembershipsForIdentity`),
is affected — each row is independent.

### 8. Data / history preservation
`endCompanyMembership()` only sets `status`/`ended_at` on the one row — the
row itself, and everything else in the Company's data, is preserved
unmodified. This is not new behavior; it is `KORA-WP-004`'s own,
already-shipped design ("Never touches auth.users, app_metadata,
personal.worker_identity, or any My KORA data").

### 9. Audit / governance
`endCompanyMembership()` already writes one `audit.audit_log` row
(`action: 'company_membership_ended'`). For this WP's own governance-event
layer (`KORA-WP-006`), the Case creation/transition steps (5-6) additionally
write `audit.governance_event` rows via the existing `operational_case.*`
event types — no new event vocabulary was created.

### 10. Escalation
If the membership cannot be ended (e.g. `endCompanyMembership()` throws
because the row is already `ended` or does not exist), transition the Case
to `blocked` and record the reason in the Case; a human resolves it before
retrying — no automatic retry.

### 11. Completion condition
Case status = `resolved`, underlying `analytics.company_memberships` row
has `status = 'ended'`.

### 12. Dry-run evidence
See `.kora-audit/output/126_KORA_WP_041_IMPLEMENTATION_REPORT.md` §22.

### 13. Out of scope / handoffs
Does not touch the Company's own tenant record, other memberships, or any
worker data. Does not end the Company's overall pilot relationship — that
is Branch B, a separate, explicit action.

---

## Branch B — Company Pilot termination

### 1. Purpose
Wind down KORA's entire operational relationship with a Company at the end
of (or during, if terminated early) its pilot — access shutdown across all
memberships, with historical and audit evidence preserved, and any
retention/legal decision explicitly handed off rather than resolved here.

### 2. Trigger
The Company's pilot ends (natural conclusion or early termination).

### 3. Owner
KORA_ADMIN.

### 4. Entry conditions
- The tenant (`analytics.tenant`) whose pilot is terminating is identified.
- All parties (Founder / KORA_ADMIN governance) have agreed the pilot is
  ending — this playbook does not decide *whether* to terminate, only
  *how* to execute an already-decided termination.

### 5. Operational Case routing
KORA_ADMIN opens one Operational Case:
`organisationType: 'company'`, `organisationId: <tenantId>`,
`callerRole: 'KORA_ADMIN'`, `subject: "Offboarding: Company Pilot termination — <tenantId>"`.

### 6. Ordered steps
1. Open the Case (step 5), transition to `in-progress`.
2. List every active membership for the tenant (`analytics.company_memberships`,
   filtered `tenant_id = <tenantId>`, `status = 'active'`).
3. Run Branch A (step 6 above) for **each** active membership found — Branch
   B does not duplicate Branch A's mechanism, it sequences it across every
   membership on the tenant.
4. Verify no `active` membership remains for the tenant.
5. Reach the retention/legal decision point (step 7 below).
6. Resolve the Case only after step 5's handoff is recorded — see step 9.

### 7. Access changes
After step 6.4, every Company-side membership for the tenant is `ended`.
This playbook does **not** disable the tenant record itself, does not
revoke Advisor Assignments tied to the tenant (that is a consequence for
the *Advisor* playbook to handle on its own trigger, not this one to force),
and does not touch worker data — Company Pilot termination is scoped to the
Company-membership layer this WP's Hard Deps actually cover
(`KORA-WP-004`, `KORA-WP-007`, `KORA-WP-030`); it explicitly does not
reach into `KORA-WP-031` (Assignment) or worker-side tables to force
unrelated terminations that have their own playbooks/triggers.

### 8. Data / history preservation
Every ended membership row remains in `analytics.company_memberships`,
unmodified beyond `status`/`ended_at` (Branch A, step 8). The tenant row
itself, all UEF/scoring/audit history, is untouched by this playbook — no
function this playbook calls has a code path that could delete or mutate
historical Company data.

### 9. Audit / governance — and the retention/legal handoff
This is the one point in either Company branch where this WP's own
boundary is explicit: **retention duration, deletion scheduling, statutory
basis, and DPA-termination consequences are Gate 3 (Legal/DPO — OPEN)
decisions.** This playbook does not invent any of them. The completion
condition for Branch B is:

- Every membership ended (steps 6.2-6.4) — verified programmatically.
- Audit/governance evidence recorded for every membership end (Branch A
  step 9, repeated per membership) plus one Case-level governance event for
  the overall termination.
- The Case is resolved with a `resolutionNote` that explicitly states:
  **`LEGAL / DPO HANDOFF REQUIRED — data/legal retention path not resolved
  by KORA-WP-041; route to Gate 3 process before any deletion.`**

This is a valid, complete operational step under Manual Governed — the
playbook's job ends at "access is shut down, evidence is preserved, and the
unresolved decision is explicitly flagged," not at "the legal question is
answered."

### 10. Escalation
If any individual membership fails to end (Branch A step 10), the whole
Case moves to `blocked` until resolved — Branch B does not resolve/complete
with a partial shutdown.

### 11. Completion condition
Case status = `resolved`, zero `active` memberships remain for the tenant,
Case `resolutionNote` contains the explicit legal/DPO handoff statement.

### 12. Dry-run evidence
See `.kora-audit/output/126_KORA_WP_041_IMPLEMENTATION_REPORT.md` §23.

### 13. Out of scope / handoffs
- Retention duration, deletion scheduling, statutory/contractual basis,
  DPA-termination consequences: **Gate 3 (Legal/DPO) — explicit handoff,
  not resolved here.**
- Worker-side and Advisor-side consequences of a Company pilot ending: each
  has its own playbook/trigger (Playbook 2, Playbook 3) — not forced by
  this branch.
