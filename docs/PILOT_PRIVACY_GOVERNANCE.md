# KORA — Pilot Privacy Governance

**Audience:** founder/operator, technical reviewer, privacy/governance reviewer, pilot company stakeholder, academic/methodology reviewer.
**Introduced:** PILOT-PRIVACY-GOVERNANCE-01 (2026-07-07)

---

## 1. Purpose and scope

This document is a **pilot privacy governance summary**. It consolidates existing privacy, access, intake, and pilot governance material scattered across several canonical docs into a single reviewer-readable entry point, so that before pilot execution KORA can explain: what data is collected, what is not collected, what is aggregated, what is worker-level, what the company can and cannot see, what KORA_ADMIN can and cannot access, how PII is handled, what must be disclosed to pilot partners, and what remains blocked or not proven.

**What this document is not:**
- It is **not a legal opinion**.
- It is **not a GDPR compliance certificate**.
- It is **not proof of live validation** — see §9 for exactly what is and isn't proven.
- It does not replace any of the canonical docs it summarizes (§14) — where this doc and a linked source doc disagree, the source doc governs.

**Standing rule:** every live/staging validation action referenced anywhere in this document (two-tenant isolation, `GD01`, COMPANY_B provisioning, credential cleanup) still requires its own explicit approval at the time it is run, per `docs/PILOT_OPERATING_RUNBOOK.md`. Nothing in this document constitutes standing authorization for any of those actions.

---

## 2. Privacy principles

- **Aggregate-first** — company-facing outputs are aggregated and privacy-safe by design; individual worker data is never the default output shape.
- **Data minimization** — collect only what the KORA Index actually needs to compute; nothing more.
- **Worker dignity** — workers are the subject of protection, not a monitoring target; KORA measures organizations, not people.
- **No individual worker ranking** — KORA does not rank, score, or compare individual workers against each other, ever, for employer use.
- **No individual worker monitoring for employer use** — no employer-facing surface exists to observe a specific worker's individual activity or behavior.
- **Company-visible outputs are aggregated/privacy-safe** — KORA Index, activation rates, and pillar distributions are company-level constructs.
- **Worker-level identifiers are not company-visible** — `worker_id`, `kora_worker_id`, individual PIB, individual UEF, and any pseudonym-mapping data are never returned to a company-facing route.
- **Sensitive personal data should not be collected unless explicitly approved and legally justified** — health data, disciplinary records, and similar categories are out of scope for a first pilot's intake by default.
- **Technical detection is not a substitute for minimization and human review** — the PII guard (§8) catches known patterns; it does not guarantee a file or dataset is privacy-safe by construction.
- **Do not claim more proof than exists** — every claim in this document is qualified as proven, scaffolded, blocked, or deferred (§9); nothing is asserted as "working" without that qualification.

---

## 3. Data categories and visibility

| Data category | Example | Company-visible? | Worker-visible? | KORA_ADMIN/operator-visible? | Technical/policy status | Notes/caveats |
|---|---|---|---|---|---|---|
| Aggregate company metrics | Activation rate, pillar distribution (company-level) | Yes (N≥10) | No | Yes | Technically enforced — `SAFE_AGGREGATION_THRESHOLD = 10`, RLS + app-layer suppression | Suppressed with `{suppressed: true, suppression_reason, suppression_threshold}` below threshold, never a raw count that could imply "≥1" |
| KORA Index outputs | KORA Index value, Confidence Score, Activation Safeguard status, 10-component breakdown | Yes | No | Yes | Technically enforced — company-level construct only | Never computed or displayed per-worker |
| Decision Pack outputs | Company report (HTML/PDF) with KORA Index, methodology labels | Yes | No | Yes | Technically enforced — aggregate report format | Must always show Confidence Score + `calibration_status` (per `CLAUDE.md` §6) |
| Initiative/activation aggregates | Participant counts per pillar/initiative | Yes (N≥10) | Partial (own participation only) | Yes | Technically enforced — RLS on `personal.worker_participation`, no `COMPANY_ADMIN`/`COMPANY_VIEWER` policy exists on that table | See `docs/WORKER_PARTICIPATION_PRIVACY.md` |
| Worker participation signals | Who expressed interest, registered, attended | No | Yes (own only) | Yes (via service-role; not exposed in standard admin routes) | Technically enforced at RLS + API layer | Company routes never select `worker_id`, `display_name`, or `private_note` |
| Worker identity/PII-type data | Name, email, phone, codice fiscale, IBAN | No | Yes (own only) | Restricted — not ordinary access; see §7 | Mixed — some patterns technically detected/rejected at intake (§8), others policy-level only | Should not exist in company-facing intake data at all for a first pilot |
| Raw intake files | Uploaded CSV/XLSX before processing | No | No | Yes (KORA_ADMIN operator only, during intake) | Policy — raw file itself is not stored in Supabase Storage; only parsed, PII-screened records persist | See `docs/PILOT_DATA_INTAKE_READINESS.md` §3 |
| PII detected by guard | Email/phone/codice fiscale/IBAN matches, direct-identifier keys | No | N/A | Yes (findings only, never raw values) | Technically enforced — `lib/privacy/pii-guard.ts` | Findings report field paths and risk types only, never the matched value (§8) |
| Credentials/secrets | Passwords, API keys, service-role keys | No | No | No (must never appear in any file, log, or chat) | Policy + this sprint's own operating rules | Never inspected, printed, or copied under any circumstance |
| KORA Link activity/individual physical interaction signals | Individual scan/tap events | No | Not yet applicable | Not yet applicable | **Not implemented** — KORA Link is frozen; no live individual-activity data path exists today | If/when implemented, individual KORA Link activity must never become company-visible (see `docs/KORA_LINK_ADR.md`) |
| Worker-private notes/preferences | `private_note` field on participation records | No | Yes (own only) | No (not exposed in any standard admin route) | Technically enforced — never selected in company or standard admin queries | Explicitly listed as "cannot see — ever" in `docs/privacy-escalation-model.md` |

---

## 4. Role-based visibility matrix

This is a reviewer-readable summary. **`docs/access-matrix.md` remains the authoritative technical matrix** — this table does not replace it, and does not introduce any access rule not already stated there.

| Role | Intended access | Must not access | Key caveats | Canonical source |
|---|---|---|---|---|
| `COMPANY_ADMIN` | Company-level KORA Index, aggregates (N≥10), worker roster metadata (department/site/consent status only), reports | Individual PIB, individual UEF, Dynamic Impact CV, health/psychological data, consent content, groups <10, `worker_kora_id` | Aggregate-only by design; group-size suppression is enforced, not optional | `docs/access-matrix.md`, `docs/privacy-escalation-model.md` |
| `COMPANY_VIEWER` | Read-only subset of `COMPANY_ADMIN`'s aggregate view | Same as `COMPANY_ADMIN`, plus no write/config access | No dedicated row in `access-matrix.md`'s resource table beyond the aggregate-read case; treat as strictly narrower than `COMPANY_ADMIN` | `docs/access-matrix.md` |
| `WORKER` | Own PIB, own event timeline, own Dynamic CV, own consent controls, own participation history | Any other worker's data; company-level scoring internals; pipeline configuration | Fully self-scoped; revoking consent zeroes future contribution to company aggregates | `docs/WORKER_PRIVACY_AND_SHARING.md`, `docs/WORKER_PARTICIPATION_PRIVACY.md` |
| `KORA_ADMIN` | Company-level KORA outputs (as service operator, with audit), tenant/pipeline configuration, HQ Operator Console | Individual worker PIB, individual UEF, real Dynamic CV content, real My KORA personal layer content — no ordinary access | Company-resource access is `ALLOW + audit`, not silent; worker-individual resources are `DENY`, enforced at 3 layers (middleware, server layout, RLS) | `docs/access-matrix.md`, `docs/privacy-escalation-model.md` |
| Technical operator/reviewer | Code, docs, static test results, non-live evidence | Live credentials, secrets, real worker data, Production writes | Distinct from `KORA_ADMIN` — this role reviews artifacts, it does not necessarily hold a live session | This document, `docs/PILOT_OPERATING_RUNBOOK.md` |
| External reviewer/professor/partner | Reviewer-safe docs (this doc, `docs/PILOT_REVIEW_PACKAGE.md`, methodology docs) | Any credential, secret, `.env` file, raw worker data, internal-only archive docs | See `docs/PILOT_REVIEW_PACKAGE.md` §8's external-sharing table for exactly what is safe to hand over | `docs/PILOT_REVIEW_PACKAGE.md` |

---

## 5. Employer/company boundary

- The company sees **aggregate signals and company-facing outputs only**: KORA Index, Confidence Score, Activation Safeguard status, pillar distribution, activation rates, and reports — all at company level.
- The company can use these outputs for organizational learning and action planning (e.g. "which pillar is under-activated," "what does our Confidence Score suggest about data quality").
- The company **must not** see: individual worker identities, raw worker-level behavior, individual KORA Link activity (not yet implemented), private worker notes, or any identifier not required for an aggregate-safe view.
- The company **must not** request, and KORA must not provide: individual ranking, individual monitoring, or any disciplinary use of KORA data. If such a request occurs, treat it as a stop condition (§10).
- **What still needs live proof:** a live, authenticated, cross-tenant HTTP proof that this boundary holds in practice (beyond direct-Postgres and static-source verification) — see §9.

---

## 6. Worker boundary

- Worker-facing privacy/sharing docs exist and are canonical: `docs/WORKER_PRIVACY_AND_SHARING.md` (privacy settings panel, Dynamic Impact CV share-link model) and `docs/WORKER_PARTICIPATION_PRIVACY.md` (initiative participation privacy).
- Worker-level information (PIB, event timeline, Dynamic CV, participation, private notes) is architecturally separate from company aggregate outputs — different routes, different RLS policies, different data-access paths.
- Worker participation/privacy is protected by design and by RLS-backed tests where available (`personal.worker_initiative` and `personal.worker_participation` have no `COMPANY_ADMIN`/`COMPANY_VIEWER` policy at all).
- Worker-facing privacy tests exist (e.g. the 47 invariant tests referenced in `docs/WORKER_PARTICIPATION_PRIVACY.md`) but **are not legal certification** — they are structural/unit-level correctness checks, not a substitute for legal review.
- Any worker-facing consent/control statement made to a pilot company or worker must stay consistent with the existing worker privacy docs — do not introduce a new consent claim in this document that isn't already stated there.

---

## 7. KORA_ADMIN / operator boundary

- `KORA_ADMIN` may operate tenant/data pipelines: provisioning, data intake, UEF review, scoring runs, Decision Pack generation.
- `KORA_ADMIN` access is **not** a blanket permission to view worker-private information — this is the canonical principle stated in `docs/privacy-escalation-model.md`: *"KORA_ADMIN ≠ automatic access to worker PIB."*
- Technical operator access must follow role, purpose, minimization, auditability, and escalation rules. Company-level resource access by `KORA_ADMIN` requires audit logging (`ALLOW + audit` in `docs/access-matrix.md`); worker-individual resources remain `DENY` for `KORA_ADMIN` at all three enforcement layers (middleware, server layout, RLS).
- Privileged access beyond ordinary operations should be treated as exceptional and purpose-bound — the canonical **Privacy Escalation Role** model (`docs/privacy-escalation-model.md`) describes a temporary, audited, scoped elevation for specific scenarios (worker support, rectification, audit, consent dispute, incident response). This model is **documented but not implemented** in Foundation Light — it is the intended design for when real worker identities exist.
- Any unexpected worker-level or sensitive data surfacing to `KORA_ADMIN` outside its documented ordinary-operations scope should trigger a stop/escalation, not silent continuation — see §10.

---

## 8. PII guard and intake minimization

- `lib/privacy/pii-guard.ts` is a real, code-grounded PII detector, not a placeholder. It performs two kinds of detection:
  - **Value-based pattern detection:** email addresses, phone numbers (with economic-field suppression to avoid false positives on amounts/counts), Italian codice fiscale (16-character pattern), and IBAN.
  - **Key-based detection:** exact-match (not substring) flagging of direct-identifier keys (`email`, `phone`, `codice_fiscale`, `iban`, `matricola`, etc.), person-name keys (`name`, `nome`, `cognome`, etc.), and address keys (`indirizzo`, `via`, `city`, etc.).
- **Findings never expose raw values.** Per the module's own critical invariant, findings report only `fieldPath`, `riskType`, and `severity` — never the matched string. Sanitized payloads replace values with `[REDACTED_PII:TYPE]`.
- Intake do-not-send rules are documented in `docs/PILOT_DATA_INTAKE_READINESS.md` §8: passwords/keys/credentials, health records, disciplinary records, fiscal identifiers (unless explicitly justified), unnecessary names/emails, individual worker narratives, and any data not needed for the pilot's stated objective.
- **Distinguish two different guarantees**, exactly as `docs/PILOT_DATA_INTAKE_READINESS.md` §8 already states:
  - **Technically detected/rejected today:** email, phone, Italian codice fiscale, IBAN — actively pattern-matched and rejected at `upload-preview` time.
  - **Policy-level "must not be sent":** health records, disciplinary records, individual worker narratives — these are **not necessarily pattern-detectable** by the current guard. They are enforced by instruction and human review (the pre-upload checklist), not automatic rejection. Do not assume the guard catches everything on the do-not-send list.
- **What happens when unexpected PII appears:** stop immediately, record the specific finding (field paths/types only, never values), escalate to the privacy/governance reviewer, and do not proceed to `accept`. Do not attempt to manually strip and resubmit without the data owner's awareness. This mirrors `docs/PILOT_DATA_INTAKE_READINESS.md` §12's failure-handling table.

---

## 9. Technical controls and evidence

Using the same proven/scaffolded/blocked/deferred framing already established in `docs/PILOT_GOVERNANCE.md`, so as not to introduce a competing claim style:

**Proven** (exercised live, with results recorded):
- Postgres RLS rejects cross-tenant reads on `analytics.source_batch`/`kora_index_result`/`activation_result` — direct-Postgres, simulated JWT claims, 13/13 tests (RLS-03).
- Postgres RLS rejects worker-vs-worker reads on `personal.worker_identity`/`worker_pib` within the same tenant — direct-Postgres, 9/9 tests (RLS-05).
- Every `app/api/**` route (84 files) derives tenant/worker identity from session `app_metadata`, never client input — static source audit (RLS-04).
- Unit/integration suite passing, including route-privacy and tenant-isolation tests (`tests/unit/route-privacy.test.ts`, `tests/unit/tenant-isolation.test.ts`).

**Documented as executed live, staging, 2026-07-09 — not independently re-verified since (updated by B174-A2, 2026-07-12):**
- Two-tenant isolation via authenticated E2E (`T01`/`T02`, `tests/e2e/two-tenant-isolation.spec.ts`) — proves that a `COMPANY_A` session cannot resolve `COMPANY_B`'s data via `/api/company/workspace`, and vice versa. Repo evidence indicates this ran against staging and passed on 2026-07-09. See `docs/E2E_TWO_TENANT_ISOLATION.md`.
- `GD01` (full upload → UEF → scoring → Decision Pack golden path) — fully implemented, skip-safe-verified. Repo evidence indicates it was executed against real staging with real credentials, with explicit founder approval, on 2026-07-09, and passed. See `docs/E2E_GOLDEN_PATH.md`.
- RLS-06's live direct-Postgres positive-control run — repo evidence indicates this also executed (local Postgres only, not staging) on 2026-07-09, 11/11 passed.

**Caveat for the above:** none of this has been independently re-verified in a session after 2026-07-09. This is documented evidence, not a currently-live-checked fact — a fresh, operator-approved confirmation is recommended before it is cited for privacy sign-off on a real pilot data-handling step.

**COMPANY_B status:** repo evidence indicates it was provisioned in staging on 2026-07-09 (previously: absent in every environment, blocking `T01`/`T02` and `A03`/`A04`). Not independently re-verified since — see `docs/PILOT_GOVERNANCE.md` §10/§15a.

**Deferred:**
- Credential cleanup, to the end of the roadmap, by deliberate prior decision.

**Limitations to state explicitly, every time this evidence is cited:**
- RLS-03/04/05/06 are **direct-Postgres with simulated JWT claims or static source audits — none of them constitute a live PostgREST/GoTrue/authenticated-HTTP-request proof.**
- The E2E privacy smoke helper (`tests/e2e/helpers/privacy.ts`) is explicitly self-described as a markup/JSON smoke check for a short list of forbidden identifier patterns — it is **not** a substitute for RLS enforcement and proves nothing about the database layer on its own.
- A passing static or unit test is not the same claim as "a real browser session was rejected by a running server." Do not conflate the two.

---

## 10. Privacy stop conditions

Any of the following is an immediate stop. When one occurs: **(1) stop — (2) record the specific condition — (3) escalate to the founder/operator and privacy/governance reviewer — (4) do not continue to the next step — (5) do not claim the affected proof or process passed.**

| Condition | Action | Escalation | What must not be claimed |
|---|---|---|---|
| Worker-level identifiers exposed to company | Stop immediately | Founder/operator + privacy reviewer | That the privacy boundary held for this session |
| Wrong tenant data visible | Stop immediately | Founder/operator + technical reviewer | That tenant isolation passed |
| Unexpected PII in intake | Stop; do not proceed to `accept` | Privacy/governance reviewer | That the intake file was clean |
| Raw secrets or credentials printed | Stop; treat as an incident | Founder/operator | That the session was safe/clean |
| Unclear data owner | Stop; do not accept the file | Founder/operator | That provenance/evidence quality was confirmed |
| Unclear processing purpose | Stop; do not proceed | Founder/operator | That the data collection was minimization-compliant |
| Production target unclear | Stop; do not run any command | Founder/operator | That the environment boundary was respected |
| Company asks for individual ranking/monitoring | Stop; decline the request | Founder/operator | That this is or will become a KORA capability |
| Company asks for disciplinary use | Stop; decline the request | Founder/operator | That KORA supports this use case |
| Health/medical/disciplinary/sensitive data appears in input | Stop; do not accept | Privacy/governance reviewer | That intake minimization held automatically |
| KORA Link individual activity requested by company | Stop; decline the request | Founder/operator | That individual KORA Link data is or will be company-visible |

---

## 11. External-safe privacy summary

*Reusable, as-is, with pilot partners:*

KORA measures organizations, not individual people. The company sees aggregate, privacy-safe signals — a KORA Index score, activation rates, and pillar-level trends — never an individual employee's identity, score, or activity. Worker-level data (personal timelines, participation history, private notes) belongs to the worker and is never shown to the employer. KORA does not rank employees, does not support disciplinary use, and does not provide employee monitoring. Some parts of this privacy architecture are proven through direct technical testing; other parts — particularly a live, fully authenticated demonstration across two separate companies — are still in progress and not yet claimed as complete. This document, and the summary above, describe KORA's privacy design and current governance status — they are **not a legal privacy policy** and do not constitute a GDPR compliance opinion.

---

## 12. Pilot privacy review checklist

Before any pilot-facing privacy review or data-handling step:

- [ ] Tenant confirmed — correct company/tenant identified, not assumed.
- [ ] Environment confirmed — local/staging/Production explicitly named.
- [ ] Data owner confirmed — who at the company actually produced or approved the data.
- [ ] Purpose confirmed — why this data is needed, tied to a specific KORA Index computation need.
- [ ] Intake minimization checked — against `docs/PILOT_DATA_INTAKE_READINESS.md` §8's do-not-send list.
- [ ] Company-visible output checked — confirmed aggregate-only, no individual identifiers.
- [ ] Worker-level exposure checked — no `worker_id`, `kora_worker_id`, private note, or individual timeline in any company-facing surface.
- [ ] PII guard result checked — `upload-preview` result reviewed, not just assumed clean.
- [ ] Access role checked — the role performing the action matches `docs/access-matrix.md`'s expectations for that resource.
- [ ] Evidence captured — per `docs/PILOT_OPERATING_RUNBOOK.md` §8 (no raw secrets, no unredacted personal data).
- [ ] Live proof limitations stated — anyone reviewing this session understands what is proven vs. scaffolded (§9).
- [ ] Stop conditions reviewed — §10 read before proceeding.

---

## 13. Open questions/blockers

- Two-tenant isolation and `GD01`: repo evidence indicates both ran live and passed against staging on 2026-07-09 (previously listed here as not-yet-run/blocked) — not independently re-verified since; a fresh confirmation is recommended before relying on this for a real pilot privacy sign-off. See `docs/PILOT_GOVERNANCE.md` §15a.
- COMPANY_B: repo evidence indicates provisioned in staging, 2026-07-09 (previously listed here as absent) — not independently re-verified since.
- Privacy governance, as described in this document, is **documentary, not legal certification**.
- A final legal/GDPR/DPO review may still be needed before any real-data rollout (Gate 3 remains OPEN).
- Credential cleanup remains deferred to the end of the roadmap by deliberate prior decision.
- Live validation of the privacy boundary through a real authenticated HTTP request/PostgREST/GoTrue path is still pending.
- Any policy-level prohibition not automatically enforced by current code (e.g. health/disciplinary-record exclusion) must remain stated explicitly wherever this document or its sources are cited — it must not be re-described as "guaranteed by the system" anywhere.

---

## 14. Links to canonical docs

- `docs/access-matrix.md` — the authoritative technical role/resource access matrix; overrides any hardcoded check in code.
- `docs/API_ROUTE_AUTH_MATRIX.md` — per-route (84 files) static auth-guard audit for `app/api/**`.
- `docs/privacy-escalation-model.md` — canonical principle that KORA_ADMIN access ≠ worker-PIB access, plus the Privacy Escalation Role model.
- `docs/WORKER_PARTICIPATION_PRIVACY.md` — RLS-backed architecture for worker initiative/participation privacy, with invariant tests.
- `docs/WORKER_PRIVACY_AND_SHARING.md` — worker-facing privacy settings panel and Dynamic Impact CV share-link model.
- `docs/PILOT_DATA_INTAKE_READINESS.md` — data intake readiness: field dictionary, do-not-send list, PII guard notes, pre-upload checklist.
- `docs/PILOT_OPERATING_RUNBOOK.md` — operating procedure for the pilot validation sequence: roles, stop conditions, evidence collection.
- `docs/PILOT_REVIEW_PACKAGE.md` — reviewer-facing entry point: executive overview, evidence matrix, do-not-claim boundaries, external sharing guidance.
- `docs/PILOT_GOVERNANCE.md` — canonical pilot governance index: proven/scaffolded/blocked/deferred status, final validation sequence.
- `docs/E2E_TWO_TENANT_ISOLATION.md` — what `T01`/`T02` prove, why COMPANY_B currently blocks them, explicit "not run live" statement.
- `docs/E2E_GOLDEN_PATH.md` — what `GD01` proves, required env vars, known gaps, explicit "never executed live" statement.
- `docs/PILOT_DEMO_SCRIPT.md` — controlled demo script for presenting this privacy governance material live, including its own §11 external-safe summary reused there.

---

**Document version:** v1.0
**Created:** 2026-07-07 (PILOT-PRIVACY-GOVERNANCE-01)
