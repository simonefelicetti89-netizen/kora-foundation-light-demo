# Work Session Recovery Checkpoint
**Created:** 2026-05-17
**Purpose:** Recovery reference if session is interrupted before task completion.

---

## 1. Current Task Being Executed

Create `docs/22-foundation-light-sql-schema-specification.md` — the SQL Schema Specification for KORA Foundation Light.

This document is a bridge between `docs/12-technical-data-model-database-schema.md` (approved logical schema) and actual SQL DDL generation. It is NOT executable SQL — it is the specification that governs SQL generation once Gate 2 (CTO review) is formally passed.

---

## 2. Full Prompt / Instruction Currently Being Followed

> You are working on the KORA documentation set.
>
> Create a new document: `docs/22-foundation-light-sql-schema-specification.md`
>
> This is the SQL Schema Specification for KORA Foundation Light.
>
> **Do NOT generate executable SQL yet.**
> Do NOT generate SQL DDL.
> Do NOT generate Prisma models.
> Do NOT create migrations.
> Do NOT create Supabase configuration.
> Do NOT create production backend code.
> Do NOT create seed files.
> Do NOT change the KORA methodology.
> Do NOT add new KORA Index components.
> Do NOT add new product modules.
> Do NOT expand Foundation Light scope.
> Do NOT activate future-vision modules.
>
> **Your role:** Act as CTO, senior database architect, PostgreSQL/Supabase architect, privacy-by-design engineer, data platform architect, security reviewer, and implementation lead.
>
> **The document must define:**
> - Schemas
> - Tables
> - Fields, data types, primary keys, foreign keys, uniqueness constraints, check constraints
> - Indexes
> - Conceptual views
> - Role/grant boundaries
> - RLS policy requirements
> - Audit requirements
> - Migration order
> - Blocked entities
> - Future-only entities
> - Implementation warnings
> - SQL generation readiness
>
> **Use canonical inputs:** docs 10, 12, 21, 21b, 22A, 23, 24, 25, 26, 27
>
> **Required document structure — exactly 27 sections:**
> 1. Executive Summary
> 2. Scope and Purpose
> 3. Database Topology
> 4. Schema Creation Order
> 5. SQL Type Conventions and Custom Domains
> 6. Global Constraints and Naming Rules
> 7. Identity Schema — Table Specifications
> 8. Governance Schema (gov) — Table Specifications
> 9. Analytics Schema — Table Specifications
> 10. Evidence Schema — Table Specifications
> 11. Audit Schema — Table Specifications
> 12. Personal Schema — Table Specifications
> 13. Primary Key and Surrogate Key Conventions
> 14. Foreign Key Map
> 15. Uniqueness Constraints
> 16. Check Constraints
> 17. Index Strategy
> 18. Conceptual View Definitions
> 19. Role and Grant Boundary Specifications
> 20. Row-Level Security Policy Requirements
> 21. Audit Trail Requirements
> 22. Seed Data Requirements
> 23. Future-Only and Blocked Entities
> 24. Migration Order and Dependencies
> 25. Implementation Warnings
> 26. SQL Generation Readiness Checklist
> 27. Final Specification Decision
>
> **Foundational non-negotiable rules:**
> - UEF → IU → PIB → Company Aggregation → Activation Safeguard → KORA Index is canonical
> - PIB is a mandatory intermediate layer
> - KORA Index v3 has exactly 10 components: AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS
> - Activation Safeguard is mandatory and non-bypassable
> - Confidence Score must appear with every KORA Index output
> - `calibration_status = 'pre_empirical_calibration'` in Foundation Light
> - No external LLM on HR/worker data
> - Employer roles must have grant absence (not just RLS) on individual UEF/IU/PIB/worker_profiles
> - Employer roles must have zero GRANT on entire personal schema
> - Financial/fiscal data does not feed KORA Index
> - KORA Contribution is companion indicator, not KORA Index component
>
> **Gate constraints:**
> - Gate 2 still controls actual SQL DDL generation (CTO review required)
> - Gate 3 blocks live data ingestion (legal/privacy counsel required)
> - Gate 5 blocks live fiscal classification outputs (tax advisor required)
>
> **The document must conclude with:** A GO / CONDITIONAL GO / NO-GO verdict on readiness for SQL DDL generation, and the statement: "The Foundation Light SQL Schema Specification is complete enough to proceed to executable SQL generation only after explicit founder/CTO approval."

---

## 3. Files Already Read

All research completed in the previous session before token limit was hit. The following files were fully read:

| File | Lines Read | Purpose |
|---|---|---|
| `docs/12-technical-data-model-database-schema.md` | All ~4,403 lines (18 read chunks) | Primary source — full table inventory, field definitions, types, constraints, access rules, views, 27 implementation warnings |
| `docs/10-architecture-v3-layer-specification.md` | Lines 1–100 | 14-stage algorithm flow, canonical IU formula, KORA Index v3 10-component structure |
| `docs/21-founder-gate-resolution-log.md` | Grep only | D-21 provisional values: equal weight vector 0.10×10, Activation Safeguard thresholds (CLEAR/WARNING/FLAGGED) |
| `docs/24-foundation-light-product-functional-spec.md` | Lines 96–175 | 12 platform roles, permission matrix, authentication model |
| `docs/22A-foundation-light-demo-build-cutline.md` | Full (in prior session) | Build categories, exclusion rules, code safety rules |

Additional docs referenced via CLAUDE.md context:
- doc 21b (methodology risk acceptance — calibration_status rules)
- doc 23 (code readiness audit — GO verdict confirmation)
- doc 26 (technical build handoff — stack, naming, mock services)
- doc 27 (Gate 2 CTO review — 8 CONDITIONAL GO conditions, all now resolved in doc 12)

**No further file reading is required before writing doc 22.**

---

## 4. Files Already Modified

| File | Modification | Status |
|---|---|---|
| `CLAUDE.md` | Four edits to register Gate 2 Schema Gap Patch applied to doc 12: (1) document index table row 12 description updated; (2) step 5 updated with 32-section count and all 8 OQ gaps resolved; (3) step 25 store list updated to include `identity → personal`; (4) step 29 added as new step | **Complete** |

---

## 5. Files Already Created

None in this session. The recovery checkpoint file (`docs/work-session-recovery.md`) is the first file created in this session.

---

## 6. Pending Files to Modify

After `docs/22-foundation-light-sql-schema-specification.md` is created:

| File | Required Change |
|---|---|
| `CLAUDE.md` | Add doc 22 to the document index table (row 22); update step 25 to reference doc 22 as complete; add new step (30 or renumbered) describing doc 22 completion |

---

## 7. Current Implementation Plan

Write `docs/22-foundation-light-sql-schema-specification.md` in sequential parts to avoid token limits:

**Part 1 — Sections 1–6** (Executive Summary, Scope, Database Topology, Schema Creation Order, SQL Type Conventions, Global Constraints and Naming Rules)

**Part 2 — Sections 7–9** (Identity schema tables, Governance schema tables — all ~45 gov tables, Analytics schema tables — all ~15 analytics tables)

**Part 3 — Sections 10–12** (Evidence schema, Audit schema, Personal schema — all 7 personal tables)

**Part 4 — Sections 13–17** (PK/surrogate key conventions, Full FK map, Uniqueness constraints, Check constraints, Index strategy)

**Part 5 — Sections 18–21** (Conceptual view definitions — 5 employer views + admin/analyst views, Role/grant boundaries — all 12 roles, RLS policy requirements, Audit trail requirements)

**Part 6 — Sections 22–27** (Seed data requirements, Future-only/blocked entities, Migration order, Implementation warnings, SQL generation readiness checklist, Final specification decision with GO/CONDITIONAL GO/NO-GO verdict)

**After writing:** Run a consistency check (grep for any hardcoded weights, missing calibration_status, blocked entities that should not appear), then update CLAUDE.md.

---

## 8. Key Source Material Already Gathered

### Complete Table Inventory (active at Foundation Light)

**identity schema (Database A):**
- `identity.worker_identity_records` — canonical identity store; pseudonymized worker records
- `identity.pseudonymization_key_references` — mapping pointers; never crosses to Database B in plaintext

**gov schema (Database B):**
Core config: `companies`, `company_programs`, `pillars`, `users`, `roles`, `user_roles`
Ingestion: `data_sources`, `raw_datasets`, `ingestion_batches`, `ingestion_batch_datasets`, `ingestion_rejection_records`
Methodology: `methodology_versions`, `methodology_version_components`, `bcm_versions`, `bcm_entries`, `nm_rules_versions`, `nm_rules`, `anti_gaming_rules_versions`, `correction_factor_rule_versions`, `kora_index_weight_versions`
Financial: `financial_budgets`, `financial_movements`, `financial_governance_snapshots`, `svam_configurations`, `fuo_accounts`, `welfare_statements`
Fiscal/Eligibility: `fiscal_perimeters`, `fiscal_category_thresholds`, `company_program_perimeters`, `eligibility_profiles`, `eligibility_profile_versions`
Partners/Advisors: `partners`, `partner_services`, `advisor_reviews`, `advisor_review_evidence`
Reports: `reports`, `report_exports`
G2 additions: `collective_initiatives`, `collective_initiative_companies`, `scoring_runs`, `validation_contacts`

**analytics schema (Database B):**
Workers: `worker_profiles`, `workforce_segments`
Pipeline: `uef_records` (+ G2: review_decision, eligible_for_scoring), `pillar_mappings`, `impact_units`, `pib_records`
Aggregation/Output: `company_impact_aggregates`, `activation_safeguard_results`, `kora_indices`, `kora_index_components`, `confidence_scores`
G2 additions: `kora_index_explanations`
Companion: `kora_contributions`, `kora_ecosystem_reach`
Future (inactive): `kora_value_chain` (status='not_calculated'), `kora_evolution_snapshots` (basic)

**evidence schema (Database B):**
- `evidence_records` — metadata + blob storage pointer only; no binary content in DB

**audit schema (Database B):**
- `audit_trail_records` — INSERT-only; no UPDATE/DELETE permitted

**personal schema (Database B — G2 addition):**
- `worker_cv_items`, `worker_milestones`, `worker_personal_plan_items`, `worker_participation_requests`, `worker_consent_records`, `worker_data_control_preferences`, `worker_export_records`

### Critical Architectural Rules
1. UEF → IU → PIB → Company Aggregation → Activation Safeguard → KORA Index (14-stage canonical flow)
2. PIB is mandatory intermediate layer; employer sees ONLY aggregated output
3. KORA Index v3 = exactly 10 components: AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS
4. Canonical IU formula: `IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]`
5. AGF=0 → is_disqualified=TRUE, final_iu_value=0 (disqualified events excluded from PIB)
6. calibration_status = 'pre_empirical_calibration' — NOT NULL, non-suppressible
7. scoring_run_id — NOT NULL FK on: kora_indices, company_impact_aggregates, activation_safeguard_results, kora_index_explanations
8. eligible_for_scoring — BOOLEAN NOT NULL DEFAULT FALSE; TRUE only when review_decision='approved' AND is_disqualified=FALSE AND batch complete
9. Employer roles: ZERO GRANT (not just RLS) on analytics.uef_records, analytics.impact_units, analytics.pib_records, analytics.worker_profiles
10. Employer roles: ZERO GRANT on entire personal schema
11. Audit schema: INSERT-only DB role; audit_trail_records is append-only
12. No binary content in relational DB; evidence_records = metadata + blob pointer
13. safe_aggregation_threshold default = 10 (minimum group size for segment analytics)
14. Pseudonymization keys held by KORA's internal privacy service, not by employer
15. No external LLM API calls on company HR data (rule-based BCM classifier only)
16. Financial/fiscal data does not feed KORA Index computation
17. KORA Contribution = companion indicator; not a KORA Index component
18. gov.kip_records — NOT CREATED in Foundation Light (hard exclusion)
19. No hardcoded methodology weights — all weights read from gov.kora_index_weight_versions

### D-21 Provisional Methodology Values
- Equal weight vector: 0.10 × 10 components (all equal at Foundation Light v0.1)
- Activation Safeguard thresholds:
  - CLEAR: AR ≥ 0.40 AND MAR ≥ 0.30
  - WARNING: 0.20 ≤ AR < 0.40 OR 0.15 ≤ MAR < 0.30
  - FLAGGED: AR < 0.20 OR MAR < 0.15
- NM normalization functions: linear / concave / step / log; category caps apply

### 12 Platform Roles
1. KORA Admin — full platform access
2. KORA Privacy Officer — personal schema access; pseudonymization bridge
3. KORA Analyst — read-only analytics and reports
4. Founder/Internal — full read; strategy and validation data
5. Company Admin — own company config, employer-facing views only
6. Company HR — ingestion controls, UEF review queue (aggregate), employer views only
7. Company ESG — company intelligence views, reports
8. Company Finance — financial governance tables, cost views
9. Company Viewer — employer-facing views only (read-only)
10. Worker/My KORA — own personal schema tables via worker_id filter
11. Partner Admin Light — own partner/partner_services records
12. Advisor External Light — own advisor_reviews/evidence records

**Employer roles (5–9):** Grant absence on individual analytics and entire personal schema.

### 5 Employer-Facing Aggregate Views
1. `v_company_intelligence` — company-level KORA Index + 10 components
2. `v_department_intelligence` — department-level aggregate (above safe_aggregation_threshold=10)
3. `v_pillar_distribution` — pillar-level breakdown per company
4. `v_activation_summary` — participation and activation rates
5. `v_financial_intelligence` — cost per IU, budget vs. actual spend

### Tables NOT Created in Foundation Light (hard exclusions)
- `gov.kip_records` — KIP is future scope; do not create
- `gov.policy_rules` — Governance tier
- `gov.fiscal_guardrails_rules` — Governance tier
- `gov.fiscal_guardrails_results` — Governance tier
- KORA Certified tables — future tier
- KORA Link tables — future tier
- Worker wallet / KIP execution tables — future tier
- Partner marketplace / booking engine tables — future tier
- Advisor certification LMS tables — future tier

---

## 9. Unresolved Decisions

None that block writing doc 22. All 21 decisions (D-01 through D-21) are resolved in doc 21. All 8 OQ gaps (OQ-01 through OQ-08) from doc 27 are resolved in doc 12 Section 32.

**Pending gates (do not block doc 22 writing, block SQL DDL generation):**
- Gate 2: CTO has not yet reviewed — SQL DDL generation blocked
- Gate 3: Legal/privacy counsel not yet engaged — live data ingestion blocked
- Gate 5: Tax/fiscal advisor not yet engaged — live fiscal outputs blocked

---

## 10. Exact Next Command / Prompt to Continue

**Resume instruction:**

> Resume the interrupted task. Create `docs/22-foundation-light-sql-schema-specification.md` now.
>
> All research is complete. No further file reading is needed. The recovery checkpoint at `docs/work-session-recovery.md` contains all gathered source material and the full implementation plan.
>
> Write the document in sequential parts using the Write tool (initial creation), then Edit if additions are needed:
> - Part 1: Sections 1–6 (Executive Summary through Global Constraints)
> - Part 2: Sections 7–9 (Identity, Gov, Analytics schema table specs)
> - Part 3: Sections 10–12 (Evidence, Audit, Personal schema)
> - Part 4: Sections 13–17 (PKs, FK map, uniqueness, check constraints, indexes)
> - Part 5: Sections 18–21 (Views, roles/grants, RLS, audit trail)
> - Part 6: Sections 22–27 (Seed data, future-only entities, migration order, warnings, readiness checklist, final verdict)
>
> After the document is created, update CLAUDE.md to register doc 22.
>
> Do not ask for confirmation before starting. Write directly.

---

**Checkpoint created:** 2026-05-17
**Session state:** Research complete. Writing not yet started.
**First action on resume:** Write Part 1 of `docs/22-foundation-light-sql-schema-specification.md` (Sections 1–6).
