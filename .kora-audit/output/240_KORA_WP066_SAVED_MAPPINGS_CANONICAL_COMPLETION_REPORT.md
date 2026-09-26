# 240 — KORA-WP-066 — SAVED MAPPINGS — CANONICAL COMPLETION REPORT

**Date:** 2026-09-22
**Status transition:** `KORA-WP-066` **READY → COMPLETE**
**Founder Visual Acceptance:** **GRANTED / PASSED — 2026-09-22**
**Founder Reading:** **READING 1 — TENANT-SCOPED SESSION REUSE**
**Completion commit:** `49590caa4078bbd34585980ca0dada6d5532843a` (local only — NOT PUSHED)
**Branch:** `feature/kora-wp-066-saved-mappings`
**Worktree:** `/Users/simonefelicetti/KORA-wp066-worktree`
**Baseline / parent:** `0bc14f6e484110ce65be8aa0c185a68208057359` (`KORA-WP-125`)

---

## 1. CANONICAL WP-066 DEFINITION

Saved Mappings — I3 — NOT BASE PILOT SCOPE — Primary Closure `COMPANY-011` — Arch Source `92` §19 —
Code Truth ABSENT — Hard Deps `KORA-WP-029` — Conditional Deps N/A — no scope trigger —
External Blockers none — Data/Migration ADDITIVE — Auth/RLS Company-scoped — UI mapping-reuse —
Feature Flag NO — Size M (`102` says S) — Uncertainty LOW — Out of Scope: incremental connectors
(`KORA-WP-085`) — Evidence Gate N/A.

## 2. THE SOURCE CONTRADICTION

The pre-implementation forensic check found a genuine, unresolvable-by-agent conflict:

| Source | Says |
|---|---|
| Registry `219` / `102` / `142` / `133` | *"reusable mapping **across Companies**"*; acceptance: *"a saved mapping is reusable across Companies"* |
| Capability registry `45` | *"reused **across sessions**"* — **Owner: Company** |
| Gap matrix `46` | *"Saved Mappings (**across upload sessions**)"*; *"**tenant-level rule set**"* |
| Cross-cutting `48`, `PD-028`, `FT-080` | reuse across upload sessions; *"the second upload much easier than the first"* |
| Arch Source `92` §19 | *"Admin-mediated"*, valuable at *"repeat-Company onboarding"* |
| WP-029 code (COMPLETE) | reserves to WP-066: *"no reusable/saved-mapping storage, no cross-Company template, no recommendation engine"* |

Two axes disagreed: **tenant** (within one Company vs across Companies) and **owner** (Company vs
KORA_ADMIN). Per CLAUDE.md §8 this was escalated as `STATE_MATCH = NO` rather than reconciled.

## 3. FOUNDER READING 1 — TENANT-SCOPED SESSION REUSE

Ruled 2026-09-21. The historical *"across Companies"* wording is **not** the intended semantics and
must never be read as cross-tenant sharing. Corrected canonical acceptance:

> **"A saved mapping is reusable across upload/mapping sessions for the same Company."**

**Ownership = Company / tenant · Operational actor = KORA_ADMIN / KORA Operator · Reuse boundary =
same Company only.**

## 4. REGISTRY 102 — SEMANTIC CORRECTION

The WP-066 row carries the full ruling: the corrected acceptance, the three-part ownership
statement, the lineage that prevails (`45`, `46`, `48`, `FT-080`, `PD-028`, `92` §19), the explicit
OUT OF SCOPE for cross-Company templates, and the preserved invariants (READY-until-closure,
milestone I3, Hard Dep `029`, no trigger, Feature Flag NO, NOT BASE PILOT SCOPE, additive/
non-blocking). At closure the same row gained the STATUS block and this commit SHA. No other WP row
was touched.

## 5. REGISTRY 219 — SEMANTIC CORRECTION

Identical ruling block, plus the closure STATUS and the Section F aggregate update. Prior aggregates
preserved under strikethrough; `KORA-WP-019`'s defer overlay, `KORA-WP-117`'s deferral and the open
`KORA-WP-120` inconsistency all explicitly preserved.

## 6. WP-029 BOUNDARY

**WP-029 owns** the one-off governed manual remap — a Case-tracked governance annotation
(`gov.operational_case`, `callerRole: 'KORA_ADMIN'`), no table, no classifier mutation.
**WP-066 owns** persistence and reuse of the normal ingestion column mapping.

`lib/mapping-governance/manual-remap-service.ts` is **byte-identical to baseline** —
`git diff --stat 0bc14f6e -- <that file>` is empty, asserted in the suite via git rather than a
regex (the file's own header legitimately names WP-066 in its reservation clause). WP-066 imports
nothing from it and creates no Case or governance event. No semantic overlap.

## 7. ARCHITECTURE

The object persisted is the existing B27 column mapping — `Record<sourceHeader, CanonicalIntakeField>`
from `lib/data-intake/column-mapping.ts`. Not the BCM classifier (`COMPANY-010` KEEP), not normative
mapping, not pillar/care-economy mapping, not WP-029's Case object.

**Save** rides on the existing `POST /api/admin/data-intake/accept` via an optional
`saveMappingName` field. What persists is `effectiveMapping` — the mapping the route itself
reconstructed and applied — never the raw client value, and only after a real batch was accepted.
No new write endpoint: one would have persisted an unvalidated client mapping.

**List** is the single new route `GET /api/admin/data-intake/saved-mappings?tenantCode=`. It exists
because `upload-preview` never receives a tenantCode and so cannot host it — mechanically required,
not symmetry.

## 8. DATA MODEL

```
analytics.saved_column_mapping
  id           uuid PK default gen_random_uuid()
  tenant_id    uuid NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE
  mapping_name text NOT NULL
  mapping      jsonb NOT NULL
  created_at   timestamptz NOT NULL default now()
  updated_at   timestamptz NOT NULL default now()   (trigger-maintained)
  created_by   text
  CONSTRAINT saved_column_mapping_name_not_blank
  CONSTRAINT saved_column_mapping_shape   CHECK (kora.saved_column_mapping_valid(mapping))
  CONSTRAINT saved_column_mapping_unique_name_per_tenant UNIQUE (tenant_id, mapping_name)
```

No speculative field. Nothing was added for a hypothetical future sharing capability.

`kora.saved_column_mapping_valid()` is `IMMUTABLE PARALLEL SAFE` (migration 089's precedent) and
admits only a non-empty flat object whose every value is one of the 17 canonical intake field names,
spelled literally. **Row values, samples, pseudonyms, payloads and the two UI sentinels
(`ignore`, `keep_original`) are structurally impossible to persist** — proven live in RLS-28.

## 9. MIGRATION

**`090_saved_column_mapping_tenant_scoped.sql`** — ADDITIVE / EXPAND ONLY. No DROP, no ALTER of an
existing object, no backfill. High-water verified mechanically before creation (089 at baseline and
on this line) and after (090). `analytics.source_batch.payload_sample` was deliberately **not**
reused: it is documented as an operator-debugging sample.

## 10. RLS — LEAST PRIVILEGE (Founder ruling, 2026-09-22)

Final state, verified live against local Postgres:

- **Exactly one policy:** `saved_column_mapping_kora_admin_all` — `FOR ALL USING (kora.kora_role() = 'KORA_ADMIN')`
- **Grants:** `service_role` SELECT/INSERT/UPDATE; `authenticated` **SELECT only**; no INSERT/UPDATE/DELETE to any tenant role
- `ENABLE` + `FORCE` ROW LEVEL SECURITY

**Why Company roles have no direct SELECT.** WP-066 ships no Company-facing Saved Mapping surface.
Tenant ownership is a persistence and authorization boundary, not evidence that Company users need
to read the rows. An earlier draft carried a `company_own_read` policy "for architectural
consistency"; it was removed on the ruling. Granting for a hypothetical future UI is exactly the
broadening the ruling forbids.

**One correction made during this closure, disclosed.** Removing the `authenticated` table grant
entirely was tried first. It made the KORA_ADMIN policy unreachable on a user-JWT path and turned
every denial into `permission denied` rather than an empty result — contradicting the ruling's own
first line (*"KORA_ADMIN: authorized operational access"*). The grant was restored at table level
only; the single policy, not the grant, decides row visibility.

## 11. DUPLICATE MAPPING NAME — BEFORE / AFTER

**Before (defect):** the service used
`.upsert({...}, { onConflict: 'tenant_id,mapping_name' })` — a **silent overwrite**. Saving under an
existing name replaced that Company's stored mapping with no signal.

**After (Founder ruling 2026-09-22):** a plain `.insert()`. The `(tenant_id, mapping_name)` unique
constraint is the authority and its violation (`23505`) is surfaced as `duplicate_name`. The
existing row is left exactly as it was — not overwritten, not updated, not merged, not
auto-versioned, not suffixed, never duplicated. Updating a Saved Mapping is deliberately not a
WP-066 capability.

**Proof of no silent overwrite** (live, local Postgres):

```
A persisted: {"col_a":"amount"}
B rejected:  true   code: 23505
rows still:  1      A unchanged: true
```

Guarded three ways: the service has no `upsert`/`onConflict`/`.update(`/`.delete(` at all; RLS-28
asserts the constraint rejects the duplicate and the original mapping is byte-equal afterwards; and
the unit suite asserts the surfaced reason and its propagation.

**Product behaviour.** The Operator is warned *while typing* — the field turns amber with
*"Esiste già una mappatura con questo nome per questa Company. Scegli un altro nome: quella
esistente non verrà sovrascritta."* — and again after accept, where a notice states the batch was
created normally and the existing mapping was not modified. A different Company may freely use the
same name.

## 12. COPY-ON-USE

`applySavedMappingToHeaders` returns a **new** object; the UI merges it with
`setUserMapping(prev => ({...prev, ...applied}))`. The persisted row is never handed out by
reference and never mutated by later session edits. Persisting an update always requires another
explicit save. No implicit learning — guarded against `autoSave`, `learnMapping`, `implicitSave`.

## 13. MISMATCH / FALLBACK

No schema fingerprint, no compatibility judgement — guarded against
`fingerprint|autoApply|autoMatch|isCompatible`. Only headers present in the current upload are
prefilled; saved headers absent from the file are reported (*"ignorate, nessun blocco"*); new
headers are mapped normally. A difference is never an error and never blocks the upload. Verified
live: 7 of 8 applied, `centro_di_costo` reported, `ore_erogate` mapped normally.

## 14. NON-BLOCKING

`92` §19's own classification — `PILOT-USEFUL, NON-BLOCKING`. Saving is optional; applying is
optional; a failed save never fails the batch (no `return`/`throw` in the save block, only a logged
reason); a failed list never disturbs the mapping workflow; an unknown Company or empty list is an
empty array, never an error. Ingestion never requires a Saved Mapping.

## 15. SAVE / REUSE INTERACTION

Inside the existing Admin Data Intake mapping step. No dashboard, no catalogue, no Company-facing
surface, no `/company/data/upload` resurrection. `COMPANY-009` (self-service upload) is `WP-028`'s
and was not entered.

## 16. PRIVACY / TENANT ISOLATION

**The historical `Privacy/Trust: N/A` field on this package was insufficient for Reading 1** and is
recorded as such. The implemented invariant is concrete:

> **Saved Mapping content never crosses tenants.**

Enforced at three layers: the CHECK (only canonical field names may be stored), RLS (one KORA_ADMIN
policy, no tenant-role path, no cross-tenant policy), and the service (every query filtered by a
tenant id resolved server-side from a tenant *code*; a raw `tenantId` is never accepted from
request input). No broad Registry taxonomy rewrite was performed.

## 17. AUDIT / PROVENANCE

Existing conventions only — a `saved_column_mapping_saved` row in `audit.audit_log` carrying tenant,
actor, mapping name, field count and the source batch id, alongside the batch's own events. **No
source row values and no worker data** in the payload. Row-level provenance is the row itself
(`tenant_id` + `created_by` + `created_at`). No new audit framework; no cross-Company promotion
provenance, because cross-Company templates are out of scope.

## 18. MAPPING WORKSPACE REMEDIATION

Founder Visual Acceptance was withheld once. The mapping step was recomposed into a Mapping
Workspace with five explicit levels — context (Company name at 22px, tenant/file/columns/period
secondary) · Saved Mapping state and primary action (four states: none / available / applied /
partial mismatch with three separated groups) · the column table · diagnostics · secondary controls.
Successful rows are silent; rows needing the Operator carry an amber tint, a left bar and bold
confidence. Three optional inputs (missing-field diagnostics, manual completion, financial metadata)
became progressive-disclosure sections; **the mandatory pseudonymization declarations and the
batch-creation gate were deliberately not collapsed**. This route's own canvas widened
`max-w-4xl` → `max-w-6xl`; no global layout or navigation change, and no WP-070 redesign.

## 19. THE `< 0.9` EMPHASIS RULE IS PRESENTATION-ONLY

Mechanically verified. Every use of `exception` resolves to `background`, `color`, `fontWeight`,
`boxShadow`, `border`, `padding` or a display count. It never reaches `setUserMapping`, any other
setter, `fetch`, `fd.append`, `JSON.stringify`, the accept handler, `currentVal`, or `userMapping[]`
— asserted as a negative so the guard cannot rot. The threshold appears in **no** service, route or
migration file, and `lib/data-intake/column-mapping.ts` (the suggester) is **byte-identical to
baseline**. It changes no suggested mapping, accepted field, validation, eligibility, ingestion
acceptance, persistence, application, copy-on-use, mismatch handling, PII check, `source_batch`
state or scoring. 0.9 is not invented: it is the host's own pre-existing "green" boundary for that
column.

## 20. FOUNDER VISUAL ACCEPTANCE — GRANTED 2026-09-22

Accepted evidence: no Saved Mapping · available · applied · partial mismatch · exception rows ·
1100 responsive · 768 responsive, plus the duplicate-name conflict state captured for this closure.
Overflow false at 1100 and 768; zero console errors in every run. Accepted characteristics: Mapping
Workspace visually dominant, Company context obvious, Saved Mapping state prominent, successful rows
quiet, exceptions louder, table readable, diagnostics and secondary controls subordinate, no broad
WP-070 redesign, legacy host accepted as outside WP-066 scope.

## 21. TESTS

**New:** `tests/unit/kora-wp-066-saved-mappings.test.ts` (**58**) and
`tests/integration/rls-28-saved-column-mapping-cross-tenant.test.ts` (**21**, wired into CI's
mandatory RLS step).

**Intentional test-mechanism supersessions**, all semantic-guarantee-preserving or stronger:
- `tenant-isolation` — registered the new route's delegate via the file's own whitelist mechanism, and made it **stronger** by also asserting the delegate performs the `analytics.tenant` lookup.
- `pilot-trust-01-service-role-guard` — allowlist entry with a real justification, exactly as that guard's header prescribes.
- Four ceiling assertions (`042`, `044`, `112`, `113`) converted from `toBe(89)` to `toBeGreaterThanOrEqual(89)` — the repository's own documented remedy (WP-029's test: *"never equality, same disclosed pattern already fixed for WP-011/WP-120/WP-013/WP-046"*).
- Four WP-066 guards written against the intermediate implementation were rewritten when the Founder's two rulings superseded them (upsert→conflict; Company read policy→removed). Each carries an inline `SUPERSEDED BY FOUNDER RULING` note stating why the new form is equal or stronger.
- The `< 0.9` presentational guard was inverted from a style allow-list to a non-presentational deny-list, because an allow-list needed widening for every new CSS form.

## 22. FINAL VERIFICATION — ACTUAL RESULTS

| Gate | Result |
|---|---|
| WP-066 focused suite | **58 passed / 0 failed** |
| RLS-28 (live, local Postgres) | **21 passed / 0 failed** |
| Focused closure battery (15 suites: WP-029, tenant-isolation, service-role guard, origin guards ×2, route-privacy, b-truth intake, WP-073, WP-125, golden-path/operator-flow/boundary/UX/selectors) | **820 passed / 0 failed** |
| Full Vitest | **422 files · 13,500 passed · 0 failed** (345 skipped, 5 todo) |
| `tsc --noEmit` | **0** |
| ESLint (changed files) | **0** |
| `next build` | **0** — compiled successfully |

## 23. CHANGED FILES — 14 (9 modified, 5 new)

```
M  .github/workflows/ci.yml                                            (RLS-28 registration, 3 lines)
M  app/admin/data-intake/_components/DataIntakeStudio.tsx
M  app/api/admin/data-intake/accept/route.ts
M  tests/unit/kora-wp-042-fee-independence-guard.test.ts               (ceiling)
M  tests/unit/kora-wp-044-security-hardening-batch.test.ts             (ceiling)
M  tests/unit/kora-wp-112-material-change-layer.test.ts                (ceiling)
M  tests/unit/kora-wp-113-transformation-ledger-morphogenesis.test.ts  (ceiling)
M  tests/unit/pilot-trust-01-service-role-guard.test.ts                (allowlist entry)
M  tests/unit/tenant-isolation.test.ts                                 (delegate registration)
A  app/api/admin/data-intake/saved-mappings/route.ts
A  lib/saved-mappings/saved-mapping-service.ts
A  supabase/migrations/090_saved_column_mapping_tenant_scoped.sql
A  tests/integration/rls-28-saved-column-mapping-cross-tenant.test.ts
A  tests/unit/kora-wp-066-saved-mappings.test.ts
```

Verified clean: Registry 142, `CLAUDE.md`, WP-029 service, `app/company/**`, `app/advisor/**`,
`app/worker/**`, `app/partner/**`, `components/**`, `services/**`, `middleware.ts`,
`next.config.ts`, `package.json`, WP-070 implementation, commercial/entitlement code, Gate 3,
production config.

## 24. SECRETS SCAN

**Zero credential matches.** Three project-ref occurrences exist in the staged diff — all inside
RLS-28's safety **deny-list**, which refuses to run against staging or production, copied verbatim
from RLS-21/22/23 which already carry those lines. They are refs used to block, not to connect. Only
`.ts`/`.tsx`/`.sql`/`.yml` files are staged; no screenshot, scratch artifact, fixture, temporary env
or `node_modules`. The temporary local-only `.env.local` used for the visual pass was deleted and is
gitignored; no staging credential was ever used (the repo's own `.env.local`, which points at
staging, was discarded unread rather than reused).

## 25. LINEAGE

Parent `0bc14f6e484110ce65be8aa0c185a68208057359` (WP-125); exactly **one** commit beyond baseline;
WP-039, WP-012, WP-048, WP-063, WP-049, WP-064 and Gate 3 each verified **NOT** ancestors; branch
`feature/kora-wp-066-saved-mappings`; worktree clean; no upstream configured.

## 26. REGISTRY RECOMPUTATION

Re-parsed programmatically: **125 nodes · 197 hard edges · 5 conditional edges · 4 scope triggers
(all inactive) · 0 cycles · 0 self-dependencies · 0 dangling references.**
`066`'s Hard Deps = `{029}` (COMPLETE). **Dependents of `066`: NONE** — no Section C row lists it as
a dependency and no Section D conditional edge references it, so it **unlocks nothing**.

| | Before | After |
|---|---|---|
| COMPLETE | 62 | **63** |
| READY | 30 | **29** |
| BLOCKED | 33 | **33** |
| TOTAL | 125 | **125** |

`KORA-WP-019` keeps its defer overlay and remains mechanically READY; `KORA-WP-117` keeps its
deferral; the `KORA-WP-120` inconsistency is untouched and remains open.

## 27. EXPLICIT OUT OF SCOPE

Cross-Company templates, global KORA mapping catalogue, promotion/sanitization pipeline,
Company-authored cross-tenant-readable objects, shared mutable mapping objects, template
marketplace · Company self-service upload (`COMPANY-009` / `WP-028`) · `/company/data/upload` ·
Saved Mapping dashboard · mapping lifecycle (draft/archive/superseded/versions) · recommendation or
learning engine · automatic application · incremental connectors (`WP-085`) · Data Intake Studio
redesign (`WP-070`) · classifier changes (`COMPANY-010` KEEP) · entitlement, pricing, plan gating,
feature flags, Foundation Light behaviour, demo runtime.

## 28. NO PUSH

Local only. Nothing pushed, merged or rebased. PR #172, remote Supabase, Vercel, staging, Production
and Gate 3 were not contacted or modified. `scripts/provision-next-review.mjs` was never addressed.

---

**KORA-WP-066 — COMPLETE — FOUNDER VISUAL ACCEPTANCE GRANTED 2026-09-22 — LOCAL COMMIT `49590ca` — NOT PUSHED**
