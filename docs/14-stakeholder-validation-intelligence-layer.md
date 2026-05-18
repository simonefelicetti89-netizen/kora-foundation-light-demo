# KORA Stakeholder & Market Validation Intelligence Layer

*Title: KORA Stakeholder & Market Validation Intelligence Layer — Module Specification*
*Status: Draft — Pending Founder Review*
*Version: 0.2*
*Date: 2026-05-17*
*Scope: Foundation Light — MVP Validation Phase*
*Authority: Strategic validation module. Does not affect KORA Index computation, scoring, or governance methodology.*

---

## 1. Module Overview

### 1.1 Purpose

The Stakeholder & Market Validation Intelligence Layer is a structured strategic instrument for capturing, organizing, and analyzing real-world market interactions during the MVP validation phase of KORA Foundation Light.

Its purpose is to transform informal market conversations — meetings with CHROs, CFOs, ESG leads, investors, accelerator partners, and innovation directors — into structured, comparable, and analytically usable intelligence. This intelligence informs product-market fit assessment, commercial readiness evaluation, and investor narrative construction.

The module answers three strategic questions:

1. **Who is responding to KORA, and how?** — Stakeholder profile, sector, company size, decision-maker type, initial reaction.
2. **What signals indicate genuine interest vs. polite engagement?** — Stage progression, perceived value score, willingness-to-pay signal, objection patterns.
3. **Where is KORA's market forming?** — Sector density, geographic concentration, feature demand clustering, value proposition resonance.

### 1.2 What This Module Is Not

This module is **not a CRM**.

A CRM manages customer relationships, sales pipelines, contact records, and revenue forecasting. It is optimized for sales velocity, deal closing, and pipeline management. KORA does not yet have customers. KORA is in a validation phase where the product itself — including its commercial positioning, value proposition, and pricing logic — is still being tested against the real market.

This module is **not a contact management tool**. It does not store personal contact data as a primary function. It stores structured signals about market behavior at the company and segment level.

This module is **not a fundraising tool**. It does not manage investor relationships, cap tables, term sheets, or legal processes. It tracks intent signals and validation evidence that may be used to support investor conversations — but is not a substitute for investor relations infrastructure.

### 1.3 Role in MVP Validation Strategy

Foundation Light's 90-day commercial target requires that by the end of the first build cycle, KORA can demonstrate:

- A defined group of target companies that have engaged with the platform value proposition
- Measurable evidence of interest across sectors, geographies, and company sizes
- Structured documentation of objections encountered and how they were addressed
- At least one or more companies in Pilot Consideration or further stages
- Quantifiable signals of willingness to pay at indicative ranges
- A dataset that supports investor-ready PMF narratives

The Stakeholder Validation Intelligence Layer provides the analytical infrastructure to produce all of the above. It converts founder and team commercial activity from informal tracking (spreadsheets, notes, memory) into a structured intelligence system.

### 1.4 Relationship to KORA Core Methodology

This module is **completely isolated** from the KORA scoring methodology.

It does not touch:

- Impact Units (IU)
- PIB (Personal Impact Balance)
- KORA Index components (AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS)
- Activation Safeguard logic
- Eligibility classification
- Privacy and pseudonymization architecture

It operates as a **parallel strategic intelligence layer** that serves the founders and the KORA commercial/investment strategy — not the platform's core analytics engine.

---

## 2. Stakeholder Entity Model

A **Stakeholder Record** is the central unit of this module. It represents a target organization — not an individual contact — and accumulates all engagement signals and intelligence gathered about that organization over time.

### 2.1 Stakeholder Record Fields

#### 2.1.1 Identity Fields

| Field | Type | Description |
|---|---|---|
| `record_id` | UUID | Unique identifier for this stakeholder record |
| `company_name` | String | Legal or trade name of the target organization |
| `company_id` | String (optional) | External identifier (e.g., VAT, company registry number) if available |
| `sector` | Controlled vocabulary | Primary industry sector (see 2.2) |
| `sub_sector` | String (optional) | More granular sector classification |
| `company_size` | Controlled vocabulary | Headcount tier (see 2.3) |
| `geography` | Controlled vocabulary | Country + region where the company primarily operates |
| `created_date` | Date | Date the record was created |
| `record_owner` | String | Founder or team member responsible for this engagement |

#### 2.1.2 Contact Classification Fields

| Field | Type | Description |
|---|---|---|
| `primary_contact_type` | Controlled vocabulary | Role of primary interlocutor (see 2.4) |
| `secondary_contact_types` | Array of controlled vocabulary | Additional roles reached within the same organization |
| `decision_maker_reached` | Boolean | Whether the final budget/contract decision maker has been contacted |
| `c_suite_engaged` | Boolean | Whether C-suite level contact has occurred |

#### 2.1.3 Engagement State Fields

| Field | Type | Description |
|---|---|---|
| `engagement_stage` | Controlled vocabulary | Current pipeline stage (see Section 3) |
| `stage_entry_date` | Date | Date current stage was entered |
| `days_in_current_stage` | Integer (computed) | Number of days since stage entry |
| `last_contact_date` | Date | Most recent interaction date |
| `next_action_date` | Date | Date of next planned touchpoint |
| `next_action_type` | String | Description of planned next interaction |
| `engagement_velocity` | Computed metric | Rate of stage progression over time (see Section 4) |

#### 2.1.4 Interest and Value Perception Fields

| Field | Type | Description |
|---|---|---|
| `interest_domains` | Array of controlled vocabulary | KORA value dimensions the stakeholder has expressed interest in (see 2.5) |
| `primary_interest_domain` | Controlled vocabulary | Single strongest domain of expressed interest |
| `perceived_value_score` | Integer [0–100] | Founder-assessed estimation of how much value the stakeholder perceives in KORA (see 2.6) |
| `perceived_value_score_rationale` | Text | Free-text justification for the score |
| `perceived_value_score_date` | Date | Date of last score update |
| `trust_score` | Integer [0–100] | Structured qualitative assessment of relationship trust and credibility (see 2.7) |
| `trust_score_rationale` | Text | Free-text justification |

#### 2.1.5 Objection and Friction Fields

| Field | Type | Description |
|---|---|---|
| `objection_tags` | Array of controlled vocabulary | Structured tags for objections raised (see 2.8) |
| `objection_notes` | Text | Free-text elaboration on specific objections |
| `primary_blocker` | Controlled vocabulary | Dominant blocking factor if company is not progressing |
| `objection_addressed` | Boolean | Whether identified objections have been meaningfully addressed |

#### 2.1.6 Interaction History

| Field | Type | Description |
|---|---|---|
| `interaction_log` | Array of Interaction records | Chronological log of all interactions (see 2.9) |
| `interaction_count` | Integer (computed) | Total number of logged interactions |
| `total_engagement_time_days` | Integer (computed) | Days elapsed since first interaction |

#### 2.1.7 Investment and Budget Intent Fields

*(Detailed in Section 5)*

| Field | Type | Description |
|---|---|---|
| `budget_range_indication` | Controlled vocabulary | Non-binding budget tier signal |
| `willingness_to_pay_score` | Integer [0–100] | Structured intent signal |
| `pilot_budget_potential` | Controlled vocabulary | Indicative pilot budget range |
| `enterprise_contract_potential` | Controlled vocabulary | Indicative annual contract range |
| `investment_intent_level` | Controlled vocabulary | Qualitative investment readiness signal |
| `confidence_level_of_intent` | Controlled vocabulary | How confident the founder is in the intent signals |

#### 2.1.8 Prioritization & Strategic Signal Fields

*(Detailed in Sections 2.10, 2.11, 2.12)*

| Field | Type | Description |
|---|---|---|
| `icp_fit_score` | Integer [0–100] | Ideal Customer Profile fit score — how well this company matches KORA's target customer profile (see 2.10) |
| `icp_fit_score_rationale` | Text | Free-text justification of component scores |
| `icp_fit_score_date` | Date | Date of last ICP Fit Score update |
| `internal_champion_strength` | Integer [0–100] | Structured signal measuring strength of any internal champion inside the stakeholder organization (see 2.11) |
| `internal_champion_strength_rationale` | Text | Free-text notes on champion role, influence, and access |
| `internal_champion_role` | Controlled vocabulary | Role of primary internal champion (uses Contact Type vocabulary, 2.4) |
| `strategic_relationship_value` | Integer [0–100] | Composite score capturing strategic value beyond direct revenue potential (see 2.12) |
| `strategic_relationship_value_rationale` | Text | Free-text justification of component scores |

#### 2.1.9 Founder Learning Fields

| Field | Type | Description |
|---|---|---|
| `founder_conviction_delta_cumulative` | Integer (computed) | Sum of all `founder_conviction_delta` values logged in interaction records for this stakeholder — tracks net effect on founder conviction over the full engagement history |
| `founder_conviction_trend` | Controlled vocabulary | Computed directional trend: Rising / Stable / Declining — based on the last three interaction deltas |

### 2.2 Sector Controlled Vocabulary

- Manufacturing & Industry
- Financial Services & Insurance
- Healthcare & Pharmaceuticals
- Technology & Digital
- Retail & Consumer Goods
- Energy & Utilities
- Logistics & Transportation
- Professional Services
- Education & Training
- Public Administration
- Media & Entertainment
- Food & Agriculture
- Construction & Real Estate
- Non-Profit & Third Sector
- Other (with mandatory free-text specification)

### 2.3 Company Size Controlled Vocabulary

| Tier | Label | Headcount Range |
|---|---|---|
| XS | Micro | < 10 employees |
| S | Small | 10–49 employees |
| M | Medium | 50–249 employees |
| L | Large | 250–999 employees |
| XL | Enterprise | 1,000–9,999 employees |
| XXL | Corporate | 10,000+ employees |

### 2.4 Contact Type Controlled Vocabulary

- CEO / Founder / MD — Top executive, final strategic decision authority
- CHRO / HR Director — Human Resources leadership
- CFO / Finance Director — Financial decision authority
- Chief People Officer — People strategy lead (distinct from CHRO in some organizations)
- ESG / Sustainability Director — Environmental, Social, Governance lead
- Chief Innovation Officer / Innovation Lead — Innovation or transformation mandate
- Legal & Compliance — Legal or compliance function
- IT / CTO — Technology decision authority
- Board Member — Governance layer contact
- Advisor / Consultant — External advisor with influence on the target organization
- Investor — Investment party with stake or interest in KORA or target organization
- Partner / Accelerator — Ecosystem partner, accelerator, or incubator contact
- Other (with mandatory free-text specification)

### 2.5 Interest Domain Controlled Vocabulary

- KORA Index & Impact Measurement — Interest in the core scoring and intelligence methodology
- ESG Reporting & Compliance — Interest in KORA as an ESG evidence layer
- Fiscal Optimization & Welfare Budget — Interest in fiscal efficiency and welfare budget governance
- HR Analytics & Workforce Intelligence — Interest in people analytics and reporting
- Employee Wellbeing Strategy — Interest in LIFE pillar outcomes
- Skill Development Tracking — Interest in GROWTH pillar outcomes
- Social Impact & Community — Interest in IMPACT pillar outcomes
- Talent Retention & Engagement — Interest in retention-linked metrics
- Board & Investor Reporting — Interest in governance-layer outputs
- Regulatory Compliance — Interest in audit trail and methodology versioning
- Competitive Benchmarking — Interest in cross-company intelligence (ecosystem tier)
- Data Privacy & Architecture — Interest in KORA's privacy model
- Platform Integration — Interest in connecting existing HR/welfare/ESG tools to KORA

### 2.6 Perceived Value Score [0–100]

The Perceived Value Score is a structured founder assessment — not an algorithmic output — of how much genuine value the stakeholder appears to assign to KORA's proposition.

| Range | Label | Interpretation |
|---|---|---|
| 0–10 | No Signal | No discernible interest or value perception expressed |
| 11–25 | Weak | Polite attention, no real engagement with value proposition |
| 26–45 | Low | Some interest but significant skepticism or misalignment |
| 46–65 | Moderate | Genuine interest, partial value alignment, objections present |
| 66–80 | High | Clear value resonance, few objections, exploring fit |
| 81–90 | Strong | Active interest, value well understood, discussing next steps |
| 91–100 | Exceptional | Deep conviction, pushing internally for pilot or decision |

Scoring must be accompanied by a rationale note and dated. Score changes over time are preserved as a history.

### 2.7 Trust Score [0–100]

The Trust Score captures the quality of the relationship and the credibility of signals received from this stakeholder.

| Range | Label | Interpretation |
|---|---|---|
| 0–20 | Cold | No relationship established, signals unreliable |
| 21–40 | Acquaintance | Initial contact made, credibility of signals uncertain |
| 41–60 | Engaged | Dialogue established, signals moderately reliable |
| 61–80 | Trusted | Relationship developed, signals reliable |
| 81–100 | Strategic | Deep trust, stakeholder is a genuine validation partner |

Trust Score is distinct from Perceived Value Score. A high-trust contact may express low perceived value — that is a reliable negative signal. A low-trust contact may express high perceived value — that signal carries lower weight.

### 2.8 Objection Tag Controlled Vocabulary

- Budget — No or insufficient budget currently available
- Timing — Not the right moment (procurement cycle, reorg, other priorities)
- Internal Complexity — Internal stakeholder alignment required
- Data Readiness — Company does not have structured data to feed KORA
- Technology Integration — Concerns about system integration complexity
- Methodology Unfamiliarity — Unfamiliar with impact measurement as a category
- Privacy Concern — Concern about employee data privacy
- ROI Uncertainty — Unclear on return on investment
- Competitor Preference — Already using or evaluating a competing product
- Regulation Risk — Uncertainty about regulatory or legal implications
- Leadership Resistance — HR/ESG/Finance leadership not aligned
- No Mandate — No organizational mandate for this type of initiative
- Other (with mandatory free-text specification)

### 2.9 Interaction Record Structure

Each interaction logged within a Stakeholder Record captures:

| Field | Type | Description |
|---|---|---|
| `interaction_id` | UUID | Unique interaction identifier |
| `interaction_date` | Date | Date of the interaction |
| `interaction_type` | Controlled vocabulary | Meeting / Call / Email / Demo / Workshop / Event / Referral / Other |
| `participants` | Array of strings | Roles present (not personal names as primary identifier) |
| `duration_minutes` | Integer (optional) | Duration of meeting or call |
| `stage_at_interaction` | Controlled vocabulary | Engagement stage at time of interaction |
| `topics_discussed` | Array of Interest Domains | Domains touched in the interaction |
| `objections_raised` | Array of Objection Tags | New objections surfaced |
| `signal_quality` | Controlled vocabulary | High / Medium / Low — confidence in signals from this interaction |
| `interaction_notes` | Text | Free-text notes on interaction content |
| `outcome` | Controlled vocabulary | Stage advanced / Stage unchanged / Stage declined / Lead generated / Demo requested / Pilot discussed / Lost |
| `next_action` | Text | Immediate next action triggered by this interaction |
| `logged_by` | String | Team member who logged the interaction |
| `logged_date` | Date | Date the interaction was logged |
| `founder_conviction_delta` | Integer [–5 to +5] | Change in founder conviction about KORA's market opportunity produced by this specific interaction (see 2.9.1) |
| `founder_conviction_delta_rationale` | Text | Mandatory free-text explanation of why this interaction raised, held, or lowered conviction |

### 2.9.1 Founder Conviction Delta [–5 to +5]

`founder_conviction_delta` is a per-interaction field that captures how a specific conversation changes the founder's conviction in KORA's overall market opportunity.

This is **not an investor-facing metric by default**. It is an internal founder learning signal — a structured way to prevent conviction drift from going unexamined and to identify which stakeholder profiles, sectors, or interaction types most reliably shift the founder's assessment of KORA's market fit.

| Value | Label | Interpretation |
|---|---|---|
| –5 | Strongly negative | This interaction materially reduces conviction — the problem may be smaller, wrong-sector, or the value proposition misaligned |
| –4 | Significantly negative | Serious concern surfaced; meaningful recalibration warranted |
| –3 | Moderately negative | Friction or misalignment encountered; warrants reflection |
| –2 | Mildly negative | Minor doubt raised; worth monitoring |
| –1 | Slightly negative | Marginal negative signal; context may explain it |
| 0 | Neutral | Interaction did not change conviction in either direction |
| +1 | Slightly positive | Mild confirmation of KORA's direction |
| +2 | Mildly positive | Moderate validation signal |
| +3 | Moderately positive | Clear resonance — stakeholder confirmed a meaningful KORA insight |
| +4 | Significantly positive | Strong validation — rare and analytically significant |
| +5 | Strongly positive | This interaction materially increases conviction; breakthrough signal |

**Required fields when logging:**
- `founder_conviction_delta` value (integer, mandatory)
- `founder_conviction_delta_rationale` (free-text, mandatory — must explain the specific reason for the delta)
- The interaction record it is attached to (enforced by structure)

**How deltas aggregate:** The `founder_conviction_delta_cumulative` on the Stakeholder Record is the running sum of all interaction deltas for that company. A cumulative of +8 across 5 interactions is a strong positive market signal. A cumulative of –6 is a structured signal to reassess or deprioritize.

**Governance:** Founder Conviction Delta values must not be shared in investor-facing exports without explicit founder authorization. They are strategic learning data, not traction proof.

---

### 2.10 ICP Fit Score [0–100]

The Ideal Customer Profile (ICP) Fit Score is a structured founder assessment of how well a target organization matches KORA's ideal early adopter profile — based on structural and contextual signals, independent of how the engagement is progressing.

ICP Fit Score answers: **Is this the right kind of company for KORA at this stage?** It is distinct from Perceived Value Score (which measures how much the stakeholder values KORA) and from engagement stage (which measures how far the conversation has progressed). A company can be low-stage and high-ICP-fit, or high-stage and low-ICP-fit.

**Primary use:** Prioritization. ICP Fit Score determines where to invest time when the pipeline is larger than available bandwidth. High-ICP-fit companies in early stages deserve more attention than low-ICP-fit companies in later stages.

**Component signals (founder-assessed):**

| Component | Description | Weight (suggested) |
|---|---|---|
| Company size fit | Does the headcount tier match KORA's Foundation Light target range? | 15% |
| Existing welfare / HR / ESG budget | Does the company already allocate meaningful budget to people programs? | 15% |
| Data availability | Does the company already have structured data that KORA can ingest? | 15% |
| ESG / regulatory pressure | Is the company under ESG reporting obligations, board pressure, or regulatory incentives? | 10% |
| HR / people maturity | Does the company have a sophisticated HR or people function that understands measurement? | 10% |
| Innovation openness | Is the company culturally oriented toward new approaches and methodologies? | 10% |
| Multi-site or multi-country complexity | Does the company have the organizational complexity that makes KORA's intelligence layer more valuable? | 10% |
| Decision-maker accessibility | How easily can the budget owner and final decision-maker be reached? | 10% |
| Urgency of problem | Is there a current or near-term trigger (ESG deadline, board request, regulatory change, leadership mandate) that makes KORA relevant now? | 5% |

**Note:** Component weights are suggested defaults. The founder may adjust weights based on empirical learning. Any weight adjustment constitutes a version increment for this score definition.

**Score interpretation:**

| Range | Label | Implication |
|---|---|---|
| 0–20 | Poor fit | Do not prioritize; engage only if inbound |
| 21–40 | Weak fit | Monitor; do not invest significant time |
| 41–60 | Moderate fit | Worth engaging; not a top priority |
| 61–80 | Good fit | Prioritize; invest in relationship building |
| 81–100 | Ideal fit | Highest priority; this company type is KORA's primary market |

ICP Fit Score requires a rationale note and is dated. Changes over time are preserved as a history. A declining ICP Fit Score (e.g., as more is learned about the company's actual data readiness or internal politics) is analytically significant.

---

### 2.11 Internal Champion Strength [0–100]

The Internal Champion Strength score captures whether there is a genuine internal advocate inside the target organization who is actively or potentially driving KORA adoption from within.

An internal champion is not just a contact who attended a meeting. An internal champion is someone inside the organization who:
- Understands KORA's value proposition
- Believes it solves a real problem they own or care about
- Has organizational credibility and access
- Is willing to introduce KORA to others internally
- Can reach or influence the budget owner or final decision-maker

**Scale interpretation:**

| Range | Label | Interpretation |
|---|---|---|
| 0–20 | No champion | No identifiable internal advocate; engagement is externally driven only |
| 21–40 | Weak sponsor | Someone has shown interest but has limited influence or motivation to push internally |
| 41–60 | Interested contact | A real contact who likes KORA but has not yet demonstrated internal advocacy behavior |
| 61–80 | Active champion | Demonstrably pushing internally — making introductions, raising KORA in internal meetings, requesting next steps |
| 81–100 | Strong mobilizer | A highly credible, well-connected internal advocate who is actively sponsoring KORA's adoption within their organization |

**Sub-signals tracked:**

| Sub-signal | Field | Type |
|---|---|---|
| Champion role | `internal_champion_role` | Controlled vocabulary (Contact Type, see 2.4) |
| Champion influence level | Captured in rationale | Qualitative (Low / Medium / High) |
| Willingness to introduce other stakeholders | Captured in interaction log | Boolean signal — has introduction occurred? |
| Ability to access the budget owner | Captured in rationale | Qualitative |
| Credibility inside their organization | Captured in rationale | Qualitative |

**Why this matters:** The presence of a strong internal champion is one of the most reliable predictors of pilot conversion and of contract success in B2B enterprise contexts. A high-stage deal with no internal champion is fragile. A lower-stage deal with a strong internal mobilizer is more likely to convert.

**Governance:** Internal Champion Strength is a founder/team assessment. It must not be presented to the stakeholder organization or surfaced in any client-facing context.

---

### 2.12 Strategic Relationship Value [0–100]

The Strategic Relationship Value (SRV) score captures the value a stakeholder relationship carries beyond its direct revenue potential. A small company may score low on enterprise contract potential but high on Strategic Relationship Value because of its sector credibility, network access, or case study value.

SRV prevents KORA from optimizing exclusively for deal size and missing relationships that are disproportionately valuable for market entry, investor signaling, or ecosystem building.

**Component signals (founder-assessed):**

| Component | Description | Weight (suggested) |
|---|---|---|
| Brand credibility | Would association with this company signal quality and legitimacy to the broader market? | 15% |
| Sector entry value | Does this company give KORA a credible foothold in a priority sector? | 15% |
| Investor signaling value | Would this company as a pilot or reference customer strengthen KORA's investor narrative? | 15% |
| Advisor / network access | Does the relationship provide access to a broader network of potential customers, partners, or investors? | 10% |
| Case study potential | Does this company represent an ideal, documentable KORA use case? | 15% |
| Ecosystem leverage | Could this relationship lead to partnerships, integrations, or ecosystem collaborations? | 10% |
| Reference customer potential | Is this company willing and positioned to serve as a public reference or testimonial? | 10% |
| Partnership potential | Is there a potential for a formal partnership, co-development, or distribution agreement? | 10% |

**Score interpretation:**

| Range | Label | Implication |
|---|---|---|
| 0–20 | Low strategic value | Transactional relationship; worth pursuing only if commercial potential is strong |
| 21–40 | Below average | Some strategic upside but not a strategic priority |
| 41–60 | Moderate | Meaningful strategic value; worth investing beyond pure commercial logic |
| 61–80 | High | Strong strategic asset; invest even if commercial timeline is uncertain |
| 81–100 | Exceptional | This relationship is independently valuable regardless of revenue outcome; protect and nurture it |

**Governance:** SRV is an internal founder scoring signal. It must not be communicated to the stakeholder organization. SRV values must not appear in investor-facing exports without explicit founder authorization.

---

## 3. Engagement Pipeline Stages

The pipeline defines the progression of a stakeholder from first awareness to active validation. Stages are not a sales funnel — they are **validation signal thresholds**. Each stage advance is evidence that KORA's value proposition is resonating.

### Stage 0 — Not Contacted

**Definition:** The company has been identified as a target stakeholder but no outreach has occurred.

**Entry condition:** Record created by founder or team member as a target.

**Exit condition:** Any outreach attempt has been made.

**Measurable signals:** Record exists; no interaction logged.

---

### Stage 1 — Contacted

**Definition:** At least one outreach has been made (email, LinkedIn, referral, event approach). No response received.

**Entry condition:** First outreach logged.

**Transition rules:** Advances to Responded on any reply. If no reply after defined follow-up cycle, may be marked stale (not deleted — stale is a signal).

**Measurable signals:** Interaction log contains at least one outbound contact; no inbound response logged.

---

### Stage 2 — Responded

**Definition:** The stakeholder has acknowledged outreach. Response may be positive, neutral, or negative. A "not now" reply is still a Responded signal.

**Entry condition:** Any inbound communication received.

**Transition rules:** Advances to Engaged if a substantive conversation is scheduled or initiated. Remains at Responded if reply is non-committal.

**Measurable signals:** Inbound communication logged; nature of response categorized.

---

### Stage 3 — Engaged

**Definition:** A substantive conversation has occurred — a meeting, call, or demo where KORA was meaningfully explained and the stakeholder asked questions or shared context.

**Entry condition:** At least one meeting or call of ≥20 minutes logged, or a demo delivered.

**Transition rules:** Advances to Interested if stakeholder expresses genuine curiosity about KORA fit for their organization. Regresses if contact goes cold after engagement.

**Measurable signals:** Meeting/call logged; topics discussed span at least two Interest Domains; interaction outcome is not "lost."

---

### Stage 4 — Interested

**Definition:** The stakeholder has expressed interest in understanding how KORA could apply to their organization. This is not a commitment — it is expressed alignment between KORA's value proposition and the stakeholder's perceived needs.

**Entry condition:** Stakeholder explicitly references their own context in relation to KORA (e.g., "we have this problem too," "we've been looking for something like this," "our board has been asking us about impact measurement").

**Transition rules:** Advances to Pilot Consideration if the stakeholder begins exploring operational feasibility. Regresses to Engaged if interest signals fade.

**Measurable signals:** Perceived Value Score ≥ 46; at least one interest domain confirmed; stakeholder has introduced a second internal contact or requested additional material.

---

### Stage 5 — Pilot Consideration

**Definition:** The stakeholder is actively evaluating whether a pilot with KORA is feasible. They are asking operational questions: what data do we need, how long would it take, who would be involved.

**Entry condition:** Stakeholder explicitly discusses pilot logistics or feasibility.

**Transition rules:** Advances to Budget Discussion if internal feasibility is confirmed and budget conversations begin. Regresses to Interested if internal exploration stalls.

**Measurable signals:** Pilot-related questions logged in interaction notes; internal team references appear; data readiness question raised; Perceived Value Score ≥ 66.

---

### Stage 6 — Budget Discussion

**Definition:** Budget and commercial terms are being discussed, even informally. The stakeholder is exploring what a KORA engagement would cost.

**Entry condition:** Any reference to budget, pricing, or cost has been made by the stakeholder.

**Transition rules:** Advances to Commitment Signal if a budget indication or internal approval signal is received.

**Measurable signals:** Budget Range Indication field populated; Willingness-to-Pay Score > 0; Trust Score ≥ 61.

---

### Stage 7 — Commitment Signal

**Definition:** The stakeholder has provided a non-binding but meaningful signal of intent to proceed. This may be a verbal agreement to pilot, an internal champion pushing for approval, or a formal request for a proposal.

**Entry condition:** Explicit non-binding commitment signal received.

**Transition rules:** Advances to Active Validator when formal pilot agreement is reached.

**Measurable signals:** Investment Intent Level = Soft, Active, or Strong; explicit next step with timeline agreed; decision-maker has been involved.

---

### Stage 8 — Active Validator

**Definition:** The company is engaged in a formal Foundation Light pilot or data validation exercise. This is the highest-value stage. An Active Validator is producing the real-world validation evidence KORA needs for PMF and investor readiness.

**Entry condition:** Formal pilot or validation agreement confirmed; KORA Foundation Light process initiated with this company.

**Transition rules:** This is the terminal positive stage for the MVP validation phase. Post-pilot conversion tracking belongs to a future commercial module.

**Measurable signals:** Pilot agreement documented; KORA workflow initiated; data ingestion or validation session scheduled.

---

### Stage 9 — Lost / Not Interested

**Definition:** The stakeholder has explicitly declined or has gone definitively cold after sustained outreach. This stage is analytically valuable — lost signals are as important as interest signals for market intelligence.

**Entry condition:** Explicit rejection received, or stakeholder has not responded to three or more follow-up contacts over 60+ days.

**Transition rules:** Terminal stage in standard flow. May be re-opened if market context changes (new initiative, leadership change, time elapsed).

**Measurable signals:** Rejection logged; Primary Blocker field populated; Objection Tags complete. Lost records are never deleted — they feed the Objection Frequency Map and market segmentation analysis.

---

## 4. Validation Metrics — Core KPIs

These KPIs transform the raw Stakeholder Record data into structured analytical intelligence. All KPIs are designed to be investable signals — meaning they can be presented to investors as evidence of market traction and PMF progress.

---

### 4.1 Stakeholder Conversion Rate per Stage

**Definition:** Percentage of stakeholders who progress from stage N to stage N+1.

**Formula:** `Conversion Rate (N→N+1) = (Records in Stage N+1 or beyond) / (Records that entered Stage N) × 100`

**Purpose:** Identifies where in the pipeline KORA's value proposition is breaking down or resonating. A high Contacted→Responded rate signals strong brand or network. A high Interested→Pilot Consideration rate signals strong value proposition clarity.

**Investor signal:** Demonstrates measurable market traction and validates commercialization pathway.

---

### 4.2 Engagement Velocity

**Definition:** Average number of days for a stakeholder to progress from Stage 1 (Contacted) to Stage 4 (Interested).

**Formula:** `EV = Mean(days_from_contacted_to_interested) across all records that have reached Stage 4`

**Benchmark purpose:** Tracks whether the commercial narrative is becoming more efficient over time. Decreasing EV indicates improving pitch clarity and targeting precision.

**Investor signal:** Shows the team is learning and iterating on go-to-market approach.

---

### 4.3 Interest Density per Sector

**Definition:** Proportion of stakeholders in each sector that have reached Stage 4 (Interested) or beyond, relative to total stakeholders contacted in that sector.

**Formula:** `ID(sector) = (Records in sector S at Stage ≥ 4) / (Total records in sector S) × 100`

**Purpose:** Reveals which sectors are most receptive to KORA's value proposition. Enables targeted sector prioritization.

**Investor signal:** Documents which verticals show strongest PMF signal — critical for investor narrative on total addressable market focus.

---

### 4.4 Perceived Value Score Distribution

**Definition:** Statistical distribution of Perceived Value Scores across all stakeholder records.

**Components:**
- Mean PVS across all records
- Mean PVS for records at Stage ≥ 4
- Standard deviation (spread of perception)
- Distribution by sector
- Distribution by company size
- Distribution by contact type

**Purpose:** Shows whether KORA's value is broadly understood or concentrated in specific segments. Narrow high-PVS clusters identify target personas.

**Investor signal:** Demonstrates founder clarity on who the platform resonates with most strongly.

---

### 4.5 Objection Clustering Analysis

**Definition:** Frequency distribution of Objection Tags across all records, segmented by stage at which the objection was raised.

**Components:**
- Top 5 objections by frequency
- Objections by sector
- Objections by company size
- Objections at early stages vs. late stages
- Objection resolution rate (% of flagged objections subsequently addressed)

**Purpose:** Surfaces the most common barriers to adoption. Informs product positioning, messaging refinement, and FAQ development.

**Investor signal:** Shows the team understands market friction and has a structured plan to address it.

---

### 4.6 Pilot Conversion Probability

**Definition:** Estimated probability that a stakeholder currently in a given stage will advance to Active Validator status.

**Model:** Based on observed historical conversion rates per stage. Initially set as a structured estimate by the founder; updated as data accumulates.

**Formula:** `PCP(stage N) = ∏ Conversion Rate(N→N+1) × Conversion Rate(N+1→N+2) × ... × Conversion Rate(7→8)`

**Purpose:** Enables portfolio-level forecasting of how many Active Validators the current pipeline is likely to produce.

**Investor signal:** Translates pipeline activity into expected validation outcomes — a credible traction projection.

---

### 4.7 Average Time-to-Interest

**Definition:** Mean number of calendar days from Stage 1 (Contacted) to Stage 4 (Interested) for all records that have reached Stage 4.

**Tracking purpose:** Monitors whether commercial narrative efficiency is improving over time. Plotted over cohorts to show learning curve.

---

### 4.8 Average Time-to-Pilot

**Definition:** Mean number of calendar days from Stage 1 (Contacted) to Stage 8 (Active Validator) for all records that have reached Stage 8.

**Tracking purpose:** Defines the full commercial cycle length for Foundation Light. Critical for investor conversations about sales cycle.

---

### 4.9 Trust Index Evolution

**Definition:** Average Trust Score across all active records (Stage 1–7), tracked over time.

**Computed:** Weekly or monthly average of all Trust Scores across the active pipeline.

**Purpose:** Tracks whether the team is building durable market relationships or transactional engagements. A rising Trust Index alongside increasing pipeline size is a strong signal of healthy market presence.

---

### 4.10 Market Readiness Index (Experimental)

**Definition:** A composite signal — not a mathematical score with methodology-level precision — that synthesizes pipeline progression, PVS distribution, objection resolution rate, and stakeholder diversity to produce a qualitative market readiness assessment.

**Components:**
- Pipeline stage distribution (weighted toward later stages)
- Mean Perceived Value Score across active pipeline
- Objection resolution rate
- Sector diversity of Stage ≥ 4 records
- Active Validator count

**Status:** Experimental. This index is a founder decision-support tool, not an investable metric in isolation. It must always be presented alongside its component data.

**Label taxonomy:**

| Score Range | Label |
|---|---|
| 0–20 | Early Exploration |
| 21–40 | Signal Emerging |
| 41–60 | Market Forming |
| 61–80 | Validation Confirmed |
| 81–100 | PMF Evidence |

---

### 4.11 Investor Interest Ratio

**Definition:** Proportion of engaged stakeholders (Stage ≥ 3) who are investor-type contacts (VCs, angels, family offices, corporate venture, accelerators with investment mandate), relative to total engaged stakeholders.

**Formula:** `IIR = (Investor-type records at Stage ≥ 3) / (All records at Stage ≥ 3) × 100`

**Purpose:** Tracks parallel investor engagement alongside commercial validation. Investor Interest Ratio is tracked separately from commercial conversion — mixing the two distorts both signals.

**Investor signal:** Documents a live investor engagement pipeline, distinct from the commercial pipeline.

---

### 4.12 Founder Conviction Delta Trend

**Definition:** Directional trend of the founder's conviction in KORA's market opportunity over time, derived from the `founder_conviction_delta` field logged on each interaction.

**Components:**
- Cumulative conviction delta across all interactions (overall trajectory)
- Rolling 30-day average delta (recent trend)
- Delta distribution by sector (which sectors are producing positive conviction shifts)
- Delta distribution by company size (do larger companies confirm or challenge the thesis?)
- Delta distribution by contact type (which roles produce the strongest validation signals)
- Negative delta clustering (which interaction types or sectors are most associated with conviction drops)

**Purpose:** This is the most honest signal in the module. While other KPIs track what the market does, Founder Conviction Delta Trend tracks what the market is teaching the founder. A rising trend alongside strong pipeline metrics is the clearest evidence of learning-driven validation. A declining trend despite a busy pipeline is an early warning that the thesis needs examination.

**Visibility:** Internal only. Not investor-facing by default. The founder controls whether and how this signal is shared externally.

---

### 4.13 ICP Fit Distribution

**Definition:** Statistical distribution of ICP Fit Scores across all Stakeholder Records, segmented by sector, company size, and engagement stage.

**Components:**
- Histogram of ICP Fit Scores across the full pipeline
- Mean ICP Fit Score by sector
- Mean ICP Fit Score by company size tier
- Correlation between ICP Fit Score and engagement stage progression (do high-ICP companies advance faster?)
- Correlation between ICP Fit Score and Perceived Value Score (do high-ICP companies also perceive higher value?)
- Proportion of pipeline at ICP Fit ≥ 61 (Good + Ideal fit) vs. below

**Purpose:** Reveals whether KORA is investing validation time in the right company profiles. A pipeline weighted toward low-ICP-fit companies is generating engagement noise rather than meaningful market signal.

**Investor signal:** Demonstrates that the team has a structured, data-grounded view of target customer characteristics — not just an intuitive one.

---

### 4.14 Internal Champion Strength Average

**Definition:** Average Internal Champion Strength score across all active records (Stage 1–7), tracked over time.

**Components:**
- Mean Internal Champion Strength across the active pipeline
- Distribution by stage (do later-stage companies have stronger champions, as expected?)
- Proportion of active pipeline with Internal Champion Strength ≥ 61 (Active champion or above)
- Correlation between Internal Champion Strength and stage progression speed
- Records with Internal Champion Strength = 0–20 at Stage ≥ 5 (flagged as high-risk deals)

**Purpose:** A pipeline in which most advanced-stage companies lack an internal champion is a structurally fragile pipeline. This KPI surfaces that risk early and quantifies it.

**Investor signal:** Shows that KORA's commercial progress is anchored in real internal advocacy, not just polite external conversations.

---

### 4.15 Strategic Relationship Value Map

**Definition:** Aggregated view of Strategic Relationship Value scores across the full pipeline, mapped against direct revenue potential and engagement stage.

**Components:**
- Mean Strategic Relationship Value across all records
- Distribution by sector
- High-SRV records with low commercial potential (pure strategic assets — must be managed deliberately)
- High-SRV records with high commercial potential (highest-priority relationships overall)
- SRV component breakdown across the pipeline (which SRV dimensions are strongest: brand, case study, investor signaling, etc.)

**Purpose:** Prevents KORA from treating all stakeholder relationships as revenue opportunities and missing strategic assets that require a different investment logic. A company that will never be a paying customer but will provide three investor introductions and a landmark case study is worth tracking and nurturing.

**Investor signal:** Demonstrates sophisticated portfolio thinking about market relationships — not just a commercial funnel.

---

## 5. Investment & Budget Intent Tracking

This section defines how non-binding budget and investment signals are captured and interpreted. These fields exist to translate qualitative commercial conversations into structured intelligence.

**Foundational rule:** No field in this section represents a binding commitment. These are signal trackers, not financial instruments, contracts, or term sheets. They must always be labeled as indicative, non-binding signals in any investor or board presentation.

---

### 5.1 Budget Range Indication

**Definition:** The stakeholder's implicit or explicit signal about the budget envelope they could theoretically associate with a KORA engagement.

**Values (controlled vocabulary):**

| Code | Label | Range |
|---|---|---|
| NO_SIGNAL | No signal | No budget discussion |
| MICRO | Micro | < €5,000 |
| SMALL | Small | €5,000 – €20,000 |
| MEDIUM | Medium | €20,000 – €50,000 |
| SIGNIFICANT | Significant | €50,000 – €150,000 |
| LARGE | Large | €150,000 – €500,000 |
| ENTERPRISE | Enterprise | > €500,000 |

Budget Range Indication is populated only when the stakeholder has made a reference — direct or indirect — to a budget envelope. Founder interpretation must be noted in the field rationale.

---

### 5.2 Willingness-to-Pay Score [0–100]

**Definition:** Founder-assessed structured signal of how likely this stakeholder is to allocate budget to KORA, given current engagement signals.

| Range | Label | Interpretation |
|---|---|---|
| 0–10 | None | No indication of willingness to pay |
| 11–25 | Weak | Expressed interest but no budget context |
| 26–45 | Low | Budget exists but KORA is not a priority |
| 46–65 | Moderate | Budget plausible; KORA is on their agenda |
| 66–80 | High | Budget likely; stakeholder is actively exploring |
| 81–90 | Strong | Budget confirmed at some level; moving toward commitment |
| 91–100 | Exceptional | Budget committed; formal process underway |

Willingness-to-Pay Score is distinct from Perceived Value Score. A stakeholder may perceive high value but have low willingness to pay (budget constraint, procurement cycle, internal politics). Both signals must be tracked independently.

---

### 5.3 Pilot Budget Potential

**Definition:** Indicative budget range the stakeholder could realistically allocate to a Foundation Light pilot engagement.

**Values:** Same controlled vocabulary as Budget Range Indication (5.1), applied specifically to pilot scope.

---

### 5.4 Enterprise Contract Potential

**Definition:** Indicative range of a hypothetical full annual contract if the stakeholder were to adopt KORA at enterprise scale.

**Values:** Same controlled vocabulary as Budget Range Indication (5.1), applied to enterprise scope.

**Note:** Enterprise Contract Potential is a long-horizon signal. It is recorded to support investor narrative on revenue potential but must not be treated as a near-term pipeline number.

---

### 5.5 Investment Intent Level

**Definition:** For investor-type stakeholders specifically, a qualitative classification of their stated or demonstrated level of investment interest in KORA as a company.

| Value | Label | Description |
|---|---|---|
| `NONE` | None | No investment interest expressed |
| `EXPLORATORY` | Exploratory | Learning about KORA; no investment discussion |
| `SOFT` | Soft | Expressed openness to learning more about investment |
| `ACTIVE` | Active | Actively evaluating KORA as an investment |
| `STRONG` | Strong | Strong interest; internal discussion underway |

**Applicability:** This field is relevant only for stakeholder records classified as investor-type. It must not be applied to commercial stakeholders.

---

### 5.6 Confidence Level of Intent

**Definition:** The founder's assessment of how reliable the signals captured in this section are, given the quality of the relationship and the context of the conversations.

| Value | Label | Description |
|---|---|---|
| `LOW` | Low | Signals are preliminary; context insufficient |
| `MEDIUM` | Medium | Signals are plausible but unconfirmed |
| `HIGH` | High | Signals are well-grounded and consistent across interactions |
| `VERIFIED` | Verified | Signals have been confirmed explicitly by the stakeholder in clear terms |

Confidence Level of Intent must accompany every budget or investment intent field when presented in investor or board contexts.

---

## 6. Insight Engine Layer

The Insight Engine Layer aggregates individual Stakeholder Records into structured market intelligence. This is where the module transitions from data capture to strategic analysis.

### 6.1 Sector-Level Insights

For each sector with ≥3 records, the system produces:

- Stakeholder count by stage
- Mean Perceived Value Score
- Top 3 Interest Domains
- Top 3 Objection Tags
- Conversion Rate (Contacted → Interested)
- Mean days to Interested
- Budget Range Indication distribution
- Active Validator count

**Purpose:** Identifies which sectors are highest-priority for commercial expansion and where positioning needs refinement.

---

### 6.2 Geography-Level Insights

For each geographic market with ≥3 records:

- Stakeholder count by stage
- Sector composition
- Mean Perceived Value Score
- Top objections
- Engagement velocity
- Active Validator count

**Purpose:** Identifies which geographic markets are most receptive and where concentrated effort should be directed.

---

### 6.3 Company Size Segmentation

For each company size tier:

- Conversion rates per stage
- Mean Perceived Value Score
- Budget Range distribution
- Primary Interest Domains
- Objection profile

**Purpose:** Reveals whether KORA's early traction is concentrated in specific size bands — critical for ideal customer profile definition.

---

### 6.4 Objection Pattern Clustering

Aggregation across all records:

- Objection frequency ranking
- Objection co-occurrence matrix (which objections appear together)
- Objection by stage (early-stage objections vs. late-stage objections)
- Objection by sector
- Objection resolution rate over time

**Output:** Objection Frequency Map — a visual representation of the most common barriers, their sector distribution, and resolution status.

**Strategic use:** Informs product narrative, FAQ, and objection-handling playbooks. Objections that are both frequent and early-stage are the highest priority to address.

---

### 6.5 Feature Demand Mapping

Aggregation of Interest Domains across records at Stage ≥ 4:

- Frequency of each Interest Domain
- Interest Domain by sector
- Interest Domain by company size
- Interest Domain evolution over time (are interests shifting as the market learns about KORA?)

**Output:** Feature Demand Matrix — a ranked, segmented map of what the market most wants from KORA.

**Strategic use:** Informs Foundation Light prioritization decisions and future roadmap sequencing.

---

### 6.6 Value Perception Mapping

Aggregation of Perceived Value Scores:

- Distribution histogram
- Mean PVS by sector, size, geography, and contact type
- PVS vs. Willingness-to-Pay correlation analysis
- PVS evolution over time (is the market understanding KORA better or worse as outreach scales?)

**Output:** Value Perception Map — a segmented view of where KORA's value proposition resonates most strongly.

**Strategic use:** Identifies the highest-conviction market segments for prioritized commercial focus.

---

### 6.7 ICP Fit Segmentation

Aggregation of ICP Fit Scores across the full pipeline:

- Mean ICP Fit Score by sector and company size
- Pipeline stage distribution filtered to ICP Fit ≥ 61 (high-fit pipeline)
- ICP Fit Score vs. conversion rate correlation analysis
- ICP Fit Score vs. engagement velocity correlation analysis
- Proportion of outreach time allocated to high-ICP vs. low-ICP companies (time-efficiency signal)

**Output:** ICP Prioritization View — a ranked list of all active records by ICP Fit Score with pipeline stage overlay. Shows the team where to focus next.

**Strategic use:** Course-corrects pipeline composition if the team is spending time on structurally unsuitable companies. Informs ideal customer profile refinement as empirical data accumulates.

---

### 6.8 Strategic Relationship Portfolio Aggregation

Aggregation of Strategic Relationship Value scores:

- Mean SRV across all records
- High-SRV / Low-commercial-potential records (strategic assets requiring dedicated nurturing logic)
- High-SRV / High-commercial-potential records (top-priority relationships)
- SRV component breakdown (which dimensions — brand, case study, investor signaling, partnership — are strongest across the portfolio)
- SRV evolution over time (is the portfolio becoming more or less strategically valuable?)

**Output:** Strategic Relationship Portfolio — a matrix view of records plotted by SRV vs. commercial potential, enabling differentiated relationship investment decisions.

**Strategic use:** Ensures that high-SRV, low-revenue relationships are not deprioritized by a purely commercial pipeline logic. Informs investor narrative on ecosystem building and market positioning.

---

### 6.9 Output Dashboards

| Dashboard | Description |
|---|---|
| **Market Fit Heatmap** | Two-dimensional map of sector × company size, color-coded by Interest Density. Shows where PMF signal is strongest. |
| **Investor Readiness Dashboard** | Summary of Active Validators, pipeline stage distribution, KPI trends, and investment signal indicators for investor conversations. |
| **Feature Demand Matrix** | Ranked table of Interest Domains by frequency and segment — shows what the market wants most. |
| **Objection Frequency Map** | Ranked and clustered visualization of objection patterns, by stage and sector. |
| **Pipeline Conversion Funnel** | Standard funnel visualization of stakeholder counts per stage with conversion rates labeled. |
| **Validation Confidence Index** | Composite indicator of the overall evidential strength of the validation dataset (data completeness, stage depth, sector diversity, Trust Score averages). |
| **ICP Prioritization View** | Ranked list of all active records by ICP Fit Score with stage and engagement velocity overlay. Supports time allocation decisions. |
| **Champion Map** | Pipeline view filtered and sorted by Internal Champion Strength. Highlights champion-backed deals and flags advanced-stage records with no champion. |
| **Strategic Relationship Portfolio** | Matrix of all records plotted by Strategic Relationship Value vs. commercial potential. Enables differentiated investment logic for different relationship types. |
| **Founder Learning Log** | Chronological log of all `founder_conviction_delta` values with rationale notes. Internal only. Tracks how the market is reshaping the founder's understanding of KORA's opportunity. |

---

## 7. Dashboard Structure — UI Conceptual Layer

This section defines the conceptual UI experience for the founder using this module. No UI components are designed here — this is a functional specification of what the founder needs to see and when.

### 7.1 Pipeline Overview

**What it shows:** Total stakeholder count broken down by engagement stage. Simple counts and trend arrows (up/down/stable vs. prior week).

**Founder use:** Quick daily health check of the validation pipeline. Are we adding records? Are records moving forward?

**Key elements:**
- Count per stage (horizontal bar or funnel)
- New records this week
- Stage advances this week
- Records stale (no contact in >14 days, customizable)

---

### 7.2 Conversion Funnel

**What it shows:** Classic funnel visualization from Stage 1 to Stage 8, with conversion rates between each stage labeled.

**Founder use:** Weekly strategic review. Where is the funnel narrowing? Which conversion rates need attention?

**Key elements:**
- Stakeholder count per stage
- Stage-to-stage conversion percentage
- Benchmark against prior period
- Dropout analysis (where are we losing the most records to Stage 9?)

---

### 7.3 Stakeholder Map

**What it shows:** Sortable, filterable table of all Stakeholder Records with key fields visible: company, sector, size, stage, PVS, last contact, next action.

**Founder use:** Daily operational view. Which records need action today? Which records are overdue?

**Filters:** Stage, sector, size, geography, next action date, PVS range, assigned team member.

**Sorting:** By stage, by PVS, by last contact, by next action date.

---

### 7.4 Interest Distribution

**What it shows:** Visual breakdown of Interest Domains across the active pipeline. Which KORA value dimensions are resonating most?

**Founder use:** Positioning intelligence. Is the market responding most to ESG, to fiscal optimization, to workforce analytics? This tells the founder where to lead in pitches.

**Segmentation options:** By sector, by company size, by engagement stage.

---

### 7.5 Investment Signals

**What it shows:** Aggregated view of budget and investment intent signals across the pipeline.

**Key elements:**
- Budget Range Indication distribution histogram
- Mean Willingness-to-Pay Score across active records
- Investment Intent Level breakdown (for investor-type records)
- Records with Commitment Signals (Stage 7)
- Records with Active Validators (Stage 8)

**Investor signal overlay:** Formats key signals in investor-presentation-ready format for quick extraction.

---

### 7.6 KPI Trends Over Time

**What it shows:** Time-series charts of key KPIs: Engagement Velocity, Average Time-to-Interest, Mean PVS, Trust Index, pipeline stage distribution.

**Founder use:** Learning curve tracking. Is the team getting more effective at validation over time? Are KPIs improving as the narrative sharpens?

**Cadence:** Updated weekly. Historical data preserved from first record entry.

---

### 7.7 Validation Confidence Index

**What it shows:** A composite readiness indicator that synthesizes the evidential quality of the validation dataset.

**Components:**
- Data completeness (% of records with all key fields populated)
- Stage depth (% of records at Stage ≥ 4)
- Sector diversity (number of distinct sectors at Stage ≥ 4)
- Trust Score average
- Active Validator count relative to MVP target

**Purpose:** Tells the founder how investor-ready the current validation evidence is — not just whether the pipeline exists, but how credible and structured it is.

**Label:** Output as a qualitative label (Early Exploration / Signal Emerging / Market Forming / Validation Confirmed / PMF Evidence) aligned with the Market Readiness Index taxonomy in Section 4.10.

---

### 7.8 ICP Prioritization View

**What it shows:** All active Stakeholder Records ranked by ICP Fit Score, with engagement stage and days-in-stage overlaid.

**Founder use:** Weekly prioritization decision. When the pipeline has more records than available contact bandwidth, ICP Fit Score provides the structured basis for deciding who to pursue next. High-ICP companies in early stages should receive more investment than low-ICP companies in later stages, unless other signals override.

**Key elements:**
- Ranked list of active records by ICP Fit Score (descending)
- Current engagement stage per record
- Days since last contact
- ICP Fit component breakdown (which components are driving high or low scores)
- Flag: records with ICP Fit ≥ 61 that have not been contacted in >14 days

**Visibility:** Internal only. Not investor-facing.

---

### 7.9 Champion Map

**What it shows:** Pipeline view organized by Internal Champion Strength, with engagement stage and conversion risk overlay.

**Founder use:** Strategic relationship management. Identifies which advanced-stage deals are anchored by a real internal champion (low risk) and which are floating without one (high risk). Also highlights early-stage records where a strong champion is already present — these deserve accelerated attention.

**Key elements:**
- All active records sorted by Internal Champion Strength (descending)
- Engagement stage per record
- Champion role (where identified)
- Flag: records at Stage ≥ 5 with Internal Champion Strength ≤ 20 (champion-less advanced deals)
- Flag: records at Stage ≤ 3 with Internal Champion Strength ≥ 61 (early-stage champion opportunities)

**Visibility:** Internal only. Not investor-facing by default.

---

### 7.10 Strategic Relationship Portfolio

**What it shows:** Two-axis matrix of all Stakeholder Records plotted by Strategic Relationship Value (vertical axis) vs. commercial potential — represented by Willingness-to-Pay Score (horizontal axis).

**Founder use:** Portfolio-level relationship strategy. The matrix produces four natural quadrants:

| Quadrant | High SRV / High WTP | High SRV / Low WTP |
|---|---|---|
| | **Top Priority** — pursue commercially and nurture strategically | **Strategic Asset** — invest in relationship regardless of near-term revenue |

| Quadrant | Low SRV / High WTP | Low SRV / Low WTP |
|---|---|---|
| | **Commercial Opportunity** — pursue commercially; manage efficiently | **Low Priority** — deprioritize unless context changes |

**Key elements:**
- All active records plotted on the two-axis matrix
- Quadrant labels auto-assigned based on score thresholds (SRV ≥ 61 = High; WTP ≥ 61 = High)
- SRV component breakdown for any selected record
- Portfolio composition summary (how many records in each quadrant)

**Visibility:** Internal only. Not investor-facing by default.

---

### 7.11 Founder Learning Log

**What it shows:** Chronological feed of all `founder_conviction_delta` entries across all Stakeholder Records, with rationale notes, interaction references, and cumulative trend line.

**Founder use:** Personal strategic reflection tool. The Learning Log makes the pattern of the market's feedback on KORA's thesis explicit and reviewable. It transforms individual conversation notes into a longitudinal record of how the founder's understanding of the market opportunity is evolving.

**Key elements:**
- Chronological list of all conviction delta entries (most recent first)
- Each entry shows: date, stakeholder company, interaction type, delta value, rationale note
- Cumulative delta trend line (overall trajectory across all entries)
- Rolling 30-day average delta
- Filter by: positive deltas only / negative deltas only / by sector / by interaction type
- Summary view: which sectors and interaction types produce the strongest positive or negative deltas

**Visibility:** Strictly internal. This view must not be exported or shared without explicit founder decision. It is a learning instrument, not a reporting instrument.

---

## 8. Non-Goals

The following are explicitly outside the scope of this module. Any request to extend the module toward these functions requires a new architectural decision.

| Non-Goal | Reason |
|---|---|
| **CRM system** | This module tracks market signals, not customer relationships. It has no pipeline management, task automation, email integration, or sales playbook function. |
| **Contact management** | Personal contact details are incidental — the unit of analysis is the organization, not the individual. This module does not replace or compete with a contact database. |
| **Billing or invoicing** | No financial transactions are processed or recorded. Budget signals are non-binding intelligence, not payment records. |
| **Fundraising management** | Investor signals are tracked as market intelligence. This module does not manage cap tables, term sheets, SAFE agreements, board resolutions, or legal fundraising processes. |
| **Financial accounting** | No accounting, bookkeeping, or revenue recognition function. |
| **KORA Index computation** | Stakeholder data does not influence Impact Units, PIB scores, KORA Index components, or any scoring output. Isolation is architectural, not configurable. |
| **Employee data** | This module contains no worker personal data. It operates entirely in the commercial/investor domain and is structurally separated from the privacy-protected core platform. |
| **Automated outreach** | This module records interactions; it does not send emails, schedule meetings, or automate any communication. |
| **Marketing analytics** | This is not a web analytics, campaign tracking, or content performance tool. |
| **Competitive intelligence** | Competitor mentions in objection notes are incidental. This module does not systematically track competitor activity. |

---

## 9. Relationship to KORA Core System

### 9.1 Structural Isolation

The Stakeholder & Market Validation Intelligence Layer is structurally isolated from the KORA core methodology and scoring architecture.

It does not:
- Share data with the PIB (Personal Impact Balance) computation layer
- Influence Impact Unit calculation or any IU formula component
- Interact with the Activation Safeguard layer
- Access the pseudonymization key service
- Affect KORA Index scores (AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS)
- Connect to the Eligibility Classification Engine
- Appear in any employer-visible analytics output
- Touch the audit trail or methodology versioning system of the core platform

### 9.2 Parallel Operation

The module operates as a parallel strategic intelligence system, used exclusively by KORA founders and commercial team members. It is not visible to company clients, workers, or any party accessing the core platform.

### 9.3 Data Flow Separation

| Core KORA | Stakeholder Validation Module |
|---|---|
| Processes worker data (pseudonymized) | Processes organization-level market signals |
| Produces impact intelligence | Produces commercial and investor intelligence |
| Subject to privacy architecture | Not subject to worker privacy architecture |
| Governed by methodology versioning | Governed by its own data quality and completeness standards |
| Employer-visible outputs are aggregated | Outputs are founder/team visible only |
| Foundation of the KORA product | A strategic tool for the MVP validation phase |

### 9.4 Future Integration Considerations

In future commercial tiers, market intelligence data (sector-level interest patterns, Feature Demand Matrix outputs) may inform KORA's product roadmap prioritization and ecosystem strategy — but this is a strategic input to human decisions, not a technical integration with the scoring engine.

No technical integration between this module and the KORA core platform is planned for Foundation Light.

---

## 10. Implementation Notes — Conceptual Only

**No code. No SQL. No schema. No API design. No migration.**

This section defines the conceptual data model, logic, and operational rules that must be resolved before any implementation work begins. Implementation is gated behind the doc 13 architectural review process and founder decision.

### 10.1 Data Model Concepts

The conceptual data model has three entity types:

**Stakeholder Record** (one per target organization)
- Singleton per company — one record per organization, not per contact
- Accumulates all interaction history and signal evolution
- Fields defined in Section 2

**Interaction Record** (many per Stakeholder Record)
- Each logged interaction is a child record of a Stakeholder Record
- Preserves chronological history of all touchpoints
- Immutable once logged (corrections via supplementary note, not overwrite)
- Fields defined in Section 2.9

**Aggregate Insight Views** (derived, not stored as primary records)
- Sector-level, geography-level, and segment-level aggregations
- Computed from Stakeholder and Interaction Records on demand
- Not persisted as independent records — derived at query time
- Inputs to all dashboards defined in Sections 6 and 7

### 10.2 Data Quality Standards

- All controlled vocabulary fields must use defined value sets — free-text in controlled fields is not permitted (use designated free-text supplement fields)
- Perceived Value Score, Trust Score, ICP Fit Score, Internal Champion Strength, and Strategic Relationship Value require a rationale note to be populated before the score is accepted
- Budget intent fields require a Confidence Level of Intent to be set before they appear in any aggregate or investor-facing view
- `founder_conviction_delta` requires a `founder_conviction_delta_rationale` note — a delta value without rationale is rejected. A delta of 0 is valid and must still carry a rationale note explaining why the interaction was neutral
- Interaction Records are immutable after a configurable grace period (suggested: 24 hours from logging)
- Stage regression (stage advancing backward) must be logged with a reason — it is an analytically significant event, not an error
- `founder_conviction_delta` values are immutable once the grace period passes — they are a historical learning record, not a live assessment. Corrections are recorded as a new interaction note, not an overwrite

### 10.3 Access and Governance

- Module is accessible only to authorized KORA team members (founders, commercial leads)
- No client, partner, or worker access under any conditions
- No personally identifiable worker data is stored in this module
- Data retention and deletion rules to be defined in implementation phase in alignment with applicable data protection regulation
- Any export of investor-facing summaries must carry the "Non-binding signal intelligence — not financial commitment" label

### 10.4 Methodology Versioning for This Module

Consistent with KORA's core methodology versioning principle:

- KPI definitions (Section 4) carry a version identifier
- Score definitions (PVS, Trust Score, WTP Score, ICP Fit Score, Internal Champion Strength, Strategic Relationship Value, Founder Conviction Delta) carry a version identifier
- Stage definitions (Section 3) carry a version identifier
- ICP Fit Score and Strategic Relationship Value component weights carry their own version — any weight adjustment constitutes a version increment
- Any change to KPI formulas, score ranges, scale definitions, or component weights constitutes a version increment
- Historical data is always analyzed under the methodology version active at the time of capture

### 10.5 Decisions Required Before Implementation

The following conceptual questions must be resolved before any implementation proceeds:

1. **Tooling decision:** Will this module be built within the KORA platform, or will a lightweight off-the-shelf tool (Notion, Airtable, custom spreadsheet) serve the MVP validation phase? The conceptual model is tool-agnostic.
2. **Access control model:** Who on the KORA team has write access vs. read access to Stakeholder Records?
3. **Minimum record count for aggregate insights:** What is the minimum number of records required before sector-level and geography-level aggregations are surfaced to avoid misleading low-sample signals?
4. **Stage regression policy:** Is stage regression allowed, and if so, what approval or logging is required?
5. **Data export format:** What format do founder-ready investor summaries take — PDF, structured export, live dashboard?

---

## 11. Module Summary

### 11.1 Module Purpose Summary

The KORA Stakeholder & Market Validation Intelligence Layer is the structured intelligence infrastructure for the Foundation Light MVP validation phase. It transforms informal market engagement into structured, versioned, analytically usable data that supports three outcomes:

1. **Product-Market Fit evidence** — structured documentation of who responds to KORA and why, enabling rigorous PMF assessment rather than anecdotal claims.

2. **Investment readiness** — investor-grade KPIs and signal tracking that translate commercial activity into credible traction narratives.

3. **Commercial strategy intelligence** — sector, geography, and segment insights that enable data-driven prioritization of the commercial pipeline and positioning decisions.

It does this without being a CRM, without touching worker data, and without influencing the KORA scoring methodology in any way.

---

### 11.2 Complete KPI List

| # | KPI | Section | Investor-facing |
|---|---|---|---|
| 1 | Stakeholder Conversion Rate per Stage | 4.1 | Yes |
| 2 | Engagement Velocity | 4.2 | Yes |
| 3 | Interest Density per Sector | 4.3 | Yes |
| 4 | Perceived Value Score Distribution | 4.4 | Yes |
| 5 | Objection Clustering Analysis | 4.5 | Yes |
| 6 | Pilot Conversion Probability | 4.6 | Yes |
| 7 | Average Time-to-Interest | 4.7 | Yes |
| 8 | Average Time-to-Pilot | 4.8 | Yes |
| 9 | Trust Index Evolution | 4.9 | Yes |
| 10 | Market Readiness Index (Experimental) | 4.10 | Yes, with caveats |
| 11 | Investor Interest Ratio | 4.11 | Yes |
| 12 | Founder Conviction Delta Trend | 4.12 | **No — internal only** |
| 13 | ICP Fit Distribution | 4.13 | Yes |
| 14 | Internal Champion Strength Average | 4.14 | Yes |
| 15 | Strategic Relationship Value Map | 4.15 | Yes |

---

### 11.3 Complete Stakeholder Signals Tracked

| Signal Category | Signals |
|---|---|
| **Identity** | Sector, sub-sector, company size, geography, company name |
| **Contact quality** | Primary contact type, decision-maker reached, C-suite engaged |
| **Engagement state** | Pipeline stage, stage entry date, days in stage, engagement velocity |
| **Interest signals** | Interest domains, primary interest domain, Perceived Value Score (+ history) |
| **Relationship quality** | Trust Score (+ history), interaction count, total engagement days |
| **Friction signals** | Objection tags, primary blocker, objection addressed status |
| **Budget signals** | Budget Range Indication, Willingness-to-Pay Score, pilot budget potential, enterprise contract potential |
| **Investment signals** | Investment Intent Level, Confidence Level of Intent |
| **Prioritization signals** | ICP Fit Score (+ component breakdown), Internal Champion Strength (+ champion role and influence), Strategic Relationship Value (+ component breakdown) |
| **Founder learning signals** | Founder Conviction Delta (per interaction), cumulative conviction delta, conviction trend direction |
| **Interaction detail** | Interaction type, participants, topics, objections raised, signal quality, outcome, next action, per-interaction conviction delta |
| **Operational** | Last contact date, next action date, next action type, record owner |

---

### 11.4 How This Improves the MVP Validation Strategy

**Without this module:** Commercial activity is tracked informally. Insights are anecdotal. Investor conversations rely on memory and narrative rather than structured evidence. Positioning decisions are made without systematic market feedback. The team cannot know whether a declining conversion rate in a given sector reflects a positioning problem, a timing problem, or a data problem.

**With this module:**

- Every commercial conversation contributes to a structured, versioned intelligence dataset
- Stage progression is measurable, comparable, and analytically usable
- Objection patterns surface systematically, enabling rapid positioning iteration
- Investor conversations are backed by auditable, structured traction metrics
- Sector and segment prioritization decisions are data-informed rather than intuition-only
- ICP Fit Score ensures time is spent on the right company profiles, not just the most accessible ones
- Internal Champion Strength surfaces deal risk early — before a pipeline appears healthy but collapses without internal sponsorship
- Strategic Relationship Value ensures the team does not deprioritize relationships that are commercially modest but strategically critical for market entry, investor signaling, or ecosystem positioning
- Founder Conviction Delta Trend makes the market's feedback on KORA's thesis structurally visible — transforming individual conversation notes into a longitudinal learning record
- The team has a real-time Validation Confidence Index that shows not just how much activity is happening, but how strong the evidential quality of that activity is

The module operationalizes KORA's core methodological principles — verified actions, structured classification, versioned methodology, auditable outputs — in the commercial and investor domain. It is KORA's intelligence approach applied to KORA's own market validation.

---

*End of Document — KORA Stakeholder & Market Validation Intelligence Layer v0.2*
*Status: Draft — Pending Founder Review*
*Next step: Founder review and approval before any implementation or tooling decision.*
