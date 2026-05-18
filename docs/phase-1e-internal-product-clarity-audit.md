# KORA Foundation Light — Internal Product Clarity Audit
**Document:** `docs/phase-1e-internal-product-clarity-audit.md`
**Type:** Internal Audit — Product Clarity & Demo Readiness
**Audience:** Founder, CTO, product strategist, Next handoff
**Status:** v1.0 — Phase 1E
**Date:** 2026-05-18
**Scope:** All demo surfaces through Phase 1C-light. No code changes proposed.

---

## 1. Executive Verdict

**PROMISING — but at genuine risk of reading as a generic intelligence dashboard rather than a category-defining platform.**

| Readiness dimension | Verdict |
|---|---|
| Internal founder review | **Yes — ready now** |
| Ready for Next | **Yes — with the 3 pre-handoff fixes below** |
| Ready for corporate stakeholders (CHRO, CFO) | **Not yet** |
| Ready for investors | **Not yet** |

The demo is architecturally correct and methodologically disciplined. The privacy guards work. The data tells a coherent before/after story. The 10-component KORA Index is properly non-suppressible, the Activation Safeguard is visible, and the employer/worker separation is enforced.

**The problem is the entry experience.** The demo drops a first-time viewer directly into the Executive Cockpit — a technical data screen — with zero orientation about what KORA is or why any number on screen matters. Without narration from Simone, the demo reads as: a reasonably well-built analytics dashboard for HR/welfare/ESG. It does not self-explain its category. It does not communicate its aha moment. The intelligence loop is present in the architecture but invisible as a story.

**The single biggest risk:** A CHRO sees a KORA Index of 47, a bunch of metric cards, and a table of programs and thinks "another welfare dashboard with a score on it." The "organizational activation" concept — which is what makes KORA original — is present in the data but never stated as a proposition.

---

## 2. Does the Demo Communicate KORA in 3 Minutes?

### First 30 seconds

The viewer lands on `/company` — the Executive Cockpit — because `/` redirects there silently. They see:
- Page title: "Executive Cockpit"
- A large number: **47** / 100
- Labels they may not know: "KORA Index", "Confidence Score: 60%", "Activation Safeguard: WARNING", "Pre-Empirical Calibration"
- Below: metric cards labeled AR, MAR, CO, VR

**What they understand:** A score of 47/100 on something. There is a warning. There is a confidence of 60%. There are abbreviations that mean nothing yet.

**What they do not understand:** What KORA is. What 47 means. Why 47 is a problem. Why this score matters to a company. What they are supposed to do.

### After 3 minutes (if they navigate freely)

If they explore all sections, they understand: KORA produces a score from 10 components, there is a before/after story, the Operations department has low activation, there are programs and initiatives, and there is a worker privacy layer.

**What still requires Simone's narration:**
- The central value proposition: "you invest in programs but KORA shows you what actually activates the organization"
- Why the 10-component structure matters vs. a single KPI
- What "Meaningful Activation" means and why it is different from simple participation
- Why KORA Contribution is separate from the KORA Index
- Why My KORA is commercially necessary (worker adoption = commercial sustainability)

### Best screen for communicating KORA
`/company/kora-index` — The KORA Index Detail page. It shows the hero, 10 components, safeguard panel, confidence breakdown, and explainability panel in one place. It is the most complete expression of KORA's intelligence proposition. **This should be the first destination of any external review, not the Executive Cockpit.**

### Most confusing screen
`/company/activation` — The Activation & Participation page. The subtitle says "Aggregate-only view. Groups below 10 workers are suppressed" — which is a privacy disclaimer, not a value statement. All pillar bars use the same indigo color. The section title is "Activation & Participation" but nowhere does the screen explain the difference between activation and participation, or why it matters.

### Most generic-feeling screen
`/company/pillars` — The Pillars & Initiatives page. It contains a table of programs with names like "Wellbeing Oasis", "Learning Accelerator", "Safety First", "Remote Wellbeing". Without the KORA frame, this reads as a welfare program catalog. The page title could belong to any HR platform.

---

## 3. Risk of Being Mistaken for HR / Welfare / ESG

### HR Dashboard Risk — **3 / 5**

**Why it exists:** The sidebar label "Activation" (too short), the department-level activation rates, the word "workforce" used frequently. The metric cards (AR, MAR, CO, VR) look like HR KPI tiles in format.

**Where it appears:** `/company/activation` (department activation rates), `/company/pillars` (program portfolio table), sidebar navigation structure.

**How to reduce:** Rename "Activation" to "Activation Map" or "Activation Intelligence". Add a one-line framing statement at the top of `/company/activation`: "This is not a workforce utilization report. It is a picture of where organizational programs are actually activating people, and where they are not." Lead with the distribution story — 12% generating 64% of IU — before the metric tiles.

---

### Welfare Platform Risk — **2 / 5**

**Why it exists:** Program names in `/company/pillars` ("Wellbeing Oasis", "Remote Wellbeing", "Community Impact"). The Financial Governance page shows "budget allocated" and "budget used". The word "welfare" appears in source type labels.

**Where it appears:** `/company/pillars` program table, `/company/financial` source type labels.

**How to reduce:** The framing of the Pillars page as a "governance and intelligence view" is already in the walkthrough doc — it needs to be in the UI as a brief subtitle. "This is not a program catalog. It is an intelligence view of which initiatives are generating verifiable organizational activation." The program names are what they are — the frame around them matters.

---

### Wellbeing Tracker Risk — **2 / 5**

**Why it exists:** My KORA timeline items include "Wellness check-in", "Physical activity program". The LIFE pillar name and its domain (health, wellbeing, physical activity) naturally produce this association. The PIB bars are reminiscent of fitness/wellness apps.

**Where it appears:** `/my-kora` personal timeline, My KORA PIB Light preview.

**How to reduce:** The existing disclaimer ("not a performance score, not visible to employer") is correct. The bigger issue is the PIB presentation — it currently looks like a fitness app score. Adding one line that anchors it to organizational impact intelligence would help: "Your personal impact record — a private picture of where your engagement has contributed to verified organizational activation."

---

### ESG Reporting Dashboard Risk — **3 / 5**

**Why it exists:** `/company/contribution` uses the term "Territory Initiative", "Community volunteering", "ESG initiatives". The Pillars & Initiatives page shows "Community Impact" and "Territorial Volunteer Program". The financial governance page uses "ESG initiatives" as a source type. KORA Contribution content maps directly to standard ESG/CSR metrics.

**Where it appears:** `/company/contribution` screen label and content, `/company/pillars` initiative table, `/company/data` source types.

**How to reduce:** KORA Contribution must be presented as "verified collective activation" — not as "social impact reporting." The companion indicator framing is already correct. The content reads ESG because ESG events are real inputs — the frame needs to consistently say "this is about organizational activation across the ecosystem, not about ESG compliance reporting." The "Semi-Functional Preview" badge on this screen also deflates the framing.

---

### Worker Surveillance Risk — **2 / 5**

**Why it exists:** A corporate reviewer unfamiliar with KORA might interpret the existence of individual timelines (even worker-private), department-level activation rates, and pillar distribution bars as a monitoring system.

**Where it appears:** The combination of `/company/activation` (department rates) + the knowledge that individual-level data exists (even though hidden) could feel surveillance-adjacent to a skeptic.

**How to reduce:** The current privacy guards are strong and the AccessDeniedState is clear. However, the `/company/activation` page could more explicitly state what it does NOT show: "This view contains no individual worker data. Operations staff cannot be identified. HR cannot see who activated and who did not." The positive privacy statement in the walkthrough doc needs to appear in the UI itself.

---

### Marketplace Risk — **1 / 5**

**Why it exists:** The Future Vision section lists "Partner Marketplace" and "Benchmarking Marketplace." The partner workspace skeleton mentions "service catalog."

**Where it appears:** `/future-vision` (correctly labeled inactive), `/partner` skeleton subtitle.

**How to reduce:** Already well-managed. The Future Vision labeling is correct. The partner skeleton subtitle ("No marketplace, no booking engine, no pricing") is the right call. Risk is low.

---

### Generic SaaS Dashboard Risk — **4 / 5**

**Why it exists:** This is the biggest risk. The current styling — slate-200 borders, white cards, gray headers, teal/indigo accent bars — is indistinguishable from dozens of HR analytics, people analytics, and ESG management SaaS products. The layout (metric tiles at the top, bar charts, tables below) is the standard template for data dashboards. Without KORA's conceptual frame actively present in the UI, a first-time viewer sees "another admin dashboard."

**Where it appears:** Everywhere. This is a systemic visual identity issue, not a specific page issue.

**How to reduce (without redesigning):** The brand problem is real but the copy problem is solvable now. Every page title needs to carry a KORA-specific frame, not just a generic label. "Activation & Participation" → "Activation Intelligence". "Data & Evidence" → "Source Quality & Data Confidence". "KORA Index Detail" → "KORA Index — How Your Score Is Built". The visual redesign is Next's job — but copy improvements can happen immediately.

---

## 4. KORA Index Clarity

**Overall: Strong architecture, weak narrative entry.**

| Dimension | Assessment |
|---|---|
| Is the KORA Index understandable? | Structurally yes, narratively not on first view |
| Does CS feel essential or decorative? | Decorative in current layout — it sits passively below the big number |
| Does the Activation Safeguard feel essential? | Partially — it is visible but not explained inline |
| Are the 10 components understandable? | Code names (AR, MAR, etc.) create friction |
| Is explainability strong? | Yes — ExplainabilityPanel is the best section on this page |
| Does viewer understand Index = company-level? | Mostly — confirmed by "aggregate" labels |
| Does viewer understand `pre_empirical_calibration`? | No — the CalibrationBadge label is present but unexplained |
| Does the Index risk feeling arbitrary? | Moderate risk — provisional equal weights with no justification shown |

**Issues:**

1. **The Confidence Score appears passively.** "Confidence Score: 60%" sits in small text below the large number. It should feel equally important — not a footnote. A KORA Index of 47 with 60% confidence is a different statement than a KORA Index of 47 with 90% confidence. This distinction needs to feel consequential.

2. **The 10-component grid (AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS) is shown without a narrative introduction.** Ten small tiles labeled with two-letter codes land as data density, not as intelligence structure. The viewer needs to first understand the question being answered ("how broadly is the organization activating, how deeply, how balanced, how reliable?") before the components become meaningful.

3. **`pre_empirical_calibration` is shown as a badge but never explained.** A corporate reviewer who sees "Pre-Empirical Calibration" in a yellow badge thinks: "this is unfinished" or "this is unreliable." The message needs to be reframed: "Foundation Light produces diagnostic intelligence. Methodology weights are provisional v0.1 — Delphi Study calibration is post-pilot. Use this as a baseline picture, not a certified output."

4. **ExplainabilityPanel title is "Score Explanation."** Too generic. Should be "Why This Score" or "KORA Index Explained."

5. **The Activation Safeguard badge (WARNING) is visible but unexplained inline.** A first-time viewer does not know what WARNING means or what triggers it. The ActivationSafeguardPanel on the KORA Index Detail page does explain it — but the badge on the cockpit has no inline tooltip or sub-label.

**Recommended fixes:**

- Increase visual weight of the Confidence Score — same size as Index, or a side-by-side pairing with explicit framing
- Add a single-sentence intro above the 10-component grid: "The KORA Index is built from 10 components measuring how broadly and deeply an organization activates its people, how balanced the activation is, and how reliable the evidence is."
- Add inline tooltip or one-line explanation under the Safeguard badge: "WARNING: Activation Rate 38% or Meaningful Activation Rate 22% — below the CLEAR threshold of 40%/30%"
- Replace CalibrationBadge tooltip-free label with a subtle info indicator: "Provisional — pre-Delphi calibration" with a 20-word explanation available on hover
- Rename "Score Explanation" → "Why This Score"

---

## 5. Activation Narrative

**Activation is the core concept of KORA but it is currently presented as metrics, not as a story.**

| Dimension | Assessment |
|---|---|
| Does activation feel like the core concept? | Weak — "Activation & Participation" feels like a metrics page |
| Is the activation vs. participation distinction clear? | Not explained |
| Is Meaningful Activation clear? | No — MAR is present but never explained inline |
| Is continuity clear? | Partially — CO is in the breakdown but not interpreted |
| Is distributed vs. concentrated activation clear? | Only in S1 explainability text |
| Is equity/concentration visible? | Buried in explainability — not on activation page |
| Does demo explain why activation > welfare usage? | No — this is the central argument and it is absent |

**The critical missing sentence:**
> "KORA does not count welfare usage. It measures whether organizational programs actually produce verifiable activation across the workforce — broadly, continuously, and with evidence."

This sentence needs to appear somewhere in the demo. It currently lives in documentation but not in the product.

**Specific gaps:**

1. The Activation page has no introductory narrative. It opens with a privacy disclaimer ("Aggregate-only view. Groups below 10 workers are suppressed.") which is correct but leads with compliance framing, not value framing.

2. "Meaningful Activation Rate" appears as a metric tile labeled "MAR" with no inline explanation of what "meaningful" means (above the IU materiality threshold — not one token event but sustained engagement).

3. The concentration story — "12% of workers generate 64% of IU in S1" — is mentioned in explainability records but does not appear on the Activation page. This is the most powerful argument KORA has and it is not surfaced where it would have the most impact.

4. Continuity as a concept (workers active in multiple consecutive periods, not one-time participants) is a metric tile showing "CO: 44%" with no explanation of why continuity matters. A CHRO who sees "44% continuity" doesn't instinctively know what that means or why it's below their expectation.

**Recommended fixes:**

- Add a one-paragraph intro at the top of the Activation page that frames the concept before the metrics
- Add inline sub-labels to the four metric tiles: AR ("share of workforce with ≥1 approved event"), MAR ("share with sustained, material engagement"), CO ("active in ≥2 consecutive periods"), VR ("events backed by verified evidence")
- Surface the IU concentration stat on this page: a highlighted callout "In this scenario: [X]% of workers generate [Y]% of Impact Units" — pulled from explainability data

---

## 6. Privacy Credibility

**Privacy is architecturally strong. It is communicated through disclaimers more than through structure.**

| Dimension | Assessment |
|---|---|
| Is privacy believable? | Yes — guards work, disclaimers are present |
| Is employer/worker separation clear? | Clear when you switch roles; less clear from company side alone |
| Does My KORA feel genuinely worker-owned? | Yes — strong worker-private banners |
| Is it obvious employer cannot see individual PIB? | Partly — stated in disclaimers, not shown structurally |
| Does demo over-rely on disclaimers? | **Yes — this is the main weakness** |
| Are privacy boundaries shown structurally? | Partially — AccessDeniedState works; can-see/cannot-see layout in privacy page is strong |
| Surveillance risk? | Low, but present if reviewer never visits My KORA |

**The over-reliance on disclaimers is a real risk.** A reviewer who only sees the company workspace never directly experiences the privacy boundary — they only read about it. The privacy is not self-demonstrating from the company side. The employer never sees the wall; they just see aggregate data and are told a wall exists.

**How to make privacy structural:** The most powerful privacy demonstration is switching roles. But this requires a guided prompt. The `/company` side should have one explicit privacy statement in the UI — not a footer disclaimer, but a visible architectural note: "Individual worker data is never accessed by this workspace. What you see is company-level aggregation only." This is more credible than 5 scattered disclaimers.

**The `/my-kora/privacy` page is the best privacy screen.** The two-column can/cannot-see layout is strong and clear. This is the right design pattern for communicating the boundary — show the contrast, not just the restriction. This pattern could be echoed more on the company side.

**Recommended fixes:**

- Add a single-sentence privacy anchor to the Executive Cockpit header (not footer): "Company workspace — aggregate organizational intelligence. No individual worker data."
- Make the role-switch invite explicit: "Switch to WORKER_MY_KORA role to see the worker perspective on this data." This guides the demo narrative instead of relying on the reviewer figuring it out.
- The `/company/activation` subtitle should lead with value, not compliance: replace "Aggregate-only view. Groups below 10 workers are suppressed." with "Organizational activation picture — no individual workers identified." (privacy note still present, but not as the opening frame)

---

## 7. My KORA Value

**My KORA is architecturally correct and privacy-safe. It does not yet feel like a product workers would want.**

| Dimension | Assessment |
|---|---|
| Does My KORA feel valuable? | Not sufficiently — it reads as "privacy sandbox" |
| Does it feel like a real worker benefit? | Weakly — the disclaimers dominate over the value |
| Is PIB Light clear? | Somewhat — but "personal impact balance" needs more context |
| Is Dynamic Impact CV compelling? | Potentially yes — but the preview-only export deflates it |
| Are opportunities useful or vague? | Vague — the preview is too minimal in the current skeleton form |
| Is the worker side ambitious enough? | Barely — My KORA Home is a good preview but doesn't yet feel like a real product |
| Does it support the sales argument? | Weakly — the argument "workers need to be onboard" isn't made from the demo |

**The core problem:** My KORA spends more time explaining what it is NOT (performance score, employer-visible, real export) than communicating what it IS for the worker. The disclaimers are necessary but they currently dominate the voice of the page. A worker who lands here reads: "This is not a performance score. Not visible to employer. Preview only. No real export." The value — "this is your private impact record" — is present but not loud enough.

**PIB Light score of 34 (S1) or 61 (S2) needs anchoring.** Without knowing what a "good" PIB looks like, these numbers mean nothing. The simplest fix is adding a progress label: "34 — early engagement" or "61 — building momentum." This is one line and transforms the number from arbitrary to meaningful.

**The opportunities section works as a preview but does nothing to communicate the opportunity discovery value proposition.** Three cards with "Preview only" and "Coming soon" labels tell the worker: nothing is available here yet. Even the description "matched opportunities based on your pillar gaps" is more mechanistic than enticing.

**Dynamic Impact CV is the strongest worker value proposition.** Verified career impact that belongs to the worker and can be exported on their terms — this is genuinely differentiated. The current implementation shows 6 items with clear verification status. But "Export — Preview only" button at the bottom inadvertently positions the CV as not-yet-real.

**Recommended fixes:**

- Add a value anchor sentence to My KORA Home above the PIB card: "My KORA gives you a private record of the impact you've created through the programs you've participated in. Your employer sees none of this."
- Add level labels to PIB scores: "Emerging", "Building", "Strong", "Advanced" — so the number feels interpreted, not raw
- Flip the voice of the Dynamic CV disclaimer from "not certified" to "verified at item level by your program provider" — shifts from limitation framing to capability framing
- Add one concrete "why this matters" example in the opportunity discovery area: "Based on your GROWTH and CONNECTION gaps, these programs are matched to you."

---

## 8. KORA Contribution and Collective Impact

**Correctly separated from KORA Index. Risks looking like a CSR/volunteering module rather than an activation intelligence metric.**

| Dimension | Assessment |
|---|---|
| Is it clearly separate from KORA Index? | Yes — companion indicator framing is explicit |
| Does it help explain KORA's broader vision? | Partially — the cross-company logic is present |
| Does it feel meaningful or secondary? | Secondary — partly due to "Semi-Functional Preview" badge |
| Does it risk looking like CSR add-on? | **Yes — moderate risk** |
| Are cross-company initiatives clear? | Mostly — "Cross-company" tag is visible |
| Does viewer understand "verified collective contribution"? | Weakly — "verified" is in the data but not in the narrative |

**The "Semi-Functional Preview" badge is a commercial liability.** For a demo audience, "semi-functional" reads as "not finished" or "not important." The companion indicator concept is distinctive and commercially relevant — KORA shows both internal organizational activation (KORA Index) AND external ecosystem engagement (KORA Contribution). Replace "Semi-Functional Preview" with a framing badge: "Companion Indicator — Not Part of KORA Index."

**The CSR/volunteering drift risk is real.** The initiative list shows "Community Volunteering", "Territory Initiative", "Knowledge Transfer". Without the activation intelligence frame, this reads as a corporate volunteering tracker. The distinction KORA needs to make: "KORA Contribution is not about counting volunteer hours. It is about measuring verified collective activation that extends beyond a single organization — where companies and workers contribute to the broader ecosystem of people development."

**Recommended fixes:**

- Replace "Semi-Functional Preview" badge with "Companion Indicator — ecosystem activation beyond company perimeter"
- Add the mandatory sentence more prominently: "KORA Contribution complements the KORA Index. It is not a KORA Index component. It measures verified collective activation across the ecosystem — not corporate volunteering tracking."
- The contribution score (11 in S1, 38 in S2) needs context: show a one-line interpretation "Minimal ecosystem engagement" vs "Emerging ecosystem activation" beneath the score

---

## 9. Data & Evidence Credibility

**This section makes KORA look credible and methodologically serious. It is currently underutilized.**

| Dimension | Assessment |
|---|---|
| Does it make KORA look credible? | **Yes — this is an unexpected strength** |
| Is AI ingestion/mapping clear enough? | Partially — "AI Upload Studio" is a skeleton |
| Does viewer understand this is not magic AI? | Not unless they read the subtitle carefully |
| Is batch-level metadata understandable? | Yes — the table is readable |
| Is UEF absence a problem? | For this phase, no — batch-level is correct |
| Does demo need explicit "intelligence loop" view? | **Yes — this is a gap** |

**Data & Evidence is actually a trust-builder.** A corporate buyer or technical reviewer who sees this page — showing source types, completeness rates, mapping confidence, evidence attachment, and pending review counts — thinks: "This is a real data system, not a score pulled from thin air." The transparency of showing data quality gaps (low completeness, partial evidence) is a feature of KORA's methodology, not a weakness.

**The AI ingestion story is invisible.** AI Upload Studio is a skeleton with "Upload panel skeleton — Phase 1." The MappingReview page is also a skeleton. The narrative "AI helps map source files, humans approve every mapping before it enters scoring" is central to KORA's trust proposition and currently has no functional demo surface. A reviewer who sees "AI Upload Studio" in the sidebar and clicks through to a skeleton is misled about the product's AI layer.

**Recommended fixes:**

- Consider hiding AI Upload Studio and UEF Review from the default COMPANY_ADMIN sidebar (or marking them as "Admin / Analyst only") since they are skeletons — seeing skeleton pages breaks demo credibility
- Add a one-paragraph "intelligence loop" narrative to the Data & Evidence page header: "These source batches are the inputs to the KORA pipeline. Each batch was parsed, AI-mapped to the BCM taxonomy, and reviewed by a human operator before events entered the Impact Unit computation."
- The "batch-level only" notice is correct but cold. Warm it up: "Source quality determines Confidence Score. Better data → higher confidence → more reliable KORA Index."

---

## 10. Financial Governance Clarity

**Correct in scope and framing. Does not currently connect clearly enough to the activation intelligence story.**

| Dimension | Assessment |
|---|---|
| Does it help the commercial story? | Partially — CFO appeal is real but connection is implicit |
| Is KORA's non-payment role clear? | Yes — disclaimer is present and prominent |
| Does cost per IU make sense? | Only with context — risks confusion |
| Does finance role gating make sense? | Yes — clearly implemented |
| Is budget → activation connection explicit? | **Weak — this is the key missing link** |
| Does it risk looking like welfare spend dashboard? | Moderate risk |

**The critical missing link:** The page shows budget allocated and budget used, and separately the KORA Index is on another page. The connection — "you allocated €185,000 across programs; KORA shows you whether that investment actually activated the organization" — is never stated on this page. This is the CFO's core question and it has no explicit answer.

**Cost per IU needs a sentence of context.** "€14.2 / IU" is an interesting number but a CFO will immediately ask: "Is that good or bad? What's the benchmark?" The current copy says "informational only" which closes the conversation. A better frame: "Cost per IU is a directional efficiency indicator — S1 shows €14.2/IU, S2 shows €10.8/IU. As activation broadens, cost per IU tends to improve."

**Recommended fixes:**

- Add a bridging sentence at the top of the Financial Governance page: "This is the investment side of your KORA picture. For the activation return on this investment, see KORA Index and Activation Map."
- Add a link or cross-reference between Financial Governance and KORA Index Detail
- Frame the S1 → S2 change in cost per IU as a demonstration of improvement: "By broadening participation and improving evidence quality, the cost per Impact Unit improved from €14.2 to €10.8."

---

## 11. Navigation and Information Architecture

**The sidebar is too long, too flat, and too technical for a first-time reviewer.**

### Current issues

**Issue 1: No demo landing page.** `/` silently redirects to `/company`. A first-time viewer has zero orientation. There is no "What is KORA?" screen. There is no guided entry. This is the single most impactful navigation issue.

**Issue 2: Sidebar exposes skeleton pages.** For `COMPANY_ADMIN`, the sidebar shows: AI Upload Studio, UEF Review, Scoring Run, Reports — all of which are skeleton pages with "Phase 1" placeholder content. A reviewer who clicks any of these sees a broken-looking page. This actively harms demo credibility.

**Issue 3: Sidebar labels are too technical in places.**
- "Activation" (too short) — loses context of what kind of activation
- "UEF Review" — acronym unknown to any non-KORA audience
- "Scoring Run" — sounds like a database operation
- "Data & Evidence" — generic
- "KORA Contribution" vs "KORA Index" — the companion indicator distinction is not communicated by the label
- "Dynamic CV" — "Dynamic" as an adjective is weak

**Issue 4: No visual grouping in the sidebar.** All items are a flat list with equal weight. There is no grouping (Intelligence / Governance / Operations / Worker Layer) that helps a reviewer orient.

**Issue 5: Active page highlight is absent.** The sidebar has no active state styling — a reviewer cannot tell which page they are on from the sidebar. (This may be a Next.js routing issue with `Link` components — worth verifying.)

### Ideal demo navigation

For a company-facing reviewer, the natural path should feel like:
1. **Start** — What is KORA? (landing or cockpit with hook)
2. **Core question** — What does my organization's activation look like? (KORA Index → Activation)
3. **Why?** — What's driving this? (KORA Index Detail → Explainability)
4. **External picture** — How does KORA Contribution add context? (Contribution)
5. **Programs in context** — Where is my investment? (Pillars, Financial Governance)
6. **Data behind it** — How reliable is this? (Data & Evidence)
7. **Worker perspective** — What does the workforce see? (My KORA)

The current sidebar order (Executive Cockpit → KORA Index → AI Upload Studio → UEF Review → Scoring Run → Reports → Activation → KORA Contribution → Pillars → Data → Financial) buries the core activation story behind technical admin operations.

### Recommended changes

| Change | Priority |
|---|---|
| Create `/` demo landing page with "What is KORA" intro and two review paths | Critical |
| Hide AI Upload Studio, UEF Review, Scoring Run from COMPANY_ADMIN sidebar (or group as "Admin / Analyst") | High |
| Rename "Activation" → "Activation Map" | Medium |
| Rename "Data & Evidence" → "Source Quality" or "Data Confidence" | Medium |
| Add sidebar section groupers (Intelligence / Governance / My KORA) | Medium |
| Add active page highlight to sidebar links | Low |
| Move KORA Index before Executive Cockpit in sidebar or make Cockpit an entry hub | Low |

---

## 12. Copy and Terminology Audit

### Labels that create problems

| Current term | Problem | Suggested alternative |
|---|---|---|
| "Activation & Participation" | Activation is the concept; participation is the input — conflating them loses the distinction | "Activation Intelligence" or "Activation Map" |
| "UEF Review" | UEF is internal terminology; external audience sees an acronym | "Event Review" or "Source Event Review" |
| "Scoring Run" | Sounds like a database job / technical operation | "Run Scoring" or "Generate KORA Index" |
| "Data & Evidence" | Generic — could belong to any compliance tool | "Source Quality" or "Data Confidence" |
| "Financial Governance Light" | "Light" sounds like a degraded version of a real product | "Investment & Activation Governance" or just "Financial Governance" |
| "Semi-Functional Preview" (badge) | Commercially undermining | "Companion Indicator" or "Preview" |
| "KORA Contribution" (sidebar label) | Without context, the difference from "KORA Index" is unclear | "Collective Contribution" or "KORA Contribution — Companion" |
| "Dynamic CV" (sidebar label) | "Dynamic" is a weak differentiator | "Impact CV" or "Verified Impact Portfolio" |
| "Score Explanation" (ExplainabilityPanel) | Generic | "Why This Score" or "KORA Index Explained" |
| "Pre-Empirical Calibration" (badge) | Sounds like "not finished" to a non-technical reviewer | "Foundation Light v0.1 — Diagnostic Intelligence" |
| "worker" | In corporate presentation contexts, "people" or "employees" may resonate better | Context-dependent — keep "worker" in technical/privacy contexts, use "people" in commercial framing |
| "PIB" | Acronym unknown outside KORA | Always pair with "Personal Impact Balance"; consider "Impact Balance" in consumer-facing copy |
| "Impact Units" | Sounds manufactured/abstract | "Verified Activation Points" or keep "Impact Units" but always explain on first use |
| "Meaningful Activation" | The word "meaningful" is vague without context | "Deep Activation" or "Sustained Engagement" — or add a parenthetical: "Meaningful Activation (sustained, above materiality threshold)" |
| "Continuity Rate" | Technical — what is it continuous with? | "Sustained Engagement Rate" or "Multi-Period Participation Rate" |
| "Verification Rate" | Bureaucratic | "Evidence Quality Rate" or "Verified Event Share" |

### Terms that are working well
- "KORA Index" — distinctive, ownable, clear it is a company-level output
- "Activation Safeguard" — evocative, implies protection, CLEAR/WARNING/FLAGGED states are intuitive
- "Personal Impact Balance" — clear when spelled out
- "Executive Cockpit" — strong, appropriate register for the audience
- "Collective Impact" — works for the contribution layer
- "Confidence Score" — clear and appropriate

---

## 13. Visual / Design Risk

*(No redesign proposed — product-level assessment only.)*

**Biggest visual risk: the demo looks like a well-built SaaS admin panel, not a category-defining intelligence platform.**

The current slate/white/indigo palette is competent but undifferentiated. It matches the aesthetic of dozens of B2B analytics products. The 5 KORA pillar colors (green/blue/purple/orange/amber) are defined and used correctly in some screens but not consistently across the app. The Activation page, for example, uses `bg-indigo-400` for all pillar bars — losing the visual identity that the PillarChart in the Cockpit establishes.

**Card density is too high in some sections.** The KORA Index Detail page shows: KoraIndexHero, ComponentBreakdownChart, ComponentBreakdown grid (10 tiles), ActivationSafeguardPanel, ConfidenceBreakdown, ExplainabilityPanel — six sections on one page. The correct architecture is there but the visual hierarchy does not distinguish primary from secondary information.

**Charts are useful but chart labeling is weak.** The ComponentBreakdownChart shows bars for 10 components but a first-time viewer does not know which bars represent a problem. The `weakCodes` highlighting is implemented (components colored differently when weak) but the scale reference — "what does 50% mean for AR?" — is absent.

**The WarningCard uses colored emoji (🔴, 🟠, 🟡)** which feels consumer/casual in a product targeting CHROs and CFOs. These should be CSS-only indicators.

**The ExplainabilityPanel's amber "Limitations" box** is visually correct (it signals caution) but it always appears at the bottom as an afterthought. For a corporate review, the limitations statement should be the first thing acknowledged, not the last.

**Product-level visual improvements to recommend (not redesign):**
- Use pillar colors consistently across all bar charts (remove `bg-indigo-400` as a generic fallback)
- Remove emoji from WarningCard severity indicators — use CSS borders/backgrounds only
- Move the limitations statement in ExplainabilityPanel to the top of the card, not the bottom
- Add visual weight to the Confidence Score in KoraIndexHero — make it feel equally important to the Index value
- Add an active state to sidebar nav links (border-left or background highlight for current page)

---

## 14. Missing "Aha Moment"

**The current aha moment is weak and requires narration to land.**

The closest the demo gets to an aha moment is in the ExplainabilityPanel on the KORA Index Detail page, which says something like: "Activation is unbalanced — a small cohort is generating most of the impact while the majority of the workforce remains under-activated." This is the right message. It is buried on the second page, in a text paragraph, inside the sixth section from the top.

**The aha moment needs to be stated upfront and in commercial language.**

The right aha moment for KORA is:

> **"Your company spends €185,000 a year on people programs. KORA shows that 12% of your workforce generates 64% of the activation. The rest are invisible. This is your real activation picture."**

This is not about the features. It is about the gap between investment and reality. This is the sentence that makes a CHRO stop, recognize their situation, and want to understand more.

**Where this moment should appear:**

The best placement is at the top of the Executive Cockpit — not after the KORA Index card, but framed as the entry context for it. When the scenario is S1 (WARNING), the cockpit should open with a narrative hook. When the scenario switches to S2 (CLEAR), that hook should update to show the improvement.

Secondary placement: the first screen of a demo landing page at `/`. Before the reviewer opens any technical content, they should see the problem statement in one sentence.

**A weaker but still effective alternative (suitable for the current demo without code changes):** ensure that the ExplainabilityPanel summary text explicitly includes the "12% generating 64% of IU" figure from the explainability seed data, and give it visual prominence (larger text, prominent placement). Currently this figure exists in the explainability records but its presence in the rendered panel depends on how the seed text is written.

---

## 15. Top 10 Fixes Before Showing Anyone External

### Must fix before Next

**Fix #1 — Demo landing page at `/`**
- **Fix:** Replace silent redirect to `/company` with a "What is KORA?" landing screen. Show a 3-sentence product statement, the Meridiana Group demo company, two entry paths (Company Admin / Worker), and the before/after scenario narrative.
- **Reason:** Without it, every external viewer is dropped mid-stream into a technical screen. This is the single highest-impact change possible.
- **Route/file:** `app/page.tsx`, potentially new `components/demo/DemoLanding.tsx`
- **Effort:** Low–Medium
- **Risk if not fixed:** Every external reviewer needs Simone's narration to understand what they're looking at. The demo cannot self-explain.

**Fix #2 — Scenario switcher labels**
- **Fix:** Update the scenario dropdown labels from "S1: Baseline / S2: Improved" to "S1 — Baseline (WARNING · Index 47)" and "S2 — Improved (CLEAR · Index 64)". Make the before/after contrast visible in the selector itself.
- **Reason:** A first-time viewer does not know to switch scenarios or what the difference is. The switcher needs to communicate the story, not just the mechanic.
- **Route/file:** `services/scenario/ScenarioService.ts`, `components/demo/ScenarioSwitcher.tsx`
- **Effort:** Low
- **Risk if not fixed:** Reviewers stay on S1 and miss the improvement narrative entirely.

**Fix #3 — Hide skeleton pages from COMPANY_ADMIN sidebar**
- **Fix:** Remove AI Upload Studio, UEF Review, Scoring Run, and Reports from the COMPANY_ADMIN accessible routes in `getAccessibleRoutes()`, OR group them under an "Admin / Internal" section labeled as not part of the company-facing demo.
- **Reason:** Clicking these pages shows "skeleton — Phase 1" placeholders which actively undermine demo credibility.
- **Route/file:** `lib/permissions/index.ts` (getAccessibleRoutes), `components/layout/Sidebar.tsx`
- **Effort:** Low
- **Risk if not fixed:** Any external reviewer who clicks these pages thinks the demo is unfinished.

### Must fix before corporate stakeholders

**Fix #4 — Aha moment on Executive Cockpit**
- **Fix:** Add a two-line narrative summary above or beside the KoraIndexHero in the Executive Cockpit for S1: "Meridiana Group runs 8 people programs. KORA reveals the real activation picture." Let the Index and Safeguard be the punchline, not the opening.
- **Reason:** The big number (47) means nothing without a framing statement. The narrative hook converts metric density into a commercial story.
- **Route/file:** `app/company/page.tsx`
- **Effort:** Low
- **Risk if not fixed:** CHROs and CFOs see an analytics dashboard. They do not see an intelligence platform.

**Fix #5 — Activation Map inline sub-labels**
- **Fix:** Add one-line descriptions under each of the four metric tiles on the Activation page: AR ("share of workforce with ≥1 verified event"), MAR ("share with sustained, material engagement"), CO ("active in ≥2 consecutive periods"), VR ("events backed by verified evidence").
- **Reason:** AR/MAR/CO/VR are KORA-specific metrics. A CHRO does not instinctively understand them. Sub-labels convert abbreviations into intelligence.
- **Route/file:** `app/company/activation/page.tsx`
- **Effort:** Low
- **Risk if not fixed:** The Activation page reads as a metrics report, not as an intelligence map.

**Fix #6 — Remove emoji from WarningCard**
- **Fix:** Replace 🔴/🟠/🟡 emoji with CSS indicator dots (filled div with appropriate color) in WarningCard.
- **Reason:** Emoji signals consumer/informal. WarningCards are shown in the primary executive view. This is a premium deeptech product.
- **Route/file:** `components/cards/WarningCard.tsx`
- **Effort:** Low
- **Risk if not fixed:** Minor — but consistent with the overall visual upgrade needed before corporate presentation.

**Fix #7 — Pillar colors on Activation page**
- **Fix:** Replace `bg-indigo-400` on the Activation page pillar distribution bars with the canonical pillar colors (green/blue/purple/orange/amber, matching PILLAR_COLORS constants).
- **Reason:** The 5-pillar color system is defined and used in the Cockpit (PillarChart). Not using it on the Activation page breaks visual continuity and loses the "5 pillars = 5 distinct domains" mental model.
- **Route/file:** `app/company/activation/page.tsx`
- **Effort:** Low
- **Risk if not fixed:** Pillar identity does not build across screens — each pillar color is a recognition cue that accumulates through the demo.

**Fix #8 — "Semi-Functional Preview" badge on KORA Contribution**
- **Fix:** Replace the "Semi-Functional Preview" badge on `/company/contribution` with "Companion Indicator — Not Part of KORA Index." This reframes the page from "unfinished feature" to "distinct product layer."
- **Reason:** "Semi-functional" is commercially undermining. The companion indicator concept is a product decision, not a quality limitation.
- **Route/file:** `app/company/contribution/page.tsx`
- **Effort:** Low
- **Risk if not fixed:** Reviewers perceive KORA Contribution as an afterthought or incomplete feature rather than a distinct measurement layer.

**Fix #9 — Financial Governance activation bridge**
- **Fix:** Add a one-sentence connection on the Financial Governance page: "For the activation return on this investment, see → KORA Index and Activation Map." This can be a subtle link or a text note.
- **Reason:** The CFO who visits Financial Governance is asking "what did this €185,000 produce?" The answer is on another page. The bridge must exist.
- **Route/file:** `app/company/financial/page.tsx`
- **Effort:** Low
- **Risk if not fixed:** Financial Governance reads as a budget tracker, not as part of the activation intelligence story.

**Fix #10 — Confidence Score visual weight in KoraIndexHero**
- **Fix:** Increase the visual weight of the Confidence Score in the KoraIndexHero. Currently it is `text-sm text-slate-500` below the large number. It should feel like an equal partner — either the same visual tier or an explicit callout: "Data Confidence: 60% — moderate reliability."
- **Reason:** The Confidence Score is architecturally inseparable from the KORA Index (doc 21b). In the current layout, it reads as a subtitle. A reviewer who ignores it has missed one of the two core outputs of the platform.
- **Route/file:** `components/kora-index/KoraIndexHero.tsx`
- **Effort:** Low
- **Risk if not fixed:** The KORA Index appears to be a single number without qualification — which is exactly the "black box" impression KORA is designed to avoid.

---

### Priority summary

| Priority | Fix | Effort |
|---|---|---|
| Must fix before Next | Demo landing page | Medium |
| Must fix before Next | Scenario switcher labels | Low |
| Must fix before Next | Hide skeleton pages from company sidebar | Low |
| Must fix before corporate stakeholders | Executive Cockpit aha moment | Low |
| Must fix before corporate stakeholders | Activation inline sub-labels | Low |
| Must fix before corporate stakeholders | Remove emoji from WarningCard | Low |
| Must fix before corporate stakeholders | Pillar colors on Activation page | Low |
| Must fix before corporate stakeholders | Replace "Semi-Functional Preview" on Contribution | Low |
| Must fix before corporate stakeholders | Financial Governance activation bridge | Low |
| Can wait | Confidence Score visual weight upgrade | Low |

---

## 16. What NOT to Build Next

**None of the following should be built before the fixes in Section 15 are complete.**

| Do not build | Why |
|---|---|
| SQL / production backend | Gate 2 is open. Demo still needs polish before backend work is justified. Building backend before demo communicates clearly is premature investment. |
| Production auth | Gate 3 is open. No live data. No real workers. |
| Real worker accounts | Gate 3. The current demo's synthetic persona is sufficient for all stakeholder presentations. |
| KORA Link (NFC/QR) | Future Vision. Expensive operational infrastructure. Cannot be piloted before Gate 3. |
| Partner marketplace | Explicitly excluded from Foundation Light. Contradicts KORA identity. |
| Full booking engine | Booking Light (request/confirm) is sufficient and correct for Foundation Light. Pricing/availability would be scope drift. |
| Payment / wallet / checkout | Explicitly forbidden. Gate 5 is open. |
| Fiscal classification live output | Gate 5. Tax/fiscal advisor review required. |
| More synthetic companies | Nexo Digital, Fortis Industrial, Communitas Cooperativa are defined but not implemented as active demo companies. Adding them now would be distraction — Meridiana Group tells the complete story. |
| Full partner workspace | A skeleton with correct framing is sufficient for now. Full implementation should wait until the company story is clearly communicated. |
| Full advisor workspace | Same as partner — skeleton with correct framing is appropriate at this stage. |
| More KORA Index scenarios (S3, S4) | S1 and S2 tell a complete before/after story. Adding S3/S4 adds complexity without narrative payoff at this stage. |
| Recharts / visualization library upgrades | The current charts work. Visual refinement is Next's territory, not a Foundation Light task. |
| Notifications / alerts system | Not in Foundation Light scope. |
| Export / PDF generation | Browser print CSS is the correct Foundation Light approach. Real PDF generation is production scope. |

**The principle:** Every hour spent on new features is an hour not spent on making the current features communicate clearly. The demo is architecturally ready. It is narratively weak. Fix the narrative before expanding scope.

---

## 17. Recommended Roadmap From Here

### Step 1 — Demo Landing Page + Scenario Hook
**`Phase 1F`**
Replace silent `/` redirect with a demo landing screen. Add scenario labels with context. This is one focused session. It unlocks every external review that follows.

### Step 2 — Executive Cockpit + Activation Narrative Polish
**`Phase 1G`**
Add aha moment text to Cockpit. Add inline sub-labels to Activation metrics. Replace emoji in WarningCard. Apply pillar colors to Activation bars. Replace "Semi-Functional Preview" badge on Contribution. Add Financial Governance bridge sentence. All low-effort, high-impact. One session.

### Step 3 — Sidebar + Navigation Cleanup
**`Phase 1H`**
Hide skeleton pages from COMPANY_ADMIN sidebar. Add sidebar section groupers. Rename technical labels (Activation → Activation Map, etc.). Add active link highlight.

### Step 4 — My KORA Value Polish
**`Phase 1I`**
Add PIB level labels (emerging/building/strong). Flip Dynamic CV disclaimer voice. Add pillar-gap context to opportunities section. Wire Opportunities and Collective with the service data that already exists. One focused session on worker value.

### Step 5 — Founder Internal Review Pack
**`Phase 1J`**
Compile a founder review presentation with: demo URL, recommended path, S1/S2 narrative, role switch instructions, what to judge/not judge, open questions for Next. One document. No code. Prepare for the first external meeting.

---

## 18. Final Decision

### **PROCEED TO DEMO LANDING**

The demo is architecturally sound and methodologically correct. Every privacy guard works. The intelligence loop is complete. The data tells a coherent story.

What the demo lacks is a self-explaining entry experience.

Right now, sharing the demo URL with anyone — Next, a stakeholder, an investor — requires Simone to be in the room, narrating. The demo does not yet stand alone. The single highest-leverage intervention is a demo landing page that answers "what is KORA?" in 10 seconds before the viewer opens any technical screen.

Everything else — copy polish, sidebar cleanup, activation narrative, My KORA value — flows from that foundation. Once the entry experience is clear, the rest of the improvements become straightforward micro-sessions.

**Do not proceed to partner/advisor workspace expansion yet.** The company story and worker story need to communicate clearly first. Expanding incomplete spaces adds noise, not signal.

**Do not proceed to production backend yet.** The demo needs to earn that investment by communicating its value to the people who will commission the backend. That communication is not yet complete.

**PROCEED TO DEMO LANDING — Phase 1F.**

---

**Document version:** v1.0
**Date:** 2026-05-18
**Audit scope:** Phase 0 through Phase 1C-light
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN · Gate 3 OPEN · Gate 5 OPEN
**Verdict:** PROMISING — ready for internal review and Next handoff, not yet for corporate or investor presentation
**Next phase:** Phase 1F — Demo Landing Page + Scenario Hook
