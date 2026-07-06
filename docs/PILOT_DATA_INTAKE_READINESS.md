# KORA — Pilot Data Intake Readiness

**Audience:** KORA_ADMIN operator preparing a real pilot company's data intake; the company's own data-owner contact, when a company-facing checklist is needed.
**Introduced:** PILOT-DATA-INTAKE-01 (2026-07-07)

---

## 1. Purpose and scope

**This is a readiness document, not a live ingestion procedure.** It prepares a real pilot company's data intake — what to ask for, what format, what must be validated, what must never be collected — before any live upload happens. It does not execute uploads, Supabase calls, migrations, `GD01`, Playwright, Production actions, or credential actions. **Every live upload or staging validation described here still requires its own explicit approval at the time it happens**, per `docs/PILOT_OPERATING_RUNBOOK.md`.

## 2. Intake principles

- **Data minimization** — request only what the KORA Index actually needs to compute; nothing more.
- **Privacy by design** — the intake path is built to reject personal identifiers, not merely discourage them (see §9).
- **Aggregate-first** — Foundation Light's intake format is per-program/per-initiative aggregate data, not per-worker records (see §3, §4).
- **Worker-level personal data only if explicitly required and approved** — this is not the default path and is out of scope for a first pilot's data intake.
- **No unnecessary identifiers** — no names, emails, or employee IDs beyond what aggregate counts require.
- **No secrets in intake files** — no passwords, keys, or credentials of any kind (see §8).
- **No Production upload without explicit approval** — matches `docs/PILOT_OPERATING_RUNBOOK.md`'s environment boundaries.
- **Dry-run/preview before accept** — every file goes through `upload-preview` (writes nothing) before `accept` (persists screened records).
- **Stop on unclear tenant/environment/data owner** — do not guess; see §12.

## 3. Current intake architecture summary

Summarized from existing code and docs, without changing any of it:

- **KORA_ADMIN-operated intake is the live path.** Per `docs/PILOT_INTAKE_PROTOCOL.md` and `docs/PILOT_SAAS_READINESS.md`, the pilot company does not upload its own data — KORA_ADMIN does, on the company's behalf, at `/admin/data-intake`.
- **A company-facing self-service upload studio exists (`app/company/data/upload/page.tsx`) but is a preview/demo surface, not the pilot's live intake path.** It is wrapped in `OperatorToolBoundary` and states directly in its own copy: "Foundation Light non richiede self-service cliente. L'azienda invia il Data Pack a KORA; KORA Operator lo normalizza e lo processa."
- **`upload-preview` is a dry run.** `POST /api/admin/data-intake/upload-preview` writes nothing — it returns PII status, eligibility preview, and a missing-field summary for KORA_ADMIN to review before proceeding.
- **`accept` persists screened records.** `POST /api/admin/data-intake/accept` writes to `analytics.source_batch` and `personal.uploaded_record`. The raw file itself is not stored in Supabase Storage — only parsed, PII-screened records are persisted.
- **UEF review, scoring, KORA Index, and Decision Pack follow downstream**, in that order, all still KORA_ADMIN-operated (`/admin/uef-review`, then scoring, then Decision Pack generation).
- **`GD01` uses this same pipeline, driven through the real UI, against a disposable staging tenant — but it has not been run live.** See `docs/E2E_GOLDEN_PATH.md`.

## 4. Required pilot data categories

Conservative, code-grounded categories a first pilot company's data intake is likely to need:

- **Company/tenant metadata** — company name, tenant code, reporting period.
- **Reporting period** — the period the data covers (e.g. `2026-Q1`).
- **Workforce baseline or aggregate headcount context** — total workforce population for the period (required for Activation Rate/Meaningful Activation Rate calculation; N≥10 enforced).
- **Initiative/intervention catalogue** — one row per welfare/training/volunteering/collective-initiative program or event.
- **Participation/activation aggregates** — participant counts per initiative, never individual worker identities.
- **Spend/budget inputs** — amount per initiative, budget classification.
- **Evidence/provenance/source owner** — where the data came from (HR declaration, provider export, invoice, etc.) — feeds evidence-quality scoring.
- **Optional qualitative/context notes** — free-text description per initiative, used by the classifier.

This list reflects what the current engine/fixtures actually consume — it is not an invented schema beyond what the repository already defines (see §5).

## 5. Draft field dictionary

**Readiness-level, reflecting current code and fixtures (`lib/data-intake/column-mapping.ts`'s canonical field list, cross-checked against `data/golden-path/README.md`'s column table and `data/golden-path/*.csv`). This is not a final legal/company template, and it has not been validated against real pilot company data — only against synthetic fixtures.**

| Field | Required/Optional | Purpose | Privacy sensitivity | Notes |
|---|---|---|---|---|
| `initiative_name` | **Required (blocking)** | Identifies the program/event — every row must have one | Low | Free text |
| `description` | Optional (info) | Extended description, used by the classifier | Low | Free text |
| `category` | Optional (warning if missing) | Category/area signal for the eligibility gate | Low | Free text |
| `type` | Optional (warning if missing) | Type/nature signal for the eligibility gate | Low | Free text |
| `amount` | Optional (warning if missing) | Budget in euros, no currency symbol | Low | Numeric |
| `participants` | Optional (warning if missing) | Estimated participant count — feeds REACH/NM | Low (aggregate count, never names) | Integer |
| `source` | Optional (warning if missing) | Data source — feeds budget evidence detection | Low | Free text (see accepted values below) |
| `evidence_level` | Optional (warning if missing) | Documentary evidence level (`L0`–`L3`) — feeds NM/EVQ | Low | Enum |
| `pillar` | Optional (info) | Secondary classifier signal | Low | `LIFE`/`GROWTH`/`CONNECTION`/`IMPACT`/`LEGACY` |
| `reporting_period` | Optional (info) | Period label | Low | e.g. `2026-Q1` |
| `provider` | Optional (info) | External vendor/provider name | Low | Free text |
| `budget_class` | Optional (warning if missing) | Spend classification | Low | `welfare`/`fringe_benefit`/`hr_learning`/`esg_volunteering`/`compliance_hse`/`compliance_legal`/`mixed`/`unknown` |
| `cost_center` | Optional | Internal cost center reference | Low-medium | Only if the company already tracks this at the aggregate/program level |
| `hours` | Optional (info) | Hours delivered | Low | Numeric, 0 if not applicable |
| `coverage` | Optional (info) | Potential eligible population for the initiative | Low | Integer |
| `uptake` | Optional | Usage/adoption rate | Low | Aggregate, not individual |
| `policy_evidence` | Optional | Whether a documented policy backs the initiative | Low | Free text/boolean |

Accepted `source` values and their evidence-detection effect, and accepted `budget_class` values, are documented in `data/golden-path/README.md` — not restated here to avoid drift between two copies.

## 6. Template/schema discrepancy note

**This is flagged explicitly, not silently resolved.** Two intake reference files currently exist with different column sets:

- `public/kora/intake-template.csv` uses an older, simpler column set (`initiative_name, category, participants, date_or_period, provider, site_or_cluster, amount, mandatory_status, evidence_type, pillar`) and is the file `docs/PILOT_INTAKE_PROTOCOL.md` Step 3 currently tells an operator to send a real pilot company.
- `data/golden-path/*.csv` and `lib/data-intake/column-mapping.ts`'s canonical field list reflect the more current, engine-verified field set (§5 above).
- `lib/data-intake/column-mapping.ts` (the "Column Mapping Assistant," B27) is a real, rule-based synonym matcher that may reconcile some of this header drift automatically (e.g. `date_or_period` may map to `reporting_period` via keyword overlap) — but this has not been verified against the specific older template's headers as part of this readiness pass.
- **This sprint does not update, retire, or pick a winner between these two templates.** That is a product decision requiring explicit approval, not something to resolve silently inside a documentation-only readiness pass. Until that decision is made, treat `data/golden-path/README.md`'s column table as the more current technical reference, and flag the discrepancy to whoever prepares the next real company's template.

## 7. Accepted formats and file handling

- **CSV/XLSX** for structured company-provided inputs — the supported formats today.
- **UTF-8 CSV preferred** where possible.
- **PDF only as supporting evidence** (e.g. an invoice or provider report attached for evidence-level purposes) — never as the primary structured data source.
- **No passwords or secrets in files, ever.**
- **No unnecessary personal identifiers** — see §8.
- **File naming** should identify tenant/reporting-period/context (e.g. `ACME-001_2026-Q1_initiatives.csv`) — never embed secrets or personal data in the filename itself.
- **Raw files should be handled carefully and redacted before being shared** with anyone beyond the KORA_ADMIN operator processing them — see `docs/PILOT_OPERATING_RUNBOOK.md` §8 for the general evidence-handling rule this inherits from.

## 8. Do-not-send list

**Never send, under any circumstance:**
- Passwords, service-role keys, API keys, or any credential of any kind.
- Health records or medical data.
- Disciplinary records.
- Fiscal/tax identifiers (e.g. codice fiscale) — unless legally justified and explicitly approved for a specific, narrow purpose.
- Raw HR files containing unnecessary names, emails, or other individual identifiers.
- Individual worker narratives (free-text notes about a specific named person).
- Sensitive personal data not needed for KORA Index computation or pilot validation.
- Any data not needed for the pilot's stated objective.

**Distinguish two different guarantees:**
- **Technically detected/rejected today** — email addresses, phone numbers, Italian codice fiscale patterns, and IBANs are actively pattern-matched and rejected by the real PII guard (`lib/privacy/pii-guard.ts`) at `upload-preview` time (see §9).
- **Policy-level "must not be sent"** — health records, disciplinary records, and individual worker narratives are not necessarily pattern-detectable by the current guard. These are enforced by instruction and human review (the pre-upload checklist, §10), not by automatic rejection. Do not assume the guard catches everything on this list.

## 9. PII guard and minimization note

- The current PII guard (`lib/privacy/pii-guard.ts`) detects, by pattern: **email addresses**, **phone numbers**, **Italian codice fiscale** (16-character pattern), and **IBAN**s, plus a list of direct-identifier field/key names (e.g. `email`, `phone`, `codice_fiscale`, `iban`).
- If PII is detected at `upload-preview`, the response reports `piiStatus: "rejected"` with a `findings`/`forbiddenHeaders` list — per `docs/PILOT_INTAKE_PROTOCOL.md` Step 4, **do not proceed**; return the file to the company with the specific finding, and request a corrected file.
- **Technical detection is not a substitute for minimization and human review.** The guard catches known patterns; it does not guarantee a file is privacy-safe by construction. A KORA_ADMIN operator should still visually check a file against §8's do-not-send list before uploading, not rely on the guard alone.
- Raw worker-level identifiers should not be sent unless explicitly required and approved — which is not the expected case for a first pilot's data intake (see §2).

## 10. Pre-upload checklist

Before uploading any real pilot company file:

- [ ] Target environment confirmed (local/staging/Production) — never assumed.
- [ ] Tenant/company confirmed — correct tenant selected, not a demo/synthetic tenant (e.g. not `OP-001`).
- [ ] Reporting period confirmed and matches the workforce baseline period.
- [ ] Data owner/source confirmed — who at the company actually produced this file.
- [ ] File format confirmed (CSV/XLSX, UTF-8 where possible).
- [ ] Field mapping checked against §5's field dictionary.
- [ ] Template/schema discrepancy (§6) understood by whoever prepared the file.
- [ ] Privacy/minimization checked against §8's do-not-send list.
- [ ] Identifiers removed or pseudonymized where not explicitly required.
- [ ] No secrets of any kind present in the file.
- [ ] `upload-preview` (dry run) run first — nothing accepted until this is clean.
- [ ] Operator approval obtained before calling `accept`.
- [ ] Evidence and redaction plan confirmed for anything captured from this session (per `docs/PILOT_OPERATING_RUNBOOK.md` §8).

## 11. Mapping to KORA pipeline

- **`upload-preview`** — dry run; validates schema, screens for PII, previews eligibility; writes nothing.
- **`accept`** — persists screened records to `analytics.source_batch`/`personal.uploaded_record`.
- **UEF review** — generates and reviews Unified Event Frame candidates from the accepted batch; nothing scores until records are approved.
- **Scoring** — runs on approved UEF records; produces the KORA Index, Confidence Score, and Activation Safeguard status.
- **KORA Index** — the company-level output; always shown with Confidence Score and `calibration_status`.
- **Decision Pack** — the polished, report-formatted output generated from a scoring run.
- **`GD01`** — drives this exact pipeline through the real UI end-to-end, against a disposable staging tenant. **`GD01` is scaffolded but not live-run** — see `docs/E2E_GOLDEN_PATH.md`.
- **Final pilot validation** — real pilot intake, through this pipeline, with a real company's real data, **has not yet been proven end-to-end**. Everything in this document describes the intended path and the pieces that are individually verified (engine, PII guard, mapping assistant) — not a claim that the full path has been exercised live with real pilot data. Static/code fixtures (`data/golden-path/*.csv`) are not the same as live operational proof.

## 12. Failure handling

| Failure | Stop/escalate behavior |
|---|---|
| Invalid schema | Stop. Do not proceed to `accept`. Return the file with the specific validation error. |
| Missing required data (`initiative_name` absent on a row) | Stop that row/file. Request a corrected file — do not silently drop rows. |
| Unexpected personal data detected | Stop immediately. Do not proceed. Return the file with the specific finding (§9). Do not attempt to manually strip and resubmit without the company's awareness. |
| Wrong tenant selected | Stop immediately. This is a stop condition per `docs/PILOT_OPERATING_RUNBOOK.md` §7 ("wrong tenant data visible" / "unclear account/tenant identity"). |
| Wrong reporting period | Stop. Confirm the correct period with the data owner before proceeding. |
| Duplicate files | Stop. Confirm with the data owner whether this is an intentional resubmission or an accidental duplicate before accepting. |
| Unclear source owner | Stop. Do not accept a file whose provenance within the company is unclear — evidence quality scoring depends on this. |
| Unsupported file format | Stop. Request CSV or XLSX. |
| Privacy issue (any kind, beyond automatic PII detection) | Stop immediately. Escalate to the privacy/governance reviewer per `docs/PILOT_OPERATING_RUNBOOK.md` §2/§7. Do not continue. |
| Dry-run mismatch (preview result doesn't match expectation) | Stop. Investigate before calling `accept` — do not accept "just to see what happens." |
| `GD01`/intake pipeline failure | Stop. Do not claim the affected step passed. Log per `docs/PILOT_OPERATING_RUNBOOK.md` §6/§7. |

## 13. Company-facing data request checklist

*This section is written for the pilot company's own data-owner contact — practical and non-technical.*

- **What to send:** one row per welfare/training/volunteering/collective-initiative program or event for the agreed reporting period — program name, a short description, category, budget, participant count, and where the data came from.
- **Preferred format:** a CSV or Excel file, one row per initiative.
- **What not to send:** employee names, email addresses, phone numbers, codice fiscale, IBANs, health or medical information, disciplinary records, or any password/credential. Send aggregate counts (e.g. "45 participants"), never individual employee lists.
- **Who confirms the data:** your designated internal data owner should be the one preparing and sending the file, so KORA_ADMIN knows who to follow up with on questions.
- **What KORA does next:** the file is checked automatically for anything that looks like personal data before it is used; if anything is flagged, you'll be asked for a corrected file before anything proceeds.
- **Who to contact for clarification:** your KORA_ADMIN pilot contact, before sending, if you're unsure what belongs in the file.
- **Reminder:** never include passwords, API keys, or any other credential in this file, and never include more personal detail than the aggregate counts described above.

## 14. Open questions/blockers

- **Final pilot intake template decision still needed** — which of the two templates (or a reconciled version) becomes the one real pilot companies receive (see §6).
- **Public intake template vs. golden-path schema discrepancy** — unresolved, flagged in §6, not fixed by this sprint.
- **Live validation still pending** — no real pilot company's data has been ingested through this pipeline yet.
- **`GD01` not run live** — see `docs/E2E_GOLDEN_PATH.md`.
- **Privacy governance sprint still pending** — this document covers intake-specific privacy boundaries only; broader privacy governance is out of scope here (`PILOT-PRIVACY-GOVERNANCE-01`, recommended next).
- **COMPANY_B not required for first-company intake** — it is only relevant to the two-tenant isolation proof (`T01`/`T02`), not to onboarding the first real pilot company's data.
- **Real company data handling/retention policy to be confirmed** — beyond "the raw file is not stored in Supabase Storage" (§3), a full retention/deletion policy for accepted records has not been documented as part of this readiness pass.

## 15. Links to canonical docs

- `docs/PILOT_INTAKE_PROTOCOL.md` — the full 12-step KORA_ADMIN-operated onboarding protocol, contract signature to live KORA Index.
- `docs/GOLDEN_PATH_RUNBOOK.md` — manual, step-by-step operator walkthrough of the golden path UI.
- `docs/E2E_GOLDEN_PATH.md` — what `GD01` proves, required env vars, known gaps (not run live).
- `docs/PILOT_OPERATING_RUNBOOK.md` — the operating procedure this readiness doc's checklists plug into (roles, stop conditions, evidence collection).
- `docs/PILOT_REVIEW_PACKAGE.md` — reviewer-facing entry point for evaluating KORA's overall pilot readiness.
- `docs/PILOT_GOVERNANCE.md` — canonical governance index (proven/scaffolded/blocked/deferred status).
- `docs/METHODOLOGY.md` — KORA Index versioning, 10 components, IU formula reference.
- `docs/privacy-escalation-model.md` — the canonical principle that KORA_ADMIN access ≠ worker-PIB access.
- `docs/access-matrix.md` — the authoritative role/resource access matrix.

---

**Document version:** v1.0
**Created:** 2026-07-07 (PILOT-DATA-INTAKE-01)
