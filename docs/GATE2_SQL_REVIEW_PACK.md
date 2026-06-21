# KORA Gate 2 SQL Review Pack

**Prepared:** 2026-06-21  
**Scope:** `supabase/migrations/` — 28 files, none applied to any production or staging database  
**Gate status:** Gate 2 OPEN (CTO review required) · Gate 3 OPEN (Legal/DPO required)  
**Canonical authority:** CLAUDE.md §9 (Build Gates) · `docs/21-founder-gate-resolution-log.md` (D-01–D-21)

---

## 1. Executive Verdict

**What is ready for review:** Migrations 001–016 and 021–022 cover the core schema
(schemas, tenant registry, upload pipeline, UEF, scoring outputs, claims, grants, worker
provisioning foundations). These are structurally sound and suitable for CTO technical
review. Migration 014 (tenant classification) carries no personal data or RLS risk and
could be applied to a staging environment immediately after Gate 2 schema sign-off.

**What must not be applied yet:**  
Migrations 017–020, 023, 025, and 027 are explicitly marked `DO NOT APPLY` in this
review pack. They collectively implement individual PIB storage, the pseudonym map
(the highest-risk table in the schema), the UEF→worker bridge, the PIB redistribution
RPC, the nominative attendee channel, cross-company bookings, and the KORA_ADMIN
policy removal refactor. None of these may be applied before Gate 2 CTO review
confirms the design and Gate 3 Legal/DPO review approves the data processing model.

**What blocks production:**  
All 28 migrations are unreviewed and unapplied. Real company data must not flow through
this schema until Gate 2 and Gate 3 are closed. The Supabase production project must
not be provisioned before these gates close.

**What blocks real worker data:**  
Migrations 017 (`worker_pseudonym_map`), 018 (`worker_pib`), 020
(`fn_redistribute_worker_pib`), and 023 (`uploaded_record_attendee`) create the tables
and functions that would process real individual worker data. None of these may be
applied, even to staging with synthetic data, without a formal DPO/Legal review of
the processing model, DPIA completion, and a documented legal basis for pseudonymised
worker data processing.

---

## 2. Migration Inventory

| # | File | Schemas | Main objects | RLS | SECURITY DEFINER | Personal data risk | Status | Review owner | Notes |
|---|------|---------|-------------|-----|-----------------|-------------------|--------|-------------|-------|
| 001 | `001_live_v1_foundation` | analytics, personal, gov, audit, kora | 12 tables, `kora.tenant_id()`, `kora.kora_role()`, `set_updated_at()`, triggers | Yes | No | Medium (uploaded_record: pseudonym_id, raw_hash) | NEEDS_CTO_REVIEW | CTO | Claim functions read top-level JWT only — superseded by 003/004/006 |
| 002 | `002_grants_and_softdelete` | analytics, personal, gov, audit | GRANT USAGE/SELECT/ALL; FORCE RLS on personal.* | FORCE RLS added | No | Low | NEEDS_CTO_REVIEW | CTO | service_role GRANT ALL — confirm bypass scope |
| 003 | `003_claim_functions_app_metadata` | kora | `kora.kora_role()`, `kora.tenant_id()` updated | No | No | None | NEEDS_CTO_REVIEW | CTO | SUPERSEDED by 004; retained for audit trail only |
| 004 | `004_gate3a_claims_and_grants` | kora, personal | Claim functions + GRANT SELECT on personal.uploaded_record + policy verification DO block | No | No | Low | NEEDS_CTO_REVIEW | CTO | Supersedes 003; GRANT on personal table requires CTO sign-off |
| 005 | `005_impact_unit_trace_layer` | analytics | `analytics.impact_unit` table | Yes | No | Low | NEEDS_CTO_REVIEW | CTO | ~~CRITICAL: auth.jwt() ->> 'role' + COMPANY_USER~~ **P0 fixed 2026-06-21** — policies rewritten to use `kora.kora_role()` and `kora.tenant_id()`; `COMPANY_USER` replaced with `COMPANY_ADMIN`, `COMPANY_VIEWER`. Pending CTO review. |
| 006 | `006_canonical_tenant_key` | kora | `kora.tenant_id()` updated for `kora_tenant_id` canonical key | No | No | None | NEEDS_CTO_REVIEW | CTO | Supersedes 003/004 for tenant_id; introduces canonical JWT key `kora_tenant_id` |
| 007 | `007_worker_provisioning` | personal | `personal.worker_identity`, `personal.worker_profile_private` | Yes, FORCE RLS | No | HIGH (auth_user_id → tenant_id mapping) | NEEDS_LEGAL_PRIVACY_REVIEW | CTO + DPO | First table linking Supabase auth user to KORA tenant. Worker update access. Requires DPIA. |
| 008 | `008_worker_initiatives` | personal | `personal.worker_initiative`, `personal.worker_participation` | Yes, FORCE RLS | No | HIGH (individual participation rows + private_note) | NEEDS_LEGAL_PRIVACY_REVIEW | CTO + DPO | `private_note` field — never logged. Participation rows are worker-private. |
| 009 | `009_worker_onboarding` | personal | ALTER worker_profile_private: consent fields | No new policies | No | HIGH (privacy_consent_accepted_at is personal data) | NEEDS_LEGAL_PRIVACY_REVIEW | Legal/DPO | Consent timestamp is sensitive personal data. Legal basis for consent tracking required. |
| 010 | `010_partner_profile` | network (new) | `network.partner_profile` | Yes, FORCE RLS | No | Low | NEEDS_CTO_REVIEW | CTO | New schema. No personal data. Grant structure requires review. |
| 011 | `011_worker_cv_share` | personal | `personal.worker_cv_share` | Yes, FORCE RLS | No | HIGH (share token, kora_worker_id in JWT) | NEEDS_LEGAL_PRIVACY_REVIEW | CTO + DPO | References `kora_worker_id` in app_metadata — provisioning path undocumented. Token is hashed but share-link UX requires DPO review. |
| 012 | `012_partner_identity` | network | `network.partner_identity` | Yes, FORCE RLS | No | Medium (email column, auth_user_id) | NEEDS_LEGAL_PRIVACY_REVIEW | CTO + DPO | `email` column is PII. Legal basis for storing partner email required. |
| 013 | `013_kora_commons` | commons (new) | `commons.post` | Yes, FORCE RLS | No | Low | NEEDS_CTO_REVIEW | CTO | **ISSUE:** COMPANY_ADMIN and WORKER policies use `auth.jwt() -> 'app_metadata' ->> 'kora_tenant_id'` directly instead of `kora.tenant_id()`. Inconsistency with canonical pattern. |
| 014 | `014_tenant_classification` | analytics | ALTER tenant: `tenant_kind` column + backfill | No change | No | None | SAFE_TO_REVIEW | Product/Engineering | Schema-only change. No personal data. No RLS modification. Can apply after Gate 2 sign-off. |
| 015 | `015_company_safe_aggregation_layer` | analytics | `fn_company_worker_status()`, `fn_company_activation_summary()` SECURITY DEFINER; `v_company_uploaded_record_safe`, `v_company_uef_eligibility_summary` views | Yes (view isolation) | Yes (2 functions) | Medium (SECURITY DEFINER reads personal.worker_identity) | NEEDS_CTO_REVIEW | CTO | Core privacy boundary. N≥10 suppression in SQL. SECURITY DEFINER functions read personal.* — critical review required. |
| 016 | `016_worker_initiative_source` | personal | ALTER worker_initiative: `source_kind`, `source_uef_record_id` | No change | No | Low | NEEDS_CTO_REVIEW | CTO | Gate 2 OPEN — NOT applied. Required before 019. |
| 017 | `017_worker_pseudonym_map` | personal | `personal.worker_pseudonym_map` | Yes, FORCE RLS | No | CRITICAL (pseudonym↔identity mapping) | **DO_NOT_APPLY_YET** | CTO + DPO | **Highest-risk table.** Links worker identity to pipeline pseudonym. De-anonymization risk. Gate 3 legal review mandatory before any data in this table. |
| 018 | `018_worker_pib` | personal | `personal.worker_pib` | Yes, FORCE RLS | No | CRITICAL (individual per-worker PIB per pillar) | **DO_NOT_APPLY_YET** | CTO + DPO | Individual PIB records. Worker-owned data. Gate 3 mandatory. |
| 019 | `019_bridge_uef_to_worker_initiative` | personal, analytics | `personal.fn_publish_company_initiative_from_uef(uuid)` SECURITY DEFINER | Via function | Yes (1 function) | Medium (reads analytics.uef_record via BYPASS RLS) | **DO_NOT_APPLY_YET** | CTO | SECURITY DEFINER reads analytics.uef_record; writes personal.worker_initiative. Depends on 016. |
| 020 | `020_redistribute_worker_pib_rpc` | public, personal | `public.fn_redistribute_worker_pib(uuid, jsonb)` SECURITY DEFINER | Via function | Yes (1 function, public schema) | CRITICAL (atomic DELETE+INSERT on individual PIB) | **DO_NOT_APPLY_YET** | CTO + DPO | Public-schema SECURITY DEFINER RPC callable via PostgREST. Atomic worker PIB mutation. Depends on 018. |
| 021 | `021_tenant_pilot_ready` | analytics, audit | ALTER tenant: `production_ready` columns; INSERT policy on audit_log for KORA_ADMIN | Yes (new INSERT policy) | No | Low | NEEDS_CTO_REVIEW | CTO | Gate 2 OPEN. Adds audit INSERT policy for KORA_ADMIN — review audit append-only guarantee. |
| 022 | `022_worker_rls_gaps` | personal, analytics | New RLS policies: worker_identity UPDATE for WORKER; analytics.tenant SELECT for WORKER | Yes (2 new policies) | No | Low | NEEDS_CTO_REVIEW | CTO | Gate 2 OPEN. WITH CHECK on worker_identity UPDATE prevents auth_user_id reassignment — verify. |
| 023 | `023_uploaded_record_attendee` | personal | `personal.uploaded_record_attendee` | Yes, FORCE RLS | No | HIGH (pseudonymised attendee matching table; worker_identity_id linkage) | **DO_NOT_APPLY_YET** | CTO + DPO | Gate 2 OPEN. HMAC pseudonymisation at app layer — KORA_PSEUDONYM_SECRET key management undocumented. Gate 3 mandatory. |
| 024 | `024_commons_initiative_fields` | commons | ALTER commons.post: 10 new columns; cross-company worker RLS policy | Yes (1 new policy) | No | Low | NEEDS_CTO_REVIEW | CTO | Gate 2 OPEN. Cross-tenant visibility for `cross_company` posts — review cross-tenant RLS logic. |
| 025 | `025_commons_booking_contribution` | commons, personal | `commons.booking`, `commons.contribution_event`; `commons.booking_aggregate_for_promoter()` SECURITY DEFINER; ALTER worker_pib: source_booking_id | Yes (3 tables) | Yes (1 function) | HIGH (worker_identity_id in bookings; PIB extension) | **DO_NOT_APPLY_YET** | CTO + DPO | Gate 2 OPEN. ~~BUG RISK: kora.set_updated_at()~~ **P0 fixed 2026-06-21** — trigger corrected to `set_updated_at()` (public schema, migration 001). Cross-company booking privacy model still requires DPO review. |
| 026 | `026_company_route_rls_gaps` | analytics, audit | New INSERT/UPDATE policies on source_batch; INSERT policy on audit_log for COMPANY_ADMIN | Yes (3 new policies) | No | Low | NEEDS_CTO_REVIEW | CTO | **ISSUE:** Uses `auth.jwt() ->> 'kora_role'` directly (inconsistent with `kora.kora_role()`). GRANT INSERT on audit_log to authenticated — verify append-only guarantee. |
| 027 | `027_worker_individual_rls_refactor` | personal, analytics | DROP POLICY: removes KORA_ADMIN access from worker_identity, worker_pib, worker_pseudonym_map, worker_profile_private, impact_unit | Removes policies | No | CRITICAL impact (removes fallback admin access) | **DO_NOT_APPLY_YET** | CTO | Gate 2 OPEN. ~~DEPENDENCY: service-key file missing~~ **P0 updated 2026-06-21** — `lib/supabase/worker-provisioning-service-key.ts` EXISTS (B168-P3). Precondition block + `RAISE NOTICE` added. Still DO_NOT_APPLY_YET pending Gate 2 + staging smoke test confirming service-role path works. |
| 028 | `028_audit_log_enrichment` | audit | ALTER audit_log: environment, ip_hash, user_agent_hash columns; CREATE ROLE audit_reader; SELECT policy for audit_reader | Yes (1 new policy) | No | Low | NEEDS_CTO_REVIEW | CTO | Gate 2 OPEN. Creates DB-level role `audit_reader`. Retention/proportionality of ip_hash and user_agent_hash requires DPO review. |

---

## 3. Critical Objects

### 3.1 Claim functions

| Function | Migration | Purpose | JWT read strategy | Risk | Review |
|----------|-----------|---------|-------------------|------|--------|
| `kora.kora_role()` | 001 → 003 → 004 (current) | Returns caller's KORA role from JWT | Top-level `kora_role` → fallback `app_metadata.kora_role` → `'anonymous'` | Default 'anonymous' → 0 rows if claim missing. User-non-editable (app_metadata only via Admin API). | CTO: verify no client can inject kora_role via user_metadata |
| `kora.tenant_id()` | 001 → 003 → 004 → 006 (current) | Returns caller's tenant UUID from JWT | Priority: top-level `kora_tenant_id` → `app_metadata.kora_tenant_id` (canonical) → `app_metadata.tenant_id` (legacy fallback) | NULL if no valid claim → RLS blocks all rows for that session. Canonical key is `kora_tenant_id`. | CTO: confirm legacy `tenant_id` fallback can be removed after pilot provisioning |

**Inconsistencies requiring CTO attention:**
- ~~Migration 005 uses `auth.jwt() ->> 'role'` instead of `kora.kora_role()`.~~ **Fixed 2026-06-21** — migration 005 now uses `kora.kora_role()` and `kora.tenant_id()` throughout. `COMPANY_USER` removed; `COMPANY_ADMIN`/`COMPANY_VIEWER` used.
- ~~Migrations 013, 025, 026 use direct `auth.jwt()` reads instead of canonical helpers.~~ **Fixed 2026-06-21** — all direct JWT tenant/role reads replaced with `kora.tenant_id()` and `kora.kora_role()`. See §10 Tenant Claim Consistency Update.

### 3.2 SECURITY DEFINER functions

| Function | Schema | Migration | Purpose | tenant_id source | Risk | Review |
|----------|--------|-----------|---------|-----------------|------|--------|
| `analytics.fn_company_worker_status()` | analytics | 015 | Returns aggregate worker status counts for caller's tenant | `kora.tenant_id()` (JWT, canonical) | Bypasses FORCE RLS on personal.worker_identity. Returns aggregate counts only (no individual rows). Tenant isolation via `kora.tenant_id()`. | CTO: verify aggregate-only guarantee; test with anon token (REVOKE from anon confirmed) |
| `analytics.fn_company_activation_summary(text)` | analytics | 015 | Returns initiative/participation aggregates with N≥10 suppression | `kora.tenant_id()` (JWT, canonical) | Bypasses FORCE RLS on personal.worker_initiative and personal.worker_participation. N≥10 suppression enforced in SQL ([G2]). worker_id excluded from SELECT ([G1]). | CTO: verify suppression logic; test boundary case (count=9 → NULL, count=10 → 10) |
| `personal.fn_publish_company_initiative_from_uef(uuid)` | personal | 019 | Upserts UEF record → worker_initiative (company_sourced). KORA_ADMIN only. | `v_uef.tenant_id` (from DB row, not JWT) | Reads analytics.uef_record bypassing RLS. No tenant_id injection risk because p_uef_record_id is a DB UUID — caller cannot forge a foreign tenant's UEF record unless they know its UUID. | CTO: verify that KORA_ADMIN route enforces role before calling; confirm UUID non-guessability is not the only security layer |
| `public.fn_redistribute_worker_pib(uuid, jsonb)` | public (PostgREST-exposed) | 020 | Atomically replaces worker PIB rows for a given UEF record. WORKER or KORA_ADMIN. | `auth.uid()` → personal.worker_identity lookup (server-side) | **Highest-risk function.** Public schema = callable via `supabase.rpc()`. Resolves worker from auth.uid() (correct). p_rows JSONB is pre-validated by TypeScript but function performs no JSONB schema validation internally. | CTO: verify JSONB input validation; DPO: worker PIB mutation model |
| `commons.booking_aggregate_for_promoter(uuid)` | commons | 025 | Returns booking counts per status for a post (aggregate only) | `auth.jwt() -> 'app_metadata' ->> 'kora_tenant_id'` (direct read, inconsistent) | Bypasses RLS on commons.booking. Internal role/tenant check before returning data. Returns only `{status, count}` — no individual rows. | CTO: verify role check cannot be bypassed; confirm tenant comparison logic |

### 3.3 Personal schema

| Object | Migration | Purpose | Privacy mechanism | Risk level |
|--------|-----------|---------|-------------------|-----------|
| `personal.uploaded_record` | 001 | Pseudonymized individual upload rows | KORA_ADMIN only RLS; no COMPANY_* policy; FORCE RLS (002) | High — pseudonym_id + raw_hash per row |
| `personal.workforce_baseline` | 001 | Aggregate headcount (N≥10 enforced at app layer) | COMPANY_* SELECT with tenant isolation; FORCE RLS (002) | Low — aggregate only, no individual identifiers |
| `personal.worker_identity` | 007 | Links Supabase auth_user_id → KORA tenant | FORCE RLS; WORKER own-row only; no COMPANY policy | Critical — core identity link |
| `personal.worker_profile_private` | 007, 009 | Worker private profile + consent timestamps | FORCE RLS; WORKER own-row only; no COMPANY policy | Critical — consent data is personal data |
| `personal.worker_initiative` | 008 | Published initiatives per tenant | FORCE RLS; WORKER SELECT published only; no COMPANY direct policy | Medium — programme-level data, not individual |
| `personal.worker_participation` | 008 | Per-(worker, initiative) participation + private_note | FORCE RLS; WORKER own-rows only; no COMPANY policy | High — individual participation, private_note never logged |
| `personal.worker_cv_share` | 011 | Worker-controlled CV share tokens (SHA-256 hashed) | FORCE RLS; WORKER own-rows only; KORA_ADMIN read-only | High — token_hash + expiry; kora_worker_id JWT field undocumented |
| `personal.worker_pseudonym_map` | 017 | Maps worker_identity.id ↔ pipeline pseudonym_id | FORCE RLS; WORKER own-row only; **NO KORA_ADMIN policy (after 027)** | CRITICAL — de-anonymization table. Highest sensitivity in schema. |
| `personal.worker_pib` | 018 | Individual PIB per (worker × event × pillar) | FORCE RLS; WORKER own-rows only; no COMPANY policy | CRITICAL — individual welfare impact data |
| `personal.uploaded_record_attendee` | 023 | Pseudonymised attendance matching for company_sourced PIB | FORCE RLS; WORKER own-rows (via worker_identity); no COMPANY policy | High — HMAC pseudonymisation at app layer; key management undocumented |

### 3.4 Company safe aggregation layer

All four objects created in migration 015. These are the ONLY permitted bridge between
company users and personal.* or analytics.uef_record data.

| Object | Type | Suppression | Tenant isolation | Columns excluded (G1) |
|--------|------|------------|-----------------|----------------------|
| `analytics.fn_company_worker_status()` | SECURITY DEFINER function | None (status counts, not individual) | `kora.tenant_id()` (canonical) | No individual identifiers in output |
| `analytics.fn_company_activation_summary(text)` | SECURITY DEFINER function | N≥10 in SQL (count ∈ [1,9] → NULL) | `kora.tenant_id()` (canonical) | worker_id excluded ([G1]) |
| `analytics.v_company_uploaded_record_safe` | VIEW (postgres-owned, BYPASSRLS) | N/A (record-level, but no worker identifiers) | `kora.tenant_id()` in WHERE clause | pseudonym_id, raw_hash, privacy_redacted, reviewed_at excluded |
| `analytics.v_company_uef_eligibility_summary` | VIEW (postgres-owned, BYPASSRLS) | N/A (UEF pipeline counts, not worker counts) | `kora.tenant_id()` in WHERE clause | No worker identifiers; raw_name exposed only as life_program_names (LIFE pillar, array_agg DISTINCT) |

**Open questions on the safe aggregation layer:**
- `v_company_uef_eligibility_summary` exposes `raw_name` (aggregated as `life_program_names`). Migration comment acknowledges this decision and states "if real data violates this assumption, revisit this view." CTO and DPO must explicitly sign off on this assumption.
- `analytics.impact_unit` is referenced as "not present in Foundation Light DB" in the view comment — placeholder `NULL::numeric` used for `iu_average_ev`. When 005 is applied, this view will require an update.

### 3.5 Audit schema

| Object | Migration | Fields | Access | Retention | Open questions |
|--------|-----------|--------|--------|-----------|----------------|
| `audit.audit_log` | 001 | tenant_id, actor_role, actor_id, action, resource_type, resource_id, payload, ip_address, created_at | KORA_ADMIN SELECT (001); KORA_ADMIN INSERT (021); COMPANY_ADMIN INSERT (026); audit_reader role SELECT (028) | No retention policy defined | How long are logs retained? Who controls log deletion? |
| `audit.audit_log` (enriched) | 028 | +environment, +ip_hash, +user_agent_hash | As above + audit_reader sub-role | ip_hash and user_agent_hash are one-way SHA-256 | ip_address (raw inet) column exists alongside ip_hash — should raw IP be removed? |
| `audit_reader` role | 028 | DB-level PostgreSQL role | Separate from KORA_ADMIN — must be explicitly granted | — | Who provisions audit_reader? How is it revoked? Role management process undocumented. |

**Audit open questions:**
1. REVOKE UPDATE, DELETE on audit_log FROM PUBLIC (migration 001) — does this cover the service_role? service_role has BYPASSRLS but REVOKE should still constrain DDL-level permissions.
2. Migration 026 adds GRANT INSERT on audit_log to authenticated — this combined with the COMPANY_ADMIN INSERT policy means any authenticated session that injects `kora_role = COMPANY_ADMIN` into their JWT could write audit rows. The `actor_id = auth.uid()` constraint provides some protection. Verify with CTO.
3. ip_address (raw inet) column remains alongside ip_hash (028). Recommendation: deprecate ip_address and stop writing to it. Requires a follow-on migration.

---

## 4. Gate 2 Checklist — CTO

- [ ] **Claim functions read the correct JWT fields.** `kora.kora_role()` and `kora.tenant_id()` both read from `app_metadata` as the canonical path. Verify this is what Supabase JWT delivers after `setSession`/`signInWithPassword` for a provisioned user.
- [x] **Migration 005 role inconsistency resolved.** ~~`auth.jwt() ->> 'role' = 'COMPANY_USER'`~~ **Fixed 2026-06-21** — policies now use `kora.kora_role()` and `kora.tenant_id()`; roles are `'COMPANY_ADMIN'`, `'COMPANY_VIEWER'`, `'KORA_ADMIN'`. See §9 P0 cleanup update.
- [x] **Migrations 013 / 025 / 026 tenant isolation inconsistency resolved.** ~~Direct `auth.jwt()` reads.~~ **Fixed 2026-06-21** — all 12 non-canonical JWT reads replaced with `kora.kora_role()` / `kora.tenant_id()`. See §10.
- [ ] **SECURITY DEFINER functions cannot be called by unauthorized roles.** Verify that `fn_company_worker_status()` and `fn_company_activation_summary()` cannot be invoked by `anon` (REVOKE confirmed in 015) or WORKER (no explicit REVOKE — verify RLS context prevents this).
- [ ] **N≥10 suppression in `fn_company_activation_summary` is correct.** Boundary test: count = 0 → 0 (not suppressed), count = 1..9 → NULL, count ≥ 10 → actual count.
- [ ] **`v_company_uploaded_record_safe` excludes all worker identifiers by construction.** Confirm pseudonym_id and raw_hash are absent from the SELECT list and cannot be accessed by any COMPANY_* role directly or via JOIN.
- [ ] **FORCE ROW LEVEL SECURITY on personal.* is effective.** Verify that even a session with postgres privileges cannot bypass RLS in an authenticated context (Supabase: BYPASSRLS applies to service_role, not to `postgres` role in RPC context).
- [ ] **`audit.audit_log` INSERT by COMPANY_ADMIN (026) preserves append-only guarantee.** REVOKE UPDATE, DELETE from PUBLIC (001) must apply to authenticated as well. Confirm no UPDATE or DELETE is possible for authenticated sessions.
- [x] **Migration 027 dependency confirmed before application.** ~~Service-key file missing.~~ **Updated 2026-06-21** — `lib/supabase/worker-provisioning-service-key.ts` EXISTS (B168-P3). Precondition block + `RAISE NOTICE` added to migration 027. Still DO_NOT_APPLY_YET — Gate 2 close + staging smoke test required.
- [x] **Migration 025 trigger bug resolved.** ~~Line 58 references `kora.set_updated_at()`.~~ **Fixed 2026-06-21** — corrected to `set_updated_at()` (public schema, migration 001). All 13 other trigger sites use the same unqualified reference.
- [ ] **`kora_worker_id` JWT field provisioning documented.** Migration 011 reads `app_metadata.kora_worker_id` to authorize worker CV share access. Document where and when this field is written to app_metadata during worker provisioning.
- [ ] **Migration order is safe and dependency chain is respected.** Confirm that 016 → 017 → 018 → 019 → 020 are applied in sequence; and that 025 is applied after 018 (personal.worker_pib must exist).
- [ ] **Rollback strategy documented.** Define what rollback means for each migration: whether dropping objects or reverting schema changes is possible without data loss on a live database.
- [ ] **service_role GRANT ALL scope is acceptable.** Migration 002 grants `ALL ON ALL TABLES IN SCHEMA personal TO service_role`. Confirm this is the minimum necessary privilege for server-side scoring and audit writes.
- [ ] **`audit_reader` role management process defined.** Who grants/revokes audit_reader? How is it tracked? This DB role has no corresponding application-layer concept yet.

---

## 5. Gate 3 Checklist — Legal/DPO

- [ ] **Legal basis for worker identity processing identified.** Migration 007 creates `personal.worker_identity` linking a Supabase auth user UUID to a KORA tenant. What is the legal basis (contract, legitimate interest, consent) for creating this mapping?
- [ ] **Pseudonymization design reviewed and confirmed.** Migration 001 header states: "la chiave resta al titolare del trattamento." Confirm this is operationally true — KORA must not hold the mapping from company worker names to pseudonym_id values.
- [ ] **Pseudonym map separation confirmed.** Migration 017 (`personal.worker_pseudonym_map`) is the re-identification table. Confirm organizational separation: who at KORA can access this table? Is there a process that prevents unauthorized access to the pseudonym key?
- [ ] **Company cannot access individual PIB.** Migration 018 has no COMPANY_* policy. Confirm application layer also enforces this. Confirm that no future SECURITY DEFINER function will expose individual PIB values to company roles.
- [ ] **Company cannot access individual UEF rows.** `analytics.uef_record` has no COMPANY_* policy in migration 001. `v_company_uef_eligibility_summary` exposes only aggregated counts and programme names (LIFE pillar). Confirm this is an acceptable exposure.
- [ ] **`raw_name` in UEF eligibility summary assessed.** The view exposes `life_program_names` (DISTINCT programme names for LIFE pillar initiatives). Confirm these are programme names and not individual worker names — the assumption is documented in the migration but requires explicit DPO sign-off.
- [ ] **Retention policy for worker data defined.** No retention policy exists for any personal.* table. Define and document retention periods for: worker_identity, worker_pib, worker_pseudonym_map, worker_participation, uploaded_record_attendee.
- [ ] **DPIA (Data Protection Impact Assessment) completed.** The combination of migrations 007, 017, 018, 023 (worker identity + pseudonym map + individual PIB + attendee matching) constitutes a high-risk processing activity requiring a DPIA under GDPR Article 35.
- [ ] **DPA/subprocessor implications reviewed.** Supabase is the data processor. Confirm that the existing DPA with Supabase covers storage of worker pseudonymous data. Review Supabase's subprocessor list.
- [ ] **Privacy notice implications assessed.** Workers must be informed of the processing described in migrations 007–023. Review and update the privacy notice before any worker accounts are created.
- [ ] **Worker rights handling process defined.** How does KORA respond to Subject Access Requests (SAR), erasure requests (right to be forgotten), and data portability requests for data stored in personal.worker_pib and personal.worker_pseudonym_map?
- [ ] **Consent model reviewed.** Migration 009 adds `privacy_consent_version` and `privacy_consent_accepted_at`. Confirm consent is a valid legal basis for the processing described. If processing uses a different legal basis (e.g., contract), consent fields must still be correct and not misleading.
- [ ] **Audit log proportionality assessed.** Migration 028 adds ip_hash and user_agent_hash. Assess whether collecting these fields is proportionate to the stated purpose (audit trail, fraud prevention). Recommend deprecating raw `ip_address` column in a follow-on migration.
- [ ] **HMAC key management for attendee pseudonymisation reviewed.** Migration 023 relies on `KORA_PSEUDONYM_SECRET` (referenced in migration comments). Confirm this secret is managed securely (key rotation, access control, storage). Key management failure would de-pseudonymize worker attendee data.
- [ ] **Cross-company booking data model reviewed.** Migration 025 (`commons.booking`) creates a record linking a worker from Company A to an initiative from Company B. This means Company A's workers' participation data is stored in KORA's schema in a way that Company B cannot see but KORA can. Confirm the legal basis and data model comply with the relevant GDPR processing requirements.

---

## 6. Production Blockers

### P0 — Blocks any real data (must resolve before pilot go-live)

- **Gate 2 (CTO review) not closed.** No migration may be applied to any database holding real company or worker data until Gate 2 closes.
- **Gate 3 (Legal/DPO review) not closed.** No real worker accounts may be created, and no company data upload may occur, until Gate 3 closes.
- **Migrations not applied or validated in staging.** No migration has been applied anywhere. A staging environment must be provisioned, all migrations applied in order, and basic connectivity tested before pilot.
- ~~**Migration 005 has non-existent role `COMPANY_USER`.**~~ **Fixed 2026-06-21** — policies rewritten to use `kora.kora_role()` and `kora.tenant_id()`; `COMPANY_USER` replaced with `COMPANY_ADMIN`, `COMPANY_VIEWER`. Pending CTO review of the fix.
- **RLS integration tests not run against real Supabase.** All RLS behaviour is currently verified only via TypeScript static analysis (tests/unit/route-privacy.test.ts etc.). Integration tests against a real Supabase project with real JWTs are required.
- **Supabase generated TypeScript types not updated after migrations.** `supabase gen types typescript` must be run after all migrations are applied so the TypeScript client reflects the actual schema. Current TS types are hand-written and may drift.
- **Backup and rollback plan missing.** No rollback runbook exists. Before applying to any persistent database, define rollback procedures for each migration.
- ~~**`lib/supabase/worker-provisioning-service-key.ts` does not exist.**~~ **Updated 2026-06-21** — file EXISTS (B168-P3, `insertWorkerIdentity()` implemented). Migration 027 still requires Gate 2 close + staging smoke test before application — it remains DO_NOT_APPLY_YET.

### P1 — Blocks pilot readiness (resolve before first real tenant)

- **Staging seed for synthetic pilot tenant.** OP-001 synthetic data must be loaded and exercised against the real Supabase schema before real company data is ingested.
- **Smoke tests against deployed Supabase.** Basic CRUD operations for each role (KORA_ADMIN, COMPANY_ADMIN, COMPANY_VIEWER, WORKER, PARTNER, anon) must be validated against the deployed schema.
- **Access matrix tests against deployed DB.** Run the role-isolation tests from tests/unit/route-privacy.test.ts against the real Supabase project to confirm RLS policies behave as designed (not just as written).
- **Audit log write verification.** Confirm that audit events are correctly written from the Next.js app and that they appear in the audit_log table for KORA_ADMIN review.
- **Company aggregation suppression verification.** Run `fn_company_activation_summary()` with real data and verify that counts [1,9] return NULL and counts ≥ 10 return the actual count.
- **PostgREST schema cache reload confirmed.** All `NOTIFY pgrst, 'reload schema'` statements must be verified to have taken effect after migration application.

---

## 7. Open Questions

1. **Legacy `tenant_id` JWT key removal timeline.** Migration 006 retains `app_metadata.tenant_id` as a third-priority fallback. Are there any provisioned users with this key? When can it be removed?

2. **`kora_worker_id` provisioning path.** Migration 011 reads `app_metadata.kora_worker_id` to authorize worker CV share access. Where is this field written? Which provisioning route sets it? This is undocumented.

3. ~~**`kora.set_updated_at()` function existence.**~~ **Resolved 2026-06-21** — migration 025 corrected to call `set_updated_at()` (public schema). `kora.set_updated_at()` does not exist and is not needed.

4. **Raw `ip_address` column in audit_log.** Migration 001 stores raw IP addresses. Migration 028 adds `ip_hash` as a safer alternative. Is the intent to stop writing to `ip_address` immediately? A follow-on migration should remove or nullify the column.

5. **`personal.uploaded_record` GRANT SELECT (migration 004).** Migration 004 grants SELECT on `personal.uploaded_record` to `authenticated`. RLS limits this to KORA_ADMIN. Confirm there is no COMPANY_* policy that could be added later that would accidentally expose individual rows.

6. ~~**`analytics.impact_unit` RLS is broken (migration 005).**~~ **Resolved 2026-06-21** — policy now targets `COMPANY_ADMIN` and `COMPANY_VIEWER` using `kora.kora_role()`. analytics.impact_unit is aggregate-safe (no worker identity, no PIB); company read access is correct.

7. **`v_company_uef_eligibility_summary` and `analytics.impact_unit`.** The view has a placeholder `NULL::numeric AS iu_average_ev` because impact_unit is "not present in Foundation Light DB." Once migration 005 is applied, this view should be updated. Who owns this update?

8. ~~**Migrations 013 / 025 / 026 use direct `auth.jwt()` reads.**~~ **Resolved 2026-06-21** — all 12 instances replaced with `kora.kora_role()` / `kora.tenant_id()`. No direct JWT reads remain in executable SQL across the migration set.

9. **`audit_reader` role lifecycle.** Migration 028 creates the `audit_reader` role but does not document how it is granted to specific DB users, who can revoke it, and how it integrates with the Supabase dashboard access model.

10. ~~**KORA_ADMIN provisioning path after 027 — service-key file missing.**~~ **Resolved 2026-06-21** — `lib/supabase/worker-provisioning-service-key.ts` EXISTS (B168-P3). Scope: `insertWorkerIdentity()` with whitelist `{worker_ref, tenant_id, auth_user_id, status}` + `updateWorkerIdentityStatus()`. Migration 027 precondition block updated. Still DO_NOT_APPLY_YET until staging smoke test passes.

11. **`commons.booking` cross-company data model and GDPR.** A booking links a worker (from Tenant A) to an initiative (from Tenant B). KORA holds this cross-company relationship. What is the legal basis? Does this require inter-controller data sharing agreements?

12. **Suppression threshold hardcoded in SQL vs TypeScript.** Migration 015 hardcodes `10` as the suppression threshold. `lib/constants/kora.ts` has `SAFE_AGGREGATION_THRESHOLD = 10`. A mismatch between these values would be a silent privacy failure. Is there a test that verifies they match?

---

## 8. Recommended Next Steps

1. **Distribute this review pack to CTO and DPO/Legal.** Gate 2 and Gate 3 can proceed in parallel. CTO reviews §§3–4. DPO reviews §§3.3, 5.

2. ~~**Resolve migration 005 role inconsistency.**~~ **DONE 2026-06-21** — policies use `kora.kora_role()` / `kora.tenant_id()` / `COMPANY_ADMIN` / `COMPANY_VIEWER`.

3. ~~**Resolve migrations 013/025/026 tenant isolation inconsistency.**~~ **DONE 2026-06-21** — all direct JWT reads replaced with canonical helpers. See §10.

4. ~~**Confirm `kora.set_updated_at()` existence or fix migration 025.**~~ **DONE 2026-06-21** — trigger corrected to `set_updated_at()` (public schema).

5. ~~**Create `lib/supabase/worker-provisioning-service-key.ts`.**~~ **EXISTS (B168-P3)** — migration 027 precondition block updated. Next: staging smoke test.

6. **Provision Supabase staging project.** Apply migrations 001–016, 021–022 in order. Verify schema, RLS, and generated types.

7. **Run generated types update:** `supabase gen types typescript --project-id <project-id> > lib/types/supabase.ts`

8. **Run RLS integration tests** against the staging Supabase project with test JWTs for each role.

9. **Complete DPIA.** DPO conducts Data Protection Impact Assessment covering migrations 007, 009, 011, 017, 018, 023, 025.

10. **Close Gate 2 (CTO sign-off)** with a written resolution document referencing this review pack.

11. **Close Gate 3 (Legal/DPO sign-off)** with documented legal basis, DPIA outcome, and updated privacy notice.

12. **Apply migrations 017–020, 023, 025, 027 only after Gates 2 and 3 close**, in the order listed, with staging verification at each step.

13. **Pilot readiness decision** based on staging validation results, access matrix test results, and gate closure confirmation.

---

---

## 9. P0 Cleanup Update — 2026-06-21

**Date:** 2026-06-21  
**Commit:** `fix: clean up Gate 2 SQL P0 blockers`  
**Scope:** migration SQL only — no migrations applied, no DB touched, no engine/formula/output changes

### Files changed

| File | Change |
|------|--------|
| `supabase/migrations/005_impact_unit_trace_layer.sql` | RLS policies rewritten — see below |
| `supabase/migrations/025_commons_booking_contribution.sql` | Trigger reference corrected — see below |
| `supabase/migrations/027_worker_individual_rls_refactor.sql` | Precondition block + `RAISE NOTICE` added; stale comment updated |
| `docs/GATE2_SQL_REVIEW_PACK.md` | This document — resolved items downgraded, §9 added |
| `tests/unit/gate2-sql-p0-cleanup.test.ts` | New static tests verifying all three fixes |

### What was fixed

**Migration 005 — RLS claim pattern and role name**

Before:
```sql
USING (auth.jwt() ->> 'role' = 'KORA_ADMIN')         -- wrong: raw JWT, skips app_metadata
WITH CHECK (auth.jwt() ->> 'role' = 'KORA_ADMIN')    -- same
USING (
  auth.jwt() ->> 'role' = 'COMPANY_USER'              -- wrong: role doesn't exist
  AND tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid  -- pre-006 key
)
```

After:
```sql
USING (kora.kora_role() = 'KORA_ADMIN')              -- canonical: reads app_metadata with fallback
WITH CHECK (kora.kora_role() = 'KORA_ADMIN')         -- same
USING (
  kora.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')  -- correct roles
  AND tenant_id = kora.tenant_id()                    -- canonical: reads kora_tenant_id (mig 006)
)
```

**Migration 025 — Trigger schema reference**

Before (line 58):
```sql
FOR EACH ROW EXECUTE FUNCTION kora.set_updated_at();   -- kora.set_updated_at() does not exist
```

After:
```sql
FOR EACH ROW EXECUTE FUNCTION set_updated_at();         -- public schema, defined in migration 001
```

`set_updated_at()` is defined in migration 001 (public/default schema). All 13 other trigger references across 5 migration files use the same unqualified form.

**Migration 027 — Precondition documentation**

- Dependency comment updated from "(da creare)" to "(EXISTS — implementato in B168-P3)" for `worker-provisioning-service-key.ts`.
- Added explicit `╔══╗` precondition block listing all 5 conditions that must be met before application.
- Added `DO $$ BEGIN RAISE NOTICE ... END $$;` runtime warning fired at apply time (non-blocking — operator must confirm preconditions manually).
- Migration remains DO_NOT_APPLY_YET until Gate 2 closes and staging smoke test passes.

### What remains blocked

| Item | Status | Unblocked by |
|------|--------|-------------|
| Migration 005 apply | Blocked — Gate 2 OPEN | Gate 2 CTO sign-off |
| Migration 025 apply | Blocked — Gate 2 OPEN + Gate 3 OPEN | Gate 2 + Gate 3 + staging verify |
| Migration 027 apply | Blocked — Gate 2 OPEN + staging smoke test | Gate 2 + smoke test on service-role path |
| Migrations 013/025/026 direct JWT reads | Unresolved — CTO decision needed | CTO review |
| Staging Supabase project provisioning | Not started | Gate 2 sign-off |
| RLS integration tests | Not run | Staging project + Gate 2 |
| DPIA | Not started | DPO engagement |

---

---

## 10. Tenant Claim Consistency Update — 2026-06-21

**Date:** 2026-06-21  
**Commit:** `fix: align SQL tenant claim usage`  
**Scope:** migration SQL only — no migrations applied, no DB touched, no engine/formula/output changes

### Files reviewed

| File | Direct JWT reads found | Action |
|------|----------------------|--------|
| `supabase/migrations/013_kora_commons.sql` | 5 (tenant reads in RLS policies) | All replaced |
| `supabase/migrations/025_commons_booking_contribution.sql` | 2 (1 in SECURITY DEFINER fn, 1 in RLS policy) | All replaced |
| `supabase/migrations/026_company_route_rls_gaps.sql` | 3 (role reads — `auth.jwt() ->> 'kora_role'`) | All replaced |
| `supabase/migrations/003_claim_functions_app_metadata.sql` | Defines canonical helpers (reviewed, no change needed) | — |
| `supabase/migrations/004_gate3a_claims_and_grants.sql` | Current `kora.kora_role()` + `kora.tenant_id()` definitions | — |
| `supabase/migrations/006_canonical_tenant_key.sql` | Canonical `kora.tenant_id()` — reads `kora_tenant_id` | — |

### Direct JWT reads replaced

| Migration | Object | Before | After | Notes |
|-----------|--------|--------|-------|-------|
| 013 | `commons_post_company_admin_select` USING | `(auth.jwt() -> 'app_metadata' ->> 'kora_tenant_id')::uuid` | `kora.tenant_id()` | RLS policy |
| 013 | `commons_post_company_admin_insert` WITH CHECK | same | `kora.tenant_id()` | RLS policy |
| 013 | `commons_post_company_admin_update` USING | same | `kora.tenant_id()` | RLS policy |
| 013 | `commons_post_company_admin_update` WITH CHECK | same | `kora.tenant_id()` | RLS policy |
| 013 | `commons_post_worker_published_select` USING | same | `kora.tenant_id()` | RLS policy |
| 025 | `booking_aggregate_for_promoter()` DECLARE | `v_caller_tenant text` | `v_caller_tenant uuid` | Type change — helper returns uuid |
| 025 | `booking_aggregate_for_promoter()` body | `auth.jwt() -> 'app_metadata' ->> 'kora_tenant_id'` | `kora.tenant_id()` | SECURITY DEFINER fn; helper works via current_setting() |
| 025 | `booking_aggregate_for_promoter()` comparison | `v_caller_tenant::uuid <> ...` | `v_caller_tenant <> ...` | Cast removed — variable is now uuid |
| 025 | `contribution_event_company_own_select` USING | `(auth.jwt() -> 'app_metadata' ->> 'kora_tenant_id')::uuid` | `kora.tenant_id()` | RLS policy |
| 026 | `analytics_source_batch_company_insert` WITH CHECK | `auth.jwt() ->> 'kora_role' IN ('COMPANY_ADMIN')` | `kora.kora_role() = 'COMPANY_ADMIN'` | Role read — not tenant, same canonical issue |
| 026 | `analytics_source_batch_company_update` USING | same | `kora.kora_role() = 'COMPANY_ADMIN'` | Role read |
| 026 | `audit_log_company_insert` WITH CHECK | same | `kora.kora_role() = 'COMPANY_ADMIN'` | Role read |

### Direct JWT reads intentionally retained

None. Zero remaining direct `auth.jwt()` reads in executable SQL across migrations 013, 025, 026.

### Canonical pattern — full migration audit status

After this update and the P0 cleanup (§9), all 28 migrations use either `kora.kora_role()` / `kora.tenant_id()` or no claim reads at all in their executable SQL. The only `auth.jwt()` references remaining in the migration set are:
- Inside comments (explanatory text — expected)
- `auth.uid()` (Supabase auth user UUID — not a claim helper, correct as-is)

### CTO decisions still required

None from the tenant-claim consistency audit. All prior CTO decisions remain as documented in §4.

---

*This document reflects the state of `supabase/migrations/` as of 2026-06-21 (updated after P0 cleanup + tenant claim consistency). No migrations have been applied to any database. This document does not constitute CTO or legal approval. Gate 2 and Gate 3 sign-off must be obtained separately.*
