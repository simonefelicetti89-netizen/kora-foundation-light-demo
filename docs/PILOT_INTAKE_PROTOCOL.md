# KORA Pilot Intake Protocol
**Audience:** KORA_ADMIN
**Version:** P1 — Foundation Light v0.1
**Scope:** First real pilot company onboarding

This document describes the exact steps to onboard a pilot company from contract signature to live KORA Index display. Each step references the actual API route or UI path.

**This is a service-assisted path.** Every step through Step 10 is performed
by KORA_ADMIN, not the pilot company. COMPANY_ADMIN access (Step 11) is
view-only. KORA Link is frozen and is not part of this protocol.

---

## Prerequisites

Before starting, confirm:

- [ ] Supabase project is provisioned and all 4 migrations are applied
- [ ] Your KORA_ADMIN user exists in Supabase Auth with `app_metadata: { kora_role: "KORA_ADMIN" }`
- [ ] `.env.local` contains valid `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] The app is running (`npm run dev` or deployed)
- [ ] You are logged in at `/admin/login`

---

## Step 1 — Create Tenant + Workforce Baseline

Navigate to `/admin/tenants` or call the API directly.

**UI:** Open `/admin/tenants` → fill the form → submit.

**API:**
```
POST /api/admin/tenants
Content-Type: application/json
Authorization: Bearer <kora_admin_token>

{
  "tenantCode": "ACME-001",
  "companyName": "Acme S.r.l.",
  "reportingPeriod": "2025-H2",
  "workforcePopulation": 150,
  "notes": "Primo pilot KORA — settore manifatturiero"
}
```

**Response includes:**
- `tenantId` — save this UUID, needed in subsequent steps
- `workforceBaselineCreated: true` — confirms N≥10 baseline is set
- `links.dataIntake` — URL to the next step

**N≥10 enforcement:** `workforcePopulation` must be >= 10. The API will reject values below 10.

**If baseline creation fails** (baseline warning in response): call the standalone update endpoint:
```
POST /api/admin/workforce-baseline
Content-Type: application/json

{
  "tenantId": "<uuid from step 1>",
  "reportingPeriod": "2025-H2",
  "totalWorkers": 150
}
```

---

## Step 2 — Create COMPANY_ADMIN User

In Supabase Dashboard → Authentication → Users → Invite user.

After the user confirms their email, set `app_metadata` via the Supabase Admin API or Dashboard:

```json
{
  "kora_role": "COMPANY_ADMIN",
  "kora_tenant_id": "<tenantId from step 1>",
  "kora_status": "active"
}
```

**Required fields:**
- `kora_role`: `"COMPANY_ADMIN"` or `"COMPANY_VIEWER"`
- `kora_tenant_id`: the UUID from step 1 (never use the tenant_code string here — use the UUID)
- `kora_status`: `"active"`

**Verification:** Ask the company user to log in at `/company/workspace`. They should see their company name and onboarding status.

---

## Step 3 — Request Company Data File

Send the pilot company `public/kora/intake-template.csv` with instructions:

- Fill one row per welfare initiative / program / event
- Do NOT include employee names, emails, codici fiscali, or any personal identifiers
- Use aggregate participant counts only (e.g. `participants: 45`)
- The file should not exceed 500 data rows and 5 MB per upload
- Accepted formats: `.csv` (UTF-8) or `.xlsx`

**Required columns:** `initiative_name`, `category`, `participants`, `date_or_period`

**Helpful columns:** `amount`, `provider`, `evidence_type`, `mandatory_status`

---

## Step 4 — Upload Preview (Dry Run)

Before accepting data into Supabase, run a dry-run preview. **Nothing is written.**

Navigate to `/admin/data-intake` or call directly:

```
POST /api/admin/data-intake/upload-preview
Authorization: Bearer <kora_admin_token>
Content-Type: multipart/form-data

file: <company_data.csv>
```

**Check the response for:**
- `piiStatus: "passed"` — required to proceed. If `"rejected"`, send the file back to the company with the `forbiddenHeaders` or `findings` list.
- `eligibilityPreview.eligible` — should be > 0 for a meaningful score
- `eligibilityPreview.reviewRequired` — high numbers indicate data quality issues
- `missingFieldSummary.overallSeverity` — `"low"` is ideal; `"high"` means critical fields are missing

**If PII is detected:** Do not proceed. Return the file to the company, identify the forbidden columns or values, and request a corrected file.

**For XLSX files:** The preview response will list available sheets. Resubmit with `selectedSheetName` to proceed.

---

## Step 5 — Accept Upload (Persist to Supabase)

Once the preview passes, accept the file. This writes to `analytics.source_batch` and `personal.uploaded_record`.

```
POST /api/admin/data-intake/accept
Authorization: Bearer <kora_admin_token>
Content-Type: multipart/form-data

file: <company_data.csv>
```

**Response includes:**
- `batchId` — save this UUID, needed for UEF generation
- `batchStatus: "pending"`
- `rowCount` — number of records accepted
- `links.uefReview` — URL to the next step

**Note:** Uploaded files are processed in memory. The raw file is not stored in Supabase Storage. Only the parsed, PII-screened records are persisted to `personal.uploaded_record`.

---

## Step 6 — Generate UEF Candidates

Navigate to `/admin/uef-review`. The batch from step 5 will appear in the batch selector with status `pending` and a "Generate UEF candidates" button.

Click **"⚙ Generate UEF candidates"** or call directly:

```
POST /api/admin/uef/generate-candidates
Authorization: Bearer <kora_admin_token>
Content-Type: application/json

{ "batchId": "<batchId from step 5>" }
```

**Response:**
- `generatedCount` — number of UEF candidate records created
- `highConfidenceCount` — candidates with confidence >= 70%
- `needsReviewCount` — candidates requiring human review
- `blockedCount` — records blocked by design (compliance)
- `scoringLocked: true` — candidates are locked until human approval

All UEF candidates are created with `approved_for_scoring: false`. Scoring cannot run until records are approved in step 7.

---

## Step 7 — Review UEF Candidates

Navigate to `/admin/uef-review` → select the batch → review candidates.

**For each candidate:**
- **Approve** if the eligibility classification (eligible / limited / blocked) and pillar are correct
- **Reject** if the record should not enter scoring (wrong company data, duplicate, etc.)
- **Needs info** if you need clarification from the company before approving

**Bulk approve:** Click **"✓ Approve N high-confidence"** to approve all candidates with confidence >= 70% in one action. Use this for the first pass; review low-confidence records individually.

**Scoring is still locked** until at least one record is approved.

---

## Step 8 — Verify Workforce Baseline

The scoring run requires a workforce baseline for the same `reportingPeriod`.

If baseline was created in step 1 for the same `reportingPeriod`, you can proceed.

If the reporting period differs or the baseline failed:

```
POST /api/admin/workforce-baseline
Authorization: Bearer <kora_admin_token>
Content-Type: application/json

{
  "tenantId": "<uuid from step 1>",
  "reportingPeriod": "2025-H2",
  "totalWorkers": 150
}
```

Response: `{ ok: true, baselineId, upserted: true }`

---

## Step 9 — Run Scoring

In `/admin/uef-review`, once approved records exist, the **"Run scoring from approved UEF"** panel appears.

Optionally enter `workforcePopulation` if the baseline does not already exist for this period (the API will use the DB baseline first if available).

Click **"▶ Run scoring from approved UEF"** or call directly:

```
POST /api/admin/scoring/run-approved-batch
Authorization: Bearer <kora_admin_token>
Content-Type: application/json

{
  "batchId": "<batchId from step 5>",
  "workforcePopulation": 150
}
```

**Response includes:**
- `koraIndex` — KORA Index value (0–100)
- `confidenceScore` — Confidence Score (0–1, external to KORA Index)
- `safeguard` — Activation Safeguard status (CLEAR / WARNING / FLAGGED)
- `activationRate` — AR as decimal (e.g. 0.42 = 42%)
- `meaningfulActivationRate` — MAR as decimal
- `decisionPack.versionId` — Decision Pack draft created
- `previewUrl` — HTML preview link
- `pdfUrl` — PDF download link

**Important:** Every output carries `calibration_status: "pre_empirical_calibration"`. This label is mandatory and non-suppressible in all company-facing displays.

---

## Step 10 — Verify Scoring Results

Before showing results to the company, verify:

- [ ] `safeguard` value is consistent with the activation data (high AR → CLEAR expected)
- [ ] `koraIndex` is in a plausible range for the data volume and quality
- [ ] `confidenceScore` reflects data quality (high % of L0/self-declared evidence → lower CS)
- [ ] `decisionPack.status` is `"draft"` (needs review before publishing to company)

**Decision Pack preview:**
```
GET /api/admin/decision-pack/preview?tenantCode=ACME-001&reportingPeriod=2025-H2
Authorization: Bearer <kora_admin_token>
```

**Decision Pack PDF:**
```
GET /api/admin/decision-pack/pdf?tenantCode=ACME-001&reportingPeriod=2025-H2
Authorization: Bearer <kora_admin_token>
```

---

## Step 11 — Company Access Verification

Ask the company COMPANY_ADMIN to log in at `/company/workspace`.

They should see:
- Their company name
- Onboarding status: `active`
- Data readiness status: updated after intake
- Decision Pack status: `draft` (or `ready` if you publish it)

**Current state:** `/company/workspace` and `/company/kora-index` both show live,
per-tenant Supabase data — there is no synthetic demo fallback on these pages
(confirmed in the GOLDEN-01 golden path audit). The company sees their own
score, not a placeholder. This access is currently **view-only**: the
COMPANY_ADMIN does not upload data, approve UEF, or trigger scoring — that
remains a KORA_ADMIN-operated (service-assisted) step, per this protocol.

**For pilot presentation:** the Decision Pack PDF/HTML preview
(`/api/admin/decision-pack/preview`) remains the recommended artifact to walk
through with the company, since it is the polished, report-formatted output —
but `/company/kora-index` itself is also live and can be shown directly.

---

## Step 12 — Methodology Disclosure (Required)

Every KORA Index output shown to the company must include:

- KORA Index value
- Confidence Score (external — not a KORA Index component)
- Activation Safeguard status (CLEAR / WARNING / FLAGGED)
- `methodology_version_id: "KORA Index v1.0"`
- `calibration_status: pre_empirical_calibration`
- The following disclaimer: *"KORA Foundation Light — pre-empirical calibration. Output diagnostico pilota. Non certificato, non regulatory-grade."*

These are non-suppressible per doc 21b.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `Scoring blocked: no approved UEF records` | No records approved in UEF review | Complete step 7 |
| `Workforce baseline missing` | No baseline for this period | Complete step 8 |
| `PII detected — batch rejected` | Company file contains personal identifiers | Return file to company with finding details |
| `Tenant not found` | Wrong tenantId UUID | Verify tenantId from step 1 |
| `workforcePopulation must be >= 10` | Workforce count < 10 | Check company data — must have at least 10 workers |
| `batchId not found` | Wrong batch UUID | Check batch list at `GET /api/admin/uef/review` |

---

## API Reference Summary

| Step | Method | Route |
|---|---|---|
| 1 | POST | `/api/admin/tenants` |
| Baseline update | POST | `/api/admin/workforce-baseline` |
| 4 | POST | `/api/admin/data-intake/upload-preview` |
| 5 | POST | `/api/admin/data-intake/accept` |
| 6 | POST | `/api/admin/uef/generate-candidates` |
| 7 | GET | `/api/admin/uef/review?batchId=...` |
| 7 | POST | `/api/admin/uef/review` |
| 9 | POST | `/api/admin/scoring/run-approved-batch` |
| 10 | GET | `/api/admin/decision-pack/preview` |
| 10 | GET | `/api/admin/decision-pack/pdf` |
| List tenants | GET | `/api/admin/tenants` |
| List batches | GET | `/api/admin/uef/review` |
