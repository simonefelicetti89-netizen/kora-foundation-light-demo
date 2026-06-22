# Gate 3 — Legal/DPO Readiness Review

**Status:** GATE 3 OPEN — NOT CLOSED  
**Review type:** Legal/privacy architecture readiness assessment — NOT legal advice  
**Date:** 2026-06-22  
**HEAD at review:** `5e5f952`  
**Gate 2 status:** CLOSED WITH CONDITIONS  
**Staging project:** `haqflkurpmeaxpikozjl` — staging only  
**Production:** NOT touched  
**Migration 027:** NOT applied  
**Migration 029:** NOT applied — emergency safety net only  

---

> **DISCLAIMER — NOT LEGAL ADVICE**  
> This document is a structured privacy/legal architecture readiness assessment produced by the technical team. It is not legal advice, does not constitute a DPO opinion, and does not substitute for review by a qualified data protection officer, privacy counsel, or external legal advisor. No GDPR compliance is claimed by this document. All conclusions are classified as "likely", "possible", "requires external legal validation", or "blocker" accordingly. External qualified review is mandatory before any real worker data, real HR data, or real company onboarding proceeds.

---

## 1. Scope

This review assesses KORA's legal/privacy architecture readiness prior to:

- introduction of real worker data into any environment;
- real company onboarding;
- application of migration 027 (personal schema RLS hardening);
- any external demo involving real data;
- production deployment.

It does not assess Gate 5 (Tax/Fiscal) scope. It does not assess commercial contracts.

**KORA identity constraint (non-negotiable — from CLAUDE.md §1-2):**

KORA is a Human Impact Intelligence Platform. KORA measures **organizations**, not individuals. The KORA Index is a company-level output. Individual intermediate data (PIB, IU, UEF) exists only to produce that aggregate — never to rate, rank, or surveil individual workers. KORA is not an HR surveillance tool, not a welfare platform, not an employee rating tool, not a wellbeing tracker, not a social feed, and not a gamification platform.

---

## 2. Role Model Assessment

> **Classification key:** LIKELY · POSSIBLE · REQUIRES EXTERNAL LEGAL VALIDATION · BLOCKER

### 2.1 Controller/Processor Analysis

| Actor | Likely role | Classification |
|---|---|---|
| **Employer (company)** | Data controller for HR/welfare program records provided to KORA and for company-level outputs received from KORA | LIKELY |
| **KORA** (platform) | Data processor for employer-provided HR/welfare data ingested via the AI Upload Studio and processed through the 14-stage algorithm | LIKELY |
| **KORA** (platform) — My KORA layer | Independent data controller for worker-private personal data stored in My KORA (PIB, Dynamic CV, personal history, consent records) where KORA determines purposes and means independently of the employer | POSSIBLE / REQUIRES EXTERNAL LEGAL VALIDATION |
| **Joint controllership** (KORA + employer for company KORA Index outputs) | Joint controllers if both KORA and the employer co-determine the purposes and means of processing that produces the KORA Index | POSSIBLE — requires external legal validation and a joint controllership arrangement per Art. 26 GDPR if applicable |
| **Workers** | Data subjects — not controllers | CONFIRMED |
| **Partners (KCP/non-KCP)** | Data controllers for their own participant records; potentially processors for data they transmit to KORA | REQUIRES EXTERNAL LEGAL VALIDATION |
| **KORA Space** | KORA likely acts as controller for posts, interactions, and commons data if KORA determines the purpose; employer may be joint controller if it manages the space | REQUIRES EXTERNAL LEGAL VALIDATION |

### 2.2 Required Agreements

| Agreement | Requirement | Classification |
|---|---|---|
| Data Processing Agreement (DPA) — KORA ↔ employer | **REQUIRED** before any real worker data is processed | BLOCKER |
| Joint Controllership Agreement — if joint controllership applies | **REQUIRED** if Art. 26 applies | BLOCKER if applicable |
| Worker-facing Privacy Notice | **REQUIRED** — workers are data subjects and must be informed about My KORA and PIB processing | BLOCKER |
| Employer-facing Privacy Notice | **REQUIRED** — COMPANY_ADMIN and COMPANY_VIEWER are data subjects too | LIKELY REQUIRED |
| Partner DPA / Data Addendum | **REQUIRED** if partners transmit personal data to KORA | BLOCKER for partner integrations |
| KORA Space Moderation / Privacy Terms | **REQUIRED** if KORA Space is live with real workers | LIKELY REQUIRED |

### 2.3 Direct Worker Relationship

The My KORA layer creates a direct controller-data subject relationship between KORA and the worker that is **independent of the employer**. This is architecturally correct (PIB is private) but legally significant: KORA must maintain its own legal basis for My KORA processing, independent of the DPA with the employer.

Worker consent in an employment context is **presumptively invalid** under GDPR Recital 43 and EDPB guidelines on processing of personal data in the employment context (WP249/2017). Any reliance on worker consent for processing linked to employment must be assessed by a qualified DPO.

---

## 3. Lawful Basis and Consent Risk Assessment

### 3.1 Per processing activity

| Processing activity | Candidate lawful basis | Consent risk | Classification |
|---|---|---|---|
| Employer imports HR/welfare program records | Art. 6(1)(b) — contract performance (employer-worker) or Art. 6(1)(f) legitimate interest (company analytics) | Low for company-side; workers must be informed | REQUIRES EXTERNAL LEGAL VALIDATION |
| Worker creates / uses My KORA personal PIB | Art. 6(1)(b) — performance of service to worker, or Art. 6(1)(a) — consent | Consent in employment context is likely invalid as standalone basis. Service contract preferred if KORA offers a direct worker service | REQUIRES EXTERNAL LEGAL VALIDATION — preferred: service contract or separate worker Terms of Service |
| Worker participation/activation events (UEF records) | Art. 6(1)(b) or 6(1)(f) | Events triggered by employer programs require employer to have valid basis; KORA processes as processor | REQUIRES EXTERNAL LEGAL VALIDATION |
| KORA Space interactions (posts, bookings) | Art. 6(1)(b) — community service contract, or Art. 6(1)(a) — consent | Consent acceptable only if genuinely free, but employment context creates pressure | REQUIRES EXTERNAL LEGAL VALIDATION |
| Aggregated company KORA Index | Art. 6(1)(f) — legitimate interest (organizational analytics) likely; employer-controller basis | Low — aggregate and anonymized where threshold rules apply | LIKELY VIABLE with balancing test |
| Analytics / benchmarking (cross-company) | Art. 6(1)(f) — research/analytics; pseudonymized or aggregated | Acceptable only if data is genuinely non-attributable to workers | REQUIRES EXTERNAL LEGAL VALIDATION |
| AI ingestion assistant v0.1 (BCM taxonomy classifier — no external LLM) | Processor function — inherits employer's lawful basis | Lower risk — rule-based only, no external API on worker/HR data | LIKELY ACCEPTABLE with documentation |
| Special category data — health/mental health (LIFE pillar) | Art. 9(2)(a) — explicit consent, or Art. 9(2)(b) — employment context | **HIGH RISK** — explicit consent required; consent in employment context is structurally problematic | BLOCKER — requires specific DPO and legal opinion before processing |

### 3.2 Consent invalidity in employment context

**This is the most critical lawful basis risk for KORA.**

GDPR Recital 43 states that consent should not provide a valid legal ground for processing where there is a clear imbalance between the data subject and the controller, in particular where the controller is a public authority. The EDPB (WP249/2017) extends this to employment relationships: workers are generally not in a position to freely give, refuse, or revoke consent because they fear disadvantage from their employer if they refuse.

Implications for KORA:
1. Any "opt-in" for KORA program participation that is de facto mandatory (e.g., employer makes participation a workplace program) cannot rely on consent as lawful basis.
2. My KORA private layer, where the worker independently controls their own data, has a stronger case for consent — but only if the employer has zero visibility and zero incentive/disincentive impact on the choice.
3. Special category data (health, psychological support, caregiver status) in the LIFE pillar requires explicit consent under Art. 9 regardless of employer context, but the structural coercion risk remains.

**Mitigation required:** External DPO must assess and document the lawful basis for each processing category. Consent fallbacks must not be used as the primary basis for employment-linked processing.

### 3.3 Minimization strategy

| Principle | KORA architecture control |
|---|---|
| Purpose limitation | PIB computed only to produce aggregate KORA Index. PIB never retained or used for individual evaluation by employer |
| Data minimization | UEF records contain only event-level data necessary for IU calculation. No behavioral profiling beyond the event |
| Storage limitation | Retention policy required — especially for UEF records and PIB intermediates |
| Accuracy | Evidence verification (EV correction factor) and Data Quality Engine (Stage 4) enforce quality |
| Integrity/confidentiality | RLS on all personal.* tables; FORCE RLS; SECURITY DEFINER functions; pseudonym layer |
| Employer visibility | Hard architecture boundary: employer never sees individual PIB, UEF trace, or worker identity linkage |

---

## 4. Data Classification Matrix

> **Employer visibility codes:** ALLOWED · AGGREGATE ONLY · THRESHOLD GATED · BLOCKED  
> **Special category risk:** HIGH · MEDIUM · LOW · NONE

| # | Data category | Personal data | Special category risk | Employer visibility | Worker visibility | Retention sensitivity | Legal/DPO review required |
|---|---|---|---|---|---|---|---|
| 1 | Company master data (name, slug, tier, status) | No | NONE | ALLOWED | BLOCKED (not worker-facing) | Low | No |
| 2 | Workforce counts / aggregates (headcount, activation rate) | No — anonymized aggregate | NONE | AGGREGATE ONLY | Summary only | Low | Confirm anonymization standard |
| 3 | HR/welfare program records (raw upload) | YES — event + participant | MEDIUM (may include health) | BLOCKED (processed as input only) | Worker sees own | High | YES — DPO review before ingestion |
| 4 | UEF event records (normalized, pseudonymized) | YES — pseudonymized | MEDIUM | BLOCKED | Worker sees own | High | YES — retention and pseudonymization policy |
| 5 | Impact Units (IU per event per pillar) | YES — derivable per worker | MEDIUM | BLOCKED | Worker sees own | High | YES |
| 6 | Worker PIB (sum of pillar IU) | YES — individual scored data | MEDIUM | **BLOCKED — HARD ARCHITECTURAL RULE** | Worker sees own only | Very high | YES — DPIA trigger candidate |
| 7 | Worker identity (name, auth_user_id, pseudonym_id) | YES — directly identifiable | LOW | **BLOCKED** | Worker sees own | Very high | YES |
| 8 | Pseudonym map (worker_id ↔ pseudonym_id) | YES — re-identification key | LOW | **BLOCKED** | BLOCKED | Very high | YES — access controls critical |
| 9 | KORA Index (company-level, 10 components) | NO — organizational output | NONE | ALLOWED | Summary awareness | Medium | No — but methodology disclaimer required |
| 10 | Confidence Score | NO — methodology quality indicator | NONE | ALLOWED (always with KORA Index) | Allowed | Medium | No |
| 11 | Eligibility Gate classification (CLEAR/WARNING/FLAGGED) | NO | NONE | ALLOWED | Not relevant | Low | No |
| 12 | Compliance/HSE/legal records | **BLOCKED from KORA scoring** | N/A — excluded | N/A | N/A | N/A | Confirm exclusion in DPO review |
| 13 | Economic relief / cash-like benefits | Limited — financial transaction data | LOW | BLOCKED for individual | Company-level aggregate only | Medium | YES — separate classification in DPO review |
| 14 | Health/wellbeing initiative participation | YES — special category adjacent | **HIGH** | **BLOCKED** | Worker sees own | Very high | **BLOCKER — Art. 9 basis required before processing** |
| 15 | Mental health / caregiver / medical support | YES — special category | **HIGH** | **BLOCKED** | Worker sees own (if opt-in) | Very high | **BLOCKER — Art. 9 explicit consent or exemption required** |
| 16 | Training / upskilling records (GROWTH pillar) | YES — employee development | LOW | BLOCKED for individual; company aggregate allowed | Worker sees own | Medium | YES — employment context review |
| 17 | KORA Space posts / interactions | YES — potentially identifiable | LOW | Company sees aggregate (anonymized); no attribution to individual | Worker sees own | Medium | YES — moderation and retention policy |
| 18 | KORA Link scans (future / FV) | YES — physical location trace | **MEDIUM-HIGH** | BLOCKED for individual | Worker sees own | High | YES — location/presence data requires specific basis |
| 19 | Partner event participation | YES — pseudonymized | LOW-MEDIUM | BLOCKED for individual; aggregate only | Worker sees own | Medium | YES — partner DPA and data flow documentation |
| 20 | Audit logs | YES — system access traces | LOW | KORA_ADMIN only; COMPANY_ADMIN operational audit only | BLOCKED | High | YES — retention and access policy |

---

## 5. Employer Visibility Boundary

This section formalizes the architectural privacy boundary for all employer-facing roles. These boundaries are enforced in code (RLS, SECURITY DEFINER functions, `RolePermissionService`, `PrivacyVisibilityService`) and must also be formalized in legal terms (DPA annexes, processing agreements).

### 5.1 Role visibility matrix

| Data type | KORA_ADMIN | COMPANY_ADMIN | COMPANY_VIEWER | WORKER | ADVISOR | PARTNER |
|---|---|---|---|---|---|---|
| Company-level KORA Index + 10 components | ✓ | ✓ | ✓ | Summary | ✓ (advisory) | Blocked |
| Confidence Score | ✓ | ✓ | ✓ | Summary | ✓ | Blocked |
| Activation Safeguard status | ✓ | ✓ | ✓ | Blocked | ✓ | Blocked |
| Company pillar distribution (aggregate) | ✓ | ✓ | ✓ | Blocked | ✓ | Blocked |
| Department/cohort trends (≥10 group size) | ✓ | ✓ (threshold gated) | ✓ (threshold gated) | Blocked | ✓ | Blocked |
| Individual Worker PIB | ✓ (pre-027 only) | **BLOCKED** | **BLOCKED** | Own only | Blocked | Blocked |
| Individual UEF records | ✓ (pre-027 only) | **BLOCKED** | **BLOCKED** | Own only | Blocked | Blocked |
| Individual Impact Units | ✓ (pre-027 only) | **BLOCKED** | **BLOCKED** | Own only | Blocked | Blocked |
| Worker identity (name, auth linkage) | ✓ (admin) | **BLOCKED** | **BLOCKED** | Own only | Blocked | Blocked |
| Pseudonym map | ✓ (admin) | **BLOCKED** | **BLOCKED** | Blocked | Blocked | Blocked |
| My KORA content (timeline, CV, bookings, consent) | Blocked | **BLOCKED** | **BLOCKED** | Own only | Blocked | Blocked |
| Health / mental health program details | Blocked | **BLOCKED** | **BLOCKED** | Own only | Blocked | Blocked |
| KORA Space posts (attributed) | Admin moderation | Aggregate only | Blocked | Own + anonymous others | Blocked | Blocked |

### 5.2 Aggregation thresholds

- Department/cohort data: minimum group size = **10** (`safe_aggregation_threshold`). Groups below 10 are suppressed with `PrivacyBoundaryNotice`.
- No suppression bypass. Suppression renders a notice — never silently empty, never approximated.
- Pillar breakdown at company level is permitted only as a company-aggregate, not as a per-worker breakdown.

### 5.3 Export/download rules

- Report exports (Decision Pack, Board Pack, CSV exports): aggregate data only. No individual worker rows.
- KORA_ADMIN exports: may include pseudonymized pipeline diagnostics for QA. No real name linkage in exports.
- Audit log exports: restricted to KORA_ADMIN. Not downloadable by company roles.

### 5.4 Audit logging requirement

- All employer-side accesses to sensitive aggregated views must be audit-logged.
- Any access attempt to blocked data paths must be audit-logged and surfaced to KORA_ADMIN.
- Audit log retention period: to be defined in retention policy (TASK 7).

---

## 6. DPIA-like Risk Register

> **Severity:** CRITICAL · HIGH · MEDIUM · LOW  
> **Likelihood:** HIGH · MEDIUM · LOW  
> **Required control before real data:** Y (blocking) · R (recommended) · N (not required)

| # | Risk | Severity | Likelihood | Mitigation in architecture | Residual risk | Control before real data | Owner |
|---|---|---|---|---|---|---|---|
| 1 | **Employer surveillance perception** — workers perceive KORA as an employer monitoring tool even if employer never sees individual data | HIGH | HIGH | Architecture enforces employer blind to individual PIB/UEF. Product positioning explicitly prohibits surveillance framing. Calibration_status and methodology_version_id always displayed. | Medium — perception risk cannot be fully eliminated by architecture alone | Worker privacy notice + transparent participation model | Legal/DPO + Product |
| 2 | **Re-identification in small populations** — aggregate outputs in small departments/companies allow back-calculation to individual workers | HIGH | MEDIUM | `safe_aggregation_threshold` = 10. Suppression via `PrivacyVisibilityService`. PrivacyBoundaryNotice on all suppressed groups. | Low if threshold enforced consistently | Confirm threshold in DPA and privacy notice | DPO + Engineering |
| 3 | **Special category inference** — LIFE pillar events (health programs, psychological support, gym, medical) allow inference of health status | CRITICAL | MEDIUM | Compliance/HSE/legal records blocked from KORA scoring. Art. 9 basis required before processing health-adjacent events. Health details never visible to employer. | Medium — inference risk from aggregate LIFE pillar participation remains even without individual data | Art. 9 legal basis for health-adjacent LIFE pillar events; DPO opinion required | **BLOCKER** — Legal/DPO |
| 4 | **Consent invalidity in employment context** — workers "consent" to KORA participation but consent is not freely given | CRITICAL | HIGH | Architecture separates My KORA (private) from employer-facing outputs. However, lawful basis for processing must be confirmed independently of consent. | High if consent is used as primary basis | DPO must confirm lawful basis per Art. 6 and Art. 9 for each processing activity | **BLOCKER** — Legal/DPO |
| 5 | **Function creep — organizational to individual evaluation** — employer or third party uses KORA outputs to evaluate individual worker performance | CRITICAL | MEDIUM | KORA Index is company-level only. PIB is private. Product prohibits ranking/gamification. DPA must prohibit employer from using KORA data for individual performance evaluation. | Medium — technical enforcement must be supplemented by contractual prohibition | DPA must include explicit prohibited use clause | Legal |
| 6 | **KORA Space misuse** — posts, interactions, or community activity used to profile individual workers | MEDIUM | LOW | KORA Space company view is aggregate only. Posts by individual workers anonymized in employer view. | Low | Moderation policy + KORA Space privacy terms | Product + Legal |
| 7 | **Partner data leakage** — partner transmits personal data to KORA without valid basis or appropriate safeguards | HIGH | MEDIUM | Partner DPA required. Partner data enters AI Upload Studio and is pseudonymized at Stage 3. No raw partner personal data reaches employer view. | Medium — depends on partner compliance | Partner DPA and data processing addendum before any live partner integration | Legal |
| 8 | **KORA Link event tracing** — physical presence scanning creates location/attendance trace linked to individual workers | HIGH | LOW (FV only) | KORA Link is Future Vision — not active in Foundation Light. No runtime logic. | Low for Foundation Light | Requires specific privacy assessment before KORA Link goes live | Engineering + DPO (pre-launch) |
| 9 | **AI ingestion overreach** — AI classifier accesses or infers data beyond its permitted BCM taxonomy function | MEDIUM | LOW | AI v0.1 is rule/taxonomy-based BCM classifier only. No external LLM API calls on worker/HR data. AI outputs are proposals pending human approval gate — mandatory, no bypass. | Low | Document AI scope in DPA processing appendix | Engineering + DPO |
| 10 | **Prompt/data leakage to external LLMs** — future AI upgrade inadvertently sends HR/worker data to external API | HIGH | LOW (current v0.1) | Architectural prohibition: no external LLM calls on company HR or worker data in v0.1. BCM taxonomy classifier only. | Low in v0.1; requires governance control for any future v0.2 upgrade | Any future LLM integration requires new DPO/legal review and explicit gate decision | Engineering + DPO |
| 11 | **Excessive retention** — UEF records, PIB, and audit logs retained indefinitely | MEDIUM | MEDIUM | No retention policy yet defined. Architecture supports deletion but policy is not enforced. | Medium | Data retention policy required before real data | **BLOCKER** — Legal/DPO |
| 12 | **Audit log leakage** — audit log contains personal data accessible beyond intended scope | MEDIUM | LOW | Audit log accessible only to KORA_ADMIN. COMPANY_ADMIN sees operational audit (own actions only). | Low | Confirm audit log data minimization in DPO review | Engineering + DPO |
| 13 | **DSAR complexity** — worker exercises Subject Access Request; fulfillment requires cross-schema data assembly | MEDIUM | MEDIUM | Pseudonym map enables SAR fulfillment for worker's own data. My KORA layer holds worker-private records. However, DSAR procedure is not yet defined. | Medium | DSAR procedure document required before real data | **BLOCKER** — Legal |
| 14 | **Right to erasure vs. audit/versioning** — worker requests deletion but audit log and methodology versioning require retention | MEDIUM | MEDIUM | Architecture supports per-worker deletion from personal.* tables. However, tension with audit log retention, UEF version history, and KORA Index historical record is not yet resolved. | Medium | Legal must define erasure policy and retention exemptions | **BLOCKER** — Legal/DPO |
| 15 | **Benchmark/research reuse** — company KORA Index data reused for cross-company benchmarking without adequate basis | MEDIUM | LOW | Cross-company benchmarking is not yet implemented. If implemented, requires separate legal basis (research/analytics) and anonymization confirmation. | Low for Foundation Light | Define scope in DPA and research/analytics addendum if applicable | Legal |

---

## 7. Required Legal Artifact Pack

The following artifacts are **required before any real worker data, real HR data, or real company onboarding**. Items marked **BLOCKER** must be resolved before Gate 3 can close.

| # | Artifact | Status | Classification |
|---|---|---|---|
| 1 | Data Processing Agreement (DPA) — KORA ↔ employer | Not produced | **BLOCKER** |
| 2 | Privacy notice — employer-side (COMPANY_ADMIN / COMPANY_VIEWER) | Not produced | **BLOCKER** |
| 3 | Privacy notice — worker-facing (My KORA, PIB, Dynamic CV, KORA Space) | Not produced | **BLOCKER** |
| 4 | Partner privacy addendum / DPA for data transmission to KORA | Not produced | BLOCKER for partner integrations |
| 5 | Data retention policy (UEF records, PIB, audit logs, identity data) | Not produced | **BLOCKER** |
| 6 | Data deletion / erasure procedure | Not produced | **BLOCKER** |
| 7 | Data Subject Access Request (DSAR) procedure | Not produced | **BLOCKER** |
| 8 | DPIA or DPIA screening decision | Not produced | **BLOCKER** — triggers likely given PIB + special category risk |
| 9 | Record of Processing Activities (RoPA) draft | Not produced | REQUIRED |
| 10 | Subprocessor list (Supabase, hosting, any future analytics) | Not produced | REQUIRED |
| 11 | Security measures annex (technical and organizational measures) | Partial — architecture documented; formal TOM not produced | REQUIRED |
| 12 | Data breach notification procedure | Not produced | REQUIRED |
| 13 | AI ingestion boundary note (scope of BCM classifier; no external LLM on HR data) | Not produced (architecture confirmed, document not formalized) | REQUIRED |
| 14 | Employer visibility boundary note (formal annex to DPA) | Not produced | **BLOCKER** |
| 15 | Aggregate/anonymization threshold policy (group size ≥ 10; suppression rules) | Not produced | **BLOCKER** |
| 16 | Special category data exclusion/handling policy (health, mental health, LIFE pillar) | Not produced | **BLOCKER** — Art. 9 exposure |
| 17 | KORA Link privacy note | Not required for Foundation Light (FV only) | Required before KORA Link goes live |
| 18 | KORA Space moderation and privacy policy | Not produced | Required before KORA Space goes live with real workers |

---

## 8. Blockers Summary

The following are hard blockers before Gate 3 can close and before any real data pilot:

1. **No DPA in place** — any processing of real worker data without a DPA is a GDPR violation.
2. **No worker privacy notice** — Art. 13/14 GDPR requires workers to be informed before their data is processed.
3. **No lawful basis confirmed for Art. 9 (health-adjacent LIFE pillar events)** — explicit consent or Art. 9(2)(b) employment context exemption must be assessed by a qualified DPO.
4. **No DPIA or DPIA screening** — DPIA is likely mandatory given: (a) processing of scored personal data (PIB), (b) special category risk (health/wellbeing), (c) new technology (AI ingestion engine), (d) potential systematic evaluation perception.
5. **No retention policy** — indefinite retention of UEF records and PIB is not lawful.
6. **No DSAR procedure** — workers have a right of access; no procedure exists.
7. **No erasure procedure** — workers have a right to erasure; no procedure exists.
8. **No employer visibility boundary formalized in legal terms** — the technical boundary must be mirrored in the DPA.
9. **No aggregation threshold policy** — the `safe_aggregation_threshold` = 10 must be contractually binding, not only technical.
10. **No special category handling policy** — the prohibition and handling rules for health/mental health data in the LIFE pillar must be formalized.

---

## 9. Migration 027 Recommendation

**KEEP 027 SUSPENDED. Gate 3 must close before 027 can be applied to any environment with real worker data.**

Rationale:

Migration 027 removes KORA_ADMIN direct access to `personal.*` tables (worker_identity, worker_pib, worker_pseudonym_map, worker_profile_private). This is the correct privacy hardening direction — it enforces that KORA_ADMIN accesses individual worker data only through SECURITY DEFINER functions, not via direct RLS bypass. However:

1. The DPO must review the post-027 personal schema access model before 027 is applied to any environment containing real worker data. 027 changes who can access what — that change must be legally assessed.
2. The service-role provisioning path (`insertWorkerIdentity()`) must be smoke-tested in staging after 027 is applied. This has not yet happened.
3. Applying 027 to staging with synthetic data only (current state) is technically safe and could be done as part of Gate 2.2 hardening. However, it should happen before, not after, any real data is loaded, so that the privacy-hardened schema is in place before Gate 3 closes.

**Recommended sequence:**
1. Gate 3 opens (now — this document initiates that).
2. External legal/DPO review produces required artifacts.
3. Gate 2.2 hardening sprint: apply 027 to staging (synthetic data only), run service-role provisioning smoke test, verify nothing breaks.
4. Gate 3 closes when all blocker artifacts are produced and DPO signs off.
5. Only after Gate 3 closes: any real worker data may be introduced.

---

## 10. Gate 3 Decision

**GATE 3 OPEN — NOT CLOSED**

Gate 3 has been formally opened by this review. It cannot close until all 10 blockers in section 8 are resolved, all required legal artifacts in section 7 are produced and reviewed by a qualified DPO or privacy counsel, and the DPIA screening decision is documented.

This review does not close Gate 3. It documents the requirements that must be met for Gate 3 to close.

**Gate 3 is not a technical sprint. It requires external qualified legal/DPO engagement.**

---

## 11. Conditions for Gate 3 Close

Gate 3 may close when:

1. DPA (KORA ↔ employer) produced and legally reviewed.
2. Worker privacy notice produced and legally reviewed.
3. Employer privacy notice produced and legally reviewed.
4. DPIA or DPIA screening decision documented and signed by qualified DPO.
5. Retention policy produced and approved by DPO.
6. DSAR procedure produced and approved by DPO.
7. Erasure procedure produced and approved by DPO.
8. Employer visibility boundary formalized as DPA annex.
9. Aggregation threshold policy (≥10) formalized in DPA annex.
10. Special category (Art. 9) handling policy produced and DPO-approved.
11. Lawful basis for each processing activity documented and confirmed by qualified advisor.
12. AI ingestion boundary note (BCM rule-based; no external LLM on HR data) included in DPA or technical annex.

---

## 12. Final Checklist

| Check | Status |
|---|---|
| Production not touched | ✓ CONFIRMED |
| No secrets/passwords/tokens/connection strings printed | ✓ CONFIRMED |
| No migrations applied | ✓ CONFIRMED |
| No schema/RLS/grant/policy changes | ✓ CONFIRMED |
| Migration 027 remains not applied | ✓ CONFIRMED |
| Migration 029 remains not applied | ✓ CONFIRMED |
| No real worker data created or imported | ✓ CONFIRMED |
| No demo/fake fallback enabled | ✓ CONFIRMED |
| Local env files not committed | ✓ CONFIRMED |
| Document is NOT legal advice | ✓ CONFIRMED — see disclaimer |
| GDPR compliance not claimed | ✓ CONFIRMED — external DPO review required |

---

## 13. Recommended Next Steps

1. Engage external DPO or privacy counsel to open Gate 3 legal review.
2. Commission DPIA screening decision (likely full DPIA required).
3. Draft DPA template for employer onboarding.
4. Draft worker privacy notice for My KORA layer.
5. Define retention policy for UEF records, PIB, audit logs.
6. Define DSAR and erasure procedures.
7. Schedule Gate 2.2 hardening sprint (migration 027 staging smoke — synthetic data only).
8. Gate 3 closes only when all DPO-signed artifacts in section 7 are complete.
9. Production deployment and real worker onboarding: only after Gate 3 close.

---

**Document version:** v1.0  
**Prepared:** 2026-06-22  
**Gate 3 status:** OPEN — NOT CLOSED  
**Gate 2 status:** CLOSED WITH CONDITIONS  
**Gate 5 status:** OPEN — not started  
**Applies to staging:** `haqflkurpmeaxpikozjl` only  
**Production:** NOT touched  
**This document is NOT legal advice.**
