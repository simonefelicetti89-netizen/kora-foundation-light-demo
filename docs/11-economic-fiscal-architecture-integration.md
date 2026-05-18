# KORA Economic & Fiscal Architecture Integration

*Status: Approved Baseline — Economic/Fiscal Architecture v0.1 (rev. 2026-05-17 — payment institution / escrow wording refined; Section 21 founder decisions approved 2026-05-17)*
*Document number: 11*
*Created: 2026-05-17*
*Source materials: KORA_Economic_Financial_WhitePaper.docx (v2.0) and KORA_FiscalCategories_Guardrails.docx (Sezione 09-bis)*

---

## 1. Status and Authority

**Status:** Approved Draft — Economic/Fiscal Architecture v0.1

This document is an internal architecture and governance reference. It formally incorporates the Economic & Financial White Paper (v2.0) and the Fiscal Categories & Guardrails reference (Sezione 09-bis) into the official KORA documentation system.

**This document is not:**
- Legal advice
- Tax advice
- Labor law advice
- Accounting advice
- PSD2/payment regulation advice
- Confirmation that any fiscal model is legally validated
- Authorization for KORA to act as a payment institution

**This document requires review by, before any operational payment or fiscal feature is activated:**
- Welfare tax advisor / commercialista welfare
- Consulente del lavoro (labor law advisor)
- Legal advisor (MSA structure, fiscal positioning, liability clauses)
- PSD2/payment regulation advisor (KORA qualification as non-payment institution, PSP model, escrow structure)
- DPO/privacy advisor (Welfare Statement pseudonymization, GDPR Art. 9, no-payment event tracking)
- Accounting advisor (chart of accounts, FUO separation, competence rules)

**Authority hierarchy:**
The canonical KORA methodology remains docs 01–10 and Appendices A and B. This document governs economic/fiscal architecture only. It does not modify impact methodology, KORA Index formulas, Architecture v3, or any canonical document. On any conflict between this document and docs 06, 09, or 10, the canonical document governs.

---

## 2. Core Principle

KORA must structurally and architecturally separate five distinct domains. These separations are not optional. They are constitutional requirements of the KORA model.

**The five domains that must remain permanently separate:**

| Domain | What it is | What it is not |
|---|---|---|
| **Impact measurement** | Verified actions → IU → PIB → KORA Index | Not financial, not fiscal, not a budget function |
| **Fiscal eligibility** | Classification of services by fiscal perimeter and eligibility confidence | Not impact, not revenue, not financial governance |
| **Financial governance** | Budget allocation, FUO tracking, cost-per-impact, spend-to-impact | Not impact scoring, not fiscal certification |
| **Payment / fund orchestration** | FUO flows, partner payouts, worker top-up, escrow management | Not KORA revenue unless explicitly structured as a fee |
| **KORA revenue** | KORA Fees — what KORA earns for delivering intelligence and governance | Not FUO, not partner payouts, not company welfare budgets |

**Core rules that must never be violated:**

- Budget is input, not impact.
- Fiscal eligibility is not impact.
- Financial flow is not impact.
- Partner payout is not KORA revenue.
- Company service funds (FUO) are not KORA revenue under any circumstances.
- Worker top-up is not KORA revenue unless KORA charges a disclosed, defined service fee on that specific flow.
- KORA Index must never be calculated from, or influenced by: budget size, spending amount, fiscal category, funds loaded, partner payout, wallet balance, or number of fiscal categories activated.
- FUO must never transit through KORA's operational account — not even temporarily, not even for one day.

*Confusing KORA Fees with FUO creates three structural risks: fiscal requalification of FUO as KORA revenue (VAT at 22% on full transaction volume + penalties); regulatory requalification of KORA as a de facto payment institution (requires PSD2 authorization, regulatory capital); and loss of the company's welfare tax benefit (welfare reclassified as taxable salary). None of these is manageable ex post. The separation is an architectural requirement, not a configuration option.*

---

## 3. Economic Quantity Framework

KORA's economic model involves five structurally distinct quantities. Confusing them is the primary source of fiscal, regulatory, and investor-communication risk.

### 3.1 KORA Fees

**Definition:** Amounts paid to KORA for KORA's own services. This is actual KORA revenue — the only quantity that flows into KORA's operational account and constitutes income.

**Examples:**
- SaaS subscription (Foundation Light, Foundation, Governance, Certified tiers)
- Setup and onboarding fee
- Orchestration / management fee (for program operator role)
- KORA certification fee
- Partner certification and annual renewal fee
- Advisor academy / training / licensing fee
- Data/reporting fee (enhanced packages, board packs)
- API/methodology licensing fee
- Custom integration fee (enterprise)
- Service fee on worker top-up (charged to worker — only the fee portion, not the top-up amount)
- KIP tracking and reporting fee (tracking only — the KIP financial flow is external to KORA)

**What it is not:** Any amount collected from a company that KORA then passes on to a partner or holds for fund management purposes.

### 3.2 FUO — Funds Under Orchestration

**Definition:** Company-owned funds (and worker personal funds in the worker top-up case) that KORA governs, allocates, tracks, or orchestrates through its platform, but that are never KORA revenue and must never transit through KORA's operational account.

**Examples of FUO company-funded:**
- Welfare budget (welfare aziendale ex art. 51 TUIR)
- Fringe benefit budget
- Training budget (when in welfare perimeter)
- Health/wellbeing budget
- ESG/CSR budget orchestrated through KORA
- HR discretionary budget orchestrated through KORA

**Examples of FUO worker-funded:**
- Worker personal top-up (sub-wallet)
- Co-funded service: worker portion

**Absolute rule:** FUO must never transit through KORA's operational account under any circumstances — not even temporarily, not even for one day. This principle is non-negotiable regardless of the structural model chosen. The preferred target architecture for enforcing this separation is a segregated structure managed by a regulated payment institution (istituto di pagamento partner), where KORA transmits technical payout instructions rather than receiving, holding, or disbursing FUO directly. The exact custody model, legal qualification, and payment institution structure must be validated by PSD2/payment regulation advisor, legal advisor, commercialista welfare, and accounting advisor before any fund flows are activated.

**In investor reporting:** FUO must be presented as a scale metric (FUO orchestrated) separately from KORA Revenue / ARR. FUO demonstrates platform breadth and network effect without creating confusion about financial performance.

### 3.3 Partner Payouts

**Definition:** Amounts paid from company FUO escrow to certified partners/providers for services actually used or activated by workers. These are not KORA revenue.

The target payout flow (subject to PSD2, legal, and accounting advisor validation before activation) is: company deposits FUO into a segregated structure at a regulated third party → KORA transmits a technical instruction → the regulated third party executes the payout to the certified partner.

KORA does not collect partner payouts, does not route them through its accounts, and does not earn a margin on them unless a separately invoiced KORA Fee is explicitly defined (e.g., orchestration fee, management fee).

### 3.4 Worker-Funded Flows / Personal Top-Up

**Definition:** Employee personal spending or co-payment from their own post-tax funds. In the target architecture (subject to PSD2 and legal advisor validation), these would be held in a personal sub-wallet at a regulated payment institution, segregated from company FUO. The exact structure requires separate advisor review.

- Worker top-up itself: not KORA revenue.
- KORA service fee charged on worker top-up: KORA revenue (invoiced separately at the disclosed fee rate, typically 1.5–3.5% of top-up amount).

Worker-funded flows are a future feature (Worker Module). They must not be implemented in Foundation Light.

### 3.5 Non-Monetary Verified Actions

**Definition:** Actions that generate Impact Units without any financial flow. No payment to partners, no FUO, no partner payout, no wallet transaction.

**Examples:**
- Internal mentoring (mentor and mentee events)
- Peer-to-peer learning / internal training
- Volunteering without corporate service provider payment
- Knowledge transfer sessions
- Community participation events with no fee
- KORA Link verified actions

**Critical distinction:** Non-monetary actions may generate Impact Units through the UEF/PIB pipeline and contribute to the KORA Index. Monetary flows alone do not generate Impact Units. A company spending a large welfare budget with no actual worker activation has FUO but no Impact Units. A company with a small budget and active non-monetary programs may generate significant Impact Units.

---

## 4. Revenue vs Managed Funds Separation

The following table makes the structural separation explicit for every category of economic flow in KORA.

*Note on "Who receives" for FUO rows: references to payment institution / segregated structure describe the target architecture. The exact custody model and payment institution structure require PSD2, legal, tax, and accounting advisor validation before any fund flows are activated. Nothing in this table implies that the payment institution structure has been legally confirmed.*

| Flow type | Who pays | Who receives | Is it KORA revenue? | Can it generate Impact Units? | Requires fiscal classification? | Requires payment/PSD2 review? |
|---|---|---|---|---|---|---|
| KORA SaaS subscription | Company | KORA | **YES** | No | No | No |
| KORA setup/onboarding fee | Company | KORA | **YES** | No | No | No |
| KORA certification fee | Company | KORA | **YES** | No | No | No |
| KORA orchestration / management fee | Company | KORA | **YES** | No | No | Advisable (avoid PSD2 characterization) |
| Company welfare budget (FUO) | Company | Segregated third-party structure (target — subject to PSD2/legal review) | **NO** | No (directly) | **YES** | **YES** |
| Company training budget (FUO if in welfare perimeter) | Company | Segregated third-party structure or HR budget flow (target — subject to advisor review) | **NO** | No (directly) | **YES** | Dependent on structure |
| Company CSR/ESG project budget | Company | Project / ETS (direct, not through KORA) | **NO** | If tied to verified worker actions | **YES** | Recommended (KIP structure) |
| Partner payout | Regulated third party (target — subject to PSD2/legal review) | Certified partner | **NO** | No (payout is not the action) | No | **YES** |
| Worker personal top-up | Worker | Segregated personal structure (target — subject to PSD2/legal review) | **NO** | No (directly) | No | **YES** |
| KORA service fee on worker top-up | Worker | KORA | **YES** (the fee only) | No | No | Advisable |
| Co-funded service (company quota) | Company | Segregated third-party structure (target — subject to PSD2/legal review) | **NO** | No (directly) | **YES** | **YES** |
| Co-funded service (worker quota) | Worker | Segregated personal structure (target — subject to PSD2/legal review) | **NO** | No (directly) | No | **YES** |
| Non-monetary verified action | No payment | No recipient | **NO** | **YES** | No | No |
| KORA Impact Pledge (KIP) | Company | Territorial project / ETS (direct) | **NO** | Indirectly (if linked to verified worker actions) | No (not welfare) | Recommended (avoid intermediation) |

**Reading this table:** "Can it generate Impact Units?" means: does the flow itself — the money moving — generate IU? The answer is always No. Only the verified human action that may be enabled by the flow generates IU, and only through the UEF → NM → BC → IU Engine pipeline. A company depositing welfare budget generates no IU. The worker activating a wellbeing session — the verified action — may generate IU.

---

## 5. SVAM — Single Vendor Administrative Model

### 5.1 Definition

SVAM (Single Vendor Administrative Model) is KORA's model for acting as the sole administrative interface between a company and its network of welfare/impact service partners.

The enterprise procurement problem SVAM solves: a company with 50–100 welfare partners cannot individually onboard each as a separate supplier in its ERP system. Fifty partners means fifty vendor codes, fifty contracts, fifty verification flows, fifty monthly invoices to reconcile. This structurally blocks enterprise adoption.

SVAM resolves this by making KORA the single administrative counterpart: one vendor, one contract, one Welfare Statement. Partners remain the actual service providers. In the target architecture, a regulated payment institution would hold and execute fund flows on behalf of the company, never routing FUO through KORA's operational account. The exact payment institution model, custody arrangement, and legal qualification require PSD2, legal, and accounting advisor validation before implementation. Company welfare budget must never become KORA revenue, regardless of which structural model is chosen.

### 5.2 What SVAM Is and Is Not

**SVAM is:**
- An administrative centralization model
- A procurement simplification tool for enterprise clients
- A program operator role: KORA configures, governs, tracks, and reports
- A technical instruction layer: in the target architecture, KORA transmits payout instructions to a regulated payment institution (structure subject to PSD2 and legal advisor validation)

**SVAM is not:**
- Automatic authorization for KORA to be the fiscal seller of all services
- Automatic transformation of third-party funds into KORA revenue
- Authorization for KORA to hold or move client funds without regulatory review
- Equivalent to being a payment institution

### 5.3 SVAM Variants

**Variant A — KORA as Intelligence and Reporting Layer Only**

*Description:* KORA invoices only its own fees (subscription, setup, orchestration fee). Partner/service funds are paid directly: company → partner, outside KORA payment infrastructure. KORA provides classification, governance intelligence, and reporting but does not touch fund flows.

*Benefits:* Maximum simplicity. Zero PSD2/payment risk. Zero FUO mis-classification risk. Fastest to implement legally.

*Risks:* No administrative centralization benefit for enterprise. Company must still manage partner procurement individually. Reduces KORA's operational value for large clients.

*Foundation Light suitability:* **Recommended for Foundation Light.** No payment infrastructure required. Analysis, classification, and reporting only.

*Legal/tax/PSD2 review required:* Minimal. Only KORA's own invoices require advisor review.

---

**Variant B — KORA as Administrative Centralizer, Payments via Payment Institution**

*Description:* KORA acts as the single administrative interface (SVAM). In this model, the company would deposit FUO into a segregated structure at a regulated payment institution. KORA would transmit technical payout instructions to the payment institution. The payment institution would execute partner payouts. KORA Fees are invoiced separately. The exact legal qualification, custody structure, and payment institution model require PSD2, legal, and accounting advisor validation — this is why the legal review is mandatory before go-live.

*Benefits:* Full administrative centralization for enterprise. One contract, one Welfare Statement. Scales to large partner networks. Legal structure clearly separates KORA Fees from FUO.

*Risks:* Requires legal validation of KORA's role as non-payment institution. Requires a qualified payment institution partner. Requires careful contractual structuring (MSA clauses: technical instruction language, non-custody of funds, fiscal disclaimer). Higher legal and compliance cost to set up.

*Foundation Light suitability:* **Not for Foundation Light.** This is Foundation/Governance tier.

*Legal/tax/PSD2 review required:* **Mandatory before go-live.** Commercialista welfare (FUO qualification), legal advisor PSD2 (KORA as non-payment institution), DPO (Welfare Statement pseudonymization), consulente del lavoro (payroll integration).

---

**Variant C — KORA as Light Prime Contractor (Limited, Legally Validated Perimeter Only)**

*Description:* KORA takes on limited prime contractor status for a defined, legally validated perimeter of services (e.g., a specific welfare program where regulatory structure is clear). KORA invoices the full service to the company and then manages partner invoicing in the background. Requires that the legal/fiscal qualification explicitly supports this structure without generating the FUO-as-revenue risk.

*Benefits:* Simplest invoicing experience for the company. No need for escrow or payment institution for covered services.

*Risks:* Highest legal/fiscal risk of the four variants. VAT exposure if partner services are treated as KORA's own supply. Must be limited to perimeters where the commercialista welfare explicitly validates that the rebilling does not create a full-revenue characterization for KORA. Not suitable for art. 51 TUIR welfare categories.

*Foundation Light suitability:* **Not for Foundation Light.** Requires specific legal/tax validation before any use.

*Legal/tax/PSD2 review required:* **Mandatory.** Commercialista welfare (rebilling structure, VAT treatment, FUO vs revenue), legal advisor (MSA liability clauses, fiscal disclaimer).

---

**Variant D — Full Marketplace/Orchestration with PSP Support**

*Description:* KORA operates a full marketplace: workers browse and activate services; company welfare budget flows through KORA's platform infrastructure; KORA orchestrates partner selection, booking, and payment through a PSP integration (payment institution as infrastructure layer). Includes worker sub-wallet, top-up functionality, and full real-time fund orchestration.

*Benefits:* Full platform value. Richest worker experience. Maximum data for impact intelligence. Network effect at scale.

*Risks:* Highest regulatory complexity. Requires confirmed KORA qualification as non-payment institution with the PSP model specified. Requires worker consent infrastructure. Requires full KYC/AML support through payment institution. Cannot be built before all legal/payment/PSD2 validations are complete.

*Foundation Light suitability:* **Not for Foundation Light. Not for Foundation or Governance either.** This is the Ecosystem tier (Phase 5+).

*Legal/tax/PSD2 review required:* **Full professional validation pack required.** Estimated cost: €40,000–80,000 for complete advisory package before go-live.

---

**Recommendation:** Foundation Light must use Variant A only. Variant B is the target model for Foundation and Governance tiers but requires full professional validation before operational activation. Variants C and D are future phases requiring specific legal groundwork.

### 5.4 Essential MSA Clauses (SVAM)

The following contractual language is required in any Master Service Agreement where KORA acts as administrative centralizer. Legal advisor must review and finalize before execution.

**Administrative centralization:** "KORA acts as the sole administrative interface between the Company and the certified partners in the Program. The Company does not individually onboard certified partners as separate vendors in its own systems."

**Technical instruction / non-custody:** "KORA configures and transmits technical instructions to the payment institution, based on rules approved by the Company and bookings authorized by the platform. KORA does not hold, collect, custody, or directly disburse funds. [The specific legal qualification — mandate, commission, or technical service — is to be determined by legal advisor.]"

**KORA Fees / partner service distinction:** "KORA Fees invoiced by KORA cover exclusively KORA's own services. The value of partner services is not included in KORA Fees and does not constitute KORA revenue."

**Fiscal disclaimer:** "KORA does not certify the fiscal treatment of benefit distributions. The Company remains responsible for the correctness of the fiscal qualification of benefits provided to its employees."

**Audit right:** "The Company may request the complete documentation package at any time. KORA produces it within 5 business days."

---

## 6. Fiscal Categories

KORA handles nine distinct fiscal and administrative categories. Each has a different regulatory treatment, documentation requirement, FUO status, and relationship to KORA revenue and impact measurement.

**Critical caveat for all nine categories:** The fiscal qualifications described below are working design hypotheses. They are not professional opinions. The fiscal and contributory treatment of each category must be validated by a qualified commercialista welfare and consulente del lavoro before any category is activated in an operational KORA program. Where numerical thresholds appear (fringe benefit annual limits), they must be updated annually based on applicable legislation, communicated formally to KORA by the company's advisor.

---

### Category 1: welfare_51tuir

| Field | Value |
|---|---|
| **Category code** | `welfare_51tuir` |
| **Description** | Corporate welfare benefits excluded from taxable employment income under Italian fiscal law (Art. 51 para. 2 TUIR), provided by the company to homogeneous worker categories. Non-convertible to cash. |
| **Typical funding source** | Company-funded (FUO company-funded, escrow at payment institution) |
| **Typical examples** | Education, childcare, family/eldercare assistance, supplementary healthcare, complementary pension, public transport subsidies, cultural/recreational services, social utility services, other Art. 51 c.2 TUIR-compatible services |
| **Fiscal sensitivity** | **High.** Tax-advantaged for worker within applicable perimeter and thresholds. Requires homogeneous category compliance, non-convertibility, valid partner documentation. |
| **May generate Impact Units?** | **Yes** — through verified worker action (UEF → IU pipeline), not from the budget flow itself |
| **Enters FUO?** | **Yes** — company-funded FUO. Target structure: held in a segregated account by a regulated third party. Exact custody arrangement subject to PSD2, legal, and accounting advisor review. |
| **Enters KORA revenue?** | **No** — FUO is not KORA revenue |
| **Required validation/advisor review** | Commercialista welfare and consulente del lavoro before activation of any service within this category. Annual review of thresholds and eligible service list. |
| **Foundation Light treatment** | Classification and tagging of existing spend. No live fund orchestration. Basic eligibility confidence flagging. Mismatch warnings where present. |

---

### Category 2: fringe_benefit

| Field | Value |
|---|---|
| **Category code** | `fringe_benefit` |
| **Description** | Individual goods and services assigned by the company to workers. Tax-exempt up to an annual threshold (Art. 51 para. 3 TUIR). Threshold changes annually with budget legislation. |
| **Typical funding source** | Company-funded |
| **Typical examples** | Gift vouchers, shopping vouchers, benefits in kind, utility reimbursements (where applicable under current law), other individual benefits within the annual threshold |
| **Fiscal sensitivity** | **High.** Above threshold: taxable for worker, subject to social security contributions. Threshold must be updated annually. Cumulative monitoring per worker is mandatory. |
| **May generate Impact Units?** | **Yes** — through verified worker activation |
| **Enters FUO?** | **Yes** — company-funded FUO if in active program |
| **Enters KORA revenue?** | **No** |
| **Required validation/advisor review** | Commercialista welfare for annual threshold update. Consulente del lavoro for payroll integration when threshold is approached or exceeded. |
| **Foundation Light treatment** | Classification and tagging. Cumulative threshold monitoring (conceptual, not live). Warnings where spend approaches threshold. |

---

### Category 3: formazione

| Field | Value |
|---|---|
| **Category code** | `formazione` |
| **Description** | Company budget for professional development of employees. May or may not be welfare under Art. 51 TUIR — depends on how the company configures it. Has its own corporate deductibility under Art. 95 TUIR. |
| **Typical funding source** | Company-funded (HR/Training budget; or welfare perimeter if explicitly configured) |
| **Typical examples** | Internal/external courses, mandatory training, certifications, LMS licenses, executive coaching, language courses, professional academy programs |
| **Fiscal sensitivity** | **Medium.** Deductible as corporate cost (Art. 95 TUIR). Not automatically advantaged as employee benefit. Qualification depends on structure and advisor configuration. |
| **May generate Impact Units?** | **Yes** — GROWTH pillar events generate IU |
| **Enters FUO?** | **Variable** — only if company configures training as within welfare perimeter |
| **Enters KORA revenue?** | **No** |
| **Required validation/advisor review** | Company decision (with advisor) on whether training enters welfare perimeter or HR budget. VAT treatment of training services requires review. |
| **Foundation Light treatment** | Classification of existing training spend by fiscal designation. Pillar mapping to GROWTH. Eligibility confidence based on available documentation. |

---

### Category 4: hse

| Field | Value |
|---|---|
| **Category code** | `hse` |
| **Description** | Health, safety, and prevention budget. May overlap with welfare (supplementary healthcare) or be a separate operational HSE budget. |
| **Typical funding source** | Company-funded (HSE operational budget or welfare perimeter) |
| **Typical examples** | Mandatory safety training, preventive health screening, workplace wellness programs, ergonomics, personal protective equipment training, wellbeing-at-work initiatives |
| **Fiscal sensitivity** | **Variable.** Mandatory safety training = corporate cost. Preventive health screening and wellness = potentially welfare (requires qualification). IVA treatment on healthcare services requires review. |
| **May generate Impact Units?** | **Yes** — LIFE pillar events generate IU |
| **Enters FUO?** | **Variable** — only if in configured welfare perimeter |
| **Enters KORA revenue?** | **No** |
| **Required validation/advisor review** | Qualification of specific HSE services as welfare vs. corporate cost requires commercialista welfare review. Distinction between mandatory training (cost) and elective wellbeing (potentially welfare). |
| **Foundation Light treatment** | Classification of HSE spend. Pillar mapping to LIFE. Eligibility confidence assessment. Mismatch flags where HSE spend appears classified under incorrect perimeter. |

---

### Category 5: csr_esg

| Field | Value |
|---|---|
| **Category code** | `csr_esg` |
| **Description** | Budget for corporate social responsibility, territorial, environmental, and social initiative programs. Separate from employee welfare. |
| **Typical funding source** | Company-funded (CSR/ESG budget) |
| **Typical examples** | Corporate volunteering programs, KORA Impact Pledge (KIP) commitments, territorial projects, ETS partnerships, Comune/foundation projects, ESG environmental initiatives, school orientation programs |
| **Fiscal sensitivity** | **Low for welfare.** This is not worker welfare. Deductibility as liberalità/charitable donation (Art. 100 TUIR) must be verified for specific cases. KIP flow is direct company → territorial project, outside KORA payment infrastructure. |
| **May generate Impact Units?** | **Yes** — through verified worker participation (volunteering events → IMPACT pillar IU). The financial KIP pledge itself does not generate IU; worker verified participation does. |
| **Enters FUO?** | **No** — KIP and CSR flows are not FUO. They are outside KORA payment infrastructure. |
| **Enters KORA revenue?** | **No** — except an optional KIP tracking/reporting fee charged by KORA for evidence management |
| **Required validation/advisor review** | Deductibility of liberalità (Art. 100 TUIR) requires commercialista review. KIP structure requires legal advisor review to confirm no payment intermediation risk. |
| **Foundation Light treatment** | Classification of CSR/ESG spend. Pillar mapping to IMPACT. KIP tracking (commitment only — no fund flow through KORA). |

---

### Category 6: hr_discretionary

| Field | Value |
|---|---|
| **Category code** | `hr_discretionary` |
| **Description** | HR budget for internal initiatives not fiscally qualified as welfare. No tax advantage for the worker. |
| **Typical funding source** | Company-funded (HR budget) |
| **Typical examples** | Team events, parenting/family programs, engagement activities, non-advantaged wellbeing programs, internal company events, ad-hoc subsidies not structured as welfare |
| **Fiscal sensitivity** | **Medium risk.** No welfare advantage. Risk of taxable salary characterization if structured as individual benefits without welfare qualification. Must not be confused with welfare_51tuir. |
| **May generate Impact Units?** | **Yes** — through verified worker participation in relevant events |
| **Enters FUO?** | **No** — not company-funded FUO in welfare sense. May generate separate HR budget flows if KORA orchestrates. |
| **Enters KORA revenue?** | **No** |
| **Required validation/advisor review** | Consulente del lavoro must confirm that specific HR discretionary services cannot be inadvertently characterized as taxable salary. If company wants to classify specific HR discretionary services as welfare, specific advisor opinion required. |
| **Foundation Light treatment** | Classification and pillar mapping. Explicit flag that this category is outside welfare perimeter unless otherwise validated. |

---

### Category 7: employee_paid

| Field | Value |
|---|---|
| **Category code** | `employee_paid` |
| **Description** | Worker personal spending using post-tax personal funds. Not company welfare. Not a company FUO. |
| **Typical funding source** | Worker personal funds (post-tax) |
| **Typical examples** | Personal top-up, personal purchases from KORA partner network, premium personal subscriptions, voluntary continuation of services beyond company allocation |
| **Fiscal sensitivity** | **Low for welfare.** Personal expenditure — no welfare tax advantage. IVA applies to services purchased. Service fee charged by KORA on top-up is KORA revenue at standard IVA rate. |
| **May generate Impact Units?** | **Yes** — personal activation of verified services generates IU through the same UEF pipeline |
| **Enters FUO?** | **Worker-funded FUO** — target structure: personal sub-wallet at a regulated payment institution, segregated from company FUO. Exact structure subject to PSD2 and legal advisor validation. |
| **Enters KORA revenue?** | **Only the KORA service fee** — the top-up amount itself is not KORA revenue |
| **Required validation/advisor review** | Commercialista: confirm service fee VAT treatment. Legal PSD2: confirm sub-wallet segregation from company escrow. DPO: confirm B2C worker data treatment as separate KORA relationship. |
| **Foundation Light treatment** | **Not included in Foundation Light.** Worker-funded flows are Ecosystem tier. |

---

### Category 8: co_funded

| Field | Value |
|---|---|
| **Category code** | `co_funded` |
| **Description** | Service partially funded by the company (welfare or HR budget) and partially by the worker from personal funds. Requires separate accounting of the two flows. |
| **Typical funding source** | Company (FUO company-funded, quota aziendale) + Worker (personal sub-wallet, quota lavoratore) |
| **Typical examples** | Company welfare contribution + worker upgrade payment for a premium service, co-payment on healthcare service, extension of welfare service beyond company allocation |
| **Fiscal sensitivity** | **High.** Company quota follows welfare treatment (if qualified). Worker quota is personal expenditure. The two flows must be separated and tracked separately. Mixing them creates fiscal reclassification risk. |
| **May generate Impact Units?** | **Yes** — through verified worker activation |
| **Enters FUO?** | **Partially** — target structure: company quota in a segregated company-funded account; worker quota in a personal sub-wallet. Exact separation structure subject to PSD2, legal, and accounting advisor review. |
| **Enters KORA revenue?** | **No** (for FUO portions). KORA service fee on worker portion is KORA revenue. |
| **Required validation/advisor review** | Specific commercialista welfare opinion on co-funded structure. Confirmation that company quota retains welfare treatment when worker co-pays. Legal PSD2 on technical separation of flows at payment institution. |
| **Foundation Light treatment** | **Not included in Foundation Light.** Co-funded requires payment infrastructure. Classification of historical co-funded spend is possible; live orchestration is not. |

---

### Category 9: non_monetary (no_payment)

| Field | Value |
|---|---|
| **Category code** | `non_monetary` |
| **Description** | Actions and participations that generate Impact Units and contribute to the KORA Index but involve no payment to partners and no financial flow. |
| **Typical funding source** | None — no monetary flow |
| **Typical examples** | Internal mentoring (mentor and mentee events), peer-to-peer learning, voluntary community participation, knowledge transfer sessions, no-fee cultural/social events, KORA Link verified actions |
| **Fiscal sensitivity** | **None directly.** No fiscal relevance. Privacy risk in tracking worker behavior (mentoring, volunteering) requires DPO/privacy review. |
| **May generate Impact Units?** | **Yes** — this is the primary non-financial source of IU across CONNECTION, LEGACY, and IMPACT pillars |
| **Enters FUO?** | **No** |
| **Enters KORA revenue?** | **No** (tracking of non-monetary events is included in the subscription) |
| **Required validation/advisor review** | DPO/privacy advisor must validate the tracking of worker behavior (GDPR basis, consent structure, transparency obligations). |
| **Foundation Light treatment** | Classification of non-monetary actions from existing data (mentoring logs, volunteering records, knowledge transfer documentation). Full IU pipeline applies. |

---

## 7. Fiscal Classification Data Model — Conceptual

Every transaction, booking, event, or service activation in KORA must carry a structured set of fiscal classification fields. These fields are configured at program setup (by the company, with advisor validation), updated by the Fiscal Guardrails Engine, and maintained in the audit trail.

**This is conceptual only. Technical schema is doc 12.**

| Field | Description |
|---|---|
| `fiscal_category` | Main fiscal category: `welfare_51tuir`, `fringe_benefit`, `formazione`, `hse`, `csr_esg`, `hr_discretionary`, `employee_paid`, `co_funded`, `non_monetary` |
| `fiscal_subcategory` | Specific subcategory within the main category (e.g., `sanita_integrativa`, `educazione`, `tpl`, `voucher`, `volontariato`) |
| `funding_source` | Who funds: `company_funded`, `employee_funded`, `co_funded`, `no_payment` |
| `budget_owner` | Company budget owner: `welfare_budget`, `hr_budget`, `training_budget`, `hse_budget`, `csr_budget`, `personal` |
| `tax_treatment_status` | `agevolato_51tuir`, `agevolato_entro_soglia`, `non_agevolato`, `da_validare`, `fuori_perimetro` |
| `fiscal_validation_status` | `validated`, `validation_pending`, `requires_review`, `not_applicable` |
| `advisor_validation_reference` | Reference to the written professional opinion validating the classification (code, date, advisor) |
| `payroll_relevance_flag` | `true`, `false`, `conditional` — whether this event must be communicated to the company's consulente del lavoro for payroll integration |
| `welfare_statement_flag` | `true`, `false` — whether this transaction must appear in the monthly Welfare Statement |
| `fringe_threshold_relevance` | `true`, `false`, `partial` — whether this event contributes to the worker's annual fringe benefit cumulative |
| `invoice_required_flag` | `required`, `not_required`, `conditional` — whether a fiscal invoice from the company/partner is required |
| `partner_document_required_flag` | Type of probatory document required: `fattura`, `attestato`, `dichiarazione`, `none` |
| `payment_flow_type` | `fuo_company`, `fuo_worker`, `co_funded`, `no_payment`, `employee_topup` |
| `fuo_relevance_flag` | `true`, `false` — whether this event generates a company FUO entry |
| `revenue_relevance_flag` | `true`, `false` — whether this event generates KORA revenue |
| `employee_taxable_risk_flag` | `low`, `medium`, `high`, `requires_payroll_review` — risk that the event is taxable for the worker |
| `guardrail_result` | Outcome from Fiscal Guardrails Engine: `approved`, `approved_with_warning`, `blocked`, `requires_advisor_validation`, `requires_payroll_review`, `outside_welfare_scope` |
| `company_program_id` | Reference to the company's configured welfare program |
| `worker_scope` | Worker category/cohort scope (pseudonymized reference) |
| `service_id` | Reference to the specific service in the KORA catalog |
| `partner_id` | Reference to the certified partner providing the service |
| `fiscal_perimeter` | Fiscal/budget perimeter under which this event is classified |
| `eligibility_status` | Eligible / Conditional / Uncertain / Excluded (as defined in doc 04 and doc 05) |
| `eligibility_confidence` | Advisor-Confirmed / KORA Advisor-Confirmed / Partner-Documented / Partner-Declared / KORA-Inferred / Pending Review / Outdated—Requires Review (as defined in doc 05) |
| `required_documents` | List of document types required for audit trail completeness |
| `payroll_relevance` | Whether this event affects the worker's payslip |
| `tax_benefit_relevance` | Whether this event activates or affects a tax-advantaged benefit |
| `accounting_treatment` | Reference to the chart of accounts classification (KORA Fees class 70, FUO class 90) |
| `jurisdiction` | Country/jurisdiction for which this classification applies |
| `effective_date` | Date from which this classification is effective |
| `review_date` | Date by which this classification must be reviewed (fringe threshold change, legislation update, etc.) |
| `methodology_version` | Version of the KORA methodology under which this record was produced |
| `audit_trail_reference` | Unique UUID of the log entry in the KORA audit trail |

---

## 8. Eligibility Status vs Eligibility Confidence vs Guardrails Result

These three concepts are distinct and must never be merged. They were defined in docs 04 and 05 and are reaffirmed here in the economic/fiscal context.

### Eligibility Status
*The classification itself — what has been determined.*

| Status | Meaning |
|---|---|
| `Eligible` | Compatible with this fiscal/budget perimeter. Standard documentation requirements apply. |
| `Conditional` | Compatible only if specific conditions are met. Conditions must be confirmed by advisors before activation. |
| `Uncertain` | Not clearly established by the applicable framework. Advisor consultation recommended before activation under tax-advantaged perimeter. |
| `Excluded` | Not eligible under this specific perimeter. May be available under another perimeter. |

### Eligibility Confidence
*The reliability of the classification — how well-supported it is.*

| Level | Source |
|---|---|
| `Advisor-Confirmed` | Reviewed and confirmed by a qualified advisor engaged by the company |
| `KORA Advisor-Confirmed` | Reviewed and confirmed by a KORA-authorized advisor |
| `Partner-Documented` | Supported by formal partner documentation (compliance statement, tax opinion summary) |
| `Partner-Declared` | Declared by the partner without supporting documentation — not independently verified |
| `KORA-Inferred` | Inferred by KORA from taxonomy rules — useful as starting point; not sufficient for audit purposes |
| `Pending Review` | Review submitted but not yet completed — do not activate under tax-advantaged perimeter |
| `Outdated — Requires Review` | Previously confirmed but rendered potentially stale by a triggering event |

### Guardrails Result
*The operational decision for a specific transaction, event, or service activation.*

| Result | Meaning |
|---|---|
| `approved` | All controls passed. Transaction authorized. |
| `approved_with_warning` | Transaction authorized but with one or more warnings (threshold approaching, document pending confirmation) |
| `blocked` | At least one critical control failed. Transaction not executed. |
| `requires_advisor_validation` | Category in `da_validare` state. Cannot be processed as welfare without written advisor opinion. |
| `requires_payroll_review` | High payroll relevance or threshold breach requiring immediate consulente del lavoro communication |
| `outside_welfare_scope` | Event/service not in any configured welfare category. Registered as algorithmic data only. |

**The critical distinction:** Eligibility Status is the classification. Eligibility Confidence is the reliability of that classification. Guardrails Result is the operational action taken on a specific transaction. These are three separate attributes of every event. A service may be `Eligible` (status) with `Partner-Declared` confidence (low reliability) and result in `approved_with_warning` (guardails outcome signaling the advisor review need). Do not flatten these into a single indicator.

---

## 9. Fiscal Guardrails Engine

The Fiscal Guardrails Engine (FGE) is the KORA software component that applies a configurable sequence of fiscal and operational controls before authorizing any event or transaction. It operates as a fail-safe system: when in doubt, it blocks, warns, or escalates. It never silently approves.

**The FGE is not a tax advisor.** It implements the rules that advisors have validated and configured. It does not replace professional judgment. It enforces documented rules and creates the audit trail.

The FGE does not produce Impact Units. It governs fiscal and policy correctness. These are separate functions.

### 9.1 Control Sequence — 12 Steps

**Step 1 — Identify fiscal category**
*Purpose:* Confirm the service/event belongs to a configured fiscal category in the company's program.
*Input:* Service ID, company program configuration.
*Output:* `fiscal_category`, `fiscal_subcategory` assigned.
*Failure mode:* Category absent or `da_validare` for critical categories → `requires_advisor_validation` or `blocked`.

---

**Step 2 — Verify budget availability**
*Purpose:* Confirm the allocated FUO (company segregated fund allocation or worker personal fund allocation) has sufficient balance for the transaction.
*Input:* Transaction amount, current FUO balance for the category.
*Output:* Available / Insufficient / Partial.
*Failure mode:* Insufficient balance → `blocked` or partial approval with notification.

---

**Step 3 — Check individual worker cap (plafond)**
*Purpose:* Verify the transaction does not exceed the worker's individual annual or monthly cap for this category.
*Input:* Transaction amount, cumulative YTD spend per worker per category.
*Output:* Within cap / Exceeds cap.
*Failure mode:* Exceeds cap → `blocked` with remaining balance indicated.

---

**Step 4 — Check fringe benefit threshold**
*Purpose:* For events with `fringe_threshold_relevance=true`, verify the worker's cumulative fringe benefit total does not exceed the annual threshold (to be updated annually by the company's advisor).
*Input:* Transaction amount, worker's YTD fringe cumulative, configured annual threshold.
*Output:* Within threshold / Approaching threshold / Exceeded.
*Failure mode:* Approaching (≥80%) → `approved_with_warning`. Exceeded → `blocked` or `requires_payroll_review`.

---

**Step 5 — Verify homogeneous worker category (categoria omogenea)**
*Purpose:* Confirm the worker belongs to the homogeneous category authorized for this program and for these specific service categories. Required for Art. 51 TUIR welfare qualification.
*Input:* Worker category ID, program eligibility rules.
*Output:* Authorized / Not authorized.
*Failure mode:* Worker outside authorized category → `blocked`.

---

**Step 6 — Verify partner authorization**
*Purpose:* Confirm the partner is certified, active, and authorized for the specific `fiscal_category` of the requested service.
*Input:* Partner ID, fiscal_category, partner certification status.
*Output:* Authorized / Not authorized.
*Failure mode:* Partner not authorized for this category → `blocked` with suggested alternative.

---

**Step 7 — Verify probatory document availability**
*Purpose:* Confirm the partner is configured to provide the required document type (`partner_document_required_flag`) for this service category.
*Input:* Partner ID, service ID, `partner_document_required_flag`.
*Output:* Document available / Not configured.
*Failure mode:* Partner not configured for required document → `blocked`.

---

**Step 8 — Non-convertibility check**
*Purpose:* Verify the service or event does not create a freely convertible cash availability for the worker. Mandatory for all welfare categories.
*Input:* Service structure, transaction type.
*Output:* Non-convertible confirmed / Convertibility risk detected.
*Failure mode:* Any transaction that results in worker's ability to freely convert to cash → `blocked` regardless of all other controls.

---

**Step 9 — Verify worker beneficiary traceability**
*Purpose:* Confirm the worker beneficiary is pseudonymously identified, their category is recorded, and the transaction log is complete.
*Input:* Worker pseudonymized ID, category assignment.
*Output:* Complete / Incomplete.
*Failure mode:* Worker not identified → `blocked`.

---

**Step 10 — Payroll relevance check**
*Purpose:* Add payroll flag to log and Welfare Statement for events with `payroll_relevance_flag=true`. Escalate if threshold breach requires immediate payroll communication.
*Input:* Event type, `payroll_relevance_flag`.
*Output:* Payroll flag set / Requires immediate communication.
*Failure mode:* Immediate payroll communication required → `requires_payroll_review`.

---

**Step 11 — Welfare Statement compatibility check**
*Purpose:* Confirm the event is correctly configured to appear in (or correctly excluded from) the monthly Welfare Statement.
*Input:* `welfare_statement_flag`, event category.
*Output:* Compatible / Mismatch.
*Failure mode:* Mismatch between category and Statement configuration → `approved_with_warning` with flag.

---

**Step 12 — Advisor validation status check**
*Purpose:* For categories with `tax_treatment_status=da_validare` or `fiscal_validation_status=validation_pending`: block processing as welfare until a written advisor opinion updates the status to `validated`.
*Input:* `tax_treatment_status`, `fiscal_validation_status`.
*Output:* Validated / Pending.
*Failure mode:* Category not validated → `requires_advisor_validation`. Event may be logged as `outside_welfare_scope` or deferred.

---

### 9.2 Guardrails Outcomes

| Outcome | Operational action |
|---|---|
| `approved` | Transaction authorized. In the target architecture, a technical payout instruction is transmitted to the regulated payment institution. Audit trail updated. Welfare Statement updated. |
| `approved_with_warning` | Transaction executed with warning flag. Company and consulente del lavoro notified. Warning details logged. |
| `blocked` | Transaction not executed. Worker receives reason. No payout instructed. Specific block reason logged in audit trail. |
| `requires_advisor_validation` | Transaction suspended. Alert sent to KORA and company to initiate validation. Processable only after advisor update. |
| `requires_payroll_review` | Transaction suspended or executed (per configuration) with mandatory review flag for consulente del lavoro. |
| `outside_welfare_scope` | Event registered as algorithmic data (may contribute to KORA Index if it is a verified action). No welfare financial flow. No Welfare Statement entry. |

---

## 10. Welfare Statement

The Welfare Statement is the monthly structured output produced by KORA for each company client, in payroll-ready format for the company's consulente del lavoro. It supports reconciliation, payroll processing, and the audit documentation package.

**The Welfare Statement is not:**
- A professional tax opinion
- Certification of fiscal treatment of any benefit
- A legally binding fiscal document
- An individual employee privacy exposure

**Mandatory disclaimer (must appear on every Welfare Statement):**
*"This Welfare Statement is a support document for accounting and payroll reconciliation. The fiscal classifications indicated reflect the welfare program configuration declared by the Company and validated by its advisors (commercialista welfare, consulente del lavoro). KORA does not certify the fiscal treatment of benefits. The Company and its advisors remain responsible for the correctness of the fiscal qualification of benefits distributed to employees."*

### 10.1 Welfare Statement Fields

| Field | Source | Notes |
|---|---|---|
| Company | System | Legal name of the company client |
| Period | System | Month/year of reference. Competence follows service delivery date, not payment date. |
| Worker identifier | KORA pseudonymization | Pseudonymized — not name/surname. The consulente del lavoro de-pseudonymizes with their own key in agreement with the company. Validated with DPO. |
| `fiscal_category` | Program configuration | Main fiscal category (e.g., `welfare_51tuir`, `fringe_benefit`) |
| `fiscal_subcategory` | Program configuration | Specific subcategory (e.g., `sanita_integrativa`) |
| `funding_source` | Guardrails automatic | `company_funded`, `co_funded`, `employee_funded`. Co-funded shows both quotas separately. |
| `budget_owner` | Program configuration | Which company budget (welfare, HR, training, HSE) |
| Partner | KORA database | Registered name of the certified partner |
| Service | Booking + partner config | Description of the service and fiscal category |
| Service delivery date | System log | Actual delivery date |
| Total service amount | Authorized transaction | Gross amount. If co-funded: total. |
| Company quota (FUO) | Guardrails — flow separation | Company-funded portion |
| Worker quota (personal) | Worker personal fund allocation (target: sub-wallet at regulated payment institution — subject to PSD2/legal review) | Worker-funded portion (co-funded or employee-paid). Separated from company quota. |
| Document type | Partner configuration | Type of probatory document (fattura, attestato, dichiarazione). Reference to document in audit trail. |
| `fiscal_validation_status` | Category configuration | `validated`, `validation_pending`, `requires_review` |
| `guardrail_result` | Guardrails automatic | Only `approved` or `approved_with_warning` entries appear in Welfare Statement |
| `payroll_relevance` | Category config + Guardrails | `true/false/conditional` — indicates whether event affects payslip |
| `fringe_threshold_contribution` | Guardrails automatic | Amount added to worker's YTD fringe cumulative |
| Advisor validation notes | System | Auto-generated notes for events with warnings, payroll relevance, or required reviews |
| **Limitations / Mandatory disclaimer** | KORA system | Disclaimer text required on every Welfare Statement |

---

## 11. Critical Legal/Fiscal Risks

The following risks must be understood, mitigated, and advisor-reviewed before any operational fiscal or payment feature is activated in KORA. Foundation Light is not immune to all of these — some apply even at the classification/reporting level.

**Risk 1 — FUO misclassified as KORA revenue**
*Description:* Company welfare budget flows are treated as KORA income in financial reporting or accounting.
*Why it matters:* VAT at 22% on the full transaction volume, plus penalties. On a FUO of €5–25M at scale, this represents €1–5M in potential tax exposure.
*Mitigation:* Strict accounting separation: FUO in class 90 (conti d'ordine), KORA Fees in class 70 (revenue). FUO never transit through KORA operational account. Quarterly reconciliation reviewed by commercialista.
*Required advisor review:* Commercialista welfare — mandatory before any FUO flows.

---

**Risk 2 — VAT/IVA exposure on full transaction volume if KORA treated as seller/intermediary**
*Description:* If KORA is characterized as purchasing partner services and reselling them (rather than providing a technical instruction to a payment institution), the full value of partner services becomes VAT-taxable at 22% as KORA supply.
*Why it matters:* Completely changes KORA's financial model. Makes KORA economically unviable as a large-scale orchestrator.
*Mitigation:* Contractual language must clearly describe KORA as technical instruction layer, not buyer-reseller. SVAM Variant A (no fund handling) eliminates this risk. Variants B–D require specific commercialista opinion.
*Required advisor review:* Commercialista welfare and legal advisor — mandatory for any model beyond Variant A.

---

**Risk 3 — PSD2/payment institution risk**
*Description:* If KORA holds, routes, or temporarily controls client funds, it may be characterized as a de facto payment institution under EU PSD2 framework, requiring authorization, regulatory capital, and AML/KYC compliance.
*Why it matters:* Unauthorized operation as a payment institution is a criminal offense in most EU jurisdictions. Requires significant capital, infrastructure, and licensing time to remediate.
*Mitigation:* The target architecture avoids this risk by having FUO held at a regulated payment institution (istituto di pagamento partner) in a segregated structure, with KORA transmitting only technical payout instructions and no KORA account ever receiving or holding FUO. This architecture is the preferred model — its legal qualification and exact custody structure must be validated by PSD2/payment regulation advisor before any fund flows are activated.
*Required advisor review:* PSD2/payment regulation advisor — mandatory before any payment infrastructure is designed.

---

**Risk 4 — Loss of client's welfare tax benefit**
*Description:* If the company's welfare program is structurally incorrect (wrong category, convertible benefits, missing homogeneous category compliance, threshold exceeded), the entire welfare program may be reclassified as taxable salary for workers.
*Why it matters:* Payroll tax and social security contributions on full welfare amounts, retroactively, for all workers in the program. Severe reputational and financial damage to client company. Indirectly damages KORA's commercial credibility.
*Mitigation:* Fiscal Guardrails Engine enforces compliance controls. Advisor validation required before any welfare category is activated. Annual threshold update process.
*Required advisor review:* Commercialista welfare and consulente del lavoro — mandatory for each welfare category activated.

---

**Risk 5 — Payroll misclassification**
*Description:* Events that generate payroll relevance (fringe benefit threshold breach, specific welfare categories) are not correctly communicated to the company's consulente del lavoro and are therefore missing from the payslip.
*Why it matters:* Tax and contribution discrepancies on payroll, audit exposure, potential penalties for the company.
*Mitigation:* `payroll_relevance_flag` on all relevant events. Welfare Statement produced in payroll-ready format and delivered by the 5th business day of the following month. Procedural agreement with consulente del lavoro at program onboarding.
*Required advisor review:* Consulente del lavoro — required at program setup and whenever payroll-relevant categories are modified.

---

**Risk 6 — Fringe benefit threshold breach**
*Description:* Worker's cumulative fringe benefit exceeds the annual threshold. The excess becomes taxable for the worker with social security contributions.
*Why it matters:* Unexpected taxable income for workers. Company must communicate to payroll immediately. Failure creates retroactive liability.
*Mitigation:* Per-worker cumulative monitoring by Guardrails Engine. Alert at 80% and 95% of threshold. Block or `requires_payroll_review` at 100%. Annual threshold update from commercialista/consulente del lavoro.
*Required advisor review:* Annual formal communication of current year threshold from company's advisors.

---

**Risk 7 — Co-funded service accounting errors**
*Description:* Company quota and worker quota in a co-funded service are not separately tracked, resulting in the worker's personal contribution being treated as company welfare.
*Why it matters:* Risk of fiscal reclassification. Worker's personal contribution is not welfare; treating it as such creates incorrect fiscal reporting.
*Mitigation:* Technical separation of flows at payment institution level. Welfare Statement explicitly shows both quotas separately. Guardrails Engine maintains separate tracking.
*Required advisor review:* Commercialista welfare — specific opinion on co-funded structure. PSD2 advisor — technical wallet separation.

---

**Risk 8 — Sensitive data leakage through fiscal reporting**
*Description:* Welfare Statement or other KORA fiscal output exposes individual health data, psychological support details, or other sensitive categories by naming services with sufficient specificity to identify personal conditions.
*Why it matters:* GDPR Art. 9 violation. Significant individual privacy harm. Potential regulatory penalties and loss of trust.
*Mitigation:* Worker identifiers in Welfare Statement are pseudonymized. Service descriptions in externally visible outputs should avoid identifying specific health conditions. DPO review of all Welfare Statement field content.
*Required advisor review:* DPO/privacy advisor — mandatory before Welfare Statement design is finalized.

---

**Risk 9 — Partner invoice/rebilling ambiguity**
*Description:* The structure by which partners issue fiscal documents (to KORA, to the company, or as credit notes) is not clearly defined, creating confusion about VAT obligations and who is the fiscal supplier.
*Why it matters:* Incorrect VAT characterization across the chain. Audit exposure for KORA and the company.
*Mitigation:* SVAM billing variant (A, B, or C) must be chosen and documented before any partner invoicing. Each variant has specific contractual language. Commercialista welfare must validate the chosen variant.
*Required advisor review:* Commercialista welfare — mandatory. Legal advisor — for contractual language in Partner Agreement.

---

**Risk 10 — KORA appearing to give tax advice without advisor validation**
*Description:* KORA's fiscal classification outputs, guardrails results, or Welfare Statement language is interpreted by clients as a professional tax opinion from KORA.
*Why it matters:* Unauthorized provision of professional tax advice (abuso della professione). Liability for incorrect classifications. Loss of client trust if audit contradicts KORA's apparent advice.
*Mitigation:* Mandatory disclaimer on all fiscal outputs. Welfare Statement disclaimer text (see Section 10). MSA clause explicitly stating that KORA does not certify fiscal treatment. Training for KORA commercial team to never describe outputs as tax advice.
*Required advisor review:* Legal advisor — disclaimer language review.

---

**Risk 11 — KORA collecting/holding funds without proper structure**
*Description:* KORA temporarily or permanently holds company welfare funds, worker funds, or partner payouts in KORA's own accounts.
*Why it matters:* Immediate PSD2 risk (unauthorized payment institution). FUO characterized as KORA revenue (VAT). Company and worker funds at risk if KORA has operational difficulties.
*Mitigation:* Absolute rule: FUO must never transit through KORA's operational account — this principle is non-negotiable regardless of the structural model chosen. The target architecture uses a regulated payment institution holding third-party funds in a segregated structure, so that KORA never acts as custodian of third-party funds. The exact custody model must be validated by PSD2 advisor and commercialista welfare before any fund flows are activated.
*Required advisor review:* PSD2/payment regulation advisor and commercialista welfare — mandatory.

---

**Risk 12 — KIP/territorial pledge creating payment intermediation risk**
*Description:* KORA collects KIP pledges from companies and redistributes them to territorial projects, creating a de facto payment intermediation flow.
*Why it matters:* PSD2 risk if KORA handles KIP funds. Charitable/donation law implications. Possible characterization as financial intermediary.
*Mitigation:* KIP financial flows must be direct: company → territorial project / ETS, without KORA as financial intermediary. KORA tracks commitment, evidence, and impact only. KORA may charge a KIP tracking/reporting fee, which is KORA revenue.
*Required advisor review:* Legal advisor — KIP structure. PSD2 advisor — confirm KORA does not handle KIP funds.

---

## 12. KORA Impact Pledge and Territorial Project Flows

KORA Impact Pledge (KIP) is a future layer. It is not included in Foundation Light.

**KIP definition:** A formal company commitment to contribute resources (funds, worker time, corporate capacity) to a territorial or social project, with evidence tracking of execution quality and worker participation.

**KIP financial flow principle:**
- The KIP financial contribution (company → territorial project / ETS) is **direct**. It does not flow through KORA.
- KORA does not collect KIP funds. KORA does not redistribute KIP funds. KORA is not a financial intermediary for KIP.
- KORA tracks: the pledge commitment, execution evidence, worker participation, and contribution quality.
- KORA may charge a KIP tracking and reporting fee (KORA Fee), which is separate from the KIP financial pledge.

**KIP and Impact Units:**
- The KIP financial pledge amount does not generate Impact Units.
- Worker verified participation in KIP activities (e.g., verified volunteering events) generates IU through the standard UEF → NM → BC → IU pipeline.
- Verified KIP-related worker events are logged as `csr_esg` category non-monetary or low-payment events.

**KIP and KORA Contribution:**
- KIP evidence may feed KORA Contribution (SE component — social externality), not KORA Index.
- KIP must be verified to contribute to KORA Contribution. Unverified pledges do not.

**KIP privacy:**
- Worker participation in KIP activities must pass through UEF pseudonymization before contributing to PIB or KORA Index.
- Worker-level KIP participation data is pseudonymized. Company sees only aggregated indicators.

**KIP regulatory risk avoidance:**
- KORA must never instruct workers or companies to route KIP funds through KORA accounts.
- Pledge mechanics must clearly specify direct company-to-project payment.
- Legal advisor must review KIP contract structure before any KIP module is built.

---

## 13. Relationship to KORA Index

The following do not directly affect the KORA Index:

| Element | Status relative to KORA Index |
|---|---|
| Welfare budget amount (FUO) | **No direct effect.** Input only. |
| Training budget amount | **No direct effect.** Input only. |
| Partner payout volume | **No direct effect.** Not an impact indicator. |
| Worker top-up amount | **No direct effect.** Input only. |
| Fiscal category activated | **No direct effect.** Classification only. |
| Guardrails approval | **No direct effect.** Compliance control only. |
| Welfare Statement completion | **No direct effect.** Governance output only. |
| KIP pledge amount | **No direct effect.** Commitment only. |
| Number of fiscal categories activated | **No direct effect.** |
| Eligibility Confidence level | **No direct effect** on KORA Index. Affects data quality assessment. |
| SVAM adoption | **No direct effect.** Administrative model only. |

**What does affect the KORA Index:**
Only verified human actions that generate Impact Units through the UEF → NM → BC → CQ → EV → CF → AGF [× DF] [× EXF] [× SF] pipeline → PIB aggregation → Company Aggregation → Activation Safeguard → KORA Index Engine.

**Indirect effect:** Financial/fiscal layers may indirectly influence the KORA Index only insofar as they enable real verified actions. A company that successfully operationalizes a wellbeing program (welfare_51tuir category, verified usage) will see more verified actions, more IU, and — if activation rates are sufficient — a higher KORA Index. The connection is: budget → program → verified activation → IU → KORA Index. Not: budget → KORA Index.

---

## 14. Relationship to KORA Contribution, Ecosystem Reach and Value Chain

**KORA Contribution** (`KC = 100 × (CR^0.25 × VCQ^0.30 × SE^0.25 × CT_c^0.20)`):
- Verified social/territorial evidence (SE component) may incorporate verified KIP-related worker participation.
- KIP financial pledge alone does not contribute to KC.
- Contribution event formats (CEF) track collective/territorial programs separately from UEF.
- Financial/fiscal category does not determine KC.

**KORA Ecosystem Reach** (`KER`):
- Measures geographic/sector coverage and availability of partner network.
- Partner payout volume or fiscal categories activated do not themselves increase KER.
- KER is a platform coverage indicator, not an impact indicator.

**KORA Value Chain** (`KVC = 100 × (VCA^0.25 × NQ^0.30 × VRD^0.30 × TPC^0.15)`):
- Measures quality and depth of KORA's partner relationships.
- Fiscal category or FUO volume do not directly create KVC value.
- KVC depends on partner validation quality, network depth, geographic coverage, and timeliness.

**The principle:** Financial governance indicators (FUO, partner payouts, fiscal category count) are operational metrics for the financial governance layer. They are not inputs to impact, contribution, reach, or value chain indicators unless tied to verified actions or verified relationships.

---

## 15. Foundation Light Treatment

Foundation Light is the first sellable KORA product. In the economic/fiscal dimension, it covers what is possible with existing company data and no live payment infrastructure.

**Foundation Light includes:**
- Classification of existing company spend by fiscal/budget category
- FUO vs KORA Fees conceptual separation and tagging
- Pillar mapping of classified spend (LIFE / GROWTH / CONNECTION / IMPACT / LEGACY)
- Fiscal category identification (which of the 9 categories applies to each spend line)
- Eligibility status assignment (Eligible / Conditional / Uncertain / Excluded)
- Eligibility confidence level (based on documentation quality of ingested data)
- Basic mismatch warnings (initiatives classified under a perimeter that may not align with their impact or fiscal category)
- Missing classification warnings
- Basic spend-to-impact analysis (budget allocated vs. verified actions generated)
- Pillar vs. fiscal category matrix

**Foundation Light does not include:**
- Live payment orchestration or FUO handling
- Live partner payout execution
- Worker sub-wallet or top-up functionality
- Automated Fiscal Guardrails Engine enforcement (guardrails are analysis, not enforcement)
- Final tax advice or fiscal certification of any kind
- Definitive welfare compliance certification
- Co-funded or employee-paid flow handling
- KIP financial flow management

**Foundation Light outputs:**
- Impact Report (KORA Index, pillar balance, activation rate)
- Financial Governance Summary (budget allocated by fiscal category and pillar, spend-to-impact ratio, cost per estimated IU)
- Fiscal Classification Map (which spend falls in which fiscal/budget category, with confidence levels)
- Eligibility Confidence Map (distribution of data quality across fiscal categories)
- Mismatch Warnings (initiatives classified incorrectly or with low confidence)
- Advisor Review Checklist (which categories require professional validation before operationalizing)

---

## 16. Future Tier Treatment

### Foundation Tier
- Partner and service catalog linked to fiscal categories (each service carries fiscal eligibility profile)
- Recurring eligibility classification with version control
- Structured advisor review workflow (company advisors can update classifications in the platform)
- Partner documentation collection (attach probatory documents to partner profile)
- Basic fringe benefit threshold monitoring

### Governance Tier
- Full Fiscal Guardrails Engine enforcement (operational blocking and warning, not just analysis)
- Live per-worker cumulative tracking (fringe threshold, plafond)
- Welfare Statement generation (monthly, payroll-ready)
- Payroll/advisor export integration
- Full audit trail with FGE log per transaction
- Budget allocation simulation by fiscal category and pillar
- Partner payout governance (if legally validated)
- Policy rules engine (spending caps, eligible worker categories, approved providers)

### Certified Tier
- Advisor/auditor validation workflow with formal confirmation records
- Enhanced evidence package (methodology report, eligibility confidence distribution, audit trail completeness scoring)
- Formal methodology review of fiscal classification coherence
- Fiscal/documentation completeness scoring
- External review of SVAM compliance
- Public status only where legally safe

### Ecosystem / Future
- Live PSP integrations (istituto di pagamento partner — Variant B operational)
- Automated payout flows (only after full legal/PSD2 validation)
- Worker top-up flows (sub-wallet, co-funded)
- KIP territorial project flow tracking (full module)
- Advanced Value Chain and Contribution modules
- Territory intelligence with fiscal/impact cross-referencing

---

## 17. Advisor Validation Requirements

The following professional validations are required before any operational payment or fiscal feature is activated. Foundation Light analysis/reporting may proceed without most of these. Operational program management and payment flows require them all.

### Commercialista Welfare (Welfare Tax Advisor)

**Must validate:**
- FUO qualification (welfare budget as non-KORA-revenue under all SVAM variants)
- SVAM billing variant (A, B, or C) — fiscal robustness of each
- Whether rebilling structure generates gross revenue in KORA or is a pass-through
- Chart of accounts configuration (KORA Fees class 70, FUO class 90)
- Fiscal category qualification for each of the 9 categories
- Annual fringe benefit threshold — formal written communication at start of each fiscal year
- Co-funded structure: whether company quota retains welfare treatment when worker co-pays
- Employee-paid / worker top-up: VAT treatment of KORA service fee
- Orchstration/centralization fee VAT treatment (risk of financial intermediation characterization)
- Type of probatory document required for each welfare service category

**When required:** Before any FUO flows. Mandatory. Annual review for fringe threshold.

**Foundation Light can proceed without:** Full FUO flow validation. But must have basic category classification validated before recommending clients activate any welfare category.

---

### Consulente del Lavoro (Labor Law Advisor)

**Must validate:**
- Art. 51 TUIR application: homogeneous category compliance, non-convertibility requirements
- Welfare Statement integration with payroll process: which fields impact payslip, timing requirements
- Which events have `payroll_relevance_flag=true`
- How to handle fringe threshold breach mid-year: communication flow between KORA, company, and consulente
- Co-funded payroll treatment: how to represent company and worker quotas in payslip
- Non-convertibility clauses in company's welfare regulations

**When required:** At first live welfare program configuration. Mandatory. Annual review for threshold updates.

**Foundation Light can proceed without:** Live payroll integration. But must not advise on payroll treatment of specific categories without consulente review.

---

### Legal Advisor (MSA Structure, Fiscal Positioning, Liability Clauses)

**Must validate:**
- KORA MSA contract structure (SVAM clauses: administrative centralization, technical instruction language, non-custody)
- Fiscal disclaimer language for Welfare Statement and all KORA outputs
- Partner Agreement: partner documentation obligation without KORA assuming fiscal liability
- Liability limitation clauses in case of client program misconfiguration
- KIP legal structure: direct company-to-project flows, avoiding intermediation characterization
- Anti-trust compliance in partner network structure (pricing, exclusivity, conduct)

**When required:** Before any commercial contracts are executed using SVAM language. Mandatory.

**Foundation Light can proceed without:** Full SVAM legal opinion. But must not execute contracts implying fund management or fiscal certification without legal review.

---

### PSD2/Payment Regulation Advisor

**Must validate:**
- KORA qualification as non-payment institution in chosen SVAM model
- Technical instruction model: does "configuring and transmitting payout instructions" to payment institution avoid PSD2 characterization?
- Escrow segregation at payment institution: correct configuration to qualify FUO as non-KORA-revenue
- Technical separation of co-funded flows at payment institution
- Employee-paid top-up flows: separate PSP or same payment institution?
- KIP flow: whether any KORA involvement creates PSD2 risk
- PSD3/PSR evolution: impact assessment

**When required:** Before any payment infrastructure is designed or implemented. Mandatory for Variants B, C, D.

**Foundation Light can proceed without:** Full PSD2 validation. Foundation Light has no payment infrastructure.

---

### DPO / Privacy Advisor

**Must validate:**
- Welfare Statement pseudonymization structure: GDPR compliance, key-holding arrangement with consulente del lavoro
- Art. 9 GDPR (special categories): legal basis for processing health data (supplementary healthcare, wellbeing services, psychological support)
- Consent structure for worker participation tracking (explicit consent for sensitive categories)
- No-payment event tracking (mentoring, volunteering): GDPR basis, transparency obligations
- Employee-paid data: B2C direct relationship — Privacy Policy, retention rights, data subject rights
- DPIA scope: which KORA processing activities require Data Protection Impact Assessment
- Data transfer provisions: Stripe (USA), HRIS platforms (where applicable)

**When required:** Before Welfare Statement goes to production. Before any sensitive category (health, psychological support) is tracked. Mandatory.

**Foundation Light can proceed without:** Full DPO validation for all features. But must have DPO review of any Foundation Light output that contains pseudonymized worker data or references health/wellbeing categories.

---

### Accounting Advisor

**Must validate:**
- KORA chart of accounts: complete structure separating class 70 (revenues), class 90 (FUO/conti d'ordine), classes 60–68 (KORA costs)
- Competence rule for fringe benefit (calendar year, not fiscal year)
- Partner billing cost treatment in KORA P&L (payment institution costs as KORA operational costs)
- Investor metrics: ARR, FUO orchestrated, AUM-equivalent — correct presentation and separation

**When required:** Before any FUO flows or investor reporting that includes FUO metrics. Mandatory.

---

## 18. Economic/Fiscal Outputs

KORA produces the following official economic/fiscal outputs at different tiers:

| Output | Purpose | Audience | Tier | Privacy sensitivity | Type |
|---|---|---|---|---|---|
| **Financial Governance Summary** | Overview of budget allocated by fiscal category and pillar, spend-to-impact analysis | CHRO, CFO, Leadership | Foundation Light+ | Low (aggregated) | Report-only |
| **FUO / KORA Fees Separation Statement** | Explicit separation of KORA revenue from managed funds | CFO, Investor, Accounting | Foundation+ | Low | Report + accounting input |
| **Fiscal Classification Map** | Spend classified by fiscal category, with eligibility status and confidence levels | CHRO, HR, Legal | Foundation Light+ | Low (aggregated) | Report-only |
| **Eligibility Confidence Map** | Distribution of data quality across fiscal categories and services | HR, Compliance, Advisor | Foundation Light+ | Low | Report-only |
| **Guardrails Warning Report** | Events flagged by FGE (warnings, blocks, pending validations) | HR, Legal, Compliance | Governance | Medium (company-facing) | Operational |
| **Welfare Statement** | Monthly payroll-ready rendicontazione per worker category | Consulente del lavoro, Payroll | Governance | High (pseudonymized workers) | Operational |
| **Advisor Validation Checklist** | List of categories/services requiring professional validation before activation | CHRO, HR, External advisor | Foundation Light+ | Low | Report-only |
| **Risk Map** | Identified fiscal, payment, and compliance risks with mitigation status | Legal, CFO, Compliance | Governance+ | Medium | Report-only |
| **Spend-to-Impact Report** | Budget allocation vs. verified actions generated vs. Impact Units produced | CHRO, CFO, Leadership | Foundation Light+ | Low (aggregated) | Report-only |
| **Partner Efficiency Report** | Cost per IU by partner, pillar, fiscal category | CHRO, CPO, Procurement | Foundation+ | Low | Report-only |
| **Contribution/KIP Evidence Summary** | Verified evidence of territorial/social contribution tied to KIP | CSR, Sustainability, CHRO | Governance+/Future | Low | Report-only |

---

## 19. Implementation Implications for Future Technical Data Model

Document 12 (Technical Data Model & Database Schema) must support the following elements arising from this economic/fiscal architecture. Schema design must consult this document alongside doc 10 (Architecture v3) before finalizing any table structure.

**Enumerations required:**
- `fiscal_category`: 9 values as defined in Section 6
- `funding_source`: `company_funded`, `employee_funded`, `co_funded`, `no_payment`
- `eligibility_status`: 4 values as defined in Section 8
- `eligibility_confidence`: 7 levels as defined in Section 8
- `guardrail_result`: 6 outcomes as defined in Section 9
- `tax_treatment_status`: `agevolato_51tuir`, `agevolato_entro_soglia`, `non_agevolato`, `da_validare`, `fuori_perimetro`
- `fiscal_validation_status`: `validated`, `validation_pending`, `requires_review`, `not_applicable`
- `payment_flow_type`: `fuo_company`, `fuo_worker`, `co_funded`, `no_payment`, `employee_topup`

**Tables / entity groups required:**
- `financial_programs` — company program configurations with fiscal perimeter settings
- `financial_budgets` — budget allocations per company per fiscal category per period
- `financial_movements` — individual financial transactions/bookings with full fiscal classification fields
- `fuo_records` — FUO entries (segregated from KORA revenue records)
- `kora_fee_records` — KORA revenue records (class 70)
- `partner_payout_records` — payout instructions and confirmations (class 90)
- `worker_topup_records` — worker personal top-up flows (future, class 90)
- `co_funded_splits` — split tracking for co-funded transactions
- `welfare_statements` — monthly Welfare Statement records
- `fiscal_guardrail_checks` — FGE check log per transaction (immutable)
- `advisor_validation_records` — professional opinion references with dates and advisors
- `required_document_records` — document requirements and fulfillment status per event/category
- `audit_trail` — immutable event log (combines impact events and fiscal events)
- `fringe_threshold_tracking` — per-worker cumulative fringe tracking per year
- `eligibility_classification_versions` — versioned eligibility records with full history
- `fiscal_policy_rules` — company-configured policy rules (caps, eligible categories, document requirements)

**Separation architecture (mandatory):**
The schema must preserve strict separation between:
- Financial/fiscal records and impact scoring records — these must not be in the same tables
- KORA revenue records and FUO/managed fund records — different table families, different accounting classes
- Company FUO segregated account and worker personal sub-wallet (target architecture, subject to PSD2/legal review) — different entities
- Partner payouts and KORA fees — never mixed
- Welfare Statement data and KORA Index data — separate schemas

---

## 20. Open Questions Before Payment/Fund Implementation

The following questions must be resolved — through professional advisor opinions — before any operational payment or fund management feature is built or activated:

1. **Partner invoicing structure:** Can KORA invoice partner services to companies without losing the client's welfare tax benefit? Which SVAM billing variant (A, B, C) is fiscally most robust?

2. **Company fund receipt:** Can KORA receive company welfare budget deposits without being treated as a payment institution? What contractual and technical conditions are required?

3. **Optimal PSP model:** Which payment institution structure is safest for KORA's non-payment-institution qualification? What escrow structure is required?

4. **Revenue vs. pass-through boundary:** When does a flow constitute KORA revenue vs. a pass-through? What specific conditions determine the boundary?

5. **VAT application:** How should VAT be applied to: KORA subscription fees, orchestration fees, service fees on worker top-up, partner rebilling where applicable?

6. **Invoice chain:** Who issues which invoice to whom in each SVAM variant? Does the partner invoice KORA or the company? What is KORA's invoice to the company?

7. **Welfare category evidence requirements:** What specific documentary evidence is required for each of the 9 fiscal categories to support the qualification in a tax audit (AdE or ITL/INPS)?

8. **Co-funded service accounting:** How is the co-funded split between company and worker tracked in KORA's accounting? Who issues what invoice for each portion?

9. **Worker top-up treatment:** How is the worker's personal top-up handled from a VAT perspective? What privacy framework is required for the B2C relationship?

10. **KIP legal structure:** How should KIP be contractually structured to ensure it is a direct company-to-project flow without KORA intermediation? What documentation is needed to track verified impact without handling the financial flow?

11. **Automation vs. advisor review:** Which guardrail controls can be automated? Which must always be advisor-reviewed before activation?

12. **Foundation Light exclusions:** What specific features must be excluded from Foundation Light until the full advisor validation pack is obtained?

---

## 21. Founder Decision Set — Economic/Fiscal Baseline

The following decisions are approved as KORA's Foundation Light v0.1 economic/fiscal baseline. They define what KORA may and may not do during the first sellable phase. They do not authorize payment, wallet, FUO, partner payout, top-up, KIP, Welfare Statement, or Fiscal Guardrails operational implementation without the professional validations listed in Section 17.

This section records the approved baseline decisions for Foundation Light and early KORA operation. These decisions are operative defaults for Foundation Light v0.1. Each may be revised as legal/advisor input is received — revision requires explicit founder approval.

**Decision 1 — Foundation Light avoids payment intermediation.**
Foundation Light operates as an analysis, classification, reporting, and intelligence product. No live fund flows, no escrow, no partner payouts, no wallet management.
*Rationale:* Eliminates PSD2 risk, FUO misclassification risk, and legal complexity during the first commercial phase.
*Status:* Approved by Simone — Foundation Light v0.1 Economic/Fiscal Baseline
*Note:* Approved as Foundation Light v0.1 default. Subject to legal/tax/PSD2/privacy/accounting review where applicable before any operational implementation.

---

**Decision 2 — Foundation Light focuses on classification, intelligence, reporting, and warnings.**
The economic/fiscal layer in Foundation Light is a diagnostic and advisory tool: classify existing spend, identify mismatches, surface eligibility confidence levels, generate advisor review checklists.
*Rationale:* This is achievable with existing company data and no payment infrastructure. It delivers immediate commercial value.
*Status:* Approved by Simone — Foundation Light v0.1 Economic/Fiscal Baseline
*Note:* Approved as Foundation Light v0.1 default. Subject to legal/tax/PSD2/privacy/accounting review where applicable before any operational implementation.

---

**Decision 3 — KORA Fees are separated from FUO in all internal and external reporting from day one.**
Even before FUO flows exist, KORA's revenue reporting must be structured to maintain this separation so that the architecture is correct when FUO flows activate.
*Rationale:* Prevents confusion in investor materials and accounting from the first commercial transaction.
*Status:* Approved by Simone — Foundation Light v0.1 Economic/Fiscal Baseline
*Note:* Approved as Foundation Light v0.1 default. Subject to legal/tax/PSD2/privacy/accounting review where applicable before any operational implementation.

---

**Decision 4 — Partner payouts are not treated as KORA revenue unless legally structured and validated.**
Any model in which partner service values flow through KORA must be reviewed by commercialista and legal advisor before implementation.
*Rationale:* VAT/IVA exposure if partner services are treated as KORA supply. Revenue mis-characterization risk.
*Status:* Approved by Simone — Foundation Light v0.1 Economic/Fiscal Baseline
*Note:* Approved as Foundation Light v0.1 default. Subject to legal/tax/PSD2/privacy/accounting review where applicable before any operational implementation.

---

**Decision 5 — Worker top-up flows are a future feature, not Foundation Light.**
The employee-paid and co-funded categories require payment infrastructure and legal validation that is not part of Foundation Light.
*Rationale:* Eliminates B2C regulatory complexity and PSD2 risk from the first commercial phase.
*Status:* Approved by Simone — Foundation Light v0.1 Economic/Fiscal Baseline
*Note:* Approved as Foundation Light v0.1 default. Subject to legal/tax/PSD2/privacy/accounting review where applicable before any operational implementation.

---

**Decision 6 — KORA Impact Pledge (KIP) is a future feature, not Foundation Light.**
KIP requires legal structure for direct company-to-project flows and a verified evidence collection module. This is Ecosystem tier.
*Rationale:* Avoids payment intermediation risk and regulatory complexity.
*Status:* Approved by Simone — Foundation Light v0.1 Economic/Fiscal Baseline
*Note:* Approved as Foundation Light v0.1 default. Subject to legal/tax/PSD2/privacy/accounting review where applicable before any operational implementation.

---

**Decision 7 — Fiscal categories are configurable and advisor-validated, not auto-configured by KORA.**
KORA provides the infrastructure to map and govern fiscal categories. The categories themselves, and their fiscal qualification, are the company's responsibility with their advisors.
*Rationale:* Prevents unauthorized fiscal advice. Maintains KORA's role as program operator, not fiscal certifier.
*Status:* Approved by Simone — Foundation Light v0.1 Economic/Fiscal Baseline
*Note:* Approved as Foundation Light v0.1 default. Subject to legal/tax/PSD2/privacy/accounting review where applicable before any operational implementation.

---

**Decision 8 — Fiscal Guardrails Engine enforcement is Governance tier, not Foundation Light.**
Foundation Light produces fiscal mismatch warnings and advisor checklists. It does not actively block service activations or enforce fiscal rules in real time.
*Rationale:* Operational enforcement requires live fund flows and real-time program management — not available in Foundation Light.
*Status:* Approved by Simone — Foundation Light v0.1 Economic/Fiscal Baseline
*Note:* Approved as Foundation Light v0.1 default. Subject to legal/tax/PSD2/privacy/accounting review where applicable before any operational implementation.

---

**Decision 9 — Welfare Statement generation is Governance tier, not Foundation Light.**
Foundation Light may produce an advisory fiscal classification summary (clearly labeled as an analysis draft, not a payroll-ready document). Formal payroll-ready Welfare Statements are Governance tier.
*Rationale:* Payroll-ready Welfare Statements require live fund flows, per-worker tracking, and consulente del lavoro validation — not available in Foundation Light.
*Status:* Approved by Simone — Foundation Light v0.1 Economic/Fiscal Baseline
*Note:* Approved as Foundation Light v0.1 default. Subject to legal/tax/PSD2/privacy/accounting review where applicable before any operational implementation.

---

**Decision 10 — Any operational payment model requires full legal/tax/PSD2 review before implementation.**
No payment infrastructure may be designed, built, or activated before the full advisor validation pack (commercialista welfare, consulente del lavoro, legal advisor, PSD2 advisor, DPO) has produced written, signed, dated opinions preserved as master documents.
*Rationale:* PSD2, VAT, and fiscal qualification risks are not manageable ex post. Prevention is the only viable strategy.
*Estimated validation cost:* €40,000–80,000 for complete advisory package.
*Status:* Approved by Simone — Foundation Light v0.1 Economic/Fiscal Baseline
*Note:* Approved as Foundation Light v0.1 default. Subject to legal/tax/PSD2/privacy/accounting review where applicable before any operational implementation.

---

*This document is the official economic/fiscal architecture integration reference for KORA. It must be consulted before any payment path, fund management feature, fiscal guardrails implementation, Welfare Statement design, FUO tracking, SVAM model selection, KIP structure, or worker top-up feature is designed or built. No operational implementation of any feature described in this document may proceed without the advisor validations specified in Section 17.*

*End of document — KORA Economic & Fiscal Architecture Integration — v0.1 — Status: Approved Baseline — Founder decisions approved by Simone 2026-05-17*
