# Playbook 2 — Worker Offboarding

**Canonical status:** MANUAL GOVERNED.
**Owner:** KORA_ADMIN.
**Hard Deps exercised:** `KORA-WP-004` semantics (membership-end pattern —
not the same table; see §6 note), `KORA-WP-007` (Operational Case),
`KORA-WP-006` (governed audit).
**Constitutional invariant exercised:** worker-owned My KORA identity is
preserved through Company/Worker offboarding (registry Privacy/Trust field;
doc 92 §20).

### 1. Purpose
End a Worker's Company-side access when they leave the Company, while
guaranteeing their My KORA identity (`personal.worker_identity`) and any
private profile data (`personal.worker_profile_private`) are never deleted,
merged, or exposed to any employer role as a consequence.

### 2. Trigger
A Worker leaves the Company (resignation, termination, role change out of
scope) during or after a pilot.

### 3. Owner
KORA_ADMIN. `personal.worker_identity` is reachable only via the
service-role client (migration `007`'s RLS design — `KORA_ADMIN`: full
access; `WORKER`: own row only; no Company policy at all).

### 4. Entry conditions
A `personal.worker_identity` row exists with `status = 'active'` for the
worker whose Company access is ending.

### 5. Operational Case routing
KORA_ADMIN opens an Operational Case:
`organisationType: 'company'`, `organisationId: <tenantId>`,
`callerRole: 'KORA_ADMIN'`, `subject: "Offboarding: Worker leaves Company — <worker_identity id>"`.
No `linkedObjectType` — same reasoning as the Company playbook (no
`worker_identity` slot exists in `CASE_LINKED_OBJECT_TYPES`, and none was
added).

### 6. Ordered steps
1. Open the Case (step 5), transition to `in-progress`.
2. Call `endWorkerIdentityAccess({ workerIdentityId, actor })`
   (`lib/worker-identity/worker-identity-service.ts` — **new in this WP**,
   see note below).
3. Verify the returned row has `status: 'disabled'`.
4. Verify `personal.worker_identity`'s other fields (`id`, `auth_user_id`,
   `worker_ref`, `tenant_id`) are unchanged.
5. Verify `personal.worker_profile_private` for this worker is untouched
   (no row modified, no row deleted).
6. Resolve the Case.

**Note on Hard Dep `KORA-WP-004`:** the registry's Code Truth field says
"underlying membership-end mechanics exist via `KORA-WP-004`." On direct
inspection, `KORA-WP-004`'s own table (`analytics.company_memberships`) is
DB-CHECK-constrained to `role = 'COMPANY_ADMIN'` only (migration `050`) — it
does not, and structurally cannot, represent a generic Worker's membership.
The actual Worker-side "membership ends" mechanic is
`personal.worker_identity.status` (migration `007`), a different table.
`KORA-WP-004` is the right architectural *pattern* this playbook follows
(explicit, governed, idempotent-safe end-of-relationship call that never
touches identity data) — it is not the literal function reused. This is
disclosed here rather than silently reconciled, per this WP's own "verify
exact registry, do not assume" instruction.

### 7. Access changes
The worker's Company-side access ends (`status: 'disabled'`). Nothing in
`auth.users`, `personal.worker_identity`'s identity fields, or
`personal.worker_profile_private` changes. A future employer never gains
access to this worker's past private data merely because the identity
persists — no function this playbook calls grants any employer role read
access to `personal.worker_identity` or `personal.worker_profile_private`
(RLS: `KORA_ADMIN` = all, `WORKER` = own row only, no Company policy at
all, migration `007`, unmodified by this WP).

### 8. Data / history preservation
`personal.worker_identity` row persists (never deleted — `endWorkerIdentityAccess()`
only performs an `UPDATE`, never a `DELETE`). `personal.worker_profile_private`
persists unmodified. The worker retains the ability to read their own
identity row (`worker_identity_worker_own_select` policy, unaffected by
`status`).

### 9. Audit / governance
`endWorkerIdentityAccess()` records one `audit.governance_event` via
`recordGovernedAction({ category: 'MEMBERSHIP_CHANGE', ... })` — an already
existing category in `KORA-WP-006`'s 14-category catalogue
(`lib/audit/governed-action-catalog.ts`); no new category was invented.

### 10. Escalation
If the worker identity is not found or already `disabled`,
`endWorkerIdentityAccess()` throws; the Case moves to `blocked` until a
human resolves the discrepancy.

### 11. Completion condition
Case status = `resolved`; `personal.worker_identity.status = 'disabled'`;
worker-leaves-during-pilot test (§25 of report 126) passes for this
scenario class.

### 12. Dry-run evidence
See `.kora-audit/output/126_KORA_WP_041_IMPLEMENTATION_REPORT.md` §24-§25.

### 13. Out of scope / handoffs
- Deleting or exporting the worker's My KORA data on request: not this
  playbook's concern (no deletion/export mechanic exists or is invented
  here — Gate 3 territory if it ever becomes required).
- Re-activating a disabled worker identity if they rejoin: not covered by
  this playbook (a distinct, not-yet-built flow).
