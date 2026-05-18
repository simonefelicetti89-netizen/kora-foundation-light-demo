# KORA — Fiscal & Policy Eligibility Layer

*Status: Approved*
*Addendum to Product Architecture and Methodology*

---

## Overview

KORA classifies human actions by impact value across five pillars. That is the core intelligence layer. But impact classification alone is not sufficient to govern a company's people program in practice. Companies do not operate in a single, undifferentiated budget. They operate across multiple fiscal categories, each with its own legal perimeter, eligible services, documentation requirements, and policy constraints.

The Fiscal & Policy Eligibility Layer is KORA's operating framework for this reality. It does not replace impact intelligence. It runs alongside it, as a separate but connected dimension of every service, partner, and action in the platform.

**The principle that must never be violated:**

Fiscal eligibility is not the same as impact. Impact is not the same as fiscal eligibility.

A service can be fiscally eligible under a welfare framework but generate low human impact. A service can generate exceptional human impact but fall outside the fiscal perimeter available to a specific company. KORA must make both dimensions visible, separately, at all times.

---

## 1. The Four Dimensions of Every Action in KORA

Every action, service, or partner offering in KORA carries four distinct dimensions. They are not the same thing. They must not be collapsed.

**Dimension 1 — Impact Pillar**
What human value does this action generate?
LIFE / GROWTH / CONNECTION / IMPACT / LEGACY (or a combination).
This dimension is determined by KORA's classification methodology. It is independent of how the action is funded.

**Dimension 2 — Fiscal / Budget Perimeter**
Through which company budget or fiscal framework can this action be funded or governed?
This dimension is determined by the company's configuration, the applicable national fiscal framework, and internal policy rules. It varies by country, company type, and the regulatory treatment of each benefit or service category.

Examples of fiscal/budget perimeters:
- Welfare budget (Italian fringe benefit / welfare aziendale)
- Fringe benefit budget (tax-advantaged flexible benefits)
- Training budget (professional development / L&D fund)
- Health & wellbeing budget (occupational health, preventive medicine, psychological support)
- People / HR budget (culture programs, internal initiatives, non-fiscal spending)
- ESG / CSR budget (volunteering, community initiatives, environmental projects)
- Non-tax-advantaged corporate budget (any company-funded initiative outside a fiscal-advantaged framework)
- Custom internal policy budget (company-defined categories)

**Dimension 3 — Partner / Service Eligibility**
Is a specific partner or service compatible with a specific fiscal/budget perimeter?
Eligibility may be: unconditional (always eligible), conditional (eligible only if specific requirements are met), uncertain (depends on regulatory interpretation), or excluded (not eligible under this perimeter).

**Dimension 4 — Policy Rules**
What company-specific constraints apply to this action within the selected fiscal/budget perimeter?
Rules may include: spending caps, approved provider lists, eligible worker categories, documentation requirements, approval workflows, reporting obligations, exclusion periods, or co-payment rules.

---

## 2. How These Dimensions Interact

*Example — Psychological support service:*
- Impact Pillar: LIFE (high impact)
- Fiscal/Budget Perimeter: may be eligible under welfare budget or health & wellbeing budget depending on country and service structure
- Service Eligibility: conditional — may require provider qualification documentation and privacy-compliant usage reporting
- Policy Rules: company may have a cap of €300 per employee per year, restricted to specific seniority levels, with an approved-provider list

*Example — Gym subscription:*
- Impact Pillar: LIFE (moderate to high)
- Fiscal/Budget Perimeter: may be eligible under fringe benefit / welfare budget in Italy up to annual thresholds (which change with budget legislation)
- Service Eligibility: conditional — depends on whether the facility meets tax-purpose recognition criteria and whether the benefit is structured as reimbursement or direct service
- Policy Rules: company may restrict eligibility to permanent employees after 6 months of tenure

*Example — Volunteering project:*
- Impact Pillar: IMPACT (high)
- Fiscal/Budget Perimeter: typically funded through CSR or ESG budget, not welfare or fringe benefit framework
- Service Eligibility: depends on whether volunteering is a corporate program (company pays provider) or individual action
- Policy Rules: company may allow up to 2 paid volunteering days per employee per year with specific documentation requirements

In all cases, impact value (Dimension 1) is independent of fiscal eligibility (Dimensions 2, 3, 4). KORA shows both. It does not merge them.

---

## 3. What KORA Does and Does Not Do

**KORA provides the operating layer:**
- Configuration of fiscal/budget perimeters relevant to the company
- Mapping of partners and services against those perimeters
- Eligibility status per service per perimeter (eligible, conditional, uncertain, excluded)
- Documentation requirements per service per perimeter
- Policy rule configuration and enforcement
- Warnings when a service has uncertain eligibility
- Audit trail of eligibility classification and configuration decisions
- Separation of fiscal compliance data from impact scoring data

**KORA does not provide:**
- Legal advice
- Tax advice
- Regulatory interpretation
- Confirmation that a specific service is tax-deductible or legally compliant in any jurisdiction

The fiscal eligibility configuration in KORA must be set up with the company's HR, legal, and tax advisors — not by KORA unilaterally. KORA provides the infrastructure to map, govern and audit the rules that the company and its advisors define. The rules themselves are the company's responsibility, typically validated by a labor law advisor, tax consultant, or welfare specialist.

---

## 4. Fiscal / Budget Category Taxonomy

The following is a reference taxonomy for the Fiscal & Policy Eligibility Layer. This taxonomy must be configurable per country and per company. It is not a fixed, universal list.

**Welfare Aziendale / Fringe Benefit (Italy-specific)**
Tax-advantaged flexible benefits provided to employees under Italian fiscal law (Articles 51 and 100 TUIR). Subject to annual thresholds. Typically includes: transport vouchers, education benefits, supplementary healthcare, recreational services, meal vouchers, family support services.

**Training & Professional Development Budget**
Funds for skills development, certifications, upskilling, reskilling. Tax treatment may differ between mandatory training (compliance, safety) and elective training.

**Health & Occupational Wellbeing Budget**
Funds for occupational health, preventive medicine, psychological support, ergonomics, workplace safety programs. Distinct from general welfare in some jurisdictions due to privacy and healthcare data handling requirements.

**People / HR Budget (Non-Fiscal)**
Internal budget for culture programs, internal initiatives, team events, mentoring, leadership development. Not tax-advantaged but relevant to KORA's impact classification.

**ESG / CSR Budget**
Funds for volunteering, social initiatives, community programs, environmental projects, territorial contribution. Typically not tax-advantaged as employee benefits but may have corporate tax implications depending on structure.

**Non-Tax-Advantaged Corporate Budget**
Any company-funded people initiative outside a specific fiscal framework. Tracked for financial governance purposes without fiscal eligibility constraints.

**Custom Policy Budget**
Company-defined categories not mapping to a standard fiscal framework. Configured entirely by the company.

---

## 5. Partner and Service Eligibility Mapping

Every partner service in the KORA network must carry a structured eligibility profile. This is a required data field for any partner that wants to operate within KORA.

The eligibility profile of a partner service must include:

- **Impact pillar(s):** Which KORA pillar(s) does this service contribute to?
- **Fiscal/budget eligibility:** For each defined perimeter, what is the eligibility status? (eligible / conditional / uncertain / excluded)
- **Eligibility conditions:** If conditional, what conditions must be met?
- **Required documentation:** What must the company or worker provide to demonstrate eligible usage?
- **Verification level:** Is usage declared, evidenced, or certified?
- **Territory / country availability:** In which countries or regions is the service available and the fiscal eligibility valid?
- **Privacy sensitivity:** Does this service involve sensitive personal data? If yes, what handling protocols apply?
- **Action type:** One-time event or recurring enrollment?

When a company configures its fiscal/budget perimeters in KORA, the platform automatically filters which services are eligible and surfaces eligibility warnings where relevant.

---

## 6. Eligibility Status Definitions

**Eligible**
Compatible with this fiscal/budget perimeter. No special conditions. Standard documentation requirements apply.

**Conditional**
Potentially compatible, but only if specific conditions are met. KORA surfaces the conditions and requires the company to confirm they have been verified with their advisors before activating under this perimeter.

**Uncertain**
Not clearly established by the applicable framework. KORA warns the company and recommends advisor consultation before activation. The service can still be funded through a non-tax-advantaged corporate budget.

**Excluded**
Not eligible under this specific perimeter based on the applicable framework or company policy. The service may still appear in the catalog for other perimeters.

---

## 7. Policy Rules Engine

The policy rules engine is the company-specific configuration layer within the Fiscal & Policy Eligibility Layer. It allows the company (with its advisors) to define internal rules governing each fiscal/budget perimeter.

Policy rules may include:
- **Spending caps:** Maximum amount per employee per year per perimeter or per service category
- **Eligible worker categories:** Restrictions by job family, seniority, contract type, location
- **Approved provider lists:** Restriction to a pre-approved set of providers
- **Minimum tenure:** Employment duration required before accessing specific services
- **Documentation requirements:** Evidence needed before a usage is confirmed as verified
- **Co-payment rules:** Company vs worker contribution splits
- **Approval workflow:** HR or manager approval required before activation
- **Reporting obligations:** Internal/external reporting triggered by usage of specific categories
- **Exclusion rules:** Categories explicitly removed from the company's program

Policy rules are configured per company. They are not set by KORA. KORA provides the configuration interface and enforces the rules once set. The legal and fiscal validity of the rules is the company's responsibility.

---

## 8. How This Layer Integrates Into Each Tier

**Foundation Light**
Basic fiscal/budget tagging of existing initiatives. The output includes: budget category distribution, a pillar vs budget category matrix, mismatch flags (initiatives classified under a fiscal category that may not align with their impact), and missing classification warnings. Policy rules are not yet applied — Foundation Light produces a first fiscal/impact map using data provided.

**Foundation**
The company configures its fiscal/budget perimeters in the platform. KORA applies perimeter definitions to all ingested data. Partner and service visibility is filtered by fiscal eligibility and pillar contribution. Recurring intelligence includes both a pillar view (impact) and a fiscal view (budget allocation and eligibility) in each quarterly refresh.

**Governance**
Full policy rules engine activated. Budget allocation managed by fiscal/budget category and pillar. Eligibility checks enforced before service activation. Audit trail records not only what was done but why it was considered eligible — including which version of eligibility rules was in effect at the time. Risk alerts for fiscal misuse patterns. Compliance-ready reporting for labor law advisors and tax auditors.

**Certified**
The external review includes assessment of the company's fiscal/budget perimeter configuration, documentation requirements, policy rule consistency, impact/fiscal classification coherence, and audit trail completeness. KORA Certified does not validate legal correctness — that remains the company's responsibility — but validates that the operating layer was correctly configured and the evidence trail is present.

**Partner Network**
Every partner must maintain a current, accurate eligibility profile for each service. This is a condition of network participation. KORA validates partner eligibility profiles at onboarding and reviews them annually or when fiscal legislation changes significantly. Partners who fail to maintain accurate profiles are subject to removal or downgrading to "uncertain" eligibility status.

---

## 9. Critical Distinctions the Platform Must Always Surface

1. Impact pillar and fiscal eligibility are always shown as separate dimensions. They must never be merged into a single score or indicator.

2. A high-impact service with uncertain fiscal eligibility must be visible and accessible — but with a clear warning that fiscal eligibility requires advisor confirmation before tax-advantaged activation.

3. A fiscally eligible service with low impact value must not be elevated in the KORA Index because of its fiscal status.

4. A service excluded under one fiscal perimeter may still be available under another. Exclusion is always perimeter-specific, not absolute.

5. KORA never tells a company that a service is legally tax-deductible. KORA tells a company that a service has been tagged as eligible / conditional / uncertain / excluded under a specific perimeter, based on the configuration provided. Legal and fiscal interpretation is always the company's and its advisors' responsibility.

---

## 10. Implications for the Data Model

*No code yet — conceptual only.*

- Every service and action must carry both a pillar classification and a fiscal eligibility profile as parallel attributes, not nested ones.
- Every fiscal/budget perimeter must be a configurable entity — not hardcoded.
- Policy rules must be versioned. When a company modifies a policy rule, the prior version must be retained for audit purposes.
- Country configurations must be modular. A new country's fiscal framework must be addable without modifying the core data model.
- Privacy sensitivity is a field on every action. Medical, psychological and health-related categories must be flagged so access controls and data handling protocols can be applied appropriately.
