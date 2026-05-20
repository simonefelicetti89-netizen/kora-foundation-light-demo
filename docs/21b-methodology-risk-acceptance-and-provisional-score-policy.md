# KORA Methodology Positioning and Score Governance Policy

*Document 21b — Founder Methodology Governance*
*Companion documents: docs 06, 10, 13, 20, 21*
*Status: Founder-Approved — v1.0*
*Date: 2026-05-17*

---

## 1. Purpose

Foundation Light v0.1 produces KORA Index outputs using a methodology that is architecturally complete, stress-tested, and operationally implementable. The component weights, verification multipliers, and Activation Safeguard thresholds used in v0.1 reflect structured methodological judgment grounded in the KORA Stress Test, Architecture v3 (doc 10), and the Methodological Constitution (doc 06). Empirical calibration through the Delphi Study follows in the next phase.

This document defines the governance framework for Foundation Light v0.1 outputs: how they may be used, how they must be presented, and how they evolve. It is a formal founder policy — not a scientific paper, not implementation code.

**Core principle:** KORA chooses transparent intelligence over fabricated precision.

A KORA Index that honestly shows activation distribution, pillar balance, and evidence quality — labeled with its methodology version — is more valuable than a confident-looking score that conceals its assumptions. In a market saturated with black-box HR ratings and opaque ESG scores, methodological transparency is a commercial differentiator, not a liability.

---

## 2. Methodology Status

### What Foundation Light v0.1 is

**Architecturally complete.** The 14-stage algorithm — from raw data ingestion through KORA Index output — is fully specified in Architecture v3. Every stage is mandatory and non-bypassable.

**Explainable by design.** Every KORA Index output traces back through components, pillar scores, Impact Units, and source events. No black-box outputs are produced at any stage.

**Auditable and versioned.** Methodology version and calibration status are stored with every output record. Historical records are permanently locked to the methodology version that produced them and are never retroactively recalculated.

**Stress-tested.** The KORA Stress Test Algoritmico validated architecture robustness across 11 scenarios, surfaced the Activation Safeguard need (Scenario B), and provided the numerical baseline (AR = 90%, MAR = 60%, KORA Index = 68.6) used for threshold calibration.

**Commercially usable for pilot intelligence.** Foundation Light v0.1 produces directionally accurate, explainable organizational intelligence suitable for structured diagnosis, pilot engagements, and executive discussion. This distinction matters: Foundation Light outputs are pilot-grade intelligence — not production-certified methodology. High-stakes enterprise use requires the v0.2 calibration pass described in Section 6.

### Calibration trajectory

Foundation Light v0.1 uses implementation-baseline values (equal component weights, referenced NM ranges, provisional Activation Safeguard thresholds) that will be refined through the Delphi Study and real pilot evidence in the Foundation tier. Outputs produced under v0.1 carry `calibration_status: pre_empirical_calibration`. Calibrated outputs produced under v1.0 will carry `calibration_status: empirically_calibrated`.

This is the correct design sequence. Calibrating a methodology before real company data exists would produce a precisely calibrated framework validated against nothing. KORA calibrates through evidence — not in advance of it.

---

## 3. Founder Risk Acceptance

The founder formally accepts the following strategic risks in launching Foundation Light v0.1:

**Market entry before Delphi calibration.** KORA will conduct pilot engagements while component weights and thresholds are in the baseline phase. Outputs are labeled accordingly. Clients requiring certified outputs are directed to the KORA Certified tier roadmap.

**Baseline weight dependency on pilot data.** The path from implementation baseline to calibrated methodology depends on real pilot evidence. The quality and diversity of the first pilot cohort directly affects the calibration roadmap speed and robustness.

**Iterative parameter refinement.** Activation Safeguard thresholds, NM reference values, and verification multipliers will be adjusted through the Delphi Study. This is by design — the methodology is engineered to evolve transparently through versioned releases.

**Strategic justification:** Waiting for theoretical calibration before market engagement is a strategic error. Pilot data, company feedback, and analyst experience are inputs to calibration — not outputs of it. The preferred path is honest intelligence now, evidence-driven calibration next.

---

## 4. Scope: Permitted and Prohibited Uses

### KORA Index v0.1 is appropriate for

| Use | Description |
|---|---|
| **Organizational diagnosis** | Understanding activation profile, pillar distribution, and program effectiveness |
| **Pilot analysis** | Structured analysis under Foundation Light v0.1 conditions with versioned outputs |
| **Executive and board discussion** | Directional intelligence input for strategy, program review, and investment decisions |
| **Activation and ecosystem mapping** | Analysis of engagement breadth across workforce segments and pillar coverage |
| **Directional benchmarking** | Period-over-period comparison or synthetic benchmark comparison |
| **Investor and stakeholder communication** | Illustrating KORA's methodology and analytical capability with calibration status disclosed |

### KORA Index v0.1 must not be presented as

- **Scientifically certified measurement** — calibration is in progress; certification requires empirical validation and peer review
- **Regulatory compliance** — KORA outputs are not ESRS, CSRD, GRI, or equivalent regulatory filings at any current tier
- **Individual worker assessment** — KORA measures organizations, not workers; no individual is rated, ranked, or evaluated
- **Hiring, promotion, or disciplinary input** — prohibited at every tier by product architecture and terms of service
- **Actuarial or investment-grade rating** — outputs may not enter actuarial models, credit assessments, or financial due diligence ratings

---

## 5. Output Standards

Every Foundation Light v0.1 output — in the platform UI, reports, demo presentations, and pilot deliverables — must carry:

| Required element | Placement |
|---|---|
| `Methodology v0.1 — Pre-Empirical Calibration` | All KORA Index outputs and report headers |
| `calibration_status: pre_empirical_calibration` | All scoring database records — this field is NOT NULL |
| `methodology_version_id` | All scoring records; displayed in the explainability panel |
| Confidence Score | Always shown with the KORA Index — the two are inseparable outputs |
| Data completeness indicator | All outputs reflecting incomplete data coverage |

**Pilot output disclosure statement** (required in all pilot reports):

> *"This KORA Index has been produced under Foundation Light v0.1 methodology, currently in the empirical calibration phase. Component weights and activation thresholds represent a structured implementation baseline. This output is organizational diagnostic intelligence — not certified measurement. Parameters will be refined through the KORA Delphi Study and pilot evidence program."*

**Platform rules:** The platform must never display a KORA Index without its Confidence Score, suppress calibration status labeling, or allow export of an output that conceals its data quality limitations. Explainability must always be accessible from any score display.

---

## 6. Weight Vector and Calibration Philosophy

### Implementation baseline values (D-21, doc 21)

| Parameter | v0.1 Value |
|---|---|
| Component weight vector | Equal — 0.10 per component (AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS) |
| CO redistribution (when CO = INSUFFICIENT_DATA) | `w_k_adjusted = 0.10 + (0.10 × 0.10 / 0.90) = 0.1111` for each of 9 remaining components |
| Activation Safeguard — CLEAR | AR ≥ 0.40 AND MAR ≥ 0.30 |
| Activation Safeguard — WARNING | 0.20 ≤ AR < 0.40 OR 0.15 ≤ MAR < 0.30 |
| Activation Safeguard — FLAGGED | AR < 0.20 OR MAR < 0.15 |
| NM — certified completions | 0.80 – 1.00 |
| NM — standard evidenced | 0.50 – 0.75 |
| NM — declared | 0.25 – 0.50 |
| NM — passive participation | 0.10 – 0.30 |
| Optional factors (DF, EXF, SF) | Default 1.00 — neutral when not applicable |

### Equal weights are implementation scaffolding

Equal weighting (0.10 × 10) is the implementation starting point — not a statement that all components are philosophically equivalent. The founder's position is that empirical calibration will confirm certain components carry structurally more signal:

- **Activation breadth (AR, MAR):** widespread distributed participation is a stronger indicator of organizational commitment than high-intensity engagement among a minority
- **Verified contribution (VR):** organizations whose impact claims are externally evidenced occupy a fundamentally different evidentiary position than those that self-declare
- **Continuity (CO):** sustained behavioral change has greater long-term organizational value than campaign-driven peaks
- **Worker and pillar balance (WB, PB/PC):** concentrated, single-pillar programs are methodologically different from genuinely distributed, multi-pillar investment

These are calibration hypotheses — to be tested and refined through the Delphi Study, not assumed. They prevent the implementation baseline from calcifying by default.

### When equal weights may and may not be used

The 0.10 × 10 weight vector is acceptable for:
- synthetic testing and demo engagements
- first-pass pilot diagnostic analysis
- internal platform validation

Before any high-stakes use — board-facing client reports, Certified-tier claims, or external communications that position the KORA Index as a strategic organizational benchmark — KORA must complete a **v0.2 calibration pass**. This pass may be founder-led, advisor-assisted, mini-Delphi, or expert-reviewed, but must revisit at minimum:

- AR and MAR weight (activation breadth signal)
- VR weight (verification quality signal)
- CO weight (continuity signal)
- Activation Safeguard thresholds
- PB/PC balance treatment

The 0.10 × 10 vector is a structured starting point. It is not strong enough to be treated as strategically final.

---

## 7. Activation Safeguard

### What it is

The Activation Safeguard is a mandatory, non-bypassable architectural layer between Company Aggregation and the KORA Index Engine. It cannot be disabled, configured away, or bypassed at any tier (Architecture v3 Section 16, D-09 Approved).

### What it solves

Without an activation check, a methodology rewarding only the quality of engagement among active workers would give a strong KORA Index to a company where 10% of workers have exceptional PIBs and 90% have PIB = 0. The program would measure the quality of a minority experience — not organizational people-impact maturity.

The Stress Test identified this as Scenario B — the critical vulnerability in the pre-Architecture v3 model. The Activation Safeguard was added specifically to correct this failure mode. The Stress Test baseline (AR = 90%, MAR = 60%, KORA Index = 68.6) anchors threshold calibration.

**The structural principle:** high quality among few workers cannot compensate for low reach across many. Activation breadth is a prerequisite — not one factor among many.

### Anti-gaming architecture

The Activation Safeguard works in combination with the IU formula's structural checks:

| Gaming attempt | Structural counter |
|---|---|
| Volume — submitting high quantities of low-quality events | NM caps + CQ quality multiplier reduce IU |
| False verification — claiming high evidence without documentation | EV multiplier reflects actual evidence quality |
| Concentration — strong programs for a small active group | Activation Safeguard ceiling caps achievable KORA Index |
| Repetition — identical low-value events submitted repeatedly | AGF reduction activates |

No single gaming strategy can materially inflate the KORA Index. The structural checks are layered and verifiable against the published formula.

---

## 8. Pilot Engagement Policy

The following rules apply to all Foundation Light v0.1 pilot company outputs:

**P-01 — Version labeling is mandatory.** All outputs carry "Methodology v0.1 — Pre-Empirical Calibration" in all display contexts. This label may not be footnoted or visually subordinated.

**P-02 — Confidence Score and explainability are required.** Every KORA Index display includes the Confidence Score and access to component-level breakdown. A score without its confidence context is a non-compliant output.

**P-03 — Data quality limitations are surfaced.** Incomplete datasets produce lower confidence — not false precision. Data quality indicators are visible in every output that reflects limited coverage.

**P-04 — Pilot outputs are diagnostic intelligence.** They are organizational insight instruments and methodology inputs — not final assessments, performance verdicts, or binding conclusions.

**P-05 — Pilot evidence contributes to calibration.** With appropriate consent and anonymization, analyst override patterns, activation distributions, and data quality metrics from pilot engagements will feed the Delphi Study calibration process. Pilot companies are active participants in methodology maturation.

**P-06 — No regulatory representation.** Pilot outputs may not be presented to regulatory authorities, investment institutions, or certification bodies as validated measurements.

**P-07 — AI suggestion data is transient.** `gov.ai_mapping_suggestions` records are transient scaffolding, purged 30 days after batch closure. The permanent record lives in the audit trail. All pilot data processing is subject to Gate 3 legal review before any live company data is ingested.

---

## 9. Calibration Roadmap

KORA's methodology evolves through a structured Delphi Study — expert elicitation, iterative feedback rounds, and consensus-building across HR, organizational behavior, and social impact specialists. The goal is to replace implementation-baseline parameters with empirically grounded values derived from real organizational data.

**Phase 1 — Foundation Light (current)**
Baseline established (D-21, doc 21 — complete). Expert panel composition defined. All outputs carry `pre_empirical_calibration` status.

**Phase 2 — Pilot evidence collection**
Data collected from 3–5 pilot companies across diverse sectors. Analyst override patterns and activation distributions documented. Delphi expert panel outreach begins.

**Phase 3 — Delphi Study execution (Foundation tier)**
Structured expert elicitation across weight vector, activation thresholds, and NM reference values. Calibrated values validated within ±5% of Stress Test Scenario B baseline.

**Phase 4 — Methodology v1.0 release**
`methodology_version_id = 'v1.0_calibrated'` applied to all subsequent outputs. Historical records remain permanently under `v0.1_pre_empirical_calibration` — no retroactive recalculation. Version change is fully documented and disclosed.

**Versioning principle:** KORA's architecture locks methodology version to every output at production time. Historical records are never silently recalculated. The version difference between v0.1 and v1.0 is transparent in every record — this is the correct design. Retroactive recalculation would undermine the permanence of KORA's intelligence record.

---

## 10. KORA's Methodological Identity

### What KORA measures

KORA measures **organizational activation intelligence** — the degree to which an organization's people programs produce verified, distributed, balanced, and sustained human impact across its workforce.

KORA measures organizations, not workers. The output of every KORA analysis is a picture of what an organization's programs actually produced — not an evaluation of any individual who participated.

Specifically, KORA measures:
- Workforce activation breadth and quality
- Verified contribution across five human value pillars
- Evidence quality of reported activity
- Engagement continuity and behavioral change
- Equity of impact distribution across workforce segments

### What KORA does not claim

- **Perfect human measurement.** Human organizational behavior is complex and only partially observable from structured data. KORA processes what can be structured, classified, and verified — and is transparent about what cannot.
- **Immutable truth.** The KORA Index is an opinionated but honest analytical framework under documented methodology. It is not a universal or permanent judgment of organizational character.
- **Regulatory certification.** KORA outputs support ESG reporting and people strategy — they are not ESRS, CSRD, or GRI filings at the current tier.
- **Individual assessment.** No individual is scored, ranked, or evaluated. This is a constitutional design choice, not a gap.

### What KORA claims

- **Explainable intelligence.** Every score traces to components, pillars, events, and source data. No output is a black box.
- **Structural privacy protection.** Individual data never surfaces to employers — enforced by database architecture (grant absence, pseudonymization, safe-group thresholds), not by policy alone.
- **Auditable methodology.** Every output carries its methodology version, calibration status, and computation parameters. The formula is documented and the calculation is reproducible.
- **Transparent uncertainty.** Low-quality data produces lower confidence, not false precision. The platform shows what it does not know as clearly as what it does.
- **Versioned calibration discipline.** The methodology evolves through evidence — each release is labeled, documented, and distinct from prior releases.

---

## 11. Business-Value Correlation Gap

KORA demonstrates structured organizational activation intelligence — but has not yet empirically proven correlation with business outcomes.

The following are plausible hypotheses to be tested through pilot data and future research:

| Business outcome | Correlation hypothesis |
|---|---|
| Employee retention | Higher activation breadth associated with lower voluntary turnover |
| Absenteeism | Stronger LIFE + CONNECTION activation associated with lower absence rates |
| Workforce engagement | Meaningful activation rate associated with higher engagement indicators |
| Employer branding | Verified multi-pillar programs associated with stronger talent attraction |
| Workforce resilience | Cross-pillar balance + continuity associated with more adaptive organizations |
| ESG social quality | Verified IMPACT + GROWTH activation associated with stronger S-pillar evidence |

**Rule:** No KORA commercial material may state or imply that the KORA Index predicts retention, productivity, absenteeism, or financial performance until sufficient supporting evidence exists.

**What KORA may claim today:**
- These correlations are plausible and worth structured testing
- Pilot design should capture relevant business outcome indicators where available
- Future Foundation tier versions may include an Outcome Correlation Layer connecting KORA intelligence to verifiable business metrics
- Organizations building distributed, verified, multi-pillar programs are creating the organizational conditions associated with these outcomes — whether or not the causal link is yet formally proven

---

## 12. Methodological Risks

| Risk | Mitigation |
|---|---|
| **MR-01 — Calibration data insufficiency.** Sparse or homogeneous pilot data weakens Delphi Study inputs. | Diverse pilot cohort by sector and size from the first engagement; minimum data volume requirements per pilot. |
| **MR-02 — Founder bias in baseline values.** Directional hypotheses (Section 6) reflect conviction, not empirical finding; they may not be confirmed. | Independent expert panel in Delphi Study with structured dissent processes; hypotheses labeled as hypotheses throughout. |
| **MR-03 — Sector overfitting.** First pilot cohort concentrated in one sector may produce sector-specific calibration. | Recruit deliberately diverse first cohort; flag calibration conclusions as sector-specific where generalization is not yet supported. |
| **MR-04 — Score misinterpretation.** Stakeholders may anchor on the KORA Index number and overlook calibration status labeling. | Calibration status visually prominent (not footnoted); score interpretation session standard in pilot engagement methodology. |
| **MR-05 — ESG expectation mismatch.** Regulated-industry clients may expect regulatory-grade outputs from Foundation Light. | Clear product scope at first commercial contact; Foundation Light positioned as diagnostic intelligence; Certified tier roadmap as the pathway for regulatory use cases. |
| **MR-06 — Activation threshold miscalibration.** Provisional Safeguard thresholds (CLEAR: AR ≥ 0.40, MAR ≥ 0.30) may not match real company activation distributions. | Monitor pilot activation distributions; adjust through Delphi Study Phase 3 if distributions reveal systematic misalignment. |
| **MR-07 — BCM taxonomy gaps.** Sector-specific terminology not covered in BCM keyword index reduces AI suggestion quality and increases analyst override rate. | Monitor override rate as leading indicator of BCM gaps; expand BCM iteratively from override patterns; override data becomes ML training data in Foundation tier. |

---

## 13. Certification & Assurance Path

### Maturity Tiers

| Livello | Nome | Descrizione | Status Foundation Light |
|---|---|---|---|
| 1 | Diagnostic | Foundation Light. Pre-calibrazione empirica. Pilot-grade diagnostic intelligence. | **Tier corrente** |
| 2 | Tracked | Misurazione ricorrente, trend, KORA Evolution. | Futuro — Foundation tier |
| 3 | Governed | Audit trail, policy rules, advisor involvement, financial governance. | Futuro — Governance tier |
| 4 | Advisor-reviewed | Evidenza, iniziativa, metodologia o eligibilità specifica rivista da advisor qualificato. | Futuro — parzialmente disponibile in Foundation |
| 5 | KORA Certified | Tier certificato futuro. Richiede validazione metodologica, revisione esterna, processo evidence-grade. | Futuro — richiede attivazione esplicita del tier |
| 6 | Public Verified Snapshot | Segnale pubblico condivisibile con QR verification e strict claims controls. | Futuro — requisito: tier Certified |

### Distinzioni assolute — non negoziabili

- **Diagnostic ≠ Certified.** Foundation Light è Diagnostic tier. Nessun output può usare linguaggio "certified".
- **Advisor-reviewed ≠ Certified.** La revisione advisor è un layer di fiducia, non un tier di certificazione.
- **Public Snapshot ≠ Certified.** Un Public Snapshot è un segnale di fiducia, non una certificazione organizzativa.
- **Verified initiative ≠ Certified organization.** Un'iniziativa verificata non certifica l'intera organizzazione.
- **KORA Certified = futuro.** Richiede: validazione metodologica, processo evidence-grade, revisione esterna qualificata, attivazione esplicita del tier. Nessuno di questi elementi è presente in Foundation Light.

### Regole operative

- Foundation Light produce esclusivamente output di tier Diagnostic.
- Nessun output Foundation Light può usare la parola "certified" in qualsiasi claim.
- Lo status advisor-reviewed non deve essere presentato come equivalente a Certified.
- Public Snapshot richiede il tier Certified per reclamare "Verified KORA Snapshot".
- I claim di certificazione richiedono che tutti i requisiti del tier siano soddisfatti — l'attivazione esplicita è richiesta, non presupposta.

---

## 14. Public KORA Snapshot — Claims Policy

### Status in Foundation Light

Public KORA Snapshot è **future-vision / mockup only** in Foundation Light. Non è consentita alcuna condivisione pubblica reale. Nessuna integrazione LinkedIn attiva. Nessun QR verificabile live.

Foundation Light mostra Public Snapshot solo come mockup statico, chiaramente etichettato "Future Vision / Not Active in Foundation Light."

### Elementi obbligatori in ogni futuro Public Snapshot

Ogni futuro Public KORA Snapshot deve mostrare obbligatoriamente:
- `methodology_version_id`
- `calibration_status`
- Confidence Score
- Data completeness / limitazioni dove rilevante
- Dichiarazione: "Nessun dato individuale incluso"

### Claim consentiti in Public Snapshot (solo in tier futuro)

- Segnale aggregato di attivazione
- Range del KORA Index per il periodo
- Riepilogo Pillar Coverage
- Direzione di miglioramento (non livello assoluto certificabile)
- Segnale KORA Contribution
- Indicatore evidence level

### Claim non consentiti in qualsiasi Public Snapshot

- Qualsiasi dato individuale del lavoratore
- PIB, worker timeline, Dynamic Impact CV
- Ranking pubblico rispetto ad altre organizzazioni in Foundation Light
- Linguaggio "certified" senza i requisiti del tier KORA Certified soddisfatti
- Claim causali di business outcome ("KORA riduce il turnover")
- Claim di compliance CSRD/ESRS
- KORA Index preciso presentato senza calibration status visibile

### Posizionamento canonico

> "KORA consente in futuro di comunicare segnali aggregati di fiducia, non ranking pubblici né claim ESG certificati."

> "KORA trasforma l'intelligence interna sull'attivazione people in segnali di fiducia comunicabili verso stakeholder, mercato e talenti, senza esporre dati individuali e senza sovradichiarare certificazioni."

---

## 15. CSR/ESG Output — Mandatory Disclaimer

Il seguente disclaimer è obbligatorio in ogni output che faccia riferimento a framework CSR/ESG:

> *"KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio."*

**Questo disclaimer deve comparire in:**
- Pagine CSR Evidence Mapping della piattaforma
- ESG/CSR Evidence Annex
- Board Pack dove compare il CSR/ESG evidence mapping
- Public KORA Snapshot se viene menzionata la rilevanza CSR/ESG
- Qualsiasi report pilot che faccia riferimento a CSRD / ESRS / GRI / ISO 26000 / OECD / UNGP / UN Global Compact

**Il disclaimer non può essere:**
- Collocato solo in note a piè di pagina non visibili nella schermata principale
- Visivamente subordinato o ridotto
- Omesso da qualsiasi output che menzioni un framework CSR/ESG
- Parafrasato in modo da ridurne la portata

**KORA non sostituisce:** consulenti ESG, consulenti legali, consulenti fiscali, revisori di assurance, statutory sustainability reporting, processi di compliance CSRD/ESRS, processi di reporting GRI, certificazioni ISO, due diligence sui diritti umani.

**KORA fornisce:** evidenze people strutturate, activation intelligence, tracciabilità, spiegabilità, confidenza, versioning metodologico, qualità dell'evidenza, contesto report-ready, potenziale CSR evidence annex.

---

## 16. Founder Statement

KORA Foundation Light v0.1 is **ready for pilot intelligence and market validation** — and explicitly not yet something more than that.

**What it is not:**
- Certified methodology — calibration through the Delphi Study is in progress
- A business-outcome predictor — correlations with retention, productivity, and performance are hypotheses to be tested (Section 11)
- A regulatory-grade social impact standard — that belongs to the KORA Certified tier roadmap

**What it is:**
- Explainable — every score traces to components, pillars, events, and source data
- Privacy-safe — individual data never surfaces to employers, enforced by architecture
- Auditable — methodology version and calibration status locked to every output
- Versioned — each calibration release is distinct and documented
- Directionally valuable — honest organizational activation intelligence of genuine strategic use
- Designed to mature through evidence — pilot data, Delphi Study, and outcome correlation research are the calibration path

The goal of Foundation Light is real-world validation, calibration through pilot evidence, and ecosystem learning. Waiting for theoretical perfection before market engagement would mean calibrating against nothing — and arriving too late.

The KORA methodology makes clear distinctions that most HR and ESG measurement systems do not: what was invested vs. what people actually did; activity counted vs. impact produced; benefit offered vs. worker activated; declared intention vs. verified action.

Transparency about calibration status belongs to that same discipline. KORA is building the methodology trust stack in the right order: transparent intelligence first, empirical calibration second, external certification third.

---

> *"Foundation Light v0.1 shows organizations a diagnostic picture they have never seen before — where activation is concentrated and where it is absent, which pillars are developed and which are empty, how much of their stated impact is verified and how much is declared, whether their programs reach the whole workforce or serve a minority. And it does all of this with its calibration status labeled, its confidence score visible, and its methodology documented.*
>
> *That is sufficient to be commercially valuable. That is sufficient to validate the market. That is sufficient to begin the calibration process."*

---

*Document 21b — v1.3 — 2026-05-20*
*Phase 1M-B alignment: Added §13 Certification & Assurance Path, §14 Public Snapshot Claims Policy, §15 CSR/ESG Mandatory Disclaimer*
*Status: Founder-Approved Methodology Governance*
*Next calibration milestone: Delphi Study preparation — Foundation tier Phase 0*
*Methodology version this document governs: v0.1 — `pre_empirical_calibration`*
*Canonical reference: `docs/kora-canonical-product-architecture-v1.md` §20–21*
