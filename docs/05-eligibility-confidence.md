# KORA — Eligibility Confidence

*Status: Approved*
*Refinement to the Fiscal & Policy Eligibility Layer*

---

## The Concept

Every fiscal/budget eligibility classification in KORA carries two distinct attributes:

**Eligibility Status** — what the classification is:
Eligible / Conditional / Uncertain / Excluded

**Eligibility Confidence** — what supports the classification:
How reliable is this status? On what basis was it determined? Is it still current?

These are independent attributes. A service can carry a status of *Eligible* with low confidence (partner-declared without independent verification) or a status of *Conditional* with high confidence (explicitly reviewed and documented by a qualified advisor). Eligibility Confidence is the quality signal that sits behind every eligibility status. Without it, two services both marked *Eligible* appear identical when they may be very different in terms of defensibility and audit-readiness.

---

## Eligibility Confidence Levels

KORA defines a structured set of confidence sources. Each classification carries exactly one confidence level, representing the strongest form of validation currently available.

**Advisor-Confirmed (Highest)**
The eligibility classification has been explicitly reviewed and confirmed by a qualified labor law advisor, tax consultant, or welfare specialist engaged by the company. A qualified professional has assessed the service against the applicable fiscal framework and validated the classification in writing.

**KORA Advisor-Confirmed**
The eligibility classification has been reviewed and confirmed by a KORA-authorized advisor operating within the KORA advisor network. Equivalent to Advisor-Confirmed in process rigor, but provided through KORA's own advisor layer rather than the company's independent counsel.

**Partner-Documented**
The eligibility classification is supported by documentation provided by the partner — a formal compliance statement, tax opinion summary, or certification from a recognized authority. Documentation exists and is on record but has not been independently reviewed by a qualified advisor on behalf of this company.

**Partner-Declared**
The eligibility classification was declared by the partner without accompanying documentation. The partner asserts eligibility, but KORA has not verified the basis of that assertion. This is the default when a partner submits a service catalog entry without supporting evidence.

**KORA-Inferred**
The eligibility classification was inferred by KORA from its taxonomy and classification rules — based on service category, typical fiscal treatment in the applicable country, and the absence of specific advisory input. This is an automated or rule-based classification. Useful as a starting point; must not be relied upon for audit purposes or activation under tax-advantaged perimeters.

**Pending Review**
The eligibility classification is not yet confirmed. A review has been submitted — to a company advisor, KORA advisor, or the partner — but the review has not been completed. Services at this level should not be activated under tax-advantaged perimeters until the review is resolved.

**Outdated — Requires Review**
The eligibility classification was previously confirmed at a higher confidence level, but a triggering event has rendered it potentially stale. Triggering events include: a change in applicable fiscal legislation, a significant change in the service structure or delivery method, a change in the company's policy framework, or the expiration of a defined review cycle. The prior classification is preserved in version history, but the current status is flagged as requiring re-confirmation.

---

## How Eligibility Confidence Differs from Impact Confidence

These two concepts serve different purposes and must never be conflated.

**Impact Confidence** answers: *How reliable is this action as evidence of human impact?*
Determined by the quality and verifiability of the action data — whether an action was self-declared, evidenced by documentation, or independently certified. Feeds into the KORA Index and affects how much weight a given action carries in the impact model.

**Eligibility Confidence** answers: *How reliable is the judgment that this service is fiscally eligible under this perimeter?*
Determined by who validated the fiscal classification and whether that validation is current. Feeds into the governance and audit layer. Does not affect the KORA Index.

A service may carry high Impact Confidence (strongly verified as a real human action) while carrying low Eligibility Confidence (the fiscal classification was self-declared by the partner and has not been advisor-reviewed). The company needs to see both signals to make a fully informed decision.

**The practical consequence:** A service with high Impact Confidence but low Eligibility Confidence may generate excellent impact data for the KORA Index while simultaneously creating fiscal and compliance risk if the company activates it under a tax-advantaged perimeter without advisor review. KORA must show both signals clearly and separately.

---

## Versioning of Eligibility Rules and Confidence

Fiscal rules change. Budget legislation is amended annually in many jurisdictions. Company policies evolve. Advisors revise their opinions when regulations are clarified. A service that was unambiguously eligible under a welfare framework last year may become conditional this year.

KORA must treat eligibility classifications as versioned records, not static attributes.

**What is versioned:**

Every eligibility classification record carries:
- The eligibility status at the time of classification
- The eligibility confidence level at the time of classification
- The source of the classification (which advisor, which documentation, which KORA rule version)
- The date the classification was recorded
- The fiscal/regulatory context it was based on (e.g., Italian Budget Law 2024, company welfare policy version 3.2)
- The expiry condition or review trigger (e.g., review required if fiscal legislation changes, or annually regardless)

When a classification is updated, the prior version is not overwritten — it is retained in the version history. The audit trail must be able to show exactly what classification applied on any given date, because past activation decisions must be defensible against the rules that were in effect at the time, not the rules that are in effect today.

**Triggering a version update:**

A new version is created when:
- An advisor reviews and updates the classification
- The company's policy framework is modified
- Applicable fiscal legislation changes materially
- The service structure or delivery method changes in a way that affects fiscal treatment
- A defined review cycle expires and re-confirmation is performed
- KORA updates its taxonomy in a way that affects the inferred classification

**Proactive expiry management:**

When a new budget law is published, KORA should flag all classifications based on the prior year's legislation as *Outdated — Requires Review*. Companies and advisors can then work through the review queue systematically rather than discovering stale classifications at the moment of an audit.

---

## How Eligibility Confidence Displays in the Platform

**Foundation Light:**
Eligibility confidence shown as a simple indicator alongside each budget category tag — distinguishing *Partner-Declared* from *Advisor-Confirmed* classifications. The company can see how reliable its existing data is.

**Foundation:**
The partner/service catalog shows eligibility status and confidence level together. Services with low confidence levels (Partner-Declared, KORA-Inferred) carry a visible prompt to request advisor review before activation under a tax-advantaged perimeter.

**Governance:**
Full confidence profile visible and manageable. Governance dashboard includes a confidence health view — showing how many services in the active program carry each confidence level, and flagging the proportion requiring review. The policy rules engine can be configured to warn or block activation of services below a defined confidence threshold. The audit trail records the confidence level at the time of each activation decision.

**Certified:**
The external review includes an assessment of eligibility confidence across the company's active program. A company seeking certification must demonstrate that a meaningful proportion of its tax-advantaged activations carry at least Partner-Documented or Advisor-Confirmed confidence. The methodology report produced as part of certification includes a confidence distribution analysis.

---

## Operating Principle

Eligibility Confidence is not designed to create friction. It is designed to create clarity.

A company that sees a service marked *Eligible — Partner-Declared* knows exactly what that means: the partner says it is eligible, but no independent review has been done. The company can choose to accept that and proceed with appropriate caution, or request an advisor review before activation. The decision is the company's. KORA provides the information; it does not make the legal or fiscal judgment.

The goal is to eliminate the gap between what a company thinks is true about its fiscal compliance and what can actually be defended in an audit. Eligibility Confidence is the mechanism that makes that gap visible.
