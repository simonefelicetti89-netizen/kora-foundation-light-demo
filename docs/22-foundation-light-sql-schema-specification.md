# KORA Foundation Light — SQL Schema Specification
## Document 22 — v0.1 Pre-Generation Draft
**Status:** Specification complete — awaiting Gate 2 (CTO) approval before SQL DDL generation
**Date:** 2026-05-17
**Authority:** This document bridges `docs/12-technical-data-model-database-schema.md` (Gate 2 Schema Gap Patch applied) and executable SQL generation. It is NOT executable SQL. It is the specification that governs SQL generation once Gate 2 is formally passed.

> **The Foundation Light SQL Schema Specification is complete enough to proceed to executable SQL generation only after explicit founder/CTO approval.**

---

## Section 1 — Executive Summary

KORA Foundation Light requires a two-database, six-schema PostgreSQL architecture. This specification defines every table, field, data type, constraint, index, conceptual view, role boundary, RLS policy, and migration dependency required to generate safe, correct, privacy-enforcing SQL DDL for Foundation Light v0.1.

**Verdict:** SPECIFICATION COMPLETE / SQL GENERATION BLOCKED — executable SQL generation requires explicit founder/CTO approval after review of Sections 24–27.

- This document is complete as a specification.
- Executable SQL DDL generation remains blocked pending Gate 2.
- Next step may be either: Phase 0 scaffold (see doc 26 / CLAUDE.md §10) or founder/CTO SQL approval.
- No SQL DDL, Prisma schema, or Supabase migration may be generated from this document without explicit founder/CTO approval.

### What this document defines

- All tables active in Foundation Light (6 schemas, ~70 tables)
- Full field-level type specifications for every table
- Primary key, foreign key, uniqueness, and check constraint requirements
- Index strategy per table
- Conceptual view requirements (employer-facing and internal)
- Role and grant boundary specifications (12 roles)
- Row-Level Security policy requirements per table
- Audit trail event obligations
- Seed data structure requirements
- Future-only and blocked entities (not to be created in Foundation Light)
- Migration order and dependency chain
- Implementation warnings (critical, high, standard)
- SQL generation readiness checklist

### What this document does NOT do

- Generate executable SQL DDL
- Generate Prisma schema files
- Generate Supabase migration files
- Create production backend code
- Change the KORA methodology
- Add KORA Index components beyond the canonical 10
- Expand Foundation Light scope beyond doc 22A

### Gate status at specification time

| Gate | Status | Blocker |
|---|---|---|
| Gate 1 — Founder decisions (D-01 to D-21) | CLOSED | No blocker |
| Gate 2 — CTO architecture review | OPEN | Blocks SQL DDL, Prisma, Supabase, production backend |
| Gate 3 — Legal/privacy counsel | OPEN | Blocks live data ingestion, real worker accounts |
| Gate 4 — Methodology numerical values | Provisionally satisfied | Delphi Study deferred post-pilot |
| Gate 5 — Tax/fiscal advisor | OPEN | Blocks live fiscal classification outputs |

> **Gate 2 status: OPEN / SPECIFICATION-ONLY AUTHORIZED.** This document is allowed as a pre-generation SQL specification. Gate 2 still blocks executable SQL DDL, Prisma models, Supabase migrations, production schema provisioning, and production backend code. Creation of this specification document does NOT constitute Gate 2 closure.

---

## Section 2 — Scope and Purpose

### Purpose

This specification translates the approved logical schema in `docs/12-technical-data-model-database-schema.md` (Gate 2 Schema Gap Patch + Final Consistency Patch, 2026-05-17) into a precise, implementation-ready blueprint for SQL DDL generation. It incorporates all 21 founder decisions (D-01 through D-21) from `docs/21-founder-gate-resolution-log.md`, all 8 CONDITIONAL GO resolutions (OQ-01 through OQ-08) from `docs/27-gate-2-cto-architecture-review-pack.md`, and all working rules defined in CLAUDE.md.

### Canonical inputs

| Doc | Role |
|---|---|
| `docs/10-architecture-v3-layer-specification.md` | 14-stage algorithm flow, canonical IU formula, KORA Index v3 structure — architectural requirements |
| `docs/12-technical-data-model-database-schema.md` | Primary source — all table definitions, field types, constraints, access rules |
| `docs/21-founder-gate-resolution-log.md` | Founder decisions D-01 through D-21 — resolved positions on all open questions |
| `docs/21b-methodology-risk-acceptance-and-provisional-score-policy.md` | calibration_status rules, Confidence Score inseparability, acceptable uses |
| `docs/22A-foundation-light-demo-build-cutline.md` | Build categories, exclusion rules |
| `docs/24-foundation-light-product-functional-spec.md` | 12 platform roles, permission matrix |
| `docs/26-foundation-light-technical-build-handoff.md` | Demo-to-production alignment, mock service contracts |
| `docs/27-gate-2-cto-architecture-review-pack.md` | Gate 2 CONDITIONAL GO conditions; all 8 resolved in doc 12 |

### Authority hierarchy

In cases of conflict, the following hierarchy governs:
1. Doc 21 (founder decisions) — highest authority
2. Doc 10 (architecture specification) — algorithm and formula definitions
3. Doc 12 (technical data model) — table, field, constraint definitions
4. Doc 21b (methodology governance) — score display and calibration_status rules
5. This document (doc 22) — SQL specification
6. All other docs

### Non-negotiable foundational rules

The following rules are not configurable and must be reflected in every SQL artifact:

1. **Canonical flow:** UEF → IU → PIB → Company Aggregation → Activation Safeguard → KORA Index. No step may be skipped.
2. **PIB is a mandatory intermediate layer.** Employer roles see only company-level aggregated output, never PIB records.
3. **KORA Index v3 has exactly 10 components:** AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS. Not 9. Not 11.
4. **Activation Safeguard is mandatory and non-bypassable.** It sits between Company Aggregation and KORA Index Engine for every scoring run.
5. **Confidence Score is inseparable from KORA Index output.** Every KORA Index record must have a linked confidence_score_id (NOT NULL).
6. **`calibration_status = 'pre_empirical_calibration'`** must appear as NOT NULL on all scoring-related tables. It is not a UI choice — it is a schema constraint.
7. **No external LLM API calls on HR/worker data.** The AI Ingestion Assistant uses a rule-based BCM taxonomy classifier only.
8. **Employer roles have ZERO GRANT — not just RLS — on:** `analytics.uef_records`, `analytics.impact_units`, `analytics.pib_records`, `analytics.worker_profiles`, and all `personal.*` tables.
9. **Financial and fiscal data does not feed the KORA Index.** No FK path from financial governance tables to `analytics.kora_indices.kora_index_value`.
10. **KORA Contribution is a companion indicator, not a KORA Index component.** No FK path from `analytics.kora_contributions` to `analytics.kora_indices.kora_index_value`.
11. **`gov.kip_records` must NOT be created.** KIP is a future-tier feature.
12. **No binary content in relational DB.** Evidence records store metadata and blob storage pointers only.
13. **Audit schema is INSERT-only** at the database role level. No UPDATE, no DELETE.
14. **Pseudonymization keys are held by KORA's internal privacy service**, not by the employer.
15. **No hardcoded methodology weights.** All weights are read from `gov.kora_index_weight_versions`.

---

## Section 3 — Database Topology

### Physical database structure

KORA Foundation Light uses two physically separate PostgreSQL databases.

**Database A — Identity Store**
- Physical: separate PostgreSQL instance or Supabase project
- Schema: `identity`
- Purpose: stores real-identity records for workers; connected to Database B only through KORA's internal pseudonymization service
- Tables: 2 (worker_identity_records, pseudonymization_key_references)
- Employer access: ZERO — no employer role has any permission on Database A under any circumstance
- Connection: pseudonymization service only; dual-access is not exposed to any other application process

**Database B — Platform**
- Physical: main PostgreSQL instance / Supabase project
- Schemas: 5 (gov, analytics, evidence, audit, personal)
- Purpose: all platform data — governance, scoring, evidence, audit, worker personal layer
- Tables: ~68 active tables at Foundation Light

### Schema inventory

| Schema | Physical DB | Active Tables | Role |
|---|---|---|---|
| `identity` | Database A | 2 | Worker identity (real names, contact info) |
| `gov` | Database B | ~38 | Governance, config, methodology, financial, eligibility, partners, reports |
| `analytics` | Database B | ~16 | Scoring pipeline — UEF through KORA Index |
| `evidence` | Database B | 1 | Impact evidence metadata and blob pointers |
| `audit` | Database B | 1 | Append-only audit trail |
| `personal` | Database B | 7 | Worker-owned personal layer (My KORA) |

### Cross-database communication rule

Database A and Database B communicate only through the pseudonymization service. This service:
- Receives a real worker identity on the Database A side
- Returns a `worker_pseudonym_id` on the Database B side
- Does not expose any dual-access path to application code
- Is the only process authorized to hold credentials to both databases simultaneously

No application service other than the pseudonymization service may connect to both databases.

### Supabase notes (for Gate 2 SQL generation)

- Each physical database maps to a separate Supabase project
- Database A Supabase project: Identity Store project
- Database B Supabase project: Platform project
- RLS is applied on Database B schemas (gov, analytics, evidence, audit, personal)
- Database A has no RLS — it is protected by role-level grant absence
- The `kora_audit_writer` database role in Database B has INSERT-only access to the `audit` schema

---

## Section 4 — Schema Creation Order

Schemas must be created in this exact order. Each schema may depend on tables in previously created schemas. Creating schemas out of order will cause FK resolution failures.

### Database A creation order

```
Step A-1: CREATE SCHEMA identity;
Step A-2: CREATE TABLE identity.worker_identity_records;
Step A-3: CREATE TABLE identity.pseudonymization_key_references;
```

### Database B creation order

```
Step B-01: CREATE SCHEMA gov;
Step B-02: CREATE SCHEMA analytics;
Step B-03: CREATE SCHEMA evidence;
Step B-04: CREATE SCHEMA audit;
Step B-05: CREATE SCHEMA personal;

Step B-06: gov reference/seed tables (no gov FKs):
  - gov.pillars
  - gov.fiscal_perimeters
  - gov.fiscal_category_thresholds

Step B-07: gov core config tables (FK to pillars):
  - gov.companies
  - gov.roles
  - gov.users
  - gov.partners

Step B-08: gov program and user tables (FK to companies, roles, users):
  - gov.company_programs
  - gov.user_roles
  - gov.partner_services

Step B-09: gov methodology version tables (no FK to analytics):
  - gov.methodology_versions
  - gov.bcm_versions
  - gov.bcm_entries
  - gov.nm_rules_versions
  - gov.nm_rules
  - gov.anti_gaming_rules_versions
  - gov.correction_factor_rule_versions
  - gov.kora_index_weight_versions
  - gov.methodology_version_components

Step B-10: gov ingestion tables (FK to companies, programs, users):
  - gov.data_sources
  - gov.raw_datasets
  - gov.ingestion_batches
  - gov.ingestion_batch_datasets
  - gov.ingestion_rejection_records

Step B-11: gov scoring lineage (FK to companies, programs, methodology):
  - gov.scoring_runs

Step B-12: gov financial tables (FK to companies, programs, methodology):
  - gov.financial_budgets
  - gov.financial_movements
  - gov.financial_governance_snapshots
  - gov.svam_configurations
  - gov.fuo_accounts

Step B-13: gov eligibility tables (FK to companies, programs, partners):
  - gov.company_program_perimeters
  - gov.eligibility_profiles
  - gov.eligibility_profile_versions
  - gov.policy_rules (future-only structure)
  - gov.fiscal_guardrails_rules (future-only structure)
  - gov.fiscal_guardrails_results (future-only structure)

Step B-14: gov partner and advisor tables:
  - gov.advisor_reviews
  - gov.advisor_review_evidence (after evidence schema exists)

Step B-15: gov collective initiative tables:
  - gov.collective_initiatives
  - gov.collective_initiative_companies

Step B-16: gov report tables (FK to kora_indices — create after analytics):
  - gov.reports
  - gov.report_exports
  - gov.welfare_statements
  - gov.validation_contacts

Step B-17: analytics worker tables (FK to companies, programs):
  - analytics.worker_profiles
  - analytics.workforce_segments

Step B-18: analytics pipeline tables (FK to worker_profiles, methodology, scoring_runs):
  - analytics.uef_records
  - analytics.pillar_mappings
  - analytics.impact_units

Step B-19: analytics aggregation tables (FK to scoring_runs):
  - analytics.pib_records
  - analytics.company_impact_aggregates
  - analytics.activation_safeguard_results

Step B-20: analytics confidence and index tables:
  - analytics.confidence_scores
  - analytics.kora_indices (FK to activation_safeguard_results, confidence_scores, scoring_runs)
  - analytics.kora_index_components
  - analytics.kora_index_explanations

Step B-21: analytics complementary indicators:
  - analytics.kora_contributions
  - analytics.kora_ecosystem_reach
  - analytics.kora_value_chain (structure only; status=not_calculated)

Step B-22: evidence schema:
  - evidence.evidence_records

Step B-23: audit schema:
  - audit.audit_trail_records

Step B-24: personal schema (all 7 tables):
  - personal.worker_cv_items
  - personal.worker_milestones
  - personal.worker_personal_plan_items
  - personal.worker_participation_requests
  - personal.worker_consent_records
  - personal.worker_data_control_preferences
  - personal.worker_export_records

Step B-25: gov.advisor_review_evidence (requires both gov.advisor_reviews and evidence.evidence_records)
Step B-26: gov.financial_governance_snapshots back-reference to analytics.kora_indices
Step B-27: gov.reports back-reference to analytics.kora_indices
```

---

## Section 5 — SQL Type Conventions and Custom Domains

### UUID convention

All primary keys use `UUID` generated by the database (`gen_random_uuid()` in PostgreSQL 13+ / Supabase). No application-generated UUIDs. No sequential integers as primary keys.

### Timestamp convention

All timestamp fields use `TIMESTAMPTZ` (timestamp with time zone). All times are stored in UTC. Application-layer conversion to local time is permitted for display only. `TIMESTAMP WITHOUT TIME ZONE` is prohibited.

### DECIMAL precision conventions

| Use case | Type |
|---|---|
| KORA Index value (0–100) | `DECIMAL(5,2)` |
| Confidence scores and component metrics (0.0000–1.0000) | `DECIMAL(5,4)` |
| Monetary amounts | `DECIMAL(15,2)` |
| Cost per IU and financial ratios | `DECIMAL(10,4)` |
| Methodology weights (must sum to 1.00) | `DECIMAL(5,4)` |
| IU value | `DECIMAL(10,4)` |
| Correction factors | `DECIMAL(5,4)` |
| Base contribution weight | `DECIMAL(5,4)` |

### TEXT vs VARCHAR

All variable-length text fields use `TEXT`. PostgreSQL `TEXT` has no performance penalty vs `VARCHAR(n)` and avoids artificial truncation constraints. `VARCHAR(n)` is not used in KORA schema unless a specific length constraint is part of the business rule (none identified in Foundation Light v0.1).

### BOOLEAN convention

All boolean fields are `BOOLEAN NOT NULL` with explicit `DEFAULT`. No nullable booleans. A nullable boolean creates a three-state value (TRUE / FALSE / NULL) which introduces ambiguity in access control logic. If "unknown" is a meaningful state, use an ENUM instead.

### ENUM convention

PostgreSQL native `CREATE TYPE ... AS ENUM(...)` is used for all ENUM fields. ENUM types are named descriptively. Naming convention: `kora_{domain}_{field}_enum`. Alternatively, `TEXT` with a `CHECK` constraint may be used where the set of values is expected to grow frequently — see Section 16 for guidance on when each approach is appropriate.

At Foundation Light v0.1, the following fields use CHECK-constrained TEXT rather than native ENUM to allow future value additions without `ALTER TYPE`:
- `audit.audit_trail_records.event_type` — extensible event type list
- `analytics.confidence_scores.entity_type` — may add entity types in future tiers
- `evidence.evidence_records.entity_type` — polymorphic reference field

All other ENUM fields use native PostgreSQL ENUM types.

### JSONB convention

`JSONB` is used for all structured JSON fields. `JSON` (without the B) is not used. JSONB enables indexing and efficient querying. JSONB fields that carry required structure (e.g., `component_explanations_json` must have exactly 10 component entries) are validated at the application layer at write time, not by database CHECK constraints, due to the complexity of JSONB structural validation in PostgreSQL. The application MUST validate JSONB structure before write.

### Array convention

PostgreSQL native arrays (`UUID[]`, `TEXT[]`, `ENUM[]`) are used for multi-value fields where:
- The array has no FK semantics (e.g., `gov.partners.operating_countries TEXT[]`)
- The array is read as a unit (e.g., `gov.partner_services.secondary_pillar_ids UUID[]`)

For arrays where individual elements need FK enforcement, a separate join table is used instead.

### Custom domain considerations

The following custom domains SHOULD be defined to enforce reuse consistency:

| Domain name | Base type | Constraint | Usage |
|---|---|---|---|
| `kora_calibration_status` | TEXT | CHECK IN ('pre_empirical_calibration', 'delphi_calibrated', 'empirically_validated') | All calibration_status columns |
| `kora_confidence_level` | TEXT | CHECK IN ('very_low', 'low', 'medium', 'high', 'very_high') | analytics.confidence_scores.confidence_level |
| `kora_pillar_code` | TEXT | CHECK IN ('LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY') | All pillar_primary, pillar_secondary columns |
| `kora_fiscal_category` | TEXT | CHECK IN 9 canonical categories | All fiscal_category columns |

Domain definition is recommended. If PostgreSQL domains are not used, each column using these values must carry an equivalent CHECK constraint.

---

## Section 6 — Global Constraints and Naming Rules

### Table naming convention

`{schema}.{noun_in_singular_or_plural_as_appropriate}`

Examples: `gov.companies`, `analytics.impact_units`, `audit.audit_trail_records`

No table name prefixes (no `tbl_`, no `t_`). No camelCase. Underscore-separated lowercase only.

### Column naming convention

Lowercase, underscore-separated. Descriptive. No abbreviations unless standard (id, uuid, json, url, ref).

**Primary key:** SQL implementation standard: primary keys SHOULD use `id` unless doc 12 explicitly defines a domain-specific primary key that is intentionally retained. If a domain-specific primary key is retained, every FK reference must use that exact name consistently. Before executable SQL generation, the SQL generator must produce a primary-key naming consistency table listing all exceptions.

Examples:
- `gov.companies.id`
- `gov.scoring_runs.id`
- `analytics.kora_indices.id`
- Retained exception, if any: `gov.ingestion_batches.batch_id` — only if explicitly preserved from doc 12

**Foreign keys:** named `{referenced_table_singular}_{pk_column}`. Examples:
- FK to `gov.companies.id` → column name: `company_id`
- FK to `gov.scoring_runs.id` → column name: `scoring_run_id`
- FK to `analytics.kora_indices.id` → column name: `kora_index_id`

### Timestamp convention (naming)

- Record creation: `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Last update: `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` — must be updated via trigger on every UPDATE
- Specific events: descriptive name (e.g., `generated_at`, `completed_at`, `revoked_at`)

The `updated_at` trigger must be defined for all tables that carry an `updated_at` column. A shared trigger function `set_updated_at()` returning `TRIGGER` should be created once and reused across all tables.

### NOT NULL policy

All columns are NOT NULL unless explicitly marked nullable in the table specification. If a column may legitimately have no value in some states, NULL is permitted with explicit documentation of when NULL is valid. Columns that appear nullable in doc 12 are marked `nullable` in the field tables; all other columns are NOT NULL.

### Default values

All boolean columns have explicit `DEFAULT TRUE` or `DEFAULT FALSE`. All timestamp columns have `DEFAULT now()` for `created_at`. No column has a default that masks a missing value that should be supplied explicitly (e.g., `calibration_status` has `DEFAULT 'pre_empirical_calibration'` but the application must not rely on the default — it must always supply the value explicitly).

### Soft delete convention

KORA does not use hard DELETE on most tables. Soft deletion uses status ENUM values (`archived`, `inactive`, `superseded`) or `is_active BOOLEAN` fields. The following tables are exceptions — records in these tables are NEVER deleted in any form:
- `audit.audit_trail_records` — INSERT-only; no delete mechanism
- `gov.eligibility_profile_versions` — all versions retained permanently
- `evidence.evidence_records` — retained after associated entity is soft-deleted
- `gov.reports` — historical reports retained; superseded = status update only

### Schema-level migration isolation

Each schema must be independently migratable. A migration touching only `gov` tables must not require changes to `analytics`, `evidence`, `audit`, or `personal` schemas. Cross-schema FKs are defined but migration files must be structured to minimize cross-schema dependencies.

### Row-level security enablement

RLS must be explicitly enabled on all tables in `gov`, `analytics`, `evidence`, and `personal` schemas using `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY`. The `audit` schema tables have RLS DISABLED — they are protected by role-level INSERT-only grants, not RLS. See Section 20 for full RLS policy specifications.

---
