# KORA Foundation Light — Synthetic Seed File Plan
**Document:** `docs/synthetic-seed-file-plan.md`
**Type:** Synthetic Data Design — Local Demo Seed Files
**Audience:** Claude Code, Frontend Developer, Demo Operator
**Status:** v1.0 — Active Build Reference
**Gate dependency:** GO FOR DEMO APP WITH SYNTHETIC DATA. These are local demo files. SQL blocked until Gate 2.

---

## 1. Seed Data Principle

All seed data in KORA Foundation Light must comply with the following rules without exception:

**Synthetic only.** No real personal data. No real company confidential data. No real worker identities. All names, addresses, worker records, company details, and events are fabricated.

**Clearly labeled synthetic.** Every seed object must include:
```json
{
  "synthetic_demo_data": true,
  "scenario_id": "S1",
  "generated_for": "foundation_light_demo",
  "not_live_data": true
}
```

**Not production schema.** The field names in seed JSON files are demo-layer shapes designed to power mock services. They are NOT database column names. They must not be used to derive Prisma models, Supabase tables, or SQL DDL. Production schema is governed by `docs/12-technical-data-model-database-schema.md` and will be specified in `docs/22-foundation-light-sql-schema-specification.md` after Gate 2 closes.

**Not final DB shape.** Seed file structure may diverge from production column names. This is intentional. The demo layer optimizes for service readability; the production schema optimizes for normalization, privacy enforcement, and query performance.

**Local demo only.** These files live in `/data/synthetic/` inside the demo app repository. They are not uploaded to any production environment, staging environment, or cloud database. Separate seed scripts with separate environment flags govern production demo data loading — not these files.

**Worker records are pseudonymized.** No worker seed record contains a real name, real ID number, real address, or any real personal data. Worker names are clearly synthetic (e.g., "Worker A-043", "Persona: Elena M."). No field that could identify a real person is present.

---

## 2. Required Seed Files Table

All 29 files must exist in `/data/synthetic/` before P1 screen implementation begins.

| # | File | Purpose | Used By Screens | Contains Sensitive-Like Demo Data? | Employer-Facing? | Notes |
|---|---|---|---|---|---|---|
| 1 | `companies.json` | 4 synthetic company profiles with sector, territory, headcount, program status | Executive Cockpit, KORA Index, Reports, Founder Validation | No | Yes (aggregate only) | Primary: Meridiana Group S.r.l. |
| 2 | `workers.json` | 250 synthetic worker records for Meridiana Group | My KORA (worker-self), Scoring Simulator, PIB (internal only) | Yes — worker-private | No — never employer-facing | Pseudonymized. Never imported by company-facing components. |
| 3 | `departments-sites.json` | 5 departments, 3 sites with workforce distribution | Activation & Participation, Scoring Run, Executive Cockpit | No | Yes (aggregate) | Used for department-level breakdown (group size ≥ 10 check required) |
| 4 | `programs.json` | 8 people/welfare programs with budget, pillar mapping, source type | AI Upload Studio, Executive Cockpit, Financial Governance Light | No | Yes | Programs are employer-visible by design |
| 5 | `source-batches.json` | Ingestion batch metadata: source type, file name, row count, quality score, batch status | AI Upload Studio, UEF Review, Admin Dashboard | No | Yes (Admin/HR only) | Employer HR role can see batch metadata — not worker records inside |
| 6 | `raw-welfare-export.sample.json` | Pre-mapping welfare provider export (unmapped headers, sample rows) | AI Upload Studio, AI Mapping Review | No — column headers only | Yes (HR/Admin only) | Simulates what a raw CSV looks like before BCM classifier runs |
| 7 | `raw-lms-export.sample.json` | Pre-mapping LMS training completion export (unmapped) | AI Upload Studio, AI Mapping Review | No — column headers only | Yes (HR/Admin only) | Simulates LMS source format |
| 8 | `raw-hris-population.sample.json` | Pre-mapping HR system headcount/department export (unmapped) | AI Upload Studio, AI Mapping Review | No | Yes (HR/Admin only) | Department/headcount mapping — no individual worker PII |
| 9 | `raw-esg-initiatives.sample.json` | Pre-mapping ESG initiative records (unmapped) | AI Upload Studio, AI Mapping Review | No | Yes (HR/ESG only) | Collective initiative data before mapping |
| 10 | `raw-partner-events.sample.json` | Pre-mapping partner activity records (unmapped) | AI Upload Studio, AI Mapping Review | No | Yes (Admin only) | Partner event data before pillar classification |
| 11 | `uef-records.json` | Approved UEF records after mapping and human review | UEF Review, Scoring Run, Admin Dashboard | Partially — event-level records | No — Admin/KORA only (not employer company roles) | `review_decision` + `eligible_for_scoring` fields required per event |
| 12 | `impact-units.json` | Computed IU records per event per pillar | Scoring Run (formula trace), Explainability, Admin only | Yes — worker-level computation | No — internal only | Never surfaced to employer roles. Feeds PIB computation. |
| 13 | `pib-records.json` | Personal Impact Balance per worker per pillar | My KORA Home, Scoring Simulator (internal), DynamicCVService | Yes — worker-private | No — worker-self and internal only | PIB is a mandatory intermediate layer — never employer-visible. DynamicCVService is the only external consumer. |
| 14 | `company-aggregates.json` | Company-level aggregation derived from worker PIBs | Executive Cockpit, Activation & Participation, Reports | No | Yes — employer-facing aggregate | Must not contain any individual worker data |
| 15 | `kora-index-outputs.json` | KORA Index outputs for S1 (WARNING, index ~47) and S2 (CLEAR, index ~64) scenarios | Executive Cockpit, KORA Index Detail, Reports | No | Yes — employer-facing | Must include all 10 components, CS, calibration_status, methodology_version_id, safeguard_status |
| 16 | `kora-contribution-outputs.json` | KORA Contribution outputs (collective + ecosystem) — separate from KORA Index | Executive Cockpit (companion panel), KORA Index Detail | No | Yes — employer-facing companion | Must be labeled as companion indicator. Never merged into KORA Index. |
| 17 | `activation-safeguard-results.json` | Activation Safeguard results: AR, MAR, status (WARNING/CLEAR) per scenario | Executive Cockpit, KORA Index Detail, Explainability | No | Yes — employer-facing | S1: AR=0.38, MAR=0.22 → WARNING. S2: AR=0.52, MAR=0.38 → CLEAR. |
| 18 | `explainability-records.json` | Plain-language explanation records per scenario | KORA Index Detail, Explainability Panel | No | Yes — employer-facing | Must include per-component explanations + limitations statement |
| 19 | `confidence-records.json` | Confidence Score computation detail per scenario | KORA Index Detail, Executive Cockpit | No | Yes — employer-facing | CS is always shown alongside KORA Index — never omitted |
| 20 | `partner-catalog.json` | 12 synthetic partners: service types, pillar mapping, eligibility confidence, verification status | Partner Workspace, Opportunities (worker), Collective Events | No | Partial — catalog is visible; individual partner-worker interactions are not | Partners are not marketplace vendors — no pricing, no availability |
| 21 | `opportunities.json` | Opportunity matching per worker persona | My KORA Opportunities | No | No — worker-only | Matched by pillar gap in worker's PIB. Never employer-visible. |
| 22 | `collective-initiatives.json` | 5 collective impact initiatives with participation counts and cross-company data | KORA Contribution panel, Collective Impact Events (My KORA), Admin Dashboard | No | Partial — participation counts are employer-visible (aggregate); individual participation is not | Cross-company initiatives included (Meridiana + Communitas Cooperativa) |
| 23 | `booking-requests.json` | Booking Light state machine records per worker persona | My KORA Bookings, BookingRequestService | Yes — worker-private | No — worker-self only | Status: requested / confirmed / completed / cancelled. No pricing. |
| 24 | `dynamic-cv-items.json` | Dynamic CV items per worker persona: skills, certifications, participation milestones | My KORA Dynamic CV, DynamicCVService | Yes — worker-private | No — worker-self only | Employer cannot see this under any path |
| 25 | `milestones.json` | Worker milestone timeline items: pillar achievements, activation moments | My KORA Home timeline, DynamicCVService | Yes — worker-private | No — worker-self only | Worker-generated, worker-owned |
| 26 | `consent-records.json` | Worker consent and sharing preferences per data type | Privacy & Sharing, DynamicCVService, BookingRequestService | Yes — worker-private | No — worker-self only | Worker controls what is shared and with whom |
| 27 | `advisor-reviews.json` | Advisor review queue: events under review, evidence refs, eligibility confidence, recommendations | Advisor Workspace, Admin Dashboard (review status) | No — event-level metadata | Partial — admin sees queue status; employer sees aggregate VR impact only | Advisors validate evidence quality — they do not see individual worker identity |
| 28 | `reports.json` | 8 report type templates with section data for all company profiles | Company Reports, Admin Dashboard | No | Yes — employer-facing | Role-filtered: Company Finance gets financial view; Company Viewer gets summary only |
| 29 | `founder-validation-contacts.json` | 25 validation contacts: name, company, role, pipeline stage, objections, revenue signals | Founder Validation Cockpit | No — external contacts | No — Admin/Founder only | Internal commercial pipeline data — never visible to company or worker roles |

---

## 3. Privacy Classification

Seed files are classified by the privacy sensitivity of their demo-like content. This classification determines which services may access them and which roles may receive their output.

### Low Sensitivity — Accessible to employer-facing services (with role check)

These files contain no worker-private data and may be consumed by services that serve employer-facing components.

```
companies.json
programs.json
departments-sites.json
partner-catalog.json
collective-initiatives.json
reports.json
kora-index-outputs.json
kora-contribution-outputs.json
activation-safeguard-results.json
explainability-records.json
confidence-records.json
company-aggregates.json
```

### Medium Sensitivity — Admin/KORA-only access (not employer company roles)

These files contain event-level or batch-level data that should not be surfaced to employer-facing views without explicit KORA Admin or KORA HR intermediary services.

```
source-batches.json
raw-welfare-export.sample.json
raw-lms-export.sample.json
raw-hris-population.sample.json
raw-esg-initiatives.sample.json
raw-partner-events.sample.json
uef-records.json
advisor-reviews.json
opportunities.json
founder-validation-contacts.json
```

### High Sensitivity — Worker-private demo data (worker-self only)

These files must NEVER be directly imported by any employer-facing component. The only services permitted to read them are worker-self services (DynamicCVService, BookingRequestService, PrivacyVisibilityService) and internal scoring services (ScoringSimulatorService — aggregate output only).

```
workers.json
impact-units.json
pib-records.json
booking-requests.json
dynamic-cv-items.json
milestones.json
consent-records.json
```

**Privacy Rule for High Sensitivity files:**

No employer-facing component file (any file inside `app/company/`, `app/partner/`, or `app/advisor/`) may contain the following imports:

```typescript
// FORBIDDEN in employer-facing components:
import workers from '@/data/synthetic/workers.json'
import pibRecords from '@/data/synthetic/pib-records.json'
import impactUnits from '@/data/synthetic/impact-units.json'
import dynamicCvItems from '@/data/synthetic/dynamic-cv-items.json'
import bookingRequests from '@/data/synthetic/booking-requests.json'
import consentRecords from '@/data/synthetic/consent-records.json'
import milestones from '@/data/synthetic/milestones.json'
```

If any of these imports appear in an employer-facing file, it is a privacy architecture violation.

---

## 4. Seed-to-Service Mapping

Every seed file has a designated primary service consumer. Other services may receive derived or aggregated data from the primary consumer — they do not read the seed file directly.

| Seed File | Primary Service Consumer | Secondary Consumers (receive derived data only) | Employer-Facing Output? |
|---|---|---|---|
| `companies.json` | DemoDataService | ScenarioService, ReportGeneratorService | Yes — full company profile |
| `workers.json` | DemoDataService (worker-self only) | ScoringSimulatorService (aggregate), PrivacyVisibilityService | No — internal aggregation only |
| `departments-sites.json` | DemoDataService | ScoringSimulatorService, ReportGeneratorService | Yes — aggregate counts only |
| `programs.json` | DemoDataService | ReportGeneratorService, IngestionSimulatorService | Yes |
| `source-batches.json` | IngestionSimulatorService | DemoDataService | Yes (Admin/HR) — batch metadata |
| `raw-*.sample.json` | IngestionSimulatorService | MappingConfidenceService | Yes (Admin/HR) — column headers only |
| `uef-records.json` | UEFReviewService | ScoringSimulatorService | No — Admin only |
| `impact-units.json` | ScoringSimulatorService | ExplainabilityService | No — internal only |
| `pib-records.json` | ScoringSimulatorService | DynamicCVService (worker-self) | No — never employer-facing |
| `company-aggregates.json` | ScoringSimulatorService | ReportGeneratorService | Yes — aggregate output |
| `kora-index-outputs.json` | ScoringSimulatorService | ReportGeneratorService, ExplainabilityService | Yes — full KORA Index with all mandatory labels |
| `kora-contribution-outputs.json` | KoraContributionService | ReportGeneratorService | Yes — companion indicator, labeled separately |
| `activation-safeguard-results.json` | ActivationSafeguardService | ScoringSimulatorService, ExplainabilityService | Yes — status badge on every KORA Index surface |
| `explainability-records.json` | ExplainabilityService | — | Yes — employer-facing explanation panel |
| `confidence-records.json` | ScoringSimulatorService | ExplainabilityService | Yes — always with KORA Index |
| `partner-catalog.json` | DemoDataService | FounderValidationService (context) | Partial — catalog visible; no individual worker-partner data |
| `opportunities.json` | DemoDataService (worker-self) | — | No — worker-self only via My KORA |
| `collective-initiatives.json` | KoraContributionService | DemoDataService | Partial — aggregate counts employer-facing; individual participation worker-only |
| `booking-requests.json` | BookingRequestService | — | No — worker-self only |
| `dynamic-cv-items.json` | DynamicCVService | — | No — worker-self only |
| `milestones.json` | DynamicCVService | — | No — worker-self only |
| `consent-records.json` | DynamicCVService | BookingRequestService, PrivacyVisibilityService | No — worker-self only |
| `advisor-reviews.json` | DemoDataService (advisor role) | ReportGeneratorService (VR impact summary) | Partial — queue visible to advisors; VR impact shown in aggregate to employers |
| `reports.json` | ReportGeneratorService | — | Yes — role-filtered output |
| `founder-validation-contacts.json` | FounderValidationService | — | No — Admin/Founder only |

---

## 5. Synthetic Data Labels

Every object in every seed file must include the following metadata fields. These must not be omitted.

```json
{
  "synthetic_demo_data": true,
  "scenario_id": "S1",
  "generated_for": "foundation_light_demo",
  "not_live_data": true
}
```

**`synthetic_demo_data: true`** — Machine-readable flag. The `SyntheticDataBanner` component and DemoDataService use this to confirm all loaded data is synthetic before rendering.

**`scenario_id`** — Links the record to a specific scenario (S1, S2, S3, or S4). Required for ScenarioService to filter correctly when switching scenarios. Records shared across all scenarios use `"scenario_id": "all"`.

**`generated_for: "foundation_light_demo"`** — Documents the purpose context. Prevents accidental use in non-demo environments.

**`not_live_data: true`** — Explicit flag for any future automated validation that no live data has entered the seed files.

**Additional required labels for scoring outputs** (`kora-index-outputs.json`, `confidence-records.json`, `activation-safeguard-results.json`, `explainability-records.json`):

```json
{
  "methodology_version_id": "KORA Methodology v0.1",
  "calibration_status": "pre_empirical_calibration",
  "methodology_notes": "Provisional implementation baseline. Equal weight vector 0.10 x 10 components. Pre-Delphi calibration."
}
```

These fields are required by doc 21b and must be present on every scoring output object in the seed files.

---

## 6. Scenario Coverage Required

All seed files that contain scoring-relevant data must cover at least two scenarios:

**Scenario 1 (S1) — Primary Warning State:**
- Company: Meridiana Group S.r.l. (Q1–Q3 2025 baseline)
- AR = 0.38, MAR = 0.22 → Activation Safeguard: **WARNING**
- KORA Index: ~42–48 (pre-improvement)
- Pillar imbalance: LIFE dominant, LEGACY + CONNECTION weak
- 64% of IU generated by 12% of workers
- Verification rate: low (high proportion of self-declared events)

**Scenario 2 (S2) — Improved State:**
- Company: Meridiana Group S.r.l. (Q1–Q4 2025 full year, post-recommendations)
- AR = 0.52, MAR = 0.38 → Activation Safeguard: **CLEAR**
- KORA Index: ~60–68 (post-improvement)
- Broader activation, improved continuity, better pillar balance
- KORA Contribution improved via collective initiative

Both scenarios must be present in: `kora-index-outputs.json`, `activation-safeguard-results.json`, `explainability-records.json`, `confidence-records.json`, `company-aggregates.json`.

---

## 7. Seed File Structure Requirements

Each seed file must follow these structural rules:

**Top-level metadata wrapper:**
```json
{
  "file": "kora-index-outputs.json",
  "version": "1.0",
  "synthetic_demo_data": true,
  "generated_for": "foundation_light_demo",
  "not_live_data": true,
  "primary_consumer": "ScoringSimulatorService",
  "data": [
    { ... record 1 ... },
    { ... record 2 ... }
  ]
}
```

**Every record object must include:**
- `id` — unique string identifier within the file (e.g., `"kora-idx-S1-meridiana-2025"`)
- `synthetic_demo_data: true`
- `scenario_id` — `"S1"`, `"S2"`, `"S3"`, `"S4"`, or `"all"`
- `generated_for: "foundation_light_demo"`
- `not_live_data: true`
- Domain-specific fields as defined by the service interface that consumes the file

**For scoring output records** (`kora-index-outputs.json`, `confidence-records.json`, etc.):
- `methodology_version_id: "KORA Methodology v0.1"`
- `calibration_status: "pre_empirical_calibration"`

**For worker-private records** (`workers.json`, `pib-records.json`, `dynamic-cv-items.json`, etc.):
- `worker_id` — synthetic ID (e.g., `"WRK-0043"`) — not a real identity document number
- No real name, address, tax code, email, or phone number
- Use clearly synthetic names: `"display_name": "Persona A — Operations / Plant Bergamo"`

---

## 8. What Must Not Appear in Seed Files

The following content is forbidden in any seed file, regardless of how "synthetic" it appears:

```
✗ Real personal names of any individual (living or deceased)
✗ Real company names used as primary data (fictional company names only)
✗ Real email addresses
✗ Real phone numbers
✗ Real tax codes (codice fiscale) or national ID numbers
✗ Real IBAN or financial account numbers
✗ Real addresses (street names, postal codes used in combination)
✗ Real salary data or real financial figures presented as real
✗ Real health diagnoses, medical conditions, or therapy records
✗ Real political or religious affiliations
✗ Any data that could be used to identify a real person
✗ Production database IDs or UUIDs from any real system
✗ Production API keys, tokens, or credentials
✗ Gov.kip_records references (KIP does not exist in Foundation Light)
✗ Hardcoded methodology weights outside of methodology-config.json
✗ calibration_status values other than "pre_empirical_calibration" for Foundation Light data
```

---

## 9. Seed Generation Next Step

**Actual JSON/CSV seed generation is a separate step.**

This document defines the structure, classification, privacy rules, and coverage requirements for all 29 seed files. The actual content generation (populating each file with the full synthetic dataset per doc 25) must be requested explicitly after this plan is approved.

When seed generation is requested, generate files in this order:

1. `companies.json` (low complexity, required by all other files)
2. `departments-sites.json`
3. `programs.json`
4. `workers.json` (large — 250 records)
5. `source-batches.json` + all 5 `raw-*.sample.json` files
6. `uef-records.json` (depends on workers + programs)
7. `impact-units.json` (depends on uef-records)
8. `pib-records.json` (depends on impact-units)
9. `company-aggregates.json` (depends on pib-records)
10. `activation-safeguard-results.json` (AR/MAR from company-aggregates)
11. `kora-index-outputs.json` (depends on company-aggregates + weights from config)
12. `confidence-records.json` (depends on kora-index-outputs)
13. `kora-contribution-outputs.json`
14. `explainability-records.json` (depends on kora-index-outputs)
15. `partner-catalog.json`
16. `opportunities.json` (depends on workers + partner-catalog)
17. `collective-initiatives.json`
18. `advisor-reviews.json`
19. `consent-records.json`
20. `booking-requests.json` (depends on workers + partner-catalog)
21. `dynamic-cv-items.json` (depends on workers + pib-records)
22. `milestones.json` (depends on workers)
23. `reports.json` (depends on kora-index-outputs + explainability + company-aggregates)
24. `founder-validation-contacts.json`

Validate each file against the structure requirements in Section 7 before proceeding to the next.

---

**Document version:** v1.0
**Date:** 2026-05-17
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN · Gate 3 OPEN · Gate 5 OPEN
**Next step:** Approve this plan, then prompt: "Generate synthetic seed file: companies.json — follow docs/synthetic-seed-file-plan.md Section 7 structure requirements and doc 25 for content."
