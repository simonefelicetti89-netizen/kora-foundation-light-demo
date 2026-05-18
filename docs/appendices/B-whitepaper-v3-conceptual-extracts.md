# KORA WhitePaper v3/v4 — Historical Conceptual Extracts Appendix

**Document:** Appendix B  
**Source:** KORA_WhitePaper_v3_v4.md.pdf (internal white paper)  
**Status:** Historical Conceptual Appendix — Approved Internal Reference  
**Version:** 1.0  
**Date:** 2026-05-17  
**Notation standard:** All extracts translated to Architecture v3 canonical naming

---

## 1. Status and Purpose

### Document Status

**The WhitePaper v3/v4 is historical source material.** It is not a canonical document. It does not govern current methodology. It does not override docs 06, 09, 10, or Architecture v3. It was produced at an earlier stage of KORA's methodological development, before Architecture v3 canonicalized formula naming and KORA Index structure.

**Current canonical methodology is governed by:**
- **Doc 06** — Methodological Constitution (7-component KORA Index, canonical IU formula, provisional weights)
- **Doc 09** — Source Materials Alignment & Conflict Map (authority hierarchy, conflict resolutions, founder decisions)
- **Doc 10** — Architecture v3 Layer Specification (14-stage algorithm flow, 10-component KORA Index, Activation Safeguard, canonical naming)
- **Appendix A** — Stress Test Summary (primary numerical validation reference, all numerical results in current notation)

Architecture v3 supersedes the old formula naming (ES, EF, RF, SF, SQ, PA, EQT, CT, EC, GF) and the old KORA Index structures. The WhitePaper v3/v4 formula notation must not be used as current methodology.

### Role of This Appendix

This appendix preserves the valuable conceptual elaborations from the WhitePaper v3/v4 in a **controlled, translated, and non-contaminating way**. Its purpose is to:

1. Document which conceptual elements from the WhitePaper have been translated and are available for future development
2. Map old formula names to current Architecture v3 names so future sessions do not re-introduce superseded notation
3. Preserve useful mechanics (KORA Contribution detail, KORA Value Chain, KORA Impact Pledge, data retention, CEF) that are not yet in canonical documents but will inform future phases
4. Document the pseudonymization key conflict and its current resolution
5. Provide a controlled entry point for conceptual enrichment of future docs (11, Confidence Score, Benchmark layer, Value Chain module)

**This appendix may be cited for conceptual context.** It may not be used to override any formula, component name, architectural decision, or privacy rule in docs 06, 09, 10, or Architecture v3.

---

## 2. Source Document Summary

| Field | Value |
|---|---|
| **File** | `docs/references/KORA_WhitePaper_v3_v4.md.pdf` |
| **Title** | KORA · Behavioral Impact Index — White Paper v3 — Documento finale unificato |
| **Subtitle** | Step 2 + Step 3 integrati |
| **Status in source** | Standard-ready · Pre-empirical calibration · Confidential |
| **Classification in source** | For academic and enterprise review |
| **Pages** | 54 |
| **Authority tier** | Tier 4 — Historical (per doc 09 authority hierarchy) |

**What this document is:** A comprehensive methodology and product white paper describing KORA's impact measurement approach, produced before Architecture v3 canonicalized the formula naming. It covers the full KORA stack — IU Engine, PIB, KORA Index, KORA Contribution, KORA Value Chain, KORA Impact Pledge — with more elaboration on some components than the current canonical documents contain.

**Important clarification on naming:** The "v3/v4" in the filename does NOT refer to Architecture v3. The "v3" refers to version 3 of this specific white paper document. It predates Architecture v3 and uses formula naming that was superseded by the Architecture v3 canonicalization process. The WhitePaper v3/v4 and Architecture v3 are different things; one is historical source material, the other is the current canonical technical architecture.

**Why it is useful despite being superseded:** The WhitePaper contains detailed formulas and mechanics for KORA Contribution, KORA Value Chain, and KORA Impact Pledge that do not appear in the current canonical documents. It also contains the Evidence Confidence model, three reliability levels, Sector Reference Tables, and the data retention schedule — all of which are relevant for future development phases and have not yet been formalized in canonical notation.

---

## 3. What Must Not Be Imported

The following elements from the WhitePaper v3/v4 must **not** be imported into current methodology. They are superseded and their use would contaminate the canonical architecture.

### 3.1 Old IU Formula Notation

**Must not use:**
```
IU_{e,p} = BC_{e,p} × ES_e × EF_e × CQ_e × CF_e × RF_e × SF_e
```

**Reason:** This uses old factor names. The canonical formula is:
```
IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
```
(approved in doc 09 Section 12 and Architecture v3)

### 3.2 Old Meaning of CF as Context Fit

In WhitePaper v3, CF = Context Fit [0.85–1.15], measuring alignment with professional role, training plan, or company strategy.

**Must not use CF with this meaning.** In current canonical, CF = Continuity Factor [1.00–1.20], measuring behavioral recurrence and continuity. The old Context Fit concept is captured by the optional SF (Strategic Fit) factor, range [0.80–1.10], applied only when explicit documented company evidence exists.

### 3.3 Old PIB Model with Pillar Score Intermediate Layer, BB, and CP

**Must not use:**
```
P_p = min(100, (PRS_p / T_p) × 100 × CM_p × DF_p)   [Pillar Score — old intermediate level]
PIB = Σ_p (W_p × P_p) + BB − CP                        [old PIB formula]
```

**Reason:** The current canonical PIB is the direct sum of IU across pillars:
```
PIB_worker = Σ_p IU_{worker,p}
```
The intermediate Pillar Score normalization, sector target T_p normalization, Continuity Multiplier CM_p, Diversity Factor DF_p, Breadth Bonus BB, and Concentration Penalty CP were intentionally removed from the PIB model. Balance and equity signals now operate at the KORA Index level (PB and EQ components).

### 3.4 Old KORA Index Formula and Naming

**Must not use:**
```
KORA Index = 100 × (0.35×SQ + 0.25×PA + 0.15×EQT + 0.15×CT + 0.10×EC) × GF
```

**Reason:** All five component names (SQ, PA, EQT, CT, EC) and the Gate Factor (GF) are superseded. The current canonical structure uses NI, AR, EQ, CO, VR with an Activation Safeguard architectural layer (not a multiplier). Architecture v3 further extends to 10 components (AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS).

### 3.5 Old Gate Factor as Multiplier

The WhitePaper v3 GF was a continuous multiplier: `GF = 0.50 + 0.50 × min(PA, EQT, CT, EC)`.

**Must not use.** The Activation Safeguard in Architecture v3 is a mandatory architectural layer (Stage ⑬) that enforces minimum participation and quality floors before the KORA Index is computed — not a multiplicative modifier. These are architecturally distinct approaches with different properties.

### 3.6 Organization-Held Pseudonymization Key as Current Default

The WhitePaper v3 states: "La chiave org_secret_key è generata dall'organizzazione, custodita internamente, e non viene mai trasmessa a KORA."

**Must not use as Foundation Light default.** The current approved model (doc 07/08, confirmed in doc 09 Section 12) is: per-company pseudonymization keys held by KORA's internal privacy service, not the organization. This is documented in Section 6 of this appendix.

### 3.7 Any Implication That the Company Sees Individual PIB

No element from the WhitePaper should be interpreted as allowing employer access to individual PIB scores, individual health data, or psychological support details. The privacy architecture in WhitePaper v3 is consistent with current canonical on this point: "L'organizzazione non vede mai il PIB di nessun dipendente." This rule is constitutional and unchanged.

---

## 4. Translation Map — Historical to Current Naming

All concepts in this appendix use current Architecture v3 canonical naming. The table below maps old WhitePaper v3/v4 notation to current equivalents for reference.

| Old Name | Old Meaning | Current Equivalent | Equivalence | Notes |
|---|---|---|---|---|
| ES (Evidence Strength) | Source tier quality [0.10–0.95], automatically assigned from source tier and trust score | EV (Evidence/Verification Level) | Directly equivalent | EV values in canonical: Self=0.50, Internal=0.70, External=0.80, KCP=1.00 |
| EF (Effort Factor) | Intensity of cognitive/physical effort, modulated by duration [0.40–1.50] | NM (Normalized Magnitude) | Directly equivalent | NM uses caps and diminishing returns (same principle, different scale) |
| RF (Recency Factor) | Temporal decay: RF = exp(−λ × Δt) [0.60–1.00] | Deprecated / partially absorbed | Partially equivalent | RF concept absorbed into CF (as recurring events stay fresh) or DF (durability of long-term credentials). No standalone RF in current canonical |
| SF (Saturation Factor) | Anti-repetition multiplier [0.30–1.00], decays from 4th+ occurrence | AGF (Anti-Gaming Factor) | Partially equivalent | AGF is deterministic and rule-based; SF was continuous decay. Same anti-gaming purpose, different mechanics |
| CQ (Completion Quality) | Degree of completion and assessment quality [0.80–1.20] | CQ (Content/Completion Quality) | Directly equivalent | Name unchanged; range slightly different in canonical |
| CF (Context Fit) | Alignment with role/plan/strategy [0.85–1.15] | SF (Strategic Fit) — optional | Partially equivalent | **CF name reused with different meaning in current canonical.** Old Context Fit → current optional SF. See note below table |
| CM_p (Continuity Multiplier) | [1.00–1.40] rewards temporal regularity of events per pillar | CF (Continuity Factor) | Partially equivalent | CM_p was applied at Pillar Score level; current CF is applied at event level per series |
| DF_p (Diversity Factor) | [0.80–1.10] rewards variety of event types within a pillar | No direct equivalent | Superseded | Concept not currently in canonical. Could inform future EQ enrichment |
| SQ (Score Quality) | mean(PIB_active) / 100; aggregate PIB signal | NI (Normalized Intensity) | Partially equivalent | SQ weight was 0.35; NI weight is 0.20 in doc 06. Conceptual role similar but formula differs |
| PA (Participation) | active_workers / HRIS_total | AR (Activation Rate) | Directly equivalent | PA weight was 0.25; AR weight is 0.20 in doc 06 |
| EQT (Equity Factor) | 1 − 0.50 × Gini(PIB_active) [0.50–1.00] | EQ (Equity distribution) | Directly equivalent | Formula slightly different but same concept. EQT weight was 0.15; EQ weight is 0.15 in doc 06 |
| CT (Continuity) | mesi_active / mesi_observed (MVP); advanced formula after 6 months | CO (Continuity) | Directly equivalent | CT weight was 0.15; CO weight is 0.10 in doc 06 |
| EC (Evidence Confidence) | Multi-component: 0.40×EVQ + 0.30×CER + 0.20×AC + 0.10×DFR | VR (Verification Rate) + CS (Confidence Score) | Partially equivalent | EC had weight 0.10 in old formula. Current VR = 0.10 captures part of EC. CS (new in Architecture v3) captures the broader confidence model |
| GF (Gate Factor) | 0.50 + 0.50 × min(PA, EQT, CT, EC) — multiplicative floor | Activation Safeguard (Stage ⑬) | Partially equivalent | GF was a continuous multiplier; Activation Safeguard is a mandatory architectural layer with different enforcement semantics |
| BB (Breadth Bonus) | Shannon entropy bonus for balanced distribution across pillars [0–10] | PB (Pillar Balance) + EQ at KORA Index level | Superseded | BB was part of PIB formula; balance is now an index-level signal |
| CP (Concentration Penalty) | Anti-gaming penalty [0 to −5], only when anti-gaming flag active | AGF + PB + PC signals | Superseded | CP was part of PIB formula; concentration is now handled via AGF (at event level) and PB/PC (at index level) |
| T_p (Pillar Target) | Sector benchmark IU per pillar per quarter (normalization denominator for Pillar Score) | NI_ref_max / future SRT benchmark | Partially equivalent | T_p no longer normalizes PIB. But T_p values (LIFE=8, GROWTH=6, CONNECTION=5, IMPACT=3, LEGACY=3) are useful calibration input for NI and future Sector Reference Tables |
| P_p (Pillar Score) | Normalized 0–100 per-pillar score, using T_p, CM_p, DF_p | Removed from architecture | Superseded | Pillar Score intermediate layer intentionally removed. Balance signals moved to index level |

**CF naming collision note:** In WhitePaper v3, CF = Context Fit. In current canonical (Architecture v3 / StressTest), CF = Continuity Factor. These are different concepts. Any citation of CF from the WhitePaper must be read as "old Context Fit" and translated to "current SF (Strategic Fit, optional)" — not to "current CF (Continuity Factor)." This is the most significant naming collision and must be watched carefully to prevent confusion.

---

## 5. Useful Conceptual Elements to Preserve

### A. Three KORA Index Reliability Levels

The WhitePaper introduces a maturity progression for KORA Index reliability that is not formally captured in the current commercial tier structure.

| Level | Source Requirements | Primary Use | Current Translation |
|---|---|---|---|
| **Baseline KORA Index** | Internal data: LMS, HR records, welfare exports | Initial diagnosis, gap identification | Low EV sources (0.50–0.70), low VR in current terms |
| **Verified KORA Index** | API providers, external certifications, structured LMS | People strategy, internal board reporting | Medium-high EV sources (0.70–0.90), higher VR |
| **Certified KORA Index** | KCP validated, native audit trail | Board reporting, ESRS S1 support, external audit | KCP sources (EV=1.00), high VR, high CS, advisor-confirmed eligibility |

**Translation to Architecture v3:** These reliability levels are best understood as VR thresholds combined with CS values:
- Baseline: VR < 50%, CS low
- Verified: VR 50–80%, CS medium
- Certified: VR > 80%, CS high, Audit Trail complete, advisor involvement

**Clarification:** These levels are not the same as the commercial tiers (Foundation Light / Foundation / Governance / Certified) in doc 02. The reliability levels describe the quality of the data underlying a KORA Index calculation. The commercial tiers describe the product offering and feature set. A Foundation Light delivery may produce a Baseline or Verified KORA Index depending on source quality; a Certified product tier implies a Certified KORA Index with full audit trail.

**Important:** No level should be presented as external certification before the validation roadmap (Appendix A, Section 15) has reached Phase 9 (Methodological Audit, months 14–20).

**Transition model (WhitePaper reference):**

| Month | CT State | Notes |
|---|---|---|
| 0–1 | CT_MVP binary | First month: CT = 1.00 if active. Baseline KORA Index |
| 2–5 | CT_MVP ratio | CT grows with each active month. Baseline → Verified |
| 6+ | CT_ADV activatable | After 6+ months of consistent data, Verified may progress. Certified requires: Evidence Confidence, audit completeness, privacy governance, anti-gaming controls |
| 12+ | CT_ADV + calibration | T_p updates from pilot data. SRT sector calibrations applied |

Certified is not automatic and not time-based alone. It requires sustained evidence quality, not just duration.

---

### B. Evidence Confidence Model

The WhitePaper defines EC (Evidence Confidence) — a 4-component model measuring the trustworthiness of the data underlying a KORA Index calculation. In current Architecture v3 notation, this concept maps to CS (Confidence Score) and enriches VR (Verification Rate).

**Historical EC formula (WhitePaper v3):**
```
EC = 0.40 × EVQ + 0.30 × CER + 0.20 × AC + 0.10 × DFR
```

**Components translated to current naming:**

| Old Component | Definition | Current Equivalent | Notes |
|---|---|---|---|
| EVQ (Evidence Quality) | IU-weighted average of ES across all events in the period | Average EV weighted by IU — informs EQ and VR | Direct conceptual equivalent |
| CER (Certified Evidence Ratio) | Σ(IU from KCP/External Verified) / Σ(IU total) | VR (Verification Rate) | VR in current canonical captures this directly |
| AC (Audit Completeness) | % events with complete audit trail in the system | Informing CS | Currently implicit in EV = KCP; needs explicit modeling in CS |
| DFR (Data Freshness) | HRIS snapshot freshness: 1.00 (<30d), 0.80 (<90d), 0.60 (<180d), 0.00 (>180d) | Informing CS | Relevant for Foundation Light where HRIS data may be stale exports |

**Current treatment in Architecture v3:**
- VR captures CER directly
- EQ captures average quality (EVQ conceptually)  
- CS (10th component added in Architecture v3) is positioned to capture the broader multi-dimensional confidence signal including AC and DFR

The WhitePaper's EC formula is not the current CS formula. CS must be designed and calibrated separately. But the EC model provides a well-structured starting point for CS design.

**Recommended source for CS design:** The EC model from this appendix, combined with the confidence indicators visible in the StressTest (Section 12.5: "Confidence Level: MEDIUM — data from mixed sources; assumptions not yet empirically validated"), should inform the CS formula design in doc 11 and future methodology documentation.

---

### C. Sector Reference Tables (SRT) and Pillar Targets

The WhitePaper defines Sector Reference Tables (SRT) as annually-published benchmarks for sector-specific T_p targets (IU per pillar per quarter), organized by ATECO code.

**T_p default values (WhitePaper v3, tertiary/services sector):**

| Pillar | T_p default (per quarter) | Expected frequency | Accessibility |
|---|---|---|---|
| LIFE | 8.00 IU | 8–10 events | High — 1–2 activities/week |
| GROWTH | 6.00 IU | 4–6 events | Medium — 1–2 courses/month |
| CONNECTION | 5.00 IU | 3–5 events | Medium-low — 1 event/month |
| IMPACT | 3.00 IU | 1–3 events | Low — 1 initiative/quarter |
| LEGACY | 3.00 IU | 1–3 events | Very low — 1 mentoring session/month |

**What T_p means:** T_p is a denominator for normalization in the old Pillar Score model, not an achievement target. It represents expected IU for a typical worker in the sector over a quarter.

**Why T_p is still useful despite Pillar Score being removed:**
- T_p values inform NI_ref_max (currently set at 32 IU from W01 in the StressTest — a single worker's PIB, not a sector-derived benchmark)
- T_p provides a calibration anchor for what "typical" worker engagement looks like per pillar
- Future Sector Reference Tables would use sector-adjusted T_p values to enable cross-sector comparison

**SRT publication model (WhitePaper):**
- Published annually on January 1st
- Immutable for the calendar year
- An organization's score does not change because other KORA clients improved
- Sector-specific SRT automatically lower T_p targets for sectors with less structural access to services

**Current status:** Future phase. Foundation Light may show internal comparison over time but not definitive sector benchmarking. Architecture v3 Section 9 (Benchmark & Normalization Layer) references this as a future development. No canonical SRT exists yet.

---

### D. Sector Friction Index, Territorial Access Index, and Pillar Availability Flag

The WhitePaper defines three fairness adjustment mechanisms for comparing organizations across sectors and geographies.

| Mechanism | Purpose | How it works |
|---|---|---|
| **Sector Friction Index (SFI)** | Correct for sectors with structurally lower access to welfare/wellbeing services | Reduces T_p targets for high-friction sectors. A manufacturing company cannot access the same service density as a services company. SFI prevents unfair penalization |
| **Territorial Access Index** | Correct for geographic areas with lower partner density | Adjusts the value of events in territories under-served by KCP partners. A rural organization is not penalized for lacking KCP access |
| **Pillar Availability Flag** | Exclude a pillar from bonuses/penalties if structural access is below threshold | If a sector or territory has less than 20% partner coverage for a specific pillar, that pillar is excluded from the PB bonus/penalty logic |

**Current status and future application:**
These three mechanisms belong to the future Benchmark & Normalization Layer. They do not apply to Foundation Light, which uses internal data comparison rather than sector benchmarks.

Foundation Light may show **intra-company trends** (Q1 vs Q2 evolution) without cross-sector adjustment. Sector benchmarks require validated SRT and sufficient multi-company data (Validation Roadmap Phase 7, months 9–14).

**Architectural note:** When these mechanisms are eventually implemented, they must operate as normalization inputs to the KORA Index — not as modifications to the IU formula. The IU formula remains canonical and constant; sector adjustments operate at the index level.

---

### E. KORA Value Chain

**Definition:** KORA Value Chain is a complementary index (not KORA Index, not KORA Contribution, not KORA Ecosystem Reach) measuring the maturity, reliability, and depth of the partner ecosystem surrounding the organization.

**What it measures:** The KORA Index measures what happens inside the organization. KORA Value Chain measures how well the external network — KCP partners, providers, territorial entities, advisors — produces continuous, reliable, and verified flows that enable KORA actions.

**How it differs from KORA Ecosystem Reach:**

| Indicator | Measures | Includes |
|---|---|---|
| KORA Ecosystem Reach (KER) | Availability and coverage of partner offering | Partner utilization rate, certification ratio, geographic coverage, service diversity |
| KORA Value Chain | Relational quality and verified engagement depth of active partners | Partner reliability (trust score), verified relationship depth, territorial & pillar coverage, data integration maturity |

KER is a dashboard metric measuring supply-side richness. KORA Value Chain is a complementary index measuring the verified quality and behavioral depth of the relationships that make the IU engine work.

**Components (WhitePaper v3):**

| Component | Definition | Formula |
|---|---|---|
| VCA (Value Chain Activation) | Active verified partners / eligible partner base | VCA = active_verified_partners / eligible_partner_base |
| NQ (Network Quality) | Trust-score-weighted quality of partner network | NQ = Σ(Partner_Trust_j × Partner_Verified_IU_j) / Σ(Partner_Verified_IU_j) |
| VRD (Verified Relationship Depth) | Depth of documented partner relationships | VRD = 0.35×Continuity + 0.30×Data_Integration + 0.20×Program_Depth + 0.15×Multipillar_Contribution |
| TPC (Territorial & Pillar Coverage) | Coverage across geography and pillars | TPC = 0.50×Territorial_Coverage + 0.50×Pillar_Coverage |

**Formula (WhitePaper v3, historical):**
```
KORA Value Chain = 100 × (VCA^0.25 × NQ^0.30 × VRD^0.30 × TPC^0.15)
```

**NQ note:** Partner_Verified_IU_j = volume of verified Impact Units generated by partner j in the reference period. This connects Value Chain to the IU engine and ensures consistency with the overall measurement system.

**VRD signals:**
- **Continuity:** Partner generates events across multiple consecutive months
- **Data Integration:** API flow, native audit trail, or documented process
- **Program Depth:** Partner delivers structured programs, not isolated micro-events
- **Multipillar Contribution:** Partner contributes to multiple pillars or to under-covered pillars

**Anti-gaming in KORA Value Chain:**
- Only partners with verified events in the period count as active (VCA)
- Partner with >75% of events: excess IU weighted × 0.50
- Partner certified but with no real flow: no contribution to VCA or VRD
- Only territories with verified events count (no territorial overclaiming)

**Current status:** Future complementary indicator. Belongs to the Ecosystem tier, not Foundation Light. Not part of KORA Index. Not part of KORA Contribution.

---

### F. KORA Contribution — Detailed Components and Formula

The WhitePaper provides more detailed mechanics for KORA Contribution than the StressTest. Both are consistent but the WhitePaper adds component-level formulas and anti-gaming rules.

**Conceptual position:** KORA Contribution is a complementary index at lower methodological maturity than the PIB → KORA Index core. It measures the collective and territorial contribution the organization generates as an institutional actor — not the sum of individual behaviors.

**Two distinct sources feed KORA Contribution:**
1. **Internal collective programs:** Company initiatives reaching groups of workers, families, or communities (health prevention programs, structured volunteering, school partnerships)
2. **KORA Impact Pledge (KIP):** Voluntary financial contribution to verified territorial projects, co-designed with local entities

Both sources feed the same four components.

**Components:**

| Component | Definition | Formula |
|---|---|---|
| CR (Collective Reach) | verified_reach / eligible_reach (capped at 1) | For external reach: CR_total = 0.70×Internal_Reach + 0.30×External_Reach |
| VCQ (Verified Contribution Quality) | Quality and auditability of the initiative | VCQ = 0.40×Evidence_Strength + 0.30×Partner_Reliability + 0.20×Audit_Trail_Completeness + 0.10×Data_Freshness |
| SE (Social Externality) | Intensity of benefit generated beyond the individual | 0.25 (individual only) / 0.50 (group/department) / 0.75 (families/community) / 1.00 (territorial/systemic) |
| CT_c (Continuity — Contribution) | Programme duration and recurrence | 0.20 (single event) / 0.40 (brief campaign) / 0.60 (quarterly) / 0.80 (semester) / 1.00 (annual/ongoing) |

**Formula (WhitePaper v3, historical):**
```
KORA Contribution = 100 × (CR^0.25 × VCQ^0.30 × SE^0.25 × CT_c^0.20)
```

**Critical structural rule:** CR = 0 (zero verified beneficiaries) zeroes the Contribution regardless of all other components. A well-documented initiative without verified reach does not contribute.

**What contributes vs what does not:**

| Contributes | Does not contribute |
|---|---|
| Health programme open to entire workforce | Press releases without action evidence |
| Structured corporate volunteering with documentation | Internal policies not implemented |
| School/university/local entity partnerships | Anonymous donations without traceability |
| Parental/caregiver support programme | Standard individual sessions already in PIB (without CEF) |
| KORA Impact Pledge with verified VPC | Declared pledge not executed |
| Inclusion initiatives with documented target | Sponsorships not linked to verifiable programme |

**Relationship to KORA Index:** Individual worker events that generate IMPACT IU via the standard UEF pipeline enter both the PIB and the KORA Index (via AR and NI). They do NOT automatically feed KORA Contribution. To feed Contribution, they must be registered in a CEF with a `contribution_program_id`. This is the structural separation preventing double-counting.

---

### G. KORA Impact Pledge (KIP)

The KORA Impact Pledge is a voluntary mechanism through which an organization commits to directing economic resources to verified territorial social projects, co-designed with local entities (municipalities, local authorities, social partners, territorial stakeholders).

**Non-negotiable constraints:**
- KORA does not manage, collect, or redistribute funds. KORA measures, documents, and accounts for the pledge. Disbursement goes directly from the organization to the verified territorial project. KORA is never a financial intermediary.
- KIP is always opt-in. It is never a requirement for any KORA Index reliability level.
- The financial contribution never increases the KORA Index. The KORA Index increases only if workers actually participate in the project with verified behavioral actions registered in the UEF.

**Four-phase operational flow:**
1. **Pledge:** Organization declares pledge in KORA platform (amount, territorial project, beneficiary partner, additionality basis). Pledge is auditable but does not yet generate Contribution.
2. **Direct execution:** Organization disburses funds directly to the verified territorial partner. KORA receives a verified execution document (contract, receipt, activity report).
3. **Verification and measurement:** KORA calculates the Verified Project Contribution (VPC) based on documented execution, additionality, and project quality.
4. **Accounting:** KORA Contribution includes KIP contribution with TAF applied for shared projects. Accountable to third parties.

**Verified Project Contribution (VPC):**
```
VPC = PLA × ADD_i × EQ_proj
```

Where:
- **PLA:** Pledged/executed amount (the financial contribution)
- **ADD_i (Additionality Coefficient):** 1.00 (full additionality, documented), 0.50 (partial, not independently verifiable), 0.00 (not additional or not executed)
- **EQ_proj (Project Execution Quality):** 0.40×Evidence_of_Execution + 0.30×Partner_Reliability + 0.20×Beneficiary_Verification + 0.10×Reporting_Completeness

**Additionality rule:** A non-additional pledge is not excluded from the system — it is weighted with ADD_i = 0.50 and the report explicitly states "Partial Additionality." This is more transparent than exclusion and incentivizes proper documentation.

**Territorial Attribution Factor (TAF) for shared projects:**
When multiple organizations co-fund the same territorial project, Contribution is attributed proportionally:
```
TAF_i = VPC_i / Σ_j(VPC_j)
Contribution_KIP_i = KORA_Contribution_project × TAF_i
```

The sum of Contribution claimed by all participating organizations always equals the project value. No over-counting.

**Recommended pledge levels (indicative, not obligatory):**
- Light: 0.5–1% of annual welfare/people budget
- Standard: 1–2%
- Territorial Plus: 2–3%

**Current status:** Future KORA Contribution / territorial impact layer. Must not be built for Foundation Light unless explicitly approved later. The PSD2/payment risk must be avoided through the structural constraint that KORA is never a financial intermediary.

---

### H. Contribution Event Format (CEF)

The CEF is a separate event format from the UEF (Universal Event Format), designed for collective or territorial contribution events registered at the programme level rather than the individual action level.

**Purpose:** The CEF registers the organization's programmes as measurement units, preventing double-counting between individual PIB/KORA Index and KORA Contribution.

**Four distinct registers in the full KORA system (WhitePaper model):**

| Register | Format | Unit of Analysis | Who feeds it |
|---|---|---|---|
| UEF (Universal Event Format) | Individual event | Person × Action | Partners, LMS, API, HR |
| CEF (Contribution Event Format) | Collective programme | Organization × Programme | Organization + partners |
| KIP Record | Territorial pledge | Organization × Project | Organization (pledge + verified execution) |
| Partner Record | Partner relationship | Organization × Partner | Partner + KORA system |

**Structural anti-double-counting rule:** A worker's individual IMPACT events enter the PIB (via UEF) and the KORA Index (via AR/NI). They do not automatically feed KORA Contribution. To feed Contribution as a collective programme, they must be registered in a CEF with a `contribution_program_id`. This ID must exist in the CEF system before any UEF can reference it.

**SE rule for events in both UEF and CEF:** When individual actions (already in PIB) also feed a CEF, the SE (Social Externality) component of that CEF must reflect that individual benefit is already counted: SE = 0.25 (individual only, no additional externality). Programme-level externalities with beneficiaries beyond individual workers can have SE = 0.50–1.00.

**Current status:** Future extension of UEF for collective or territorial contribution events. Not Foundation Light core unless explicitly approved. The `contribution_program_id` field exists in the WhitePaper v3 UEF optional fields — its implementation should be planned in doc 11.

---

## 6. Pseudonymization Key Conflict

This conflict is documented in doc 09 Section 4.10. This appendix records it for persistence and clarity.

### WhitePaper v3 Model (Historical)

The WhitePaper v3 specifies in the UEF field definition:
```
person_hash: HMAC-SHA256(person_id, org_secret_key)
```

> "La chiave org_secret_key è generata dall'organizzazione, custodita internamente, e non viene mai trasmessa a KORA. Anche in caso di accesso non autorizzato al database KORA, nessun hash sarebbe ricondotto a una persona reale."

In this model, the organization generates and holds the pseudonymization key. KORA cannot deanonymize.

### Current Approved Model (Canonical)

Docs 07 and 08, confirmed in doc 09 Section 12, specify: **per-company pseudonymization keys held by KORA's internal privacy service** — not the company, not split-key — for Foundation Light v0.1.

This was chosen because Foundation Light is a consulting-grade delivery where KORA manages the data pipeline. For matching events to workers, deduplication, and linking across sources to work, KORA needs to manage the pseudonymization mapping during ingestion. In a fully productized platform with a worker app, the org-holds-key model becomes feasible.

### Comparison

| Model | Key holder | Privacy advantage | Operational implication |
|---|---|---|---|
| WhitePaper v3 (org holds key) | The organization | KORA cannot deanonymize — maximum structural privacy | Org can deanonymize own workers; key management on client side; harder for KORA to manage data quality and deduplication |
| Current canonical (KORA holds key) | KORA internal privacy service | Org cannot directly deanonymize | KORA manages key lifecycle; enables Foundation Light consulting delivery; requires KORA to be trusted custodian with contractual and legal obligations |
| Future option: Split-key | Org and KORA each hold half | Neither can deanonymize alone | Highest privacy; highest operational complexity; appropriate for fully productized platform |

### Current Ruling

**The current approved model governs:** KORA-held per-company keys for Foundation Light v0.1, subject to privacy/legal review, subject to DPA and DPIA compliance.

The WhitePaper model is preserved **only as a future architecture option** — specifically relevant for:
- The fully productized worker app platform (Ecosystem tier)
- Any future certification layer where an independent authority must verify that KORA cannot deanonymize
- Future split-key design discussions

The WhitePaper model must not be used to argue against the current Foundation Light architecture. It may be cited when the full Ecosystem tier is designed.

---

## 7. Reliability Levels — Baseline / Verified / Certified

Translated table for Architecture v3 context.

| Level | Source Quality | Evidence Maturity | VR (approx.) | CS (approx.) | Suitable Use | Not Suitable For | Relationship to Commercial Tiers |
|---|---|---|---|---|---|---|---|
| **Baseline KORA Index** | Internal data only (LMS, HR, welfare exports) | Low — internal attestation, EV = 0.50–0.70 | < 50% | Low | Initial diagnosis, gap identification, internal time-series tracking | Board-level ESG reporting, external audit, cross-sector benchmarking | Achievable at Foundation Light with internal-only data |
| **Verified KORA Index** | API providers, external certifications, structured LMS | Medium — External Verified sources, EV = 0.70–0.90 | 50–80% | Medium | People strategy, internal board reporting, ESRS S1 internal evidence | Public ESG disclosure, external certification, regulatory filing | Foundation / Governance tier target |
| **Certified KORA Index** | KCP validated, native audit trail, advisor involvement | High — KCP sources, EV = 1.00, full audit trail | > 80% | High | Board reporting, ESRS S1 structured support, external audit presentation, methodology certification candidacy | Automatic proof of outcome, causal CSRD compliance | Certified commercial tier; requires months 14–20 of validation roadmap (Phase 9 Methodological Audit) |

**Key clarifications:**

- The levels are continuous, not binary. An organization with 45% KCP events is between Baseline and Verified.
- Progression from Baseline to Certified happens through programme maturity — adding KCP partners, improving audit trail, extending methodology consistency — not just time.
- No level should be presented as **external certification** before the validation roadmap Phase 9 is complete.
- The Certified KORA Index is a methodology-readiness indicator, not a legal compliance certificate. KORA does not substitute for CSRD audits or formal ESG reporting processes.
- For Foundation Light, the realistic starting position is Baseline, with a pathway toward Verified as KCP partner relationships develop.

---

## 8. Confidence Score Enrichment

The WhitePaper EC model provides a conceptual foundation for the Architecture v3 CS (Confidence Score) component design. CS is the 10th component in Architecture v3, positioned to capture data trustworthiness signals that go beyond what VR (Verification Rate) captures.

**Proposed CS enrichment inputs (from WhitePaper EC model, translated):**

| Input | Source Concept | Description | Architecture v3 relevance |
|---|---|---|---|
| Data completeness | EVQ | What proportion of total IU has associated EV documentation? | Inform CS; incomplete data reduces confidence |
| Evidence quality | EVQ | IU-weighted average EV across all events in the period | Directly informing EQ and CS |
| Certified evidence ratio | CER → VR | Σ(IU from KCP + External Verified) / Σ(IU total) | Current VR captures this; CS may refine it |
| Audit completeness | AC | % events with complete audit trail in the system | CS should incorporate this; not yet in VR |
| Data freshness | DFR | HRIS snapshot age: 1.00 (<30d), 0.80 (<90d), 0.60 (<180d), 0.00 (>180d) | Particularly relevant for Foundation Light batch imports |
| Source diversity | — | How many distinct source tiers contribute? Mono-source data is less reliable | Anti-gaming signal; should inform CS |
| Manual review rate | — | What % of events went through human review vs. fully automated? | Governance quality signal |
| Rejected record rate | — | What % of submitted events were rejected by data quality engine? | Data quality signal; inverse relationship with CS |
| Privacy-safe aggregation reliability | — | Are segment-level outputs protected? (N≥10 threshold respected?) | Governance compliance; affects reportability |

**Proposed future CS formula structure:**
```
CS = f(VR, AuditCompleteness, DataFreshness, SourceDiversity, RejectionRate, ...)
```

The exact CS formula is not defined here. This appendix provides the conceptual inputs. The final CS model must be:
1. Designed in the context of doc 11 (Technical Data Model)
2. Calibrated with pilot data
3. Validated as part of the Phase 2–5 roadmap

**Important:** This is a conceptual enrichment, not a formula authority. The CS formula does not exist yet. This appendix documents the inputs that should inform its design.

---

## 9. Benchmark & Normalization Extracts

Summary of benchmarking and normalization concepts from the WhitePaper that are relevant for future development.

### Sector-Specific Benchmarks

The WhitePaper envisions sector benchmarks published annually as Sector Reference Tables (SRT), organized by ATECO sector code. Each SRT provides:
- Sector-adjusted T_p values per pillar
- Sector Friction Index (SFI) adjustment factors
- Pillar Availability Flags for structurally under-served sectors

**SRT publication model:** Published January 1st, immutable for the calendar year. Organization scores are not retroactively affected by other clients' improvements.

### Company-Size Normalization

The WhitePaper does not define explicit company-size normalization. However, the denominator PA = active_workers / HRIS_total means that a large company and a small company with the same AR produce the same Activation Rate — size is already normalized out. Pillar targets T_p are per-worker, not per-company.

### Territorial Access Index

For organizations in areas with low KCP partner density, the Territorial Access Index adjusts the value of events in those territories upward, preventing penalization of organizations that simply cannot access KCP-level services due to geography.

**Current status:** Not implemented. Required for fair cross-sector and cross-geography comparison. Foundation Light uses internal data only — territorial normalization is not needed until inter-company benchmarking begins.

### Pillar Availability Flag

If a sector or territory has less than 20% partner coverage for a specific pillar, that pillar is excluded from Pillar Balance bonuses and penalties. This prevents a LEGACY-deficient pillar from being penalized if LEGACY partners simply do not exist in that sector or geography.

**Implementation note:** The Pillar Availability Flag should be stored at the data model level (doc 11) so that the KORA Index engine can apply it correctly once SRT data is available.

---

## 10. KORA Value Chain Extract

**Definition:** KORA Value Chain is a future complementary indicator measuring the maturity, reliability, and depth of the verified partner ecosystem.

**What it measures:**
- Activation level of verified partners (not just registered, but actively generating verified IU)
- Network quality through trust-score-weighted partner performance
- Depth of verified relationships (continuity, data integration quality, programme depth, multi-pillar contribution)
- Territorial and pillar coverage of active partners

**Why it is different from KORA Ecosystem Reach (KER):**

| | KORA Value Chain | KORA Ecosystem Reach |
|---|---|---|
| **Measures** | Relational quality and behavioral depth of active partners | Availability and coverage breadth of partner offering |
| **Requires** | Verified events from partners, trust scores, audit trail | Partner registration, certification ratio, geographic data |
| **Gaming risk** | More resistant — only active verified partners count | More gameable — registering partners without usage inflates KER |
| **Methodological maturity** | Complementary — in formalization | Dashboard supplementary metric |

**Possible components (translated from WhitePaper):**
- VCA: verified partner activation rate
- NQ: network quality via trust-score-weighted IU volume
- VRD: verified relationship depth (continuity, data integration, programme depth, multi-pillar contribution)
- TPC: territorial and pillar coverage of active partner network

**Why it is not part of KORA Index:** KORA Index measures what people do. Value Chain measures the ecosystem that enables them to do it. Including the ecosystem quality in KORA Index would allow an organization to score highly by having good partner relationships even if workers do not use them — violating the fundamental principle that the KORA Index measures verified behavioral actions.

**Current status:** Future complementary indicator. Belongs to the Ecosystem tier. Not Foundation Light core. No implementation until the partner network and certification infrastructure is operational.

---

## 11. KORA Contribution and KORA Impact Pledge Extract

**Contribution measures external/social/territorial contribution.** It answers: "How much verified benefit has this organization created beyond its own workforce?" This is categorically different from the KORA Index question: "How much human capital development is happening inside the organization?"

**KIP represents company commitment to territorial projects.** It is the mechanism through which an organization's financial commitment to territorial social projects becomes measurable and accountable within the KORA system.

**Critical structural rules:**
- Financial pledges do not increase the KORA Index — ever. Only worker behavioral actions increase the KORA Index.
- KIP financial flows go directly from organization to project — KORA is never an intermediary.
- Double-counting prevention: individual IU events (via UEF) and collective programmes (via CEF) must remain structurally separated. The `contribution_program_id` enforces this at the data level.
- KORA Contribution and KORA Value Chain should remain separate from KORA Index even as the platform matures. Aggregation into a "super-index" would undermine methodological clarity.

**ESRS S1 relevance of KORA Contribution and KIP:**
- KORA Contribution may support S3.1 community engagement reporting
- KIP may support the "relationship with local communities" area, provided VPC and TAF are documented and auditable
- Neither certifies social impact in the CSRD sense — they certify that the contribution was verified, executed, and measured according to KORA rules

---

## 12. Data Retention and Privacy Extracts

Retention periods proposed in the WhitePaper v3. Each is marked with its review requirement.

| Data Category | Retention Period (WhitePaper proposal) | Review Status | Notes |
|---|---|---|---|
| Event records (UEF) | 24 months | Requires legal/DPO validation | Must align with GDPR minimum necessary principle; 24 months supports quarterly trend analysis and year-over-year comparison |
| Organizational aggregates | 5 years | Requires legal/DPO validation | Supports multi-year trend and ESG reporting; no personal data if properly aggregated |
| Audit trail | 7 years | Requires legal/DPO validation | Reflects typical legal/fiscal retention obligations in the EU; supports external audit and compliance review |
| Sensitive event content | Not retained beyond session verification | Required — non-negotiable | Therapist notes, diagnosis, session content for psychological support: never retained in KORA system |
| Personal data (GDPR rights) | Erasure/anonymization on request | Required — GDPR | Personal data may be erased; aggregates may be maintained only if not re-identifiable and compatible with applicable legal basis |

**Applicable framework:** GDPR, DPA (Data Processing Agreement with client organization), DPIA (Data Protection Impact Assessment with DPO). The legal basis, retention conditions, and data subject rights must be defined contractually before processing begins.

**Privacy rules from WhitePaper consistent with current canonical (no changes needed):**
- N≥10 threshold: No segment aggregate shown for groups under 10 people
- `funding_source = personal` events for clinical care (therapy, psychological support, rehabilitation) are excluded from all organizational visibility including KER
- Employer cannot call the `/me/pib` endpoint for any employee
- PIB isolation is architectural, not configurable

---

## 13. Concepts Deprecated by Architecture v3

The following concepts from the WhitePaper v3/v4 are deprecated or superseded. They should not be referenced as current methodology.

| Deprecated Concept | Why Deprecated | Current Replacement |
|---|---|---|
| **Pillar Score (P_p) as mandatory intermediate layer** | The normalization against T_p, CM_p, and DF_p at PIB level was removed to simplify the PIB and move balance signals to the index level | PIB is now the direct sum of IU. Balance: PB at KORA Index level. Coverage: PC at KORA Index level |
| **BB (Breadth Bonus) and CP (Concentration Penalty) in PIB** | BB/CP logic was part of the old normalized PIB model. Removed when PIB became a direct IU sum | PB (Pillar Balance) and EQ (Equity) in KORA Index capture these signals at the aggregate level |
| **Old Gate Factor (GF) as continuous multiplier** | GF = 0.50 + 0.50 × min(PA, EQT, CT, EC) was a smooth multiplier that did not adequately penalize very low participation (Scenario B in StressTest) | Activation Safeguard: mandatory architectural layer (Stage ⑬) that enforces participation floors before the index engine runs |
| **Old fixed KORA Index weights (SQ=0.35, PA=0.25, EQT=0.15, CT=0.15, EC=0.10)** | Superseded by Architecture v3 10-component structure with empirical calibration pending | Architecture v3 components: AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS — weights to be calibrated empirically |
| **Old formula notation (ES, EF, RF, SF, SQ, PA, EQT, CT, EC, GF)** | Superseded during canonicalization process documented in doc 09 | Current notation: NM, EV, CF (Continuity), AGF, SF (Strategic Fit, optional), AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS |
| **Organization-held org_secret_key as Foundation Light default** | Foundation Light requires KORA-managed key to operate the data pipeline | KORA-held per-company keys for Foundation Light v0.1. Org-held key preserved as future option for fully productized platform |
| **CF as Context Fit** | CF name reused for Continuity Factor in current canonical; Context Fit concept moved to optional SF (Strategic Fit) | CF = Continuity Factor [1.00–1.20]. Optional SF = Strategic Fit [0.80–1.10] |
| **Any implication that company can see individual PIB** | Constitutional privacy rule — never changed between WhitePaper and current canonical | Employer-visible data is aggregated only, minimum group size N≥10, no individual identifiers |
| **"Standard-ready" as meaning the methodology is validated** | The WhitePaper status "Standard-ready · Pre-empirical calibration" means the structure is ready for empirical validation, not that it is already a validated standard | All parameters are provisional priors. "Standard-ready" means the framework is designed for calibration, not that calibration is complete |

---

## 14. Incorporation Recommendations

| Concept from WhitePaper | Current Status | Recommended Destination | Priority | Requires Review |
|---|---|---|---|---|
| Three reliability levels (Baseline/Verified/Certified) | Partially in doc 02 commercial tiers | Add formal definition to doc 10 or future Methodology Governance doc | High — relevant for Foundation Light positioning | Methodology team |
| Evidence Confidence model (EC = EVQ + CER + AC + DFR) | Partially captured in VR | Inform CS formula design in doc 11 and future Confidence Score specification | High — CS is 10th Architecture v3 component | Methodology team |
| T_p Pillar Target values (LIFE=8, GROWTH=6, CONNECTION=5, IMPACT=3, LEGACY=3) | Not in canonical | Reference values for NI_ref_max and future SRT calibration. Note in doc 11 | Medium — calibration reference | Statistics team |
| Sector Reference Tables (SRT) | Not in canonical | Future Benchmark & Normalization Layer specification | Low — post-pilot | Founder + statistics |
| Sector Friction Index (SFI) | Not in canonical | Future fairness normalization layer | Low — post-pilot | Founder + legal |
| Territorial Access Index | Not in canonical | Future fairness normalization layer | Low — post-pilot | Founder + legal |
| KORA Value Chain (VCA, NQ, VRD, TPC) | Not in canonical | Future Ecosystem tier specification | Low — Ecosystem tier | Founder |
| KORA Contribution detailed formula (CR, VCQ, SE, CT_c) | StressTest has simpler version | Future KORA Contribution specification (formal doc) | Medium — Contribution is relevant for Foundation Light positioning | Methodology team |
| KORA Impact Pledge mechanics (VPC, ADD_i, EQ_proj, TAF) | Not in canonical | Future KORA Contribution / KIP module specification | Low — post-Foundation Light | Founder + legal + privacy |
| CEF (Contribution Event Format) | Not in canonical | Doc 11 Technical Data Model — plan `contribution_program_id` field in UEF | Medium — anti-double-counting architecture | Architecture + privacy |
| Data retention schedule (24/60/84 months) | Not in canonical | Legal/DPO review → Privacy specification → Doc 11 schema | High — needed before data collection begins | Legal/DPO |
| Pseudonymization org-holds-key model | Conflicts with current canonical — preserved as future option | Note in doc 11. No implementation for Foundation Light. Revisit for Ecosystem tier | Low — future | Privacy/legal + founder |
| Funding source flag (company/co_funded/personal) | Not in canonical | Doc 11 Technical Data Model — UEF field | Medium — anti-double-counting and KER | Architecture |
| ESRS S1 mapping table | Not in canonical | Future ESRS / Reporting module specification | Medium — relevant for Governance+ tiers | ESG team |

---

## 15. Implications for Future Documents

**Doc 11 — Technical Data Model & Database Schema**

The WhitePaper conceptual elements imply the following schema decisions to be considered:
- `contribution_program_id` field in UEF (optional) — enables CEF integration and anti-double-counting
- `funding_source` field in UEF (company / co_funded / personal) — enables KER calculation and KORA Index boundary enforcement
- Data freshness tracking for HRIS snapshot age (DFR concept) — CS enrichment
- Audit completeness tracking per event — CS enrichment
- Pillar Availability Flag per sector/territory — future SRT integration point
- Three reliability levels as a computable field on KORA Index output records

**Future Confidence Score Formula**

The EC model from this appendix (EVQ, CER, AC, DFR) combined with additional signals (source diversity, rejection rate, manual review rate) should inform CS formula design. CS design requires:
1. Schema support in doc 11 for all input signals
2. Pilot data collection (Validation Roadmap Phase 2)
3. Calibration methodology decision (Validation Roadmap Phase 5)

**Future Benchmark & Normalization Layer**

Requires: T_p values, SRT publication infrastructure, Sector Friction Index methodology, Territorial Access Index, multi-company data (Phase 3–7 of validation roadmap).

**Future Value Chain Module**

Requires: partner trust score infrastructure, verified IU tracking by partner, partner record model, CEF infrastructure.

**Future Contribution / KIP Module**

Requires: CEF format specification, VPC calculation rules, TAF methodology, Additionality documentation standards, legal review of KIP financial flow constraints (KORA-not-intermediary rule must be technically enforced).

**Future Privacy / Legal Review**

Priority items before any data collection:
1. Data retention periods — legal/DPO sign-off
2. DPA and DPIA for Foundation Light
3. Pseudonymization key model for Foundation Light — legal basis
4. GDPR rights mechanism (erasure, anonymization on request)

**Future Certification Methodology**

The WhitePaper's Certified KORA Index level provides the target state. The path to get there follows the Validation Roadmap Phases 8–9 (academic validation + independent methodology audit, months 10–20). The three reliability levels in Section 7 of this appendix define the intermediate milestones.

---

**Clarification on appendix authority:**

Appendix B is a controlled conceptual extract. It is not a canonical formula authority. No formula in this appendix replaces or overrides any formula in docs 06, 09, 10, or Appendix A. When the concepts in this appendix are formally incorporated into future canonical documents, those future documents will govern — not this appendix.

---

*Appendix B — Status: Historical Conceptual Appendix — Approved Internal Reference*  
*Source: KORA_WhitePaper_v3_v4.md.pdf (Tier 4 Historical per doc 09 authority hierarchy)*  
*All formula names and component labels in this appendix use current Architecture v3 canonical notation unless explicitly labeled as historical.*  
*WhitePaper v3/v4 formula notation (ES, EF, RF, SF as Saturation Factor, SQ, PA, EQT, CT, EC, GF) is preserved here only for translation reference. It must not be used in any canonical document.*  
*Next document: Formal incorporation of Economic/Fiscal reference material into docs 03 and 04*
