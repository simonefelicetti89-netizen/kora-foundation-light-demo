# KORA — Pilot Demo Script

**Audience:** founder/operator presenting KORA to a pilot company, academic/professor reviewer, technical reviewer, partner/investor/venture studio, or internal operator audience.
**Introduced:** PILOT-DEMO-SCRIPT-01 (2026-07-07)

---

## 1. Purpose and scope

This is a **demo-conversation tool** — a practical script for talking through KORA honestly in a live conversation.

**What this document is not:**
- It is **not a sales deck** and not a pitch exaggeration.
- It is **not proof of live validation** — see §9's "Golden path evidence" stage and `docs/PILOT_GOVERNANCE.md` for what is actually proven.
- It is **not a production-readiness certificate**.
- It is **not a legal/GDPR certification**.
- **It does not authorize** live uploads, `GD01`, Playwright, Supabase access, Production access, credential use, or COMPANY_B provisioning. Giving a demo using this script is not the same action as running a validation session.

**Standing rule:** any live validation step referenced anywhere in this document (running `GD01`, provisioning COMPANY_B, exercising two-tenant isolation live, touching Production) requires its own separate, explicitly approved staging-validation session, per `docs/PILOT_OPERATING_RUNBOOK.md`. Nothing here is a green light for any of those actions.

---

## 2. Demo positioning — 60-second spoken explanation

Use this as a starting point, adapted naturally to the room — not read verbatim:

> "KORA is a human impact intelligence platform. It turns the things a company already does for its people — welfare programs, training, volunteering, collective initiatives — into a structured, explainable measure of how well those initiatives actually reach and activate the workforce. We call that the KORA Index.
>
> KORA measures organizational activation, not individual performance. It's built to answer a question most companies can't answer today: are our people programs actually working, and for how many people? It is not an employee surveillance system, it does not rank or score individual workers, and it is not a replacement for legal, HR, or clinical judgement — those stay exactly where they are.
>
> What you're going to see today is Foundation Light — a real, working prototype with a genuine engineering foundation, running on synthetic or staging data. The pilot exists specifically to validate this controlled flow — how data comes in, how it's protected, and how the output is produced — before any real company data goes through it end to end."

---

## 3. Demo modes by audience

### Pilot company

- **Objective:** help the company understand what KORA would show them, what it needs from them, and what stays private to their workers.
- **What to emphasize:** aggregate-only company visibility, data minimization, the Decision Pack as a concrete output, the operating boundary (KORA_ADMIN runs the pipeline on their behalf today).
- **What to avoid:** promising a specific timeline, implying self-service upload exists today, implying individual worker insights are available to them.
- **Recommended docs/pages to show:** `docs/PILOT_REVIEW_PACKAGE.md` §1-2, `docs/PILOT_DATA_INTAKE_READINESS.md` §13 (company-facing checklist), `docs/PILOT_PRIVACY_GOVERNANCE.md` §11 (external-safe summary), `app/company/kora-index`, `app/company/status`.
- **Likely questions:** "What do you need from us?", "Can we see who's participating?", "What happens if we send the wrong file?"

### Academic/professor reviewer

- **Objective:** demonstrate methodological rigor and honesty about calibration status.
- **What to emphasize:** the 10-component structure, the IU formula, the explicit `pre_empirical_calibration` status, that weights are pre-Delphi provisional scaffolding.
- **What to avoid:** presenting any KORA Index value as empirically validated or cross-company comparable.
- **Recommended docs/pages to show:** `docs/METHODOLOGY.md`, `docs/10-architecture-v3-layer-specification.md`, `app/company/status` (shows the `calibration_status` label live).
- **Likely questions:** "How were the weights chosen?", "What's your calibration plan?", "Why should we trust the model?"

### Technical reviewer

- **Objective:** show engineering substance and be precise about proven vs. scaffolded vs. blocked.
- **What to emphasize:** real RLS enforcement, the 84-route auth audit, the defense-in-depth model, the honest proven/scaffolded/blocked framing already used across the pilot docs.
- **What to avoid:** citing a static test as runtime proof, citing `GD01` or two-tenant isolation as passed.
- **Recommended docs/pages to show:** `docs/access-matrix.md`, `docs/API_ROUTE_AUTH_MATRIX.md`, `docs/E2E_GOLDEN_PATH.md`, `docs/E2E_TWO_TENANT_ISOLATION.md`, `docs/PILOT_GOVERNANCE.md`.
- **Likely questions:** "Has this actually run against a live environment?", "How is tenant isolation enforced?", "What's your test coverage?"

### Partner/investor/venture studio

- **Objective:** convey a credible, honestly-staged path to pilot readiness — substance without overclaiming.
- **What to emphasize:** the evidence matrix in `docs/PILOT_REVIEW_PACKAGE.md`, the clear roadmap of what's left (§16 of `docs/PILOT_GOVERNANCE.md`), the deliberate discipline around not overclaiming.
- **What to avoid:** framing this as production-ready or market-ready; framing scaffolded tests as completed milestones.
- **Recommended docs/pages to show:** `docs/PILOT_REVIEW_PACKAGE.md` (whole doc), `docs/PILOT_SAAS_READINESS.md`, `docs/STATUS.md`.
- **Likely questions:** "What's the biggest blocker to a real pilot?", "What's your timeline?", "What's the moat here?"

### Internal operator

- **Objective:** align on what can and cannot be claimed before any external conversation, and rehearse the operating boundary.
- **What to emphasize:** the do-not-claim list (§4), the stop conditions (§8), the difference between a demo and a validation session.
- **What to avoid:** treating this script as license to run `GD01`, provision COMPANY_B, or touch Production without separate explicit approval.
- **Recommended docs/pages to show:** this document in full, `docs/PILOT_OPERATING_RUNBOOK.md`.
- **Likely questions:** "What am I allowed to say if asked X?", "What do I do if something looks wrong mid-demo?"

---

## 4. Allowed claims / forbidden claims

| Claim area | Allowed wording (spoken) | Forbidden wording | Evidence/source | Caveat |
|---|---|---|---|---|
| KORA Index | "The KORA Index is a company-level score built from 10 components, currently in a pre-empirical calibration stage." | "The KORA Index is a validated, calibrated score." | `docs/METHODOLOGY.md` | Weights are pre-Delphi provisional; never imply cross-company comparability |
| Decision Pack | "The Decision Pack is a report-format output generated from a scoring run — it exists and works today." | "The Decision Pack has been delivered to a real pilot client." | `docs/decision-pack-pdf.md`, `docs/E2E_GOLDEN_PATH.md` | Distinguish the OP-001 synthetic/operator-console version from the live-tenant golden-path version — do not conflate them (see §5, stage 8) |
| Data intake | "We've defined exactly what data we need and what we reject — this is documented and code-grounded." | "Our intake process has been proven with a real client's data." | `docs/PILOT_DATA_INTAKE_READINESS.md` | No real pilot company's data has gone through this pipeline yet |
| PII guard | "We automatically detect emails, phone numbers, Italian codice fiscale, and IBANs in uploaded data and reject them before acceptance." | "Our PII guard catches all sensitive data automatically." | `lib/privacy/pii-guard.ts`, `docs/PILOT_PRIVACY_GOVERNANCE.md` §8 | Health/disciplinary records are policy-level exclusions, not automatically pattern-detected |
| Privacy governance | "We have a documented privacy governance model with clear role boundaries and technical enforcement." | "This is a certified privacy/compliance framework." | `docs/PILOT_PRIVACY_GOVERNANCE.md` | Documentary, not legal certification |
| CI/tests | "We have over 200 test files and 8,000+ passing tests covering the scoring engine, permissions, and route guards." | "Our test suite proves this works in production." | `docs/PILOT_GOVERNANCE.md` §5 | Most are static/unit tests — not the same as live/runtime proof |
| Golden path | "The full upload-to-Decision-Pack flow works when walked through manually by an operator." | "The golden path has been proven in Production." | `docs/GOLDEN_PATH.md`, `docs/GOLDEN_PATH_RUNBOOK.md` | Manual/local-staging only; not exercised in Production beyond login |
| GD01 | "We have a fully built, automated end-to-end test for the golden path, ready to run against staging." | "GD01 has passed" / "the golden path has been automatically verified live." | `docs/E2E_GOLDEN_PATH.md` | **Scaffolded, not live-run** — state this explicitly every time |
| Two-tenant isolation | "Tenant isolation is enforced at the database level, proven directly against Postgres, and we have a ready authenticated test for the application layer." | "Two-tenant isolation has been proven live" / "COMPANY_B demo shows isolation working." | `docs/E2E_TWO_TENANT_ISOLATION.md`, `docs/PILOT_GOVERNANCE.md` §8 | **Scaffolded, not live-run**, blocked on COMPANY_B |
| COMPANY_B | "We have the capability to provision a second company tenant when needed." | "We have a second pilot company set up" / "COMPANY_B exists." | `docs/PILOT_GOVERNANCE.md` §10 | COMPANY_B does not exist in any environment — do not imply otherwise |
| Production readiness | "This is a pilot-grade working prototype, not a market-ready product yet." | "This is production-ready" / "this is ready to onboard paying customers today." | `docs/PILOT_REVIEW_PACKAGE.md` §7 | Explicit do-not-claim boundary — never soften this |
| GDPR/legal compliance | "We've built this with privacy-by-design principles and a documented governance model; legal/DPO review is a separate, still-pending step." | "This is GDPR compliant" / "this meets legal certification requirements." | `docs/PILOT_PRIVACY_GOVERNANCE.md` §1 | Gate 3 (legal/privacy) remains OPEN — never claim compliance |
| KORA Link | "KORA Link is a planned future capability, currently frozen with no live coupling to the pilot path." | "KORA Link is active" / "KORA Link can track individual interactions today." | `docs/KORA_LINK_STATUS.md` | Frozen; zero code coupling to golden path |
| KORA Space | "KORA Space is part of our broader roadmap." | Any claim it's active in the pilot path beyond its current documented scope | `CLAUDE.md` (capability scope matrix) | Do not expand its described scope in conversation |
| Worker privacy | "Worker-level data — timelines, personal notes, individual scores — is never shown to the employer, by design and by database-level enforcement." | "Workers have no privacy concerns because it's anonymized" (overclaim of a different mechanism) | `docs/WORKER_PRIVACY_AND_SHARING.md`, `docs/privacy-escalation-model.md` | It's role/RLS-based separation, not anonymization — be precise about the mechanism |
| Employer/company visibility | "The company sees aggregate signals only — KORA Index, activation rates, pillar trends — never individual identities." | "The company can drill down to see who did what." | `docs/access-matrix.md` | Groups below N=10 are suppressed entirely, not merely aggregated |

---

## 5. Suggested demo flow

### Stage 1 — Opening
- **Show:** nothing yet — set context verbally.
- **Say:** introduce yourself, the purpose of the session, and that this is a demo of a pilot-grade prototype, not a finished commercial product.
- **Don't say:** anything implying this is a sales close or a signed engagement.
- **Fallback:** none needed — this stage is verbal only.

### Stage 2 — Problem
- **Show:** nothing yet, or a simple verbal framing.
- **Say:** most companies run welfare/training/volunteering programs but can't measure whether they actually activate their workforce.
- **Don't say:** anything competitive/disparaging about specific named HR platforms.
- **Fallback:** none needed.

### Stage 3 — KORA concept
- **Show:** the 60-second explanation (§2), optionally alongside `docs/PILOT_REVIEW_PACKAGE.md` §1 on screen.
- **Say:** the §2 script, adapted to the room.
- **Don't say:** "KORA Index" without ever mentioning `pre_empirical_calibration` at some point in the conversation.
- **Fallback:** `docs/PILOT_REVIEW_PACKAGE.md` §1 alone, read aloud, if no screen is available.

### Stage 4 — Governance boundary
- **Show:** `docs/PILOT_GOVERNANCE.md` (proven/scaffolded/blocked/deferred framing).
- **Say:** we are explicit and disciplined about what's proven vs. not — this is a feature of how we operate, not a weakness.
- **Don't say:** anything that blurs "scaffolded" into "done."
- **Fallback:** the printed/exported doc itself works fine as a fallback — it's designed to be read directly.

### Stage 5 — Data intake readiness
- **Show:** `docs/PILOT_DATA_INTAKE_READINESS.md` §13 (company-facing checklist).
- **Say:** what data we'd ask for, in what format, and what we explicitly reject.
- **Don't say:** that this has been run with any real company's data yet.
- **Fallback:** §13 alone is short enough to read aloud or share as a one-pager.

### Stage 6 — Privacy governance
- **Show:** `docs/PILOT_PRIVACY_GOVERNANCE.md` §11 (external-safe summary) and, for technical audiences, §3's data visibility table.
- **Say:** the external-safe summary, verbatim or near-verbatim.
- **Don't say:** "GDPR compliant" or "legally certified" in any form.
- **Fallback:** §11 is written to be reused as-is, including outside a live session.

### Stage 7 — Company workspace / KORA Index / activation / pillars / financial / reports
- **Show:** `app/company/kora-index`, `app/company/activation`, `app/company/pillars`, `app/company/financial`, `app/company/reports`, `app/company/status` — these are real, live-only, per-tenant pages (no synthetic fallback), so this requires a real staging session with a valid tenant.
- **Say:** point out the non-suppressible labels on `app/company/status` (Confidence Score, `calibration_status: pre_empirical_calibration`) as evidence of the governance discipline, not just a claim.
- **Don't say:** imply this data belongs to a real pilot company unless it genuinely does — if this is `STAGE-001` or synthetic data, say so.
- **Fallback:** if the live app is unavailable, walk through `docs/decision-pack-pdf.md`'s description of the Executive Snapshot and `docs/METHODOLOGY.md`'s component table instead, or use `app/demo/**` screens explicitly framed as synthetic/showcase (see §6).

### Stage 8 — Decision Pack concept
- **Show:** either the HTML preview (`/api/admin/decision-pack/preview`) if in a live KORA_ADMIN session, or `docs/decision-pack-pdf.md`'s description.
- **Say:** explicitly distinguish two things if both come up: the **OP-001 synthetic/operator-console Decision Pack** (`docs/decision-pack-pdf.md`, accessible via `/admin/operator`) is a demo/showcase artifact on synthetic data; the **live-tenant golden-path Decision Pack** (`docs/E2E_GOLDEN_PATH.md`) is generated from a real scoring run on a real (even if disposable staging) tenant, but is only reachable via direct API call today, with no UI button wired to it from the live flow. Never let these two blur together in the conversation.
- **Don't say:** that either one has been delivered to, or reviewed by, a real pilot company.
- **Fallback:** `docs/decision-pack-pdf.md` §1 ("What it generates") read aloud, with the two-artifacts distinction stated explicitly.

### Stage 9 — Golden path evidence
- **Show:** `docs/E2E_GOLDEN_PATH.md`.
- **Say:** "the full pipeline is built and works manually; we also have a fully automated end-to-end test for it (`GD01`) that is built and verified statically, but **has not been run live yet** against staging."
- **Don't say:** "GD01 passed" or any wording implying it executed.
- **Fallback:** the doc itself is written to be shared as-is with a technical reviewer.

### Stage 10 — Two-tenant isolation status
- **Show:** `docs/E2E_TWO_TENANT_ISOLATION.md`.
- **Say:** "tenant isolation is proven at the database level directly against Postgres; the authenticated, live, two-company version of this test is built and ready but **has not run live yet**, because it requires a second company tenant (COMPANY_B) that does not currently exist."
- **Don't say:** "two-tenant isolation is proven" without the RLS-vs-live-authenticated distinction; do not imply COMPANY_B exists.
- **Fallback:** the doc itself, plus `docs/access-matrix.md` for the underlying design if a deeper technical dive is requested.

### Stage 11 — Operating runbook
- **Show:** `docs/PILOT_OPERATING_RUNBOOK.md` (roles, stop conditions, evidence collection).
- **Say:** this is how we run the remaining validation sequence safely, once approved — it's a procedure, not a promise of a date.
- **Don't say:** commit to a specific date for any step in the sequence.
- **Fallback:** the doc's §5 (validation sequence) and §16 in `docs/PILOT_GOVERNANCE.md` are consistent and either can be shown.

### Stage 12 — Next-step validation
- **Show:** `docs/PILOT_GOVERNANCE.md` §16 (final validation sequence).
- **Say:** the ordered list of what happens next (A02, COMPANY_B provisioning, A03/A04, T01/T02, GD01, RLS-06 live, credential cleanup, final review) — framed as intended order, not a committed timeline.
- **Don't say:** that any of these steps will happen "today" or "this week" unless that has actually been separately approved and scheduled.
- **Fallback:** the numbered list itself, read aloud.

### Stage 13 — Close
- **Show:** the follow-up package (§10).
- **Say:** summarize what was shown, what's proven vs. not, and what the natural next step would be if they want to proceed.
- **Don't say:** anything that sounds like a signed commitment if none exists.
- **Fallback:** send the follow-up package by email/doc share regardless of how the live portion went.

---

## 6. Safe pages/docs to show

| Item/page/doc | Safe to show? | Audience | Caveat |
|---|---|---|---|
| `docs/PILOT_REVIEW_PACKAGE.md` | Yes | All | Designed for exactly this purpose |
| `docs/PILOT_GOVERNANCE.md` | Yes | Technical, investor | Dense — pair with verbal walkthrough |
| `docs/PILOT_OPERATING_RUNBOOK.md` | Yes | Technical, internal operator | Operational tone, not audience-tailored |
| `docs/PILOT_DATA_INTAKE_READINESS.md` | Yes | Pilot company, technical | §13 is the company-facing subset |
| `docs/PILOT_PRIVACY_GOVERNANCE.md` | Yes | All | §11 is the reusable external-safe summary |
| `docs/E2E_GOLDEN_PATH.md` | Yes | Technical | Already discloses "not run live" honestly |
| `docs/E2E_TWO_TENANT_ISOLATION.md` | Yes | Technical | Already discloses "not run live" honestly |
| `docs/METHODOLOGY.md` | Yes | Academic/professor, technical | Concise and accurate |
| `docs/decision-pack-pdf.md` | Yes, technical framing | Technical | Describes the OP-001 synthetic artifact specifically — state that distinction if the live-tenant path also comes up |
| `app/company/workspace` | Conditional | Pilot company, technical | Live-only, per-tenant — requires a real staging session and valid tenant credentials; not a synthetic fallback |
| `app/company/kora-index` | Conditional | Pilot company, academic, technical | Same as above; shows non-suppressible calibration labels |
| `app/company/activation` | Conditional | Pilot company, technical | Same as above |
| `app/company/pillars` | Conditional | Pilot company, technical | Same as above |
| `app/company/financial` | Conditional | Pilot company, technical | Same as above |
| `app/company/reports` | Conditional | Pilot company, technical | Same as above |
| `app/company/status` | Conditional | Technical, academic | Good screen specifically to show the calibration_status label live |
| `app/company/ingestion` | Conditional | Technical | Same live-session caveat |
| `app/company/data` | Conditional | Technical | Same live-session caveat |
| `app/company/data/upload` | Conditional — **boundary/preview only** | Pilot company, technical | Show as "here is the boundary," not as a live self-service upload path — its own on-screen copy states Foundation Light does not require self-service client upload |
| `app/demo/**` | Yes, framed explicitly as synthetic/showcase | All, especially as fallback | Never present as live pilot evidence — always label as synthetic/demo when shown |

**All "Conditional" rows require a real staging (or local dev backed by staging Supabase) session with valid, non-production credentials — never Production, never credentials typed or shown on screen.**

---

## 7. Pre-demo checklist

- [ ] Environment confirmed (local/staging) — never Production unless explicitly separately approved.
- [ ] Correct tenant confirmed — know exactly which tenant/company data will be shown, and whether it's synthetic or a disposable staging tenant.
- [ ] No secrets visible in terminal, browser address bar, browser history, or screen-share.
- [ ] Credentials not shown or typed on screen during the session.
- [ ] Demo data only, unless real data use has been explicitly separately approved.
- [ ] No live upload will occur unless explicitly separately approved for this specific session.
- [ ] `GD01`/two-tenant-isolation status caveats reviewed and ready to state precisely (§5 stages 9-10).
- [ ] Privacy caveats reviewed (§6 of `docs/PILOT_PRIVACY_GOVERNANCE.md`, external-safe summary in §11).
- [ ] Do-not-claim list reviewed (§4 above).
- [ ] Fallback docs ready and open/printed in case the live app is unavailable.
- [ ] App-unavailable fallback path confirmed for each stage that depends on a live page (§5, "fallback" column).
- [ ] Follow-up package (§10) ready to send immediately after the session.

---

## 8. Demo stop conditions

Any of the following is an immediate stop. When one occurs: **(1) stop — (2) do not continue the current stage — (3) do not claim the affected item passed or exists — (4) follow up separately once resolved.**

| Stop condition | Action | What must not be claimed | Follow-up |
|---|---|---|---|
| Wrong tenant visible | Stop the screen-share/navigation immediately | That tenant selection was correct | Re-confirm the correct tenant before resuming |
| Worker-level data visible to company | Stop immediately, close the view | That the privacy boundary held for this session | Escalate to the privacy/governance reviewer per `docs/PILOT_OPERATING_RUNBOOK.md` |
| Unexpected PII visible | Stop immediately | That the shown data was privacy-safe | Escalate; do not continue the demo on that dataset |
| Secret/key printed | Stop immediately, redact from any recording | That the session was safe | Treat as an incident; do not share any recording |
| Unclear environment | Stop; confirm before continuing | That environment discipline was maintained | Confirm local/staging/Production explicitly before resuming |
| Live upload starts accidentally | Stop the upload immediately if possible | That any upload was intentional or approved | Escalate; follow `docs/PILOT_DATA_INTAKE_READINESS.md` §12 failure handling |
| Production target unclear | Stop; do not proceed on assumption | That Production was an approved target | Confirm explicitly before any further action |
| Reviewer asks for forbidden individual-worker use case | Decline clearly, state the constitutional boundary | That KORA does or will support this | Point to `docs/access-matrix.md`/`docs/privacy-escalation-model.md` as the reason |
| Reviewer asks for disciplinary monitoring | Decline clearly | That KORA supports or will support this | Same as above |
| App state inconsistent with claims | Stop; do not paper over the discrepancy | That the claim being made is accurate | Note the discrepancy, investigate afterward, correct the doc if needed |
| COMPANY_B/two-tenant proof implied without evidence | Correct the statement immediately in the room | That two-tenant isolation or COMPANY_B is proven/exists | Restate the actual status per §5 stage 10 |
| GDPR/legal compliance requested as a certification | Decline to certify; restate honestly | That KORA is GDPR compliant or legally certified | Point to Gate 3 (still OPEN) and `docs/PILOT_PRIVACY_GOVERNANCE.md` §1 |

---

## 9. Objection/Q&A bank

**"Is this GDPR compliant?"**
We've built this with privacy-by-design principles and a documented governance model, but we don't claim GDPR compliance or legal certification — that requires a separate legal/DPO review, which is still pending (Gate 3 is open).

**"Can the company see individual workers?"**
No. The company only ever sees aggregate, company-level outputs. Individual worker data — timelines, scores, personal notes — is architecturally separated and enforced at the database level; it's never returned to an employer-facing route.

**"Is this production-ready?"**
No. This is a pilot-grade working prototype — real engineering, real methodology, running on synthetic and staging data. It's not yet a market-ready, self-service product.

**"Has the full golden path been live-run?"**
The pipeline works when walked through manually by an operator. We also have a fully automated end-to-end test built for it, but it has not been executed live against staging yet — that's one of the next steps in our validation sequence.

**"Does two-tenant isolation work live?"**
Tenant isolation is proven directly at the database level. The live, authenticated, two-company version of that proof is built and ready, but hasn't run yet, because it needs a second company tenant that doesn't exist yet.

**"Can we use KORA Link to monitor individuals?"**
No. KORA Link is a frozen, future capability with no live coupling to the platform today, and even in its intended design, individual-level KORA Link activity would never become company-visible — that's a constitutional boundary, not a current limitation we intend to relax.

**"What data do you need from us?"**
Aggregate, program-level data — initiative names, categories, participant counts, budget — never individual employee lists, names, or contact details for the pilot's purposes.

**"What happens if PII is uploaded?"**
It's automatically screened before acceptance — known patterns like emails, phone numbers, codice fiscale, and IBANs are detected and rejected, and the file is returned for correction. Some categories, like health or disciplinary data, rely on human review as well as automatic detection.

**"How does this differ from HR analytics?"**
HR analytics typically reports on individual employee metrics. KORA is designed specifically to never do that for employers — it produces an organizational-level activation measure, not an individual performance or engagement score.

**"What is still missing before pilot?"**
A live-run of the full automated golden path, a live two-tenant isolation proof (blocked on provisioning a second company), and a final legal/privacy review before real worker data is processed.

**"Why should we trust the model?"**
We're explicit that the current weights are pre-empirical, provisional scaffolding — every KORA Index output says so directly. The methodology is documented, versioned, and designed to be calibrated empirically post-pilot, not presented as already validated.

**"What does the professor/reviewer need to check?"**
The methodology documents (`docs/METHODOLOGY.md`, the 10-component and IU-formula specification), and the explicit calibration-status labeling that appears on every KORA Index surface — that's the honest, checkable claim we're making.

---

## 10. Follow-up package

| Document | Why to send it | Intended audience |
|---|---|---|
| `docs/PILOT_REVIEW_PACKAGE.md` | Single reviewer-facing entry point: overview, evidence matrix, do-not-claim boundaries | All |
| `docs/PILOT_OPERATING_RUNBOOK.md` | Shows the disciplined procedure for the remaining validation sequence | Technical reviewer, partner/investor |
| `docs/PILOT_DATA_INTAKE_READINESS.md` | Concrete detail on what data intake actually involves | Pilot company, technical reviewer |
| `docs/PILOT_PRIVACY_GOVERNANCE.md` | Consolidated privacy governance summary | All, especially pilot company and privacy-conscious reviewers |
| `docs/E2E_GOLDEN_PATH.md` | Honest detail on what `GD01` proves and doesn't | Technical reviewer |
| `docs/E2E_TWO_TENANT_ISOLATION.md` | Honest detail on two-tenant isolation status | Technical reviewer |
| `docs/METHODOLOGY.md` | Methodology reference, versioning, calibration status | Academic/professor reviewer, technical reviewer |
| `docs/decision-pack-pdf.md` | Technical detail on the Decision Pack artifact | Technical reviewer |
| Next-step validation plan (`docs/PILOT_GOVERNANCE.md` §16) | What happens next, in what order, contingent on approval at each step | Pilot company, partner/investor, internal operator |

---

## 11. Open questions/blockers

- `GD01` not live-run — deferred to the final pilot-validation session by design.
- Two-tenant isolation (`T01`/`T02`) not live-run — blocked on COMPANY_B's absence.
- COMPANY_B absent in every environment.
- Credential cleanup deferred to the end of the roadmap by deliberate decision.
- Final staging validation sequence still pending (`docs/PILOT_GOVERNANCE.md` §16).
- No GDPR legal opinion has been obtained — Gate 3 remains OPEN.
- No production-readiness claim is made anywhere in this document or should be made in any demo.
- Live pilot data has not yet been validated end-to-end through the real pipeline.
- The final pilot intake template/schema decision is still pending (`docs/PILOT_DATA_INTAKE_READINESS.md` §6) — do not present either existing template as final if this comes up.

---

## 12. Links to canonical docs

- `docs/PILOT_REVIEW_PACKAGE.md` — reviewer-facing entry point: executive overview, evidence matrix, do-not-claim boundaries, external sharing guidance.
- `docs/PILOT_GOVERNANCE.md` — canonical pilot governance index: proven/scaffolded/blocked/deferred status, final validation sequence.
- `docs/PILOT_OPERATING_RUNBOOK.md` — operating procedure for the remaining pilot validation sequence: roles, stop conditions, evidence collection.
- `docs/PILOT_DATA_INTAKE_READINESS.md` — data intake readiness: field dictionary, do-not-send list, PII guard notes, company-facing checklist.
- `docs/PILOT_PRIVACY_GOVERNANCE.md` — consolidated pilot privacy governance summary: data visibility, role boundaries, stop conditions.
- `docs/E2E_GOLDEN_PATH.md` — what `GD01` proves, required env vars, known gaps, explicit "never executed live" statement.
- `docs/E2E_TWO_TENANT_ISOLATION.md` — what `T01`/`T02` prove, why COMPANY_B currently blocks them, explicit "not run live" statement.
- `docs/METHODOLOGY.md` — KORA Index v1.0 / Methodology Architecture v3 reference: 10 components, IU formula, calibration status.
- `docs/decision-pack-pdf.md` — technical documentation of the Decision Pack PDF/HTML artifact (OP-001 synthetic operator-console version).
- `docs/access-matrix.md` — the authoritative role/resource access matrix.
- `docs/API_ROUTE_AUTH_MATRIX.md` — per-route (84 files) static auth-guard audit for `app/api/**`.

---

**Document version:** v1.0
**Created:** 2026-07-07 (PILOT-DEMO-SCRIPT-01)
