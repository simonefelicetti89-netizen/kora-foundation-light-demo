# KORA Foundation Light — Phase 1B Seed Expansion Plan
**Document:** `docs/phase-1b-seed-expansion-plan.md`
**Type:** Build Plan — Synthetic Seed File Generation Scope
**Audience:** Claude Code, Build Lead, Demo Operator
**Status:** v1.0 — Approved Reference for Phase 1B Seed Generation
**Gate dependency:** Gate 2 OPEN (SQL blocked). Seed JSON generation is not blocked.

---

## 1. Executive Summary

Phase 1B expands the synthetic seed layer from 9 existing files to cover the next set of company workspace screens: C-03 (KORA Contribution), C-05 (Pillars & Initiatives), C-06 (Data & Evidence), and C-08 (Financial Governance Light). C-04 (Activation & Participation) and C-07 (Warnings & Next Actions) are already adequately served by existing seed files.

This plan evaluates 6 proposed seed files and makes a generate-now vs. defer decision for each. Four files are approved for Phase 1B generation. Two are deferred.

**Bottom line:**

| File | Decision |
|---|---|
| `kora-contribution-outputs.json` | **Generate now** |
| `collective-initiatives.json` | **Generate now** |
| `source-batches.json` | **Generate now** |
| `financial-governance.json` | **Generate now** |
| `uef-records.json` | **Defer to Phase 1C** |
| `fiscal-classification-map.json` | **Defer to Phase 1D** |

**Constraint reminder:** No SQL, Prisma, Supabase, production backend, or real auth. No real personal data. No methodology weights hardcoded outside `lib/methodology-config/v0.1.ts`. No KORA Contribution merged into KORA Index. No PIB in employer-facing views. All seed objects must carry the mandatory synthetic metadata fields per `docs/synthetic-seed-file-plan.md` Section 5.

---

## 2. Phase 1B Screen Coverage

| Screen ID | Name | Priority | MVP Status | Currently Served? | Seed Gap |
|---|---|---|---|---|---|
| C-03 | KORA Contribution & Collective Initiatives | P2 | Semi-Functional Preview | No | `kora-contribution-outputs.json`, `collective-initiatives.json` |
| C-04 | Activation & Participation | P1 | Functional Core | **Yes** — `company-aggregates.json` sufficient | None |
| C-05 | Pillars & Initiatives | P1 | Functional Core | Partially — `programs.json` + `company-aggregates.json` exist; initiative table empty | `collective-initiatives.json` |
| C-06 | Data & Evidence | P1 | Functional Core | No | `source-batches.json` |
| C-07 | Warnings & Next Actions | P1 | Functional Core | **Yes** — `ExplainabilityService.getWarnings()` derives from `explainability-records.json` | None |
| C-08 | Financial Governance Light | P2 | Semi-Functional Preview | No | `financial-governance.json` |

**C-04 coverage note:** `company-aggregates.json` already provides `activation_rate`, `meaningful_activation_rate`, `continuity_rate`, `verification_rate`, `pillar_distribution`, and `department_activation`. The existing `app/company/activation/page.tsx` skeleton is already wired. No new seed file is required.

**C-07 coverage note:** `ExplainabilityService.getWarnings()` derives warnings from `weak_components` in `explainability-records.json` (already exists). No new seed file is required for Phase 1B.

---

## 3. Proposed New Seed Files

Four files are approved for Phase 1B. Each section below specifies: purpose, privacy classification, scenario coverage, structural requirements, the service that owns it, and the Phase 1B screens it unlocks.

---

## 4. File 1 — `kora-contribution-outputs.json`

**Purpose:** KORA Contribution outputs per scenario — the companion indicator for collective and ecosystem contribution. Kept strictly separate from KORA Index.

**Privacy classification:** LOW — employer-facing, no individual worker data. Aggregate participation counts only.

**Unlocks:** C-03 (primary), C-01 Executive Cockpit KORA Contribution widget (enrichment).

**Primary service consumer:** `KoraContributionService`

**Scenario coverage required:** S1 (WARNING state), S2 (CLEAR state). S3/S4 optional.

**Constitutional rule:** KORA Contribution is a companion indicator. It must never be added to KORA Index computation. It must never appear as an 11th KORA Index component. Every record in this file must carry a `is_kora_index_component: false` field as an explicit machine-readable guard.

**Mandatory microcopy embedded in each record:**
```
"companion_label": "KORA Contribution measures verified collective contribution beyond the company perimeter. It complements the KORA Index — it does not replace it."
```

**Structure requirements:**

```json
{
  "file": "kora-contribution-outputs.json",
  "version": "1.0",
  "synthetic_demo_data": true,
  "generated_for": "foundation_light_demo",
  "not_live_data": true,
  "primary_consumer": "KoraContributionService",
  "data": [
    {
      "id": "kora-contrib-S1-meridiana-2025",
      "company_id": "meridiana-group",
      "scenario_id": "S1",
      "reporting_period": "Q1–Q3 2025",
      "methodology_version_id": "KORA Methodology v0.1",
      "calibration_status": "pre_empirical_calibration",
      "is_kora_index_component": false,
      "companion_label": "KORA Contribution measures verified collective contribution beyond the company perimeter. It complements the KORA Index — it does not replace it.",
      "contribution_score": 0,
      "contribution_level": "minimal",
      "collective_initiatives_count": 0,
      "verified_initiative_participations": 0,
      "cross_company_initiatives_count": 0,
      "ecosystem_partners_active": 0,
      "contribution_explanation": "...",
      "synthetic_demo_data": true,
      "generated_for": "foundation_light_demo",
      "not_live_data": true
    },
    {
      "id": "kora-contrib-S2-meridiana-2025",
      "scenario_id": "S2",
      ...
    }
  ]
}
```

**S1 values (WARNING state, no active collective initiatives):**
- `contribution_score`: low (e.g., 8–15 out of 100)
- `contribution_level`: `"minimal"`
- `collective_initiatives_count`: 0 or 1 (planning stage)
- `verified_initiative_participations`: 0
- `cross_company_initiatives_count`: 0
- `ecosystem_partners_active`: 2

**S2 values (CLEAR state, Communitas collective initiative active):**
- `contribution_score`: moderate (e.g., 34–42 out of 100)
- `contribution_level`: `"emerging"`
- `collective_initiatives_count`: 2
- `verified_initiative_participations`: 28 (aggregate count — no worker names)
- `cross_company_initiatives_count`: 1 (Meridiana + Communitas Cooperativa joint initiative)
- `ecosystem_partners_active`: 4

---

## 5. File 2 — `collective-initiatives.json`

**Purpose:** Collective initiative records: definition, pillar, territory, participating companies, aggregate participation counts, verification status, KORA Contribution relevance.

**Privacy classification:** LOW — aggregate participation counts are employer-facing. Individual worker participation is never included in this file.

**Unlocks:** C-03 (initiative list), C-05 (initiative portfolio table in Pillars & Initiatives).

**Primary service consumer:** `KoraContributionService` (primary), `DemoDataService` (secondary — for C-05 initiative table).

**Scenario coverage:** Some initiatives span all scenarios (`scenario_id: "all"`). Some are S2-only (reflecting post-improvement state).

**Individual privacy rule:** This file must contain only aggregate counts (e.g., `participation_count: 28`). It must never contain `worker_id`, `worker_pseudonym_id`, or any reference to a specific worker's participation. Individual worker participation status lives in `booking-requests.json` (worker-private, deferred to Phase 1E).

**Structure requirements:**

```json
{
  "file": "collective-initiatives.json",
  "version": "1.0",
  "synthetic_demo_data": true,
  "generated_for": "foundation_light_demo",
  "not_live_data": true,
  "primary_consumer": "KoraContributionService",
  "data": [
    {
      "id": "init-001",
      "scenario_id": "S2",
      "name": "...",
      "pillar": "IMPACT",
      "territory": "Bergamo Province",
      "companies_involved": ["meridiana-group", "communitas-cooperativa"],
      "partner_id": "...",
      "status": "active",
      "aggregate_participation_count": 28,
      "verification_status": "partial",
      "advisor_validation_status": "pending",
      "kora_contribution_relevant": true,
      "description": "...",
      "synthetic_demo_data": true,
      "generated_for": "foundation_light_demo",
      "not_live_data": true
    }
  ]
}
```

**Required records:** 5 initiatives total:
- 1 cross-company initiative (Meridiana + Communitas Cooperativa) — S2 only, IMPACT pillar, active, partially verified
- 1 single-company initiative (Meridiana, LEGACY pillar) — S2 only, completed, advisor validated
- 1 initiative in planning stage — S1 + S2, GROWTH pillar, status: planning
- 1 initiative completed — all scenarios, CONNECTION pillar, archived
- 1 initiative from partner — S2 only, LIFE pillar, active

**Employer microcopy requirement:** Every record displayed in C-03 or C-05 must show the privacy notice: *"Your employer will not see individual participation. Only aggregate counts above privacy thresholds are shown."*

---

## 6. File 3 — `source-batches.json`

**Purpose:** Ingestion batch metadata — simulates what appears in the Data & Evidence screen (C-06). Contains source-level completeness, quality scores, mapping confidence, and batch status. Does not contain individual UEF records or worker-level event data.

**Privacy classification:** MEDIUM — batch metadata is not individually sensitive, but this file is in the Medium tier because it shows ingestion provenance. Accessible to employer HR roles and Admin. Not accessible to employer Viewer roles without explicit role check.

**Unlocks:** C-06 (Data & Evidence — source inventory, completeness table, pending review status).

**Primary service consumer:** `IngestionSimulatorService`

**Key distinction from `uef-records.json`:** `source-batches.json` contains batch-level summaries (file name, row count, quality score, mapping confidence per source). It does NOT contain individual event records or `worker_pseudonym_id` fields. Those live in `uef-records.json` (deferred). C-06 can be powered entirely by `source-batches.json`.

**Scenario coverage:** S1 (baseline data quality), S2 (improved data quality).

**Structure requirements:**

```json
{
  "file": "source-batches.json",
  "version": "1.0",
  "synthetic_demo_data": true,
  "generated_for": "foundation_light_demo",
  "not_live_data": true,
  "primary_consumer": "IngestionSimulatorService",
  "data": [
    {
      "id": "batch-welfare-S1-001",
      "scenario_id": "S1",
      "source_type": "welfare_provider",
      "source_name": "Welfare Provider Export — Q1–Q3 2025",
      "file_reference": "raw-welfare-export.sample.json",
      "row_count": 312,
      "mapped_count": 287,
      "rejected_count": 25,
      "completeness_pct": 0.92,
      "mapping_confidence_avg": 0.78,
      "evidence_attached_pct": 0.41,
      "pending_review_count": 34,
      "batch_status": "partially_reviewed",
      "ingestion_date": "2025-09-15",
      "synthetic_demo_data": true,
      "generated_for": "foundation_light_demo",
      "not_live_data": true
    }
  ]
}
```

**Required sources per scenario:**
- `welfare_provider` — core source, partially verified
- `lms_training` — good completeness, high mapping confidence
- `hris_population` — headcount/department, complete
- `esg_initiatives` — partial, pending advisor review
- `partner_events` — low completeness in S1, improving in S2
- `manual_upload` — low confidence, high self-declared share

**S1 vs S2 contrast:** S2 batch records must show improved completeness, higher evidence attachment, and reduced pending review counts vs S1 — this powers the narrative that Data & Evidence improved between scenarios.

---

## 7. File 4 — `uef-records.json`

**Decision: DEFER to Phase 1C.**

**Reason for deferral:**

`uef-records.json` contains event-level UEF records with `worker_pseudonym_id` fields. Its primary consumers are `UEFReviewService` (A-05) and `ScoringSimulatorService` (A-06) — Admin-only screens. These are not Phase 1B screens.

C-06 (Data & Evidence) can be fully served by `source-batches.json` (batch-level summaries), which does not require individual event records. No Phase 1B company screen requires event-level UEF data.

Generating `uef-records.json` now would create a high-sensitivity file (MEDIUM — event-level, `worker_pseudonym_id`) before any screen that consumes it (A-05, A-06) is being built. This increases privacy risk surface with no current build benefit.

**Defer to:** Phase 1C — Admin workspace screens (A-03 through A-07).

**Pre-condition before generation:**
- `UEFReviewService` must be built and ready to consume the file
- Admin workspace routing must be in place
- Role check `RolePermissionService.canAccess('kora_admin', 'uef_records')` must be implemented before the service reads this file

---

## 8. File 5 — `financial-governance.json`

**Decision: Generate now.**

**Purpose:** Financial governance data for C-08 (Financial Governance Light, P2, Semi-Functional Preview). Covers budget allocated vs. used per pillar, cost per IU (informational indicator), initiative budget breakdown.

**Privacy classification:** LOW for aggregate budget data. Accessible to Finance role and above. Not accessible to Company Viewer role.

**Gate considerations:** Gate 5 (tax/fiscal advisor) is open, which blocks live fiscal/tax outputs and automated guardrail enforcement. However, C-08 displays informational budget governance data only — no tax advice, no live fiscal outputs, no automated enforcement. Gate 5 does not block generating synthetic governance data for a demo screen. The `fiscal-classification-map.json` file (C-09) is a different matter — see Section 9.

**Unlocks:** C-08 Financial Governance Light.

**Primary service consumer:** New `FinancialGovernanceService` (to be created in Phase 1B implementation — read from this file, enforce Finance role check before returning data).

**Role access rule:** Only roles `company_finance`, `company_admin`, `kora_admin` may receive output from this service. `company_viewer`, `company_hr`, partner roles, and worker roles must receive suppressed state.

**Structure requirements:**

```json
{
  "file": "financial-governance.json",
  "version": "1.0",
  "synthetic_demo_data": true,
  "generated_for": "foundation_light_demo",
  "not_live_data": true,
  "primary_consumer": "FinancialGovernanceService",
  "data": [
    {
      "id": "fin-gov-S1-meridiana-2025",
      "company_id": "meridiana-group",
      "scenario_id": "S1",
      "reporting_period": "Q1–Q3 2025",
      "budget_allocated_total": 185000,
      "budget_used_total": 112000,
      "budget_committed_total": 28000,
      "budget_residual": 45000,
      "cost_per_iu_indicator": 14.2,
      "cost_per_iu_note": "Informational dashboard indicator only. Not a certified financial metric.",
      "pillar_budget": {
        "LIFE": { "allocated": 62000, "used": 41000 },
        "GROWTH": { "allocated": 48000, "used": 32000 },
        "CONNECTION": { "allocated": 22000, "used": 18000 },
        "IMPACT": { "allocated": 31000, "used": 15000 },
        "LEGACY": { "allocated": 22000, "used": 6000 }
      },
      "kora_billing": {
        "subscription": 4800,
        "setup": 1200,
        "advisory": 2400
      },
      "disclaimer": "Budget figures are informational only. KORA does not handle fund custody, payment execution, or financial settlement.",
      "synthetic_demo_data": true,
      "generated_for": "foundation_light_demo",
      "not_live_data": true
    }
  ]
}
```

**S2 variant:** Increase `budget_used_total` and adjust pillar breakdown to show more even distribution across pillars — consistent with S2 narrative of improved activation balance.

**Mandatory disclaimer on C-08 UI:** `"Budget figures are informational only. KORA does not handle fund custody, payment execution, or financial settlement."`

---

## 9. File 6 — `fiscal-classification-map.json`

**Decision: DEFER to Phase 1D.**

**Reason for deferral:**

C-09 (Fiscal Classification) is rated P3 in doc 24 Screen Inventory — the lowest priority in the company workspace. Gate 5 (tax/fiscal advisor, currently OPEN) explicitly blocks live fiscal/tax classification outputs and automated guardrail enforcement.

While C-09 is informational only and carries a disclaimer, generating `fiscal-classification-map.json` now, before the corresponding service (`FiscalClassificationService`) or screen (C-09) is built, adds seed data with no immediate build benefit. The fiscal classification data is also the most legally sensitive of the 29 seed files in terms of potential misinterpretation (even synthetic fiscal classification examples can create confusion about KORA's advisory scope).

**Defer to:** Phase 1D — P3 screens, after Gate 5 closes or an explicit decision is made to proceed with informational-only C-09.

**Pre-condition before generation:**
- Gate 5 review completed or explicit founder decision that informational C-09 is safe to build
- `FiscalClassificationService` implemented with mandatory disclaimer enforcement
- C-09 screen built and labeled as informational only

---

## 10. Service Impact

The four new seed files require the following service changes in Phase 1B implementation:

| Service | Action Required | Reads New File | Notes |
|---|---|---|---|
| `KoraContributionService` | Full implementation (currently stub) | `kora-contribution-outputs.json`, `collective-initiatives.json` | Must return companion indicator separate from KORA Index. Never merge into scoring. |
| `IngestionSimulatorService` | Add `getBatchSummaries(companyId, scenarioId)` method | `source-batches.json` | Employer HR role check required before returning data. |
| `DemoDataService` | Add `getCollectiveInitiatives(companyId, scenarioId)` method | `collective-initiatives.json` (secondary consumer) | Returns aggregate counts only. No worker-level participation data. |
| `FinancialGovernanceService` | Create new service | `financial-governance.json` | Finance role check: only `company_finance`, `company_admin`, `kora_admin` get data. Others get suppressed state. |
| `RolePermissionService` | Add `financial_governance` resource to permission matrix | — | Finance role only. |
| `ScoringSimulatorService` | No change | — | Already reads from existing seed files. |
| `ExplainabilityService` | No change | — | `getWarnings()` already implemented. |

**New service to create:** `FinancialGovernanceService` at `/services/financial-governance/FinancialGovernanceService.ts`.

---

## 11. Privacy and Access Rules

### `kora-contribution-outputs.json`
- Employer-facing: YES (aggregate companion indicator)
- Role access: all company roles and above
- Individual worker data present: NO — must be enforced structurally (no `worker_id`, no `worker_pseudonym_id` fields in any record)
- Seed file import rule: May be imported by `KoraContributionService`. Must not be imported directly by any component.

### `collective-initiatives.json`
- Employer-facing for aggregate counts: YES (participation_count, verification_status)
- Individual participation: NO — file must not contain any worker-level participation record
- Role access: all company roles and above for aggregate fields; Admin for full record
- Seed file import rule: May be imported by `KoraContributionService` (primary) and `DemoDataService` (secondary — for initiative list in C-05). Must not be imported directly by any component.

### `source-batches.json`
- Employer-facing: YES — but restricted to HR/Admin roles for batch metadata
- Company Viewer role: suppressed — receives privacy boundary notice
- Individual worker data present: NO — batch-level summaries only
- Seed file import rule: May be imported by `IngestionSimulatorService` only. Must not be imported directly by any component.

### `financial-governance.json`
- Employer-facing: YES — Finance role only
- Company Viewer, HR, and worker roles: suppressed — `FinancialGovernanceService` returns null + `access_denied` flag
- Gate 5 scope: This file contains informational budget governance data, not live tax/fiscal outputs. Gate 5 does not block generation or display — it blocks live enforcement and tax advice. C-08 must display its disclaimer on every surface.
- Seed file import rule: May be imported by `FinancialGovernanceService` only.

### Forbidden imports in employer-facing components
The following imports remain forbidden in any file under `app/company/`, `app/partner/`, or `app/advisor/`:

```typescript
// Still forbidden — no change from Phase 1A
import workers from '@/data/synthetic/workers.json'
import pibRecords from '@/data/synthetic/pib-records.json'
import impactUnits from '@/data/synthetic/impact-units.json'
import dynamicCvItems from '@/data/synthetic/dynamic-cv-items.json'
import bookingRequests from '@/data/synthetic/booking-requests.json'
import consentRecords from '@/data/synthetic/consent-records.json'
import milestones from '@/data/synthetic/milestones.json'
```

---

## 12. Validation Checklist for Phase 1B Seed Generation

Before Phase 1B screen implementation begins, each generated seed file must pass this checklist:

### Per-file checks

```
✓ Top-level metadata wrapper present: file, version, synthetic_demo_data, generated_for, not_live_data, primary_consumer
✓ Every record has: id, synthetic_demo_data: true, scenario_id, generated_for, not_live_data: true
✓ At minimum S1 and S2 records present for scoring-relevant files
✓ No real personal names, email addresses, phone numbers, tax codes, or real financial figures
✓ No worker_id or worker_pseudonym_id in collective-initiatives.json or financial-governance.json
✓ No methodology weights hardcoded in seed files (methodology weights live in lib/methodology-config/v0.1.ts only)
✓ kora-contribution-outputs.json: is_kora_index_component: false present on every record
✓ financial-governance.json: disclaimer field present on every record
✓ S1 and S2 values tell a coherent narrative (S1 worse, S2 improved) consistent with existing kora-index-outputs.json
```

### Cross-file consistency checks

```
✓ collective-initiatives.json initiative IDs referenced in kora-contribution-outputs.json exist in the file
✓ source-batches.json completeness_pct values are consistent with confidence-records.json data_completeness values
✓ financial-governance.json budget_allocated_total is consistent with programs.json budget fields
✓ S2 kora-contribution-outputs.json contribution_score is higher than S1 (improvement narrative)
✓ S2 source-batches.json completeness is higher than S1 (improvement narrative)
```

### Service integration checks (before screen implementation)

```
✓ KoraContributionService reads kora-contribution-outputs.json and collective-initiatives.json — no direct component import
✓ IngestionSimulatorService reads source-batches.json — no direct component import
✓ FinancialGovernanceService created, reads financial-governance.json, enforces Finance role check
✓ RolePermissionService updated with financial_governance resource
✓ No employer-facing component contains a direct import of any newly generated seed file
✓ TypeScript compiles without errors after service changes (tsc --noEmit passes)
```

---

## 13. Recommendation

### Generate in Phase 1B (in this order)

1. **`kora-contribution-outputs.json`** — Required for C-03 and C-01 enrichment. Low complexity. No privacy risk.
2. **`collective-initiatives.json`** — Required for C-03 and C-05. Aggregate-only. No privacy risk.
3. **`source-batches.json`** — Required for C-06. Batch-level metadata only. Medium classification but no individual data.
4. **`financial-governance.json`** — Required for C-08. Finance role only. Budget narrative must be consistent with programs.json and scenario progression.

### Defer

5. **`uef-records.json`** — Defer to Phase 1C (Admin screens A-03 to A-07). No Phase 1B screen needs it. High-sensitivity; generate only when UEFReviewService is ready.
6. **`fiscal-classification-map.json`** — Defer to Phase 1D (P3 screens). Gate 5 open. No screen consuming it is in scope for Phase 1B.

### Phase 1B seed generation can proceed immediately.

The four approved files are low-to-medium sensitivity, involve no individual worker data (except source-batches.json which has no worker fields), and are required by Phase 1B screens. Generating them now unblocks C-03, C-05, C-06, and C-08 screen implementation.

**Suggested generation prompt:**

> "Generate synthetic seed file: `kora-contribution-outputs.json` — follow `docs/synthetic-seed-file-plan.md` Section 7 structure requirements, Section 4 File 1 of `docs/phase-1b-seed-expansion-plan.md` for field specification, and doc 25 for scenario values. S1 and S2 required. KORA Contribution is a companion indicator — never a KORA Index component."

Repeat for each of the four files in order.

---

**Document version:** v1.0
**Date:** 2026-05-18
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN (SQL blocked) · Gate 3 OPEN · Gate 5 OPEN
**Phase 1A status:** Complete — C-01, C-02, C-07 built and QA-passed
**Phase 1B seed generation:** Ready to proceed for 4 approved files
**Next action:** Generate `kora-contribution-outputs.json` per Section 4 of this document
