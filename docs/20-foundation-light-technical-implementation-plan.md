# KORA Foundation Light — Technical Implementation Plan

*Status: v0.2 — Pending Founder and CTO Review*
*Date: 2026-05-17*
*Canonical references: docs 12, 13, 18, 19, CLAUDE.md*
*Does not generate: SQL, migrations, Prisma models, Supabase tables, React components, API endpoints, or application code*
*Gate condition: No code generation until all gate conditions in Section 2 are met*

---

## 1. Implementation Purpose

### 1.1 What this document is

This document is the technical implementation roadmap for Foundation Light MVP v0.2. It translates the approved product scope (doc 18), AI engine governance (doc 19), data model (doc 12), and architectural decisions (doc 13) into a structured build plan: what is built, in what sequence, with what dependencies, validated how, and accepted when.

This document does not generate SQL, migrations, Prisma models, React components, or APIs. It defines the decisions, dependencies, and acceptance criteria that must be established before any of those artifacts are produced.

### 1.2 Its role in the KORA documentation hierarchy

| Document | Role |
|---|---|
| Docs 01–11 | Strategy, methodology, commercial architecture — approved canonical |
| Doc 12 | Logical data model — authoritative schema design |
| Doc 13 | Implementation architecture decisions — 21 decisions before SQL |
| Doc 18 | MVP product scope — what is built and in what phases |
| Doc 19 | AI Engine placement and governance |
| **Doc 20 (this document)** | Technical implementation plan — how the build proceeds |
| Doc 21 (future) | SQL DDL generation — blocked until doc 20 gates are passed |

### 1.3 What this document does not do

- Generate SQL schema definitions
- Prescribe specific library or framework choices beyond what is necessary to respect the architecture
- Replace the CTO's technical judgment on implementation specifics
- Override any canonical rule from docs 01–13
- Guarantee a timeline — phases are ordered by dependency, not by calendar

---

## 2. Gate Dependencies

### 2.1 All five gates from doc 13 Section 9

No code, SQL, migrations, Prisma models, or Supabase tables may be generated until all applicable gates are passed. The gates apply cumulatively — no gate can be skipped because a later phase is "not yet relevant."

**Gate 1 — Founder review of all 21 doc 13 decisions**
The founder must record a position — Approved / Deferred / Needs Specialist — for each of D-01 through D-21. Recommended technical directions in doc 13 Section 5 may be accepted, modified, or overridden.
*Blocks:* Everything. No phase begins before Gate 1.
*Owner:* Founder (Simone).

**Gate 2 — CTO review of docs 10, 12, and 13**
The CTO must review: the 14-stage algorithm flow and KORA Index structure (doc 10), the full logical schema (doc 12), and all 21 architectural decisions (doc 13). CTO must confirm the technical directions or document alternatives. Minimum CTO review scope is defined in doc 13 Decision D-18.
*Blocks:* Phase 1 (Infrastructure). No SQL before the CTO has reviewed the schema.
*Owner:* CTO.

**Gate 3 — Legal/privacy specialist review**
GDPR/privacy counsel must review and validate: pseudonymization architecture adequacy under GDPR Recital 26, DPA template, GDPR deletion cascade procedure (D-06), safe aggregation threshold legal sufficiency, SVAM Variant A characterization, worker consent model, data retention periods per evidence category, AI suggestion retention policy, cross-border implications (Italy-first deployment).
*Blocks:* Any live data ingestion from real companies. Development environment with synthetic data may proceed after Gates 1 and 2 without Gate 3 being complete.
*Owner:* Founder to identify and engage counsel in Phase 0. Legal review must complete before Phase 14 (Pilot Hardening) — not before Phase 1 provisioning. See Section 8.4 for engagement timeline.

**Gate 4 — Methodology numerical values (D-21)**
The founder and methodology team must define the numerical seed values for Foundation Light v0.1: BCM category weights, NM normalization function parameters, AGF composition thresholds, Activation Safeguard thresholds (AR and MAR trigger levels, safeguard modifier values), and the 10-component KORA Index weight vector (must sum to 1.00, must satisfy Stress Test Scenario B within defined tolerance).
*Blocks:* Phase 5 (Scoring Engine). The scoring engine cannot be implemented without these values.
*Owner:* Founder and methodology team.

**Gate 5 — Tax/fiscal advisor review**
A tax/labor law advisor must review: Italy fiscal perimeter definitions (`gov.fiscal_perimeters`), fiscal category thresholds aligned with current Budget Law, welfare statement characterization as informational-only, SVAM Variant A vs. B escalation conditions, Fiscal Guardrails Engine design before activation. Per doc 11 Section 17.
*Blocks:* Any live fiscal classification output presented to a client company. May run in parallel with Phases 1–5.
*Owner:* Founder to identify and engage advisor.

### 2.2 Additional prerequisites

**Doc 18 founder approval** — the four-layer scope (Functional Core / Innovation / Light Ecosystem / Future Vision) and all boundary conditions must be confirmed before implementation begins. If scope changes after Phase 1 starts, schema changes may be required.

**Doc 20 review** — this document itself must be reviewed by the founder and CTO before Phase 0 completes. Any corrections feed back into the phase plan before Phase 1 begins.

### 2.3 Gate summary

| Gate | What is needed | Blocks | Can run in parallel with |
|---|---|---|---|
| Gate 1 | Founder records position on D-01 to D-21 | Everything | Gate 3 engagement, Gate 5 engagement |
| Gate 2 | CTO reviews docs 10, 12, 13 | Phase 1 (SQL) | Gate 3, Gate 5 |
| Gate 3 | Legal/privacy counsel validates architecture | Live data ingestion | Phases 1–2 (synthetic-only) |
| Gate 4 | Methodology numerical values defined | Phase 5 (Scoring Engine) | Phases 1–4 |
| Gate 5 | Tax/fiscal advisor validates Italy perimeters | Live fiscal classification | Phases 1–5 |

---

## 3. Technical Architecture Overview

### 3.1 Two-database model

KORA Foundation Light uses a physically separated two-database architecture. This separation is a constitutional privacy requirement — not an operational preference.

**Database A — Identity Store**
A separate Supabase project with no shared connection strings, no shared roles, and no SQL join path to Database B. Holds identifiable worker records and per-company pseudonymization keys. The only code path that communicates with Database A is the pseudonymization service. No employer role, no application server code, and no analytics pipeline has any access to Database A.

Tables: `worker_identity_records`, `pseudonymization_keys`.

**Database B — Main Platform**
The primary Supabase project. Contains four schemas:

| Schema | Purpose |
|---|---|
| `gov` | Governance data: companies, programs, fiscal perimeters, ingestion batches, methodology versions, policy rules, financial governance, reports |
| `analytics` | Scoring data: UEF records, impact units, PIB records, company aggregates, workforce segments, KORA Index records, Activation Safeguard results |
| `evidence` | Evidence metadata and blob storage references: evidence documents, partner documents, advisor review materials |
| `audit` | Immutable audit trail: all system events from first operation, INSERT-only |

### 3.2 Pseudonymization service

A Supabase Edge Function serves as the pseudonymization service. It is the only authorized bridge between identifiable worker data and the analytics pipeline.

Operational sequence during ingestion:
1. The ingestion pipeline receives a batch containing raw worker identifiers
2. The ingestion pipeline calls the pseudonymization Edge Function via an authenticated internal endpoint
3. The Edge Function retrieves the per-company key from Supabase Vault
4. The Edge Function produces pseudonymous identifiers
5. The Edge Function returns pseudonymous identifiers to the ingestion pipeline — never the key
6. The ingestion pipeline writes UEF records using pseudonymous identifiers only
7. Raw worker identifiers never reach Database B

Per-company key custody: Supabase Vault (or equivalent managed secrets service). Application code never holds keys directly. Every Vault access generates an audit trail entry.

### 3.3 Access control model

Two distinct mechanisms, applied per table type:

**Grant absence** (for individual worker data):
The employer-facing database role has no GRANT of any kind on: `analytics.uef_records`, `analytics.pib_records`, `analytics.impact_units`, `analytics.worker_profiles`. No SELECT, no INSERT, no UPDATE, no DELETE. There is no row-level filter to misconfigure — there is no access at all.

**Row Level Security** (for multi-tenant employer-accessible tables):
Company roles may access their own company's data in: `gov.companies`, `gov.company_programs`, `gov.reports`, `gov.financial_governance_snapshots`, `gov.ingestion_batches`, and PostgreSQL views over `analytics.company_impact_aggregates`. RLS policies restrict each company role to rows where `company_id` matches the authenticated session.

**High-sensitivity record suppression:**
Two distinct protections apply to high-sensitivity records, guarding against two different role categories:

1. **Employer protection — grant absence:** Employer roles (`company_executive`, `company_hr_esg`) have zero access to `analytics.uef_records` at the grant level. The table does not exist to them regardless of the sensitivity level of any individual record. This applies to all UEF records, not only high-sensitivity ones — there is no row-level filter to misconfigure because there is no access at all.

2. **Internal analyst restriction — RLS:** Within `analytics.uef_records`, records where `privacy_sensitivity = 'high'` (psychological support, health conditions, sensitive personal matters) are readable only by `KORA_PRIVACY_ADMIN`. An RLS policy explicitly blocks `KORA_ANALYST` from seeing these records, even though `KORA_ANALYST` has general access to non-sensitive UEF records.

These are not redundant mechanisms — they protect against different threats. Grant absence ensures workers are never exposed to their employers through any code path. RLS ensures that even KORA internal staff can only access sensitive health and psychological records when holding the specific privacy admin role. Both must be implemented and tested independently.

**Safe aggregation enforcement:**
Employer-facing PostgreSQL views always include `WHERE workforce_segments.is_active = TRUE`. This filter cannot be bypassed by the employer role — they have no access to the underlying tables, only to the views.

**Audit INSERT-only:**
A dedicated database role (`kora_audit_writer`) has GRANT INSERT only on `audit.audit_trail_records`. No UPDATE, no DELETE, no SELECT.

Audit writes use a dedicated Supabase Edge Function — the **Audit Writer service** — that operates exclusively under the `kora_audit_writer` role. Application components and services never hold `kora_audit_writer` credentials directly. Every component that needs to generate an audit entry calls the Audit Writer endpoint, passing a structured audit event payload. The Audit Writer service validates the payload structure and INSERTs the record. It has no other capability — it cannot query, update, or delete any record.

This pattern mirrors the pseudonymization service: a narrow, purpose-limited Edge Function as the only authorized path for a sensitive operation. No application role holds both a functional permission (e.g., batch approval) and the audit write permission simultaneously. The audit trail is always written through the dedicated endpoint, not through the application's main database connection.

### 3.4 Blob storage

Supabase Storage with three private buckets:

| Bucket | Contents | Access |
|---|---|---|
| `raw-datasets` | Uploaded company files (CSV, XLSX, exports) | KORA_ADMIN, KORA_ANALYST only |
| `evidence-files` | Evidence documents, partner accreditation, advisor review materials | KORA_ADMIN, KORA_ANALYST, assigned advisors (read-only) |
| `report-exports` | Generated PDF reports | KORA_ADMIN, KORA_ANALYST (full), company roles (time-limited pre-signed URLs only) |

Report download links: pre-signed URLs with embedded expiry (24-hour TTL for standard reports). Every download event generates a server-side audit trail entry. Download count and timestamp are updated via a dedicated internal endpoint — not client-side — to prevent race conditions on `download_count`.

Retention policy (to be validated by legal counsel per D-17):
- Evidence files: 7 years (aligned with Italian fiscal record retention)
- Report exports: 3 years
- Raw datasets: 1 year post-processing

### 3.5 Database roles

| Role | What it accesses | What it cannot access |
|---|---|---|
| `KORA_ADMIN` | Everything in Database B | Database A (no SQL path exists) |
| `KORA_ANALYST` | All gov and analytics tables except audit trail (read); can approve batches | Cannot create or delete company accounts; cannot modify methodology records |
| `KORA_PRIVACY_ADMIN` | High-sensitivity UEF records; GDPR deletion operations | Not a superset of KORA_ADMIN |
| `company_executive` | Company-facing views via RLS | No UEF, PIB, IU, worker_profiles; no other companies' data |
| `company_hr_esg` | Same as executive viewer + ingestion batch read-only | Cannot approve own ingestion batch |
| `worker_light` | Own pseudonymized PIB record via PIB Light interface | No company KORA Index; no other workers; no UEF |
| `partner_light` | Own partner profile, own service catalog, own review status | No company scores; no worker data; no other partners |
| `advisor_light` | Assigned review materials (read-only) | Unassigned companies or partners; no worker data; no KORA Index |
| `kora_audit_writer` | INSERT only on `audit.audit_trail_records` | Everything else |

### 3.6 Methodology version binding

Every scoring output table carries `methodology_version_id` as a NOT NULL foreign key to `gov.methodology_versions`. This is enforced at the database level. A scoring output that does not reference a methodology version cannot be created.

The scoring engine only INSERTs new scoring records. All computed values — IU values, component values, KORA Index values, methodology references, source identifiers, and calibration labels — are immutable once written. No UPDATE may be applied to any computed value field after a scoring record is created.

The only mutable field on scoring output records is `publication_status`. If a scoring run is superseded by a corrected reprocessing, a new record is INSERTed with the correct values, and the prior record's `publication_status` is set to `'superseded'` via a restricted UPDATE executed by `KORA_ADMIN` only. Both records are retained in full. The audit trail records both the new INSERT and the supersession UPDATE as separate, immutable events.

No other UPDATE is permitted on scoring output tables (`analytics.impact_units`, `analytics.pib_records`, `analytics.company_impact_aggregates`, `analytics.activation_safeguard_results`, `analytics.kora_indices`, `analytics.kora_index_components`). Formula values, methodology versions, and calibration labels are permanent from the moment of INSERT.

### 3.7 Activation Safeguard binding

`analytics.kora_indices.activation_safeguard_result_id` is NOT NULL. A KORA Index record cannot be written without a corresponding Activation Safeguard result. This is enforced at the database level. There is no bypass.

---

## 4. Build Modules

Each module corresponds directly to a module defined in doc 18 Section 5. For each module: purpose, input dependencies, data it consumes, data it produces, key risk, test cases, and acceptance criteria.

---

### Module A — Company Setup

**Purpose:** Establish the company record, program structure, fiscal perimeter selection, DPA gate, and user account assignment. The DPA must be signed before any data ingestion proceeds — this gate is enforced by the application, not just policy.

**Dependencies:** Infrastructure (Phase 1). Methodology version seeded (D-09, D-21 before scoring begins — but company setup itself does not require the scoring engine).

**Required data:**
- Company name, legal entity, country, employee count band
- Program period (start date, end date)
- Declared welfare/training budget (optional but valuable for financial governance)
- Fiscal perimeter selections (Italy perimeters seeded by KORA)
- DPA signed status (checkbox with timestamp and signatory recorded)
- User account assignments (company executive, HR/ESG viewer roles)

**Outputs:**
- `gov.companies` record
- `gov.company_programs` record(s)
- `gov.fiscal_perimeter_activations` record(s) (if perimeters selected)
- User accounts linked to company with correct role assignments
- Audit trail: company created, DPA signed, program configured

**Risk:** DPA gate is enforced in the application but not at the database level — a misconfigured role could insert ingestion batch records for a company with unsigned DPA. Mitigation: database-level constraint or trigger that prevents `gov.ingestion_batches` creation where `companies.dpa_signed_at IS NULL`.

**Test cases:**
- Company created with all required fields → `gov.companies` record persists with correct field values
- DPA unsigned → ingestion batch creation is blocked
- DPA signed → ingestion batch creation is permitted
- User assigned company_executive role → RLS restricts them to own company data only
- User assigned company_hr_esg role → can view ingestion batch status, cannot approve batch
- Attempt to assign a user to two companies with the same role → defined behavior (permitted or blocked, documented)

**Acceptance criteria:**
- A KORA Analyst can create a company profile, configure a program period, activate a fiscal perimeter, and assign company user accounts in a single workflow
- DPA gate blocks ingestion batch creation when unsigned — confirmed by integration test
- Company user cannot see another company's data — confirmed by role access test
- All creation events appear in `audit.audit_trail_records`

---

### Module B — Data Upload Studio

**Purpose:** Accept structured file uploads from companies (CSV, XLSX, standard exports), validate format and structure, assign source type, and hand off to the AI Ingestion Assistant. The Upload Studio is the entry point for all company data.

**Dependencies:** Module A (company and program must exist). Phase 3.

**Required data:**
- Uploaded file (CSV, XLSX)
- Source type selection (welfare usage, training LMS, ESG initiative, volunteering, HR workforce segment, other) — AI-pre-populated, human-confirming
- Column mapping (AI-pre-populated, analyst-adjustable)
- Program period assignment (which company program this batch belongs to)

**Outputs:**
- `gov.ingestion_batches` record with status `submitted`
- Blob storage entry in `raw-datasets` bucket
- Audit trail: file uploaded, batch created, source type assigned

**Risk:** Column mapping UX complexity — companies export data in many formats, and the mapping interface must handle ambiguous cases without forcing the analyst to re-do work after AI pre-population. Mitigation: design column mapping as a review interface (AI proposes, human adjusts) rather than a blank mapping form.

**Test cases:**
- Valid CSV uploaded → batch record created, file stored in blob, status = `submitted`
- Invalid format (unsupported file type) → upload rejected with clear error message
- File exceeds size limit → rejected with clear error
- Same file uploaded twice for same batch → duplicate detection alert surfaced
- Multiple files uploaded for same batch → each file gets a batch file record, all associated to same batch
- Batch created for company with unsigned DPA → blocked at application level

**Acceptance criteria:**
- A company HR/ESG viewer can upload one or more files and see batch status update to `submitted` immediately
- A KORA Analyst can see the batch in their review queue within seconds of submission
- Raw file is stored in `raw-datasets` bucket with no employer-accessible path

---

### Module B-AI — AI Ingestion Assistant

**Purpose:** Process submitted ingestion batches — recognize columns, classify source types, suggest event types and pillar mappings, detect sensitivity and duplicates, score confidence, generate onboarding guidance, and produce a Data Readiness Summary. Full governance defined in doc 19.

**Foundation Light v0.1 AI model type (confirmed decision):** The AI Ingestion Assistant uses a rule-based / taxonomy-based classifier grounded in the BCM taxonomy. No external LLM API calls are made on company HR data. Classification works by matching event descriptions, category labels, and provider names against a structured BCM keyword and category index. Every suggestion is fully explainable (which BCM keyword matched and why). Company HR data never leaves the KORA platform — no external data transmission, no third-party API dependency. Analyst overrides of rule-based suggestions are logged and constitute the primary training-data asset for a future ML-based classifier in Foundation tier.

**Dependencies:** Module B (batch must exist in `submitted` status). Rule-based BCM taxonomy classifier operational (Foundation Light v0.1 — no external LLM API calls on company HR data). Phase 4. Methodology BCM taxonomy seeded (`gov.bcm_entries` populated).

**Required data:**
- Submitted ingestion batch (raw file from blob storage)
- BCM category taxonomy (from `gov.bcm_entries`) for event-type suggestion
- Sensitivity keyword library (configured by KORA Admin)
- Prior approved batches for the same company (for cross-batch duplicate detection)

**Outputs:**
- `gov.ai_mapping_suggestions` records (one per row, containing: suggested event type, suggested pillar, confidence level, basis rationale, sensitivity flag, duplicate flag, missing field flags)
- `gov.data_readiness_summaries` record (batch-level: Data Readiness Score [0–100], source type recognition results, missing field map, duplicate count, sensitivity flag count, recommended next actions)
- Batch status updates to `ai_reviewed`
- Audit trail: AI processing started, completed, suggestion set version recorded

**AI suggestion retention policy:**
`gov.ai_mapping_suggestions` records are transient operational scaffolding. They exist to support the analyst review workflow. Once a batch reaches `approved` or `rejected` status, the intermediate suggestion records are no longer operationally needed.

The permanent record of all AI proposals, human decisions, overrides, and rejections lives in `audit.audit_trail_records` — which is immutable and INSERT-only. No information is lost by purging suggestion records after the batch closes, provided the audit trail has captured every decision.

Retention rule (to be confirmed by legal counsel at Gate 3): `gov.ai_mapping_suggestions` records may be purged N days after batch closure (target: 30 days post-approved or post-rejected batch, unless the batch is part of an active compliance investigation). `gov.data_readiness_summaries` records are retained for the same period as their associated ingestion batch (7 years if the batch evidence is fiscal-category).

The audit trail retention (7 years) is independent of suggestion record retention. Purging suggestions does not affect auditability — the audit trail is the canonical record.

**Risk:** Rule-based pillar suggestions may be inaccurate on event descriptions that use non-standard terminology not covered by the BCM keyword index — particularly novel, hybrid, or sector-specific event types that exist in the company's data but have no BCM keyword match. Mitigation: validate rule-based suggestion accuracy against all four synthetic company profiles before exposing to real company data. Define an acceptable accuracy threshold (target: ≥80% pillar suggestion agreement with analyst ground truth on synthetic data). Records with no BCM keyword match are surfaced at a "low confidence" band and cannot be bulk-confirmed — each requires individual analyst review. Systematic low-confidence categories (BCM gaps) are noted for taxonomy extension between pilot engagements.

**Test cases:**
- Synthetic Profile A data (welfare + training + volunteering) → AI correctly identifies three source types and suggests correct pillar distribution ≥80% of rows
- Synthetic Profile D (training only) → AI identifies GROWTH pillar dominance, flags LIFE/IMPACT/CONNECTION/LEGACY gaps in onboarding guidance
- File with health/psychological keywords → sensitivity flags generated for affected rows
- Two files for same batch with overlapping rows → duplicate alerts generated
- File with missing participant identifiers on 30% of rows → missing-field alerts generated for those rows with specific guidance

**Acceptance criteria:**
- Data Readiness Summary is generated within a defined time window after batch submission (target: under 60 seconds for files up to 10,000 rows at Foundation Light volume)
- AI suggestions carry confidence level and plain-language rationale for every suggestion
- Sensitivity-flagged records are isolated from bulk-confirm flow
- AI cannot set any record to `review_status = 'confirmed'` — confirmed by integration test
- Every AI suggestion round-trip generates an audit trail entry with the AI pipeline version

---

### Module C — UEF Review

**Purpose:** Present AI suggestions to the KORA Analyst for review, override, or rejection. Produce approved UEF records that advance to the scoring pipeline. No record may reach scoring with `review_status = 'pending'`. Full review layer defined in doc 19 Section 4.

**Dependencies:** Module B-AI (suggestions must exist). Module A (company and program context). Phase 5 depends on this module's approved output.

**Required data:**
- AI mapping suggestions (from `gov.ai_mapping_suggestions`)
- BCM category taxonomy (for override options)
- Pillar taxonomy (for override options)
- Sensitivity flag categories

**Outputs:**
- `analytics.uef_records` with `review_status = 'confirmed'` (one per approved row)
- Each UEF record carries: `methodology_version_id`, `classification_method` (`ai_suggested → human_confirmed` or `ai_suggested → human_override`), `analyst_id`, `confirmed_at`, `ai_confidence_band`, `privacy_sensitivity`
- Batch status updates to `approved`
- Audit trail: each confirmation, each override (with analyst ID and rationale), each rejection (with required annotation)

**Risk:** Analyst bulk-confirms a large batch without reviewing individual records adequately — low-quality AI suggestions produce low-quality UEF records. Mitigation: (1) low-confidence records are excluded from bulk-confirm and must be individually reviewed; (2) sensitivity-flagged records are excluded from bulk-confirm; (3) audit trail records the analyst's review pattern (bulk vs. individual), creating accountability.

**Test cases:**
- Analyst bulk-confirms high-confidence, non-sensitive records → UEF records created with `classification_method = 'ai_suggested → human_confirmed'`
- Analyst overrides pillar on a single record → override recorded with analyst ID and timestamp; `classification_method = 'ai_suggested → human_override'`
- Analyst rejects a record without annotation → rejection blocked; annotation required
- Analyst attempts to bulk-confirm a sensitivity-flagged record → blocked; must individually review
- Analyst approves a batch containing a low-confidence record without individual review → blocked
- Batch approved → status updates to `approved`; records are visible to scoring pipeline

**Acceptance criteria:**
- Every UEF record in the database has `review_status = 'confirmed'` and `methodology_version_id NOT NULL` — verified by integration test
- No UEF record with `review_status = 'pending'` exists in the scoring pipeline's input set — enforced by scoring engine query
- Every override and rejection is logged in `audit.audit_trail_records`
- UEF Draft Preview shows exact records that will be created before batch approval is confirmed

---

### Module D — Scoring Engine (14-Stage Impact Calculation)

**Purpose:** Execute the full 14-stage Impact Calculation algorithm on approved UEF records. Produce Impact Unit records, PIB records (mandatory internal), and company aggregate records. Every output carries `methodology_version_id`.

The 14 stages in mandatory order:

| Stage | Operation | Input | Output |
|---|---|---|---|
| 1 | UEF normalization | Approved UEF records | Normalized event fields |
| 2 | UEF validation | Normalized events | Validated event set |
| 3 | BCM Entry assignment | Validated events + BCM taxonomy | `bcm_entry_id` per event |
| 4 | NM calculation | BCM assignment + NM rules | `nm_value` per event |
| 5 | BC coefficient | Event + workforce segment cohort | `bc_value` per event |
| 6 | CQ assessment | Event + source quality metadata | `cq_value` per event |
| 7 | EV assignment | Event + verification status | `ev_value` per event |
| 8 | CF application | BCM entry + category factor rules | `cf_value` per event |
| 9 | AGF calculation | AGF component rules + event context | `agf_value` per event |
| 10 | IU calculation | All preceding values | `iu_value` per event: `NM × BC × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]` |
| 11 | PIB assembly | IU records per worker pseudonym | PIB per worker: mandatory, internal only |
| 12 | Company aggregation | All PIB records | Company-level pillar aggregates |
| 13 | Activation Safeguard | Company aggregates + workforce segment | Safeguard result (CLEAR / WARNING / FLAGGED) |
| 14 | KORA Index calculation | Company aggregates + Safeguard result + weight vector | KORA Index with 10 component values |

**Dependencies:** Module C (approved UEF records). Gate 4 (methodology numerical values). Methodology version seeded (D-09).

**Required data:**
- Approved UEF records for the company and program period
- `gov.methodology_versions` (current active version)
- `gov.bcm_entries` (category taxonomy with weights)
- `gov.nm_rules` (normalization parameters)
- `gov.correction_factor_rule_versions` (CF, DF, EXF, SF rules)
- `gov.kora_index_weight_versions` (10-component weight vector, sums to 1.00)
- `analytics.workforce_segments` (denominator for AR and MAR calculation)

**Outputs:**
- `analytics.impact_units` records (one per approved UEF record)
- `analytics.pib_records` (one per worker pseudonym per program period) — internal only, never surfaced to employers
- `analytics.company_impact_aggregates` (one per pillar per company per period)
- `analytics.activation_safeguard_results` (mandatory Stage 13 output)
- `analytics.kora_indices` (final Stage 14 output, with all 10 component values)
- `analytics.kora_index_components` (one row per component per KORA Index)
- All records carry `methodology_version_id NOT NULL`, `calibration_status`, confidence labels

**Risk:** Scoring engine produces outputs inconsistent with Stress Test Scenario B targets. This is the highest-severity technical risk — an incorrect scoring engine produces all wrong outputs downstream. Mitigation: Stress Test Scenario B must be validated before any dashboard, report, or pilot company is shown results. Define tolerance band for acceptable deviation. No Phase 6 begins without passing this validation.

**Test cases:**
- Stress Test Scenario B (from Appendix A) run on synthetic data → KORA Index output within defined tolerance of expected value
- Scenario B validation: each of the 14 stages produces the expected intermediate value at each stage
- DF, EXF, SF default to 1.00 when no variation evidence present
- CO component = INSUFFICIENT_DATA on first analysis (only one period, no continuity data)
- Financial data (declared budget) does not enter any scoring formula — confirmed by inspection of IU calculation inputs
- Fiscal eligibility data does not enter any scoring formula
- PIB records are not readable by company_executive or company_hr_esg roles — role access test
- `kora_indices.activation_safeguard_result_id` is NOT NULL for every KORA Index record
- All output records carry `methodology_version_id` — confirmed by integration test

**Acceptance criteria:**
- Stress Test Scenario B reproduced within defined tolerance on synthetic Profile A data
- Every output record has `methodology_version_id NOT NULL` — database constraint enforces this
- PIB records are inaccessible to any employer-facing role — role access test confirms zero rows returned
- `activation_safeguard_result_id NOT NULL` confirmed for all `kora_indices` records

---

### Module E — Activation Safeguard

**Purpose:** Mandatory Stage 13 gate between company aggregation (Stage 12) and KORA Index calculation (Stage 14). Calculates AR (Activation Rate) and MAR (Meaningful Activation Rate). Assigns a safeguard status: CLEAR, WARNING, or FLAGGED. The KORA Index is always shown alongside its safeguard status — a high KORA Index with a FLAGGED safeguard must communicate the activation risk clearly.

**Dependencies:** Module D Stages 1–12 (company aggregates must exist). Activation Safeguard threshold values (from D-21). Workforce segment denominators.

**Required data:**
- `analytics.company_impact_aggregates` (pillar sums and worker counts with verified actions)
- `analytics.workforce_segments` (total active workforce denominator)
- Safeguard threshold values (from methodology version seed)

**Outputs:**
- `analytics.activation_safeguard_results`: AR value, MAR value, safeguard status (CLEAR/WARNING/FLAGGED), threshold values used, methodology version reference
- The safeguard result is referenced by `kora_indices.activation_safeguard_result_id` (NOT NULL)

**Risk:** Activation Safeguard thresholds are set incorrectly in the v0.1 seed — producing too many FLAGGED results on reasonable data, or too few on genuinely low-activation programs. Mitigation: validate thresholds against all four synthetic company profiles. Profile C (18% activation) must produce WARNING or FLAGGED. Profile A (68% activation) must produce CLEAR.

**Test cases:**
- Synthetic Profile A (68% activation) → Safeguard: CLEAR
- Synthetic Profile B (45% activation) → Safeguard: determined by threshold values (WARNING expected)
- Synthetic Profile C (18% activation) → Safeguard: WARNING or FLAGGED
- Synthetic Profile D (training records only, first analysis) → Safeguard result computed on available data; status reflects partial coverage
- KORA Index record cannot be created without a safeguard result — confirmed by NOT NULL constraint

**Acceptance criteria:**
- Every `kora_indices` record references a valid `activation_safeguard_results` record
- Safeguard status is visible in the Executive Cockpit alongside the KORA Index — never hidden
- Profile C triggers a warning-level safeguard — confirmed by synthetic data test

---

### Module F — KORA Index v0.1

**Purpose:** Stage 14. Combine the 10-component values (AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS) using the seeded weight vector to produce the KORA Index for the company and program period. Every output is labeled: methodology version, calibration status (pre_empirical_calibration), confidence band, activation safeguard status, CO = INSUFFICIENT_DATA on first analysis.

**Dependencies:** Module E (safeguard result). Gate 4 (weight vector defined and sums to 1.00).

**Required data:**
- `analytics.activation_safeguard_results` (AR, MAR values)
- `analytics.company_impact_aggregates` (NI, WB, PC, PB components)
- `analytics.uef_records` quality metadata (EQ, VR components)
- Program period history (CO — INSUFFICIENT_DATA on first analysis)
- `gov.kora_index_weight_versions` (weight vector)

**Outputs:**
- `analytics.kora_indices`: KORA Index value [0–100], all metadata labels, safeguard status reference, methodology version reference
- `analytics.kora_index_components`: one record per component (10 records per KORA Index)

**CO redistribution rule (Foundation Light v0.1):**
When CO = INSUFFICIENT_DATA (first analysis, single program period), the CO component weight is redistributed proportionally across the nine remaining components. The total weight vector continues to sum to 1.00. Redistribution formula: for each remaining component `k`, the adjusted weight is `w_k_adjusted = w_k + (w_CO × w_k / (1 − w_CO))`. This ensures the KORA Index is not artificially deflated solely because the company has not yet accumulated a second period for continuity measurement. The plain-language label shown alongside the KORA Index reads: "Continuity (CO) component not calculated — this is a first analysis. CO data will be available after a second program period is completed."

CO weight redistribution must be explicitly coded in the scoring engine and validated as part of Stress Test Scenario B. The engine must produce the correct KORA Index value for Profile A using redistributed weights, not a reduced score from a missing CO component.

**Risk:** CO component labeled INSUFFICIENT_DATA on first analysis may be confusing to companies who see an unfamiliar label on their score. Mitigation: the Explainability Layer (Module G-EX) shows a plain-language explanation of CO = INSUFFICIENT_DATA, the redistribution rule applied, and what continuity measurement requires. The label and explanation are visible in the dashboard and in reports — they are not suppressed.

**Test cases:**
- KORA Index produced with all 10 components → value is within [0–100]
- CO component = INSUFFICIENT_DATA on first analysis → confirmed by test on Profile A first-period run
- KORA Index label includes: methodology version, calibration status, confidence band, safeguard status
- Weight vector sums to 1.00 — validated at seed time

**Acceptance criteria:**
- KORA Index produced correctly for all four synthetic profiles
- All mandatory labels are non-null on every `kora_indices` record
- CO = INSUFFICIENT_DATA on first analysis for every profile confirmed

---

### Module G — Executive Cockpit

**Purpose:** The primary company-facing intelligence interface. Displays the KORA Index with all mandatory labels, Activation Safeguard status, five-pillar balance visualization, activation rate, financial governance snapshot, and top insights. Company executive and HR/ESG viewers access this cockpit. All data is aggregated — no individual worker data.

**Dependencies:** Module F (KORA Index exists). Module E (safeguard result). Module A (company and program configured). Phase 6 cannot begin until the scoring engine output is confirmed correct (Stress Test Scenario B passed).

**Required data (company-facing views):**
- `analytics.kora_indices` (current period)
- `analytics.kora_index_components` (all 10 components)
- `analytics.activation_safeguard_results`
- `analytics.company_impact_aggregates` (per pillar)
- `gov.financial_governance_snapshots` (budget vs. IU efficiency)
- `analytics.workforce_segments` where `is_active = TRUE`

**Outputs:** Dashboard views; no new database records created.

**Risk:** Dashboard designed against assumed data shapes that are different from actual scoring engine output. Mitigation: no dashboard screen is designed before the scoring engine output schema is confirmed correct and stable.

**Test cases:**
- Profile A Executive Cockpit renders correctly with all five pillars populated
- Profile D Executive Cockpit renders correctly with only GROWTH pillar data and explicit "no data" indicators for other pillars
- Company executive cannot access UEF or PIB data through any dashboard route — role access test
- Below-threshold segment suppression: if a segment has fewer than 10 workers, it is not shown — suppression test
- KORA Index displays methodology version label, calibration status label, and safeguard status — UI completeness test

**Acceptance criteria:**
- All five pillars always displayed (some with "no data" indicators if empty)
- KORA Index visible with all mandatory labels
- Safeguard status visible and linked to explanation
- No individual worker data reachable from any company-facing route

---

### Module G-EX — Explainability & Confidence Layer

**Purpose:** Make every score legible and defensible. "Why this score" expandable panel available from any score display. Confidence-aware dashboard rendering (visual encoding of uncertainty). Confidence & Missing Data View. Limitation acknowledgment on all KORA Index outputs.

**Dependencies:** Module G (dashboard must exist). Scoring outputs stable.

**Required data:**
- All scoring component values and their contribution to the final KORA Index
- Source quality metadata per ingestion batch
- Missing dimension analysis (pillars with zero or near-zero data)
- `calibration_status` from methodology version record

**Outputs:** Explainability views; no new database records (explainability is a read-only rendering layer over existing scoring records).

**Risk:** Explainability text is technically accurate but not actually legible to a non-technical HR or ESG director. Mitigation: test the Score Explainability View with a non-technical pilot company contact before finalizing. If they cannot explain in one sentence what drove their score, the text needs revision.

**Test cases:**
- Score Explainability View for Profile A shows: top 3 contributing components, top IU-generating events per pillar, factors reducing the score, plain-language summary
- Profile C (low activation, Safeguard WARNING) shows the safeguard modifier as a reducing factor in the explanation
- Profile D (GROWTH only) shows: CO = INSUFFICIENT_DATA explanation, missing LIFE/CONNECTION/IMPACT/LEGACY explanation
- Confidence-aware rendering: Profile B (mostly declared events) shows desaturated visual treatment for low-EV pillars

**Acceptance criteria:**
- Every KORA Index display links to a legible Score Explainability View
- Missing Dimension View correctly identifies which pillars have zero or near-zero data for all four profiles
- Limitation acknowledgment is present on every KORA Index display (pre-calibration label)

---

### Module G-TI — Temporal & Activation Intelligence Layer

**Purpose:** Surface concentration risks, pillar imbalance, activation continuity, and organizational blind spots. On first analysis, temporal evolution infrastructure is visible but empty with a clear "baseline established" message.

**Dependencies:** Module G. Scoring outputs stable.

**Required data:**
- `analytics.company_impact_aggregates` (pillar distribution, IU concentration)
- `analytics.kora_index_components` (PB component for imbalance)
- `analytics.activation_safeguard_results` (AR, MAR)
- Program history (for continuity — empty on first analysis)

**Outputs:** Temporal intelligence views; no new database records.

**Risk:** Concentration risk thresholds (e.g., >60% of IUs in one pillar) are set too sensitively and trigger on profiles that have a legitimate single-pillar focus. Mitigation: validate thresholds against all four synthetic profiles. Profile B (GROWTH concentration) should trigger. Profile A (balanced) should not trigger a concentration alert.

**Test cases:**
- Profile B (71% GROWTH concentration) → concentration risk card displayed
- Profile A (balanced) → no concentration risk card displayed
- All profiles on first analysis → evolution timeline shows "Baseline established: [date]" with no history
- Blind-spot detection: Profile D (training records only, no welfare data) → blind-spot card: "Welfare usage data not provided"

**Acceptance criteria:**
- Concentration risk cards appear correctly for profiles that exceed thresholds
- Temporal evolution baseline shown on first analysis (not an error state)
- Blind-spot detection correctly identifies missing data dimensions for Profile D

---

### Module W — Worker PIB Light

**Purpose:** Demonstrate the worker-facing intelligence layer using synthetic or pseudonymized demo data. Five-pillar PIB display, verified actions timeline, privacy view, employer visibility boundary. Real workers at pilot companies do not receive production accounts at Foundation Light v0.1.

**Dependencies:** Module D Stage 11 (PIB engine — PIB records must be computed by the real algorithm, not hardcoded). Synthetic worker profiles (W-1, W-2, W-3, W-4) loaded in Phase 2.

**Required data:**
- `analytics.pib_records` for demo worker profiles (computed by real scoring engine on synthetic data)
- `analytics.uef_records` for demo worker profiles (verified actions timeline)
- Privacy boundary configuration (what employer can and cannot see)

**Outputs:** Worker-facing views; no new database records.

**Risk:** Worker PIB Light interface visually inconsistent with the company-facing experience — making the product feel fragmented during a demo. Mitigation: apply doc 17 design principles consistently across all actor interfaces. Worker interface is calmer and more human-centered than the company intelligence interface, but they share the same visual language.

**Test cases:**
- Demo Worker W-1 (balanced, three pillars) → PIB display shows three populated pillars, one declared + one evidenced + one certified
- Demo Worker W-2 (GROWTH only, declared) → PIB display shows one pillar populated, declared verification level indicator
- Demo Worker W-3 (minimal) → PIB display shows minimal data state honestly — no inflated representation
- Demo Worker W-4 (LEGACY + CONNECTION, senior) → PIB display shows LEGACY and CONNECTION populated; confirms all five pillars are operational in the scoring engine
- `worker_light` role cannot access `analytics.company_impact_aggregates` or `analytics.kora_indices` — role access test
- Employer Visibility Boundary View correctly shows what employer sees (aggregates only, never individual)

**Acceptance criteria:**
- Worker PIB Light Home renders correctly for all four demo worker profiles
- Privacy & Data Ownership View present and readable in plain language (not legal copy)
- Employer Visibility Boundary View clearly shows the dividing line
- Worker interface demonstrable in under 5 minutes in a pilot presentation

---

### Module P — Partner Onboarding Light

**Purpose:** Catalog partner profiles, service categories, and pillar coverage. Link partners to company programs. Support the partner review workflow. No marketplace, no payments, no public discovery.

**Dependencies:** Phase 1 (partner schema tables). Module A (company programs must exist for linkage). Can be built in parallel with Phases 3–8.

**Required data:**
- Partner organization details (name, type, geography, pillar coverage)
- Service catalog entries (service name, pillar assignment, evidence type)
- Company-program linkage (which programs reference which partner services)
- Evidence/document metadata (for advisor review)

**Outputs:**
- `gov.partners` record
- `gov.partner_services` records
- `gov.company_program_partner_links` records
- `evidence.partner_evidence_documents` metadata records
- Partner review status updates

**Risk:** Over-engineering partner onboarding beyond the defined scope — adding ranking, analytics, or marketplace features that belong to later tiers. Mitigation: strictly enforce Module P boundaries at design and code review. If a proposed feature is not in the Module P definition, it is deferred.

**Test cases:**
- Synthetic Partner P-1 (welfare provider, LIFE + CONNECTION, approved) onboarded and linked to Profile A company program
- Synthetic Partner P-2 (training provider, GROWTH, approved with notes) onboarded
- Synthetic Partner P-3 (ESG partner, IMPACT, under review) onboarded with review status shown
- `partner_light` role cannot access `analytics.kora_indices` — role access test
- Partner can view own profile and review status but not another partner's profile

**Acceptance criteria:**
- Three synthetic partner profiles onboarded and linked to relevant company programs
- Partner review status visible to partner in their portal view
- KORA internal partner directory searchable by pillar, type, geography, review status

---

### Module A-ADV — Advisor Portal Light

**Purpose:** Give KORA-authorized advisors controlled, structured participation in review processes. Assigned reviews only. No certification issuance, no LMS, no payments.

**Dependencies:** Phase 1 (advisor schema tables). Module P (partner profiles exist for partner review assignments). Can be built in parallel with Phases 8–9.

**Required data:**
- Advisor profile (name, role type, credentials, assigned geography/sector)
- Review assignments (created by KORA Admin or Analyst)
- Evidence documents linked to the assignment (read-only access)

**Outputs:**
- `gov.advisors` record
- `gov.advisor_reviews` records (assignments)
- `gov.advisor_review_notes` records (structured notes per assignment item)
- `gov.advisor_review_checklists` records (checklist progress per assignment)
- Review approval/revision states

**Risk:** Advisor workflow complexity grows beyond the defined scope — adding communication features, certification workflows, or payment tracking that belong to later tiers. Mitigation: enforce Module A-ADV scope strictly. All advisor-company communication flows through KORA — no direct communication channel.

**Test cases:**
- Synthetic Advisor ADV-1 assigned to review Profile A scoring run
- Advisor can access assigned review materials in read-only mode
- Advisor can add structured notes (observation, concern, recommendation, approval types)
- Advisor completes checklist and submits Approved status → review status updated and audit trail entry created
- `advisor_light` role cannot access unassigned companies or partners — role access test
- Advisor cannot see `analytics.kora_indices` unless included in their assignment scope

**Acceptance criteria:**
- Full end-to-end advisor review workflow demonstrated with ADV-1 and Profile A
- Advisor approval state flows correctly to partner profile review status
- Every advisor action appears in `audit.audit_trail_records`

---

### Module H — Impact Report Generator

**Purpose:** Generate the exportable executive report as a PDF and web view. Report includes KORA Index with all labels, pillar breakdown, activation intelligence, financial governance snapshot, explainability section, concentration risk summary, missing dimension guidance, and methodology transparency section.

**Dependencies:** Module G, Module G-EX, Module G-TI (all dashboard content must be finalized and validated). Blob storage operational (Phase 1). Report template designed, founder-reviewed against doc 17 visual standards, and approved — this is a **named deliverable**, not an implicit prerequisite. The report template must be completed and approved before the PDF generation pipeline is built. Fixing a template after the generation pipeline is built is far more expensive than reviewing it before. Template design is a Phase 7 exit deliverable. Owner: Developer (template structure and layout) + Founder (doc 17 compliance review and approval). No Phase 11 work begins without an approved template.

**Required data:**
- All scoring output tables for the company and period
- Explainability component values
- Concentration risk and blind-spot detection results
- Methodology version record (for transparency section)

**Outputs:**
- `gov.reports` record with metadata
- PDF stored in `report-exports` bucket
- Pre-signed time-limited download URL generated on request
- Every download generates an audit trail entry

**Risk:** Report visual quality does not meet doc 17 standards — making the product appear lower-quality than the underlying methodology warrants. Mitigation: review report template against doc 17 before PDF generation is built. If the template is wrong, it is cheaper to fix before the generation pipeline is built.

**Test cases:**
- Report generated for Profile A → PDF downloads correctly via pre-signed URL
- Pre-signed URL expires after defined TTL (e.g., 24 hours) → expired URL returns error, not the file
- `download_count` increments correctly per download — race condition test (concurrent downloads)
- Report contains mandatory labels: methodology version, calibration status, pre-calibration disclaimer, CO INSUFFICIENT_DATA explanation
- `gov.reports.generation_status` reflects the correct state at each step (generating / completed / failed)

**Acceptance criteria:**
- PDF report generates for all four synthetic company profiles
- Report passes doc 17 visual review (typography, color use, data visualization standards)
- Pre-signed URL access confirmed and expiry confirmed
- Every report generation and download is in `audit.audit_trail_records`

---

### Module I — Founder Validation Cockpit

**Purpose:** KORA-internal only. Enables the founder to track the stakeholder pipeline per doc 14/15 — company pipeline stages, ICP Fit score, Conviction Delta, 90-day phase progress, validation KPIs. Manual data entry at v0.1.

**Dependencies:** Phase 1 (stakeholder tables). Independent of Phases 3–11.

**Required data:**
- Stakeholder company records (manually entered)
- Pipeline stage per company (per doc 14 stage definitions)
- ICP Fit score, Conviction Delta, Internal Champion Strength (manually scored)
- 90-day phase progress indicators

**Outputs:**
- `gov.stakeholder_companies` records
- `gov.stakeholder_contacts` records
- `gov.pipeline_events` records

**Risk:** Cockpit drifts toward CRM complexity — adding email tracking, outreach automation, or calendar integration that creates operational overhead without validation return. Mitigation: strictly follow doc 14 scope at v0.1. The cockpit is a structured tracking tool, not a CRM.

**Test cases:**
- Founder can add a new stakeholder company and record ICP Fit score
- Pipeline stage progression recorded correctly with timestamp
- 90-day KPI targets visible against current actuals
- Cockpit accessible only by KORA Admin (Founder) role — role access test

**Acceptance criteria:**
- Founder can run the weekly review ritual defined in doc 15 using only the Cockpit
- All 90-day validation KPIs visible in one view

---

### Module G-FV — Future Vision Area

**Purpose:** 14 static, clearly labeled mockup screens showing the full KORA platform direction. Every screen carries the label "Future Vision — Not active in Foundation Light v0.1." Visually consistent with doc 17 design standards.

**Dependencies:** Doc 17 visual design direction. Can be built in parallel with any phase. Requires no database tables or API calls — static content only.

**Outputs:** Static screen content. No database records.

**Risk:** Vision screens appear lower quality than functional screens, undermining the demo. Mitigation: vision screens must meet the same doc 17 visual standards as functional screens. The difference is depth of interaction, not visual quality.

**Test cases:**
- All 14 screens render correctly
- Every screen carries the "Future Vision — Not active in Foundation Light v0.1" label in a visible position
- Screens are accessible from a dedicated navigation destination

**Acceptance criteria:**
- All 14 vision screens complete and labeled
- Demo of Future Vision Area completable in under 3 minutes without confusion

---

## 5. Synthetic Data Plan

### 5.1 Purpose and isolation

All synthetic data serves two functions: (1) validation — confirming that the scoring engine produces correct outputs for diverse data profiles; (2) demonstration — enabling a complete pilot demo without requiring real company data.

Synthetic data is isolated in the development environment. It does not reach staging or production. Stress Test scenarios are the primary scoring validation reference.

### 5.2 Company profiles

**Profile A — Strong company (balanced, high-confidence)**
Italian mid-market manufacturing, 800 employees. Active welfare + training + volunteering programs. 68% activation rate. Mix of evidenced and certified events. Expected KORA Index: 65–72. Expected Safeguard: CLEAR. Expected pillar balance: all five pillars represented.

Explicit LEGACY and CONNECTION representation: Profile A includes a structured senior-junior mentoring program (generating LEGACY IUs — certified, knowledge transfer) and a peer coaching initiative (generating CONNECTION IUs — evidenced). W-4 (senior demo worker) is linked to Profile A. This ensures LEGACY is not an abstract future pillar during demo — it is present, named, and scored in the primary reference profile.

Validation use: confirms the scoring engine produces a high-confidence, balanced output on well-structured data. Demonstrates the Executive Cockpit at its best state, with all five pillars visibly populated including LEGACY and CONNECTION.

**Profile B — Developing company (GROWTH concentration, low LEGACY)**
Italian services, 400 employees. Training-heavy, minimal welfare, no social initiatives. 45% activation. Mostly declared data. Expected KORA Index: 45–52. Expected Safeguard: WARNING (threshold-dependent). Expected pillar distribution: GROWTH dominant, LEGACY = 0 or near-zero.

Validation use: confirms concentration risk detection triggers correctly. Demonstrates the Temporal Intelligence Layer's concentration card.

**Profile C — Problematic company (low activation, poor data quality)**
Italian retail, 1,200 employees. Many programs declared, 18% actual activation. Expected KORA Index: low range (threshold-dependent). Expected Safeguard: WARNING or FLAGGED. Expected confidence: low (mostly declared data, high missing-field rate).

Validation use: confirms Activation Safeguard produces a warning state on genuinely low-activation programs. Tests the Explainability Layer's ability to explain a poor score clearly.

**Profile D — First-time analysis (missing data)**
Italian professional services, 250 employees. Training records only. GROWTH pillar data only. No welfare, volunteering, or ESG records. Expected KORA Index: limited by low PC (Pillar Coverage) and missing dimensions. CO = INSUFFICIENT_DATA.

Validation use: confirms honest limitation acknowledgment — KORA does not inflate a score from minimal data. Demonstrates the Missing Dimension View explaining what is absent and why.

### 5.3 Worker profiles

Three demo worker profiles per company. Used with synthetic company profiles to demonstrate Worker PIB Light. All use pseudonymized identifiers — no real worker data.

**W-1 (Active, balanced):** Contributions across three pillars: GROWTH (two training completions, evidenced), LIFE (one welfare service, evidenced), IMPACT (one volunteering event, certified). Shows a meaningful multi-pillar PIB.

**W-2 (Single-pillar, declared only):** GROWTH only, declared events. Shows a narrower PIB and the difference between declared and evidenced verification levels. Demonstrates that the platform does not inflate single-pillar workers.

**W-3 (Minimal participation):** One declared event only. Shows the PIB interface under minimal data conditions. Honest minimum — no fabricated balance.

**W-4 (LEGACY + CONNECTION, senior dual-pillar profile):** Knowledge transfer session (LEGACY, certified), senior-junior mentoring role (LEGACY, evidenced), peer coaching contribution (CONNECTION, evidenced). This profile demonstrates that LEGACY and CONNECTION are fully operational pillars — not placeholders. It serves as the primary demo profile for showing that the full five-pillar model is active, that mentorship and knowledge transfer are recognized as impact, and that the platform handles senior worker profiles differently from training-heavy junior profiles. Linked to Company Profile A as a senior employee.

### 5.4 Partner profiles

**P-1 (Welfare provider, LIFE + CONNECTION, approved):** Psychological support and team coaching, Italy-wide. Two service catalog entries. Review status: approved.

**P-2 (Training provider, GROWTH, approved with notes):** Upskilling and certification programs. Three service catalog entries. Review status: approved with notes (missing evidence document noted in review).

**P-3 (ESG partner, IMPACT, under review):** Community volunteering coordination. One service catalog entry. Review status: under_review. Demonstrates the review workflow in progress.

### 5.5 Advisor profile

**ADV-1 (Methodology Reviewer):** Assigned to review the scoring run for Company Profile A. One active assignment. Full demonstration of: review acceptance, checklist completion, evidence note, approval submission, audit trail generation.

### 5.6 Stress Test scenarios

Stress Test scenarios from Appendix A are the primary numerical validation reference for the scoring engine. They must be loaded as development-only fixtures before Phase 5 begins. The scoring engine must reproduce Stress Test Scenario B within defined tolerance before Phase 6 (dashboard) begins.

Stress Test fixtures are isolated from all synthetic demo data. They serve validation only — they are not used in demo presentations.

---

## 6. Testing Strategy

### 6.1 Unit tests

**Scope:** Each scoring formula component in isolation.
- NM calculation with defined inputs → expected NM output
- BC coefficient with defined cohort inputs → expected BC value
- IU formula with defined factor inputs → expected IU value
- Activation Rate calculation with defined worker counts → expected AR
- Each KORA Index component with defined inputs → expected component value
- Weight vector sum validation → must equal 1.00

**Owner:** Developer / CTO. Run on every code change to scoring engine.

### 6.2 Integration tests

**Scope:** Full pipeline from approved UEF records through KORA Index output.
- Approved UEF batch → all 14 stages execute in sequence → KORA Index produced with all mandatory fields
- Batch with zero IUs in one pillar → scoring produces PB (Pillar Balance) value reflecting imbalance
- Missing CO data (first analysis) → CO = INSUFFICIENT_DATA confirmed
- Financial data excluded → confirmed by inspecting that no budget field appears in IU formula inputs
- Fiscal eligibility data excluded → confirmed by inspecting IU formula inputs

**Owner:** Developer. Run before Phase 6 begins.

### 6.3 Scoring validation tests (Stress Test)

**Scope:** Numerical accuracy of the full scoring engine against validated scenarios.
- Stress Test Scenario B from Appendix A → KORA Index output within defined tolerance
- Each intermediate stage value matches expected value from Stress Test
- Tolerance band for acceptable deviation: to be defined by founder and methodology team before Phase 5

**Owner:** Developer + founder (validates tolerance band). Required before Phase 6.

### 6.4 Privacy tests

**Scope:** Verify that architectural privacy constraints hold across all code paths.
- `company_executive` role queries `analytics.uef_records` → zero rows returned, or permission denied
- `company_executive` role queries `analytics.pib_records` → zero rows returned, or permission denied
- `company_hr_esg` role queries `analytics.impact_units` → zero rows returned, or permission denied
- `worker_light` role queries another worker's PIB → permission denied
- `worker_light` role queries `analytics.kora_indices` → zero rows returned, or permission denied
- `partner_light` role queries another partner's profile → permission denied
- `advisor_light` role queries an unassigned company's data → permission denied
- High-sensitivity UEF record (`privacy_sensitivity = 'high'`) not accessible by `KORA_ANALYST` → confirmed

**Owner:** Developer + CTO. Run before any live data ingestion.

### 6.5 Role-access tests

**Scope:** Verify RBAC is correctly enforced for all seven roles across all 35+ screens.
- Each screen accessible only by roles that should have access
- Each screen blocked for roles that should not have access
- RLS filters: company role sees only own company data

**Owner:** Developer. Run before Phase 14 (Pilot Hardening).

### 6.6 Report generation tests

**Scope:** Report output correctness, visual quality, and access control.
- Report generated for Profile A → PDF produces, all mandatory sections present
- Pre-signed URL expires after TTL → expired URL blocked
- `download_count` increments correctly on concurrent downloads (race condition test)
- Report for Profile D includes explicit missing dimension sections
- Pre-calibration disclaimer present in every report

**Owner:** Developer. Run before Phase 11 completes.

### 6.7 AI ingestion tests

**Scope:** AI suggestion quality and governance compliance.
- AI processes Profile A synthetic data → pillar suggestion accuracy ≥80% on GROWTH, LIFE, IMPACT events
- AI processes a file with health/psychological keywords → sensitivity flags generated for all affected rows
- AI processes a file with 30% missing participant identifiers → missing-field alerts generated, Data Readiness Score reflects gap
- AI cannot set `review_status = 'confirmed'` on any record — confirmed by integration test
- Bulk-confirm blocked for sensitivity-flagged records — UI and database level test
- Every AI suggestion round-trip generates audit trail entry

**Owner:** Developer + founder (validates accuracy threshold). Run before Phase 4 completes.

### 6.8 Demo flow tests

**Scope:** End-to-end demo flows covering the scenarios a pilot company will experience.

**Demo Flow 1 — Full company onboarding (60-minute demo):**
Company setup → data upload → AI processing → analyst review → scoring → Executive Cockpit → Explainability View → Report download. All on Profile A data. No developer intervention required.

**Demo narrative order note:** In a pilot company presentation, do not open with the analyst's operational steps. Open with the Executive Cockpit result pre-loaded with Profile A data — show the company stakeholder what they will see (KORA Index, pillar balance, activation rate, safeguard status) before explaining how it was produced. Then walk back through the onboarding process (upload → AI Data Readiness Summary → AI Mapping Review → scoring). The "result first, process second" narrative sequence is more compelling to a non-technical decision-maker than the technical process order. A prospect who sees the output first asks "how do you get there?" — that question is the natural lead-in to the onboarding demo. The demo script must reflect this sequence explicitly.

**Demo Flow 2 — Worker PIB Light (5-minute demo segment):**
Navigate to Worker PIB Light → show W-1 PIB → show verified actions timeline → show Employer Visibility Boundary View. All on synthetic data.

**Demo Flow 3 — Future Vision Area (3-minute demo segment):**
Navigate to Future Vision → show 5 representative screens → explain what is coming → return to functional area. All screens labeled correctly.

**Owner:** Founder + developer. Run before Phase 14 completes. Both flows must be completable without developer intervention.

---

## 7. Build Order

Phases directly from doc 18 Section 15, with technical elaboration on dependencies and risks.

### Phase 0 — Architecture Review
**Objective:** Complete all five gate conditions. Founder records positions on D-01 through D-21. CTO reviews docs 10, 12, 13. Legal/privacy counsel engagement begun. Tax/fiscal advisor engagement begun. Methodology numerical values (D-21) defined.
**Output:** All gates passed or on track. Doc 20 reviewed.
**Duration target:** 2–4 weeks.
**Dependency:** None — this is the starting gate.
**Risk:** CTO unavailability delays Gate 2. Mitigation: founder can complete Gate 1 in parallel and begin doc 12/13 self-review while CTO is being identified.

### Phase 1 — Infrastructure & Data Model
**Objective:** Supabase project provisioning (two projects: Identity Store + Main Platform). Schema creation: gov, analytics, evidence, audit. Database roles provisioned. Blob storage buckets created. Pseudonymization Edge Function operational. Audit INSERT-only role configured. Methodology seed executed.
**Output:** Databases operational in development. All roles configured. Methodology v0.1 seeded. Pseudonymization service tested.
**Dependency:** Gates 1 and 2 passed. Gate 4 (D-21 values) must be complete for methodology seed.
**Risk:** Pseudonymization service takes longer than expected to build and test. Mitigation: build and test pseudonymization service before any other pipeline component. Nothing that touches worker identifiers can be tested until pseudonymization works correctly.

### Phase 2 — Synthetic Data
**Objective:** Load all synthetic data: four company profiles (A–D), four worker profiles (W-1 through W-4, including W-4 LEGACY+CONNECTION senior profile), three partner profiles (P-1 through P-3), advisor ADV-1. Load Stress Test scenarios as development-only fixtures.
**Output:** Full synthetic dataset in development environment. Expected scoring outputs documented per profile.
**Dependency:** Phase 1 (schema and methodology seed in place).
**Risk:** Synthetic data does not exercise edge cases adequately. Mitigation: Profile C (low activation, poor data) and Profile D (missing data) are mandatory edge case exercises, not optional.

### Phase 3 — Ingestion Studio (Base)
**Objective:** Module B. File upload, column mapping interface, source type classification, validation, batch status tracking. AI is not yet integrated — manual column mapping only.
**Output:** A KORA Analyst can upload a file, map columns manually, and submit a batch. Batch status visible.
**Dependency:** Phase 1, Phase 2 (for testing).
**Risk:** Column mapping UX becomes complex to use. Mitigation: distribute data templates early to pilot companies so uploads match expected structure, reducing mapping ambiguity.

### Phase 4 — AI Ingestion Assistant
**Objective:** Module B-AI. Column recognition, source-type recognition, event-type suggestion and pillar suggestion via the rule-based BCM taxonomy classifier (Foundation Light v0.1 — no external LLM API calls on company HR data), sensitivity detection, duplicate detection, missing-field detection, Data Readiness Score, AI Mapping Review screen, UEF Draft Preview.
**Output:** AI processes an uploaded batch and produces a reviewable suggestion set. Analyst can confirm, override, or reject.
**Dependency:** Phase 3. BCM taxonomy seeded (Phase 1).
**Risk:** AI pillar suggestions perform below acceptable accuracy threshold on novel data. Mitigation: validate against synthetic data before exposing to pilot companies. Define accuracy threshold and pass criteria before Phase 4 is marked complete.

### Phase 5 — UEF Mapping + Scoring Engine
**Objective:** Module C (UEF confirmation) and Module D through Module F (full 14-stage scoring). Scoring engine validated against Stress Test Scenario B.
**Output:** Engine produces methodology-versioned scoring outputs through Stage 14. Stress Test Scenario B passed within tolerance.
**Dependency:** Phase 4. Gate 4 (D-21 values seeded). Phase 2 (synthetic profiles for validation).
**Risk:** Scoring engine does not pass Stress Test within tolerance. Mitigation: validate each stage independently before connecting them into the full pipeline. Fix stage-by-stage before running end-to-end.

### Phase 6 — Company Dashboard
**Objective:** Module G. Executive Cockpit, Pillar Breakdown, Activation & Workforce Intelligence, Financial Governance Snapshot, Report Export View.
**Output:** Company-facing dashboard functional on Phase 5 scoring outputs.
**Dependency:** Phase 5 confirmed correct (Stress Test passed). No dashboard is built until the scoring engine output is validated.
**Risk:** Dashboard assumes data shapes that are wrong. Mitigation: design no dashboard screen before underlying data is confirmed by the scoring engine.

### Phase 7 — Explainability & Confidence Layer
**Objective:** Module G-EX and Module G-TI. Score Explainability View, Confidence & Missing Data View, Temporal & Activation Intelligence View.
**Output:** Company users navigate from any score to a plain-language explanation. Concentration risks and blind spots are visible.
**Dependency:** Phase 6.
**Risk:** Explainability text too technical for non-technical users. Mitigation: test with a non-technical pilot company contact before Phase 7 is marked complete.

### Phase 8 — Worker PIB Light
**Objective:** Module W. Five-pillar PIB display, verified actions timeline, privacy view, employer visibility boundary. All on synthetic worker profiles W-1 through W-4 (including W-4 LEGACY+CONNECTION senior profile).
**Output:** Worker PIB Light demonstrable in a pilot presentation.
**Dependency:** Phase 5 (PIB produced by real Stage 11 engine). Phase 2 (synthetic worker profiles).
**Risk:** Worker experience visually inconsistent with company experience. Mitigation: apply doc 17 design principles consistently.

### Phase 9 — Partner Onboarding Light
**Objective:** Module P. Partner profile creation, service catalog, company-program linkage, review status.
**Output:** Three synthetic partner profiles onboarded and linked.
**Dependency:** Phase 1 (partner schema). Can run in parallel with Phases 3–8.
**Risk:** Feature creep toward marketplace functionality. Mitigation: enforce Module P boundaries at review.

### Phase 10 — Advisor Portal Light
**Objective:** Module A-ADV. Advisor dashboard, assigned reviews, evidence review, review checklists, approval/revision states.
**Output:** One end-to-end advisor review workflow demonstrated with ADV-1.
**Dependency:** Phase 1 (advisor schema). Phase 9 (partner profiles exist for partner review assignments). Can run in parallel with Phases 8–9.
**Risk:** Advisor workflow complexity. Mitigation: enforce Module A-ADV boundaries strictly.

### Phase 11 — Report Export
**Objective:** Module H. PDF generation with all required sections. Pre-signed URL download.
**Output:** PDF report generates and downloads. Report passes doc 17 visual review.
**Dependency:** Phase 6, Phase 7, blob storage (Phase 1). **Report template approved (Phase 7 exit deliverable) — no PDF generation pipeline work begins without an approved template.**
**Risk:** Report visual quality below doc 17 standards. Mitigation: review template before generation pipeline is built.

### Phase 12 — Founder Validation Cockpit
**Objective:** Module I. Stakeholder pipeline, ICP Fit tracking, Conviction Delta, validation KPIs.
**Output:** Founder can run the weekly review ritual using the Cockpit.
**Dependency:** Phase 1 (stakeholder schema). Independent of Phases 3–11.
**Risk:** CRM feature creep. Mitigation: strictly follow doc 14 scope.

### Phase 13 — Future Vision Area
**Objective:** 14 static vision screens, all labeled "Future Vision — Not active in Foundation Light v0.1."
**Output:** Vision area completable in a 3-minute demo segment.
**Dependency:** None — can run in parallel with any phase. Requires doc 17 visual direction.
**Risk:** Vision screens lower quality than functional screens. Mitigation: same doc 17 standards apply.

### Phase 14 — Pilot Hardening
**Objective:** End-to-end testing with all synthetic profiles. Privacy tests. Role access tests. DPA finalization. Data template preparation. Demo rehearsal. Pilot readiness checklist fully complete.
**Output:** System ready for first real company data ingestion (Gate 3 must be passed before real data).
**Dependency:** Phases 1–13 complete. Gate 3 (legal/privacy review) complete before real data.
**Risk:** Scoring engine issues discovered during hardening require significant changes. Mitigation: run a full synthetic pilot dry-run — the complete onboarding experience a real company will have, using synthetic data — before declaring hardening complete.

---

## 8. Developer Handoff Checklist

Before a developer (CTO or engineering team) can begin Phase 1, the following materials and decisions must be prepared and accessible.

### 8.1 Documents to read before writing any code

| Document | What the developer needs from it |
|---|---|
| `docs/10-architecture-v3-layer-specification.md` | 14-stage algorithm flow, IU formula, 10-component KORA Index, Activation Safeguard — the most important technical reference |
| `docs/06-methodological-constitution.md` | Scoring principles and formula definitions — the methodology the code must implement |
| `docs/07-conceptual-data-model-core-entities.md` | Entity definitions and relationships |
| `docs/12-technical-data-model-database-schema.md` | Full logical schema — all tables, fields, constraints, access rules |
| `docs/13-founder-cto-review-open-questions.md` | All 21 implementation decisions — the CTO must have read and approved these |
| `docs/appendices/A-stress-test-algoritmico-summary.md` | The only validated numerical scenarios — use for scoring engine validation |
| `docs/11-economic-fiscal-architecture-integration.md` | Economic/fiscal architecture — consult before any fiscal, payment, or FUO-adjacent feature |
| `docs/18-foundation-light-mvp-build-scope.md` | Product scope — what is built and what is explicitly deferred |
| `docs/19-ai-ingestion-engine-placement.md` | AI Engine governance — what AI can and cannot do |
| `docs/20-foundation-light-technical-implementation-plan.md` | This document — build phases, module specs, test cases |

### 8.2 Decisions the developer needs answers to before Phase 1

- Gate 1 positions recorded (D-01 through D-21) — from founder doc 13 review
- Pseudonymization service architecture confirmed (D-01, D-02)
- Cross-schema join policy confirmed (D-03)
- Grant-absence vs. RLS strategy confirmed per table (D-04)
- GDPR deletion cascade procedure defined (D-06)
- Safe aggregation enforcement strategy confirmed (D-07)
- High-sensitivity suppression approach confirmed (D-08)
- Methodology seed procedure confirmed (D-09)
- Stress Test fixture isolation strategy confirmed (D-10)
- Blob storage provider confirmed (D-17)
- Audit INSERT-only role provisioning approach confirmed (D-14)
- Report export security approach confirmed (D-15)
- Required indexes confirmed (D-16)

### 8.3 Values the developer needs before Phase 5

- BCM category weights and category definitions (D-21)
- NM normalization function parameters (D-21)
- AGF composition thresholds (D-21)
- Activation Safeguard thresholds — AR trigger level, MAR trigger level, safeguard modifier values (D-21)
- KORA Index 10-component weight vector (D-21, must sum to 1.00)
- Stress Test Scenario B expected output values and defined tolerance band

### 8.4 Legal/compliance engagement — Gate 3 timing

**Gate 3 timing clarification:** Gate 3 (legal/privacy counsel review) does not block Phase 1 infrastructure provisioning when using synthetic data only. Phases 1 and 2 (infrastructure and synthetic data loading) may proceed after Gates 1 and 2 are passed. Gate 3 blocks only live data ingestion from real companies.

However, Gate 3 engagement must begin in Phase 0 — not wait until Phase 1 or later. The materials below are prepared during Phase 0 and reviewed by counsel during or after Phase 1 (while the synthetic-only environment is being built). This parallel engagement is what allows Gate 3 to clear before Phase 14 (Pilot Hardening), when real data ingestion becomes possible.

**Materials to prepare during Phase 0 for counsel review during Phase 1:**
- Legal/privacy counsel identified and formally engaged
- GDPR deletion cascade procedure documented
- DPA template drafted and ready for review
- Data retention periods confirmed per evidence category (D-17)
- Worker consent model confirmed

### 8.5 Development environment specification

- Two Supabase projects provisioned: Identity Store and Main Platform
- Environment isolation: development / staging / production — no synthetic data crosses to production
- Stress Test fixtures: development-only, not in staging or production
- Database role provisioning plan: all seven roles defined before any table is created
- Vault or equivalent secrets manager configured before pseudonymization service is tested

### 8.6 Six architectural rules the developer must accept before starting

From doc 13 Section 8.2:

1. Identity Store must be physically separate from the main database — no SQL join path exists between them.
2. Employer roles have zero access to PIB, UEF, IU, and worker_profiles — enforced by grant absence, not RLS.
3. Every scoring output must carry `methodology_version_id NOT NULL` — a database-level constraint, not an application-level convention.
4. `audit.audit_trail_records` is INSERT-only at the database level — enforced by a dedicated role with no UPDATE or DELETE permission.
5. `kora_indices.activation_safeguard_result_id NOT NULL` — the Activation Safeguard is mandatory. There is no bypass.
6. Financial data, fiscal eligibility, and partner catalog counts do not enter the KORA Index formula. Period.

---

## 9. First Demo Definition

The first presentable demo must satisfy all of the following conditions. If any condition is not met, the demo is not ready.

### 9.1 Functional conditions

- One complete company dataset (Profile A) processable from upload through KORA Index in a single flow without developer intervention
- AI Ingestion Assistant produces a Data Readiness Summary for Profile A data within 60 seconds of batch submission
- AI Mapping Review screen shows AI suggestions with confidence levels for Profile A
- KORA Analyst can confirm the AI suggestions and advance the batch to scoring
- Full 14-stage scoring runs and produces a KORA Index for Profile A within defined time window
- KORA Index carries all mandatory labels: methodology version, calibration status, confidence band, safeguard status
- Executive Cockpit renders with all five pillars for Profile A
- Score Explainability View explains the Profile A score in plain language
- Temporal & Activation Intelligence View shows pillar balance for Profile A
- Worker PIB Light Home displays W-1 PIB with three populated pillars
- Employer Visibility Boundary View is accessible and legible
- PDF report generates and downloads for Profile A
- At least two partner profiles visible in the partner directory
- Advisor ADV-1 review assignment visible in the Advisor Portal
- Future Vision Area accessible from main navigation with all 14 screens labeled

### 9.2 Perception conditions

The demo must produce the following perception in a non-technical company decision-maker:

- "This system understands our data" (AI onboarding experience)
- "I can see what drives our score and what we need to improve" (Explainability Layer)
- "The worker can see their own impact journey, but we can't see it individually" (Worker PIB Light + Privacy boundary)
- "This isn't just a report — it's a platform" (multi-actor architecture visible through demo)
- "I can see where this is going and it's ambitious" (Future Vision Area)

### 9.3 Demo narrative sequence and timing targets

The primary demo opens with results and expands outward. The ingestion and AI analyst workflow is shown only if the audience asks "how does this work?" — it is not the opening.

**Primary demo sequence (for all company stakeholder audiences):**

| Demo segment | Sequence | Target duration |
|---|---|---|
| Executive Cockpit (KORA Index, pillars, safeguard — pre-loaded) | 1st | Under 10 minutes |
| Score Explainability ("why this score") | 2nd | Under 5 minutes |
| Worker PIB Light + Employer Visibility Boundary | 3rd | Under 5 minutes |
| Future Vision Area walkthrough | 4th | Under 3 minutes |
| **Core demo subtotal** | | **Under 25 minutes** |

**Optional extension (for technical audiences or when asked):**

| Demo segment | Sequence | Target duration |
|---|---|---|
| Data upload → AI Data Readiness Summary → AI Mapping Review | 5th (optional) | Under 10 minutes |
| Analyst confirmation → scoring pipeline | 6th (optional) | Under 5 minutes |
| **Full extended presentation** | | **Under 45 minutes** |

The Executive Cockpit must be pre-loaded with Profile A data before the demo begins. The presenter opens with "Here is what KORA produced for a company like yours" — not with "here is how to upload your data." The ingestion workflow is a second half, not a precondition. A prospect who sees the output first asks "how do you get there?" — that question is the lead-in to the optional extension.

---

## 10. First Pilot Definition

Before the first real company data is ingested, all of the following must be complete. This is distinct from the first demo — demos use synthetic data; pilots use real company data.

### 10.1 Technical readiness

- Phase 14 (Pilot Hardening) complete
- Stress Test Scenario B validated within defined tolerance
- All privacy tests passed (role-access tests, grant-absence tests, aggregation threshold tests)
- All report generation tests passed
- Full synthetic dry-run completed: end-to-end from Profile A upload through PDF download without developer intervention
- Pseudonymization service tested with real-structure (but not real-identity) data

### 10.2 Legal and compliance readiness (Gate 3 complete)

- Legal/privacy counsel review of pseudonymization architecture complete — written validation received
- GDPR deletion cascade procedure documented and tested
- DPA template finalized and ready for company signature
- Privacy notice prepared for company and worker communication
- Data retention policies confirmed for each evidence category
- Worker consent model confirmed

### 10.3 Methodology readiness

- Methodology v0.1 numerical values seeded (Gate 4)
- Methodology brief prepared in plain language (one page, non-technical, for pilot company)
- AI classification suggestions validated against expected pillar assignments on synthetic data (accuracy threshold confirmed)

### 10.4 Commercial readiness

- Pilot engagement structure defined (scope, price, timeline, deliverable)
- Pilot proposal template ready
- Data template for companies: what to send, in what format
- Data dictionary documented for company HR/ESG team
- Demo script rehearsed covering all six product groups (A through F)
- Objection handling document prepared
- Future Vision Area demo narrative prepared

### 10.5 Ecosystem readiness (minimum)

- At least two real or demo partner profiles onboarded and reviewed
- Advisor review workflow tested end-to-end with demo assignment (ADV-1)

### 10.6 Validation readiness

- Founder Validation Cockpit populated with first 10–15 target companies
- 90-day validation plan Phase 1 launched (per doc 15)
- First outreach wave initiated

---

## 11. Risks

### 11.1 Overbuilding

**Risk:** Features beyond the defined module scope are added during implementation — marketplace elements in Module P, recommendation engine in Module B-AI, certification workflows in Module A-ADV.
**Impact:** Delays pilot, increases complexity, risks violating architectural constraints.
**Mitigation:** Strict module boundary enforcement at code review. Every feature proposed must trace to a specific module definition in doc 18. If it is not in the definition, it is deferred, not incorporated.
**Owner:** CTO + founder.

### 11.2 Privacy architecture failure

**Risk:** Grant-absence model is incorrectly implemented — employer roles receive read access to UEF, PIB, or IU records through a misconfigured role, view, or join.
**Impact:** Individual worker data exposure to employer — irreversible privacy violation, regulatory exposure, loss of trust.
**Mitigation:** Privacy tests are a Phase 0 requirement before any live data enters the system. Role-access tests are automated and run on every deployment. No live data ingestion before Gate 3 (legal/privacy review complete).
**Owner:** CTO. Severity: **Critical.**

### 11.3 AI mapping unreliability

**Risk:** AI pillar suggestions perform below acceptable accuracy threshold on real company data that does not resemble the synthetic training data — producing systematic misclassification at the event-type or pillar level.
**Impact:** Analysts spend as much time correcting AI suggestions as they would mapping manually — AI provides no onboarding acceleration. Worse: low-confidence suggestions accepted in bulk without scrutiny.
**Mitigation:** Define accuracy threshold before Phase 4 begins. Validate against all four synthetic profiles. If threshold is not met on synthetic data, AI suggestions must be surfaced at a lower confidence band universally, disabling bulk-confirm until the model is improved.
**Owner:** Developer + founder.

### 11.4 Algorithm seed values (D-21) defined too late

**Risk:** Methodology numerical values (D-21) are not defined before Phase 5 begins — forcing placeholder values to be used in the scoring engine, which then produces outputs that do not reflect real methodology intent.
**Impact:** Scoring engine passes its own unit tests but fails the Stress Test. Worse: incorrect values reach a pilot company and produce a score that cannot be defended.
**Mitigation:** Gate 4 is a hard block on Phase 5. Founder and methodology team must define these values before a single line of scoring engine code is written. This is a non-negotiable dependency.
**Owner:** Founder (decision). Methodology team (validation).

### 11.5 Report visual quality

**Risk:** PDF report does not meet doc 17 visual standards — typography is wrong, color proportions are off, data visualizations are cluttered or misaligned.
**Impact:** A poor-quality report undermines trust in the entire product — the report is the deliverable a pilot company takes back to their board or ESG committee.
**Mitigation:** Report template is reviewed against doc 17 before the PDF generation pipeline is built (not after). Fixing the template is less expensive than rebuilding the generation pipeline around a wrong template.
**Owner:** Developer + founder (design review).

### 11.6 Role access mistakes

**Risk:** Database roles are misconfigured — a company user receives access to a screen or table they should not see, or a feature is blocked for a role that should have access.
**Impact:** Range from minor usability issues (blocked features for legitimate users) to critical privacy violations (employer sees worker data).
**Mitigation:** Role-access test suite covers all seven roles against all access-controlled resources. Tests run before Phase 14 completes. No pilot without passing role-access tests.
**Owner:** Developer. Severity: **Critical** for privacy-relevant role boundaries.

### 11.7 Methodology numerical values defined too late (Delphi Study delay)

**Risk:** Defining the methodology numerical seed values (D-21) requires a structured expert consultation process (Delphi Study or equivalent methodology calibration). If this process takes longer than expected — due to difficulty convening methodology experts, multiple revision rounds, or disagreement on pillar weight calibration — Gate 4 is delayed, which blocks Phase 5 (Scoring Engine).
**Impact:** A delayed Gate 4 cascades: Phase 5 cannot begin, which delays Phase 6 (Dashboard), Phase 7 (Explainability), and all downstream phases. The entire MVP timeline shifts.
**Mitigation:** Treat Gate 4 as a parallel-track effort from Phase 0 — the methodology values process starts immediately alongside founder and CTO review, not after Gates 1 and 2 are passed. Define a provisional value set (clearly labeled as provisional, not released externally) that allows Phase 5 development and internal testing to begin under time pressure. The commitment: final validated values replace provisional values before any pilot company sees any output. Scoring engine outputs produced under provisional values carry a distinct internal-only label.
**Owner:** Founder + methodology team. **Start in Phase 0, not Phase 4.**

### 11.8 CTO architectural disagreement

**Risk:** The CTO reviews docs 10, 12, 13, and 20 (Gate 2) and raises fundamental objections to the two-database architecture, pseudonymization service design, scoring engine structure, or module sequencing — requiring a significant revision round before implementation may begin.
**Impact:** Gate 2 delay cascades to Phase 1 delay. If CTO objections require revisions to doc 12 (schema design) or doc 13 (architectural decisions), the revised documents must be re-reviewed by the founder before SQL generation may proceed.
**Mitigation:** Engage the CTO in Phase 0 — brief them on the full architecture before the formal review documents are handed over. A CTO who has been involved in conversations arrives at the formal review with context, not cold. If the CTO identifies a material architectural objection, the founder makes one of three decisions: (1) accept the CTO's alternative and update docs 12/13 accordingly; (2) present the original rationale and confirm the existing approach with documented reasoning; (3) defer the contested element to a specific later phase when more implementation data is available. Architectural disagreements are resolved through documented decisions, not informal overrides or silent ignoring. If a disagreement cannot be resolved before Phase 1, the contested decisions are flagged as open and Phase 1 proceeds on the agreed scope only.
**Owner:** Founder (decision authority) + CTO (review authority).

### 11.9 Demo confusion between functional and future vision

**Risk:** A pilot company or investor cannot tell which parts of the product are functional and which are Future Vision mockups — leading either to inflated expectations (they think the full ecosystem is live) or deflated trust (they think the platform is less developed than it is).
**Impact:** Commercial credibility damage. Worse: a company signs a pilot expecting features that are not active.
**Mitigation:** Three explicit layer labels throughout the product — Live, Innovation Preview, Future Vision. The Future Vision label is visible, consistent, and not ambiguous. Demo script explicitly addresses the label during the Future Vision Area walkthrough: "This is where the platform is going. Here is what is active today." The label system is tested in the demo dry-run.
**Owner:** Founder (demo narrative). Developer (label implementation).

---

## 12. Next Step

### 12.1 After doc 20 review

When the founder and CTO have reviewed this document, the following actions unlock:

**If Gates 1 and 2 are passed:**
The project may proceed to SQL schema generation for Database B (Main Platform), starting with the `gov` schema. Schema generation proceeds one store at a time in the order defined in doc 13 Section 9: gov → analytics → evidence → audit → Identity Store (Database A, last).

**If Gate 3 is complete:**
Live data ingestion from real companies is unlocked. Development environment with synthetic data does not require Gate 3.

**If Gate 4 is complete:**
Phase 5 (Scoring Engine) may begin. Gate 4 must complete before the first scoring engine line of code is written.

**If Gate 5 is complete:**
Live fiscal classification outputs may be presented to real companies.

### 12.2 The next document after gates pass

`docs/21-foundation-light-sql-schema-generation.md` — SQL DDL definitions for all stores, generated against the approved logical schema in doc 12, incorporating all D-01 through D-21 decisions from doc 13. This document is the first code artifact in the KORA project.

**Blocked until:** Doc 20 reviewed by founder and CTO, Gates 1 and 2 passed, Gate 3 on track.

### 12.3 The no-code rule

No SQL, migrations, Prisma models, Supabase tables, React components, API endpoints, or application code may be generated until all applicable gate conditions from doc 13 Section 9 are met and this document (doc 20) has been reviewed and approved.

This rule is not a suggestion — it is the architectural discipline that protects KORA's privacy guarantees, methodological integrity, and auditability from the first line of code.

---

*Document authored: 2026-05-17*
*Version: v0.2*
*Status: Pending Founder and CTO Review*
*Canonical references: docs 12, 13, 18, 19, CLAUDE.md*
*Does not generate: SQL, migrations, Prisma models, Supabase tables, React components, API endpoints, or application code*
*Gate authority: doc 13 Section 9 (five gate conditions — all apply before implementation)*
*Next document: `docs/21-foundation-light-sql-schema-generation.md` — blocked until gates passed*
