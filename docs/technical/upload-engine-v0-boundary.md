# Upload Engine v0 — Technical Boundary Document

**Version:** v0.1 — Foundation Light Pilot
**Status:** Pre-empirical calibration · Gate 2 OPEN (no SQL, no Supabase, no production backend)
**Authority:** CLAUDE.md §9–11 · doc 22A (build cutline) · doc 21b (methodology governance)

---

## 1. Foundation Light Pilot is not full SaaS

Foundation Light is a **controlled demo and pilot diagnostic tool**, not a production SaaS platform. It runs on synthetic seed data for demo purposes. For real pilot tenants, it accepts guided uploads via a client-side/assisted flow.

There is no production backend, no real authentication, no database, and no persistent storage in Foundation Light v0. Every KORA score produced in this phase is:

- Pre-empirically calibrated (methodology v0.1)
- Non-certified and non-regulatory
- Labeled `calibration_status: pre_empirical_calibration`
- Accompanied by Confidence Score (CS) — external to the KORA Index, shown alongside

---

## 2. Upload v0 — Client-Side Guided Pilot First

The Foundation Light upload flow is **guided and asynchronous**:

- Company uploads one or more CSV/XLSX files
- KORA advisor assists with column mapping and data quality review
- No automated HRIS/LMS API integration in v0 (blocked until Gate 3)
- File parsing and mapping review happen in-browser or via advisor-assisted session

**Upload v0 is not a self-serve SaaS upload form.** It is a structured intake process for the pilot.

### Foundation Light Data Pack — primary input

The minimal input for a Foundation Light Pilot is the **Foundation Light Data Pack** — 4 company-provided files:

| File | Type | Required | Description |
|------|------|----------|-------------|
| Workers (aggregated) | `company_upload` | Yes | Headcount by department and site. No individual names. N ≥ 10 per segment. |
| Initiatives | `company_upload` | Yes | List of company welfare/people initiatives with category and pillar. |
| Participation | `company_upload` | Yes | Aggregate usage per initiative, department, site. N ≥ 10 per segment. |
| Budget / Evidence | `company_upload` | Yes | Allocated budget by initiative category, with evidence level (also declared). |
| HR KPI Aggregates | `company_upload` | Optional | Turnover, absenteeism, engagement. Enriches HR KPI preview only. |
| Provider/LMS export | `provider_export` | Optional | Welfare provider or LMS export. Supplemental — enriches the company Data Pack. |

Provider welfare/LMS exports (`provider_export`) are **supplemental** — they enrich the Data Pack but are not required to start the pilot. A well-structured company Excel file is sufficient.

**Worker document upload is out of scope in Foundation Light Pilot.** Workers do not upload files or send records to the KORA pipeline. Worker input (`worker_confirmation`) is a future My KORA capability, not part of Foundation Light.

Upload types are defined in `lib/kora-engine/types.ts`:
- `UploadedFileBatch` — one file per upload session
- `RawUploadedRecord` — one row per source record
- `ColumnMapping` — human-assisted or AI-suggested column → KORA field mapping
- `SensitiveColumnFlag` — columns detected as potentially sensitive, excluded by default
- `UploadValidationIssue` — data quality issues surfaced before ingestion
- `EventDataSource` — source type classification for uploaded events
- `EventPerimeter` — company-enabled vs out-of-scope perimeter classification

---

## 3. Demo Seed and Uploaded Data Must Remain Separated

**This separation is non-negotiable.**

| Source | Type | Used for |
|--------|------|---------|
| `/data/synthetic/*.json` | `DataMode: synthetic_seed` | Demo only — Meridiana Group S1/S2/S3/S4 scenarios |
| Uploaded company files | `DataMode: uploaded_data` | Real pilot tenants |

A real tenant's `TenantProfile.type = 'real'` must **never** read from synthetic seed files. The `ScoringMode` for a real tenant must be either `'computed'` (sufficient data) or `'insufficient_data'` (data gaps) — never `'seeded_demo'`.

Service-layer code must enforce this:
```ts
if (tenant.type === 'real' && tenant.dataMode === 'synthetic_seed') {
  throw new Error('Real tenant must not fall back to synthetic seed data.');
}
```

---

## 4. Real Tenants Must Never Fall Back to Synthetic Seed

If a real pilot tenant uploads insufficient data, the system must surface **Data Required** — not fake scores, not interpolated values, not synthetic seed defaults.

`ScoringMode: 'insufficient_data'` is the correct state when:
- Upload batch has fewer records than the minimum for a reliable KORA Index
- Workforce baseline is missing or below threshold
- Budget evidence is entirely absent (L0)
- Critical data fields are missing across >50% of records

The KORA Index must not be displayed in `insufficient_data` mode. Only Eligibility Gate classification and partial BTI evidence review may be shown.

---

## 5. Budget Evidence Model

Budget evidence is tiered by reliability:

| Level | Code | Description | BTI Treatment |
|-------|------|-------------|---------------|
| 0 | `L0_NO_EVIDENCE` | No source — amount claimed with no backing | Excluded from BTI |
| 1 | `L1_SELF_DECLARED` | Self-reported, no document | `tracked_only` or excluded |
| 2 | `L2_INTERNAL_DOCUMENT` | Internal budget report, HR estimate | `confidence_weighted` |
| 3 | `L3_THIRD_PARTY_DOCUMENT` | Provider export, invoice, PO | `confidence_weighted` or `full_weight` |
| 4 | `L4_VERIFIED_EVIDENCE` | Third-party verified, certified partner | `full_weight` |

**L0 and L1 amounts never receive full BTI weight.** They can enter BTI as `declared` with an explicit confidence penalty, or be excluded entirely.

A record with `BudgetStatus: 'not_available'` must show `BTITreatment: 'excluded_from_bti'` and contribute to the Evidence Debt / Trust Ledger.

---

## 6. Sensitive Data Exclusion

The upload pipeline distinguishes two categories of sensitive columns:

### 6a. Identity fields — permitted, must not appear in employer outputs

Identity fields (nome, cognome, email, matricola, employee id, badge, worker id) are permitted in the upload for the purpose of **record deduplication** and future **My KORA PIB construction**. They must **never appear in any employer-facing output**.

**Technical pseudonymization/hashing is a future pipeline implementation requirement** — it is not active in Foundation Light v0. The `recommendedAction: 'pseudonymize'` flag signals what the production pipeline must do; it does not mean Foundation Light currently executes it.

Detection rule: `riskType: 'personal_identifiable'`, `severity: 'medium'`, `recommendedAction: 'pseudonymize'`, `excludedByDefault: false`.

### 6b. High-risk identifiers and sensitive data — exclude

The following must be excluded from all uploads. They are not needed in Foundation Light Pilot and represent high re-identification or GDPR Art. 9 risk:

- **High-risk personal identifiers**: codice fiscale, fiscal code, tax ID, CF, telefono, cellulare, phone
- **Health data**: diagnosis, therapy, prescription, health condition, disability status
- **Psychological data**: individual psychological support records, therapy notes, burnout individual records
- **Financial individual**: individual salary, personal bank details

Detection rule: `riskType: 'health_data' | 'psychological' | 'personal_identifiable' (high)`, `severity: 'high'`, `recommendedAction: 'exclude'`, `excludedByDefault: true`.

The advisor may not override exclusion for health or psychological data.

All data that enters the KORA pipeline from uploads:
- Identity fields must not appear in employer-facing outputs (pseudonymization is a future production requirement)
- Must pass `PrivacyVisibilityService.isSuppressed()` before any segment rendering
- Groups below N=10 are suppressed per `SAFE_AGGREGATION_THRESHOLD`

---

## 7. Engine v0 Modules

The following modules are defined and typed in `lib/kora-engine/types.ts`. Their computation logic will be implemented in the corresponding mock services.

| Module | Type | Status |
|--------|------|--------|
| Eligibility Gate | `EligibilityResult` | Active — seeded demo + upload path |
| Pillar Mapping | `PillarMappingResult` | Active — rule-based BCM classifier |
| Impact Unit estimation | `ImpactUnitResult` | Active — stubbed formula, v0.1 |
| Budget Evidence | `BudgetEvidence`, `BTIResult` | Active — evidence tier model |
| Activation analysis | `ActivationResult` | Active — AR/MAR/safeguard |
| KORA Index | `KoraIndexResult` | Active — v3 macroblocks |
| Confidence Score | `ConfidenceResult` | Active — external to KORA Index |
| Explainability trace | `ExplainabilityTraceItem` | Active — pipeline audit log |
| HR KPI correlation | `HRKpiCorrelationPreview` | Preview — aggregate only, 2+ periods required |
| Care Economy | `CareEconomySignal` | Near-term premium pilot module |
| Future Readiness | `FutureReadinessSignal` | Preview / roadmap — not active |
| Mental Capital Infra | `MentalCapitalInfrastructureSignal` | Infrastructure-only — not individual measurement |

---

## 8. What Can Be Done Without a Backend

The following are safe to implement in Foundation Light v0 without a production backend:

- Client-side CSV/XLSX parsing (e.g. SheetJS) — no server required
- Column mapping UI with confidence display
- Sensitive column detection and exclusion UI
- Eligibility Gate classification (rule-based, client-side)
- BCM taxonomy classifier (rule-based — no external LLM API calls on company data)
- UEF record normalization and review interface
- Budget Evidence form with tier selection
- BTI computation from uploaded records (client-side, no persistence)
- KORA Index preview from computed records (labeled `foundation_light_dynamic_preview`)
- Explainability trace display
- HR KPI entry form and correlation preview (no persistence)
- All premium module signal forms (Care Economy, Future Readiness, Mental Capital)
- Decision Pack / Board Pack generation from computed outputs (in-browser)

---

## 9. What Requires SaaS Backend (Post-Gate 2/3)

The following are **blocked until Gate 2 (CTO review) and Gate 3 (legal/privacy) close**:

- Database storage of uploaded records or computed results
- Persistent tenant/user accounts (real authentication)
- HRIS / LMS / welfare provider API integrations
- Real-time data sync or webhook ingestion
- Production RBAC / RLS
- Asynchronous pipeline processing (queues, workers)
- Multi-user collaboration on the same upload session
- Audit trail persistence
- Production PDF export with digital signature
- Sharing of KORA Index reports with external parties
- KORA Contribution operational logic
- KIP (KORA Impact Points) and wallet system
- Any payment, voucher, or checkout flow

---

## 10. Privacy and Security Warning Before Production

**Before any real company data is ingested into a production KORA system, the following must be in place:**

1. **Gate 2 closed** — CTO architecture review complete; production schema approved
2. **Gate 3 closed** — Legal/privacy review complete; data processing agreement signed with pilot company; GDPR consent model validated
3. **Gate 5 closed** — Tax/fiscal advisor review complete (if fiscal perimeters are used)
4. **Production pseudonymization pipeline** — worker IDs pseudonymized before any KORA record is created; no raw personal identifiers stored in the pipeline layer
5. **RLS policies** — Row-Level Security enforced at database level; employer roles cannot query individual worker rows
6. **Audit trail** — Every eligibility override, pillar mapping review, and BTI classification change logged with actor, timestamp, and reason
7. **Data retention policy** — Uploaded raw files deleted after processing; only normalized, pseudonymized, aggregate-safe records retained
8. **Privacy impact assessment** — Documented before live data processing begins
9. **Sensitive column exclusion enforced** — Health, psychological, and PII columns never stored in the pipeline

The Foundation Light demo may not be used with real worker data until all of the above are satisfied. Using synthetic seed data for demo purposes is safe and unrestricted.

---

*Document authority: CLAUDE.md §9–14 · docs/22A-foundation-light-demo-build-cutline.md · docs/21b-methodology-risk-acceptance-and-provisional-score-policy.md*
