# KORA Technical Data Model & Database Schema Definition

*Title: KORA Technical Data Model & Database Schema Definition*
*Status: Pending Founder and CTO Review — v0.1 (Gate 2 Schema Gap Patch + Final Consistency Patch Applied 2026-05-17)*
*Date: 2026-05-17 | Patch date: 2026-05-17*
*Aligned with: Methodological Constitution v0.1 (doc 06), Conceptual Data Model v0.1 (doc 07), Founder Technical Decisions v0.1 (doc 08), Source Materials Alignment Map (doc 09), Architecture v3 Layer Specification (doc 10), Economic & Fiscal Architecture Integration v0.1 (doc 11), Founder Gate Resolution Log v1.0 (doc 21), Methodology Risk Acceptance Policy v1.2 (doc 21b), Foundation Light Product Functional Spec v1.0 (doc 24), Gate 2 CTO Architecture Review Pack v1.0 (doc 27), Appendix A (StressTest Summary), Appendix B (WhitePaper v3 Extracts)*

---

## Table of Contents

1. Status and Scope
2. Technical Schema Principles
3. Logical Store Architecture
4. Schema / Namespace Proposal
5. Entity-to-Table Mapping Overview
6. Table Definition Format
7. Identity Store Tables
8. Core Company and Program Tables
9. User, Role, and Permission Tables
10. Data Source and Ingestion Tables
11. UEF and Event Processing Tables
12. BCM and Methodology Parameter Tables
13. Impact Engine Tables
13A. Scoring Run Tables [Gate 2 addition]
14. Activation Safeguard Tables
15. KORA Index and Component Tables
15A. KORA Index Explainability Tables [Gate 2 addition]
16. Confidence Score Tables
17. Complementary Indicator Tables
18. Financial and Economic Tables
19. Fiscal, Eligibility, and Guardrails Tables
20. Partner and Service Tables
20A. Collective Initiative Tables [Gate 2 addition]
21. Evidence Store Metadata Tables
22. Advisor Review Tables
22A. Founder Validation Tables [Gate 2 addition]
23. Report Tables
24. Methodology Version Tables
25. Audit Store Tables
25A. Worker Personal Data Store [Gate 2 addition]
26. Privacy and Access Control Rules
27. Data Lifecycle
28. Foundation Light Schema Scope
29. Implementation Warnings
30. Open Questions Before SQL and Migrations
31. Document Status and Next Action
32. Gate 2 Schema Gap Resolution Notes [Gate 2 addition]

---

## 1. Status and Scope

### 1.1 Purpose

This document translates the approved KORA methodology, Architecture v3, conceptual data model, founder technical decisions, and economic/fiscal architecture into a complete technical database schema definition for Foundation Light v0.1.

This is a **design document only**. It defines tables, fields, relationships, access rules, and implementation constraints in human-readable form. It does not contain:

- SQL statements or DDL
- Database migration files
- Prisma models or schema files
- Supabase configuration
- Application code of any kind
- Frontend component definitions

No implementation artifact may be generated from this document until it has been reviewed and approved by the founder and CTO, and the required professional reviews specified in doc 08 and doc 11 have been obtained.

### 1.2 Source Authority Hierarchy

This document must reflect all approved decisions from the following documents. Where any conflict appears, the hierarchy below governs:

| Priority | Document | Authority |
|---|---|---|
| 1 | doc 10 — Architecture v3 Layer Specification | Algorithm flow, IU formula, KORA Index structure, Activation Safeguard |
| 2 | doc 09 — Source Materials Alignment Map (Section 12) | Approved founder decisions resolving conflicts |
| 3 | doc 06 — Methodological Constitution v0.1 | Methodology definitions and scoring logic |
| 4 | doc 08 — Founder Technical Decisions v0.1 | 10 infrastructure decisions for Foundation Light |
| 5 | doc 07 — Conceptual Data Model v0.1 | Entity definitions and relationships |
| 6 | doc 11 — Economic & Fiscal Architecture Integration v0.1 | Economic/fiscal architecture and constraints |
| 7 | docs 04, 05 | Fiscal/eligibility layer and eligibility confidence |

### 1.3 Constraints Carried Forward

The following constraints are non-negotiable and must be reflected in every table, relationship, and access rule defined in this document:

- The Worker Identity Layer is in a **separate physical database** from all other stores (doc 08 Decision 1)
- Per-company pseudonymization keys are held by KORA's internal privacy service, **not in the application database** (doc 08 Decision 2)
- No employer-facing role may access individual PIB records, individual UEF records, or individual Impact Unit records
- Every scoring output carries a `methodology_version_id` — this field is NOT NULL on all scoring tables
- The KORA Index requires a valid Activation Safeguard result — these are inseparable (doc 10 Section 16)
- FUO must never transit KORA's operational account — no table in this schema may represent FUO balances in KORA's own bank accounts (doc 11 absolute constraint)
- Financial data is INPUT/GOVERNANCE layer only — no financial field enters the KORA Index formula
- Fiscal eligibility is independent of impact measurement — these are parallel dimensions on every event record
- The Activation Safeguard (Stage 13 of 14) is mandatory and cannot be bypassed or made optional

### 1.3a Appendix B Implementation Boundary

Appendix B (`docs/appendices/B-whitepaper-v3-conceptual-extracts.md`) is approved as a historical conceptual reference only. It does not override Architecture v3, docs 06, 09, or 10 on any formula, component name, architectural decision, or privacy rule.

The following Appendix B concepts are **future references only** and must not be implemented in Foundation Light v0.1 unless explicitly included in doc 18 or doc 20:

- CEF (Contribution Event Format) — future collective/territorial contribution format
- KIP (KORA Impact Pledge) — future territorial pledge mechanism; not active in Foundation Light
- Sector Reference Tables and Sector Friction Index
- Territorial Access Index
- `kora_value_chain` in active use (table may be created with all records at `status = 'not_calculated'`)
- Advanced KORA Contribution mechanics beyond basic IMPACT pillar aggregation
- KORA Link real-time verification events
- Worker top-up flows

Any developer who encounters these concepts in Appendix B must treat them as deferred scope markers — not current implementation targets.

### 1.4 What This Document Does Not Cover

- Application business logic
- API endpoint design
- Authentication and session management (beyond role definitions)
- UI component specifications
- Payment execution or financial intermediation implementation

---

## 2. Technical Schema Principles

The following principles derive directly from approved KORA methodology and founder decisions. Every table design decision in this document must be consistent with all of them.

**P-01 — Structural Privacy Separation**
The Worker Identity Layer (identifiable data) is housed in a separate physical database from all analytical, governance, evidence, and audit layers. This separation is enforced by architecture, not by access control policy alone. A misconfigured query or permission must not be able to join identifiable and analytical data.

**P-02 — Pseudonymized Analytics**
Every record in the analytics store references workers only by their KORA pseudonymized ID. There is no path from the analytics store to a named employee without accessing the identity store, which no employer role can do.

**P-03 — Methodology Version on Every Output**
Every scoring output — Impact Unit, PIB record, Company Impact Aggregate, KORA Index, KORA Contribution, KORA Ecosystem Reach, Confidence Score, and Report — carries a NOT NULL reference to the methodology version under which it was calculated. A score without a version reference is an invalid record.

**P-04 — Mandatory Sequential Processing**
The 14-stage algorithm flow (doc 10 Section 3) must be respected in the schema design. Tables that represent intermediate stages (UEF Records, Impact Units, PIB Records, Activation Safeguard Results) cannot be bypassed. A KORA Index record without a linked Activation Safeguard result is invalid.

**P-05 — Formula Integrity Constraints**
Correction factor values have defined ranges (doc 10 Section 11). These ranges must be enforced as database-level CHECK constraints, not application-level validation: CQ [0.50–1.20], EV [0.50–1.00], CF [1.00–1.20], AGF [0.00–1.00], DF [1.00–1.30], EXF [1.00–1.20], SF [0.80–1.10].

**P-06 — Impact and Eligibility Are Parallel**
Every UEF record carries both a pillar classification (impact dimension) and a fiscal eligibility reference (eligibility dimension). These are separate fields. No foreign key path connects fiscal eligibility tables to the KORA Index calculation. They are parallel attributes of the same event, never nested or merged.

**P-07 — Financial Data Never Enters the KORA Index**
Financial budgets, spend records, and financial movements are INPUT/GOVERNANCE layer entities. There must be no computational path from any financial table to the KORA Index calculation. Financial governance snapshots are displayed alongside the KORA Index as a separate analytical dimension, not as an input to it.

**P-08 — Append-Only Audit Trail**
The audit trail table is insert-only at the database level. The application database role for the audit store has INSERT permission only — not UPDATE, not DELETE. This must be verified at infrastructure provisioning time.

**P-09 — Employer Visibility Boundary**
The schema must make it structurally impossible for employer-facing queries to return individual worker PIB values, individual UEF records, individual Impact Unit records, or workforce segment data below the safe aggregation threshold (default: 10 individuals). This is enforced through pre-defined views and database roles, not through application-layer filtering alone.

**P-10 — Pre-Calibration Labels**
All KORA Index component weights and BCM entries are pre-empirical-calibration values. The schema must carry a calibration_status field on all weight and BCM tables, defaulting to 'pre_empirical_calibration'. This value must not be changed until the Delphi Study validation is complete (doc 10 MV-01, MV-02).

**P-11 — Multi-Geography Configurable**
The Fiscal/Budget Perimeter entity and all related taxonomy tables carry a country_code field. The Italian fiscal taxonomy is seeded at deployment; other countries can be added by populating the taxonomy without schema changes (doc 08 Decision 3).

**P-12 — Ingestion Batch Lifecycle**
Every event record in the analytics store must be traceable to an approved Ingestion Batch. The ingestion batch lifecycle is: Submitted → Under Review → Approved → Processing → Complete / Error. No UEF records may be created from a batch that has not reached 'approved' status (doc 08 Decision 4).

**P-13 — Evidence Documents in External Blob Storage**
Evidence document content is stored in KORA-controlled external blob storage, not in the operational database. The evidence store table holds metadata and document pointers only. No binary content is stored inline (doc 08 Decision 6).

---

## 3. Logical Store Architecture

KORA's data is organized into six logically and physically distinct stores. The separation between Identity and all other stores is the most critical architectural boundary in the entire system. The `personal` schema (Gate 2 addition) is a distinct logical store within Database B for worker-owned personal layer data — separate from both `analytics` (scoring outputs) and `gov` (company configuration). This separation is required because My KORA personal layer data is worker-controlled, not employer-configurable, and must never flow into company-visible queries.

### 3.1 Identity Store

**Purpose:** Holds the minimal set of identifiable worker data that KORA may receive during ingestion, before pseudonymization. This is a controlled boundary zone, not an analytics store.

**Physical deployment:** Separate database from all other stores. The application process that handles analytics, governance, evidence, and audit must not have a connection string to this database. Only the KORA pseudonymization service and privacy administrators can connect.

**Content:** Worker identity records (company-assigned employee IDs, received during file upload) and references to the per-company pseudonymization keys held by the KORA privacy service.

**Access policy:** No employer role. No partner role. No advisor role. Only KORA system processes (pseudonymization, deduplication, data subject rights processing) and KORA privacy administrators.

**Retention:** Records are deleted or anonymized upon fulfillment of GDPR deletion requests or at end of data retention period per applicable law.

### 3.2 Analytics Store

**Purpose:** Holds all processed, pseudonymized event data and all scoring outputs — from UEF records through Impact Units, PIB records, Company Impact Aggregates, KORA Index records, and complementary indicators.

**Physical deployment:** Separate database from the Identity Store. Shares infrastructure with Governance, Evidence, and Audit stores (same cluster) but is logically separated by schema.

**Content:** Anonymized Worker Profiles, Workforce Segments, UEF Records, Pillar Mappings, Impact Units, PIB Records, Company Impact Aggregates, Activation Safeguard Results, KORA Index records, Confidence Scores, and complementary indicators (KORA Contribution, Ecosystem Reach, Evolution Snapshots).

**Access policy:** Role-based. The analytics engine writes. KORA Analysts can read for review. Employer-facing roles access only pre-built aggregated views — never raw event records or individual PIB rows.

### 3.3 Governance Store

**Purpose:** Holds all company configuration, program management, financial data, fiscal eligibility data, policy rules, partner data, advisor reviews, reports, and methodology versions.

**Physical deployment:** Same infrastructure cluster as Analytics, Evidence, and Audit stores. Separate schema.

**Content:** Companies, Company Programs, Users, Roles, Data Sources, Ingestion Batches, Financial Budgets, Financial Movements, Fiscal Perimeters, Eligibility Profiles, Policy Rules, Partners, Partner Services, Advisor Reviews, Reports, Methodology Versions, SVAM Configurations, FUO Account references, Welfare Statements.

**Access policy:** Role-based by function. Company Admin can configure programs and fiscal perimeters. Company HR can read aggregate intelligence outputs and reports. Company Finance can read financial governance layer. No employer role can access the identity store or individual analytics records.

### 3.4 Evidence Store

**Purpose:** Holds metadata records for all evidence documents — certificates, invoices, advisor validation notes, provider confirmations — with pointers to the actual files in KORA-controlled external blob storage.

**Physical deployment:** Same infrastructure cluster as Governance, Analytics, and Audit. Separate schema.

**Content:** Evidence record metadata, document identifiers, storage pointers, document hashes (for integrity verification), issuer information, validity periods, privacy sensitivity flags.

**Access policy:** Controlled by the type of entity the evidence record supports. Evidence records linked to health or psychological content carry elevated access restrictions. No employer role can access health evidence at the individual level.

### 3.5 Audit Store

**Purpose:** Holds the append-only audit trail — an immutable log of every significant event, change, and access across the KORA system.

**Physical deployment:** Same infrastructure cluster. Separate schema. The database application role for this schema has INSERT permission only — no UPDATE, no DELETE, not even for KORA Admins via the application.

**Content:** Audit trail records — event type, affected entity, previous and new values, actor, timestamp, reason codes.

**Access policy:** KORA Admin can read (not modify). Future Auditor role can read. No employer role can modify. The application process can only INSERT, never UPDATE or DELETE.

### 3.6 Worker Personal Data Store [Gate 2 addition]

**Purpose:** Holds worker-owned and worker-controlled My KORA personal layer data. This data is not used directly to calculate the KORA Index and is never employer-visible at the individual level.

**Physical deployment:** Database B. Separate schema: `personal`. Logically isolated from `analytics` (scoring outputs) and `gov` (company configuration). This is not a new product module — it is a schema boundary clarification required because My KORA became a Foundation Light core adoption layer. Worker personal data does not belong in `analytics` (which is for scoring pipeline outputs) or `gov` (which is for company and program configuration).

**Content:** Dynamic Impact CV items, personal milestones, personal plan items, participation/booking requests, partner contact consent records, worker data control preferences, and worker export records.

**Access policy:** Worker self-service access to own records only. Employer roles have zero GRANT on all `personal` schema tables — this is enforced at the database level, not by RLS alone. Standard KORA Admin does not receive default `personal` schema access. KORA Privacy Officer exceptional access is permitted only when legally justified, purpose-limited, logged to `audit.audit_trail_records`, and revocable. No partner or advisor role may access `personal` schema tables except through the specific, consent-gated paths defined per table.

**Retention:** Worker data deletion and right-of-erasure requests must cascade to all `personal` schema records for the affected `worker_pseudonym_id`, coordinated with the Identity Store deletion workflow.

---

## 4. Schema / Namespace Proposal

### 4.1 Database Topology

```
[Database A — Identity]
  └── schema: identity
        ├── worker_identity_records
        └── pseudonymization_key_references

[Database B — Platform]
  ├── schema: analytics
  │     ├── worker_profiles
  │     ├── workforce_segments
  │     ├── uef_records
  │     ├── pillar_mappings
  │     ├── impact_units
  │     ├── pib_records
  │     ├── company_impact_aggregates
  │     ├── activation_safeguard_results
  │     ├── kora_indices
  │     ├── kora_index_components
  │     ├── kora_index_explanations          ← Gate 2 addition
  │     ├── confidence_scores
  │     ├── kora_contributions
  │     ├── kora_ecosystem_reach
  │     └── kora_evolution_snapshots
  │
  ├── schema: gov
  │     ├── companies
  │     ├── company_programs
  │     ├── pillars
  │     ├── users
  │     ├── roles
  │     ├── user_roles
  │     ├── data_sources
  │     ├── raw_datasets
  │     ├── ingestion_batches
  │     ├── ingestion_batch_datasets
  │     ├── ingestion_rejection_records
  │     ├── scoring_runs                     ← Gate 2 addition
  │     ├── methodology_versions
  │     ├── methodology_version_components
  │     ├── bcm_versions
  │     ├── bcm_entries
  │     ├── nm_rules_versions
  │     ├── nm_rules
  │     ├── correction_factor_rule_versions
  │     ├── kora_index_weight_versions
  │     ├── anti_gaming_rules_versions
  │     ├── financial_budgets
  │     ├── financial_movements
  │     ├── financial_governance_snapshots
  │     ├── fiscal_perimeters
  │     ├── fiscal_category_thresholds
  │     ├── company_program_perimeters
  │     ├── eligibility_profiles
  │     ├── eligibility_profile_versions
  │     ├── policy_rules
  │     ├── fiscal_guardrails_rules
  │     ├── fiscal_guardrails_results
  │     ├── partners
  │     ├── partner_services
  │     ├── collective_initiatives            ← Gate 2 addition
  │     ├── collective_initiative_companies  ← Gate 2 addition
  │     ├── advisor_reviews
  │     ├── advisor_review_evidence
  │     ├── reports
  │     ├── report_exports
  │     ├── svam_configurations
  │     ├── fuo_accounts
  │     ├── welfare_statements
  │     └── validation_contacts              ← Gate 2 addition
  │
  ├── schema: evidence
  │     └── evidence_records
  │
  ├── schema: audit
  │     └── audit_trail_records
  │
  └── schema: personal                       ← Gate 2 addition
        ├── worker_cv_items
        ├── worker_milestones
        ├── worker_personal_plan_items
        ├── worker_participation_requests
        ├── worker_consent_records
        ├── worker_data_control_preferences
        └── worker_export_records
```

### 4.2 Notes on Topology

- Database A (Identity) and Database B (Platform) are **separate physical databases**. They do not share a connection pool in the application.
- Within Database B, schemas (analytics, gov, evidence, audit) provide logical separation enforced by schema-level permissions, not physical separation. Joins between schemas within Database B are technically possible at the PostgreSQL level but are restricted by application database roles.
- The only cross-schema joins permitted in application queries are between `gov.*` and `analytics.*` (for company reporting) and between `personal.*` and `gov.*` where consent_record_id permits a specific partner or advisor context. Joins from `personal.*` to `analytics.*` are not permitted in employer-facing queries. Joins to `identity.*` from any schema in Database B are structurally prevented by the separate database boundary.
- The pseudonymization service is a separate application component. It connects to both Database A (to write/read identity mappings) and Database B (to write pseudonymized worker_id values into analytics tables). It does not expose this dual-access to any other application process.
- The `personal` schema is not accessible to any application role that serves employer-facing queries. The worker-facing application role may read `personal.*` for the authenticated worker's own `worker_pseudonym_id` only. No cross-worker reads are permitted.

---

## 5. Entity-to-Table Mapping Overview

This section maps every conceptual entity from doc 07 (Conceptual Data Model) to its concrete table in the technical schema. Entities are organized by the KORA layer they belong to.

### 5.1 Identity Layer Entities

| Conceptual Entity (doc 07) | Technical Table | Store | Foundation Light Status |
|---|---|---|---|
| Worker Identity Layer | `identity.worker_identity_records` | Identity | Core |
| Pseudonymization Key (reference only) | `identity.pseudonymization_key_references` | Identity | Core |

### 5.2 INPUT Layer Entities

| Conceptual Entity (doc 07) | Technical Table | Store | Foundation Light Status |
|---|---|---|---|
| Organization / Company | `gov.companies` | Governance | Core |
| Company Program | `gov.company_programs` | Governance | Core |
| Financial Budget / Fund | `gov.financial_budgets` | Governance | Basic |
| Fiscal / Budget Perimeter | `gov.fiscal_perimeters` | Governance | Basic (tagging) |
| Partner | `gov.partners` | Governance | Basic |
| Partner Service | `gov.partner_services` | Governance | Basic |
| Data Source | `gov.data_sources` | Governance | Core |

### 5.3 ACTIVITY Layer Entities

| Conceptual Entity (doc 07) | Technical Table | Store | Foundation Light Status |
|---|---|---|---|
| Raw Dataset | `gov.raw_datasets` | Governance | Core |
| Ingestion Batch | `gov.ingestion_batches` | Governance | Core |
| Ingestion Batch ↔ Dataset link | `gov.ingestion_batch_datasets` | Governance | Core |
| Rejection Records | `gov.ingestion_rejection_records` | Governance | Core |
| KORA Action / Event (pre-UEF concept) | Implicit in `analytics.uef_records` | Analytics | Core |
| Universal Event Format Record | `analytics.uef_records` | Analytics | Core |

### 5.4 IMPACT Layer Entities

| Conceptual Entity (doc 07) | Technical Table | Store | Foundation Light Status |
|---|---|---|---|
| Anonymized Worker Profile | `analytics.worker_profiles` | Analytics | Core |
| Workforce Segment | `analytics.workforce_segments` | Analytics | Basic |
| Pillar (reference) | `gov.pillars` | Governance | Core (seeded) |
| Pillar Mapping | `analytics.pillar_mappings` | Analytics | Core |
| Impact Unit | `analytics.impact_units` | Analytics | Core |
| PIB — Personal Impact Balance | `analytics.pib_records` | Analytics | Core (internal) |
| Company Impact Aggregate | `analytics.company_impact_aggregates` | Analytics | Core |
| Activation Safeguard | `analytics.activation_safeguard_results` | Analytics | Core (mandatory) |
| KORA Index | `analytics.kora_indices` | Analytics | Core |
| KORA Index Component Weights | `gov.kora_index_weight_versions` | Governance | Core |
| KORA Contribution | `analytics.kora_contributions` | Analytics | Basic |
| KORA Ecosystem Reach | `analytics.kora_ecosystem_reach` | Analytics | Basic |
| KORA Evolution | `analytics.kora_evolution_snapshots` | Analytics | Basic |

### 5.5 GOVERNANCE Layer Entities

| Conceptual Entity (doc 07) | Technical Table | Store | Foundation Light Status |
|---|---|---|---|
| Financial Movement / Spend Record | `gov.financial_movements` | Governance | Basic |
| Financial Governance Snapshot | `gov.financial_governance_snapshots` | Governance | Basic |
| Policy Rule | `gov.policy_rules` | Governance | Not Applicable |
| Advisor Review | `gov.advisor_reviews` | Governance | Basic |
| Advisor Review ↔ Evidence link | `gov.advisor_review_evidence` | Governance | Basic |
| Report / Export | `gov.reports` | Governance | Core |
| Report Export Log | `gov.report_exports` | Governance | Core |
| User / Role / Permission | `gov.users`, `gov.roles`, `gov.user_roles` | Governance | Core |
| SVAM Configuration | `gov.svam_configurations` | Governance | Core (variant A only) |
| FUO Account Reference | `gov.fuo_accounts` | Governance | Basic (reference only) |
| Welfare Statement | `gov.welfare_statements` | Governance | Basic (structural) |

### 5.6 ELIGIBILITY Layer Entities

| Conceptual Entity (doc 07) | Technical Table | Store | Foundation Light Status |
|---|---|---|---|
| Eligibility Profile | `gov.eligibility_profiles` | Governance | Basic (display) |
| Eligibility Profile Version History | `gov.eligibility_profile_versions` | Governance | Basic |
| Company ↔ Perimeter activation | `gov.company_program_perimeters` | Governance | Basic |
| Fiscal Category Thresholds | `gov.fiscal_category_thresholds` | Governance | Core (Italian taxonomy seeded) |
| Fiscal Guardrails Rules | `gov.fiscal_guardrails_rules` | Governance | Future (Governance tier) |
| Fiscal Guardrails Results | `gov.fiscal_guardrails_results` | Governance | Future (Governance tier) |

### 5.7 EVIDENCE Layer Entities

| Conceptual Entity (doc 07) | Technical Table | Store | Foundation Light Status |
|---|---|---|---|
| Evidence Record | `evidence.evidence_records` | Evidence | Basic |
| Methodology Version | `gov.methodology_versions` | Governance | Core |
| Methodology Version Components | `gov.methodology_version_components` | Governance | Core |
| BCM Version | `gov.bcm_versions` | Governance | Core |
| BCM Entries (matrix) | `gov.bcm_entries` | Governance | Core |
| NM Rules Version | `gov.nm_rules_versions` | Governance | Core |
| NM Rules | `gov.nm_rules` | Governance | Core |
| Anti-Gaming Rules Version | `gov.anti_gaming_rules_versions` | Governance | Core |
| Confidence Score | `analytics.confidence_scores` | Analytics | Core |
| Audit Trail Record | `audit.audit_trail_records` | Audit | Core |

### 5.8 Privacy Bridge Entities

The privacy bridge entities in doc 07 are implemented through the structural separation between Database A (Identity) and Database B (Platform), the `identity.worker_identity_records` table, and the `analytics.worker_profiles` table — which holds only pseudonymized IDs and never a real name or employee number. The bridge itself — the mapping between real IDs and pseudonyms — exists only in the KORA privacy service, not in any queryable table accessible to application roles.

### 5.9 Worker Personal Layer Entities [Gate 2 addition]

| Conceptual Entity | Technical Table | Store / Schema | Foundation Light Status | Privacy Sensitivity | Employer Visibility | Gate Dependency |
|---|---|---|---|---|---|---|
| Worker Dynamic Impact CV Item | `personal.worker_cv_items` | Personal | Core (My KORA) | High | NEVER | Gate 3 (live worker accounts) |
| Worker Milestone / Credential | `personal.worker_milestones` | Personal | Core (My KORA) | Standard–High | NEVER | Gate 3 |
| Worker Personal Plan Item | `personal.worker_personal_plan_items` | Personal | Core (My KORA) | Standard | NEVER | Gate 3 |
| Worker Participation Request | `personal.worker_participation_requests` | Personal | Core (My KORA) | Standard–High | NEVER (aggregate view only via threshold) | Gate 3 |
| Worker Consent Record | `personal.worker_consent_records` | Personal | High | NEVER | Gate 3 |
| Worker Data Control Preference | `personal.worker_data_control_preferences` | Personal | Standard | NEVER | Gate 3 |
| Worker Export Record | `personal.worker_export_records` | Personal | Standard | NEVER | Gate 3 |

### 5.10 Scoring Pipeline, Collective Initiative, Explainability, and Validation Entities [Gate 2 addition]

| Conceptual Entity | Technical Table | Store / Schema | Foundation Light Status | Privacy Sensitivity | Employer Visibility | Gate Dependency |
|---|---|---|---|---|---|---|
| Scoring Run | `gov.scoring_runs` | Governance | Core | Standard | Read (own company) via aggregate | Gate 2 → SQL |
| Collective Initiative | `gov.collective_initiatives` | Governance | Basic | Standard | Aggregate counts only | None |
| Collective Initiative ↔ Company Link | `gov.collective_initiative_companies` | Governance | Basic | Standard | Own company only | None |
| KORA Index Explanation | `analytics.kora_index_explanations` | Analytics | Core | Standard (no individual data) | Read (own company) | Gate 2 → SQL |
| Founder Validation Contact | `gov.validation_contacts` | Governance | Basic (demo support) | Standard (internal) | Admin/internal only | None |

---

## 6. Table Definition Format

All tables in sections 7–25 are defined using the following standardized format. This format is designed for human review and founder/CTO approval — it is not executable SQL.

### 6.1 Format Structure

Each table definition block contains:

**Table:** `schema.table_name`
**Store:** Identity / Analytics / Governance / Evidence / Audit
**KORA Layer:** INPUT / ACTIVITY / IMPACT / GOVERNANCE / ELIGIBILITY / EVIDENCE / Privacy Bridge
**Foundation Light Status:** Core / Basic / Future / Not Applicable
**Purpose:** One paragraph describing what this table represents and why it exists.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| field_name | TYPE | NOT NULL / nullable | Description of the field and its constraints |

**Access Rules:**
Which roles may read this table, which may write, and which are explicitly prohibited.

**Key Constraints:**
Any important uniqueness rules, NOT NULL requirements beyond the fields table, foreign key rules, or validation constraints that must be enforced.

**Notes:**
Any additional context — methodology alignment, privacy rules, warnings, or deferred features.

### 6.2 Type Conventions

Types used in field definitions:

| Convention | Meaning |
|---|---|
| `UUID` | Universally unique identifier, server-generated |
| `TEXT` | Variable-length string |
| `BOOLEAN` | True / false |
| `INTEGER` | Whole number |
| `BIGINT` | Large whole number (file sizes, row counts) |
| `DECIMAL(p,s)` | Decimal number with p total digits and s decimal places |
| `DATE` | Calendar date (no time) |
| `TIMESTAMPTZ` | Timestamp with timezone (UTC stored) |
| `TEXT[]` | Array of text values |
| `UUID[]` | Array of UUIDs |
| `JSONB` | Structured JSON object, queryable |
| `ENUM(...)` | Enumerated value from a defined list |

### 6.3 ENUM Notation

ENUM values are listed inline for brevity. In the actual implementation, enums may be implemented as PostgreSQL ENUM types, CHECK constraints, or application-level validated strings — the CTO will determine the implementation approach.

### 6.4 Foreign Key Notation

Foreign keys are written as: `FK → schema.table_name` in the field description. They indicate a reference relationship. The implementation (ON DELETE behavior, indexing strategy) is a CTO decision.

### 6.5 Foundation Light Status Definitions

| Status | Meaning |
|---|---|
| **Core** | This table must be created and populated for Foundation Light to function. It is on the critical path. |
| **Basic** | The table structure must be created at Foundation Light but may be partially populated or have limited use. Features that require it are available but not fully activated. |
| **Future** | The table is defined here for architectural completeness but is not used in Foundation Light. Structure should be created to avoid later migrations. |
| **Not Applicable** | The table is not needed at Foundation Light. It will be added in a later tier. |

---

*Sections 7–31 follow. This file is being written in sequential chunks. The following sections are not yet present and will be appended in subsequent writes.*

---

## 7. Identity Store Tables

These tables live in **Database A (Identity)** — a physically separate database from all other stores. No application process that handles analytics, governance, evidence, or audit queries may hold a connection string to this database. Only the KORA pseudonymization service and KORA privacy administrators may connect.

---

**Table:** `identity.worker_identity_records`
**Store:** Identity
**KORA Layer:** Privacy compliance layer (not an analytics or scoring layer)
**Foundation Light Status:** Core
**Purpose:** Holds the minimal set of identifiable worker data that KORA receives during ingestion, before pseudonymization occurs. This table is a controlled intake zone — data enters here, is pseudonymized, and the pseudonymized ID is passed to the analytics store. The original identifiable data is retained only as long as required by GDPR obligations (data subject rights, deletion, export) and the data retention policy.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `internal_id` | UUID | NOT NULL | Primary key, server-generated |
| `company_id` | UUID | NOT NULL | FK → gov.companies. Which company's workforce this record belongs to. |
| `ingestion_batch_id` | UUID | NOT NULL | FK → gov.ingestion_batches. Which ingestion batch introduced this record. |
| `company_assigned_identifier` | TEXT | NOT NULL | The employee number or equivalent identifier as received from the company's data file. Not the same as `kora_pseudonym_id`. |
| `kora_pseudonym_id` | UUID | NOT NULL | The KORA-generated pseudonymized ID assigned to this worker. This ID is used in all analytics and personal store records. There is no reverse-lookup available to any employer role. |
| `identity_source` | ENUM | NOT NULL | `hr_file_import` / `manual_entry` / `api_integration`. Source of this identity record. |
| `pseudonymization_key_reference_id` | UUID | NOT NULL | FK → identity.pseudonymization_key_references (company_id). The per-company key reference used to derive this worker's pseudonym. |
| `status` | ENUM | NOT NULL | `active` / `deletion_requested` / `deletion_completed` / `key_destroyed` / `superseded`. Tracks data subject rights lifecycle. `key_destroyed` indicates the pseudonymization key has been destroyed and re-identification is no longer possible. |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created. |
| `updated_at` | TIMESTAMPTZ | NOT NULL | When this record was last modified. |
| `deletion_requested_at` | TIMESTAMPTZ | nullable | Timestamp of GDPR Article 17 deletion request. |
| `deletion_completed_at` | TIMESTAMPTZ | nullable | Timestamp when deletion was completed across all stores including personal schema. |
| `deletion_reason` | TEXT | nullable | Reason for deletion (e.g., `gdpr_erasure_request`, `contract_termination`, `data_retention_expired`). |

**Access Rules:**
- Write: KORA pseudonymization service only (automated, during ingestion)
- Read: KORA privacy administrators and pseudonymization service only
- Prohibited: All employer roles, all company roles, all partner roles, all advisor roles, all application API routes
- Access events must be logged to `audit.audit_trail_records`

**Key Constraints:**
- `company_id` + `company_assigned_identifier` must be unique per ingestion context (deduplication prevents duplicate identity records for the same worker at the same company)
- `kora_pseudonym_id` must be unique across the entire identity store
- `status` transitions are one-directional: `active` → `deletion_requested` → `deletion_completed` (no reverse)

**Notes:**
- This table must never be joined, even internally, to any analytics store table via application queries. The pseudonymization service is the only component permitted to perform this mapping, and only for the purpose of rights fulfillment.
- Individual records must be deleted or anonymized within 30 days of a verified GDPR Article 17 request (clock begins at `deletion_requested_at`).

---

**Table:** `identity.pseudonymization_key_references`
**Store:** Identity
**KORA Layer:** Privacy compliance layer
**Foundation Light Status:** Core
**Purpose:** Holds one reference record per company, pointing to that company's pseudonymization key in the KORA internal privacy service. The actual cryptographic key is NOT stored in this table — only an opaque reference identifier that the privacy service can resolve. This table enables per-company key isolation: a compromise of one company's key reference does not expose other companies' workers.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `key_reference_id` | UUID | NOT NULL | Primary key, server-generated. Enables multiple key references per company (for rotation history). |
| `company_id` | UUID | NOT NULL | FK → gov.companies. |
| `vault_key_reference` | TEXT | NOT NULL | Opaque identifier pointing to the key in the KORA privacy service Vault. Not the key itself. Not decodable outside the privacy service. Never store the raw cryptographic key in this field. |
| `key_version` | INTEGER | NOT NULL | Incremented on key rotation. Starting value: 1. |
| `key_status` | ENUM | NOT NULL | `active` / `rotated` / `destroyed`. One record per company per version. |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this key reference was created. |
| `rotated_at` | TIMESTAMPTZ | nullable | When the key was rotated. Key rotation is a Foundation/Governance tier feature. |
| `destroyed_at` | TIMESTAMPTZ | nullable | When the key was destroyed (if GDPR key destruction was triggered). After destruction, re-identification is permanently impossible for all workers keyed under this reference. |

**Access Rules:**
- Write: KORA pseudonymization service only
- Read: KORA pseudonymization service only
- Prohibited: All other roles and processes

**Key Constraints:**
- One record per `company_id` with `status = 'active'` at any time
- Prior records (rotated) are retained for audit trail integrity

**Notes:**
- Key rotation (incrementing `key_version`) is a Foundation or Governance tier feature. Foundation Light uses a single static key per company.
- If the privacy service reference is lost or corrupted, KORA cannot fulfill data subject rights for that company's workers. This is a critical operational dependency that must have documented recovery procedures before any personal data is ingested.

---

## 8. Core Company and Program Tables

These tables are the root configuration entities in the governance store. Every other entity in the system is scoped to a company or a company program.

---

**Table:** `gov.companies`
**Store:** Governance
**KORA Layer:** INPUT
**Foundation Light Status:** Core
**Purpose:** The primary customer account. Every dataset, program, score, report, and configuration in KORA belongs to a specific company. This is the root anchor of all company-side data.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `company_id` | UUID | NOT NULL | Primary key, server-generated |
| `legal_name` | TEXT | NOT NULL | The company's legal entity name |
| `display_name` | TEXT | nullable | Short display name used in the interface |
| `sector_code` | TEXT | nullable | Industry classification (e.g., ATECO, NACE) |
| `primary_country` | TEXT | NOT NULL | ISO country code. Determines default fiscal perimeter taxonomy. Default: `IT` |
| `operating_countries` | TEXT[] | nullable | Array of ISO country codes where the company operates |
| `headcount_band` | ENUM | NOT NULL | `micro` / `small` / `medium` / `large` / `enterprise`. Used for normalization and reporting bands. Not the same as the exact worker count used for activation calculation. |
| `company_size_category` | ENUM | NOT NULL | `sme` / `mid_market` / `large` / `enterprise` |
| `active_tier` | ENUM | NOT NULL | `foundation_light` / `foundation` / `governance` / `certified`. Current commercial tier. |
| `primary_reporting_period` | ENUM | NOT NULL | `calendar_year` / `fiscal_year` / `custom` |
| `safe_aggregation_threshold` | INTEGER | NOT NULL | Minimum group size for employer-visible segment analytics. Default: 10. Configurable by legal counsel. |
| `preferred_language` | TEXT | NOT NULL | Default: `it`. Used for report generation and UI display. |
| `dpa_status` | ENUM | NOT NULL | `pending` / `signed` / `expired`. Data Processing Agreement status. No personal data may be processed before `signed`. |
| `dpa_signed_at` | TIMESTAMPTZ | nullable | Timestamp of DPA execution |
| `legal_agreement_status` | ENUM | NOT NULL | `pending` / `active` / `terminated` |
| `program_maturity_level` | ENUM | nullable | `first_year` / `established` / `multi_year`. Self-reported or KORA-assessed. |
| `data_maturity_level` | ENUM | nullable | `low` / `medium` / `high`. Assessed at ingestion by KORA analyst. |
| `is_active` | BOOLEAN | NOT NULL | Default: TRUE. FALSE when subscription is terminated. |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification timestamp |

**Access Rules:**
- Write: KORA Admin, KORA Analyst (limited fields)
- Read: Company Admin (own company only), KORA Admin, KORA Analyst
- Prohibited: No employer role may read other companies' records. No partner or advisor role may access this table directly.

**Key Constraints:**
- `legal_name` should be unique per deployment context (no two companies with identical legal names)
- `dpa_status` must be `signed` before any ingestion batch can be created for this company
- `safe_aggregation_threshold` minimum enforced value: 5. Default: 10. Legal counsel may raise this but not lower below 5.

---

**Table:** `gov.company_programs`
**Store:** Governance
**KORA Layer:** INPUT
**Foundation Light Status:** Core
**Purpose:** A defined analytical scope — a specific period, population, and set of budgets for which KORA is asked to produce intelligence. A single company may have multiple programs over time (annual cycles), across geographies, or for different workforce segments.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `program_id` | UUID | NOT NULL | Primary key, server-generated |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_name` | TEXT | NOT NULL | Human-readable program name (e.g., "Welfare Program 2025 — Italy HQ") |
| `description` | TEXT | nullable | Extended program description |
| `reporting_period_start` | DATE | NOT NULL | Start of the reporting period this program covers |
| `reporting_period_end` | DATE | NOT NULL | End of the reporting period |
| `primary_country` | TEXT | NOT NULL | ISO country code. Determines which fiscal perimeter taxonomy applies. |
| `scope_description` | TEXT | nullable | Description of the worker population and initiative scope |
| `target_worker_population` | TEXT | nullable | Description of which workers are included (e.g., "All permanent employees, Italy HQ") |
| `included_budget_categories` | TEXT[] | nullable | Array of active budget category codes for this program |
| `reporting_objectives` | TEXT[] | nullable | Array: `board_pack`, `esg_report`, `internal_hr`, `investor_comms` |
| `status` | ENUM | NOT NULL | `draft` / `active` / `completed` / `archived` |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. The version in effect when the program was created. Scoring outputs under this program will carry the version active at the time of each calculation. |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification timestamp |
| `created_by` | UUID | NOT NULL | FK → gov.users |

**Access Rules:**
- Write: Company Admin, KORA Admin, KORA Analyst
- Read: Company Admin, Company HR, Company Finance, Company ESG, KORA Admin, KORA Analyst
- Prohibited: Partner roles may not read company program configurations

**Key Constraints:**
- `reporting_period_end` must be after `reporting_period_start`
- One company may have multiple programs for overlapping periods only if they cover distinct worker populations (enforced by application logic, not schema)

---

**Table:** `gov.pillars`
**Store:** Governance
**KORA Layer:** IMPACT (reference)
**Foundation Light Status:** Core (seeded at deployment — not company-configurable)
**Purpose:** Reference table for the five fixed KORA pillars. Pillars are the grammar of KORA — they are not configurable by individual companies. This table is seeded once at deployment and is effectively read-only in production.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `pillar_id` | TEXT | NOT NULL | Primary key. Fixed values: `LIFE`, `GROWTH`, `CONNECTION`, `IMPACT`, `LEGACY` |
| `label` | TEXT | NOT NULL | Display label |
| `definition` | TEXT | NOT NULL | Full methodological definition as per Methodological Constitution v0.1 |
| `example_action_types` | TEXT[] | nullable | Illustrative list of actions classified to this pillar |
| `privacy_sensitivity_notes` | TEXT | nullable | Notes on privacy handling for events classified to this pillar (e.g., LIFE pillar may carry health-sensitive data) |
| `sort_order` | INTEGER | NOT NULL | Display ordering: LIFE=1, GROWTH=2, CONNECTION=3, IMPACT=4, LEGACY=5 |
| `is_active` | BOOLEAN | NOT NULL | Default: TRUE. All five pillars are active. This field exists for schema compatibility only. |

**Access Rules:**
- Write: KORA methodology team only, via migration (not application UI)
- Read: All authenticated roles

**Key Constraints:**
- Exactly five rows. No company may add, remove, or rename pillars.

---

## 9. User, Role, and Permission Tables

---

**Table:** `gov.users`
**Store:** Governance
**KORA Layer:** GOVERNANCE
**Foundation Light Status:** Core
**Purpose:** All authenticated users of the KORA platform — company users, KORA staff, advisors (external reference at Foundation Light), and future partner admins.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `user_id` | UUID | NOT NULL | Primary key |
| `email` | TEXT | NOT NULL | Unique email address. Used for authentication. |
| `display_name` | TEXT | NOT NULL | Name shown in the UI and audit trail |
| `company_id` | UUID | nullable | FK → gov.companies. Null for KORA staff. Null for advisors (who are external references at Foundation Light). |
| `partner_id` | UUID | nullable | FK → gov.partners. Populated only for partner admin users. |
| `user_type` | ENUM | NOT NULL | `kora_admin` / `kora_analyst` / `company_user` / `advisor_external` / `partner_admin` |
| `status` | ENUM | NOT NULL | `active` / `suspended` / `deactivated` |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification timestamp |
| `last_login_at` | TIMESTAMPTZ | nullable | For session management and inactive account detection |
| `created_by` | UUID | nullable | FK → gov.users. The KORA admin who created this account. |

**Access Rules:**
- Write: KORA Admin only
- Read: KORA Admin (all users), company users (own record only)
- Prohibited: No user may read other companies' user records

---

**Table:** `gov.roles`
**Store:** Governance
**KORA Layer:** GOVERNANCE
**Foundation Light Status:** Core (seeded at deployment)
**Purpose:** Defines the named roles in the KORA access control system. Each role carries a set of permission flags that determine what data the role can access and what actions it can perform.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `role_id` | UUID | NOT NULL | Primary key |
| `role_code` | TEXT | NOT NULL | Unique machine-readable code. Seeded values: `kora_admin`, `kora_analyst`, `company_admin`, `company_hr`, `company_finance`, `company_esg`, `company_viewer`, `advisor`, `partner_admin` |
| `label` | TEXT | NOT NULL | Human-readable role name |
| `description` | TEXT | NOT NULL | Description of what this role can and cannot access |
| `can_access_identity_store` | BOOLEAN | NOT NULL | Default: FALSE. TRUE only for KORA system processes, never for any employer or partner role. |
| `can_access_individual_pib` | BOOLEAN | NOT NULL | Default: FALSE. TRUE only for the analytics engine (system process). Never for employer roles. |
| `can_modify_methodology` | BOOLEAN | NOT NULL | Default: FALSE. TRUE only for `kora_admin`. |
| `can_approve_ingestion` | BOOLEAN | NOT NULL | Default: FALSE. TRUE for `kora_analyst` and `kora_admin`. |
| `can_export_reports` | BOOLEAN | NOT NULL | Default: FALSE. TRUE for company roles with appropriate tier access. |
| `is_active` | BOOLEAN | NOT NULL | Default: TRUE |

**Access Rules:**
- Write: KORA Admin only, via migration (not application UI at Foundation Light)
- Read: KORA Admin, KORA Analyst

**Key Constraints:**
- `role_code` is unique. No two roles share the same code.
- `can_access_identity_store` must be FALSE for all roles except KORA system processes. This constraint must be verified at schema review time.

---

**Table:** `gov.user_roles`
**Store:** Governance
**KORA Layer:** GOVERNANCE
**Foundation Light Status:** Core
**Purpose:** Maps users to roles, scoped to specific companies and optionally specific programs. A user at Company A with the `company_hr` role has no access to Company B's data.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `user_role_id` | UUID | NOT NULL | Primary key |
| `user_id` | UUID | NOT NULL | FK → gov.users |
| `role_id` | UUID | NOT NULL | FK → gov.roles |
| `company_id` | UUID | nullable | FK → gov.companies. Scopes this role assignment to a specific company. Null only for KORA Admin roles (which apply platform-wide). |
| `program_id` | UUID | nullable | FK → gov.company_programs. If populated, scopes the role to a specific program. If null, the role applies to all programs at the company. |
| `granted_at` | TIMESTAMPTZ | NOT NULL | When this role was granted |
| `granted_by` | UUID | NOT NULL | FK → gov.users. The admin who granted the role. |
| `expires_at` | TIMESTAMPTZ | nullable | Optional expiry for time-limited access grants |
| `is_active` | BOOLEAN | NOT NULL | Default: TRUE |

**Access Rules:**
- Write: KORA Admin only
- Read: KORA Admin (all), Company Admin (own company only)

**Key Constraints:**
- A user should not have conflicting roles (e.g., both `company_hr` and `company_admin` for the same company). Application logic enforces this.
- All access events using this role assignment are logged to the audit trail.

---

## 10. Data Source and Ingestion Tables

---

**Table:** `gov.data_sources`
**Store:** Governance
**KORA Layer:** INPUT
**Foundation Light Status:** Core
**Purpose:** Describes the origin system or file type from which a company provides data to KORA. The source type determines the intrinsic evidence level assigned to events that originate from it. A source's verification level is a structural input to the IU formula — it cannot be manually elevated by the company.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `source_id` | UUID | NOT NULL | Primary key |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_id` | UUID | nullable | FK → gov.company_programs. If null, the source can be used across multiple programs. |
| `source_type` | ENUM | NOT NULL | `hris` / `welfare_platform` / `lms` / `esg_spreadsheet` / `wellbeing_provider` / `partner_export` / `internal_company_file` / `manual_initiative_log` / `api_integration` / `kora_link`. At Foundation Light, primary types are file-based. |
| `source_name` | TEXT | NOT NULL | Specific system or provider name (e.g., "Zucchetti HR", "Easy Welfare export", "Internal training log") |
| `owner_team` | TEXT | nullable | Which team or department at the company manages this source |
| `intrinsic_verification_level` | ENUM | NOT NULL | `self_declared` / `partially_verified` / `verified` / `certified`. The evidence level this source type typically provides. This is a structural property of the source, not a manually assigned value. |
| `data_quality_baseline` | ENUM | NOT NULL | `low` / `medium` / `high` / `not_assessed`. Historical completeness and reliability assessment by KORA analyst at ingestion. |
| `sensitivity_level` | ENUM | NOT NULL | `low` / `medium` / `high`. Does this source typically produce high-sensitivity data? |
| `ingestion_method` | ENUM | NOT NULL | `flat_file_upload` / `scheduled_export` / `api` / `manual_entry`. Foundation Light: `flat_file_upload` or `manual_entry`. |
| `refresh_frequency` | ENUM | NOT NULL | `one_time` / `annual` / `quarterly` / `monthly` / `real_time`. Foundation Light: typically `one_time` or `annual`. |
| `is_active` | BOOLEAN | NOT NULL | Default: TRUE |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |
| `created_by` | UUID | NOT NULL | FK → gov.users |

**Access Rules:**
- Write: Company Admin, KORA Analyst, KORA Admin
- Read: Company Admin, KORA Analyst, KORA Admin

---

**Table:** `gov.raw_datasets`
**Store:** Governance
**KORA Layer:** ACTIVITY
**Foundation Light Status:** Core
**Purpose:** The actual file or export received from a data source, before any KORA transformation. Retained for audit purposes and to enable re-processing if methodology versions change or errors are discovered. Raw datasets record what the company provided, not what KORA derived from it.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `dataset_id` | UUID | NOT NULL | Primary key |
| `source_id` | UUID | NOT NULL | FK → gov.data_sources |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `received_at` | TIMESTAMPTZ | NOT NULL | When the file was received by KORA |
| `file_format` | TEXT | NOT NULL | `csv` / `xlsx` / `json` / `xml` / `other` |
| `original_filename` | TEXT | nullable | Original filename as uploaded, for reference |
| `reporting_period_start` | DATE | nullable | The period this file covers (as declared by the company or identified by the analyst) |
| `reporting_period_end` | DATE | nullable | End of the declared reporting period |
| `raw_row_count` | INTEGER | nullable | Total rows in the raw file, including headers |
| `file_size_bytes` | BIGINT | nullable | File size for storage management |
| `checksum_sha256` | TEXT | NOT NULL | SHA-256 hash of the uploaded file. Used for integrity verification and duplicate detection. |
| `storage_reference` | TEXT | NOT NULL | Pointer to the raw file in KORA-controlled blob storage. The file is not stored inline. |
| `status` | ENUM | NOT NULL | `received` / `processing` / `processed` / `failed` / `archived` |
| `notes` | TEXT | nullable | Analyst notes about this dataset (format issues, scope clarifications, etc.) |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |

**Access Rules:**
- Write: KORA Analyst (upload and status management), KORA Admin
- Read: KORA Analyst, KORA Admin, Company Admin (own company datasets only — for reference, not raw data browsing)
- The raw file content in blob storage is accessible to KORA Analysts only, not to company roles

**Key Constraints:**
- `checksum_sha256` enables detection of re-submitted identical files
- The raw dataset content in blob storage must be retained according to the applicable data retention policy. Duration to be confirmed with legal counsel.

---

**Table:** `gov.ingestion_batches`
**Store:** Governance
**KORA Layer:** ACTIVITY
**Foundation Light Status:** Core
**Purpose:** A specific import operation that processes one or more raw datasets for a company program and period, producing UEF Records. The ingestion batch is the core operational unit of Foundation Light's consultant-assisted delivery model. Its lifecycle is mandatory: no UEF records may be created until the batch reaches `approved` status.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `batch_id` | UUID | NOT NULL | Primary key |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `batch_name` | TEXT | nullable | Human-readable batch name (e.g., "Welfare 2024 Annual Ingestion — v1") |
| `submitted_at` | TIMESTAMPTZ | NOT NULL | When the batch was submitted for processing |
| `submitted_by` | UUID | NOT NULL | FK → gov.users |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. The methodology version active at the time of ingestion. |
| `status` | ENUM | NOT NULL | `submitted` / `under_review` / `approved` / `processing` / `complete` / `error` / `rejected`. Status must follow this lifecycle in order. |
| `reviewed_by` | UUID | nullable | FK → gov.users. KORA analyst who reviewed the batch. |
| `reviewed_at` | TIMESTAMPTZ | nullable | Timestamp when review was completed |
| `approved_by` | UUID | nullable | FK → gov.users. KORA analyst or admin who approved the batch for scoring. |
| `approved_at` | TIMESTAMPTZ | nullable | Timestamp when the batch was approved |
| `total_rows_processed` | INTEGER | nullable | Total rows evaluated during processing |
| `accepted_rows` | INTEGER | nullable | Rows that successfully became UEF records |
| `rejected_rows` | INTEGER | nullable | Rows excluded with documented rejection reasons |
| `flagged_rows` | INTEGER | nullable | Rows accepted but flagged for analyst review (quality concerns, ambiguous classification) |
| `duplicate_records_detected` | INTEGER | nullable | Records identified as duplicates and excluded |
| `missing_field_summary` | JSONB | nullable | JSON object: `{field_name: missing_count}` showing which UEF fields had significant absence rates |
| `column_mapping_confidence` | DECIMAL(5,2) | nullable | Average confidence of AI column-to-UEF field mappings for this batch (0.00–100.00) |
| `overall_quality_score` | DECIMAL(5,2) | nullable | Batch-level data quality score assigned by the Data Quality Engine (0.00–100.00) |
| `uef_records_generated` | INTEGER | nullable | Count of UEF records created from this batch after approval |
| `review_notes` | TEXT | nullable | KORA analyst notes from the review step |
| `error_log` | JSONB | nullable | Technical error details if status = `error` |
| `completed_at` | TIMESTAMPTZ | nullable | When processing reached `complete` or `error` state |

**Access Rules:**
- Write (status management and review): KORA Analyst, KORA Admin
- Read: Company Admin (status and summary only — not raw data or rejection details), KORA Analyst, KORA Admin
- Prohibited: Company HR, Finance, ESG, Viewer roles may not read ingestion batch details

**Key Constraints:**
- `status` transitions are one-directional within the prescribed lifecycle. Only `submitted` → `under_review` → `approved` → `processing` → `complete/error` is valid. Reversal requires explicit KORA Admin action and creates an audit trail entry.
- UEF records cannot be created for a batch until `status = 'approved'`.
- `methodology_version_id` is set at batch creation and does not change — it records which version was active when the ingestion was initiated.

---

**Table:** `gov.ingestion_batch_datasets`
**Store:** Governance
**KORA Layer:** ACTIVITY
**Foundation Light Status:** Core
**Purpose:** Join table linking ingestion batches to the raw datasets they process. One batch may process multiple files (e.g., welfare platform export + internal training log together).

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `batch_id` | UUID | NOT NULL | FK → gov.ingestion_batches |
| `dataset_id` | UUID | NOT NULL | FK → gov.raw_datasets |

**Primary Key:** (`batch_id`, `dataset_id`)

**Access Rules:** Same as gov.ingestion_batches

---

**Table:** `gov.ingestion_rejection_records`
**Store:** Governance
**KORA Layer:** ACTIVITY
**Foundation Light Status:** Core
**Purpose:** Documents every row that was rejected during ingestion, with a standardized reason code. Required by doc 10 DG-05: every rejected record must have a documented rejection reason code stored in the audit trail. These records are the evidence that the quality controls functioned correctly.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `rejection_id` | UUID | NOT NULL | Primary key |
| `batch_id` | UUID | NOT NULL | FK → gov.ingestion_batches |
| `row_reference` | TEXT | NOT NULL | Identifies the rejected row in the original raw dataset (e.g., row number, source row ID) |
| `rejection_reason_code` | TEXT | NOT NULL | Standardized code (e.g., `MISSING_WORKER_ID`, `UNRECOGNIZED_EVENT_TYPE`, `DUPLICATE_RECORD`, `BELOW_QUALITY_THRESHOLD`, `PRIVACY_SENSITIVITY_BLOCK`, `OUTSIDE_PERIOD`) |
| `rejection_reason_description` | TEXT | NOT NULL | Human-readable explanation of why this row was rejected |
| `raw_data_snapshot` | JSONB | nullable | Partial snapshot of the rejected row for analyst review. Must be privacy-masked: any field that could contain identifiable personal data must be removed or hashed before storing here. |
| `created_at` | TIMESTAMPTZ | NOT NULL | Timestamp of rejection |

**Access Rules:**
- Write: KORA ingestion system (automated)
- Read: KORA Analyst, KORA Admin
- Prohibited: All employer roles. Rejection records may contain partially identifiable data in `raw_data_snapshot` and must not be accessible outside KORA.

---

## 11. UEF and Event Processing Tables

---

**Table:** `analytics.uef_records`
**Store:** Analytics
**KORA Layer:** ACTIVITY (the canonical normalized event representation)
**Foundation Light Status:** Core
**Purpose:** The central table of the analytics store. Every processed action that enters KORA's scoring pipeline exists as a UEF record. UEF records are the common language that makes heterogeneous events from different sources analytically comparable. Every IU, every PIB, and every KORA Index is ultimately built from these records. The UEF record carries all dimensions of an event simultaneously: impact classification, source provenance, quality assessment, privacy sensitivity, and fiscal eligibility — as parallel attributes, never merged.

**Fields — Identity and Attribution:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `event_id` | UUID | NOT NULL | Primary key, server-generated. Unique identifier for this normalized event. |
| `worker_id` | UUID | NOT NULL | KORA pseudonymized identifier. Never a real name or employee number. |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `segment_id` | UUID | nullable | FK → analytics.workforce_segments. Only populated if the segment is above the safe aggregation threshold. |
| `batch_id` | UUID | NOT NULL | FK → gov.ingestion_batches. The approved batch that created this record. |

**Fields — Event Description:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `event_type` | TEXT | NOT NULL | KORA event taxonomy classification code (e.g., `training.completion`, `health.prevention_checkup`, `volunteering.session`, `mentoring.conducted`) |
| `event_date` | DATE | NOT NULL | Date the event occurred (or start date for ranged events) |
| `event_date_end` | DATE | nullable | End date for multi-day or ranged events |
| `duration_raw` | DECIMAL(10,2) | nullable | Raw duration in native units |
| `duration_raw_unit` | TEXT | nullable | `hours` / `sessions` / `days` / `minutes` |
| `duration_normalized` | DECIMAL(10,4) | nullable | Normalized Magnitude (NM) output: the result of applying the NM normalization function to `duration_raw`. Populated during Stage ⑥ processing. |
| `continuity_flag` | ENUM | NOT NULL | `one_time` / `recurring` / `structured_program` |
| `action_type` | ENUM | NOT NULL | `individual` / `group` / `company_wide` |

**Fields — Source and Provenance:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `source_id` | UUID | NOT NULL | FK → gov.data_sources |
| `source_type` | ENUM | NOT NULL | `kcp` / `external_partner` / `internal` / `worker` / `financial` / `esg`. Maps to doc 10 Section 4 source categories. |
| `source_tier` | ENUM | NOT NULL | `kcp` / `external_verified` / `internal` / `unverified`. The evidence tier assigned to this source. This is a structural input to the EV correction factor. |
| `source_name` | TEXT | nullable | Specific system or provider name |
| `evidence_ref` | UUID | nullable | FK → evidence.evidence_records. Link to an evidence record if one supports this event. |
| `ingestion_confidence` | DECIMAL(5,4) | NOT NULL | Confidence score assigned at ingestion (0.0–1.0). Captures how reliably this record was mapped from the raw source. |

**Fields — Pillar Classification:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `primary_pillar` | ENUM | NOT NULL | `LIFE` / `GROWTH` / `CONNECTION` / `IMPACT` / `LEGACY`. The primary impact pillar for this event. |
| `secondary_pillars` | TEXT[] | nullable | Array of secondary pillar codes where methodologically justified |
| `pillar_mapping_id` | UUID | NOT NULL | FK → analytics.pillar_mappings. The mapping record that documents how this classification was made. |
| `pillar_mapping_version` | TEXT | NOT NULL | Version of the pillar taxonomy used for this classification |
| `mapping_confidence` | DECIMAL(5,4) | NOT NULL | Confidence in the pillar assignment (0.0–1.0) |
| `mapping_method` | ENUM | NOT NULL | `taxonomy_rule` / `ai_suggestion_confirmed` / `manually_assigned` |
| `human_review_flag` | BOOLEAN | NOT NULL | Default: FALSE. TRUE if this mapping was manually confirmed or overridden by a reviewer. |

**Fields — Quality and Verification:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `content_quality_level` | ENUM | NOT NULL | `low` / `standard` / `high` / `certified`. CQ classification. |
| `evidence_level` | ENUM | NOT NULL | `self_declared` / `partially_verified` / `verified` / `certified`. EV classification. |
| `verification_level` | ENUM | NOT NULL | Overall verification status (same ENUM as evidence_level; may differ from evidence_level if additional review has occurred) |
| `impact_confidence` | DECIMAL(5,4) | NOT NULL | Reliability of this event as impact evidence (0.0–1.0). Distinct from eligibility_confidence. |

**Fields — Privacy:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `privacy_sensitivity` | ENUM | NOT NULL | `low` / `medium` / `high`. Set during Stage ③ privacy processing. |
| `handling_protocol` | TEXT | nullable | Code identifying which privacy handling protocol was applied (e.g., `HEALTH_MASKING`, `STANDARD`, `PSYCHOLOGICAL_PARTICIPATION_ONLY`) |
| `legal_basis` | TEXT | NOT NULL | GDPR legal basis for processing this event type (e.g., `legitimate_interest`, `contract_performance`, `consent`). Required per doc 10 PR-05. |

**Fields — Fiscal and Eligibility:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `financial_ref` | UUID | nullable | FK → gov.financial_movements. Link to a financial movement if spend data is associated with this event. |
| `fiscal_perimeter_id` | UUID | nullable | FK → gov.fiscal_perimeters. The fiscal/budget perimeter this event is classified under, if any. |
| `eligibility_status` | ENUM | NOT NULL | `eligible` / `conditional` / `uncertain` / `excluded` / `not_classified`. Default: `not_classified`. |
| `eligibility_confidence` | ENUM | NOT NULL | `advisor_confirmed` / `kora_advisor_confirmed` / `partner_documented` / `partner_declared` / `kora_inferred` / `pending_review` / `outdated_requires_review` / `not_assessed`. Default: `not_assessed`. |

**Fields — Methodology:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. The methodology version active at the time this record was processed. Never null. |
| `review_status` | ENUM | NOT NULL | `auto_processed` / `flagged` / `manually_reviewed`. Describes how the record was processed or reviewed. Distinct from `review_decision`. |
| `review_notes` | TEXT | nullable | Notes from human reviewer if review_status is `manually_reviewed` |
| `anti_gaming_flags` | TEXT[] | nullable | Array of anti-gaming flag codes triggered on this record |
| `is_disqualified` | BOOLEAN | NOT NULL | Default: FALSE. Set to TRUE if AGF = 0.00 (record fully disqualified by anti-gaming controls). Disqualified records do not generate IU, even if `review_decision = 'approved'`. |
| `review_decision` | ENUM | NOT NULL | `needs_review` / `approved` / `rejected` / `flagged_pending_review` / `excluded`. Final review decision determining whether this UEF record may enter IU generation and downstream scoring. This is separate from `review_status`, which describes how the record was processed. Default: `needs_review`. Every change to this field must write an audit event. |
| `eligible_for_scoring` | BOOLEAN | NOT NULL | Default: FALSE. TRUE only when `review_decision = 'approved'`, `is_disqualified = FALSE`, the ingestion batch is `status = 'complete'`, and required minimum data fields are present. Only records with `eligible_for_scoring = TRUE` may enter IU generation, PIB computation, company aggregation, scoring runs, KORA Index, Confidence, and Explainability. Derived by the ingestion/review workflow — must not be manually set by company users. |

**Fields — Status:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `processing_status` | ENUM | NOT NULL | `pending` / `processed` / `error` / `archived` |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification timestamp |

**Access Rules:**
- Write: KORA analytics engine (automated pipeline), KORA Analyst (for review/override of `mapping_method`, `review_status`, `review_notes`, `review_decision`)
- Read: KORA Analyst (full read for review), KORA Admin (full read)
- Prohibited: No employer role (Company Admin, HR, Finance, ESG, Viewer) may query individual UEF records or see individual-level `review_decision` or `eligible_for_scoring` values. All employer-facing intelligence is derived from aggregated views, never from direct table access.

**Key Constraints:**
- `methodology_version_id` is NOT NULL on every record. This is a non-negotiable audit requirement.
- `worker_id` is always a pseudonymized KORA ID. The real worker identity must never appear in this table.
- `primary_pillar` and `fiscal_perimeter_id` are independent attributes. The fiscal perimeter classification does not determine or affect the pillar classification.
- Only UEF records with `review_decision = 'approved'` AND `eligible_for_scoring = TRUE` may generate `analytics.impact_units`.
- UEF records with `review_decision = 'rejected'` or `'excluded'` must not generate IU, regardless of other field values.
- UEF records with `review_decision = 'flagged_pending_review'` must not generate IU until the decision is changed to `'approved'`.
- UEF records with `is_disqualified = TRUE` must not be `eligible_for_scoring = TRUE`, even if `review_decision = 'approved'`.
- `eligible_for_scoring` must be set to FALSE immediately if `review_decision` is changed from `'approved'` to any other value.
- Every change to `review_decision` must write an `audit.audit_trail_records` event with the previous and new values.

**Notes:**
- This table will be the largest in the platform. Index strategy on (`company_id`, `program_id`), (`worker_id`, `program_id`), (`primary_pillar`), (`event_date`), and (`methodology_version_id`) should be planned by the CTO before migration (see Section 30, Question 5).
- Partitioning strategy (by company, by time period) should be considered at design time (see Section 30, Question 6).

---

**Table:** `analytics.pillar_mappings`
**Store:** Analytics
**KORA Layer:** IMPACT (classification step)
**Foundation Light Status:** Core
**Purpose:** The detailed record of how each UEF event was assigned to its primary and secondary pillars. Pillar assignment is the first and most consequential analytical decision KORA makes for each event — it determines which pillar(s) accumulate IU from this action. The Pillar Mapping record preserves full context: method, confidence, AI suggestion (if any), human override (if any), and the methodology version in effect. This is the audit record for every classification decision.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `mapping_id` | UUID | NOT NULL | Primary key |
| `event_id` | UUID | NOT NULL | FK → analytics.uef_records. One-to-one: each UEF record has exactly one pillar mapping record. |
| `primary_pillar` | ENUM | NOT NULL | `LIFE` / `GROWTH` / `CONNECTION` / `IMPACT` / `LEGACY` |
| `secondary_pillars` | TEXT[] | nullable | Array of secondary pillar codes |
| `mapping_confidence` | DECIMAL(5,4) | NOT NULL | Overall confidence in this assignment (0.0–1.0) |
| `mapping_method` | ENUM | NOT NULL | `taxonomy_rule` / `ai_suggestion_confirmed` / `manually_assigned` |
| `taxonomy_rule_applied` | TEXT | nullable | The specific taxonomy rule code that determined the classification, if `mapping_method = 'taxonomy_rule'` |
| `ai_suggestion` | ENUM | nullable | The AI's original primary pillar suggestion before human review. `LIFE` / `GROWTH` / `CONNECTION` / `IMPACT` / `LEGACY`. Populated when AI was involved. |
| `ai_suggestion_confidence` | DECIMAL(5,4) | nullable | The AI model's confidence in its own suggestion |
| `human_review_flag` | BOOLEAN | NOT NULL | Default: FALSE. TRUE if a human reviewer confirmed or changed the classification. |
| `reviewer_id` | UUID | nullable | FK → gov.users. The reviewer who confirmed or overrode the classification. |
| `override_reason` | TEXT | nullable | Required when a human reviewer changed the AI or rule-based assignment. Documents the rationale. |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. The pillar taxonomy version in effect at classification time. |
| `bcm_version_id` | UUID | NOT NULL | FK → gov.bcm_versions. The BCM version whose entries were used to look up base contribution weights for this event type × pillar. |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |

**Access Rules:**
- Write: KORA analytics engine (automated), KORA Analyst (for override)
- Read: KORA Analyst, KORA Admin
- Prohibited: All employer roles

**Key Constraints:**
- One Pillar Mapping record per UEF record. The FK `event_id` should have a unique constraint.
- `override_reason` is required (NOT NULL) when `mapping_method = 'manually_assigned'` and the result differs from the original AI suggestion. Enforced at application level.

---

**Table:** `analytics.workforce_segments`
**Store:** Analytics
**KORA Layer:** IMPACT (supporting structure for segment intelligence)
**Foundation Light Status:** Basic
**Purpose:** Privacy-safe groupings of pseudonymized workers used to produce segment-level workforce intelligence — activation by department, participation by seniority band, and so on. Segments are pre-defined, privacy-audited groupings. Any segment with member count below the safe aggregation threshold must be suppressed and marked inactive.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `segment_id` | UUID | NOT NULL | Primary key |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `segment_type` | ENUM | NOT NULL | `department` / `site` / `job_family` / `seniority_band` / `contract_type` / `country` / `cohort` |
| `segment_label` | TEXT | NOT NULL | Human-readable segment label (e.g., "Engineering", "Milan Office", "Senior Management") |
| `member_count` | INTEGER | NOT NULL | Count of pseudonymized workers in this segment for the program period |
| `is_active` | BOOLEAN | NOT NULL | FALSE if `member_count` < `safe_aggregation_threshold` from `gov.companies`. Suppressed segments must never appear in employer-facing outputs. |
| `below_threshold_suppressed` | BOOLEAN | NOT NULL | Default: FALSE. TRUE if this segment was deactivated due to insufficient member count. |
| `privacy_sensitivity_override` | BOOLEAN | NOT NULL | Default: FALSE. TRUE if this segment type requires a higher threshold or complete exclusion due to sensitivity (e.g., a segment that could identify a vulnerable group). |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |

**Access Rules:**
- Write: KORA analytics engine (automated during ingestion processing)
- Read: KORA Analyst (all segments), Company HR / Company Admin (only where `is_active = TRUE` and `member_count >= safe_aggregation_threshold`)
- Prohibited: No employer role may see segments where `is_active = FALSE`. This filter must be enforced at the view/query level, not left to the application.

---

**Table:** `analytics.worker_profiles`
**Store:** Analytics
**KORA Layer:** IMPACT (analytical foundation)
**Foundation Light Status:** Core
**Purpose:** The pseudonymized analytical record used by KORA to track whether a worker activated, how many Impact Units they accumulated, and whether they engaged consistently. Contains no identifiable information — only the KORA pseudonymized ID and safe analytical attributes. This table is the individual-level foundation for all workforce intelligence calculations. It is never exposed to employer roles.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `profile_id` | UUID | NOT NULL | Primary key |
| `worker_id` | UUID | NOT NULL | KORA pseudonymized ID. The only identifier for this worker in the analytics store. |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `segment_id` | UUID | nullable | FK → analytics.workforce_segments. Only populated if the segment is above threshold. |
| `contract_type_category` | ENUM | nullable | `permanent` / `fixed_term` / `contractor`. Privacy-safe aggregation category. Not a specific contract detail. |
| `enrollment_date` | DATE | nullable | Date this worker was included in the program scope. Used for tenure-based policy rules (future). Not a hire date — a program enrollment date. |
| `is_activated_current_period` | BOOLEAN | NOT NULL | Default: FALSE. TRUE if this worker's PIB exceeds the activation threshold in the current program period. |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification timestamp |

**Access Rules:**
- Write: KORA pseudonymization service (at ingestion, to establish the profile), KORA analytics engine (to update activation status)
- Read: KORA analytics engine (for scoring calculations), KORA Analyst (for review), KORA Admin
- Prohibited: All employer roles. This table must never be accessible via employer-facing API routes.

**Key Constraints:**
- `worker_id` + `program_id` must be unique. Each worker has one profile per program.
- No field in this table may contain a name, email, employee number, or any other directly identifiable attribute.

---

## 12. BCM and Methodology Parameter Tables

These tables define the versioned parameters that govern KORA's scoring engine. All current parameter values are pre-empirical-calibration. This status must be reflected in the `calibration_status` and `is_pre_calibration` fields of every record.

---

**Table:** `gov.methodology_versions`
**Store:** Governance
**KORA Layer:** EVIDENCE (versioning layer)
**Foundation Light Status:** Core
**Purpose:** Versioned snapshots of the complete KORA methodological logic. Every scoring output carries a reference to the methodology version under which it was calculated. Historical scores are permanently locked to the version that produced them — they are never recalculated when a new version is published (doc 08 Decision 5).

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `version_id` | UUID | NOT NULL | Primary key |
| `version_label` | TEXT | NOT NULL | Unique version label (e.g., `v0.1`, `v0.2`, `v1.0`) |
| `status` | ENUM | NOT NULL | `draft` / `active` / `superseded` / `archived`. Only one version may be `active` at a time. |
| `effective_from` | DATE | NOT NULL | When this version became active |
| `effective_to` | DATE | nullable | When this version was superseded. Null if currently active. |
| `change_log` | TEXT | NOT NULL | Description of what changed from the prior version and why |
| `published_by` | TEXT | NOT NULL | KORA methodology team member or team name |
| `external_validation_reference` | TEXT | nullable | Reference to external review or validation if this version has been externally assessed |
| `bcm_version_id` | UUID | NOT NULL | FK → gov.bcm_versions. Which BCM version is in effect under this methodology version. |
| `nm_rules_version_id` | UUID | NOT NULL | FK → gov.nm_rules_versions. Which NM rules version applies. |
| `kora_index_weights_version_id` | UUID | NOT NULL | FK → gov.kora_index_weight_versions. Which KORA Index weights apply. |
| `anti_gaming_rules_version_id` | UUID | NOT NULL | FK → gov.anti_gaming_rules_versions. Which anti-gaming rule set applies. |
| `is_pre_calibration` | BOOLEAN | NOT NULL | Default: TRUE. Must remain TRUE for all versions until the Delphi Study validation is complete. Must never be manually set to FALSE without documented empirical validation. |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |

**Access Rules:**
- Write: KORA methodology team only (via controlled migration process, not application UI)
- Read: All authenticated roles (methodology version labels and change logs are transparent)

**Key Constraints:**
- `version_label` is unique
- Exactly one record may have `status = 'active'` at any time
- Once a version reaches `superseded` or `archived` status, it must not be modified — it is a locked historical record

---

**Table:** `gov.methodology_version_components`
**Store:** Governance
**KORA Layer:** EVIDENCE
**Foundation Light Status:** Core
**Purpose:** Records the separately versioned components of each methodology version. Each component (IU formula, BCM, NM rules, KORA Index weights, etc.) is versioned independently, allowing precise traceability of what changed between versions.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `component_id` | UUID | NOT NULL | Primary key |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions |
| `component_type` | ENUM | NOT NULL | `iu_formula` / `bcm` / `nm_rules` / `kora_index_weights` / `kora_contribution_formula` / `ecosystem_reach_formula` / `confidence_score_model` / `pillar_taxonomy` / `fiscal_budget_taxonomy` / `eligibility_confidence_model` / `anti_gaming_rules` / `privacy_thresholds` / `policy_rule_framework` |
| `component_version_label` | TEXT | NOT NULL | Version label for this component specifically (e.g., `bcm-v0.1`, `nm-v0.2`) |
| `change_description` | TEXT | NOT NULL | What changed in this component from the prior version |
| `is_pre_calibration` | BOOLEAN | NOT NULL | Default: TRUE. Must remain TRUE until empirical calibration of this specific component is complete. |
| `external_validation_reference` | TEXT | nullable | Reference to external validation if this component version has been externally reviewed |
| `effective_from` | DATE | NOT NULL | When this component version became active |
| `effective_to` | DATE | nullable | When this component version was superseded |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |

**Access Rules:**
- Write: KORA methodology team only
- Read: All authenticated roles

---

**Table:** `gov.bcm_versions`
**Store:** Governance
**KORA Layer:** EVIDENCE (BCM versioning)
**Foundation Light Status:** Core
**Purpose:** Version records for the Base Contribution Matrix (BCM). The BCM defines the base weight for each event type × pillar combination. It is a theoretical prior — the product of expert reasoning before empirical validation. All BCM versions must be labeled as pre-empirical-calibration until the Delphi Study is complete.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `bcm_version_id` | UUID | NOT NULL | Primary key |
| `version_label` | TEXT | NOT NULL | Unique label (e.g., `bcm-v0.1`) |
| `status` | ENUM | NOT NULL | `draft` / `active` / `superseded` / `archived` |
| `effective_from` | DATE | NOT NULL | When this BCM version became active |
| `effective_to` | DATE | nullable | When superseded. Null if currently active. |
| `validation_status` | TEXT | NOT NULL | Default: `pre_empirical_calibration`. Must not be changed to any other value until the Delphi Study (doc 10 MV-01, MV-03 Phase 3) is complete. |
| `delphi_study_reference` | TEXT | nullable | Reference to the Delphi Study that validated this BCM version, if applicable |
| `change_log` | TEXT | NOT NULL | What changed from the prior BCM version |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |

**Access Rules:**
- Write: KORA methodology team only
- Read: All authenticated roles

---

**Table:** `gov.bcm_entries`
**Store:** Governance
**KORA Layer:** IMPACT (Base Contribution Matrix entries)
**Foundation Light Status:** Core
**Purpose:** The actual entries of the Base Contribution Matrix — one row per event type × pillar combination, per BCM version. Each entry defines the base weight BC_{e,p} that an event of type `event_type_code` contributes to pillar `pillar`. These weights are the starting point of the IU formula, before correction factors are applied.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `bcm_entry_id` | UUID | NOT NULL | Primary key |
| `bcm_version_id` | UUID | NOT NULL | FK → gov.bcm_versions |
| `event_type_code` | TEXT | NOT NULL | KORA event taxonomy code (e.g., `training.completion`, `health.prevention_checkup`, `volunteering.session`) |
| `pillar` | ENUM | NOT NULL | `LIFE` / `GROWTH` / `CONNECTION` / `IMPACT` / `LEGACY` |
| `base_weight` | DECIMAL(5,4) | NOT NULL | BC_{e,p} value. The base contribution weight for this event type on this pillar. Pre-calibration values are theoretical priors. |
| `is_primary_pillar` | BOOLEAN | NOT NULL | TRUE if this pillar is the primary contribution target for this event type. An event type may have one primary and one or more secondary entries. |
| `notes` | TEXT | nullable | Methodological rationale for this weight assignment |

**Unique Constraint:** (`bcm_version_id`, `event_type_code`, `pillar`) — no duplicate entries per version.

**Access Rules:**
- Write: KORA methodology team only
- Read: All authenticated roles (BCM entries are transparent per the methodology's explainability commitment — doc 10 AG-02)

**Key Constraints:**
- All entries carry the calibration_status of their parent `bcm_version_id`. No entry in a pre-calibration BCM version may be presented as validated.

---

**Table:** `gov.nm_rules_versions`
**Store:** Governance
**KORA Layer:** EVIDENCE (NM versioning)
**Foundation Light Status:** Core
**Purpose:** Version records for the Normalized Magnitude (NM) rules. NM rules define the normalization function and category caps for each event type. A change to NM rules constitutes a methodology version increment.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `nm_rules_version_id` | UUID | NOT NULL | Primary key |
| `version_label` | TEXT | NOT NULL | Unique label (e.g., `nm-v0.1`) |
| `status` | ENUM | NOT NULL | `draft` / `active` / `superseded` / `archived` |
| `effective_from` | DATE | NOT NULL | When this NM rules version became active |
| `effective_to` | DATE | nullable | When superseded. Null if currently active. |
| `change_log` | TEXT | NOT NULL | What changed from the prior NM rules version |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |

**Access Rules:**
- Write: KORA methodology team only
- Read: All authenticated roles

---

**Table:** `gov.nm_rules`
**Store:** Governance
**KORA Layer:** IMPACT (NM computation rules)
**Foundation Light Status:** Core
**Purpose:** The actual normalization rules for each event type under each NM rules version. Each rule specifies the normalization function, the category cap, and the parameters that govern how raw duration or magnitude is converted to a normalized NM value. The NM computation is Stage ⑥ of the 14-stage algorithm.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `nm_rule_id` | UUID | NOT NULL | Primary key |
| `nm_rules_version_id` | UUID | NOT NULL | FK → gov.nm_rules_versions |
| `event_type_code` | TEXT | NOT NULL | KORA event taxonomy code |
| `normalization_function` | ENUM | NOT NULL | `linear` / `concave` / `step` / `log`. For most event types, `concave` applies diminishing returns logic. |
| `category_cap` | DECIMAL(10,4) | NOT NULL | Maximum NM value for this event type. Applied to prevent gaming through inflating reported duration. (doc 10 Section 12) |
| `parameters` | JSONB | nullable | Function-specific parameters (e.g., slope, inflection points, step boundaries) used by the normalization engine |
| `notes` | TEXT | nullable | Rationale for the cap and function choice |

**Unique Constraint:** (`nm_rules_version_id`, `event_type_code`) — one rule per event type per version.

**Access Rules:**
- Write: KORA methodology team only
- Read: All authenticated roles

---

**Table:** `gov.anti_gaming_rules_versions`
**Store:** Governance
**KORA Layer:** EVIDENCE (anti-gaming versioning)
**Foundation Light Status:** Core
**Purpose:** Version records for the anti-gaming rule set. Anti-gaming rules define the conditions under which AGF is reduced and when events are flagged or disqualified. Changes to these rules constitute a methodology version increment.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `anti_gaming_rules_version_id` | UUID | NOT NULL | Primary key |
| `version_label` | TEXT | NOT NULL | Unique label (e.g., `ag-v0.1`) |
| `status` | ENUM | NOT NULL | `draft` / `active` / `superseded` / `archived` |
| `effective_from` | DATE | NOT NULL | When this rule version became active |
| `effective_to` | DATE | nullable | When superseded |
| `change_log` | TEXT | NOT NULL | What changed |
| `rules_definition` | JSONB | NOT NULL | Structured definition of the anti-gaming rules: flag trigger conditions, AGF reduction schedules, concentration alert thresholds, deduplication parameters |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |

**Access Rules:**
- Write: KORA methodology team only
- Read: KORA Admin, KORA Analyst (rules definitions visible internally; not published in employer-facing outputs)

---

---

## 13. Impact Engine Tables

These tables correspond to Stages ⑩–⑫ of the 14-stage algorithm flow (doc 10 Section 3). They implement the computation of Impact Units per event per pillar, the aggregation of IU into PIB per worker, and the further aggregation of PIB into company-level statistics. No employer role may access individual rows from any of these three tables directly.

---

**Table:** `analytics.impact_units`
**Store:** Analytics
**KORA Layer:** IMPACT
**Foundation Light Status:** Core
**Purpose:** Stores every Impact Unit generated by the IU Engine (Stage ⑩). Each row represents the computed IU for a single UEF record and a single pillar, after applying the canonical Architecture v3 formula. One UEF record may produce multiple IU rows — one per pillar it contributes to (primary and any secondary pillars). Every factor used in the calculation is stored so that any IU value can be fully re-derived and audited from the record itself.

Canonical formula: `IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]`

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key |
| `uef_record_id` | UUID | NOT NULL | FK → analytics.uef_records. The event this IU was derived from. Every IU is traceable to its originating UEF record. |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `company_program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `anonymized_worker_profile_id` | UUID | NOT NULL | FK → analytics.worker_profiles. The pseudonymized worker this IU is credited to. Never a real identity. |
| `pillar_code` | ENUM | NOT NULL | `LIFE` / `GROWTH` / `CONNECTION` / `IMPACT` / `LEGACY`. The pillar this IU is credited to. |
| `is_primary_pillar` | BOOLEAN | NOT NULL | TRUE if this is the primary pillar for the originating event; FALSE for secondary pillar contributions. |
| `nm_value` | DECIMAL(10,6) | NOT NULL | Normalized Magnitude output. The result of Stage ⑥ NM computation for this event. |
| `bc_value` | DECIMAL(10,6) | NOT NULL | Base Contribution weight for this event type on this pillar, from the BCM. BC_{e,p} from the canonical formula. |
| `cq_value` | DECIMAL(5,4) | NOT NULL | Content Quality factor applied. Range: [0.50–1.20]. CHECK constraint required. |
| `ev_value` | DECIMAL(5,4) | NOT NULL | Evidence / Verification factor applied. Range: [0.50–1.00]. CHECK constraint required. Cannot exceed 1.00. |
| `cf_value` | DECIMAL(5,4) | NOT NULL | Continuity Factor applied. Range: [1.00–1.20]. CHECK constraint required. |
| `agf_value` | DECIMAL(5,4) | NOT NULL | Anti-Gaming Factor applied. Range: [0.00–1.00]. CHECK constraint required. If 0.00, this IU produces zero impact and the row is flagged disqualified. |
| `df_value` | DECIMAL(5,4) | nullable | Durability Factor. Range: [1.00–1.30] if applied. NULL if not applied. Only valid for LEGACY pillar events with documented durability evidence. CHECK constraint: must be NULL or between 1.00 and 1.30. |
| `exf_value` | DECIMAL(5,4) | nullable | Externality Factor. Range: [1.00–1.20] if applied. NULL if not applied. Only valid for IMPACT pillar events with verified external beneficiary evidence. CHECK constraint: must be NULL or between 1.00 and 1.20. |
| `sf_value` | DECIMAL(5,4) | nullable | Strategic Fit factor. Range: [0.80–1.10]. Default: 1.00 (no adjustment). NULL treated as 1.00 in calculation. Must not differ from 1.00 without a documented strategic priority declaration and corresponding evidence record. CHECK constraint: must be NULL or between 0.80 and 1.10. |
| `final_iu_value` | DECIMAL(12,6) | NOT NULL | The computed Impact Unit value for this event on this pillar. Product of all applied factors. Zero if `agf_value = 0.00`. |
| `is_disqualified` | BOOLEAN | NOT NULL | Default: FALSE. TRUE if `agf_value = 0.00`. Disqualified IU rows exist for audit trail purposes but contribute zero to PIB. |
| `formula_version` | TEXT | NOT NULL | The canonical formula version applied (e.g., `IU-v0.1`). Redundant with methodology_version_id but provides explicit formula traceability. |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. The methodology version in effect at calculation time. NOT NULL on every scoring output. |
| `bcm_version_id` | UUID | NOT NULL | FK → gov.bcm_versions. The BCM version that provided the `bc_value` for this event type × pillar. |
| `nm_rule_version_id` | UUID | NOT NULL | FK → gov.nm_rules_versions. The NM rules version that produced the `nm_value`. |
| `correction_factor_version_id` | UUID | NOT NULL | FK → gov.correction_factor_rule_versions. The correction factor rule version governing the valid ranges and application conditions for CQ, EV, CF, AGF, DF, EXF, and SF applied to this IU record. |
| `anti_gaming_rule_version_id` | UUID | NOT NULL | FK → gov.anti_gaming_rules_versions. The anti-gaming rule set applied when evaluating this event. |
| `confidence_score_id` | UUID | nullable | FK → analytics.confidence_scores. Event-level confidence score record, if calculated. |
| `evidence_record_id` | UUID | nullable | FK → evidence.evidence_records. The evidence record that supports the verification level used to set `ev_value`, if one exists. |
| `calculation_status` | ENUM | NOT NULL | `auto_calculated` / `flagged_for_review` / `manually_adjusted`. Only KORA system processes may set `auto_calculated`. `manually_adjusted` requires a documented rationale and advisor review reference. |
| `review_status` | ENUM | NOT NULL | `not_required` / `pending_review` / `reviewed_confirmed` / `reviewed_rejected` |
| `review_notes` | TEXT | nullable | Notes from the reviewer if `calculation_status = 'manually_adjusted'` or `review_status` is not `not_required`. |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |
| `calculated_at` | TIMESTAMPTZ | NOT NULL | When the IU calculation was performed by the engine |

**Access Rules:**
- Write: KORA analytics engine only (automated). Manual adjustments require KORA Analyst authorization and are audit-logged.
- Read: KORA Analyst (for review), KORA Admin
- Prohibited: All employer roles (Company Admin, HR, Finance, ESG, Viewer) must never access individual IU rows. Impact Units are not employee performance scores. They are internal analytical outputs.

**Key Constraints:**
- `methodology_version_id` is NOT NULL. No IU may exist without a methodology version reference.
- An IU record may only be created from a UEF record where `analytics.uef_records.eligible_for_scoring = TRUE` AND `review_decision = 'approved'`. No IU may be generated from a rejected, excluded, flagged, or disqualified UEF record.
- CHECK constraints on all correction factor columns as specified above.
- `sf_value` must not differ from 1.00 (or NULL) unless a corresponding evidence record supports a documented strategic alignment decision.
- An IU row with `agf_value = 0.00` must have `final_iu_value = 0.00` and `is_disqualified = TRUE`. Enforced by application logic; verifiable in review.

**Notes:**
- Impact Units are not money, rewards, gamification points, or employee performance scores. Any feature that surfaces IU as a ranking or reward mechanism violates the methodology.
- The canonical formula must be applied exactly as specified. No field in this table may be repurposed to introduce an undocumented scoring adjustment.

---

**Table:** `analytics.pib_records`
**Store:** Analytics
**KORA Layer:** IMPACT (mandatory intermediate layer — Stage ⑪)
**Foundation Light Status:** Core (internal only — never employer-visible at individual level)
**Purpose:** Stores the Personal Impact Balance (PIB) for each anonymized worker per company program and reporting period. PIB is the mandatory intermediate aggregation between individual Impact Units and company-level intelligence. The KORA Index cannot be calculated without passing through individual PIBs first — this is Algorithm Governance Note AG-01 from doc 10.

PIB formula: `PIB_w = PIB_LIFE + PIB_GROWTH + PIB_CONNECTION + PIB_IMPACT + PIB_LEGACY`
where each pillar value is the sum of all IU for that worker on that pillar in the period.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key |
| `anonymized_worker_profile_id` | UUID | NOT NULL | FK → analytics.worker_profiles. The pseudonymized worker this PIB belongs to. Never a real identity. |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `company_program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `reporting_period_start` | DATE | NOT NULL | Start of the reporting period this PIB covers |
| `reporting_period_end` | DATE | NOT NULL | End of the reporting period |
| `life_iu` | DECIMAL(12,6) | NOT NULL | Sum of all IU credited to the LIFE pillar for this worker in this period. Default: 0.00 |
| `growth_iu` | DECIMAL(12,6) | NOT NULL | Sum of all IU credited to the GROWTH pillar. Default: 0.00 |
| `connection_iu` | DECIMAL(12,6) | NOT NULL | Sum of all IU credited to the CONNECTION pillar. Default: 0.00 |
| `impact_iu` | DECIMAL(12,6) | NOT NULL | Sum of all IU credited to the IMPACT pillar. Default: 0.00 |
| `legacy_iu` | DECIMAL(12,6) | NOT NULL | Sum of all IU credited to the LEGACY pillar. Default: 0.00 |
| `total_pib` | DECIMAL(12,6) | NOT NULL | Sum of all five pillar values. Computed field: `life_iu + growth_iu + connection_iu + impact_iu + legacy_iu` |
| `activation_status` | BOOLEAN | NOT NULL | Default: FALSE. TRUE if `total_pib` exceeds the minimum activation threshold defined in the current methodology version. |
| `meaningful_activation_status` | BOOLEAN | NOT NULL | Default: FALSE. TRUE if `total_pib` exceeds the meaningful activation threshold (a higher bar than activation threshold). Used for MAR calculation in the Activation Safeguard. |
| `activated_pillar_count` | INTEGER | NOT NULL | Count of pillars where this worker's IU exceeds zero. Used for Pillar Coverage (PC) component of KORA Index. |
| `continuity_detected` | BOOLEAN | NOT NULL | Default: FALSE. TRUE if recurring engagement was detected for this worker in this period. Used for Continuity (CO) component. |
| `recurrence_event_count` | INTEGER | NOT NULL | Count of distinct event records contributing to this PIB. |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. NOT NULL on every scoring output. |
| `activation_threshold_applied` | DECIMAL(12,6) | NOT NULL | The specific activation threshold value from the methodology version used to determine `activation_status`. Stored for audit reproducibility. |
| `meaningful_threshold_applied` | DECIMAL(12,6) | NOT NULL | The specific meaningful activation threshold value applied. Stored for audit reproducibility. |
| `confidence_score_id` | UUID | nullable | FK → analytics.confidence_scores. Worker-level confidence record if calculated. |
| `is_current` | BOOLEAN | NOT NULL | Default: TRUE. Set to FALSE if this PIB record is superseded by a recalculation within the same period (e.g., after an ingestion batch error is corrected). |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |
| `calculated_at` | TIMESTAMPTZ | NOT NULL | When the PIB calculation was performed |

**Access Rules:**
- Write: KORA analytics engine only (automated)
- Read: KORA analytics engine (for company aggregation and KORA Index computation), KORA Analyst (for review and quality control), KORA Admin
- Prohibited: All employer roles without exception. Company Admin, HR, Finance, ESG, and Viewer roles must never access individual PIB rows. This constraint must be enforced at the database access control level — pre-built views used by employer-facing roles must never include worker-level PIB data. PIB is not an employee performance score.

**Key Constraints:**
- `anonymized_worker_profile_id` + `company_program_id` + `reporting_period_start` + `is_current = TRUE` should have at most one current record per worker per program per period
- `total_pib` must equal the sum of the five pillar values. Enforced by application logic; verifiable in review.
- `methodology_version_id` is NOT NULL without exception

**Notes:**
- The old WhitePaper v3 PIB formula (which included Breadth Bonus and Concentration Penalty factors) must not be used. The canonical formula is a simple sum of pillar IU values (doc 09 Section 12, founder Decision 3).
- Production worker-facing PIB display for real pilot-company employees is out of scope for Foundation Light. However, Worker PIB Light is included in Foundation Light v0.1 as a demo/semi-functional module using synthetic or pseudonymized demo data computed through the real PIB engine. No real pilot-company worker receives a production individual account in Foundation Light. The employer-role privacy restrictions on this table (grant absence for all employer roles) are unchanged and apply equally in all Foundation Light contexts including demo and synthetic modes.

---

**Table:** `analytics.company_impact_aggregates`
**Store:** Analytics
**KORA Layer:** IMPACT (Stage ⑫ — Company Aggregation)
**Foundation Light Status:** Core
**Purpose:** Stores the privacy-safe company-level aggregation of all PIB records for a company program and reporting period. This is the statistical foundation from which the KORA Index Engine (Stage ⑭) draws its inputs, after passing through the Activation Safeguard (Stage ⑬). Employer roles may access selected aggregate fields from this table through pre-built views — never individual PIB rows.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `company_program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `reporting_period_start` | DATE | NOT NULL | Start of the reporting period |
| `reporting_period_end` | DATE | NOT NULL | End of the reporting period |
| `eligible_worker_count` | INTEGER | NOT NULL | Total number of workers in scope for this program and period. Denominator for AR and MAR. |
| `active_worker_count` | INTEGER | NOT NULL | Workers with `activation_status = TRUE`. Numerator for AR calculation. |
| `meaningful_active_worker_count` | INTEGER | NOT NULL | Workers with `meaningful_activation_status = TRUE`. Numerator for MAR calculation. |
| `total_iu` | DECIMAL(14,6) | NOT NULL | Sum of `total_pib` across all workers in scope. Company Total IU. Note: Company Total IU is not the KORA Index. |
| `average_pib` | DECIMAL(12,6) | NOT NULL | Mean `total_pib` across all workers (including those with zero PIB). |
| `median_pib` | DECIMAL(12,6) | NOT NULL | Median `total_pib`. More robust than average for skewed distributions. |
| `min_pib` | DECIMAL(12,6) | NOT NULL | Minimum `total_pib` across all workers (typically 0.00). |
| `max_pib` | DECIMAL(12,6) | NOT NULL | Maximum `total_pib` across all workers. |
| `standard_deviation_pib` | DECIMAL(12,6) | nullable | Standard deviation of `total_pib` distribution. Null if fewer than 3 workers in scope. |
| `gini_coefficient` | DECIMAL(5,4) | nullable | Gini coefficient of PIB distribution (0.00 = perfect equality, 1.00 = maximum concentration). Input to Worker Balance (WB) and Equity (EQ) components. Null if below threshold for meaningful calculation. |
| `life_total_iu` | DECIMAL(14,6) | NOT NULL | Sum of `life_iu` across all workers. |
| `growth_total_iu` | DECIMAL(14,6) | NOT NULL | Sum of `growth_iu` across all workers. |
| `connection_total_iu` | DECIMAL(14,6) | NOT NULL | Sum of `connection_iu` across all workers. |
| `impact_total_iu` | DECIMAL(14,6) | NOT NULL | Sum of `impact_iu` across all workers. |
| `legacy_total_iu` | DECIMAL(14,6) | NOT NULL | Sum of `legacy_iu` across all workers. |
| `pillar_distribution_json` | JSONB | NOT NULL | JSON breakdown of IU share by pillar: `{"LIFE": 0.32, "GROWTH": 0.28, ...}`. Used for Pillar Balance (PB) and Pillar Coverage (PC) components. |
| `source_distribution_json` | JSONB | nullable | JSON breakdown of IU by source type: `{"kcp": 0.15, "external_partner": 0.45, "internal": 0.40}`. |
| `verification_distribution_json` | JSONB | NOT NULL | JSON breakdown of IU by verification level: `{"self_declared": 0.25, "partially_verified": 0.35, "verified": 0.30, "certified": 0.10}`. Used for Verification Rate (VR) component. |
| `continuity_worker_count` | INTEGER | NOT NULL | Count of workers with `continuity_detected = TRUE`. Used for Continuity (CO) component. |
| `pillar_coverage_distribution_json` | JSONB | nullable | JSON showing count of workers with IU > 0 per pillar. Used for Pillar Coverage (PC) calculation. |
| `privacy_threshold_met` | BOOLEAN | NOT NULL | TRUE if all outputs in this aggregate comply with the company's `safe_aggregation_threshold`. If FALSE, this aggregate must not be surfaced to employer roles until reviewed. |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. NOT NULL on every scoring output. |
| `confidence_score_id` | UUID | nullable | FK → analytics.confidence_scores. Aggregate-level confidence record. |
| `ingestion_batch_ids` | UUID[] | NOT NULL | Array of `gov.ingestion_batches.batch_id` values that contributed the underlying IU data. |
| `scoring_run_id` | UUID | NOT NULL | FK → gov.scoring_runs. The scoring run that produced this aggregate. |
| `is_current` | BOOLEAN | NOT NULL | Default: TRUE. Set to FALSE when superseded by a recalculation. |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |
| `calculated_at` | TIMESTAMPTZ | NOT NULL | When the aggregation was performed |

**Access Rules:**
- Write: KORA analytics engine only
- Read (selected aggregate fields via pre-built views): Company HR, Company Admin, Company ESG — only fields that are privacy-safe and above threshold
- Read (full table): KORA Analyst, KORA Admin
- Prohibited: Employer roles must never query this table directly. Only pre-built views that enforce privacy filtering are accessible.

**Key Constraints:**
- `total_iu` is an aggregated volume metric. It is not the KORA Index and must not be presented as equivalent to it.
- `privacy_threshold_met = FALSE` means this aggregate must not be returned to employer-facing queries until reviewed.
- `methodology_version_id` is NOT NULL.

---

## 13A. Scoring Run Tables [Gate 2 addition]

Every KORA Index output must be traceable to a discrete, recorded scoring execution. `gov.scoring_runs` represents that execution record. It is the audit anchor linking approved UEF data → PIB calculation → Company Aggregation → Activation Safeguard → KORA Index → Confidence → Explainability as a single traceable pipeline run.

---

**Table:** `gov.scoring_runs`
**Store:** Governance
**KORA Layer:** EVIDENCE (pipeline lineage)
**Foundation Light Status:** Core
**Purpose:** Records each scoring pipeline execution for a company program and reporting period. Enables full traceability: every KORA Index, Confidence Score, Activation Safeguard result, and Company Impact Aggregate must reference a `scoring_run_id`. Re-runs create new records — prior records are never overwritten. A superseded run is marked `run_status = 'superseded'`.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `scoring_run_id` | UUID | NOT NULL | Primary key |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `company_program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `reporting_period_start` | DATE | NOT NULL | Reporting period covered by this run |
| `reporting_period_end` | DATE | NOT NULL | End of reporting period |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. The version under which this run executed. NOT NULL. |
| `calibration_status` | TEXT | NOT NULL | Default: `pre_empirical_calibration`. NOT NULL. Carried from the methodology version. |
| `source_ingestion_batch_ids` | UUID[] | NOT NULL | Array of approved `gov.ingestion_batches.batch_id` values whose data was included in this run. |
| `approved_uef_count` | INTEGER | NOT NULL | Count of UEF records with `review_decision = 'approved'` AND `eligible_for_scoring = TRUE` at run time. Only these records enter IU generation. |
| `rejected_uef_count` | INTEGER | NOT NULL | Count of UEF records with `review_decision = 'rejected'` or `'excluded'` at run time. |
| `flagged_uef_count` | INTEGER | NOT NULL | Count of UEF records with `review_decision = 'flagged_pending_review'` or `'needs_review'` at run time. |
| `run_status` | ENUM | NOT NULL | `queued` / `running` / `completed` / `failed` / `superseded` |
| `triggered_by_user_id` | UUID | NOT NULL | FK → gov.users. Who initiated this scoring run. |
| `triggered_at` | TIMESTAMPTZ | NOT NULL | When the run was initiated |
| `completed_at` | TIMESTAMPTZ | nullable | When the run completed (null if not yet complete or failed) |
| `supersedes_scoring_run_id` | UUID | nullable | FK → gov.scoring_runs. If this run replaces a prior run, reference to the superseded record. |
| `notes` | TEXT | nullable | Optional notes on why this run was initiated (e.g., corrected batch, methodology update) |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation timestamp |

**Relationships (FK references from other tables to scoring_run_id):**
- `analytics.kora_indices.scoring_run_id` NOT NULL FK → `gov.scoring_runs`
- `analytics.activation_safeguard_results.scoring_run_id` NOT NULL FK → `gov.scoring_runs`
- `analytics.confidence_scores.scoring_run_id` NOT NULL FK → `gov.scoring_runs` (for kora_index entity_type records)
- `analytics.company_impact_aggregates.scoring_run_id` NOT NULL FK → `gov.scoring_runs`
- `analytics.kora_index_explanations.scoring_run_id` NOT NULL FK → `gov.scoring_runs`

**Access Rules:**
- Write: KORA analytics engine (automated on run initiation and completion)
- Read: KORA Admin, KORA Analyst, Company Admin (own company — limited fields: run_status, triggered_at, completed_at, methodology_version_id)
- Prohibited: Individual-level analytical data does not appear in this table. Employer roles see only the run metadata.

**Key Constraints:**
- `methodology_version_id` is NOT NULL. A scoring run without a methodology version reference is invalid.
- `calibration_status` is NOT NULL. Must be populated from the referenced methodology version at run creation.
- Re-runs must create new records. A `run_status = 'superseded'` record must not have its data fields modified.
- `run_status` transitions are not strictly one-directional (a failed run may be retried and succeed), but a `superseded` run is terminal.

**Notes:**
- The score run lineage was identified as a HIGH-severity schema gap in doc 27 (OQ-02). This table resolves that gap.
- At Foundation Light v0.1 with synthetic data, scoring runs are simulated by the ScoringSimulatorService and do not require this table to be persisted. The table is required before SQL generation and production deployment.

---

## 14. Activation Safeguard Tables

The Activation Safeguard is Stage ⑬ of the 14-stage algorithm — mandatory between Company Aggregation and the KORA Index Engine. It cannot be disabled, made optional, or bypassed under any circumstances. A KORA Index record without a valid Activation Safeguard result is invalid by definition.

---

**Table:** `analytics.activation_safeguard_results`
**Store:** Analytics
**KORA Layer:** IMPACT (Stage ⑬ — mandatory architectural layer)
**Foundation Light Status:** Core (mandatory — cannot be marked Future or Not Applicable)
**Purpose:** Stores the Activation Safeguard evaluation result for each company program and reporting period. The Safeguard ensures that high impact quality among a small active group cannot fully compensate for low distributed activation across the workforce. Its design directly responds to StressTest Scenario B (doc 10 Section 30), which demonstrated that without this layer, a company with 20% AR and very high PIBs among active workers could achieve a near-baseline KORA Index. The Safeguard applies a ceiling and/or penalty when AR or MAR fall below defined thresholds.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `company_program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `company_impact_aggregate_id` | UUID | NOT NULL | FK → analytics.company_impact_aggregates. The aggregate this Safeguard evaluation is based on. |
| `reporting_period_start` | DATE | NOT NULL | Start of the reporting period |
| `reporting_period_end` | DATE | NOT NULL | End of the reporting period |
| `activation_rate` | DECIMAL(5,4) | NOT NULL | AR = `active_worker_count` / `eligible_worker_count`. Proportion of eligible workers who reached minimum activation threshold. |
| `meaningful_activation_rate` | DECIMAL(5,4) | NOT NULL | MAR = `meaningful_active_worker_count` / `eligible_worker_count`. Proportion reaching the meaningful (higher) activation threshold. |
| `ar_threshold_applied` | DECIMAL(5,4) | NOT NULL | The minimum AR threshold from the current methodology version. Below this value, penalty is triggered. Labeled pre-calibration. |
| `mar_threshold_applied` | DECIMAL(5,4) | NOT NULL | The minimum MAR threshold applied. Labeled pre-calibration. |
| `low_activation_penalty_applied` | BOOLEAN | NOT NULL | Default: FALSE. TRUE if AR or MAR fell below the applicable threshold and a penalty was applied. |
| `ceiling_rule_applied` | BOOLEAN | NOT NULL | Default: FALSE. TRUE if the ceiling rule was triggered, capping the maximum achievable KORA Index regardless of quality metrics. |
| `ceiling_value` | DECIMAL(5,2) | nullable | Maximum achievable KORA Index score if `ceiling_rule_applied = TRUE`. NULL if no ceiling was triggered. |
| `penalty_value` | DECIMAL(5,4) | NOT NULL | Default: 0.0000. The penalty factor applied to reduce the KORA Index when low activation is detected. 0.0 if no penalty. |
| `safeguard_status` | ENUM | NOT NULL | `passed` / `penalty_applied` / `ceiling_applied` / `penalty_and_ceiling_applied` |
| `safeguard_explanation` | TEXT | NOT NULL | Plain-language explanation of the Activation Safeguard result. Required. Explains what was detected and what adjustment was made, or confirms that no adjustment was needed. |
| `threshold_version` | TEXT | NOT NULL | Identifier of the threshold parameter set applied. All current thresholds are pre-calibration. |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. NOT NULL. |
| `confidence_score_id` | UUID | nullable | FK → analytics.confidence_scores. |
| `is_current` | BOOLEAN | NOT NULL | Default: TRUE. |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |
| `calculated_at` | TIMESTAMPTZ | NOT NULL | When the Activation Safeguard evaluation was performed |

**Access Rules:**
- Write: KORA analytics engine only
- Read: KORA Analyst, KORA Admin, Company HR (safeguard_status and safeguard_explanation fields only — via pre-built view)
- Prohibited: Direct table access by employer roles

**Key Constraints:**
- Every `analytics.kora_indices` record must have a NOT NULL FK → `analytics.activation_safeguard_results`. A KORA Index cannot be stored without a valid Safeguard result.
- `ar_threshold_applied` and `mar_threshold_applied` are stored at calculation time so historical records remain reproducible under the thresholds that were in effect.
- All threshold values carry `threshold_version` labeled as pre-calibration until empirical calibration is complete (doc 10 AG-04).

---

## 15. KORA Index and Component Tables

These tables implement Stage ⑭ of the 14-stage algorithm — the KORA Index Engine output. The KORA Index is the primary company-level intelligence output. It is pre-computed (doc 08 Decision 7) and stored. Historical records are never recalculated when a new methodology version is published (doc 08 Decision 5).

---

**Table:** `analytics.kora_indices`
**Store:** Analytics
**KORA Layer:** IMPACT (Stage ⑭ output)
**Foundation Light Status:** Core
**Purpose:** Stores one pre-computed KORA Index record per company program per reporting period per calculation run. The KORA Index is the primary intelligence output of the KORA platform — a calculated score (0–100) measuring the maturity and quality of the company's human impact program. It is inseparable from its Confidence Score. Every KORA Index record must carry: the activation safeguard result, the methodology version, the component scores, and an explanation summary. No financial, fiscal, partner-count, or eligibility field directly contributes to the KORA Index value.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `company_program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `reporting_period_start` | DATE | NOT NULL | Start of the reporting period |
| `reporting_period_end` | DATE | NOT NULL | End of the reporting period |
| `company_impact_aggregate_id` | UUID | NOT NULL | FK → analytics.company_impact_aggregates. The aggregate from which this KORA Index was computed. |
| `activation_safeguard_result_id` | UUID | NOT NULL | FK → analytics.activation_safeguard_results. Mandatory. A KORA Index record without a valid Activation Safeguard result must not be stored. |
| `kora_index_value` | DECIMAL(5,2) | NOT NULL | The computed KORA Index score. Range: 0.00–100.00. This is the final output after all 10 components, weights, and the Activation Safeguard adjustment have been applied. |
| `confidence_score_id` | UUID | NOT NULL | FK → analytics.confidence_scores. The KORA Index and its Confidence Score are inseparable. A KORA Index record without a confidence score is incomplete. |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. NOT NULL. Historical records remain locked to this version permanently. |
| `component_set_version` | TEXT | NOT NULL | Identifies the KORA Index component set applied (e.g., `kora-index-v3-10components`). Distinguishes Architecture v3 10-component structure from any historical variant. |
| `weight_version` | TEXT | NOT NULL | FK reference to `gov.kora_index_weight_versions` version label applied. All current weights carry `calibration_status = 'pre_empirical_calibration'`. |
| `calculation_status` | ENUM | NOT NULL | `auto_calculated` / `under_review` / `finalized` / `certified` |
| `publication_status` | ENUM | NOT NULL | `provisional` / `final` / `certified` |
| `explanation_summary` | TEXT | NOT NULL | Plain-language breakdown of score drivers. Required on every KORA Index record. Black-box outputs are not permitted (doc 10 AG-02). |
| `data_limitations` | TEXT | nullable | Description of data gaps that affect the interpretation of this score. |
| `data_quality_warnings` | TEXT[] | nullable | Array of warning codes flagging specific data quality issues that affect this score. |
| `change_vs_prior_period` | DECIMAL(5,2) | nullable | Delta against the prior period KORA Index for the same company program. Null for the first period. |
| `prior_period_kora_index_id` | UUID | nullable | FK → analytics.kora_indices. Reference to the prior period record used to calculate the delta. |
| `ingestion_batch_ids` | UUID[] | NOT NULL | Array of approved `gov.ingestion_batches.batch_id` values whose data underlies this KORA Index calculation. |
| `scoring_run_id` | UUID | NOT NULL | FK → gov.scoring_runs. The scoring run that produced this KORA Index. |
| `is_current` | BOOLEAN | NOT NULL | Default: TRUE. Only one record per company_program_id + reporting_period should be `is_current = TRUE`. |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |
| `calculated_at` | TIMESTAMPTZ | NOT NULL | When the KORA Index Engine performed the calculation |
| `finalized_at` | TIMESTAMPTZ | nullable | When the record reached `publication_status = 'final'` or `'certified'` |

**Access Rules:**
- Write: KORA analytics engine (automated). KORA Analyst can update `publication_status` and add `data_limitations`.
- Read: Company HR, Company Admin, Company ESG, Company Viewer (selected fields via pre-built view: `kora_index_value`, `confidence_score`, `explanation_summary`, `data_limitations`, `publication_status`), KORA Analyst and Admin (full read)
- The `kora_index_value` and `explanation_summary` are employer-visible. Individual component scores are employer-visible as part of the explainability commitment. Individual PIB records and raw IU values are not.

**Key Constraints:**
- `activation_safeguard_result_id` is NOT NULL. The application must block any attempt to create a KORA Index record without a valid Safeguard result.
- `confidence_score_id` is NOT NULL. The KORA Index and Confidence Score are produced together and stored together.
- Historical records are never updated when a new methodology version is published. `methodology_version_id` on a finalized record is immutable.
- `kora_index_value` must be between 0.00 and 100.00. Enforced by CHECK constraint.

**Notes:**
- The KORA Index is not Company Total IU, not average PIB, not a function of budget spent, and not a function of partners available. Any schema path connecting financial or partner-count fields to `kora_index_value` must be treated as an error.
- Verification: at schema review time, confirm that no foreign key path exists from `gov.financial_budgets`, `gov.financial_movements`, `gov.partners`, or `gov.fiscal_perimeters` to `kora_index_value` except through the display-only financial governance snapshot tables.

---

**Table:** `analytics.kora_index_components`
**Store:** Analytics
**KORA Layer:** IMPACT (KORA Index component detail)
**Foundation Light Status:** Core
**Purpose:** Stores one row per KORA Index component for each KORA Index calculation. Ten rows per KORA Index record (one per Architecture v3 component). Provides the full explainability record for every KORA Index output — each component's raw value, normalized score, weight applied, and weighted contribution are individually auditable.

Architecture v3 component codes: `AR`, `MAR`, `NI`, `WB`, `PC`, `PB`, `EQ`, `VR`, `CO`, `CS`

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key |
| `kora_index_id` | UUID | NOT NULL | FK → analytics.kora_indices. The KORA Index record this component belongs to. |
| `component_code` | ENUM | NOT NULL | `AR` (Activation Rate) / `MAR` (Meaningful Activation Rate) / `NI` (Normalized Intensity) / `WB` (Worker Balance) / `PC` (Pillar Coverage) / `PB` (Pillar Balance) / `EQ` (Equity) / `VR` (Verification Rate) / `CO` (Continuity) / `CS` (Confidence Score) |
| `component_name` | TEXT | NOT NULL | Full name of the component (e.g., "Activation Rate", "Meaningful Activation Rate") |
| `raw_value` | DECIMAL(10,6) | NOT NULL | The raw measured value for this component before normalization (e.g., AR = 0.72 means 72% of workers activated) |
| `normalized_score` | DECIMAL(5,4) | NOT NULL | The normalized component score on a 0.0–1.0 scale, after applying the component scoring function |
| `weight` | DECIMAL(5,4) | NOT NULL | The weight applied to this component in the KORA Index formula for this calculation |
| `weighted_contribution` | DECIMAL(7,4) | NOT NULL | `normalized_score × weight`. The component's contribution to the final KORA Index value. |
| `calibration_status` | TEXT | NOT NULL | Default: `pre_empirical_calibration`. Must remain this value until the Delphi Study and empirical calibration are complete (doc 10 AG-03, MV-02). |
| `calculation_method_reference` | TEXT | nullable | Reference to the specific formula or algorithm used to compute this component's raw value and normalize it |
| `explanation` | TEXT | NOT NULL | Plain-language description of what this component measured and what drove its score |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. NOT NULL. |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |

**Access Rules:**
- Write: KORA analytics engine only
- Read: KORA Analyst, KORA Admin, Company roles (via pre-built view — component scores and explanations are part of the explainability commitment)

**Key Constraints:**
- Exactly 10 rows must exist per `kora_index_id` — one per Architecture v3 component
- The sum of all `weighted_contribution` values for a given `kora_index_id` must equal the `kora_index_value` (within rounding tolerance)
- `calibration_status` is NOT NULL and defaults to `pre_empirical_calibration`

**Notes:**
- The doc 06 7-component prototype weights (AR 20%, NI 20%, PB 15%, EQ 15%, VR 10%, CO 10%, PC 10%) are historical baseline only. They must not be applied as current Architecture v3 weights without explicit methodology version documentation indicating the current weight set.
- CS (Confidence Score) appears both as a `component_code` in this table and as a referenced `confidence_score_id` on the parent `kora_indices` record. These are the same underlying value — CS as an Architecture v3 KORA Index component is the Confidence Score computed for this program and period. There is no contradiction: the Confidence Score is simultaneously a standalone reliability indicator and one of the 10 components of the KORA Index.

---

## 15A. KORA Index Explainability Tables [Gate 2 addition]

Every KORA Index result presented externally must have a persisted, auditable explanation record. The `explanation_summary` field on `analytics.kora_indices` is a brief inline text. `analytics.kora_index_explanations` stores the full structured explainability output including per-component narratives, data quality notes, limitations, and methodology disclosure. This resolves the HIGH-severity schema gap identified in doc 27 (OQ-05).

---

**Table:** `analytics.kora_index_explanations`
**Store:** Analytics
**KORA Layer:** EVIDENCE (explainability output)
**Foundation Light Status:** Core
**Purpose:** Stores the persisted, full-detail explainability record for each KORA Index result. Every KORA Index shown externally must have a linked explanation record. The explanation must not contain individual worker data — it is an aggregate narrative.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `explanation_id` | UUID | NOT NULL | Primary key |
| `kora_index_id` | UUID | NOT NULL | FK → analytics.kora_indices. One explanation per KORA Index record. |
| `scoring_run_id` | UUID | NOT NULL | FK → gov.scoring_runs. |
| `company_id` | UUID | NOT NULL | FK → gov.companies. Scoping field. |
| `summary_text` | TEXT | NOT NULL | Plain-language overall explanation of why the KORA Index is the value shown. Required. No individual worker data. |
| `component_explanations_json` | JSONB | NOT NULL | Structured JSON: one entry per Architecture v3 component (AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS) with `component_code`, `plain_language_explanation`, `data_drivers`, `improvement_lever`. |
| `data_quality_notes_json` | JSONB | nullable | Structured notes on data quality issues that affected the score: missing pillars, low verification rates, small active cohorts, source gaps. |
| `limitations_text` | TEXT | NOT NULL | Required statement of what the score does and does not claim. Must include calibration_status disclosure. |
| `generated_by` | ENUM | NOT NULL | `system` / `kora_analyst` / `kora_admin`. Who generated this explanation. |
| `generated_at` | TIMESTAMPTZ | NOT NULL | When this explanation was generated |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. NOT NULL. Must match the kora_index's methodology_version_id. |
| `calibration_status` | TEXT | NOT NULL | Default: `pre_empirical_calibration`. NOT NULL. Non-suppressible. |

**Access Rules:**
- Write: KORA analytics engine (system); KORA Analyst (supplementary notes)
- Read: Company HR, Company Admin, Company ESG, Company Viewer (explanation content — no individual worker data), KORA Admin, KORA Analyst (full)
- Company Finance: may read explanation as part of KORA Index summary view

**Key Constraints:**
- `kora_index_id` is UNIQUE — one explanation record per KORA Index record.
- `methodology_version_id` and `calibration_status` are NOT NULL.
- `limitations_text` must be populated and non-empty. An explanation without limitations disclosure is invalid.
- `component_explanations_json` must contain one entry per each of the 10 Architecture v3 components. Partial records are invalid.
- No field may contain individual worker names, pseudonym IDs, raw PIB values, or individual UEF data.

**Notes:**
- The Foundation Light demo version produces explanation output through `ScoringSimulatorService.generateExplanation()` from the mock services layer. Production will persist these records. The field structure must match what the demo produces to avoid structural divergence.
- Pre-calibration disclosure in `limitations_text` is mandatory and must appear in every employer-visible explanation surface.

---

**Table:** `gov.kora_index_weight_versions`
**Store:** Governance
**KORA Layer:** EVIDENCE (methodology versioning for KORA Index weights)
**Foundation Light Status:** Core
**Purpose:** Stores versioned sets of KORA Index component weights. Each version records the weights for all 10 Architecture v3 components (AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS). Belongs in the gov schema because it governs methodology parameters, not analytical outputs. When a new weight version is published (after empirical calibration), a new record is created. Historical KORA Index records remain tied to the weight version that produced them. Referenced by `gov.methodology_versions.kora_index_weights_version_id`.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key |
| `version` | TEXT | NOT NULL | Unique version label (e.g., `ki-weights-v0.1`) |
| `status` | ENUM | NOT NULL | `draft` / `active` / `superseded` / `archived` |
| `component_weights_json` | JSONB | NOT NULL | JSON object storing the weight for each component: `{"AR": 0.xx, "MAR": 0.xx, "NI": 0.xx, "WB": 0.xx, "PC": 0.xx, "PB": 0.xx, "EQ": 0.xx, "VR": 0.xx, "CO": 0.xx, "CS": 0.xx}`. Weights must sum to 1.00. |
| `calibration_status` | TEXT | NOT NULL | Default: `pre_empirical_calibration`. Must not be changed without documented empirical validation. |
| `source_reference` | TEXT | NOT NULL | Reference to the source of these weights — e.g., `methodology_team_prior_v0.1` or, in future versions, `delphi_study_2026` |
| `effective_from` | DATE | NOT NULL | When these weights came into effect |
| `effective_to` | DATE | nullable | When these weights were superseded. Null if currently active. |
| `approved_by` | TEXT | NOT NULL | KORA methodology team member or study reference that approved this weight set |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |

**Access Rules:**
- Write: KORA methodology team only
- Read: All authenticated roles (weights are transparent per the explainability commitment)

**Key Constraints:**
- Weights in `component_weights_json` must sum to 1.00 (within rounding tolerance). Enforced by application validation at write time.
- Only one version may be `status = 'active'` at any time.

---

## 16. Confidence Score Tables

---

**Table:** `analytics.confidence_scores`
**Store:** Analytics
**KORA Layer:** EVIDENCE (reliability indicator for all outputs)
**Foundation Light Status:** Core
**Purpose:** Stores confidence score records for all entity types that require a reliability indicator — individual events, data sources, ingestion batches, pillars, KORA Index calculations, fiscal eligibility classifications, and reports. The Confidence Score makes data quality limitations visible rather than hiding them in an opaque score. Two companies with identical KORA Index values but different Confidence Scores are methodologically distinct situations that must be presented differently to leadership.

The Confidence Score formula is not final — it is a pre-calibration model that will be refined through empirical validation. This table is designed to support future calibration without requiring schema changes.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key |
| `entity_type` | ENUM | NOT NULL | `event` / `source` / `ingestion_batch` / `pillar` / `kora_index` / `eligibility_classification` / `report`. Identifies what type of entity this confidence score is for. |
| `entity_id` | UUID | NOT NULL | The ID of the entity this confidence score belongs to (e.g., the `uef_record.id`, `kora_indices.id`, or `reports.id`). |
| `company_id` | UUID | NOT NULL | FK → gov.companies. Scoping field. |
| `score_value` | DECIMAL(5,4) | NOT NULL | The overall confidence score. Range: 0.0000–1.0000. Higher is more reliable. |
| `confidence_level` | ENUM | NOT NULL | `very_low` / `low` / `medium` / `high` / `very_high`. Derived from `score_value` using the threshold bands defined in the current confidence model version. |
| `data_completeness` | DECIMAL(5,4) | nullable | Component: proportion of required fields that are populated in the underlying data. |
| `evidence_quality` | DECIMAL(5,4) | nullable | Component: quality-weighted evidence level across events contributing to this entity. |
| `certified_evidence_ratio` | DECIMAL(5,4) | nullable | Component: proportion of IU backed by certified (highest evidence level) sources. |
| `audit_completeness` | DECIMAL(5,4) | nullable | Component: completeness of the audit trail for this entity and its inputs. |
| `data_freshness` | DECIMAL(5,4) | nullable | Component: how current the underlying data is relative to the reporting period. |
| `source_diversity` | DECIMAL(5,4) | nullable | Component: variety of source types contributing (high diversity reduces single-source risk). |
| `manual_review_rate` | DECIMAL(5,4) | nullable | Component: proportion of events that required manual review (high rates reduce confidence in automation). |
| `rejection_rate` | DECIMAL(5,4) | nullable | Component: proportion of raw rows that were rejected during ingestion (high rejection reduces confidence in data completeness). |
| `privacy_safe_aggregation_reliability` | DECIMAL(5,4) | nullable | Component: whether all employer-visible outputs are safely above aggregation thresholds. Failures reduce confidence. |
| `limiting_factors` | TEXT[] | nullable | Array of the most significant factors constraining this confidence score. Surfaced in employer-visible explanations. |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. NOT NULL. |
| `confidence_model_version` | TEXT | NOT NULL | The specific confidence model version applied (e.g., `cm-v0.1`). This model is pre-calibration. |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |
| `calculated_at` | TIMESTAMPTZ | NOT NULL | When the confidence score was computed |

**Access Rules:**
- Write: KORA analytics engine only
- Read: KORA Analyst, KORA Admin, Company roles (via pre-built views — `score_value`, `confidence_level`, and `limiting_factors` are part of the employer-visible KORA Index output)

**Key Constraints:**
- `score_value` must be between 0.0000 and 1.0000. CHECK constraint required.
- `methodology_version_id` is NOT NULL.
- The Confidence Score for a KORA Index does not hide data quality problems — it makes them explicit. A score that suppresses its own confidence indicator is invalid.

---

## 17. Complementary Indicator Tables

These tables store indicators that are produced alongside the KORA Index but are architecturally separate from it. None of these indicators enter the KORA Index formula. They provide additional dimensions of intelligence that complement the KORA Index without contaminating it.

---

**Table:** `analytics.kora_contributions`
**Store:** Analytics
**KORA Layer:** IMPACT (separate complementary indicator)
**Foundation Light Status:** Basic (populated if IMPACT pillar data with verified externality is available)
**Purpose:** Stores the KORA Contribution indicator — a separate, independently calculated score measuring the social, territorial, and external contribution generated by the organization through verified worker actions. Primarily linked to the IMPACT pillar but distinct from the KORA Index. A company may have a high KORA Index (strong internal activation) with a low KORA Contribution (minimal verified external contribution), or vice versa. Both signals are important and must be displayed separately.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `company_program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `reporting_period_start` | DATE | NOT NULL | Start of the reporting period |
| `reporting_period_end` | DATE | NOT NULL | End of the reporting period |
| `contribution_value` | DECIMAL(5,2) | nullable | Final KORA Contribution score. Range: 0.00–100.00. Null if insufficient verified IMPACT data is available. |
| `worker_coverage` | DECIMAL(5,4) | nullable | Proportion of workers who participated in verified IMPACT initiatives |
| `verified_impact_intensity` | DECIMAL(5,4) | nullable | Average depth of IMPACT engagement among participating workers |
| `externality_verification` | DECIMAL(5,4) | nullable | Proportion of IMPACT actions with verified external beneficiary evidence |
| `partner_quality` | DECIMAL(5,4) | nullable | Quality score of partners delivering IMPACT-category services |
| `territorial_coverage` | DECIMAL(5,4) | nullable | Geographic breadth of verified external contribution |
| `continuity` | DECIMAL(5,4) | nullable | Proportion of IMPACT-engaged workers showing recurring engagement |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. NOT NULL. |
| `confidence_score_id` | UUID | nullable | FK → analytics.confidence_scores. |
| `explanation_summary` | TEXT | nullable | Plain-language breakdown of the Contribution score drivers |
| `is_current` | BOOLEAN | NOT NULL | Default: TRUE |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |

**Access Rules:**
- Write: KORA analytics engine only
- Read: Company HR, Company Admin, Company ESG (via pre-built view), KORA Analyst, KORA Admin

**Key Constraints:**
- `contribution_value` must not appear anywhere in the KORA Index calculation. No FK path from this table to `analytics.kora_indices.kora_index_value`.
- KIP (KORA Impact Pledge) is a future territorial pledge mechanism and does not affect the KORA Index. Any future KIP integration must route through the standard IU pipeline for verified actions; the monetary dimension of a pledge does not generate Contribution score directly.
- `methodology_version_id` is NOT NULL.

---

**Table:** `analytics.kora_ecosystem_reach`
**Store:** Analytics
**KORA Layer:** INPUT + IMPACT bridge (dashboard-only indicator)
**Foundation Light Status:** Basic (populated if partner data is available)
**Purpose:** Stores the Ecosystem Reach indicator — a dashboard-only indicator measuring the quality, coverage, and utilization of the partner and service ecosystem available to the company's workforce. This is explicitly a dashboard-only KPI (doc 10 Section 19). It must not enter the KORA Index formula under any circumstances. Partner availability alone is not impact. Marketplace size must not increase the KORA Index.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `company_program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `reporting_period_start` | DATE | NOT NULL | Start of the reporting period |
| `reporting_period_end` | DATE | NOT NULL | End of the reporting period |
| `ecosystem_reach_value` | DECIMAL(5,2) | nullable | Overall Ecosystem Reach score. Range: 0.00–100.00. Null if insufficient partner data is available. |
| `partner_utilization` | DECIMAL(5,4) | nullable | Proportion of available partners that generated at least one verified IU in the period |
| `certification_ratio` | DECIMAL(5,4) | nullable | Proportion of partner services provided by KORA Certified Partners (KCPs) |
| `territorial_reach` | DECIMAL(5,4) | nullable | Geographic breadth of partner coverage relative to the workforce distribution |
| `utilization_rate` | DECIMAL(5,4) | nullable | Conversion rate: available partner capacity → actual worker engagement |
| `service_diversity` | DECIMAL(5,4) | nullable | Diversity of service types available across all five pillars |
| `concentration_balance` | DECIMAL(5,4) | nullable | Balance of worker engagement across partners (high concentration in one partner reduces balance) |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. NOT NULL. |
| `confidence_score_id` | UUID | nullable | FK → analytics.confidence_scores. |
| `explanation_summary` | TEXT | nullable | Plain-language breakdown |
| `is_current` | BOOLEAN | NOT NULL | Default: TRUE |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |

**Access Rules:**
- Write: KORA analytics engine only
- Read: Company HR, Company Admin (via pre-built view), KORA Analyst, KORA Admin

**Key Constraints:**
- No foreign key path from this table to `analytics.kora_indices.kora_index_value`. This constraint must be verified at schema review time.
- `ecosystem_reach_value` is a diagnostic indicator only. It must not be represented as a component of the KORA Index in any UI, report, or export.

---

**Table:** `analytics.kora_value_chain`
**Store:** Analytics
**KORA Layer:** IMPACT (future complementary indicator)
**Foundation Light Status:** Future — structure defined; not active at Foundation Light
**Purpose:** A future complementary indicator for verified relationship quality and ecosystem maturity — measuring the depth and quality of the company's relationships in the partner and advisor ecosystem, distinct from raw partner count or marketplace breadth. Defined here for architectural completeness so the table can be created at schema initialization without requiring a future migration.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NOT NULL | Primary key |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `company_program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `reporting_period_start` | DATE | NOT NULL | Start of the reporting period |
| `reporting_period_end` | DATE | NOT NULL | End of the reporting period |
| `value_chain_activation` | DECIMAL(5,4) | nullable | Proportion of ecosystem relationships that generated verified activations |
| `network_quality` | DECIMAL(5,4) | nullable | Composite quality score of active ecosystem relationships |
| `verified_relationship_depth` | DECIMAL(5,4) | nullable | Average depth of verified engagement across partners and advisors |
| `territorial_pillar_coverage` | DECIMAL(5,4) | nullable | Coverage of all five pillars across territorial partner relationships |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions |
| `confidence_score_id` | UUID | nullable | FK → analytics.confidence_scores |
| `status` | ENUM | NOT NULL | `not_calculated` (Foundation Light) / `draft` / `active` |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |

**Access Rules:**
- Write: Future — KORA analytics engine when feature is activated
- Read: Future — Company roles and KORA roles when feature is activated
- At Foundation Light: table exists but all records have `status = 'not_calculated'`

**Key Constraints:**
- Not a component of the KORA Index.
- Not active at Foundation Light. The table is created to avoid a future migration.

---

*Sections written in this chunk: 13, 14, 15, 16, 17*
*Next chunk to append: Sections 18 (Financial and Economic Tables) through 22 (Advisor Review Tables)*

---

## Section 18 — Financial and Economic Tables

**Governing source:** `docs/11-economic-fiscal-architecture-integration.md` — all decisions in this section are derived from doc 11. No implementation may proceed without the professional reviews specified in doc 11 Section 17.

**Absolute constraint (unconditional):** FUO funds must NEVER transit KORA's operational account under any circumstance. This is a regulatory, legal and fiduciary constraint. It is not configurable. Tables in this section record references and metadata only — they do not represent fund custody or fund movement through KORA systems.

**Foundation Light default:** SVAM Variant A (intelligence and reporting service only). KORA does not act as administrator, intermediary, or payment service provider at Foundation Light. Tables for Variants B, C, D exist structurally but all records carry `svam_variant = 'A'` until legal/PSD2 validation authorizes activation of other variants.

---

### 18.1 `gov.financial_budgets`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_id` | UUID | nullable | FK → gov.company_programs (null = company-level budget, not program-scoped) |
| `budget_name` | TEXT | NOT NULL | Descriptive label for this budget allocation |
| `fiscal_year` | INTEGER | NOT NULL | Fiscal year this budget applies to |
| `currency` | TEXT | NOT NULL | ISO 4217 currency code (e.g., EUR) |
| `total_allocated` | DECIMAL(15,2) | NOT NULL | Total budget declared by company |
| `welfare_51tuir_allocation` | DECIMAL(15,2) | nullable | Portion allocated to Art. 51 welfare perimeter |
| `fringe_benefit_allocation` | DECIMAL(15,2) | nullable | Portion allocated to fringe benefit perimeter |
| `formazione_allocation` | DECIMAL(15,2) | nullable | Portion allocated to training (formazione) perimeter |
| `hse_allocation` | DECIMAL(15,2) | nullable | Portion allocated to HSE perimeter |
| `csr_esg_allocation` | DECIMAL(15,2) | nullable | Portion allocated to CSR/ESG perimeter |
| `hr_discretionary_allocation` | DECIMAL(15,2) | nullable | Portion allocated to HR discretionary spending |
| `other_allocation` | DECIMAL(15,2) | nullable | Remaining allocation not classified to a specific perimeter |
| `data_source` | ENUM | NOT NULL | `company_declared` / `ingestion_derived` / `advisor_confirmed` |
| `ingestion_batch_id` | UUID | nullable | FK → gov.ingestion_batches (if derived from ingestion) |
| `notes` | TEXT | nullable | Free-text context about this budget record |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL | When this record was last updated |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** INPUT
**Foundation Light Status:** Active (declared budget ingestion only — no payment or fund movement)

**Access Rules:**
- Write: KORA ingestion service and company HR admin roles with budget management permission
- Read: Company admin roles, KORA analyst roles

**Key Constraints:**
- Allocation columns are informational. They do not control fund custody. They support the financial governance dashboard.
- `total_allocated` does not need to equal the sum of category allocations — companies may not classify every euro at ingestion time.
- This table records what the company declared it would spend. `gov.financial_governance_snapshots` records what was actually used.
- KORA is not a custodian of these funds under any circumstance.

---

### 18.2 `gov.financial_movements`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_id` | UUID | nullable | FK → gov.company_programs |
| `budget_id` | UUID | nullable | FK → gov.financial_budgets |
| `movement_type` | ENUM | NOT NULL | `allocation` / `partner_spend` / `internal_transfer` / `adjustment` / `restitution` |
| `fiscal_category` | ENUM | NOT NULL | `welfare_51tuir` / `fringe_benefit` / `formazione` / `hse` / `csr_esg` / `hr_discretionary` / `employee_paid` / `co_funded` / `non_monetary` |
| `pillar_id` | UUID | nullable | FK → gov.pillars (if movement maps to a specific pillar) |
| `partner_id` | UUID | nullable | FK → gov.partners (if movement relates to a partner) |
| `amount` | DECIMAL(15,2) | NOT NULL | Amount of this movement |
| `currency` | TEXT | NOT NULL | ISO 4217 currency code |
| `movement_date` | DATE | NOT NULL | Date the movement occurred |
| `reference_period_start` | DATE | nullable | Start of the period this movement covers |
| `reference_period_end` | DATE | nullable | End of the period this movement covers |
| `data_source` | ENUM | NOT NULL | `company_declared` / `ingestion_derived` / `partner_reported` |
| `ingestion_batch_id` | UUID | nullable | FK → gov.ingestion_batches |
| `uef_record_id` | UUID | nullable | FK → analytics.uef_records (if movement is linked to a specific event) |
| `notes` | TEXT | nullable | Free-text context |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** INPUT
**Foundation Light Status:** Active (declared movement records only — no payment execution)

**Access Rules:**
- Write: KORA ingestion service; company finance admin roles
- Read: Company admin roles with financial governance access; KORA analyst roles

**Key Constraints:**
- This table records movements as declared or ingested from company financial exports. KORA does not execute, authorize, or intermediate any financial movement.
- `amount` is always informational for financial governance analysis. It does not affect the KORA Index.
- Financial data (amounts, partner spend, budget utilization) is NOT an input to the KORA Index formula. It feeds financial governance views only.
- FUO-related movements must never appear as amounts transiting KORA systems. If a record indicates FUO movement, it records the fact that the movement occurred between the company and its provider directly.

---

### 18.3 `gov.financial_governance_snapshots`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `snapshot_date` | DATE | NOT NULL | Date this snapshot was computed |
| `total_budget_allocated` | DECIMAL(15,2) | nullable | Sum of all allocated budget in scope |
| `total_budget_consumed` | DECIMAL(15,2) | nullable | Sum of movements declared as spent |
| `budget_utilization_rate` | DECIMAL(5,4) | nullable | `total_budget_consumed / total_budget_allocated` |
| `cost_per_impact_unit` | DECIMAL(10,4) | nullable | Financial governance indicator: spend per verified IU |
| `cost_per_active_worker` | DECIMAL(10,4) | nullable | Financial governance indicator: spend per active worker |
| `pillar_spend_distribution_json` | JSONB | nullable | Spend breakdown by pillar (informational) |
| `partner_spend_distribution_json` | JSONB | nullable | Spend breakdown by partner (informational) |
| `fiscal_category_spend_json` | JSONB | nullable | Spend breakdown by fiscal category (informational) |
| `total_eligible_budget` | DECIMAL(15,2) | nullable | Declared budget under tax-advantaged perimeters |
| `total_activated_eligible_budget` | DECIMAL(15,2) | nullable | Portion of eligible budget actually used |
| `eligible_utilization_rate` | DECIMAL(5,4) | nullable | Eligible activation rate |
| `source_kora_index_id` | UUID | nullable | FK → analytics.kora_indices (KORA Index computed at same time, if any) |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this snapshot was computed |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** GOVERNANCE
**Foundation Light Status:** Active (pre-computed after each approved ingestion batch)

**Access Rules:**
- Write: KORA analytics engine
- Read: Company admin roles with financial governance access; KORA analyst roles

**Key Constraints:**
- This is the primary financial governance deliverable for Foundation Light.
- `cost_per_impact_unit` is a governance indicator only. It does not enter the KORA Index.
- `source_kora_index_id` links to the corresponding KORA Index for the same period for cross-reference in the dashboard. This is a display link only — financial data never feeds back into the KORA Index calculation.
- All amounts in this table are informational reconstructions from ingested data, not authoritative accounting records.

---

### 18.4 `gov.svam_configurations`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `company_id` | UUID | NOT NULL, UNIQUE | FK → gov.companies (one configuration per company) |
| `svam_variant` | ENUM | NOT NULL | `A` / `B` / `C` / `D` — see doc 11 for variant definitions |
| `variant_activation_date` | DATE | nullable | Date when current variant was activated |
| `variant_authorized_by` | TEXT | nullable | Reference to authorization decision (legal/regulatory) |
| `variant_authorization_notes` | TEXT | nullable | Notes on the basis for variant activation |
| `psd2_authorization_obtained` | BOOLEAN | NOT NULL DEFAULT FALSE | Whether PSD2 authorization has been obtained (required for variants B, C, D) |
| `legal_review_completed` | BOOLEAN | NOT NULL DEFAULT FALSE | Whether required legal review is complete |
| `tax_advisor_review_completed` | BOOLEAN | NOT NULL DEFAULT FALSE | Whether required tax advisor review is complete |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this configuration was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL | When this configuration was last updated |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** GOVERNANCE
**Foundation Light Status:** Active — all records seeded with `svam_variant = 'A'`

**Access Rules:**
- Write: KORA superadmin roles only
- Read: KORA admin roles; read-only for company admin (can see current variant, not authorization detail)

**Key Constraints:**
- `svam_variant` MUST be `'A'` at Foundation Light. Variants B, C, D require explicit legal, tax, and PSD2 authorization before activation. This table exists to record the configuration and its authorization basis.
- Application-level guard: any write setting `svam_variant` to `B`, `C`, or `D` must validate that `psd2_authorization_obtained = TRUE`, `legal_review_completed = TRUE`, and `tax_advisor_review_completed = TRUE`.
- KORA must never enable variant B, C, or D automatically. Variant escalation is a deliberate, human-authorized decision.

---

### 18.5 `gov.fuo_accounts`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `fuo_account_reference` | TEXT | NOT NULL | External reference identifier for the FUO account (held by the company or its PI) |
| `fuo_type` | ENUM | NOT NULL | `company_self_managed` / `pi_administered` / `prime_contractor_managed` |
| `holder_description` | TEXT | nullable | Description of who holds and manages this FUO (company name, PI name, etc.) |
| `applicable_fiscal_perimeters` | TEXT[] | NOT NULL | Which fiscal perimeters this FUO covers |
| `account_status` | ENUM | NOT NULL | `active` / `suspended` / `closed` / `pending_setup` |
| `setup_date` | DATE | nullable | When the FUO was established |
| `notes` | TEXT | nullable | Free-text context |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL | When this record was last updated |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** GOVERNANCE
**Foundation Light Status:** Active (structural reference record — no fund custody)

**Access Rules:**
- Write: KORA admin roles; company admin roles with FUO management permission
- Read: Company admin roles; KORA analyst roles

**Key Constraints:**
- **CRITICAL:** This table records a reference to a FUO that exists in an external system managed by the company or its authorized PI. KORA does not hold, manage, custody, or move FUO funds under any circumstance. `fuo_account_reference` is an opaque identifier pointing to an external account.
- No financial transaction amount is stored in this table. Fund movements, if recorded at all, appear in `gov.financial_movements` as informational records only.
- If `svam_variant = 'A'` (Foundation Light default), KORA's role with respect to this FUO is reporting and intelligence only. No administrative or intermediary function is permitted.

---

### 18.6 KORA Impact Pledge — Deferred Scope

KIP means KORA Impact Pledge, not KORA Impact Points.

KORA Impact Pledge is a future company-level / territorial pledge mechanism. It is not active in Foundation Light v0.1 and must not generate an active SQL table in doc 22.

Foundation Light must not implement:
- KIP points
- KIP wallet
- KIP earned/redeemed/expired logic
- worker-level KIP records
- KIP redemption
- KIP engine
- any reward or gamification semantics

Any future KORA Impact Pledge architecture must be defined in a separate future-tier document and must preserve the following rules:
- KORA does not custody, collect, redistribute, or intermediate pledge funds.
- KIP does not affect the KORA Index.
- Any verified action related to a pledge must route through the standard UEF → IU → PIB → Aggregation pipeline.
- The monetary dimension of a pledge does not generate Impact Units directly.

---

### 18.7 `gov.welfare_statements`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `statement_period_start` | DATE | NOT NULL | Start of the welfare statement period |
| `statement_period_end` | DATE | NOT NULL | End of the welfare statement period |
| `statement_type` | ENUM | NOT NULL | `annual_welfare_plan` / `regulatory_submission` / `internal_summary` |
| `fiscal_perimeter_id` | UUID | nullable | FK → gov.fiscal_perimeters (if statement is perimeter-specific) |
| `total_declared_value` | DECIMAL(15,2) | nullable | Total monetary value declared in this statement |
| `currency` | TEXT | nullable | ISO 4217 |
| `worker_coverage_count` | INTEGER | nullable | Number of workers covered (aggregate only) |
| `statement_document_reference` | TEXT | nullable | External document ID or storage pointer (not blob content) |
| `advisor_review_id` | UUID | nullable | FK → gov.advisor_reviews (if advisor validated this statement) |
| `status` | ENUM | NOT NULL | `draft` / `submitted` / `confirmed` / `filed` / `not_active` |
| `notes` | TEXT | nullable | Context |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL | When this record was last updated |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** GOVERNANCE
**Foundation Light Status:** Structural — table exists; Foundation Light produces informational summaries only, not regulatory filings

**Access Rules:**
- Write: KORA analytics engine and company admin roles with statement management permission
- Read: Company admin roles; advisor roles (scoped to their review); KORA analyst roles

**Key Constraints:**
- Welfare Statements at Foundation Light are informational summaries derived from ingested data. They are not regulatory filings and must not be presented as such.
- `statement_document_reference` is a pointer to an external document. The document itself is not stored in KORA's operational database.
- Any regulatory submission use case requires the legal and tax advisor reviews specified in doc 11 Section 17 before the feature is activated.

---

## Section 19 — Fiscal, Eligibility, and Guardrails Tables

**Governing sources:** `docs/04-fiscal-policy-eligibility-layer.md`, `docs/05-eligibility-confidence.md`, `docs/11-economic-fiscal-architecture-integration.md`.

**Critical separation:** Fiscal eligibility and KORA Impact (IU, PIB, KORA Index) are parallel dimensions. They share the same underlying service data but never merge. A service's eligibility classification does not affect its IU calculation. A service's IU value does not affect its eligibility classification. This separation is enforced at the schema level.

**Nine fiscal categories (canonical from doc 11):**
`welfare_51tuir` / `fringe_benefit` / `formazione` / `hse` / `csr_esg` / `hr_discretionary` / `employee_paid` / `co_funded` / `non_monetary`

---

### 19.1 `gov.fiscal_perimeters`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `perimeter_code` | TEXT | NOT NULL, UNIQUE | Machine-readable identifier (e.g., `IT_WELFARE_51TUIR_2024`) |
| `perimeter_name` | TEXT | NOT NULL | Human-readable name |
| `country_code` | TEXT | NOT NULL | ISO 3166-1 alpha-2 (e.g., `IT`) |
| `fiscal_year` | INTEGER | NOT NULL | Fiscal year this perimeter definition applies to |
| `fiscal_category` | ENUM | NOT NULL | One of the nine canonical fiscal categories |
| `legal_basis` | TEXT | NOT NULL | Primary legal reference (e.g., "Art. 51 TUIR", "Italian Budget Law 2024") |
| `annual_cap_per_worker` | DECIMAL(10,2) | nullable | Maximum annual value per worker (if cap applies) |
| `currency` | TEXT | nullable | Currency for the cap |
| `cap_applies_per` | ENUM | nullable | `worker` / `household` / `none` |
| `requires_collective_agreement` | BOOLEAN | NOT NULL DEFAULT FALSE | Whether a collective labor agreement is required |
| `requires_welfare_plan` | BOOLEAN | NOT NULL DEFAULT FALSE | Whether a formal welfare plan document is required |
| `key_restrictions` | TEXT | nullable | Summary of key restrictions for this perimeter |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Whether this perimeter definition is current and usable |
| `superseded_by_id` | UUID | nullable | FK → gov.fiscal_perimeters (if replaced by a newer definition) |
| `source_document_reference` | TEXT | nullable | Reference to the authoritative legal text |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** ELIGIBILITY
**Foundation Light Status:** Active — Italy taxonomy seeded at deployment

**Access Rules:**
- Write: KORA superadmin roles only (perimeter definitions are KORA-managed, not company-configurable)
- Read: All authenticated roles (reference data)

**Key Constraints:**
- Fiscal perimeter definitions are KORA-managed catalog data. Companies select from available perimeters; they do not define them.
- Italy-first seeding. Architecture supports additional countries without schema change (multi-geography decision from doc 08).
- `is_active = FALSE` on superseded perimeters; they are retained for historical audit.
- This table does not affect the KORA Index. Eligibility layer is strictly parallel to impact layer.

---

### 19.2 `gov.fiscal_category_thresholds`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `fiscal_perimeter_id` | UUID | NOT NULL | FK → gov.fiscal_perimeters |
| `threshold_type` | ENUM | NOT NULL | `annual_monetary_cap` / `worker_coverage_minimum` / `service_category_limit` / `co_payment_maximum` |
| `threshold_value` | DECIMAL(15,4) | NOT NULL | Numeric value of the threshold |
| `threshold_unit` | ENUM | NOT NULL | `EUR` / `percentage` / `count` / `days` |
| `applies_to_fiscal_category` | ENUM | NOT NULL | One of the nine canonical fiscal categories |
| `applies_to_worker_category` | TEXT | nullable | Worker category restriction, if any (e.g., "all", "full-time") |
| `effective_from` | DATE | NOT NULL | When this threshold became effective |
| `effective_until` | DATE | nullable | When this threshold expires (null = indefinite) |
| `legal_basis_note` | TEXT | nullable | Specific legal provision for this threshold |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** ELIGIBILITY
**Foundation Light Status:** Active — Italian thresholds seeded

**Access Rules:**
- Write: KORA superadmin roles only
- Read: All authenticated roles; KORA eligibility engine

**Key Constraints:**
- Thresholds are KORA-managed reference data. Italian Budget Law updates require KORA to update this table and flag affected eligibility classifications as `outdated_requires_review`.
- Changes to this table trigger re-evaluation of affected eligibility profiles.

---

### 19.3 `gov.company_program_perimeters`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `fiscal_perimeter_id` | UUID | NOT NULL | FK → gov.fiscal_perimeters |
| `activation_status` | ENUM | NOT NULL | `active` / `pending_review` / `suspended` / `inactive` |
| `activated_at` | TIMESTAMPTZ | nullable | When this perimeter was activated for this program |
| `activated_by_user_id` | UUID | nullable | FK → gov.users |
| `advisor_review_id` | UUID | nullable | FK → gov.advisor_reviews (if an advisor confirmed the activation) |
| `fuo_account_id` | UUID | nullable | FK → gov.fuo_accounts (FUO account associated with this perimeter activation) |
| `notes` | TEXT | nullable | Company-specific notes on this perimeter election |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL | When this record was last updated |

**UNIQUE constraint:** `(company_id, program_id, fiscal_perimeter_id)`

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** ELIGIBILITY
**Foundation Light Status:** Active

**Access Rules:**
- Write: Company admin roles with perimeter management permission; KORA admin roles
- Read: Company admin roles; KORA analyst roles; advisor roles (scoped to their company)

**Key Constraints:**
- A company may elect multiple perimeters per program. This table records which perimeters are active for each program.
- `advisor_review_id` should be populated before `activation_status = 'active'` for high-confidence perimeter use. This is a governance recommendation, not a hard schema constraint — companies can self-activate with appropriate confidence-level implications.
- `fuo_account_id` links the perimeter activation to the FUO reference record. It does not move funds.

---

### 19.4 `gov.eligibility_profiles`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `partner_service_id` | UUID | NOT NULL | FK → gov.partner_services |
| `fiscal_perimeter_id` | UUID | NOT NULL | FK → gov.fiscal_perimeters |
| `eligibility_status` | ENUM | NOT NULL | `eligible` / `conditional` / `uncertain` / `excluded` |
| `eligibility_confidence` | ENUM | NOT NULL | `advisor_confirmed` / `kora_advisor_confirmed` / `partner_documented` / `partner_declared` / `kora_inferred` / `pending_review` / `outdated_requires_review` / `not_assessed` |
| `current_version_id` | UUID | nullable | FK → gov.eligibility_profile_versions (current active version) |
| `last_reviewed_at` | TIMESTAMPTZ | nullable | When the current classification was last reviewed |
| `review_trigger_condition` | TEXT | nullable | What will trigger a re-review (e.g., "annual", "on fiscal legislation change") |
| `next_review_due` | DATE | nullable | When the next scheduled review is due |
| `is_current` | BOOLEAN | NOT NULL DEFAULT TRUE | Whether this profile is the active classification |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this profile was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL | When this profile was last updated |

**UNIQUE constraint:** `(partner_service_id, fiscal_perimeter_id)` where `is_current = TRUE`

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** ELIGIBILITY
**Foundation Light Status:** Active

**Access Rules:**
- Write: KORA catalog team; partner-submitted updates (via KORA admin review); advisor confirmation updates
- Read: Company admin roles; KORA analyst roles; advisor roles; partner roles (own services only)

**Key Constraints:**
- Every service-perimeter combination has exactly one current profile (`is_current = TRUE`).
- `eligibility_status` and `eligibility_confidence` are independent attributes. Both must always be recorded.
- `eligibility_confidence = 'partner_declared'` is the default when a partner submits a service without supporting documentation.
- `eligibility_confidence = 'outdated_requires_review'` is set automatically when a triggering event occurs (legislation change, review cycle expiry).
- This table does not affect IU calculation or the KORA Index.

---

### 19.5 `gov.eligibility_profile_versions`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `eligibility_profile_id` | UUID | NOT NULL | FK → gov.eligibility_profiles |
| `version_number` | INTEGER | NOT NULL | Sequential version number for this profile |
| `eligibility_status` | ENUM | NOT NULL | `eligible` / `conditional` / `uncertain` / `excluded` |
| `eligibility_confidence` | ENUM | NOT NULL | Full set of confidence levels (see 19.4) |
| `classified_by_type` | ENUM | NOT NULL | `advisor` / `kora_advisor` / `partner` / `kora_system` |
| `classified_by_reference` | TEXT | nullable | External reference to the advisor, partner, or KORA rule version |
| `classification_date` | DATE | NOT NULL | Date the classification was recorded |
| `fiscal_context_reference` | TEXT | NOT NULL | The fiscal/regulatory context this classification is based on (e.g., "Italian Budget Law 2024") |
| `company_policy_version` | TEXT | nullable | Company policy version in effect at time of classification, if applicable |
| `supporting_documentation_reference` | TEXT | nullable | External reference to supporting documentation (not the document itself) |
| `expiry_condition` | TEXT | nullable | What will render this version outdated |
| `is_superseded` | BOOLEAN | NOT NULL DEFAULT FALSE | Whether a newer version has replaced this one |
| `superseded_at` | TIMESTAMPTZ | nullable | When this version was superseded |
| `superseded_by_version_id` | UUID | nullable | FK → gov.eligibility_profile_versions |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this version was recorded |

**UNIQUE constraint:** `(eligibility_profile_id, version_number)`

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** ELIGIBILITY
**Foundation Light Status:** Active

**Access Rules:**
- Write: KORA catalog team; advisor confirmation writes (scoped); KORA system (automatic outdating)
- Read: Company admin roles; advisor roles; KORA analyst roles; audit purposes

**Key Constraints:**
- Prior versions are NEVER deleted or overwritten. The complete version history must be preserved for audit.
- The audit trail must be able to reconstruct exactly which classification applied on any given date.
- When a new version is created, `is_superseded` is set to TRUE on the prior current version and `gov.eligibility_profiles.current_version_id` is updated.
- This table satisfies the versioning requirement of doc 05: every classification carries its source, context, date, and expiry condition.

---

### 19.6 `gov.policy_rules`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_id` | UUID | nullable | FK → gov.company_programs (null = company-wide rule) |
| `rule_type` | ENUM | NOT NULL | `eligibility_confidence_minimum` / `activation_block` / `activation_warning` / `mandatory_review_trigger` |
| `target_entity_type` | ENUM | NOT NULL | `service` / `partner` / `fiscal_perimeter` / `pillar` |
| `rule_condition_json` | JSONB | NOT NULL | Machine-readable rule definition |
| `rule_description` | TEXT | NOT NULL | Human-readable description of the rule |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Whether this rule is currently enforced |
| `activated_at` | TIMESTAMPTZ | nullable | When this rule was activated |
| `activated_by_user_id` | UUID | nullable | FK → gov.users |
| `notes` | TEXT | nullable | Context |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this rule was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL | When this rule was last updated |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** GOVERNANCE
**Foundation Light Status:** Not Applicable — policy rules engine is a Governance tier feature

**Access Rules:**
- Write: Future — Company admin roles with governance permissions; KORA admin roles
- Read: Future — Policy engine; company admin roles

**Key Constraints:**
- Table is created at Foundation Light to avoid a future migration, but no policy rules are enforced until the Governance tier is active.
- `rule_condition_json` stores the logical condition in a versioned, machine-parseable format. The structure of this JSON is defined by the policy engine version.
- Policy rules do not affect the KORA Index. They are activation guardrails in the governance layer.

---

### 19.7 `gov.fiscal_guardrails_rules`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `rule_code` | TEXT | NOT NULL, UNIQUE | Machine-readable identifier |
| `rule_name` | TEXT | NOT NULL | Human-readable name |
| `fiscal_category` | ENUM | NOT NULL | One of the nine canonical fiscal categories this rule applies to |
| `country_code` | TEXT | NOT NULL | ISO 3166-1 alpha-2 |
| `fiscal_year` | INTEGER | nullable | Specific year if rule is year-specific (null = applies to all years) |
| `rule_logic_json` | JSONB | NOT NULL | Machine-readable rule logic |
| `rule_description` | TEXT | NOT NULL | Human-readable rule description |
| `outcome_if_triggered` | ENUM | NOT NULL | `approved` / `approved_with_warning` / `blocked` / `requires_advisor_validation` / `requires_payroll_review` / `outside_welfare_scope` |
| `severity` | ENUM | NOT NULL | `informational` / `warning` / `blocking` |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | Whether this rule is currently enforced |
| `legal_basis` | TEXT | nullable | Legal provision underlying this rule |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this rule was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL | When this rule was last updated |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** ELIGIBILITY
**Foundation Light Status:** Future — Fiscal Guardrails Engine is a Governance tier feature

**Access Rules:**
- Write: KORA superadmin roles only (guardrail rules are KORA-managed)
- Read: Future — Fiscal Guardrails Engine; KORA analyst roles

**Key Constraints:**
- Table created at Foundation Light to avoid future migration. No guardrail evaluation is executed until the feature is activated.
- `outcome_if_triggered` uses the six canonical Fiscal Guardrails Engine outcomes from doc 11.
- Fiscal guardrail outcomes do not affect the KORA Index.

---

### 19.8 `gov.fiscal_guardrails_results`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `uef_record_id` | UUID | nullable | FK → analytics.uef_records (if result is event-specific) |
| `partner_service_id` | UUID | nullable | FK → gov.partner_services (if result is service-specific) |
| `fiscal_perimeter_id` | UUID | NOT NULL | FK → gov.fiscal_perimeters |
| `guardrail_rule_id` | UUID | NOT NULL | FK → gov.fiscal_guardrails_rules |
| `evaluation_date` | TIMESTAMPTZ | NOT NULL | When this evaluation was performed |
| `outcome` | ENUM | NOT NULL | `approved` / `approved_with_warning` / `blocked` / `requires_advisor_validation` / `requires_payroll_review` / `outside_welfare_scope` |
| `outcome_explanation` | TEXT | NOT NULL | Human-readable explanation of the outcome |
| `worker_pseudonym_id` | TEXT | nullable | Pseudonymized worker reference if result is worker-specific (never identifiable) |
| `resolution_status` | ENUM | NOT NULL | `open` / `resolved` / `escalated` / `waived` / `not_active` |
| `resolved_at` | TIMESTAMPTZ | nullable | When this result was resolved |
| `resolved_by_reference` | TEXT | nullable | Reference to who or what resolved the result |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this result was recorded |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** ELIGIBILITY
**Foundation Light Status:** Future

**Access Rules:**
- Write: Future — Fiscal Guardrails Engine
- Read: Future — Company admin roles with guardrails access; KORA analyst roles

**Key Constraints:**
- Table created at Foundation Light to avoid future migration. All records at Foundation Light have `resolution_status = 'not_active'`.
- `worker_pseudonym_id`, if present, is pseudonymized and must never be reversed or exposed to employer roles.
- Guardrail results are audit records. They are not deleted when resolved — they are updated with resolution status.
- Guardrail outcomes do not affect the KORA Index.

---

## Section 20 — Partner and Service Tables

**Governing source:** Partner catalog and eligibility design from docs 04, 05, 07, 08 (Decision 10).

**Founder Decision 10 (doc 08):** Partner Eligibility Profile Ownership — KORA manages the catalog. Schema is designed for multi-party contributions (partner-declared, KORA-curated, advisor-confirmed) with confidence-level precedence from day one.

---

### 20.1 `gov.partners`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `partner_code` | TEXT | NOT NULL, UNIQUE | Machine-readable partner identifier |
| `legal_name` | TEXT | NOT NULL | Legal name of the partner entity |
| `display_name` | TEXT | NOT NULL | Name shown in the platform |
| `country_code` | TEXT | NOT NULL | Primary country of operation (ISO 3166-1 alpha-2) |
| `operating_countries` | TEXT[] | NOT NULL | All countries where partner operates |
| `partner_category` | TEXT | NOT NULL | High-level category (e.g., welfare provider, training provider, health provider) |
| `primary_pillar_id` | UUID | nullable | FK → gov.pillars (primary KORA pillar) |
| `secondary_pillar_ids` | UUID[] | nullable | FK references → gov.pillars |
| `onboarding_status` | ENUM | NOT NULL | `pending` / `active` / `suspended` / `offboarded` |
| `onboarded_at` | DATE | nullable | Date partner was accepted to catalog |
| `has_signed_data_agreement` | BOOLEAN | NOT NULL DEFAULT FALSE | Whether partner has signed data processing agreement |
| `catalog_visibility` | ENUM | NOT NULL | `public_catalog` / `company_restricted` / `kora_internal` |
| `quality_score` | DECIMAL(5,4) | nullable | KORA-computed partner quality indicator (future; null at Foundation Light) |
| `notes` | TEXT | nullable | Internal notes |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this partner was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL | When this record was last updated |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** INPUT
**Foundation Light Status:** Active

**Access Rules:**
- Write: KORA catalog admin roles
- Read: All authenticated company roles (catalog display); KORA analyst roles

**Key Constraints:**
- Partner records are KORA-managed. Partners may submit catalog entries but KORA controls acceptance and publication.
- `onboarding_status = 'active'` and `has_signed_data_agreement = TRUE` are prerequisites for a partner's services to appear in the active catalog.
- `quality_score` is a future computed field. Null at Foundation Light.
- Partner catalog data does not affect the KORA Index.

---

### 20.2 `gov.partner_services`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `partner_id` | UUID | NOT NULL | FK → gov.partners |
| `service_code` | TEXT | NOT NULL, UNIQUE | Machine-readable service identifier |
| `service_name` | TEXT | NOT NULL | Human-readable service name |
| `service_description` | TEXT | nullable | Detailed description |
| `primary_pillar_id` | UUID | NOT NULL | FK → gov.pillars (primary KORA pillar classification) |
| `secondary_pillar_ids` | UUID[] | nullable | FK references → gov.pillars |
| `pillar_classification_method` | ENUM | NOT NULL | `kora_curated` / `partner_declared` / `ai_suggested_human_confirmed` |
| `service_category_code` | TEXT | NOT NULL | Fine-grained category within pillar (references taxonomy) |
| `delivery_method` | ENUM | NOT NULL | `in_person` / `remote` / `hybrid` / `self_service` / `platform_access` |
| `target_worker_category` | TEXT | nullable | Worker eligibility restriction if any |
| `is_individual_service` | BOOLEAN | NOT NULL DEFAULT TRUE | Whether this is individual or collective/group service |
| `typical_duration` | TEXT | nullable | Typical duration of service (informational) |
| `catalog_status` | ENUM | NOT NULL | `draft` / `active` / `suspended` / `discontinued` |
| `activation_date` | DATE | nullable | When this service was activated in the catalog |
| `fiscal_categories` | ENUM[] | NOT NULL | Applicable fiscal categories (may cover multiple; see canonical list) |
| `impact_confidence_default` | ENUM | NOT NULL | `self_declared` / `evidenced` / `certified` — default impact evidence level for this service type |
| `last_catalog_review` | DATE | nullable | When KORA last reviewed this catalog entry |
| `version` | INTEGER | NOT NULL DEFAULT 1 | Catalog entry version (increments on material change) |
| `notes` | TEXT | nullable | KORA catalog notes |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL | When this record was last updated |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** INPUT
**Foundation Light Status:** Active

**Access Rules:**
- Write: KORA catalog admin roles; partner-submitted entries with KORA review gate
- Read: All authenticated company roles; KORA analyst roles; partner roles (own services)

**Key Constraints:**
- Pillar classification is KORA-managed. `pillar_classification_method = 'partner_declared'` is only valid as an intermediate state pending KORA review.
- `fiscal_categories` is an array because a single service may be eligible under multiple fiscal categories in different contexts. The applicable category for a specific activation is resolved by the eligibility layer, not by this field.
- `impact_confidence_default` is a starting-point for the impact confidence level of actions associated with this service type. Individual UEF records may override it based on the actual evidence attached to that event.
- Service catalog entries are versioned via the `version` integer field. A material change (delivery method change, pillar reclassification) increments the version and flags related eligibility profiles as `outdated_requires_review`.

---

## Section 20A — Collective Initiative Tables [Gate 2 addition]

Collective initiatives are cross-company, partner-led, volunteering, territorial, and social impact programs in which workers participate as individuals but are counted in aggregate for company intelligence. Individual participation links through `personal.worker_participation_requests`. Employer-visible output is aggregate counts only. This resolves the HIGH-severity schema gap identified in doc 27 (OQ-03).

Do not treat collective initiatives as a social events marketplace, a booking engine, or a discovery platform. They are a participation tracking layer aligned with the KORA IMPACT pillar and KORA Contribution computation.

---

**Table:** `gov.collective_initiatives`
**Store:** Governance
**KORA Layer:** ACTIVITY / IMPACT (collective participation tracking)
**Foundation Light Status:** Basic
**Purpose:** Stores collective and group impact initiatives — volunteering programs, community projects, environmental campaigns, mentoring networks, territorial contributions. Individual worker participation is tracked through `personal.worker_participation_requests` (linked via `collective_initiative_id`). Aggregate participation is used for KORA Contribution computation and company-level pillar coverage.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `collective_initiative_id` | UUID | NOT NULL | Primary key |
| `name` | TEXT | NOT NULL | Initiative name |
| `description` | TEXT | nullable | Description of purpose and activities |
| `pillar_primary` | TEXT | NOT NULL | Primary KORA pillar classification. One of: `LIFE` / `GROWTH` / `CONNECTION` / `IMPACT` / `LEGACY` |
| `pillar_secondary` | TEXT | nullable | Secondary pillar where applicable |
| `initiative_type` | ENUM | NOT NULL | `volunteering` / `community` / `territorial` / `cross_company` / `mentoring` / `environmental` / `social_project` |
| `territory` | TEXT | nullable | Geographic territory or area (informational; not a territorial map feature) |
| `partner_id` | UUID | nullable | FK → gov.partners. Partner organization coordinating this initiative, if applicable |
| `owner_company_id` | UUID | nullable | FK → gov.companies. Company that owns/sponsors this initiative, if single-company |
| `status` | ENUM | NOT NULL | `draft` / `proposed` / `active` / `completed` / `verified` / `archived` |
| `verification_level` | ENUM | NOT NULL | `self_declared` / `partner_confirmed` / `advisor_validated` / `third_party_verified` |
| `advisor_review_id` | UUID | nullable | FK → gov.advisor_reviews. If this initiative has been advisor-validated |
| `evidence_ref_id` | UUID | nullable | FK → evidence.evidence_records. Supporting evidence for verification |
| `start_date` | DATE | NOT NULL | Initiative start date |
| `end_date` | DATE | nullable | Initiative end date (null if ongoing) |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification |

**Access Rules:**
- Write: KORA Admin, KORA Analyst (catalog curation)
- Read: Company Admin, Company HR, Company ESG (catalog browsing — initiative name, type, pillar, dates); Partner roles (own initiatives)
- Prohibited: No individual participant list is stored in or accessible from this table. Worker participation links are stored in `personal.worker_participation_requests` (employer-denied).

**Key Constraints:**
- Employer roles accessing `gov.collective_initiatives` see initiative catalog metadata only — no participant identities, no per-worker engagement details.
- `status = 'verified'` requires either `verification_level = 'advisor_validated'` or `'third_party_verified'` with a linked `evidence_ref_id`.

---

**Table:** `gov.collective_initiative_companies`
**Store:** Governance
**KORA Layer:** ACTIVITY (aggregate participation tracking)
**Foundation Light Status:** Basic
**Purpose:** Join table linking collective initiatives to participating companies, storing only aggregate participation counts per company. This enables KORA Contribution computation using aggregate data without exposing individual worker participation to any employer role.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `collective_initiative_company_id` | UUID | NOT NULL | Primary key |
| `collective_initiative_id` | UUID | NOT NULL | FK → gov.collective_initiatives |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `participation_status` | ENUM | NOT NULL | `invited` / `accepted` / `active` / `completed` / `withdrawn` |
| `aggregate_target_participants` | INTEGER | nullable | Target number of worker participants (declared by company) |
| `aggregate_confirmed_participants` | INTEGER | NOT NULL | Default: 0. Count of workers with `worker_participation_requests.status = 'confirmed'` for this initiative and company |
| `aggregate_completed_participants` | INTEGER | NOT NULL | Default: 0. Count of workers with `worker_participation_requests.status = 'completed'` |
| `privacy_threshold_met` | BOOLEAN | NOT NULL | Default: FALSE. TRUE only if `aggregate_confirmed_participants >= gov.companies.safe_aggregation_threshold` for this company. Below-threshold aggregate counts must not be disclosed to employer roles. |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification |

**Access Rules:**
- Write: KORA analytics engine (automated aggregate computation from `personal.worker_participation_requests`)
- Read: Company Admin, Company HR, Company ESG (own company only — `aggregate_confirmed_participants` and `aggregate_completed_participants` if `privacy_threshold_met = TRUE`)
- Cross-company view: KORA Admin, KORA Analyst only

**Key Constraints:**
- Employer roles may only read own `company_id` rows where `privacy_threshold_met = TRUE`.
- `aggregate_confirmed_participants` must be derived from `personal.worker_participation_requests`, never from direct employer input.
- No worker identifiers are stored in this table.

---

## Section 21 — Evidence Store Metadata Tables

**Governing source:** Founder Decision 6 (doc 08) — Evidence Storage.

**Decision 6:** KORA uses external blob storage for all binary evidence files. The Evidence Store (Database B, schema `evidence`) holds metadata records and storage pointers only. No binary data is stored in the relational database.

**Important distinction:** Evidence here refers to impact evidence — documentation that supports the verification of an action (a participation certificate, a completion record, a third-party verification report). This is distinct from eligibility documentation, which is referenced via `gov.eligibility_profile_versions.supporting_documentation_reference`.

---

### 21.1 `evidence.evidence_records`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `entity_type` | ENUM | NOT NULL | `uef_record` / `ingestion_batch` / `pib_record` / `kora_index` / `advisor_review` / `eligibility_profile_version` / `report` |
| `entity_id` | UUID | NOT NULL | ID of the entity this evidence supports |
| `evidence_type` | ENUM | NOT NULL | `participation_certificate` / `completion_record` / `third_party_verification` / `company_declaration` / `advisor_opinion` / `audit_report` / `raw_data_export` / `other` |
| `evidence_label` | TEXT | NOT NULL | Human-readable label for this evidence item |
| `blob_storage_bucket` | TEXT | NOT NULL | Blob storage bucket name |
| `blob_storage_key` | TEXT | NOT NULL | Blob storage object key / path |
| `blob_storage_provider` | TEXT | NOT NULL | Storage provider identifier (e.g., `supabase_storage`, `s3`) |
| `content_hash_sha256` | TEXT | NOT NULL | SHA-256 hash of the binary content (integrity verification) |
| `content_type` | TEXT | NOT NULL | MIME type of the stored document |
| `file_size_bytes` | BIGINT | nullable | File size |
| `upload_date` | TIMESTAMPTZ | NOT NULL | When this evidence was uploaded |
| `uploaded_by_user_id` | UUID | nullable | FK → gov.users (if uploaded by a human user) |
| `uploaded_by_system` | TEXT | nullable | System identifier (if uploaded by an automated process) |
| `evidence_date` | DATE | nullable | Date the underlying evidence document was issued or produced |
| `expiry_date` | DATE | nullable | Date after which the evidence may no longer be valid |
| `source_type` | ENUM | NOT NULL | `company_provided` / `partner_provided` / `third_party_certified` / `kora_generated` |
| `verification_status` | ENUM | NOT NULL | `pending` / `accepted` / `rejected` / `under_review` |
| `reviewed_at` | TIMESTAMPTZ | nullable | When this evidence was reviewed |
| `reviewed_by_user_id` | UUID | nullable | FK → gov.users |
| `review_notes` | TEXT | nullable | Notes from the review |
| `privacy_sensitivity` | ENUM | NOT NULL | `standard` / `sensitive` / `highly_sensitive` |
| `access_restriction` | ENUM | NOT NULL | `company_and_kora` / `kora_only` / `advisor_and_kora` |
| `retention_policy` | TEXT | nullable | Retention policy reference for this evidence category |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this metadata record was created |

**Store:** Evidence Store (Database B, schema `evidence`)
**KORA Layer:** EVIDENCE
**Foundation Light Status:** Active

**Access Rules:**
- Write: KORA ingestion service; company admin roles (for company-provided evidence); partner roles (for partner-provided evidence — scoped to own services); advisor roles (for advisor opinions — scoped to own reviews)
- Read: Varies by `access_restriction` field — enforced at query level; employer roles never see highly sensitive records; `kora_only` records not accessible to company or partner roles
- Binary files are retrieved directly from blob storage using pre-signed URLs — they do not pass through KORA's API response body

**Key Constraints:**
- No binary content is stored in this table. `blob_storage_bucket` + `blob_storage_key` together form the complete storage pointer.
- `content_hash_sha256` enables integrity verification: after retrieval, the hash of the downloaded file must match this field. A mismatch indicates tampering or storage corruption and must trigger an alert.
- `entity_type` + `entity_id` form a polymorphic foreign key. Referential integrity is enforced at the application layer (not as a database-level FK, since the referenced tables are across multiple schemas).
- `privacy_sensitivity = 'highly_sensitive'` applies to health evidence, psychological support records, or any document that could expose a sensitive personal condition. These records follow the most restrictive access rules.
- `access_restriction = 'kora_only'` means only KORA internal roles can access this evidence. No company role — including company admin — sees these records.
- Evidence records are retained after the associated entity is soft-deleted (for audit purposes). `retention_policy` references the governing data retention rule for that evidence category.

---

## Section 22 — Advisor Review Tables

**Governing source:** Founder Decision 8 (doc 08) — Advisor Identity.

**Decision 8:** At Foundation Light, advisors are external parties. KORA does not maintain advisor accounts within the KORA identity system at Foundation Light. Advisor identity is recorded as an external reference (name, firm, contact, engagement reference) on the review record itself. Full advisor account integration is a Foundation or Governance tier feature.

---

### 22.1 `gov.advisor_reviews`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `review_type` | ENUM | NOT NULL | `eligibility_classification` / `fiscal_perimeter_activation` / `welfare_statement` / `methodology_review` / `kora_index_audit` / `certification_review` |
| `reviewed_entity_type` | ENUM | NOT NULL | `eligibility_profile` / `fiscal_perimeter` / `company_program` / `kora_index` / `welfare_statement` / `report` |
| `reviewed_entity_id` | UUID | NOT NULL | ID of the entity being reviewed |
| `advisor_type` | ENUM | NOT NULL | `company_advisor` / `kora_advisor` / `external_auditor` |
| `advisor_name` | TEXT | NOT NULL | Name of the advisor or firm (external reference — no KORA account at Foundation Light) |
| `advisor_firm` | TEXT | nullable | Advisory firm name |
| `advisor_contact_reference` | TEXT | nullable | Contact or engagement reference (not PII beyond name/firm) |
| `advisor_qualification` | TEXT | nullable | Professional qualification or registration reference |
| `review_requested_at` | TIMESTAMPTZ | NOT NULL | When the review was requested |
| `review_requested_by_user_id` | UUID | NOT NULL | FK → gov.users (who submitted the review request) |
| `review_status` | ENUM | NOT NULL | `pending` / `in_progress` / `completed` / `cancelled` |
| `review_started_at` | TIMESTAMPTZ | nullable | When the advisor began the review |
| `review_completed_at` | TIMESTAMPTZ | nullable | When the review was completed |
| `review_outcome` | ENUM | nullable | `confirmed` / `confirmed_with_conditions` / `rejected` / `requires_further_information` / `deferred` |
| `outcome_summary` | TEXT | nullable | Human-readable outcome summary |
| `outcome_conditions` | TEXT | nullable | Conditions attached to a `confirmed_with_conditions` outcome |
| `eligibility_confidence_assigned` | ENUM | nullable | Confidence level assigned by this review (if review_type = eligibility_classification) |
| `fiscal_context_reference` | TEXT | nullable | Fiscal/regulatory context the review was conducted under |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this review record was created |
| `updated_at` | TIMESTAMPTZ | NOT NULL | When this review record was last updated |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** EVIDENCE
**Foundation Light Status:** Active (external advisor references only — no KORA advisor accounts)

**Access Rules:**
- Write: Company admin roles (create and update requests); KORA admin roles (status updates)
- Read: Company admin roles (own reviews); KORA analyst roles; audit purposes

**Key Constraints:**
- At Foundation Light, `advisor_type = 'kora_advisor'` is structural only. KORA does not operate an internal advisor network at Foundation Light. Records with `advisor_type = 'kora_advisor'` require explicit activation of the KORA Advisor Network feature.
- `eligibility_confidence_assigned` must be one of the canonical confidence levels from doc 05. When a review is completed with `review_outcome = 'confirmed'`, the corresponding `gov.eligibility_profiles` record should be updated to the assigned confidence level and a new version created in `gov.eligibility_profile_versions`.
- The connection between a completed review and the updated eligibility classification is the audit trail link that makes the confidence level traceable. Both the review record and the eligibility profile version must reference each other.
- `advisor_name`, `advisor_firm`, `advisor_contact_reference`, and `advisor_qualification` are the Foundation Light mechanism for recording external advisor identity without creating KORA user accounts. These fields must not contain sensitive PII beyond professional identification.

---

### 22.2 `gov.advisor_review_evidence`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `advisor_review_id` | UUID | NOT NULL | FK → gov.advisor_reviews |
| `evidence_record_id` | UUID | NOT NULL | FK → evidence.evidence_records |
| `evidence_role` | ENUM | NOT NULL | `input_to_review` / `output_of_review` / `supporting_reference` |
| `attached_at` | TIMESTAMPTZ | NOT NULL | When this evidence was attached to the review |
| `attached_by_user_id` | UUID | NOT NULL | FK → gov.users |
| `notes` | TEXT | nullable | Context on why this evidence is attached |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this record was created |

**UNIQUE constraint:** `(advisor_review_id, evidence_record_id)`

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** EVIDENCE
**Foundation Light Status:** Active

**Access Rules:**
- Write: Company admin roles (attaching input evidence); KORA admin roles (attaching output evidence)
- Read: Company admin roles (own reviews); KORA analyst roles; audit purposes

**Key Constraints:**
- `evidence_role = 'input_to_review'` — documents the company or KORA provided to the advisor before the review (service description, prior classification, supporting documentation).
- `evidence_role = 'output_of_review'` — documents the advisor produced as the result of the review (written opinion, confirmation letter, audit report).
- `evidence_role = 'supporting_reference'` — documents referenced during the review but not produced for it (applicable legislation, industry guidance).
- The join between this table and `evidence.evidence_records` provides the complete evidentiary trail for each advisor review. Both must be retained for the full retention period applicable to the review type.

---

## Section 22A — Founder Validation Tables [Gate 2 addition]

The Founder Validation Cockpit (doc 24 Section F, doc 25 Section 6) supports market validation activities during the Foundation Light phase. Its data is internal founder/admin pipeline data — not part of KORA's impact intelligence, not connected to scoring, and not visible to any company client role.

This resolves the MEDIUM-severity schema gap identified in doc 27 (OQ-04) on Founder Validation Cockpit schema placement.

---

**Table:** `gov.validation_contacts`
**Store:** Governance
**KORA Layer:** GOVERNANCE (internal admin — not part of impact intelligence or scoring)
**Foundation Light Status:** Basic (demo and validation support — not required for scoring pipeline)
**Purpose:** Stores founder and KORA team market validation pipeline contacts. Functions as a thin internal CRM for tracking prospect outreach, pilot interest, validation signals, and objections during the Foundation Light validation phase. Has no FK dependency on analytics tables or any KORA Index output.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `validation_contact_id` | UUID | NOT NULL | Primary key |
| `stakeholder_company_name` | TEXT | NOT NULL | Prospect company or organization name |
| `stakeholder_name` | TEXT | NOT NULL | Contact person name |
| `stakeholder_role` | TEXT | nullable | Role or title at the prospect company |
| `sector` | TEXT | nullable | Industry sector |
| `headcount_range` | ENUM | nullable | `micro` / `small` / `medium` / `large` / `enterprise` |
| `current_provider_maturity` | ENUM | nullable | `none` / `basic` / `intermediate` / `advanced` |
| `esg_pressure` | ENUM | nullable | `none` / `low` / `medium` / `high` — perceived ESG reporting pressure |
| `hr_pain` | TEXT | nullable | Primary HR pain point identified |
| `worker_adoption_concern` | TEXT | nullable | Any concern about worker adoption raised |
| `interest_level` | ENUM | NOT NULL | `none` / `low` / `exploring` / `interested` / `high` |
| `pilot_interest` | ENUM | NOT NULL | `no` / `exploring` / `yes` |
| `willingness_to_pay_range` | TEXT | nullable | Indicative WTP signal from conversation |
| `estimated_pilot_value` | TEXT | nullable | Rough revenue signal for pipeline tracking |
| `primary_objection` | TEXT | nullable | Main objection raised during outreach |
| `next_step` | TEXT | nullable | Agreed next action |
| `status` | ENUM | NOT NULL | `not_contacted` / `contacted` / `meeting_set` / `demo_done` / `pilot_interest_confirmed` / `declined` / `parked` |
| `follow_up_date` | DATE | nullable | When to follow up |
| `notes` | TEXT | nullable | Free-text notes |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification |

**Access Rules:**
- Write: KORA Admin only (internal founder/team)
- Read: KORA Admin only
- Prohibited: All company client roles, all partner roles, all advisor roles, all company-facing APIs
- No employer — including any KORA client company — may see this table or its contents

**Key Constraints:**
- No FK dependency on `analytics.*` tables. This table is completely isolated from the scoring pipeline.
- `estimated_pilot_value` is a rough signal for pipeline tracking. It does not represent a committed contract or guarantee.
- Must not be confused with or joined to `gov.companies` (which stores active KORA client companies). Validation contacts are prospects, not live clients.
- Audit events are generated on create/update for internal activity tracking.

**Notes:**
- At Foundation Light v0.1, this table is populated with synthetic contacts from the demo dataset (doc 25 Section 6). No real prospect data is stored in the demo build.
- This table is optional for the scoring pipeline — it does not block SQL generation for scoring-related tables.

---

## Section 23 — Report Tables

**Governing source:** Founder Decision 7 (doc 08) — Report Generation.

**Decision 7:** Reports are pre-computed after each approved ingestion batch and stored as Report entities. Reports are auditable records of what was shown to the company at a specific moment in time. They are not regenerated automatically when methodology changes — historical reports are locked to the version that produced them.

---

### 23.1 `gov.reports`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `company_id` | UUID | NOT NULL | FK → gov.companies |
| `company_program_id` | UUID | NOT NULL | FK → gov.company_programs |
| `report_type` | ENUM | NOT NULL | See report type list below |
| `reporting_period_start` | DATE | NOT NULL | Start of the period this report covers |
| `reporting_period_end` | DATE | NOT NULL | End of the period this report covers |
| `report_status` | ENUM | NOT NULL | `generating` / `ready` / `error` / `superseded` |
| `publication_status` | ENUM | NOT NULL | `draft` / `published` / `archived` |
| `kora_index_id` | UUID | nullable | FK → analytics.kora_indices (KORA Index record this report is based on) |
| `financial_governance_snapshot_id` | UUID | nullable | FK → gov.financial_governance_snapshots |
| `confidence_score_id` | UUID | nullable | FK → analytics.confidence_scores (overall report confidence) |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions |
| `generated_by_user_id` | UUID | nullable | FK → gov.users (null if system-generated) |
| `generated_by_system` | TEXT | nullable | System identifier (if automated generation) |
| `generated_at` | TIMESTAMPTZ | NOT NULL | When report generation began |
| `finalized_at` | TIMESTAMPTZ | nullable | When report was finalized and ready |
| `data_sources_used_json` | JSONB | NOT NULL | Summary of ingestion batches and source types used |
| `limitations` | TEXT | nullable | Data quality limitations and caveats specific to this report |
| `disclaimer_version` | TEXT | NOT NULL | Version of the standard disclaimer applied to this report |
| `scope_notes` | TEXT | nullable | Notes on scope inclusions or exclusions for this report |
| `worker_coverage_count` | INTEGER | nullable | Number of workers covered (aggregate — never individual identification) |
| `export_reference` | TEXT | nullable | Primary export storage reference (most recent exported version) |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this report record was created |

**Report type ENUM values:**
- `foundation_light_impact_report` — Core Foundation Light output: KORA Index, pillar balance, confidence, financial governance summary
- `executive_summary` — Condensed single-page executive view
- `financial_governance_summary` — Budget utilization, cost per impact unit, pillar spend distribution
- `fiscal_classification_map` — Eligibility classification overview by partner/service/perimeter
- `eligibility_confidence_map` — Confidence level distribution across the active program
- `advisor_review_checklist` — Summary of pending advisor reviews and open confidence gaps
- `esg_csrd_ready_appendix_future` — Future: CSRD-aligned structured appendix (Governance/Certified tier)
- `certified_evidence_package_future` — Future: Certified tier evidence package for external validation

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** EVIDENCE
**Foundation Light Status:** Active (`foundation_light_impact_report`, `executive_summary`, `financial_governance_summary`, `fiscal_classification_map`, `eligibility_confidence_map`, `advisor_review_checklist`)

**Access Rules:**
- Write: KORA analytics engine (automated generation); KORA analyst roles (manual triggering)
- Read: Company admin roles, company HR roles, company ESG roles (own reports only); KORA analyst roles

**Key Constraints:**
- Reports are generated only from `ingestion_batches` with `status = 'complete'`. No report may be generated from an unapproved batch.
- Reports are locked at generation: `methodology_version_id` is set at generation time and is never updated. If the methodology changes, a new report is generated on the next cycle — the old report is preserved as a historical record.
- No report may expose individual PIB records, individual UEF records, individual IU values, or identifiable worker data in any form.
- Every report must display: `methodology_version_id`, overall `confidence_score_id`, `limitations` text, and `disclaimer_version`. These are not optional fields — they are mandatory disclosure requirements.
- `worker_coverage_count` is an aggregate integer. No worker-level detail is included in any report.
- When a new report supersedes a prior report for the same `company_program_id` and `reporting_period_start`/`reporting_period_end`, the prior report `report_status` is set to `superseded`. The prior record is retained — never deleted.

---

### 23.2 `gov.report_exports`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `report_id` | UUID | NOT NULL | FK → gov.reports |
| `export_type` | ENUM | NOT NULL | `full_report` / `executive_summary` / `data_appendix` / `fiscal_map` / `advisor_checklist` |
| `export_format` | ENUM | NOT NULL | `pdf` / `xlsx` / `csv` / `json` / `docx` |
| `export_status` | ENUM | NOT NULL | `generating` / `ready` / `error` / `expired` |
| `storage_reference` | TEXT | nullable | External blob storage key / path for the exported file |
| `storage_bucket` | TEXT | nullable | Blob storage bucket name |
| `content_hash_sha256` | TEXT | nullable | SHA-256 hash of the exported file (integrity verification) |
| `generated_by_user_id` | UUID | NOT NULL | FK → gov.users (who triggered this export) |
| `generated_at` | TIMESTAMPTZ | NOT NULL | When this export was initiated |
| `ready_at` | TIMESTAMPTZ | nullable | When the export became available for download |
| `expiry_at` | TIMESTAMPTZ | nullable | When the download link expires (if time-limited) |
| `download_count` | INTEGER | NOT NULL DEFAULT 0 | Number of times this export has been downloaded |
| `last_downloaded_at` | TIMESTAMPTZ | nullable | Most recent download timestamp |
| `last_downloaded_by_user_id` | UUID | nullable | FK → gov.users |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this export record was created |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** EVIDENCE
**Foundation Light Status:** Active

**Access Rules:**
- Write: KORA analytics engine (generation); company admin roles and company HR roles (triggering export for own reports)
- Read: Company admin roles, company HR roles (own exports); KORA analyst roles

**Key Constraints:**
- The exported file is stored in external blob storage. `storage_reference` + `storage_bucket` are the storage pointer. The file is not stored in the relational database.
- `content_hash_sha256` enables integrity verification of the downloaded export against the stored file.
- Every export download must generate an `audit.audit_trail_records` entry. Export access is an auditable action.
- `expiry_at` should be set for exports containing sensitive or compliance-relevant data. Expired exports return a `403` or equivalent; the metadata record is retained for audit.
- Row-level worker event data must never be included in any export format. Exports reflect the aggregate, company-level views defined in the report.

---

## Section 24 — Methodology Version Governance

**Note:** Tables for methodology versions are defined in Section 12. This section does not duplicate those table definitions. It states the governance rules that apply across all methodology version tables, and defines the one remaining table not covered in Section 12.

---

### 24.1 Methodology Version Governance Rules

**Root version table:** `gov.methodology_versions`
Every scoring output across the platform carries a NOT NULL FK to this table. This is the single source of truth for which version of KORA's methodology produced a given result.

**Component-level versioning:** `gov.methodology_version_components`
Records the specific version of each independently versioned component (BCM, NM rules, correction factors, anti-gaming rules, KORA Index weights, confidence model). This allows a methodology version to have mixed component versions — for example, a BCM update without changing NM rules.

**BC matrix:** `gov.bcm_versions` + `gov.bcm_entries`
The Base Contribution matrix is versioned separately. BCM updates represent calibration changes. `bcm_entries` stores each event_type_code × pillar × base_weight combination for a given version.

**NM rules:** `gov.nm_rules_versions` + `gov.nm_rules`
Normalization rules versioned separately. Each event type has its own normalization function, category_cap, and parameters.

**Correction factors:** `gov.correction_factor_rule_versions` (defined in 24.2 below)
The rules governing valid ranges, conditions, and application logic for all seven optional/mandatory correction factors are versioned as a single parameter set.

**Anti-gaming:** `gov.anti_gaming_rules_versions`
AGF rule sets are versioned separately. Changes to anti-gaming thresholds or disqualification logic require a new version.

**KORA Index weights:** `gov.kora_index_weight_versions`
10-component weight set versioned separately. All components weights must sum to 1.00. All current versions carry `calibration_status = 'pre_empirical_calibration'`.

**Confidence model:** Version referenced in `analytics.confidence_scores` via `methodology_version_id`. Confidence model definition is embedded in the methodology version — no separate table in v0.1.

**Governance rules applying to all methodology version tables:**

1. **Historical scores are permanently locked.** A scoring output (IU, PIB, KORA Index, Confidence Score) is never recalculated against a new methodology version retroactively. If KORA's methodology changes, new runs on new data use the new version. Past results are immutable.
2. **No silent methodology update.** Every methodology version is a named, dated, tracked record. A new version cannot be created without an explicit change log entry.
3. **All parameter groups carry `calibration_status`.** At Foundation Light v0.1, all values are `pre_empirical_calibration`. This must be visible in every output.
4. **A new methodology version must be reviewed and explicitly activated** before it takes effect on new scoring runs. An `is_current = TRUE` flag on `gov.methodology_versions` identifies the active version.
5. **Only one methodology version may be current at a time.** Activating a new version must set `is_current = FALSE` on the prior current version before setting it on the new version — not after.
6. **The Delphi Study is the calibration trigger.** Current pre-calibration weights and BCM values become historical after the Delphi calibration process produces empirically validated values. The transition is recorded as a new methodology version.

---

### 24.2 `gov.correction_factor_rule_versions`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `version_label` | TEXT | NOT NULL, UNIQUE | Human-readable version identifier (e.g., `CF-v0.1`) |
| `status` | ENUM | NOT NULL | `draft` / `active` / `superseded` |
| `effective_from` | DATE | NOT NULL | When this version became effective |
| `effective_to` | DATE | nullable | When this version was superseded (null = current if status = active) |
| `cq_rules_json` | JSONB | NOT NULL | Rules for CQ: valid range [0.50–1.20], determination method, default |
| `ev_rules_json` | JSONB | NOT NULL | Rules for EV: valid range [0.50–1.00], verification level mapping |
| `cf_rules_json` | JSONB | NOT NULL | Rules for CF: valid range [1.00–1.20], continuity window definition |
| `agf_rules_json` | JSONB | NOT NULL | Rules for AGF: valid range [0.00–1.00], disqualification thresholds, anti-gaming trigger conditions |
| `df_rules_json` | JSONB | NOT NULL | Rules for DF: valid range [1.00–1.30], LEGACY pillar only, depth criteria |
| `exf_rules_json` | JSONB | NOT NULL | Rules for EXF: valid range [1.00–1.20], IMPACT pillar only, externality verification criteria |
| `sf_rules_json` | JSONB | NOT NULL | Rules for SF: default 1.00, valid range [0.80–1.10], optional, documented evidence required |
| `calibration_status` | ENUM | NOT NULL | Default: `pre_empirical_calibration`. Must not be changed to `delphi_calibrated` or `empirically_validated` without documented empirical validation. |
| `methodology_version_id` | UUID | NOT NULL | FK → gov.methodology_versions. The methodology version under which this correction factor rule set was active. Enables full traceability from any IU record back to the complete methodology context. |
| `change_log` | TEXT | NOT NULL | Human-readable summary of what changed from the prior version |
| `source_reference` | TEXT | nullable | Reference to the calibration source, Delphi Study, or expert rationale |
| `created_at` | TIMESTAMPTZ | NOT NULL | When this version record was created |

**Store:** Governance Store (Database B, schema `gov`)
**KORA Layer:** IMPACT (methodology governance)
**Foundation Light Status:** Active — v0.1 seeded at deployment with pre-calibration values

**Access Rules:**
- Write: KORA superadmin roles only
- Read: KORA analyst roles; KORA scoring engine; audit purposes

**Key Constraints:**
- All seven correction factors defined in the canonical IU formula are represented here. The ranges encoded in `*_rules_json` must match the CHECK constraints on `analytics.impact_units` correction factor columns.
- `sf_rules_json` must encode the documented-evidence requirement: SF may only be applied with explicit documented evidence. Default must be 1.00.
- `agf_rules_json` must encode the disqualification rule: `agf_value = 0.00` sets `analytics.impact_units.is_disqualified = TRUE` and `IU = 0`.
- `df_rules_json` must encode the LEGACY-pillar-only restriction. Any attempt to apply DF to a non-LEGACY IU record is a calculation error.
- `exf_rules_json` must encode the IMPACT-pillar-only restriction. Any attempt to apply EXF to a non-IMPACT IU record is a calculation error.
- All current Foundation Light values carry `calibration_status = 'pre_empirical_calibration'`.

---

## Section 25 — Audit Store Tables

**Governing source:** Founder Decision 9 (doc 08) — Audit Trail Immutability.

**Decision 9:** The audit trail is implemented as append-only at the application level. The database role that the application uses for the audit schema has INSERT permission only — no UPDATE, no DELETE. Cryptographic chain-linking is a future upgrade.

---

### 25.1 `audit.audit_trail_records`

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `event_type` | ENUM | NOT NULL | See event type list below |
| `affected_entity_type` | TEXT | NOT NULL | Name of the table/entity being acted upon |
| `affected_entity_id` | UUID | nullable | ID of the specific record affected (null for system-level events) |
| `company_id` | UUID | nullable | Company context for this event (null for KORA-system-level events) |
| `actor_type` | ENUM | NOT NULL | `human_user` / `kora_system` / `external_advisor` / `ingestion_pipeline` |
| `actor_user_id` | UUID | nullable | FK → gov.users (null if system actor) |
| `actor_system` | TEXT | nullable | System component identifier (null if human actor) |
| `action` | TEXT | NOT NULL | Description of the action taken |
| `previous_value_json` | JSONB | nullable | Snapshot of the affected record before the action (relevant fields only) |
| `new_value_json` | JSONB | nullable | Snapshot of the affected record after the action (relevant fields only) |
| `reason_code` | TEXT | nullable | Machine-readable reason code (e.g., `advisor_confirmed`, `legislation_change`, `review_cycle_expired`) |
| `reason_free_text` | TEXT | nullable | Human-supplied reason, if provided |
| `methodology_version_id` | UUID | nullable | FK → gov.methodology_versions (for scoring-related events) |
| `evidence_record_id` | UUID | nullable | FK → evidence.evidence_records (if evidence was attached to this action) |
| `ip_address_hash` | TEXT | nullable | SHA-256 hash of the actor's IP address (not the raw IP — privacy-safe) |
| `user_agent_hash` | TEXT | nullable | SHA-256 hash of the actor's user agent string |
| `immutable_sequence_number` | BIGINT | NOT NULL, UNIQUE | Monotonically increasing sequence number (database-generated) |
| `occurred_at` | TIMESTAMPTZ | NOT NULL | When this event occurred |

**Event type ENUM values (representative — list is extensible):**

*Ingestion events:*
`batch_submitted`, `batch_review_started`, `batch_approved`, `batch_rejected`, `batch_processing_started`, `batch_completed`, `batch_error`, `dataset_uploaded`, `dataset_rejected`

*UEF review decision events [Gate 2 addition]:*
`uef_review_decision_changed`, `uef_record_approved_for_scoring`, `uef_record_rejected`, `uef_record_excluded`, `uef_record_flagged_pending_review`

*Classification events:*
`pillar_mapping_created`, `pillar_mapping_human_override`, `ai_classification_accepted`, `eligibility_status_updated`, `eligibility_confidence_updated`, `eligibility_version_created`

*Scoring events:*
`iu_calculated`, `pib_calculated`, `company_aggregate_computed`, `activation_safeguard_applied`, `kora_index_calculated`, `confidence_score_calculated`, `report_generated`, `report_finalized`, `report_superseded`

*Governance events:*
`company_created`, `dpa_signed`, `program_created`, `perimeter_activated`, `advisor_review_requested`, `advisor_review_completed`, `policy_rule_created`, `policy_rule_activated`

*Access and security events:*
`sensitive_data_accessed`, `report_exported`, `report_downloaded`, `user_created`, `role_assigned`, `role_revoked`, `login_success`, `login_failure`

*Methodology events:*
`methodology_version_created`, `methodology_version_activated`, `bcm_version_created`, `correction_factor_version_created`

**Store:** Audit Store (Database B, schema `audit`)
**KORA Layer:** EVIDENCE (audit)
**Foundation Light Status:** Active

**Access Rules:**
- Write: Application INSERT only — the application role for the audit schema has INSERT permission only. No UPDATE, no DELETE at the database level.
- Read: KORA Privacy Admin, KORA Admin (full); Auditor role (Future — read-only, scoped); Company Admin (own company events only, filtered subset); individual actor (own events only for access log purposes)
- No role may UPDATE or DELETE audit records.

**Key Constraints:**
- **Append-only is enforced at the database role level, not at the application level.** The application cannot call UPDATE or DELETE on this schema even if the application code contains such a call — the database role does not have those permissions.
- `immutable_sequence_number` is a database-generated monotonically increasing sequence. Gaps indicate a deletion attempt or a system failure and must trigger an integrity alert.
- `previous_value_json` and `new_value_json` store only relevant fields — not full row dumps. Sensitive personal data must not appear in these snapshots. Pseudonymized IDs are permissible; identifiable personal data is not.
- `ip_address_hash` and `user_agent_hash` are hashed values. Raw IP addresses and user agents are not stored in the audit log.
- The events that MUST be audited at Foundation Light include: all ingestion batch state transitions, all eligibility classification changes, all advisor review status changes, all scoring outputs (IU calculation, PIB calculation, KORA Index calculation), all report generation and export events, all access to sensitive data (high-sensitivity UEF records, eligibility profile history, confidence scores), all role assignments and revocations.
- Cryptographic chain-linking (where each record's hash includes the hash of the prior record) is a future upgrade. The `immutable_sequence_number` provides a weaker but operationally effective immutability signal at Foundation Light.

---

## Section 25A — Worker Personal Data Store [Gate 2 addition]

The `personal` schema is a new logical store added to Database B (Gate 2 schema gap resolution). It holds all worker-owned and worker-controlled My KORA personal layer data. This data is not used directly to calculate the KORA Index and is never employer-visible at the individual level.

This section resolves the CRITICAL-severity schema gap identified in doc 27 (OQ-01): five My KORA worker personal data entities (Dynamic CV, milestones, personal plan, booking/request records, consent records) had no assigned production schema in doc 12 v0.1.

**Employer access to all `personal` schema tables: zero GRANT. Enforced at the database level, not by RLS alone.**
**Standard KORA Admin does not receive default `personal` schema access.**
**KORA Privacy Officer access: exceptional, purpose-limited, logged to audit trail, legally justified per Gate 3.**
**All `personal` tables must trigger `audit.audit_trail_records` events for access, create, update, and export actions.**
**Worker data deletion requests must cascade through all `personal` schema records for the affected `worker_pseudonym_id`.**

---

**Table:** `personal.worker_cv_items`
**Store:** Worker Personal Data Store (Database B, schema `personal`)
**KORA Layer:** EVIDENCE (worker-controlled impact narrative layer)
**Foundation Light Status:** Core (My KORA — required for worker PIB Light demo; requires Gate 3 for live worker accounts)
**Purpose:** Stores worker-selected entries in the Dynamic Impact CV. Workers select, curate, and optionally share items from their verified impact record. LIFE and wellbeing-related items are stored at category level only — no clinical details, diagnosis, therapy notes, or health outcomes.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `cv_item_id` | UUID | NOT NULL | Primary key |
| `worker_pseudonym_id` | UUID | NOT NULL | FK → analytics.worker_profiles (via pseudonym). The worker this item belongs to. |
| `source_type` | ENUM | NOT NULL | `uef_derived` / `milestone_derived` / `worker_self_added` |
| `source_record_ref` | UUID | nullable | Reference to the source record (e.g., a `analytics.impact_units.id` or `personal.worker_milestones.milestone_id`). Nullable for worker_self_added. |
| `title` | TEXT | NOT NULL | Display title for this CV item. For health-related items: category level only (e.g., "Wellbeing Program — 2025"). No clinical detail. |
| `description_category_level` | TEXT | nullable | Category-level description only. Must not contain personal health information. |
| `pillar_primary` | TEXT | NOT NULL | Primary KORA pillar. One of: `LIFE` / `GROWTH` / `CONNECTION` / `IMPACT` / `LEGACY` |
| `pillar_secondary` | TEXT | nullable | Secondary pillar if applicable |
| `verification_status` | ENUM | NOT NULL | `verified` / `pending_review` / `self_declared` / `worker_selected` |
| `advisor_review_id` | UUID | nullable | FK → gov.advisor_reviews. If this item was advisor-validated |
| `partner_id` | UUID | nullable | FK → gov.partners. If this item is linked to a partner service |
| `included_in_cv` | BOOLEAN | NOT NULL | Default: FALSE. Worker explicitly included this item in their active Dynamic CV |
| `excluded_by_worker` | BOOLEAN | NOT NULL | Default: FALSE. Worker explicitly excluded this item from their CV |
| `shareable_by_worker` | BOOLEAN | NOT NULL | Default: FALSE. Worker has enabled sharing for this item |
| `exported_at` | TIMESTAMPTZ | nullable | When this item was last exported by the worker |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification |

**Access Rules:**
- Write: Worker (self only) / KORA analytics engine (on item creation from UEF/milestone source)
- Read: Worker (self only) / Partner (if `shareable_by_worker = TRUE` AND consent record permits) / Advisor (if linked to assigned `advisor_review_id`)
- Prohibited: Employer roles (zero GRANT). KORA Admin (no default read). KORA Privacy Officer (exceptional access only, logged).

**Key Constraints:**
- LIFE pillar items must be stored at category level. Health data, psychological support details, clinical information, therapy notes, and provider notes are absolutely prohibited in any field of this table.
- `verification_status = 'verified'` requires a linked `source_record_ref` with a matching `advisor_review_id` or third-party evidence reference.
- Export does not imply certification unless `verification_status = 'advisor_validated'` or `'third_party_verified'`.
- Every create, update, and export event must generate an `audit.audit_trail_records` entry.

---

**Table:** `personal.worker_milestones`
**Store:** Worker Personal Data Store (Database B, schema `personal`)
**KORA Layer:** EVIDENCE (worker achievement layer — not gamification)
**Foundation Light Status:** Core (My KORA)
**Purpose:** Stores serious, credentialed My KORA milestones. Not gamification rewards, not points, not leaderboard positions. Milestones represent earned recognition of sustained or significant impact contribution across a pillar or cross-pillar.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `milestone_id` | UUID | NOT NULL | Primary key |
| `worker_pseudonym_id` | UUID | NOT NULL | FK → analytics.worker_profiles |
| `milestone_type` | TEXT | NOT NULL | Milestone type code (defined in KORA methodology catalog) |
| `title` | TEXT | NOT NULL | Milestone display title |
| `pillar_primary` | TEXT | NOT NULL | Primary pillar this milestone was earned in |
| `criterion_code` | TEXT | NOT NULL | The specific criterion code that was met to earn this milestone |
| `status` | ENUM | NOT NULL | `earned` / `pending` / `revoked` |
| `evidence_ref_id` | UUID | nullable | FK → evidence.evidence_records |
| `advisor_review_id` | UUID | nullable | FK → gov.advisor_reviews |
| `dynamic_cv_eligible` | BOOLEAN | NOT NULL | Default: TRUE. Whether this milestone is eligible to appear in the worker's Dynamic CV |
| `shareable_by_worker` | BOOLEAN | NOT NULL | Default: FALSE. Worker controls sharing |
| `earned_at` | TIMESTAMPTZ | nullable | When this milestone was earned |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification |

**Access Rules:**
- Read: Worker (self only). Advisor (if linked `advisor_review_id`).
- Prohibited: Employer roles (zero GRANT). No ranking, no leaderboard, no employer-visible milestone count.

**Key Constraints:**
- No points value, no gamification score, no employer-visible ranking.
- `status = 'revoked'` is a terminal state if the underlying evidence is invalidated by an advisor review.
- Every milestone create/update triggers an audit event.

---

**Table:** `personal.worker_personal_plan_items`
**Store:** Worker Personal Data Store (Database B, schema `personal`)
**KORA Layer:** ACTIVITY (worker-controlled planning layer)
**Foundation Light Status:** Core (My KORA)
**Purpose:** Stores private saved opportunities, goals, planned partner connections, and planned actions. Private to the worker. Not used directly for KORA Index scoring. Not visible to the employer under any path.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `plan_item_id` | UUID | NOT NULL | Primary key |
| `worker_pseudonym_id` | UUID | NOT NULL | FK → analytics.worker_profiles |
| `item_type` | ENUM | NOT NULL | `opportunity` / `partner` / `collective_event` / `goal` / `action` |
| `linked_opportunity_id` | UUID | nullable | Reference to a partner service or collective initiative (if applicable) |
| `linked_partner_id` | UUID | nullable | FK → gov.partners |
| `linked_collective_initiative_id` | UUID | nullable | FK → gov.collective_initiatives |
| `pillar_primary` | TEXT | nullable | Intended pillar target |
| `status` | ENUM | NOT NULL | `saved` / `planned` / `in_progress` / `completed` / `archived` |
| `worker_note` | TEXT | nullable | Private worker note (never visible to employer or partner) |
| `target_date` | DATE | nullable | Worker's intended completion date |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification |

**Access Rules:**
- Read/Write: Worker (self only).
- Prohibited: Employer (zero GRANT). Partner (zero access). KORA Admin (no default read).

---

**Table:** `personal.worker_participation_requests`
**Store:** Worker Personal Data Store (Database B, schema `personal`)
**KORA Layer:** ACTIVITY (Booking Light / Participation Request flow)
**Foundation Light Status:** Core (My KORA — Booking Light)
**Purpose:** Stores worker participation requests for collective initiatives, partner services, and opportunities. Individual requests are visible only to the worker. Aggregate participation counts flow to `gov.collective_initiative_companies` for company-level visibility (above privacy threshold only). No payment, checkout, voucher, slot inventory, or calendar synchronization.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `participation_request_id` | UUID | NOT NULL | Primary key |
| `worker_pseudonym_id` | UUID | NOT NULL | FK → analytics.worker_profiles |
| `request_type` | ENUM | NOT NULL | `collective_initiative` / `partner_service` / `opportunity` |
| `collective_initiative_id` | UUID | nullable | FK → gov.collective_initiatives |
| `partner_id` | UUID | nullable | FK → gov.partners |
| `partner_service_id` | UUID | nullable | FK → gov.partner_services |
| `opportunity_id` | UUID | nullable | Reference to a specific opportunity catalog entry if applicable |
| `status` | ENUM | NOT NULL | `requested` / `confirmed` / `waitlisted` / `cancelled` / `completed` / `verified` / `pending_evidence` |
| `consent_record_id` | UUID | nullable | FK → personal.worker_consent_records. Partner contact consent attached to this request. |
| `evidence_ref_id` | UUID | nullable | FK → evidence.evidence_records. Evidence of completion, if applicable. |
| `advisor_review_id` | UUID | nullable | FK → gov.advisor_reviews. If this participation was advisor-reviewed. |
| `requested_at` | TIMESTAMPTZ | NOT NULL | When the worker submitted the request |
| `confirmed_at` | TIMESTAMPTZ | nullable | When the request was confirmed |
| `completed_at` | TIMESTAMPTZ | nullable | When the worker completed the participation |
| `verified_at` | TIMESTAMPTZ | nullable | When completion was verified |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification |

**Access Rules:**
- Read/Write: Worker (self only).
- Company: sees aggregate counts via `gov.collective_initiative_companies` (above privacy threshold only). Zero direct table access.
- Partner: sees scoped request context only if `consent_record_id` grants explicit permission.
- Advisor: reads only if linked `advisor_review_id`.
- Prohibited: Employer roles (zero GRANT on this table).

**Key Constraints:**
- No payment field, no financial transaction, no voucher code, no slot inventory.
- Aggregate participation counts in `gov.collective_initiative_companies` are computed from this table by the analytics engine — never by employer-facing queries on this table.

---

**Table:** `personal.worker_consent_records`
**Store:** Worker Personal Data Store (Database B, schema `personal`)
**KORA Layer:** EVIDENCE (consent management)
**Foundation Light Status:** Core (My KORA)
**Purpose:** Stores worker consents for partner contact, request context sharing, Dynamic CV export, and data-control actions. Every grant and revocation is audited. Consent is the legal basis for any partner or external access to worker personal layer data.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `consent_record_id` | UUID | NOT NULL | Primary key |
| `worker_pseudonym_id` | UUID | NOT NULL | FK → analytics.worker_profiles |
| `consent_type` | ENUM | NOT NULL | `partner_contact` / `request_context_share` / `dynamic_cv_export` / `external_share` / `data_correction` |
| `target_entity_type` | ENUM | NOT NULL | `partner` / `advisor` / `external_recipient` / `kora` |
| `target_entity_id` | UUID | nullable | ID of the partner, advisor, or other entity to whom consent is granted |
| `scope_description` | TEXT | NOT NULL | Plain-language description of what this consent permits |
| `status` | ENUM | NOT NULL | `active` / `revoked` / `expired` |
| `granted_at` | TIMESTAMPTZ | NOT NULL | When consent was granted |
| `revoked_at` | TIMESTAMPTZ | nullable | When consent was revoked |
| `expires_at` | TIMESTAMPTZ | nullable | When this consent expires (if time-limited) |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification |

**Access Rules:**
- Read/Write: Worker (self only — grant and revoke own consents).
- Partner: sees only its own consent existence/scope where `target_entity_id = partner_id`.
- KORA Privacy Officer: exceptional access, legally justified, logged.
- Prohibited: Employer roles (zero GRANT).

**Key Constraints:**
- Every grant and revocation must write an `audit.audit_trail_records` event: `worker_consent_granted` or `worker_consent_revoked`.
- `status = 'revoked'` is not a deletion — the record is retained for audit purposes.
- `status = 'expired'` is set automatically when `expires_at` is exceeded — the record is retained.

---

**Table:** `personal.worker_data_control_preferences`
**Store:** Worker Personal Data Store (Database B, schema `personal`)
**KORA Layer:** EVIDENCE (worker data control)
**Foundation Light Status:** Core (My KORA)
**Purpose:** Stores worker preferences for visibility, inclusion/exclusion, export, and notification settings. These preferences govern how the My KORA interface presents data to the worker and what the worker makes available externally. Preferences do not affect scoring and cannot delete underlying audit records.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `preference_id` | UUID | NOT NULL | Primary key |
| `worker_pseudonym_id` | UUID | NOT NULL | FK → analytics.worker_profiles |
| `preference_type` | ENUM | NOT NULL | `cv_visibility` / `export_preference` / `data_exclusion` / `notification_preference` / `source_visibility` |
| `source_record_ref` | UUID | nullable | If this preference applies to a specific record (e.g., excluding one UEF source from the CV view) |
| `value` | TEXT | NOT NULL | The preference value (serialized; format depends on preference_type) |
| `created_at` | TIMESTAMPTZ | NOT NULL | Record creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last modification |

**Access Rules:**
- Read/Write: Worker (self only).
- Prohibited: Employer (zero GRANT). Partner (zero access).

**Key Constraints:**
- `preference_type = 'data_exclusion'` allows a worker to exclude a specific record from their CV presentation. It does not delete the underlying `analytics.uef_records` or `analytics.impact_units` record — it only affects the My KORA display layer.
- Workers cannot use preferences to delete audit trail records.

---

**Table:** `personal.worker_export_records`
**Store:** Worker Personal Data Store (Database B, schema `personal`)
**KORA Layer:** EVIDENCE (worker-controlled data portability)
**Foundation Light Status:** Core (My KORA)
**Purpose:** Stores worker-controlled Dynamic CV and data export events. Enables the worker to track what they have exported, to whom, and to revoke external shares.

**Fields:**

| Field Name | Type | Nullable | Description |
|---|---|---|---|
| `export_id` | UUID | NOT NULL | Primary key |
| `worker_pseudonym_id` | UUID | NOT NULL | FK → analytics.worker_profiles |
| `export_type` | ENUM | NOT NULL | `dynamic_cv_pdf` / `data_download` / `external_share` |
| `export_status` | ENUM | NOT NULL | `generated` / `downloaded` / `shared` / `revoked` |
| `included_item_ids` | UUID[] | NOT NULL | Array of `cv_item_id` values from `personal.worker_cv_items` included in this export |
| `recipient_type` | TEXT | nullable | `employer` / `recruiter` / `external_org` / `personal` — informational only; employer type does not grant employer access to KORA systems |
| `recipient_identifier_hash` | TEXT | nullable | SHA-256 hash of the recipient identifier. Not the raw identifier. |
| `generated_at` | TIMESTAMPTZ | NOT NULL | When the export was generated |
| `downloaded_at` | TIMESTAMPTZ | nullable | When the worker downloaded the export |
| `revoked_at` | TIMESTAMPTZ | nullable | When the worker revoked this share |

**Access Rules:**
- Read/Write: Worker (self only).
- Prohibited: Employer roles (zero GRANT). Receiving the exported CV as a file does not grant the recipient any KORA system access.

**Key Constraints:**
- `recipient_type = 'employer'` is an informational label only. It does not grant the employer any KORA database access or visibility into the worker's KORA account.
- Every export must preserve item-level `verification_status` for each included CV item.
- Every export event must write an `audit.audit_trail_records` entry: `dynamic_cv_export_generated`.
- Revocation sets `export_status = 'revoked'` and writes `dynamic_cv_external_share_revoked` to the audit trail. Revocation is a best-effort notification; KORA cannot recall already-downloaded files.

---

## Section 26 — Privacy and Access Control Rules

This section defines the authoritative role access matrix for KORA Foundation Light. These rules are architectural — they must be enforced at the database access control level, not solely at the application layer.

### Role Definitions

| Role Code | Description |
|---|---|
| `KORA_ADMIN` | KORA platform administrators — full operational access |
| `KORA_ANALYST` | KORA data analysts — read access to analytics and governance stores (no identity store) |
| `KORA_PRIVACY_ADMIN` | KORA privacy officers — identity store access, GDPR compliance operations |
| `KORA_SYSTEM` | Automated pipeline processes — write access to specific tables as defined per-table |
| `COMPANY_ADMIN` | Company HR/operations administrator — primary company-side user |
| `COMPANY_HR` | Company HR staff — access to workforce intelligence and reports |
| `COMPANY_FINANCE` | Company finance staff — access to financial governance views |
| `COMPANY_ESG` | Company ESG/sustainability staff — access to impact and ESG-ready reports |
| `COMPANY_VIEWER` | Read-only company user — restricted view of published reports only |
| `ADVISOR_EXT` | External advisor — scoped access to review inputs/outputs for assigned reviews only |
| `PARTNER_ADMIN` | Partner catalog administrator — Future feature; scoped to own partner and services |
| `WORKER` | Worker self-service — Future feature; individual PIB view for own record only |
| `AUDITOR` | External auditor — Future feature; read-only audit trail access |

---

### Role Access Matrix

**Identity Store (Database A — `identity` schema)**

| Table | KORA_ADMIN | KORA_ANALYST | KORA_PRIVACY_ADMIN | KORA_SYSTEM | All Company Roles | ADVISOR_EXT |
|---|---|---|---|---|---|---|
| `identity.worker_identity_records` | Read | None | Full | Scoped write | **NEVER** | None |
| `identity.pseudonymization_key_references` | None | None | Read | Scoped | **NEVER** | None |

*No employer role — regardless of seniority, permission level, or configuration — may access the Identity Store. This is enforced at the database access control level.*

---

**Analytics Store — Individual-Level Tables**

| Table | KORA_ADMIN | KORA_ANALYST | KORA_SYSTEM | COMPANY_ADMIN | COMPANY_HR | COMPANY_FINANCE | COMPANY_ESG | COMPANY_VIEWER |
|---|---|---|---|---|---|---|---|---|
| `analytics.uef_records` | Read | Read | Write | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** |
| `analytics.pillar_mappings` | Read | Read | Write | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** |
| `analytics.impact_units` | Read | Read | Write | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** |
| `analytics.pib_records` | Read | Read | Write | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** |
| `analytics.kora_index_explanations` | Read | Read | Write | Read (own) | Read (own) | Read (own — aggregate only) | Read (own) | Read (own, published) |
| `analytics.worker_profiles` | Read | Read | Write | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** |

*Individual UEF records, IU records, and PIB records are absolutely inaccessible to employer roles. There is no permission, role, or configuration that can override this. It is an architectural guarantee.*

---

**Analytics Store — Aggregate and Index Tables**

| Table | KORA_ADMIN | KORA_ANALYST | KORA_SYSTEM | COMPANY_ADMIN | COMPANY_HR | COMPANY_FINANCE | COMPANY_ESG | COMPANY_VIEWER |
|---|---|---|---|---|---|---|---|---|
| `analytics.company_impact_aggregates` | Read | Read | Write | Read (own) | Read (own) | None | Read (own) | None |
| `analytics.workforce_segments` | Read | Read | Write | Read (own, `is_active=TRUE` only) | Read (own, `is_active=TRUE` only) | None | None | None |
| `analytics.activation_safeguard_results` | Read | Read | Write | Read (own) | Read (own) | Read (own — status and summary only) | Read (own) | None |
| `analytics.kora_indices` | Read | Read | Write | Read (own) | Read (own) | Read (own — aggregate summary fields only) | Read (own) | Read (own, published) |
| `analytics.kora_index_components` | Read | Read | Write | Read (own) | Read (own) | None | Read (own) | None |
| `analytics.confidence_scores` | Read | Read | Write | Read (own) | Read (own) | Read (own — score_value and confidence_level only) | Read (own) | None |
| `analytics.kora_contributions` | Read | Read | Write | Read (own) | None | None | Read (own) | None |
| `analytics.kora_ecosystem_reach` | Read | Read | Write | Read (own) | None | None | Read (own) | None |

*`workforce_segments` with `is_active = FALSE` (below safe aggregation threshold) are never returned to employer queries, regardless of the role.*

**Company Finance aggregate access clarification [Gate 2 addition]:**
Company Finance is not blind to KORA value; it is blind to worker-level data. Company Finance may access:
- KORA Index summary (`kora_index_value`, `confidence_score_id`, `calculation_status`, `publication_status`) — via pre-built aggregate view
- Activation Safeguard status and plain-language explanation — via pre-built view
- Confidence Score value and level — via pre-built view
- Financial Governance Light views (financial_budgets, financial_movements, financial_governance_snapshots)
- Budget vs activation aggregates
- Cost per IU (dashboard-only indicator — read from pre-built view)
- Fiscal classification informational layer
- Finance-relevant report types

Company Finance must be denied:
- Raw `analytics.uef_records`, `analytics.impact_units`, `analytics.pib_records`, `analytics.worker_profiles`
- All `personal.*` schema tables
- Worker bookings, partner contacts, Dynamic CV, personal timeline
- Sensitive wellbeing / health-related metadata
- Workforce drilldowns below privacy threshold
- Per-worker activation status or individual KORA component scores

**Governance Store — Scoring Run Table [Gate 2 addition]**

| Table | KORA_ADMIN | KORA_ANALYST | KORA_SYSTEM | COMPANY_ADMIN | COMPANY_HR | COMPANY_FINANCE | COMPANY_ESG | COMPANY_VIEWER |
|---|---|---|---|---|---|---|---|---|
| `gov.scoring_runs` | Full | Read | Write | Read own (limited fields) | Read own (limited) | None | None | None |

---

**Governance Store — Company and Program Data**

| Table | KORA_ADMIN | COMPANY_ADMIN | COMPANY_HR | COMPANY_FINANCE | COMPANY_ESG | COMPANY_VIEWER |
|---|---|---|---|---|---|---|
| `gov.companies` | Full | Read own | Read own (limited fields) | Read own (limited) | Read own (limited) | None |
| `gov.company_programs` | Full | Read/Write own | Read own | None | Read own | None |
| `gov.users` | Full | Read/Write own company | None | None | None | None |
| `gov.financial_budgets` | Full | Read/Write own | None | Read/Write own | None | None |
| `gov.financial_movements` | Full | Read own | None | Read/Write own | None | None |
| `gov.financial_governance_snapshots` | Full | Read own | None | Read own | None | None |
| `gov.reports` | Full | Read own | Read own | Read own (financial types) | Read own (impact/ESG types) | Read own (published only) |
| `gov.report_exports` | Full | Read/trigger own | Read/trigger own | Read/trigger own | Read/trigger own | None |
| `gov.advisor_reviews` | Full | Read/Write own | Read own | None | None | None |

---

**Governance Store — Catalog and Eligibility**

| Table | KORA_ADMIN | KORA_ANALYST | COMPANY_ADMIN | COMPANY_HR | ADVISOR_EXT |
|---|---|---|---|---|---|
| `gov.partners` | Full | Read | Read | Read | Read (scoped) |
| `gov.partner_services` | Full | Read | Read | Read | Read (scoped) |
| `gov.collective_initiatives` | Full | Read | Read (catalog) | Read (catalog) | None |
| `gov.collective_initiative_companies` | Full | Read | Read (own, threshold-met) | Read (own, threshold-met) | None |
| `gov.validation_contacts` | Full | None | **NEVER** | **NEVER** | **NEVER** |
| `gov.fiscal_perimeters` | Full | Read | Read | None | Read |
| `gov.eligibility_profiles` | Full | Read | Read | None | Read/Write (scoped to assigned) |
| `gov.eligibility_profile_versions` | Full | Read | Read | None | Read (scoped) |

**Worker Personal Data Store — All personal schema tables [Gate 2 addition]**

| Table | KORA_ADMIN | KORA_PRIVACY_OFFICER | KORA_ANALYST | WORKER (self) | All Company Roles | PARTNER_ADMIN | ADVISOR_EXT |
|---|---|---|---|---|---|---|---|
| `personal.worker_cv_items` | **No default** | Exceptional only | **NEVER** | Self only | **NEVER** | Consent-gated | Assigned review only |
| `personal.worker_milestones` | **No default** | Exceptional only | **NEVER** | Self only | **NEVER** | **NEVER** | Assigned review only |
| `personal.worker_personal_plan_items` | **No default** | Exceptional only | **NEVER** | Self only | **NEVER** | **NEVER** | **NEVER** |
| `personal.worker_participation_requests` | **No default** | Exceptional only | **NEVER** | Self only | **NEVER** | Consent-gated | Assigned review only |
| `personal.worker_consent_records` | **No default** | Exceptional only | **NEVER** | Self only | **NEVER** | Scoped to own consent | **NEVER** |
| `personal.worker_data_control_preferences` | **No default** | Exceptional only | **NEVER** | Self only | **NEVER** | **NEVER** | **NEVER** |
| `personal.worker_export_records` | **No default** | Exceptional only | **NEVER** | Self only | **NEVER** | **NEVER** | **NEVER** |

*"Exceptional only" for KORA Privacy Officer means: the access must be legally justified, purpose-limited, explicitly authorized, and every record accessed must write an audit event. This is not a standing read permission — it requires per-incident authorization.*
*"No default" for KORA Admin means: standard KORA Admin does not receive a GRANT on personal schema tables. Access requires an elevated operation with explicit justification and audit logging.*

---

**Audit Store**

| Table | KORA_ADMIN | KORA_PRIVACY_ADMIN | KORA_ANALYST | COMPANY_ADMIN | AUDITOR (Future) |
|---|---|---|---|---|---|
| `audit.audit_trail_records` | Read | Read | Read (scoped) | Read (own events, filtered) | Read (scoped) |

*No role has UPDATE or DELETE on the audit store — enforced at the database level.*

---

### Privacy Rules Summary

| Rule | Enforcement Mechanism |
|---|---|
| Identity Store inaccessible to employer roles | Database-level role grants — no employer role has any permission on Database A |
| No individual PIB visibility for employers | Row-level prohibition on `analytics.pib_records` — `NEVER` in matrix is a database-level grant absence |
| No individual UEF visibility for employers | Same — database-level |
| No individual IU visibility for employers | Same — database-level |
| personal schema inaccessible to employer roles | Database-level grant absence — zero GRANT on all personal.* tables for any company role |
| personal schema: KORA Admin no default access | Standard KORA Admin role does not receive GRANT on personal schema. Elevated operation required. |
| personal schema: Privacy Officer exceptional access | Purpose-limited, legally justified, per-incident authorized, every accessed record logged to audit trail |
| Safe aggregation threshold enforced | `analytics.workforce_segments.is_active = FALSE` for segments below threshold; query filters enforced at view layer |
| Below-threshold segment suppression | Application must filter `is_active = FALSE` segments; database views must not return suppressed segments to company roles |
| Evidence access filtered by sensitivity | `evidence.evidence_records.access_restriction = 'kora_only'` records not returned to company queries; `privacy_sensitivity = 'highly_sensitive'` records require elevated role |
| Company Finance sees aggregate KORA value, not individual data | Pre-built aggregate views only. Finance roles have zero GRANT on UEF, IU, PIB, worker_profiles, and all personal.* tables. |
| Finance roles cannot see sensitive health details | Finance roles have no access to UEF records, evidence records, or advisor reviews outside financial scope |
| Sensitive access audited | Every access to high-sensitivity UEF records, eligibility history, evidence records, and personal schema generates an `audit.audit_trail_records` entry |
| No row-level worker event data in exports | Enforced at report generation — exports are built from aggregate tables, never from UEF/IU/PIB row sets |
| Minimum safe group size: 10 individuals | `gov.companies.safe_aggregation_threshold` (default 10); configurable by legal counsel; `workforce_segments.is_active` computed against this threshold |
| Worker consent required for partner access to personal data | Consent-gated access: partners may only read personal.worker_cv_items or personal.worker_participation_requests with a valid active `personal.worker_consent_records` entry |

### Privacy Officer Audit Event Types [Gate 2 addition]

The following audit event types are mandatory when KORA Privacy Officer exceptional access is exercised on personal schema data or sensitive analytics records. These must be added to the `audit.audit_trail_records` event_type ENUM.

| Event Type | Trigger |
|---|---|
| `privacy_officer_access_requested` | Privacy Officer submits a request to access personal schema or high-sensitivity analytics records |
| `privacy_officer_access_granted` | The request is reviewed and access is authorized (legal basis confirmed) |
| `privacy_officer_record_accessed` | Privacy Officer reads a specific record under the granted access |
| `privacy_officer_access_revoked` | The access grant is withdrawn or expires |
| `worker_data_correction_requested` | Worker submits a data correction request |
| `worker_data_deletion_requested` | Worker submits a GDPR Article 17 deletion request |
| `worker_consent_granted` | Worker grants a consent record in `personal.worker_consent_records` |
| `worker_consent_revoked` | Worker revokes a consent record |
| `dynamic_cv_export_generated` | Worker generates a Dynamic CV export |
| `dynamic_cv_external_share_revoked` | Worker revokes a Dynamic CV external share |

These event types must be added to the existing `audit.audit_trail_records.event_type` ENUM list alongside the events already defined in Section 25.

---

### Employer-Facing Aggregate View Requirements [Gate 2 addition]

Employer-facing roles must not query raw analytics or personal tables directly. All employer-facing access must be mediated through aggregate-safe views or service-layer equivalents that enforce: company scoping, privacy threshold, aggregation, suppression of below-threshold groups, exclusion of personal schema data, exclusion of individual UEF/IU/PIB rows, and exclusion of worker bookings, partner contacts, Dynamic Impact CV, personal plan, consent records, and exports.

These views are conceptual requirements for `docs/22-foundation-light-sql-schema-specification.md`. They are not SQL definitions in doc 12.

**View 1: `analytics.company_kora_index_summary_view`**
Purpose: Employer-safe aggregate KORA Index summary.
Allowed consumers: Company Admin, Company HR, Company ESG, Company Finance (summary fields), Company Viewer.

Fields to expose:
- `company_id`, `company_program_id`, `reporting_period_start`, `reporting_period_end`
- `kora_index_value`, `confidence_score_value`, `confidence_level`
- `activation_safeguard_status`, `methodology_version_id`, `calibration_status`, `publication_status`
- `explanation_summary`, `limitations_text`

Rules: No `worker_pseudonym_id`, no individual PIB, no individual UEF, no individual IU, no personal schema data.

---

**View 2: `analytics.company_activation_aggregate_view`**
Purpose: Employer-safe aggregate activation and participation metrics.
Allowed consumers: Company Admin, Company HR, Company ESG, Company Viewer.

Fields to expose:
- `eligible_worker_count`, `active_worker_count`, `meaningful_active_worker_count`
- `activation_rate`, `meaningful_activation_rate`, `continuity_worker_count`
- `pillar_distribution_json`, `verification_distribution_json`, `privacy_threshold_met`

Rules: If `privacy_threshold_met = FALSE`, suppress row or show suppressed state. No segment below threshold. No individual worker records.

---

**View 3: `analytics.company_finance_aggregate_view`**
Purpose: Finance-safe aggregate view connecting Financial Governance Light with KORA aggregate indicators.
Allowed consumers: Company Finance, Company Admin, KORA Admin, KORA Analyst.

Fields to expose:
- `company_id`, `company_program_id`, `reporting_period_start`, `reporting_period_end`
- `kora_index_value`, `confidence_score_value`, `activation_safeguard_status`
- `total_budget_allocated`, `total_budget_consumed`, `budget_utilization_rate`
- `cost_per_impact_unit`, `cost_per_active_worker`
- `fiscal_category_spend_json`, `pillar_spend_distribution_json`
- Report ID references, if applicable

Rules: Company Finance can see aggregate KORA Index summary and finance-linked aggregate indicators. Company Finance cannot access individual worker data, workforce drilldowns below threshold, UEF/IU/PIB rows, worker bookings, partner contacts, Dynamic Impact CV, personal timeline, personal plan, consent records, exports, or sensitive wellbeing / health-related metadata. Financial data remains display/governance only and does not feed the KORA Index.

**Company Finance is not blind to KORA value; it is blind to worker-level data.**

---

**View 4: `analytics.company_contribution_aggregate_view`**
Purpose: Employer-safe aggregate KORA Contribution and collective initiative summary.
Allowed consumers: Company Admin, Company HR, Company ESG, Company Viewer.

Fields to expose:
- `company_id`, `company_program_id`
- `contribution_value`, `contribution_confidence_score`
- `aggregate_confirmed_participants`, `aggregate_completed_participants`
- `privacy_threshold_met`, `verification_level`, `advisor_validation_status`, `evidence_status`

Rules: No individual participant list. No `personal.worker_participation_requests` exposure. Suppress aggregate counts below threshold.

---

**View 5: `gov.company_fiscal_classification_view`**
Purpose: Employer-safe informational fiscal classification map.
Allowed consumers: Company Admin, Company Finance, Company ESG, KORA Admin, KORA Analyst.

Fields to expose:
- `company_id`, `program_id`
- `initiative_or_service_id`, `fiscal_perimeter_id`, `fiscal_category`
- `eligibility_status`, `eligibility_confidence`, `advisor_review_status`
- `required_documents_summary`, `risk_level`, `informational_disclaimer`

Rules: Informational only. No tax or legal conclusion. No live fiscal output before Gate 5. No worker-level fiscal data.

---

## Section 27 — Data Lifecycle

This section traces a complete Foundation Light data lifecycle from company creation to exported report, identifying the main tables, actors, outputs, and privacy implications at each stage.

---

**Stage A — Company Created**
- Main tables: `gov.companies`
- Actor: KORA Admin
- Output: Company record with `onboarding_status = 'pending'`; `dpa_status = 'not_signed'`
- Privacy note: No worker data exists yet

**Stage B — DPA Signed**
- Main tables: `gov.companies` (update: `dpa_status = 'signed'`)
- Actor: Company Admin (sign) + KORA Admin (confirm)
- Output: DPA status updated; company is eligible for ingestion
- Privacy note: No ingestion may proceed until DPA is signed; audit trail records signing event

**Stage C — Company Program Configured**
- Main tables: `gov.company_programs`, `gov.methodology_versions` (FK assigned at creation)
- Actor: Company Admin + KORA Analyst
- Output: Program record with `methodology_version_id` locked at creation; `status = 'draft'`
- Privacy note: Methodology version is locked at program creation — all scoring for this program uses this version

**Stage D — Fiscal Perimeters Selected**
- Main tables: `gov.company_program_perimeters`, `gov.fiscal_perimeters`, `gov.fuo_accounts`
- Actor: Company Admin
- Output: Active perimeter elections for this program; FUO account reference linked if applicable
- Privacy note: Perimeter selection is company configuration data; no worker data involved

**Stage E — Data Sources Defined**
- Main tables: `gov.data_sources`
- Actor: Company Admin + KORA Analyst
- Output: Data source records identifying the origin systems for this program
- Privacy note: No worker data uploaded yet; source metadata only

**Stage F — Raw Datasets Uploaded**
- Main tables: `gov.raw_datasets`, `evidence.evidence_records` (if dataset needs evidence attachment)
- Actor: Company Admin or KORA ingestion pipeline
- Output: Raw dataset records pointing to blob storage; `upload_status = 'pending_review'`
- Privacy note: Raw datasets may contain identifiable worker data; they are stored in KORA-controlled blob storage under the evidence framework until processed; never exposed directly to employer roles post-processing

**Stage G — Ingestion Batch Created**
- Main tables: `gov.ingestion_batches`, `gov.ingestion_batch_datasets`
- Actor: KORA ingestion pipeline (automated) or KORA Analyst (manual)
- Output: Ingestion batch record; batch-dataset join records; `status = 'submitted'`
- Privacy note: Batch is submitted for review before any processing; no scoring occurs while `status = 'submitted'`

**Stage H — Batch Reviewed**
- Main tables: `gov.ingestion_batches` (update: `status = 'under_review'`)
- Actor: KORA Analyst
- Output: Batch moves to `under_review`; reviewer examines data quality, source coverage, rejection records
- Privacy note: KORA Analyst reviews aggregate and structural quality indicators — not individual worker records where avoidable

**Stage I — Batch Approved (or Rejected)**
- Main tables: `gov.ingestion_batches` (update: `status = 'approved'` or `'rejected'`); `gov.ingestion_rejection_records` (if rejected)
- Actor: KORA Analyst
- Output: Approved batch becomes eligible for processing; rejected batch has rejection records with reasons; audit trail updated
- Privacy note: Rejection reasons are documented without exposing individual worker data

**Stage J — UEF Records Generated**
- Main tables: `analytics.uef_records`, `identity.worker_identity_records` (via pseudonymization service), `identity.pseudonymization_key_references`
- Actor: KORA processing pipeline
- Output: One UEF record per normalized event; `worker_pseudonym_id` assigned via pseudonymization service; identifiable worker fields absent from UEF records
- Privacy note: The pseudonymization service translates raw identifiers (from raw dataset) to `kora_pseudonym_id` before UEF records are written. The raw identifiers never appear in the Analytics Store.

**Stage K — Pillar Mappings Assigned**
- Main tables: `analytics.pillar_mappings`
- Actor: KORA classification pipeline (AI-assisted) + KORA Analyst (review)
- Output: Pillar mappings with classification method, AI suggestion, human review status
- Privacy note: Classification operates on event descriptions — never on identifiable worker attributes

**Stage L — Impact Units Calculated**
- Main tables: `analytics.impact_units`
- Actor: KORA scoring engine
- Output: One IU record per UEF record per pillar; all correction factors applied; `methodology_version_id` set; `bcm_version_id`, `nm_rule_version_id`, `correction_factor_version_id`, `anti_gaming_rule_version_id` set; AGF applied
- Privacy note: IU records are individual-level; absolutely inaccessible to employer roles

**Stage M — PIB Records Calculated**
- Main tables: `analytics.pib_records`
- Actor: KORA scoring engine
- Output: One PIB record per worker per program period; five pillar totals; `activation_status`; `continuity_detected`; `methodology_version_id` set
- Privacy note: PIB records are individual-level; absolutely inaccessible to employer roles at the database level; this is the most privacy-sensitive scoring output in the system

**Stage N — Company Aggregates Computed**
- Main tables: `analytics.company_impact_aggregates`, `analytics.workforce_segments`
- Actor: KORA scoring engine
- Output: Aggregate totals by pillar, activation rates, Gini coefficient, segment breakdowns; `privacy_threshold_met` flag; segments below safe threshold marked `is_active = FALSE`
- Privacy note: First employer-visible output of the scoring pipeline; individual PIBs are aggregated and never exposed

**Stage O — Activation Safeguard Applied**
- Main tables: `analytics.activation_safeguard_results`
- Actor: KORA scoring engine
- Output: AR, MAR computed; ceiling rule and penalty applied if triggered; `safeguard_status`; `safeguard_explanation` generated
- Privacy note: Activation Safeguard operates on aggregate rates; no individual data is visible

**Stage P — KORA Index Calculated**
- Main tables: `analytics.kora_indices`, `analytics.kora_index_components`
- Actor: KORA scoring engine
- Output: KORA Index value; all 10 components recorded; `activation_safeguard_result_id` linked (NOT NULL); `confidence_score_id` linked (NOT NULL); `methodology_version_id` set
- Privacy note: KORA Index is a company-level aggregate score; no individual data is exposed

**Stage Q — Complementary Indicators Calculated**
- Main tables: `analytics.confidence_scores` (already computed for Index), `analytics.kora_contributions`, `analytics.kora_ecosystem_reach`
- Actor: KORA scoring engine
- Output: Contribution and Ecosystem Reach indicators computed; neither enters the KORA Index formula
- Privacy note: All complementary indicators are aggregate and company-level

**Stage R — Financial and Fiscal Reports Generated**
- Main tables: `gov.financial_governance_snapshots`, `gov.fiscal_category_thresholds` (reference), `gov.eligibility_profiles` (reference)
- Actor: KORA analytics engine
- Output: Financial governance snapshot; fiscal classification map inputs assembled
- Privacy note: Financial data is company-level; no worker-level financial data is exposed

**Stage S — Reports Generated and Stored**
- Main tables: `gov.reports`
- Actor: KORA analytics engine
- Output: Report records for all applicable types; `methodology_version_id` locked; `limitations` and `disclaimer_version` populated; historical reports preserved on supersession
- Privacy note: Reports expose only aggregate, company-level outputs; no individual data; no export until generation complete

**Stage T — Exports Generated**
- Main tables: `gov.report_exports`
- Actor: Company Admin or KORA Analyst (triggered); KORA export engine (executed)
- Output: Export files in requested format; stored in external blob storage; `content_hash_sha256` recorded; `expiry_at` set
- Privacy note: All exports are built from aggregate tables; row-level worker event data never included; every download triggers an audit trail record

**Stage U — Audit Trail Updated**
- Main tables: `audit.audit_trail_records`
- Actor: All stages above generate audit events
- Output: Immutable audit trail covering all significant actions from company creation through report export
- Privacy note: Audit records contain pseudonymized references only; raw identifiers and sensitive personal data do not appear in audit records

---

## Section 28 — Foundation Light Schema Scope

### Active at Foundation Light v0.1

The following tables are active at Foundation Light — they receive live data, generate scored outputs, or serve governance functions that are required for the first sellable product.

**Identity Store (Database A):**
- `identity.worker_identity_records`
- `identity.pseudonymization_key_references`

**Governance Store (Database B, schema `gov`):**
- `gov.companies`
- `gov.company_programs`
- `gov.users`
- `gov.roles`
- `gov.user_roles`
- `gov.pillars`
- `gov.data_sources`
- `gov.raw_datasets`
- `gov.ingestion_batches`
- `gov.ingestion_batch_datasets`
- `gov.ingestion_rejection_records`
- `gov.methodology_versions`
- `gov.methodology_version_components`
- `gov.bcm_versions`
- `gov.bcm_entries`
- `gov.nm_rules_versions`
- `gov.nm_rules`
- `gov.anti_gaming_rules_versions`
- `gov.correction_factor_rule_versions`
- `gov.kora_index_weight_versions`
- `gov.financial_budgets`
- `gov.financial_movements`
- `gov.financial_governance_snapshots`
- `gov.svam_configurations` (Variant A only)
- `gov.fuo_accounts` (reference record only — no fund custody)
- `gov.welfare_statements` (informational summary only)
- `gov.fiscal_perimeters`
- `gov.fiscal_category_thresholds`
- `gov.company_program_perimeters`
- `gov.eligibility_profiles`
- `gov.eligibility_profile_versions`
- `gov.partners`
- `gov.partner_services`
- `gov.collective_initiatives` ← Gate 2 addition
- `gov.collective_initiative_companies` ← Gate 2 addition
- `gov.advisor_reviews`
- `gov.advisor_review_evidence`
- `gov.reports`
- `gov.report_exports`
- `gov.scoring_runs` ← Gate 2 addition
- `gov.validation_contacts` ← Gate 2 addition (admin/internal only)

**Analytics Store (Database B, schema `analytics`):**
- `analytics.uef_records`
- `analytics.pillar_mappings`
- `analytics.worker_profiles`
- `analytics.workforce_segments`
- `analytics.impact_units`
- `analytics.pib_records`
- `analytics.company_impact_aggregates`
- `analytics.activation_safeguard_results`
- `analytics.kora_indices`
- `analytics.kora_index_components`
- `analytics.kora_index_explanations` ← Gate 2 addition
- `analytics.confidence_scores`
- `analytics.kora_contributions`
- `analytics.kora_ecosystem_reach`
- `analytics.kora_value_chain` (table created; all records `status = 'not_calculated'`)

**Evidence Store (Database B, schema `evidence`):**
- `evidence.evidence_records`

**Audit Store (Database B, schema `audit`):**
- `audit.audit_trail_records`

**Worker Personal Data Store (Database B, schema `personal`) — Gate 2 addition:**
- `personal.worker_cv_items`
- `personal.worker_milestones`
- `personal.worker_personal_plan_items`
- `personal.worker_participation_requests`
- `personal.worker_consent_records`
- `personal.worker_data_control_preferences`
- `personal.worker_export_records`

---

### Structural / Future / Not Active at Foundation Light

The following exist in the schema to avoid future breaking migrations, but their features are not active at Foundation Light.

| Table / Feature | Reason Not Active | Required Before Activation |
|---|---|---|
| `gov.policy_rules` | Governance tier feature | Governance tier release |
| `gov.fiscal_guardrails_rules` | Governance tier feature | Governance tier release + legal review |
| `gov.fiscal_guardrails_results` | Governance tier feature | Same |
| `gov.kip_records` | **Not created in Foundation Light** — KIP (KORA Impact Pledge) is future scope only | KIP conceptual design approval + legal + tax + PSD2 review |
| SVAM variants B, C, D | Require PSD2, legal, tax validation | Professional reviews from doc 11 Section 17 |
| Operational FUO orchestration | Regulatory constraint — no fund transit through KORA | PSD2 authorization + legal validation |
| Partner payout execution | Future Ecosystem tier | Ecosystem tier release + PSP/PSD2 |
| Worker top-up / live wallet | Future Ecosystem tier | Same |
| `analytics.kora_value_chain` (active) | Future complementary indicator | Value Chain methodology approval |
| Worker dashboard / Worker role | Future Ecosystem tier | Worker app release |
| Partner dashboard / Partner Admin role | Future feature | Partner portal release |
| Full advisor portal / Advisor accounts | Future Foundation/Governance tier | Advisor network activation |
| KORA Link live ingestion | Future hardware integration | KORA Link product release |
| PSP integration | Future — regulated activity | PSD2 + legal validation |
| ESG/CSRD appendix (report type) | Future Governance/Certified tier | CSRD compliance design |
| Certified evidence package (report type) | Certified tier | Certified tier release |
| Payroll-ready Welfare Statement | Requires legal/tax review | Professional validation from doc 11 |
| Fiscal Guardrails enforcement | Governance tier | Legal + tax advisor review |

**Critical clarification:** Creating a table in the database schema does not mean activating the feature it supports. Tables for future features are created in v0.1 to avoid breaking migrations when those features are introduced. All table rows for inactive features carry explicit `status = 'not_active'`, `status = 'not_calculated'`, or equivalent status fields. Application-level guards must prevent any feature activation before the required prerequisites (professional reviews, tier releases, regulatory authorizations) are met.

---

## Section 29 — Implementation Warnings

The following warnings must be read and acknowledged before any SQL generation, Supabase migration, Prisma schema, or application code is written against this data model.

**W-01 — Do not collapse Identity and Analytics tables.**
The Identity Store (Database A) and Analytics Store (Database B) must be physically separate. The pseudonymization service provides the only authorized bridge. Combining them into a single database — even with schema separation — eliminates the privacy guarantee that is the platform's constitutional foundation.

**W-02 — Do not give employer roles direct table access to UEF, IU, or PIB.**
These tables must never appear in company-role queries, views, or API responses. Database-level grants must enforce this. Application-level filtering is insufficient — a misconfigured query must fail at the database, not silently succeed.

**W-03 — Do not calculate the KORA Index directly from raw events.**
The 14-stage algorithm flow is mandatory. Every stage must execute in sequence. Shortcutting from raw events to a KORA Index score violates the methodology and produces an indefensible number.

**W-04 — Do not bypass PIB.**
PIB (Stage 11 / `analytics.pib_records`) is a mandatory intermediate calculation. Architecture v3 explicitly prohibits skipping PIB — rule AG-01. Company aggregation (Stage 12) consumes PIB records, not IU records directly.

**W-05 — Do not bypass the Activation Safeguard.**
The Activation Safeguard (Stage 13 / `analytics.activation_safeguard_results`) is a mandatory architectural layer. `analytics.kora_indices` carries a NOT NULL FK to `activation_safeguard_results`. A KORA Index record without a corresponding Activation Safeguard result is an integrity violation.

**W-06 — Do not use old WhitePaper formula names.**
`ES`, `EF`, `RF`, `SQ`, `PA`, `EQT`, `CT`, `EC`, `GF` are historical identifiers that must not appear in any code, schema, comment, or documentation in this codebase. The canonical current names are: EV, NM, AGF, NI, AR, EQ, CO, VR, CS, Activation Safeguard.

**W-07 — Do not use doc 06 7-component weights as current Architecture v3 final weights.**
The 7-component prototype weights in doc 06 (AR 20%, NI 20%, PB 15%, EQ 15%, VR 10%, CO 10%, PC 10%) are a historical starting point, not current calibrated values. The 10-component Architecture v3 structure governs. All current weights are pre-empirical-calibration pending the Delphi Study.

**W-08 — Do not store raw sensitive documents in DB tables.**
Binary evidence files must be stored in KORA-controlled external blob storage. The relational database stores metadata, pointers, and SHA-256 hashes only. A `bytea` column for document content would violate the evidence architecture.

**W-09 — Do not treat budget as a scoring input.**
Financial data (budget, spend, cost per IU) populates the financial governance layer. It does not enter the IU formula, the PIB calculation, or the KORA Index. Any code path that passes financial amounts into a scoring function is incorrect.

**W-10 — Do not treat fiscal eligibility as impact.**
Eligibility classifications exist in a parallel dimension to impact classifications. A service marked `eligible` under a fiscal perimeter is not automatically high-impact. A high-impact service is not automatically eligible. These dimensions share no FK paths that would allow one to influence the other's score.

**W-11 — Do not mix KORA service fees and FUO funds.**
KORA's platform fees and any welfare fund (FUO) are completely separate. KORA invoices companies for the platform service. FUO funds move directly between the company (or its PI) and providers. The two must never be combined in any ledger, table, or reporting field.

**W-12 — Do not build live payment flows in Foundation Light.**
SVAM Variant A is the only active variant at Foundation Light. No payment execution, fund disbursement, partner payout, or worker top-up logic may be implemented without completing the professional reviews required by doc 11 Section 17.

**W-13 — Do not model FUO as KORA-held funds.**
`gov.fuo_accounts` is a reference record pointing to an external account. KORA holds no FUO funds under any circumstance. Any code that treats a `gov.fuo_accounts` record as an internal balance, ledger, or custodial account is architecturally wrong.

**W-14 — Do not implement Welfare Statement as payroll-ready in Foundation Light.**
`gov.welfare_statements` at Foundation Light produce informational summaries only. They are not regulatory filings, not payroll-integrated documents, and not tax submission artifacts. Presenting them as such without legal/tax review violates the requirements of doc 11.

**W-15 — Do not implement Fiscal Guardrails enforcement in Foundation Light.**
`gov.fiscal_guardrails_rules` and `gov.fiscal_guardrails_results` are structural tables only. No guardrail evaluation logic may be executed at Foundation Light. The feature is a Governance tier item gated behind legal and tax advisor review.

**W-16 — Do not let AI classifications become final without human review status.**
`analytics.pillar_mappings.classification_method = 'ai_suggested'` records must carry `review_status = 'pending'` until a human reviewer accepts or overrides the classification. An AI-suggested classification must never advance to scoring stages without reaching `review_status = 'human_confirmed'` or `'human_override'`.

**W-17 — Do not create unversioned scoring outputs.**
Every record in `analytics.impact_units`, `analytics.pib_records`, `analytics.company_impact_aggregates`, `analytics.activation_safeguard_results`, `analytics.kora_indices`, and `analytics.confidence_scores` must carry a NOT NULL `methodology_version_id`. A NOT NULL constraint must be enforced at the database level, not just the application level.

**W-18 — Do not allow report generation from unapproved ingestion batches.**
`gov.reports` must only be generated from data sourced from `gov.ingestion_batches` with `status = 'complete'`. The report generation pipeline must validate this status before executing. A report generated from a `submitted`, `under_review`, or `rejected` batch is invalid and must be rejected by the pipeline.

**W-19 — Do not implement KIP, worker top-up, or partner payout at Foundation Light.**
KIP (KORA Impact Pledge) is a future territorial pledge mechanism — not a worker-points or rewards system. `gov.kip_records` is not created in the Foundation Light schema. Any front-end route, API endpoint, UI component, or database table that implements KIP, worker top-up, or partner payout at Foundation Light must not be built. Building scaffolding for inactive payment features creates regulatory risk and user confusion.

**W-20 — Do not ignore professional review requirements from doc 11.**
Section 17 of `docs/11-economic-fiscal-architecture-integration.md` specifies professional reviews required before specific features may be activated. These are not suggestions. They are prerequisites with legal, regulatory, and fiduciary force. Any feature gated by doc 11 Section 17 must not be activated without documented completion of the required reviews.

**W-21 — Do not give employer roles any GRANT on personal schema tables. [Gate 2 addition]**
The `personal` schema is absolutely employer-denied. This is not enforced by RLS alone — the database role used for employer-facing queries must have zero GRANT on any table in the `personal` schema. A misconfigured query must fail at the database level, not silently succeed through an RLS gap.

**W-22 — Do not place LIFE/health personal data in unprotected personal schema fields. [Gate 2 addition]**
`personal.worker_cv_items` stores LIFE pillar items at category level only. No clinical details, diagnosis, psychological support notes, therapy provider notes, or health outcomes may be stored in any field. Any inbound health data that cannot be reduced to a category-level label must be excluded entirely from CV items.

**W-23 — Do not treat participation requests as a booking engine. [Gate 2 addition]**
`personal.worker_participation_requests` is a participation tracking and confirmation layer, not a booking engine. It must not implement payment, checkout, slot inventory management, calendar synchronization, voucher generation, or partner payouts. These are Ecosystem tier features.

**W-24 — Do not treat collective initiatives as a social events marketplace. [Gate 2 addition]**
`gov.collective_initiatives` tracks participation in collective impact programs. It must not implement discovery algorithms, social feeds, public event listings, ticket purchasing, or marketplace functionality.

**W-25 — Do not use scoring_run_id as a reason to skip individual pipeline stages. [Gate 2 addition]**
`gov.scoring_runs` is a lineage record — it records what ran, not a permission to skip pipeline stages. Every scoring run must still execute the full 14-stage algorithm. A `scoring_run_id` does not authorize bypassing UEF approval, PIB calculation, Activation Safeguard evaluation, or any other mandatory stage.

**W-26 — Do not store KORA Index explanations that contain individual worker data. [Gate 2 addition]**
`analytics.kora_index_explanations` is an aggregate-level document. No field may reference individual worker pseudonyms, raw PIB values, individual UEF records, or any data that could identify a specific worker. Violations make the explanation table an employer-visible individual data source — an architectural privacy breach.

**W-27 — Do not activate personal schema or live worker accounts before Gate 3. [Gate 2 addition]**
The `personal` schema tables must be created as part of the production schema. But live worker accounts — real pilot employees creating KORA accounts and generating real personal records — may not be activated before Gate 3 (legal/privacy counsel review of the complete worker data architecture, consent model, and GDPR compliance design). The demo build uses synthetic data in the personal schema only.

---

## Section 30 — Open Questions Before SQL and Migrations

The following questions must be resolved by the founding team (founder, CTO, legal counsel, and relevant professional advisors) before any SQL generation, Supabase migration, Prisma schema, or infrastructure provisioning proceeds.

**Architecture and Infrastructure**

1. **Identity Store physical separation:** Should the Identity Store be implemented as a separate Supabase project, a separate managed PostgreSQL instance, or a separate logical database within the same cluster? Each option has different implications for network isolation, key management, and cross-database query restrictions.

2. **Pseudonymization service implementation:** Where does the pseudonymization service run? As a separate microservice, a Supabase Edge Function, or an in-process module? Where are per-company keys stored — a dedicated secrets manager, a hardware security module, or a Supabase Vault? Who has access to the key derivation service, and how is that access logged?

3. **Cross-schema query authorization:** Are cross-schema joins (e.g., `gov` to `analytics`) permitted at the database level, or must all joins be mediated by application-layer service calls? Which schema boundaries require service-level crossing?

4. **Supabase suitability:** Is Supabase's Row Level Security (RLS) sufficient to enforce the employer-role prohibitions on individual PIB and UEF records? Or do those tables require a more restrictive access model (e.g., no RLS, no direct API exposure, access only via internal service calls)?

5. **Employer-facing views:** How are aggregate employer-visible views implemented — as PostgreSQL views, materialized views, or application-layer query results? How is the safe aggregation threshold filter enforced in each case?

**Privacy and Data Protection**

6. **GDPR deletion and export requests:** When a company submits a GDPR deletion request for a worker, which records must be deleted, pseudonymized further, or anonymized across which stores? What is the deletion cascade across `identity.worker_identity_records` → `analytics.uef_records` → `analytics.pib_records`? How is GDPR compliance documented in the audit trail?

7. **Safe aggregation enforcement:** How is `workforce_segments.is_active = FALSE` enforced technically at the query level — via RLS, view filters, API middleware, or all three? What happens when a segment drops below threshold mid-period due to departures?

8. **High-sensitivity event suppression:** How are UEF records with `privacy_sensitivity = 'high'` handled in practice? Is there a separate access path, a separate partition, or application-level filtering? How does this interact with the ingestion pipeline?

**Methodology and Calibration**

9. **Methodology version seeding:** How are the pre-calibration Foundation Light v0.1 values seeded into `gov.methodology_versions`, `gov.bcm_entries`, `gov.nm_rules`, and `gov.correction_factor_rule_versions`? As a migration seed script, a bootstrap fixture, or a controlled admin operation?

10. **StressTest seed data:** Should the KORA Stress Test (Appendix A) numerical scenarios be included as development-only seed data for validating the scoring engine? If so, how is development seed data isolated from production?

11. **Delphi Study transition:** When the Delphi Study produces calibrated weights and BCM values, what is the exact schema migration path? How are historical pre-calibration records distinguished from post-calibration records in dashboards and reports?

**Financial and Fiscal**

12. **Fiscal field requirements for v0.1:** Which fiscal and eligibility fields are required for the Foundation Light initial pilot? Can the fiscal classification map report be produced with Italy-only perimeters seeded and `eligibility_confidence = 'kora_inferred'` as the default starting state?

13. **FUO reference model at pilot:** For the initial pilots, will `gov.fuo_accounts` be populated at all, or will fiscal perimeter activation proceed without FUO linkage? What is the minimum viable data state for a company to use Foundation Light under SVAM Variant A?

**Operations and Security**

14. **Audit INSERT-only enforcement:** How is the INSERT-only database role for `audit.audit_trail_records` provisioned in Supabase? What is the role name, permission set, and how is it isolated from the application's main role?

15. **Report export security:** How are export download links generated and time-limited? Are they pre-signed blob storage URLs with embedded expiry? How is the `download_count` and `last_downloaded_at` updated on each download without a write-back race condition?

16. **Indexes and partitioning [Gate 2 update — index strategy confirmed]:** The following provisional indexes are confirmed for Gate 2. CTO to verify implementation approach and add further indexes after load testing.

**Confirmed provisional indexes (D-16):**
- `analytics.uef_records(company_id, program_id, occurred_at)`
- `analytics.impact_units(uef_record_id)`
- `analytics.pib_records(company_id, program_id)`
- `audit.audit_trail_records(company_id, occurred_at, immutable_sequence_number)`
- `gov.ingestion_batches(company_id, status)`

**Additional recommended indexes for Gate 2 additions:**
- `gov.scoring_runs(company_id, company_program_id, reporting_period_start, reporting_period_end)`
- `analytics.kora_indices(scoring_run_id)`
- `analytics.kora_index_explanations(kora_index_id)`
- `gov.collective_initiatives(status, territory, pillar_primary)`
- `gov.collective_initiative_companies(company_id, collective_initiative_id)`
- `personal.worker_participation_requests(worker_pseudonym_id, status)`
- `personal.worker_cv_items(worker_pseudonym_id, included_in_cv)`
- `personal.worker_consent_records(worker_pseudonym_id, consent_type, status)`

**Additional recommended indexes for UEF scoring eligibility fields [final consistency patch]:**
- `analytics.uef_records(company_id, program_id, review_decision, eligible_for_scoring)`
- `analytics.uef_records(batch_id, review_decision)`
- `analytics.uef_records(worker_id, program_id, eligible_for_scoring)`

These are provisional Gate 2 indexes and may be refined after volume, query-plan and performance review. CTO sign-off required before production provisioning (OQ-07 resolution).

17. **Blob storage provider:** What blob storage provider is used for evidence files and report exports? What retention policy applies per evidence type? How are blob storage access logs retained?

**CTO Review Scope**

18. **What must CTO review before first SQL generation?**
    - The 5-store physical architecture (Databases A and B)
    - The pseudonymization service design
    - The RLS model for employer-facing tables
    - The audit INSERT-only role implementation
    - The cross-schema join policy
    - The evidence blob storage integration
    - The Supabase schema naming (analytics / gov / evidence / audit)
    - Whether materialized views or live views are used for employer dashboards
    - The indexing strategy for high-volume tables
    - The GDPR deletion cascade procedure

19. **Legal and privacy counsel review scope:**
    - GDPR compliance of the pseudonymization architecture
    - DPA template and its relationship to `dpa_status` in `gov.companies`
    - Data retention periods for each evidence category
    - Cross-border data transfer implications for multi-geography expansion
    - SVAM Variant A legal position and the conditions for Variant B/C/D activation
    - The FUO reference model (no custody) and whether it requires any regulatory notification
    - Worker consent model for PIB calculation and data retention

20. **Tax and fiscal advisor review scope (before any fiscal feature goes live):**
    - Italy-seeded fiscal perimeter definitions (`gov.fiscal_perimeters`)
    - Fiscal category thresholds (`gov.fiscal_category_thresholds`)
    - Welfare Statement as informational-only vs. what constitutes a regulatory document
    - Fiscal Guardrails Engine design before activation
    - SVAM Variant A vs. B transition conditions

21. **Outstanding methodology questions:**
    - What specific numerical values seed the BCM for Foundation Light v0.1?
    - What is the NM normalization function for each event category at v0.1?
    - What are the AGF anti-gaming thresholds at v0.1?
    - What are the Activation Safeguard ceiling and penalty values at v0.1?
    - How is the 10-component KORA Index weight vector distributed at v0.1 (the pre-calibration starting vector)?

---

## Section 31 — Document Status and Next Action

### Document Status

**Document:** `docs/12-technical-data-model-database-schema.md`
**Version:** v0.1 (Gate 2 Schema Gap Patch + Final Consistency Patch Applied 2026-05-17)
**Status:** **Pending Founder and CTO Review — Gate 2 patch applied, 8 schema gaps resolved, final consistency fixes applied**

This document defines the technical data model and database schema for KORA Foundation Light v0.1. It is based on all approved source documents (docs 01–27, Appendix A, Appendix B, CLAUDE.md working rules). It is a schema design document only.

**This document does not constitute approval to implement.**

No SQL, no migrations, no Prisma models, no Supabase tables, no Supabase projects, no infrastructure provisioning, and no application code may be generated or executed until this document has been reviewed and explicitly approved by the founder and CTO.

---

### What This Document Does

- Defines the logical store architecture: **six stores** (Identity Store, Analytics Store, Governance Store, Evidence Store, Audit Store, Worker Personal Data Store)
- Defines the schema and namespace structure (Database A: `identity`; Database B: `analytics`, `gov`, `evidence`, `audit`, `personal`)
- Maps every KORA architectural entity to a concrete table definition
- Captures field names, types, constraints, and access rules for all ~70 tables (including Gate 2 additions)
- Encodes all privacy boundaries, methodology versioning rules, formula constraints, and lifecycle stages
- Distinguishes Foundation Light active scope from structural/future tables
- Documents 27 implementation warnings and updated open questions requiring CTO, legal, and advisory input before implementation
- Resolves all 8 Gate 2 schema gaps identified in `docs/27-gate-2-cto-architecture-review-pack.md`

---

### What This Document Does Not Do

- It does not generate SQL DDL
- It does not create Supabase tables or projects
- It does not generate Prisma schema files
- It does not provision infrastructure
- It does not write migration files
- It does not write application code
- It does not approve or activate any payment, wallet, FUO orchestration, or fiscal guardrails feature
- It does not activate live worker accounts (Gate 3 prerequisite)

---

### Next Action

**Immediate:** Founder and CTO confirmation that the 8 Gate 2 schema gaps (Section 32) are resolved by this patch, then proceed to generate `docs/22-foundation-light-sql-schema-specification.md`.

**Review scope (Gate 2 patch additions):**
- Confirm that `personal` schema is the correct placement for worker personal layer data
- Confirm `gov.scoring_runs` field set and relationships are sufficient for production pipeline lineage
- Confirm `analytics.kora_index_explanations` structure is aligned with the explainability output from the demo
- Confirm `gov.collective_initiatives` and `gov.collective_initiative_companies` scope is correctly bounded (no marketplace, no booking engine, no individual lists)
- Confirm `gov.validation_contacts` is correctly scoped as internal-only with zero client exposure
- Confirm `identity.worker_identity_records` field additions (`identity_source`, `pseudonymization_key_reference_id`, `deletion_reason`) are complete
- Confirm `identity.pseudonymization_key_references` updated field set (`key_reference_id`, `vault_key_reference`, `key_status`, `destroyed_at`) is correct
- Confirm Company Finance aggregate view scope is correctly defined
- Confirm Privacy Officer audit event types are complete

**After CTO and founder confirmation:** Generate `docs/22-foundation-light-sql-schema-specification.md` — SQL DDL for all stores, one store at a time, starting with Governance Store.

---

*Document complete. All 32 sections written including Gate 2 patch.*
*Status: Pending Founder and CTO Review — v0.1 (Gate 2 patch applied 2026-05-17)*
*No implementation may proceed until this document is reviewed and approved.*

---

## Section 32 — Gate 2 Schema Gap Resolution Notes [Gate 2 addition]

This section records the resolution of the eight schema gaps identified in `docs/27-gate-2-cto-architecture-review-pack.md` as conditions (C-01 through C-08) and open questions (OQ-01 through OQ-08) before `docs/22-foundation-light-sql-schema-specification.md` may be generated.

---

### Gap 1 — Worker Personal Data Schema (OQ-01 / C-01) — RESOLVED

**Original gap:** Five My KORA worker personal data entities (Dynamic CV, milestones, personal plan, booking/request records, partner contact consent records) had no assigned production schema in doc 12 v0.1. Classified as CRITICAL by doc 27.

**Resolution:**
- Added a new sixth logical store: `personal` schema within Database B
- Defined 7 tables: `personal.worker_cv_items`, `personal.worker_milestones`, `personal.worker_personal_plan_items`, `personal.worker_participation_requests`, `personal.worker_consent_records`, `personal.worker_data_control_preferences`, `personal.worker_export_records`
- Access rules: zero GRANT for all employer roles; KORA Admin no default access; Privacy Officer exceptional access only with full audit logging; worker self-access only
- Privacy constraint: LIFE pillar items stored at category level only — no health details
- Added Sections 3.6, 4.1 (topology), 5.9 (entity mapping), 25A (table definitions), 26 (access matrix), 28 (scope list), W-21 through W-27 (warnings)

**Status:** RESOLVED. Awaiting founder and CTO confirmation.

---

### Gap 2 — Score Run Lineage (OQ-02 / C-02) — RESOLVED

**Original gap:** No table in doc 12 v0.1 represented a discrete scoring pipeline execution, preventing KORA Index outputs from being traced to a specific pipeline run. Classified as HIGH severity.

**Resolution:**
- Added `gov.scoring_runs` (Section 13A)
- Defined FK relationships: `analytics.kora_indices`, `analytics.activation_safeguard_results`, `analytics.confidence_scores`, `analytics.company_impact_aggregates`, and `analytics.kora_index_explanations` all reference `scoring_run_id`
- Re-runs create new records; prior runs marked `superseded`; `methodology_version_id` and `calibration_status` NOT NULL on every run

**Status:** RESOLVED. Awaiting founder and CTO confirmation.

---

### Gap 3 — Collective Initiative Production Schema (OQ-03 / C-03) — RESOLVED

**Original gap:** No production schema existed for cross-company, partner-led, volunteering, territorial, and collective impact initiatives referenced in the KORA Contribution layer and My KORA participation flow. Classified as HIGH severity.

**Resolution:**
- Added `gov.collective_initiatives` (Section 20A): initiative catalog with pillar, type, status, verification, partner reference
- Added `gov.collective_initiative_companies` (Section 20A): aggregate participation counts per company (above privacy threshold only), no individual lists
- Individual participation tracked in `personal.worker_participation_requests` — employer-denied

**Status:** RESOLVED. Awaiting founder and CTO confirmation.

---

### Gap 4 — Explainability Record Persistence (OQ-05 / C-04) — RESOLVED

**Original gap:** `analytics.kora_indices` carried an inline `explanation_summary` text field but no persisted, structured explainability record existed for external display and audit. Classified as HIGH severity.

**Resolution:**
- Added `analytics.kora_index_explanations` (Section 15A)
- Stores: summary text, per-component JSON explanations, data quality notes, limitations text, `methodology_version_id`, `calibration_status`
- `limitations_text` and `calibration_status` are NOT NULL — mandatory pre-calibration disclosure
- No individual worker data may appear in any field

**Status:** RESOLVED. Awaiting founder and CTO confirmation.

---

### Gap 5 — Identity Store Completeness (OQ-06 / C-05) — RESOLVED

**Original gap:** `identity.worker_identity_records` and `identity.pseudonymization_key_references` lacked several fields required for the pseudonymization service operation, deletion cascade to the personal schema, and key lifecycle management. Classified as HIGH severity.

**Resolution:**
- Updated `identity.worker_identity_records`: added `identity_source`, `pseudonymization_key_reference_id` (FK to key references), `key_destroyed` status value, `deletion_reason`
- Updated `identity.pseudonymization_key_references`: added `key_reference_id` (primary key UUID), renamed `key_service_reference` to `vault_key_reference`, renamed `status` to `key_status`, added `destroyed_at` for key destruction lifecycle
- Deletion cascade note: `deletion_completed_at` now explicitly covers all stores including `personal` schema

**Status:** RESOLVED. Awaiting founder and CTO confirmation.

---

### Gap 6 — Founder Validation Cockpit Schema Placement (OQ-04 / C-07) — RESOLVED

**Original gap:** The Founder Validation Cockpit (used in the demo and for founder market validation tracking) had no defined production schema placement — its data existed only as demo seed files with no schema home. Classified as MEDIUM severity.

**Resolution:**
- Added `gov.validation_contacts` (Section 22A): thin internal CRM-like table for market validation pipeline contacts
- Access: KORA Admin only (internal founder/team); zero GRANT for all company client roles
- No FK dependency on analytics tables; no connection to KORA Index or scoring pipeline
- Foundation Light status: Basic (demo and validation support — does not block scoring pipeline SQL generation)

**Status:** RESOLVED. Awaiting founder and CTO confirmation.

---

### Gap 7 — Index Strategy Confirmation (OQ-07 / C-06) — RESOLVED

**Original gap:** D-16 provisional indexes were listed in doc 30 Open Questions but had not been confirmed and extended to cover the new Gate 2 tables. Classified as MEDIUM severity.

**Resolution:**
- Confirmed D-16 provisional indexes in Section 30 Q-16 (updated in place)
- Added recommended indexes for Gate 2 additions: `gov.scoring_runs`, `analytics.kora_indices` (on `scoring_run_id`), `analytics.kora_index_explanations`, `gov.collective_initiatives`, `gov.collective_initiative_companies`, `personal.worker_participation_requests`, `personal.worker_cv_items`, `personal.worker_consent_records`
- All provisional — CTO to validate against actual query patterns and volume

**Status:** RESOLVED provisionally. CTO index strategy sign-off required before SQL generation.

---

### Gap 8 — Company Finance Aggregate View Scope (OQ-08 / C-08) — RESOLVED

**Original gap:** Company Finance role access was inconsistently defined across documents — doc 26 originally said "no KORA Index detail" while doc 24 allowed aggregate KORA Index access. Classified as MEDIUM severity.

**Resolution:**
- Section 26 role access matrix updated: Company Finance now has read access to `analytics.kora_indices` (aggregate summary fields), `analytics.activation_safeguard_results` (status and explanation only), `analytics.confidence_scores` (score_value and confidence_level), and `analytics.kora_index_explanations` (aggregate view)
- Explicit "Company Finance aggregate access clarification" paragraph added to Section 26 defining what is permitted and what is denied
- Zero GRANT on all individual-level tables confirmed: UEF, IU, PIB, worker_profiles, all personal.* schema tables

**Status:** RESOLVED. Awaiting founder and CTO confirmation.

---

### Overall Gate 2 Resolution Status

| Gap | Severity (doc 27) | Status |
|---|---|---|
| 1 — Worker personal data schema | CRITICAL | RESOLVED — personal schema defined (7 tables) |
| 2 — Score run lineage | HIGH | RESOLVED — gov.scoring_runs defined |
| 3 — Collective initiative schema | HIGH | RESOLVED — gov.collective_initiatives + gov.collective_initiative_companies defined |
| 4 — Explainability persistence | HIGH | RESOLVED — analytics.kora_index_explanations defined |
| 5 — Identity store completeness | HIGH | RESOLVED — identity tables updated |
| 6 — Founder Validation Cockpit placement | MEDIUM | RESOLVED — gov.validation_contacts defined |
| 7 — Index strategy confirmation | MEDIUM | RESOLVED provisionally — CTO index sign-off required |
| 8 — Company Finance scope | MEDIUM | RESOLVED — Section 26 clarified |

**Final technical consistency patch applied:**
- `gov.ingestion_batches.batch_id` naming normalized across all references (`source_ingestion_batch_ids`, `ingestion_batch_ids` in company_impact_aggregates and kora_indices)
- `analytics.company_impact_aggregates` and `analytics.kora_indices` updated to include `scoring_run_id` FK field (aligned with gate 2 lineage requirements)
- UEF review decision and scoring eligibility explicitly modeled: `review_decision` ENUM and `eligible_for_scoring` BOOLEAN added to `analytics.uef_records`; key constraints enforcing that only `eligible_for_scoring = TRUE` records generate Impact Units
- `gov.scoring_runs` `approved_uef_count` / `rejected_uef_count` / `flagged_uef_count` definitions updated to reference `review_decision` values
- UEF audit event types added: `uef_review_decision_changed`, `uef_record_approved_for_scoring`, `uef_record_rejected`, `uef_record_excluded`, `uef_record_flagged_pending_review`
- Employer-facing aggregate view requirements added to Section 26: five conceptual views defined (`company_kora_index_summary_view`, `company_activation_aggregate_view`, `company_finance_aggregate_view`, `company_contribution_aggregate_view`, `company_fiscal_classification_view`)
- Company Finance aggregate visibility confirmed through `analytics.company_finance_aggregate_view`; access statement updated to canonical form: "Company Finance is not blind to KORA value; it is blind to worker-level data"
- Index strategy updated for scoring eligibility and review decision fields

**Subject to founder and CTO confirmation, doc 12 is now eligible to serve as the authoritative source for `docs/22-foundation-light-sql-schema-specification.md`.**

No SQL generation may proceed until both founder and CTO have reviewed and confirmed this document including this Section 32.
