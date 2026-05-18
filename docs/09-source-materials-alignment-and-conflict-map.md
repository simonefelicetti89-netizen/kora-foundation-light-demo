# KORA Source Materials Alignment & Conflict Map

**Document:** 09 — Source Materials Alignment & Conflict Map  
**Status:** Approved Analysis — Founder Decisions Recorded  
**Purpose:** Analyze all reference files added to the project, determine how they relate to the approved canonical documentation, identify what should be incorporated, what should be treated as historical, and what conflicts with the current canonical methodology.  
**Date:** 2026-05-17 (revised — both PDFs now extracted and analyzed)  
**Produced by:** Claude Code analysis session

---

## 1. Source File Inventory

Seven reference files were found in the KORA project folder. All seven have been copied to `docs/references/`. Both PDF files were extracted using PyPDF2 after `pip3 install PyPDF2` — content fully recovered.

| # | File | Original Location | Readable | Pages | Type |
|---|------|------------------|----------|-------|------|
| 1 | `KORA_Architecture_v3_Specs.md` | `docs/Architecture/` | Yes — full | Long | Markdown spec |
| 2 | `KORA_ArchDiagram_v3.jsx` | `docs/Architecture/` | Yes — full | — | React/JSX |
| 3 | `KORA_Integrazioni_v4.md` | `docs/White paper/` | Yes — full | Long | White paper |
| 4 | `KORA_Economic_Financial_WhitePaper.docx` | `docs/Financial/` | Yes — extracted | Long | Word doc |
| 5 | `KORA_FiscalCategories_Guardrails.docx` | `docs/Financial/` | Yes — extracted | Long | Word doc |
| 6 | `KORA_StressTest_Algoritmico_v1.md.pdf` | `docs/` (root) | **Yes — extracted** | **67** | PDF |
| 7 | `KORA_WhitePaper_v3_v4.md.pdf` | `docs/White paper/` | **Yes — extracted** | **54** | PDF |

**Note on PDF extraction:** Both PDFs required PyPDF2. `pdftotext` is not available on this system. PyPDF2 produced complete, readable output for both files. For future sessions: `python3 -c "import PyPDF2"` to verify availability, or `pip3 install PyPDF2` if needed.

---

## 2. Authority Hierarchy

The following hierarchy governs all decisions in this document. Higher tiers always override lower tiers.

| Tier | Source | Authority Level | Override Rule |
|------|--------|----------------|---------------|
| **Tier 1 — Canonical** | `docs/01` through `docs/08` | Highest | Approved. Nothing overwrites them without explicit founder approval. |
| **Tier 2 — Architecture Reference** | `KORA_Architecture_v3_Specs.md` | High — structural | Extends doc 06 on KORA Index component count. Requires formal incorporation. |
| **Tier 2 — Stress Test** | `KORA_StressTest_Algoritmico_v1.md.pdf` | High — uses current naming | Fully consistent with Architecture v3 and doc 06. Most complete numerical validation available. |
| **Tier 2 — Architecture Diagram** | `KORA_ArchDiagram_v3.jsx` | High — visual confirmation | Read-only reference. Not to be implemented as-is. |
| **Tier 3 — Economic/Fiscal Reference** | `KORA_Economic_Financial_WhitePaper.docx` `KORA_FiscalCategories_Guardrails.docx` | High in its domain | Authoritative on FUO/KORA Fees, fiscal categories, Guardrails Engine. Requires formal incorporation. |
| **Tier 4 — Historical** | `KORA_Integrazioni_v4.md` `KORA_WhitePaper_v3_v4.md.pdf` | Low — historical only | Both use older formula notation (ES, EF, RF, SF, SQ, PA, EQT, CT, EC, GF). Must not overwrite doc 06 or Architecture v3. May be used as calibration and conceptual source only. |

**Core rule:** Any formula, component, or naming convention in a lower tier that contradicts a higher tier is overridden without exception.

---

## 3. Coherence Assessment

### 3.1 KORA_Architecture_v3_Specs.md — SUBSTANTIALLY COHERENT with notable extensions

Consistent with doc 06's IU formula. Extends doc 06 on: KORA Index component count (10 vs. 7), adds Activation Safeguard as an architectural layer, adds MAR/WB/CS as new components. Full governance note sets. Mermaid diagrams confirming architecture. See Section 6 for incorporation plan.

---

### 3.2 KORA_ArchDiagram_v3.jsx — COHERENT (visual confirmation only)

Confirms: Personal Top-Up Continuity = behavioral signal only, not KORA Index input. Ecosystem Reach = "DASH ONLY." Ecosystem Effectiveness = conversion quality indicator, new in v3. Read-only reference.

---

### 3.3 KORA_Integrazioni_v4.md — HISTORICAL — SIGNIFICANT NAMING CONFLICTS

Older integration white paper. Uses old formula names (ES, EF, RF, SF, SQ, PA, EQT, CT, EC, GF). Old PIB model with Pillar Score + BB/CP. Old KORA Index formula with 5 components. Numerical content (BC values, Demo Srl example) is usable as calibration reference only after translation to current nomenclature. See Section 4 for full conflict mapping.

---

### 3.4 KORA_Economic_Financial_WhitePaper.docx — COHERENT with important elaborations

Defines KORA Fees / FUO separation, SVAM model, five required professional validations, three fiscal misclassification risks. Substantially coherent with docs 03–05. Requires formal incorporation. See Section 9.

---

### 3.5 KORA_FiscalCategories_Guardrails.docx — COHERENT and highly detailed

Nine fiscal categories, 15+ classification fields, 12-step Guardrails Engine, Welfare Statement structure, risk map. Fully coherent with doc 04 and Economic White Paper. Ready for formal incorporation into canonical. See Section 9.

---

### 3.6 KORA_StressTest_Algoritmico_v1.md.pdf — HIGHLY COHERENT — CURRENT CANONICAL NAMING

**Status: Fully extracted and analyzed. 67 pages. Status: Draft v1.0 — Pre-empirical calibration.**

**What it is:** A complete technical validation of the KORA scoring model on a simulated company of 50 workers over one quarter. Produced by a multi-disciplinary team (statistician, data scientist, ESG/CSR expert, HR analytics, modeling, independent reviewer). Its primary purpose is to verify internal consistency, identify weak points, and produce a documented basis for future empirical validation — not to prove the algorithm "works."

**Formula consistency — CURRENT NAMING USED:**

The StressTest uses the current canonical IU formula throughout, fully consistent with Architecture v3 and doc 06:
```
IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF]
```
NM = Normalized Magnitude, EV = Evidence multiplier, AGF = Anti-Gaming Factor. No old naming (ES, EF, RF, SF) appears anywhere in the document.

PIB formula is fully consistent with doc 06: `PIB = Σ_p IU_{worker,p}` (simple sum, no BB/CP).

KORA Index formula uses the doc 06 7-component structure with current naming:
```
KORA Index = Σ_k (Score_k × w_k) × 100
Components: AR(0.20), NI(0.20), PB(0.15), EQ(0.15), VR(0.10), CO(0.10), PC(0.10)
```

**Key numerical results:**
- Company Total IU: 641.80 IU (50 workers, Q1)
- Average PIB: 12.836 IU
- Median PIB: 14.45 IU
- Maximum PIB: 31.70 IU (W01, balanced director)
- Gini coefficient on PIB distribution: 0.366 (moderate inequality)
- KORA Index Q1: **68.6/100**
- KORA Contribution Q1: 46.7/100 (separate index)
- KORA Ecosystem Reach Q1: 63.5/100 (dashboard only — explicitly NOT in KORA Index)
- Activation Rate: 90% (45/50 workers with PIB ≥ 1.5 IU)
- Meaningful Activation Rate: 60% (30/50 workers with PIB ≥ 10 IU)

**Event taxonomy:** 29 event types defined across all five pillars, each with primary and secondary BC values, NM formulas, cap rules, and CF/AGF conditions. This is the most complete publicly available event taxonomy in current canonical naming.

**Factor values established as priors (all marked as "assunzioni provvisorie" or "da calibrare"):**

| Factor | Values used | Status |
|--------|------------|--------|
| CQ | Self-declared=0.50, Internal=0.70, External=0.80, KCP=1.00, Cert.exam=1.20 | Da calibrare |
| EV | Self=0.50, Internal=0.70, External=0.80, KCP=1.00 | Da calibrare |
| CF | One-shot=1.00, Monthly=1.10, Biweekly=1.15, Formal path=1.20 | Assunzione provvisoria |
| AGF | Normal=1.00, Near-cap=0.80, Over-cap=0.50, Anomaly=0.30, Duplicate=0.00 | Necessaria per calcolo |
| DF | Range 1.0–1.30 (for certifications) | Assunzione provvisoria |
| EXF | Unverified=1.00, External verified=1.10, KCP verified=1.15, Measured=1.20 | Assunzione provvisoria |
| SF | Optional: Default=1.00, HR plan aligned=1.05, Strategic program=1.10 | Assunzione provvisoria |

**Note on SF (Strategic Fit):** The StressTest introduces SF as an additional optional factor beyond the canonical six. Its default is 1.00 (equivalent to omitting it), and it is only applied when explicit HR documentation exists. It appears in calculation examples but is not in the core formula display. This is a potential future extension to the canonical formula — not a current conflict, since it defaults to 1.00. The founder should decide whether SF should be formally added to the canonical formula as a seventh optional factor.

**NI reference value:** NI_ref_max = 32 IU (PIB of a very active worker in the simulation). Explicitly declared arbitrary — to be updated from empirical data.

**Six stress scenarios tested:**
- A: High participation, low quality → KORA Index 55.3 (correct signal: quality penalizes)
- B: Low participation, high quality → KORA Index 68.0 (identified limit: AR not weighted enough)
- C: LIFE concentration → KORA Index 59.3 (PB and PC collapse)
- D: High IMPACT, low internal activation → KORA Index 57.0 (AR dominates correctly)
- E: Wide ecosystem, low actual use → KORA Index 58.5 (VR low, KER correctly excluded)
- F: Gaming (post-AGF) → KORA Index 56.2 (AGF reduces IU, PB collapses)

All scenarios produce KORA Index ≤ baseline. No scenario inflates the index anomalously.

**Identified model limit (Scenario B):** With AR=30% but very high quality per active worker, KORA Index = 68.0 — almost identical to baseline. The document explicitly flags this: "Il sistema non penalizza sufficientemente la bassa partecipazione quando l'intensità è molto alta." The suggested correction — increase AR weight from 0.20 to 0.30, introduce a minimum penalty if AR < 50% — is fully consistent with Architecture v3 adding MAR (Minimum Activation Rate) as a new KORA Index component.

**Privacy handling in StressTest:** Worker data is pseudonymized throughout. The employer visibility constraint is enforced in all calculation examples (e.g., psychological support: "Il tipo specifico di supporto non viene mai reso visibile al datore di lavoro. L'azienda vede solo: W02 ha avuto 3 sessioni di supporto psicologico nel trimestre."). Aggregates by segment with minimum group size = 10.

**Validation roadmap (10 phases, months 1–24):**
Phase 1: Stress test (this document) → complete  
Phase 2: Real pilot (1 company, 50–200 workers, 3 months) → calibrate thresholds and first empirical BCM  
Phase 3: Multi-company data collection (3–5 companies, different sectors)  
Phase 4: Delphi Study to validate BCM with 15–20 experts  
Phase 5: PCA calibration of KORA Index weights  
Phase 6: Sensitivity analysis  
Phase 7: Sectorial benchmarks  
Phase 8: Academic partnership for peer review  
Phase 9: Independent methodology audit  
Phase 10: Algorithm v1.0 stable release — months 20–24

**Assessment:** The StressTest is the primary numerical reference for the current canonical model. It is fully coherent with doc 06 and Architecture v3 naming. It should be treated as a Tier 2 reference document and formally incorporated as a canonical appendix after the methodology section is approved. See Section 7 for full incorporation plan.

---

### 3.7 KORA_WhitePaper_v3_v4.md.pdf — HISTORICAL — OLD FORMULA NOTATION — IMPORTANT CONCEPTUAL ELABORATIONS

**Status: Fully extracted and analyzed. 54 pages. "White Paper v3 — Documento finale unificato." Status: Standard-ready · Pre-empirical calibration · Confidential.**

**What it is:** A comprehensive methodology and product white paper, described as "Step 2 + Step 3 integrati" of a versioned white paper development process. It is an earlier version of the KORA methodology documentation — the "v3" in the filename refers to the version of this specific white paper, not to Architecture v3. It predates Architecture v3 and uses the old formula naming conventions.

**Formula notation — OLD NAMING — PRE-ARCHITECTURE v3:**

The WhitePaper v3 uses the old formula names throughout. This is the same notation as Integrazioni v4:

```
IU_{e,p} = BC_{e,p} × ES_e × EF_e × CQ_e × CF_e × RF_e × SF_e
```

Seven factors: ES (Evidence Strength), EF (Effort Factor), CQ (Completion Quality), CF (Context Fit), RF (Recency Factor), SF (Saturation Factor). No NM, EV, AGF.

**PIB formula — OLD MODEL with Pillar Score intermediate layer:**

The WhitePaper v3 inserts an intermediate aggregation level between IU and PIB that does not exist in the current canonical model:

```
P_p = min(100, (PRS_p / T_p) × 100 × CM_p × DF_p)  [Pillar Score — intermediate level]
PIB = Σ_p (W_p × P_p) + BB − CP                       [old PIB formula]
```

Where:
- PRS_p = sum of IU for pillar p in the period
- T_p = Pillar Target (sector benchmark IU for that pillar per quarter)
- CM_p = Continuity Multiplier [1.00–1.40]
- DF_p = Diversity Factor [0.80–1.10]
- BB = Breadth Bonus (Shannon entropy-based, up to 10 points)
- CP = Concentration Penalty [0 to −5], only when anti-gaming flag active

This is structurally different from the current canonical PIB = Σ_p IU_{worker,p}. The current model removed the Pillar Score normalization, the T_p targets, and the BB/CP logic from PIB.

**KORA Index formula — OLD NAMING:**
```
KORA Index = 100 × (0.35×SQ + 0.25×PA + 0.15×EQT + 0.15×CT + 0.10×EC) × GF
```
SQ = Score Quality (= mean(PIB_attivi)/100), PA = Participation, EQT = Equity, CT = Continuity, EC = Evidence Confidence, GF = Gate Factor.

This is the same as Integrazioni v4 and the same old naming convention confirmed in the conflict map.

**CRITICAL CONFLICT — Pseudonymization key ownership:**

The WhitePaper v3 states explicitly:
> "La chiave org_secret_key è generata dall'organizzazione, custodita internamente, e non viene mai trasmessa a KORA. Anche in caso di accesso non autorizzato al database KORA, nessun hash sarebbe ricondotto a una persona reale."

This means: in the WhitePaper v3 model, **the organization generates and holds the pseudonymization key, not KORA**.

This directly conflicts with the Foundation Light architecture decision in docs 07 and 08, which specifies:
> "Per-company pseudonymization keys held by KORA's internal privacy service (not the company, not split-key at Foundation Light)."

This is a real architectural conflict requiring explicit founder resolution. See Section 4.10 and the note on design trade-offs in Section 8.

**New conceptual elements in WhitePaper v3 not in canonical docs:**

The WhitePaper v3 contains important concepts not yet formalized in any canonical document. These are historically valuable elaborations, even if the formula notation is outdated:

| Element | Description | Current status |
|---------|------------|----------------|
| Pillar Score (P_p) | Intermediate normalization layer between IU and PIB, using sector targets T_p | Not in canonical — older model, removed in evolution to current PIB formula |
| T_p (Pillar Targets) | Sector benchmark IU per pillar per quarter (LIFE=8, GROWTH=6, CONNECTION=5, IMPACT=3, LEGACY=3) | Not in canonical — useful as future calibration input |
| CM_p (Continuity Multiplier) | [1.00–1.40] rewards temporal regularity of events within a pillar | Not in canonical — concept absorbed into CF (Continuity Factor) |
| DF_p (Diversity Factor) | [0.80–1.10] rewards variety of event types within a pillar | Not in canonical — absent from StressTest |
| Evidence Confidence (EC) 4-component formula | EC = 0.40×EVQ + 0.30×CER + 0.20×AC + 0.10×DFR | Not in canonical — rich elaboration of VR concept |
| Sector Reference Tables (SRT) | Published annually, sector-specific T_p benchmarks by ATECO code | Not in canonical — future phase |
| Sector Friction Index (SFI) | Adjusts T_p for sectors with lower structural access to services | Not in canonical — future phase |
| Territorial Access Index | Adjusts event value in areas with lower partner density | Not in canonical — future phase |
| Three KORA Index reliability levels | Baseline (internal data), Verified (API/external certs), Certified (KCP + audit trail) | Partially in canonical (commercial tiers in doc 02) — more granular here |
| KORA Value Chain | Fourth index: ecosystem maturity and relational quality of the partner network | Not in canonical — first formal definition |
| KORA Contribution detail | Full formula: CR^0.25 × VCQ^0.30 × SE^0.25 × CT_c^0.20, 4 components with formulas | More detailed than in StressTest |
| KORA Impact Pledge mechanics | VPC, TAF (Territorial Attribution Factor), Additionality Coefficient, 4-phase flow | Not in canonical — detailed mechanics |
| Data retention schedule | Events: 24 months, Aggregates: 5 years, Audit trail: 7 years | Not in canonical |
| Contribution Event Format (CEF) | Separate format from UEF for collective programs (anti-double-counting) | Not in canonical |

**Assessment:** The WhitePaper v3 is an important source of conceptual elaboration, but it uses the pre-Architecture v3 formula notation throughout. Its formula naming must not be imported into canonical documents. Its conceptual content — especially around Pillar Targets, KORA Value Chain, KORA Contribution mechanics, KORA Impact Pledge, and the three reliability levels — is relevant for future phases and should be extracted and translated before formal incorporation. The pseudonymization key ownership conflict requires founder resolution. See Section 8 for full incorporation plan.

---

## 4. Conflict Map

### 4.1 IU Formula — Naming Conflict (Integrazioni v4 + WhitePaper v3 vs. Architecture v3 / doc 06 / StressTest)

**Status: NAMING CONFLICT — RESOLVED IN CANONICAL. Old names must not be used.**

| Old name (Integrazioni v4 / WhitePaper v3) | Old meaning | Current name (Architecture v3 / doc 06 / StressTest) |
|--------------------------------------------|-------------|------------------------------------------------------|
| ES | Evidence Strength (source quality) | EV (Evidence multiplier) |
| EF | Effort Factor (magnitude normalization) | NM (Normalized Magnitude) |
| RF | Recency Factor (time decay) | Absorbed into CF or deprecated → DF (Decay Factor, optional) |
| SF | Saturation Factor (anti-gaming) | AGF (Anti-Gaming Factor, consolidated) |
| BC | Base Contribution | BC (unchanged) |
| CQ | Completion/Content Quality | CQ (unchanged) |
| CF | Context Fit | CF (Continuity Factor — NOTE: different meaning, see 4.1a below) |

**Note 4.1a — CF meaning shift:** In WhitePaper v3, CF = Context Fit [0.85–1.15], i.e. alignment with role/strategy. In current canonical (Architecture v3 / StressTest), CF = Continuity Factor [1.00–1.20], i.e. recurrence/continuity of behavior. These are different concepts sharing the same abbreviation. The old Context Fit concept is now captured by the optional SF (Strategic Fit) factor in the StressTest.

**Resolution:** Use only current canonical naming. The StressTest (Section 3.6) is the definitive numerical reference in current notation.

---

### 4.2 PIB Formula — Structural Conflict (WhitePaper v3 / Integrazioni v4 vs. doc 06 / StressTest)

**Status: STRUCTURAL DIFFERENCE — Current canonical is correct. Old model is superseded.**

| Model | PIB formula | Intermediate level |
|-------|-------------|-------------------|
| WhitePaper v3 / Integrazioni v4 | `PIB = Σ_p (W_p × P_p) + BB − CP` | Pillar Score P_p = f(IU, T_p, CM_p, DF_p) — normalized 0–100 |
| Current canonical (doc 06 / StressTest) | `PIB_worker = Σ_p IU_{worker,p}` | None — PIB is a direct sum of IU |

The architectural evolution removed the Pillar Score normalization and the BB/CP logic from PIB. Balance and concentration signals are now handled at the KORA Index level (PB and EQ components). This is the correct current architecture.

**Resolution:** Current canonical PIB formula is correct. No incorporation of old Pillar Score layer or BB/CP into PIB.

---

### 4.3 KORA Index — Component Count Conflict (doc 06 vs. Architecture v3)

**Status: EVOLUTION — Architecture v3 extends doc 06. Requires founder decision before finalization.**

Doc 06: 7 components (AR, NI, PB, EQ, VR, CO, PC) with fixed weights summing to 100%.  
Architecture v3: 10 components (AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS) with weights "to be empirically calibrated."

The StressTest uses the doc 06 7-component structure and explicitly identifies the need for MAR (via Scenario B analysis), which Architecture v3 then formalizes. The StressTest is therefore the bridge between doc 06 and Architecture v3.

**Resolution pending founder decision:** Confirm whether Architecture v3's 10-component structure supersedes doc 06.

---

### 4.4 KORA Index — Old Naming Conflict (Integrazioni v4 + WhitePaper v3 vs. current canonical)

**Status: RESOLVED IN CANONICAL. Old names must not be used.**

| Old name | Old weight | Current equivalent | Current weight (doc 06) |
|----------|-----------|-------------------|------------------------|
| SQ (Score Quality) | 0.35 | NI (Normalized Intensity) | 20% |
| PA (Participation) | 0.25 | AR (Activation Rate) | 20% |
| EQT (Equity) | 0.15 | EQ (Equity distribution) | 15% |
| CT (Continuity) | 0.15 | CO (Continuity) | 10% |
| EC (Evidence Confidence) | 0.10 | VR (Verification Rate) | 10% |
| GF (Gate Factor — multiplier) | binary | Activation Safeguard (architectural layer) | — |
| *(absent)* | — | PB (Pillar Balance) | 15% |
| *(absent)* | — | PC (Pillar Coverage) | 10% |

---

### 4.5 PIB Visibility — Conflict (WhitePaper v3 vs. doc 06 / CLAUDE.md)

**Status: RESOLVED IN CANONICAL. WhitePaper v3 is consistent on the core rule.**

WhitePaper v3 states explicitly: "L'organizzazione non vede mai il PIB di nessun dipendente. Il PIB entra nel KORA Index esclusivamente come SQ = media(PIB_attivi) / 100, in forma aggregata e pseudonimizzata. Questo è un vincolo architetturale, non una scelta configurabile."

This is consistent with the current canonical privacy position. The employer never sees individual PIB.

---

### 4.6 Personal Top-Up — Conflict (historical vs. Architecture v3)

**Status: RESOLVED IN ARCHITECTURE v3.** Personal Top-Up Continuity is a behavioral signal only, not a KORA Index input. Confirmed in both Architecture v3 Specs and ArchDiagram v3.

---

### 4.7 Ecosystem Reach — Dashboard-only status

**Status: RESOLVED.** Confirmed dashboard-only in both Architecture v3, ArchDiagram v3, and the StressTest (which explicitly excludes KORA Ecosystem Reach from the KORA Index formula and provides a separate calculation). The StressTest provides the detailed formula for KORA Ecosystem Reach for the first time.

---

### 4.8 Fiscal Categories — No conflict, significant elaboration

**Status: COHERENT AND ADDITIVE.** Nine fiscal categories are consistent with docs 03–05. The principle that fiscal eligibility ≠ impact is fully preserved.

---

### 4.9 Economic Model — No conflict, significant elaboration

**Status: COHERENT AND ADDITIVE.** KORA Fees / FUO separation is consistent with doc 03.

---

### 4.10 CRITICAL CONFLICT — Pseudonymization Key Ownership (WhitePaper v3 vs. doc 07/08)

**Status: HARD CONFLICT — Requires explicit founder resolution before technical schema is finalized.**

**WhitePaper v3 position (UEF field definition):**
```
person_hash: HMAC-SHA256(person_id, org_secret_key)
```
"La chiave org_secret_key è generata dall'organizzazione, custodita internamente, e non viene mai trasmessa a KORA. Anche in caso di accesso non autorizzato al database KORA, nessun hash sarebbe ricondotto a una persona reale."

**Current canonical position (doc 07/08):**
"Per-company pseudonymization keys held by KORA's internal privacy service — not the company, not split-key at Foundation Light."

**Nature of the conflict:** Two fundamentally different trust architectures.

| Model | Key holder | Privacy implication | Operational implication |
|-------|-----------|--------------------|-----------------------|
| WhitePaper v3 (org holds key) | The organization | KORA cannot deanonymize — maximum privacy | Org can deanonymize own workers; key management on client side; harder for KORA to manage data quality |
| Current canonical (KORA holds key) | KORA internal service | KORA can deanonymize under process; org cannot directly | KORA manages key lifecycle; simpler for Foundation Light consulting delivery; requires KORA to be trusted custodian |

**Why the current model was chosen (doc 07/08):** Foundation Light is a consulting-grade delivery. KORA generates the diagnosis. For the data pipeline to work — matching events to workers, deduplication, linking across sources — KORA needs to manage the pseudonymization mapping during ingestion. In a fully productized platform with a worker app, the org-holds-key model becomes feasible. For Foundation Light, it would create an operational bottleneck.

**Resolution required:** Founder must explicitly confirm which model governs:
- Option A: Current canonical (KORA holds per-company keys) — approved in docs 07/08. Keep.
- Option B: Org-holds-key (WhitePaper v3 model) — requires reopening doc 07/08 decisions.
- Option C: Split-key (future phase) — org and KORA each hold half, neither can deanonymize alone.

Until the founder confirms Option A explicitly, the current canonical (doc 07/08) stands.

---

### 4.11 KORA Value Chain — New index not in current canonical

**Status: NEW ELEMENT — Not a conflict. Requires future incorporation decision.**

The WhitePaper v3 defines KORA Value Chain as a fourth index (after PIB, KORA Index, KORA Contribution), measuring the maturity and relational quality of the partner ecosystem. It is distinct from KORA Ecosystem Reach (which measures availability/coverage) — Value Chain measures the quality of verified relationships and the reliability of the data flow from partners.

This is referenced in Architecture v3 as a future element. It belongs to the Ecosystem tier, not Foundation Light.

**Resolution:** No action needed for Foundation Light. Note for future incorporation.

---

### 4.12 Pillar Score Intermediate Layer — WhitePaper v3 model vs. current canonical

**Status: ARCHITECTURAL EVOLUTION — Current canonical is correct. Pillar Score was intentionally removed.**

The WhitePaper v3 inserted a Pillar Score (P_p) between IU and PIB: `P_p = min(100, (PRS_p / T_p) × 100 × CM_p × DF_p)`. This normalization against sector targets (T_p) and the addition of CM_p (Continuity Multiplier) and DF_p (Diversity Factor) made PIB a normalized 0–100 score rather than a sum of IU.

The current canonical model removed this intermediate layer. PIB is now the direct sum of IU. The balance/normalization signals moved to the KORA Index level. This is the correct current architecture.

The T_p values (LIFE=8 IU, GROWTH=6 IU, CONNECTION=5 IU, IMPACT=3 IU, LEGACY=3 IU per quarter) remain useful as calibration reference for NI_ref_max and for future Sector Reference Tables. They should be documented but not incorporated into the current PIB formula.

---

### 4.13 SF (Strategic Fit) Factor — Stress Test extension vs. canonical formula

**Status: MINOR DISCREPANCY — StressTest extends the canonical formula with an optional factor.**

The canonical IU formula (doc 06 / Architecture v3) includes: `NM × BC × CQ × EV × CF × AGF [× DF] [× EXF]`.

The StressTest introduces an additional optional factor: **SF (Strategic Fit) [0.80–1.10]** — applied only when explicit HR documentation exists (plan formativo, programma strategico). Default = 1.00 (neutral, equivalent to omitting it). It appears in worked examples but not in the main formula display.

This is not a conflict — it is a proposed optional extension with a transparent default. However, it should be either formally added to the canonical formula as a seventh optional factor or explicitly excluded.

**Resolution required (founder):** Confirm whether SF should be added to doc 06 as a seventh optional factor: `IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]`. If not, remove from StressTest examples in any future revision.

---

## 5. Incorporation Recommendations

### 5.1 KORA_Architecture_v3_Specs.md
**Incorporate:** Yes — as a formal canonical document. Create `docs/10-architecture-v3-layer-specification.md`. See Section 6.

### 5.2 KORA_ArchDiagram_v3.jsx
**Incorporate:** No formal document needed. Read-only visual reference only.

### 5.3 KORA_Integrazioni_v4.md
**Incorporate:** Partially — BC calibration values and Demo Srl numerical example only, after translating to current naming. Do not incorporate formula notation.

### 5.4 KORA_Economic_Financial_WhitePaper.docx
**Incorporate:** Yes — key additions to docs 03 and 04. SVAM, five-economic-quantity framework, three fiscal misclassification risks, five professional validations. See Section 9.

### 5.5 KORA_FiscalCategories_Guardrails.docx
**Incorporate:** Yes — nine fiscal categories, Guardrails Engine, Welfare Statement. See Section 9.

### 5.6 KORA_StressTest_Algoritmico_v1.md.pdf
**Incorporate:** Yes — as a canonical appendix after methodology section is approved.  
**Method:** Create `docs/appendices/A-stress-test-algoritmico-summary.md` that extracts:
- The Methodological Assumptions Table (MAT) in full
- The event taxonomy (29 event types with BC values, NM formulas, cap rules)
- The complete factor value tables (CQ, EV, CF, AGF, DF, EXF, SF)
- The 50-worker simulation summary (aggregate statistics, KORA Index components)
- The six stress scenarios and their outcomes
- The validation roadmap (10 phases, months 1–24)
- The internal consistency checks (all 8 passed)

The StressTest should also be referenced in doc 06 as the primary numerical validation of the methodology.

**What NOT to incorporate from StressTest:** Individual worker profiles (W01–W50) — these are simulation artifacts, not architectural decisions.

**Timing:** Can be done in parallel with the Architecture v3 canonicalization. Does not block other work.

---

### 5.7 KORA_WhitePaper_v3_v4.md.pdf
**Incorporate:** Selectively — conceptual content only, not formula notation.  
**What to extract and translate:**
- Three KORA Index reliability levels (Baseline / Verified / Certified) — translate to current naming and incorporate into doc 02 (commercial tiers) and the future Architecture v3 document.
- EC 4-component formula: EC = 0.40×EVQ + 0.30×CER + 0.20×AC + 0.10×DFR — evaluate as an elaboration of the current VR/PC components. Requires founder review.
- T_p sector benchmark values (LIFE=8, GROWTH=6, CONNECTION=5, IMPACT=3, LEGACY=3 IU/quarter) — document as calibration reference for NI_ref_max and future SRT.
- KORA Value Chain definition — document as a future phase indicator. Not for Foundation Light.
- KORA Contribution detailed formula — harmonize with StressTest version before incorporating.
- KORA Impact Pledge mechanics (VPC, TAF, Additionality Coefficient) — document for future Ecosystem tier.
- Data retention schedule (events 24m, aggregates 5y, audit trail 7y) — incorporate into doc 10 (Technical Data Model).
- CEF (Contribution Event Format) concept — document as a future UEF extension.

**What NOT to incorporate:** IU formula with old names (ES, EF, RF, SF), PIB formula with Pillar Score and BB/CP, KORA Index formula with SQ/PA/EQT/CT/EC/GF, org-holds-key pseudonymization model (unless founder resolves conflict 4.10 in favor of Option B).

**Method:** Create `docs/appendices/B-whitepaper-v3-conceptual-extracts.md` for the translated conceptual content. This prevents contamination of canonical docs while preserving useful elaborations.

---

## 6. Architecture v3 Integration

**Recommendation: Create `docs/10-architecture-v3-layer-specification.md`**

Before creating this document, the following founder decisions are required:
1. Confirm 10-component KORA Index (MAR, WB, CS added; fixed weights removed in favor of empirical calibration)
2. Confirm Activation Safeguard as architectural layer
3. Confirm SF (Strategic Fit) as optional seventh factor or exclude it
4. Resolve pseudonymization key ownership (Conflict 4.10)

**Can Architecture v3 become doc 10 now?** Yes — the PDF analysis has confirmed no v4 methodology updates that would block this. The WhitePaper v3 uses older naming and does not introduce a "v4" methodology. The StressTest is fully consistent with Architecture v3. The only open blocker is the founder decision on the 4 items above.

---

## 7. Stress Test Integration

**Full assessment complete.** See Section 3.6.

The StressTest (67 pages, KORA_StressTest_Algoritmico_v1.md.pdf, created 2026-05-16) is the most complete numerical validation document in the KORA system. It:
- Uses current canonical naming throughout
- Is fully consistent with doc 06 and Architecture v3
- Provides the first complete event taxonomy in current notation (29 event types)
- Provides all factor values with calibration status labels
- Identifies Scenario B as a current model limit (consistent with Architecture v3 adding MAR)
- Provides a 10-phase validation roadmap
- Passes 8 internal consistency checks

**Recommended action:** Create `docs/appendices/A-stress-test-algoritmico-summary.md`. This does not require any founder decisions — the StressTest is fully consistent with approved canonical documents.

---

## 8. White Paper Integration

**Full assessment complete.** See Section 3.7.

The WhitePaper v3 (54 pages, KORA_WhitePaper_v3_v4.md.pdf, created 2026-05-10) is an earlier version of the KORA methodology documentation. The "v3" refers to the version of this specific white paper, not to Architecture v3. Key findings:

**It is NOT a v4 methodology update.** The filename "v3_v4" appears to mean "White Paper version 3, covering methodology transition from v3 to v4 of the algorithm" or simply the document version number. The content uses pre-Architecture v3 naming (ES, EF, RF, SF) and the old PIB formula structure. It does not introduce a "KORA v4" that would require a new canonical document.

**The pseudonymization conflict (4.10) is the only blocking issue.** All other WhitePaper v3 content can be handled as either: (a) historical background that has been superseded, or (b) future-phase conceptual elaboration to be extracted and translated.

**Recommended actions:**
1. Founder resolution on pseudonymization key ownership (Conflict 4.10) — blocking for doc 10 (Technical Data Model).
2. Create `docs/appendices/B-whitepaper-v3-conceptual-extracts.md` for the useful conceptual content translated to current naming.
3. Explicitly mark WhitePaper v3 as historical reference in `docs/references/` index.

---

## 9. Economic and Fiscal Integration

### 9.1 KORA_Economic_Financial_WhitePaper.docx

**Into doc 03:** Five-economic-quantity framework, SVAM definition with three billing variants, non-payment institution status.

**Into doc 04:** Three critical misclassification risks (IVA 22% on FUO, PSD2 exposure, loss of Art. 51 TUIR benefit), five required professional validations (commercialista welfare, consulente del lavoro, legal PSD2, DPIA/DPO, payment institution partner compliance) with estimated cost 40,000–80,000 €.

### 9.2 KORA_FiscalCategories_Guardrails.docx

Nine fiscal categories as canonical enumerated type:
1. `welfare_51tuir` — enters FUO, Art. 51 TUIR agevolated
2. `fringe_benefit` — individual, within annual threshold
3. `formazione` — training budget, Art. 95 TUIR
4. `hse` — health/safety budget, variable
5. `csr_esg` — direct company→project flow, not welfare
6. `hr_discretionary` — no worker tax benefit
7. `employee_paid` — worker personal funds
8. `co_funded` — mixed, requires split accounting
9. `non_monetary` — Verified Actions only, no financial flow

Fiscal Guardrails Engine: 12-step control sequence, fail-safe principle, six result states. Welfare Statement: 18+ fields, payroll-ready format. All ready for incorporation into doc 10 (Technical Data Model).

**Core principle to preserve verbatim:**
> KORA is not a fiscal advisor. KORA is a program operator and administrative centralizer. Fiscal classification is declared by the client company, validated by their advisors, and applied by KORA inside the Fiscal Guardrails Engine.

---

## 10. Recommended Next Steps

### Step 1 — Founder resolution on pseudonymization key ownership (BLOCKING for doc 10)
Resolve Conflict 4.10: who holds the pseudonymization key — KORA's internal service (current canonical, doc 07/08) or the organization (WhitePaper v3). Current canonical stands until explicitly changed.

**Responsible:** Founder decision.  
**Urgency:** Must resolve before Technical Data Model (doc 10) is finalized, specifically before the `pseudonymization_key_references` table schema is locked.

---

### Step 2 — Founder decision on Architecture v3 KORA Index components
Confirm: (a) 10-component structure supersedes doc 06's 7, (b) MAR, WB, CS adopted, (c) fixed weights replaced by empirical calibration, (d) Activation Safeguard as architectural layer, (e) SF (Strategic Fit) as optional seventh IU factor or explicitly excluded.

**Responsible:** Founder decision.  
**Blocker:** Until resolved, Architecture v3 cannot be formally adopted as doc 10.

---

### Step 3 — Create `docs/10-architecture-v3-layer-specification.md`
After Steps 1–2 are resolved. This document formally adopts Architecture v3 as the canonical technical reference, superseding the KORA Index section of doc 06.

---

### Step 4 — Create `docs/appendices/A-stress-test-algoritmico-summary.md`
Extract the Methodological Assumptions Table, event taxonomy, factor values, simulation summary, stress scenarios, and validation roadmap from the StressTest. Translate to clearly labeled, citable canonical form.

**Does NOT require Steps 1–2.** Can proceed immediately.

---

### Step 5 — Create `docs/appendices/B-whitepaper-v3-conceptual-extracts.md`
Extract useful conceptual content from WhitePaper v3 translated to current canonical naming. Covers: three reliability levels, EC formula, T_p values, KORA Value Chain, KORA Contribution formula, KORA Impact Pledge mechanics, data retention schedule, CEF concept.

**Does NOT require Steps 1–2.** Can proceed immediately.

---

### Step 6 — Formally incorporate Economic/Fiscal reference material
Extend docs 03 and 04 with SVAM, FUO five-quantity framework, nine fiscal categories, Guardrails Engine, Welfare Statement. Either as amendments to existing docs or as new numbered documents.

---

### Step 7 — Finalize Technical Data Model (currently `docs/10-technical-data-model-database-schema.md`)
After Steps 1–6. Incorporate: correct KORA Index component set from v3, nine fiscal categories as enumerated types, Guardrails Engine result taxonomy, Welfare Statement structure, pseudonymization architecture (per founder resolution in Step 1), data retention schedule from WhitePaper v3.

---

## 11. CLAUDE.md Update Required

The following updates to CLAUDE.md are needed (in addition to updates already made in the previous session):

### 11.1 Status note

Update doc 09 status entry:
```
| 09 | docs/09-source-materials-alignment-and-conflict-map.md | Source Materials Alignment & Conflict Map — Analysis Complete — Pending Founder Review |
```

### 11.2 Additional permanent rules to add:

```
- Old formula names are historical and must not be used.
  ES→EV, EF→NM, RF+SF→AGF, SQ→NI, PA→AR, EQT→EQ, CT→CO, EC→VR, GF→Activation Safeguard layer.
- Architecture v3 (KORA_Architecture_v3_Specs.md) must be consulted
  before any database schema, scoring engine design, or UI design work proceeds.
- Economic/Fiscal documents must be consulted before any payment path,
  wallet, FUO orchestration, fiscal guardrail, SVAM, or Welfare Statement design work proceeds.
- Old formulas from Integrazioni v4 and WhitePaper v3 must not overwrite doc 06
  without explicit founder approval.
- Do not overwrite docs/06, docs/07, or docs/08.
```

### 11.3 Update "Current Next Step":

```
## 10. Current Next Step

Docs 01–09 complete. Source materials alignment map produced (doc 09). Before proceeding to technical schema finalization:

1. Founder decision on pseudonymization key ownership (BLOCKING — Conflict 4.10 in doc 09):
   who holds the per-company key — KORA or the organization?

2. Founder decision on Architecture v3 KORA Index component set (10 components vs. doc 06's 7)
   and on SF (Strategic Fit) as optional seventh IU factor.

3. Create docs/10-architecture-v3-layer-specification.md (after decisions 1–2).

4. Create docs/appendices/A-stress-test-algoritmico-summary.md (can proceed now).

5. Formally incorporate Economic/Fiscal reference material into docs 03 and 04.

6. Finalize technical data model (currently docs/10-technical-data-model-database-schema.md,
   to be renumbered to doc 11 after step 3).

Do not write application code or migrations until steps 1–6 are complete and approved.
```

---

## 12. Founder Decisions After Review

The following decisions were made by Simone Felicetti after reviewing doc 09 v0.2 on 2026-05-17. These decisions resolve all open conflicts and open items identified in Sections 4 and 10. They are authoritative and bind all future technical, design and schema work.

---

### Decision 1 — Pseudonymization Key Ownership

**Approved for Foundation Light v0.1:**
KORA's internal privacy service holds per-company pseudonymization key references. This confirms the current canonical decision in docs 07 and 08. Conflict 4.10 is resolved in favor of the current canonical model.

**Reason:** Foundation Light requires KORA to manage ingestion, matching, deduplication, cross-source reconciliation and reporting. The organization-held key model from WhitePaper v3 is treated as historical / future-architecture option.

**Future direction:** Future versions may evaluate split-key or organization-held key models after dedicated privacy/legal review.

**Status: Approved for Foundation Light v0.1, subject to privacy/legal review.**

---

### Decision 2 — Architecture v3 KORA Index Component Structure

**Approved:**
Architecture v3 supersedes doc 06 on the KORA Index component structure. The KORA Index moves from the 7-component prototype in doc 06 to the 10-component Architecture v3 structure:

```
KORA Index = f(AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS)
```

**Reason:** The Stress Test (doc 09, Section 3.6) identified a structural weakness in the 7-component version: low participation with high quality was not penalized enough (Scenario B). Architecture v3 addresses this with MAR (Minimum Activation Rate) and the Activation Safeguard layer.

**Status: Approved as Architecture v3 baseline, subject to empirical calibration.**

---

### Decision 3 — Activation Safeguard Layer

**Approved:**
Activation Safeguard becomes a mandatory architectural layer between Company Aggregation and KORA Index Engine. Its function: prevent high quality among a small active group from fully compensating low distributed activation across the workforce.

**Status: Approved for Architecture v3.**

---

### Decision 4 — KORA Index Weights

**Approved:**
The fixed weights in doc 06 (AR 20%, NI 20%, PB 15%, EQ 15%, VR 10%, CO 10%, PC 10%) are historical prototype weights only. They must not be presented as scientifically validated. Architecture v3 adopts "weights to be empirically calibrated."

No weight set is scientifically final until the following are complete: real pilot data, sensitivity analysis, PCA/statistical calibration, expert panel review, and academic/advisor validation. See Stress Test validation roadmap (Phases 5–9).

**Status: Approved. Doc 06 prototype weights remain for reference only.**

---

### Decision 5 — SF / Strategic Fit Factor

**Approved as optional factor, evidence-required:**
SF (Strategic Fit) may be included as an optional factor in the IU formula. It must only be applied when explicit documented evidence exists — such as a formal HR plan, a documented company training program, or written advisor validation. SF must never be used as a discretionary or default-raised score.

**Canonical optional formula (v0.1 with SF):**
```
IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
```

SF default = 1.00. SF range = [0.80, 1.10]. SF > 1.00 requires documented cf_evidence_type.

**Status: Approved as optional, evidence-required, pre-calibration factor.**

---

### Decision 6 — Stress Test as Primary Numerical Reference

**Approved:**
`KORA_StressTest_Algoritmico_v1.md.pdf` is accepted as the primary numerical validation reference for the current canonical model. It uses current canonical naming throughout and is fully consistent with doc 06 and Architecture v3.

**Action approved:** Create `docs/appendices/A-stress-test-algoritmico-summary.md` as a canonical appendix extracting the Methodological Assumptions Table, event taxonomy, factor values, simulation results, stress scenarios, validation roadmap and internal consistency checks.

**Status: Approved for appendix creation.**

---

### Decision 7 — WhitePaper v3/v4 as Historical/Source Material

**Approved:**
`KORA_WhitePaper_v3_v4.md.pdf` is historical and source material only. It must not overwrite current canonical formulas, naming conventions or architecture decisions. Its old formula notation (ES, EF, RF, SF, SQ, PA, EQT, CT, EC, GF) and old PIB/KORA Index structure are superseded.

**Action approved:** Useful conceptual elements (three reliability levels, EC formula, T_p values, KORA Value Chain, KORA Contribution and Impact Pledge mechanics, data retention schedule, CEF concept) may be extracted and translated to current canonical naming into `docs/appendices/B-whitepaper-v3-conceptual-extracts.md`.

**Status: Approved for selective conceptual extraction.**

---

*All seven decisions above are final for Foundation Light v0.1. No open items remain in doc 09.*

---

*End of Document — KORA Source Materials Alignment & Conflict Map — v0.3 — 2026-05-17*

*v0.1: Initial analysis, PDFs unreadable.*  
*v0.2: Both PDF files extracted and fully analyzed. Sections 3.6, 3.7, 4.10–4.13, 5.6, 5.7, 7, 8, 10 revised.*  
*v0.3: Status updated to Approved. Section 12 (Founder Decisions) added. All 7 open items resolved.*
