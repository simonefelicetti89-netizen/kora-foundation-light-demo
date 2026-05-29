# KORA PLATFORM — STRATEGIC PRODUCT AUDIT
**Auditor:** Claude Code (claude-sonnet-4-6) | **Date:** 2026-05-25 | **Mode:** Read-only
**Branch:** main | **Build:** Foundation Light v0.1 | **Status:** Pre-empirical calibration

---

## EXECUTIVE SUMMARY

KORA Foundation Light is a methodologically rigorous, architecturally coherent product vision prototype. The core company-side intelligence layer is production-quality in conceptual depth. The methodology is consistent with doctrine. Privacy boundaries are correctly implemented. The demo guide is genuinely useful for Next handover.

**The platform is NOT ready for a cold enterprise sales call. It IS ready for a guided demo to qualified, pre-briefed prospects and for Next handover.**

The primary blockers to revenue are not technical — they are commercial packaging, visual polish, and the absence of a second demo tenant. Internally, the platform is already a powerful proof of concept.

---

## SECTION 1 — EXECUTIVE VERDICT

### Verdict: **B — READY TO SHOW TO COMPANIES (with conditions)**

**Conditions:**
1. Must be guided by the founder — cold demo is not ready
2. Must use the Demo Guide route (/demo-guide → /company → /company/kora-index → ...)
3. Visual design must be framed explicitly as "product prototype, not final UI"
4. The 3 data integrity issues in the activation page must be fixed first

**For Next specifically:** READY NOW (A). The Demo Guide page alone is an excellent briefing document.

**For freelance devs:** READY NOW (A-). Service layer and folder structure are clean enough for handoff.

**For cold investors:** NOT READY (D). Needs visual polish and a commercial packaging page first.

---

### Scores

| Dimension | Score | Justification |
|---|---|---|
| **Product clarity** | 7/10 | Positioning is sharp. "Human Impact Intelligence Platform" is unambiguous. Demo Guide page is excellent. Drift risk exists in financial/HR KPI sections. |
| **Methodology credibility** | 8/10 | 14-stage pipeline, 10 components, 4 macroblocks, Eligibility Gate, Activation Safeguard — all correctly implemented and visible. CS correctly external. |
| **Algorithm coherence** | 7/10 | IU formula displayed. Macroblock computation correct. Weights from config. Gap: 14-stage pipeline is not visually sequenced anywhere in the product. |
| **Demo data consistency** | 5/10 | Critical: activation page has hardcoded non-scenario-reactive constants (PILLAR_DEBT, DEBT_CONCENTRATION, NEXT_ACTIONS). Profile page hardcodes S2. No second demo company. |
| **UX/navigation** | 6/10 | Pages are long and dense — they work but they're exhausting. No persistent sidebar breadcrumb. Demo narrative exists in Demo Guide but not in the sidebar. |
| **Visual coherence** | 5/10 | Functional Tailwind. Inconsistent color application (IMPACT uses `kora-fun-green` and `kora-cosmic-blue` interchangeably). No premium data product feel. Not Palantir, not Linear, not Sigma — closer to a well-structured internal tool. |
| **Commercial readiness** | 4/10 | No sellable package page. No pricing signal. No "what you get" summary. No second demo company. No ROI story. No sales narrative in the platform itself. |
| **Technical architecture readiness** | 8/10 | Clean service layer (32 services). Gate 2 compliance is impeccable. No SQL, no Prisma, no real auth. Service interfaces are replaceable. |
| **SaaS readiness** | 3/10 | By design (Gate 2). All mock services. No DB, no auth, no real data. This is correct per doctrine — but it means zero SaaS readiness until Gate 2 closes. |
| **Investor/advisor credibility** | 7/10 | The methodology depth is genuinely impressive to a specialist. pre_empirical_calibration framing is honest. Gap: no external validation, no pilot result, no market size claim. |

---

## SECTION 2 — PLATFORM MAP

| Route | Intended User | Actual Purpose | Current Perceived Purpose | Status | Main Problem | Main Opportunity | Recommended Action |
|---|---|---|---|---|---|---|---|
| `/` (root) | All | Demo entry point | Demo Guide | Strong | Same as /demo-guide — redundant | Could be a proper landing | Keep as redirect to /demo-guide |
| `/demo-guide` | Next / devs / stakeholders | Guided product walkthrough | Product briefing document | Strong | Only known if you look for it | Best entry point for any handover | Pin to sidebar as "Guida al Prototipo" |
| `/company` | CEO / HR / ESG / CFO | Executive Cockpit | Intelligence dashboard | Strong | Dense — hard to read cold | First impression for company stakeholders | Small visual polish needed |
| `/company/kora-index` | CEO / ESG / HR | KORA Index deep dive | Methodology explainer | Strong | Very long — no in-page navigation | Most powerful page in demo | Add anchor nav within page |
| `/company/activation` | HR / People | Activation Debt analysis | Activation participation report | Usable | Hardcoded non-reactive constants (PILLAR_DEBT, SITE_ACTIVATION scenario binding unclear, NEXT_ACTIONS) | Best commercial hook — "silent majority" | Fix hardcoded constants, make scenario-reactive |
| `/company/financial` | CFO / Finance / HR | Budget-to-Human-Impact | Financial governance + HR KPI dashboard | Confusing | Too many things on one page: BTI engine, HR KPI correlation matrix, scenarios, investment recs, pillar breakdown — feels like 3 pages merged | Each section could stand alone | Split into BTI summary + HR KPI as tab/accordion |
| `/company/reports` | CEO / Board | Decision Pack | Report console | Strong | Export is disabled ("In arrivo") — looks unfinished | Board Pack is the #1 commercial deliverable | Prioritize PDF export simulation or mock PDF |
| `/company/data` | HR / IT | Data Room | Ingestion pipeline status | Usable | Not directly reviewed in this audit — lower priority | Shows "backstage" methodology | Keep |
| `/company/pillars` | HR / ESG | Pillar distribution analysis | Pillar breakdown | Usable | Not reviewed in detail | Good secondary detail view | Keep |
| `/company/contribution` | CEO / ESG | KORA Contribution companion | Companion indicator | Strong | Must stay separate from KORA Index — correctly so | Differentiator vs HR dashboard | Keep, add clearer "why separate" explanation |
| `/company/onboarding` | HR / admin | Onboarding status | Pipeline readiness view | Usable | Not reviewed in detail | Shows readiness gates | Keep |
| `/company/profile` | All company | Company identity + KORA summary | Company card | Weak | Hardcodes S2 scenario — always shows S2 regardless of switcher | Fix and use as "business card" | Fix scenario binding, then elevate |
| `/company/shared` | External stakeholders | KORA Shared View | Privacy-bounded external view | Strong | Good concept — not in demo guide route | Differentiator: shows what you can share externally | Add to demo guide |
| `/company/scoring` | Admin only | Boundary notice | Access denied for company roles | Usable | Correct concept — company can't run scoring | Shows governance correctly | Keep as-is |
| `/company/setup` | Admin | Company setup | Setup wizard | Not reviewed | Unknown | Could be part of pilot onboarding | Evaluate |
| `/company/workforce-baseline` | Admin / HR | Workforce baseline | Workforce composition view | Not reviewed | Unknown | Data foundation | Evaluate |
| `/company/uef-review` | Admin | UEF review queue | UEF pipeline stage | Not reviewed | Unknown | Shows 14-stage pipeline | Evaluate |
| `/company/ingestion` | Admin | Ingestion pipeline | Data intake simulation | Usable | Not reviewed in detail | Shows data entry point | Keep |
| `/my-kora` | Worker | Worker personal space | PIB + timeline + opportunities | Strong | Role gate works correctly — employer sees "access denied" | Privacy story for worker trust | |
| `/my-kora/dynamic-cv` | Worker | Dynamic Impact CV | Worker portfolio | Not reviewed | Unknown | Commercial differentiator for worker side | Evaluate |
| `/my-kora/privacy` | Worker | Consent Vault | Privacy controls | Not reviewed | Unknown | Critical for trust narrative | Evaluate |
| `/my-kora/opportunities` | Worker | Opportunities | Initiative suggestions | Not reviewed | Unknown | Shows worker value | Evaluate |
| `/my-kora/bookings` | Worker | Booking requests | Request/confirm state machine | Not reviewed | Should be request-only, no marketplace | Confirm no marketplace drift | Evaluate |
| `/my-kora/collective` | Worker | Collective initiatives | Group programs | Not reviewed | Unknown | KORA Contribution narrative | Evaluate |
| `/partner` | Partner | Partner Workspace | Partner operations | Strong | Very long single page — no sub-pages | Credible activation actor narrative | Split into Partner Home + sub-pages |
| `/advisor` | Advisor | Advisor Workspace | Professional validation layer | Strong | Long single page — Academy section is Future Vision within current page | Advisor role is well-defined | Split into Advisor Home + sub-pages |
| `/admin` | KORA internal | Operating Console | Internal oversight tool | Strong | GTM pipeline is buried in admin (correct, but prospects don't see it) | Best internal ops overview | Keep; consider public-safe "Platform Overview" for prospects |
| `/admin/gtm` | KORA internal | GTM pipeline | Sales pipeline | Not reviewed | Buried in admin | Could feed investor/advisor confidence | Evaluate for selective sharing |
| `/admin/portfolio` | KORA internal | Company portfolio | Cross-company view | Not reviewed | Unknown | Shows multi-tenant vision | Keep |
| `/admin/network` | KORA internal | Advisor + Partner network | Ecosystem view | Not reviewed | Unknown | Shows ecosystem breadth | Keep |
| `/admin/benchmarks` | KORA internal | Benchmark data | Industry comparison | Not reviewed | Hardcoded synthetic | Commercial hook for companies | Keep |
| `/admin/ai-onboarding` | KORA internal | AI Onboarding Engine | Ingestion flow | Not reviewed | Unknown | Shows AI-assisted methodology | Evaluate |
| `/future-vision` | All | Architectural roadmap | 4-phase product vision | Strong | Not linked from company workspace prominently | Investor/advisor narrative | Promote to sidebar, link from Decision Pack |
| `/demo-guide` | Stakeholders | Product briefing | Handover guide | Strong | Not prominently linked from landing | Best first page | Make it the true landing page |

---

## SECTION 3 — DEMO VS REAL PRODUCT SEPARATION

### Current State Assessment

**Is this separation currently clear?** Partially. The Demo Guide page documents it well. Within the product itself, the separation is implied but not architecturally surfaced in the navigation.

**Where is it blurred?**
1. The company workspace presents Meridiana Group as if it were a real tenant. The `synthetic_demo_data: true` badge is small and appears at the bottom of pages.
2. `/company/financial` shows KORA billing amounts (subscription, setup, advisory fees) for Meridiana — this blurs the line between "what Meridiana sees" and "what KORA charges."
3. The Admin console shows GTM pipeline stages (`demo_shown`, `pilot_active`) — mixing demo artifact with real commercial stage concept.
4. My KORA PIB values (71/100, etc.) look like real individual scores — the "synthetic demo" caveat is in small print.

### Separation Clarity Assessment

| Layer | Currently Clear? | Problem | Fix |
|---|---|---|---|
| Demo Mode (Meridiana, synthetic seed) | Mostly | `synthetic_demo_data: true` is small; no persistent "DEMO MODE" indicator | Add persistent demo banner or sidebar indicator |
| Sellable Foundation Light Pilot | No — doesn't exist as a distinct layer | No page says "here's what you'd actually get as a pilot client" | Create a `/pilot` or `/foundation-light-offer` page |
| Full SaaS Vision | Yes — Future Vision page | Good | Keep, promote |

### Which pages belong where

**Demo Mode (current):**
- All `/company/*` pages with Meridiana data
- `/my-kora/*` with synthetic personas
- `/partner` with Città Aperta APS
- `/advisor` with Dr. Francesca Lombardi
- `/admin/*` with synthetic portfolio
- `/demo-guide`

**Sellable Foundation Light Pilot (missing — must be created):**
- A dedicated `/pilot` page explaining the pilot offer
- A data inventory template
- An eligibility classification form
- A pilot Decision Pack sample (mockup PDF)
- A workshop agenda template

**Full Platform Vision:**
- `/future-vision` — exists and is good
- Future Vision sections embedded in Advisor and Partner pages — well-labeled

### Recommended Architecture

```
Layer 1: Demo Mode
  - Current synthetic Meridiana experience
  - Clearly labeled DEMO in sidebar/header
  - Entry: /demo-guide

Layer 2: Foundation Light Pilot (MISSING)
  - /pilot — "What you get" pilot page
  - /company/shared — shared view for external stakeholders
  - Decision Pack PDF mock
  - Advisory methodology box

Layer 3: Full Platform Vision
  - /future-vision — exists, good
```

---

## SECTION 4 — SELLABLE PRODUCT AUDIT

### The Most Realistic First Sellable Product: KORA Foundation Light Pilot

**Hypothetical offer:**
1. Data inventory workshop (HR, welfare, LMS, ESG data audit)
2. Eligibility classification of existing welfare/people programs
3. Budget-to-Human-Impact preliminary analysis
4. Activation Debt estimate
5. Preliminary KORA Index (with pre_empirical_calibration label)
6. Confidence Score
7. Decision Pack (PDF report)
8. Executive presentation / board-ready workshop
9. Roadmap of recommended reallocations

### Sellability Assessment

**1. Is the current prototype enough to sell this pilot?**
YES — if the founder does the selling, guides the demo, and sets expectations about "product prototype." The methodology depth in KORA Index Detail and Financial pages is genuinely impressive to a knowledgeable HR or ESG director.

**2. What is missing to make it sellable?**
- [ ] A pilot offer page (`/pilot` or equivalent) that explains what the company gets
- [ ] A mock PDF Decision Pack (even a static screenshot)
- [ ] A price signal (even if just "pilot starting at €X/company")
- [ ] A second demo company for comparison
- [ ] A clear data intake form/checklist (data inventory)
- [ ] An onboarding flow simulation for a real company (no data yet)

**3. Which screens support the sales conversation?**
- ✅ `/company/kora-index` — best methodology explainer, shows depth
- ✅ `/company/activation` — "silent majority" narrative is commercially compelling
- ✅ `/company/financial` — BTI section connects spend to signal
- ✅ `/company/reports` — Decision Pack shows the deliverable
- ✅ `/demo-guide` — essential briefing before any demo
- ✅ `/company` (Executive Cockpit) — good C-suite entry point
- ✅ `/future-vision` — shows roadmap ambition

**4. Which screens hurt the sales conversation?**
- ⚠️ `/company/financial` — the "KORA Billing" section (subscription/setup/advisory fees shown to Meridiana) confuses prospects. This is KORA's own billing to the company — but it looks like a SaaS subscription inside the product they're evaluating.
- ⚠️ `/company/activation` — hardcoded constants (PILLAR_DEBT, NEXT_ACTIONS) that don't change when switching scenarios look like bugs
- ⚠️ `/company/profile` — always shows S2 regardless of scenario switcher

**5. What should be hidden from prospects?**
- Admin workspace (internal tool — not for prospects)
- Scoring page (just a boundary notice — confusing)
- Setup / workforce-baseline (process pages, not insight pages)
- Any page with "Demo" CTAs that are disabled without explanation

**6. What should be emphasized?**
- KORA Index Detail — methodology depth
- Activation Debt — commercial hook ("your workers are not being reached")
- Budget-to-Human-Impact — CFO hook ("your welfare budget is 48% economic relief that generates zero IU")
- Decision Pack — deliverable hook ("this is what you receive")
- Future Vision — ambition hook ("this is where we're going")

**7. Conceptual price range:**
- Foundation Light Pilot: €8.000–€20.000 setup + advisory fee
- Annual platform subscription (post-Gate 2): €15.000–€40.000/year depending on workforce size
- Advisory per-session: €1.500–€3.000/session

**8. What proof is still missing?**
- At least one pilot result (even internal)
- An external methodology review or endorsement
- A case study (even partially anonymized)

### Commercial Action Backlog

**Must-have before first company call:**
- [ ] Fix activation page hardcoded constants (data integrity)
- [ ] Fix company/profile S2 hardcoding
- [ ] Create `/pilot` offer page (Foundation Light Pilot description, deliverables, process, price signal)
- [ ] Mock PDF Decision Pack (static, downloadable or viewable)
- [ ] Demo guide route tested end-to-end

**Nice-to-have before first company call:**
- [ ] Second demo company with different scenario
- [ ] Visual polish on Executive Cockpit and KORA Index cards
- [ ] Sidebar "DEMO MODE" persistent indicator
- [ ] Remove or reposition KORA Billing section on financial page

**Can wait until after first paid pilot:**
- [ ] PDF export of Decision Pack (real)
- [ ] Real data upload simulation
- [ ] Multi-tenant admin
- [ ] Supabase / Gate 2 production infrastructure

---

## SECTION 5 — ALGORITHM / METHODOLOGY AUDIT

### KORA Index v3

**Is the concept clear?** Yes — well-explained in company/kora-index with the 4-macroblock architecture visible.
**Is the formula visible?** Partially — macroblock weights are shown. The IU formula (NM × BC × CQ × EV × CF × AGF) is referenced but not visualized.
**Is it overclaimed?** No — strong pre_empirical_calibration disclaimers everywhere.
**Is it underexplained?** The 14-stage pipeline is mentioned but never sequentially displayed in the UI.
**Does it conflict with doctrine?** No.
**Credible to enterprise buyer?** Yes, if they understand the pre-calibration status.
**Credible to methodology advisor?** Yes — the component breakdown is rigorous.
**What should be changed?** Add a visual 14-stage pipeline view (even static).

### Macroblocks

**Status:** ✅ Correct. REACH=25%, QUALITY=30%, EQUITY=25%, BTI=20%. Weights from config.
**Issue:** In some UI copy, "BTI" appears alongside "Budget-to-Human-Impact Engine" — naming is consistent but the abbreviation could be clarified.

### Activation Reach (AR + MAR)

**Is the concept clear?** Yes.
**Issue:** The "meaningful activation" threshold (MAR) is not explicitly defined for end users. What makes an activation "meaningful" (above materiality threshold) is not explained in the UI — only in the methodology glossary.

### Activation Quality (NI, VR, CO)

**Is the concept clear?** Yes.
**Issue:** VR is well-explained. CO is present but its definition ("cross-period sustained engagement") is not intuitive — a note is needed.

### Distribution & Equity (WB, PC, PB, EQ)

**Is the concept clear?** Mostly.
**Critical issue:** EQ definition is correctly stated in the financial page disclaimer: "EQ = Equity (equità distributiva dell'attivazione) — non Evidence Quality." This is critical and in the right place. However, the company/kora-index page shows EQ as a component without the explicit disambiguation. Risk of confusion for a new viewer.

### Budget-to-Human-Impact (BTI)

**Is the concept clear?** Yes — the financial page has excellent depth.
**Is it overclaimed?** No — "correlazione ≠ causalità" appears multiple times correctly.
**Issue:** The HR KPI correlation matrix (CORR_MATRIX) in the financial page uses synthetic data to suggest strong correlations between KORA Index and retention/engagement. This is correct per doctrine (aggregate, directional), but visually looks like a research finding. The disclaimer is present but small relative to the visual weight of the matrix.
**Critical finding:** The "Strong" (●●) associations in the matrix could be misread as empirical evidence. The disclaimer "Dati sintetici aggregati" must be more prominent.

### Confidence Score (CS)

**Status:** ✅ Correct. Displayed everywhere alongside KORA Index. "ESTERNO · peso = 0" correctly labeled.
**No issues found.**

### Activation Safeguard

**Status:** ✅ Correct. CLEAR/WARNING/FLAGGED with correct thresholds. Shown on executive cockpit, kora-index, activation, reports.
**Issue:** The FLAGGED threshold in the doctrine/CLAUDE.md says AR < 20% OR MAR < 15%, but the methodology-config.json has different values. SPRINT_0_AUDIT.md confirms config matches CLAUDE.md. No issue.

### Eligibility Gate

**Status:** ✅ Correct. Eligible/Limited/Blocked correctly explained. Blocked by design is explicit.
**Issue:** The word "perimetro fiscale" does not appear in the UI — correct. But "welfare" still appears occasionally as a category label, which is doctrinal drift risk.

### Activation Debt

**Status:** ✅ Values correct (S1=€45K, S2=€35K) after fixing the €84K hardcoded value.
**Wait:** Looking at the current activation/page.tsx code, the debtEur is now:
```
const debtEur = activeScenario === 'S2' ? 35_000 : 45_000;
```
This IS scenario-reactive. The €84K issue from SPRINT_0_AUDIT was FIXED.
However, the SITE_ACTIVATION array (100+90+35+25=250) is also correct now — this was also FIXED.
The remaining hardcoded non-reactive items are: PILLAR_DEBT, DEBT_CONCENTRATION (top_12_iu_pct=0.64, bottom_50_iu_pct=0.12), NEXT_ACTIONS, PARTNER_SUGGESTIONS.

**DEBT_CONCENTRATION** in the current code shows:
- top_12_iu_pct: 0.64 (matches S1 doctrine ✅)
- bottom_50_iu_pct: 0.12 (matches S1 doctrine ✅)
- But these don't change when switching to S2 ❌

### KORA Contribution

**Status:** ✅ Correctly separate. `is_kora_index_component: false`. Companion indicator never merged.

### Worker PIB

**Status:** ✅ Correctly private. Employer cannot access. My KORA gates by role.

### Dynamic Impact CV

**Not reviewed in detail.** Exists at `/my-kora/dynamic-cv`. Correctly worker-owned per service code.

### Hardcoded Numbers Check

| Value | Location | Status |
|---|---|---|
| Methodology weights | methodology-config.json | ✅ — not hardcoded in components |
| SITE_ACTIVATION workers (100,90,35,25) | activation/page.tsx | ✅ Fixed — sums to 250 |
| debtEur (45K/35K) | activation/page.tsx | ✅ Fixed — scenario-reactive |
| DEBT_CONCENTRATION (0.64, 0.27, 0.12) | activation/page.tsx | ⚠️ Not scenario-reactive (correct for S1, wrong for S2) |
| PILLAR_DEBT coverage rates | activation/page.tsx | ⚠️ Hardcoded, not scenario-reactive |
| NEXT_ACTIONS | activation/page.tsx | ⚠️ Hardcoded, not from ExplainabilityService |
| PARTNER_SUGGESTIONS | activation/page.tsx | ⚠️ Hardcoded, not from service |
| CANONICAL_PILLAR_AGGREGATE | reports/page.tsx | ⚠️ Hardcoded S1 values, not scenario-reactive in reports |
| INVESTMENT_RECS budget values (+€25K, +€18K, +€12K demo) | financial/page.tsx | ⚠️ Hardcoded demo labels — acceptable but document |
| CORR_MATRIX values | financial/page.tsx | ⚠️ Hardcoded — acceptable as synthetic demo, but should be labeled more prominently |
| ADVISOR_PROFILE hardcoded constants | advisor/page.tsx | ⚠️ All hardcoded inline — no seed file, no service |
| PARTNER_PROFILE hardcoded constants | partner/page.tsx | ⚠️ All hardcoded inline — no seed file, no service |

---

## SECTION 6 — DATA / TENANT / ARCHITECTURE AUDIT

### Where do demo values currently live?

| Data | Location | Pattern |
|---|---|---|
| Company-level KORA Index (Meridiana S1/S2) | `data/synthetic/company-aggregates.json` | ✅ Seed file, read via ScoringSimulatorService |
| BTI records | `data/synthetic/*.json` | ✅ Seed file, read via BudgetToHumanImpactService |
| Methodology weights | `data/methodology/methodology-config.json` | ✅ Read via lib/methodology-config/v0.1.ts |
| Activation page constants (PILLAR_DEBT, etc.) | `app/company/activation/page.tsx` | ❌ Hardcoded in page, not in seed or service |
| Reports canonical pillar aggregate | `app/company/reports/page.tsx` | ❌ Hardcoded in page |
| Advisor profile | `app/advisor/page.tsx` | ❌ Hardcoded inline, no service |
| Partner profile | `app/partner/page.tsx` | ❌ Hardcoded inline, no service |
| Admin platform analytics | `services/admin-preview/AdminPreviewService.ts` | ✅ Service |

### Is there a clean source of truth?

**Partially.** Company-level data (company-aggregates.json) is the canonical source for KORA Index outputs. BTI data is correct. However, activation page constants and advisor/partner profiles are inline — no single source of truth.

### Is Meridiana clearly a demo tenant?

Yes — `synthetic_demo_data: true` labels are present on all screens. However:
- The label is small (10px font, bottom of page)
- No persistent "DEMO MODE" banner
- The product looks real — which is a feature for demos but could mislead

### Is there a second demo company?

**No.** Nexo Dynamics and Fortis Manufacturing exist in seed files as company entities but do not have full KORA Index data and are not navigable in the demo. This is a significant gap for commercial demos — you cannot show "your KORA Index compared to a peer."

### Are services clean enough for a dev to extend?

**Yes.** 32 services with clear separation of concerns. Interface design allows mock → production swap. The pattern is consistent and well-documented via CLAUDE.md.

### Technical Architecture Gaps

1. **No second demo tenant navigable in UI** — must create Nexo Dynamics or Fortis as a full demo tenant
2. **Advisor and partner pages use inline constants** — should be extracted to seed files and services
3. **Activation page has 4 non-reactive hardcoded constants** — must move to ExplainabilityService
4. **`company/profile` hardcodes S2** — must use `useScenario()` hook

### Recommended Technical Path

```
Step 1: Data centralization
  - Move PILLAR_DEBT, DEBT_CONCENTRATION, NEXT_ACTIONS, PARTNER_SUGGESTIONS
    from activation/page.tsx into ExplainabilityService
  - Move CANONICAL_PILLAR_AGGREGATE in reports/page.tsx to service
  - Extract advisor and partner inline constants to seed files + services

Step 2: Second demo tenant (Nexo Dynamics)
  - Create company-aggregates entry for Nexo S1
  - Create BTI record for Nexo
  - Create kora-index-output for Nexo
  - Enable role-switch to show Nexo workspace
  - Adds comparison: "Meridiana 34 vs Nexo 61 — why?"

Step 3: Scenario binding fix
  - Fix company/profile S2 hardcoding
  - Ensure all activation page constants are scenario-reactive

Step 4: Tenant model (post-Gate 2)
  - lib/demo/demo-tenants.ts as single source for all tenant configurations
  - Prepare interface for real tenant data injection

Step 5: Engine modules (post-Gate 2)
  - lib/kora-engine/ for real IU computation
  - Supabase for real data persistence
```

---

## SECTION 7 — UX / INFORMATION ARCHITECTURE AUDIT

### Does the sidebar make sense?

Not fully audited (Sidebar.tsx not read in detail), but from route structure and demo guide:
- Company workspace: well-organized
- Worker (My KORA): separate and well-gated
- Partner / Advisor: single pages — too flat
- Admin: comprehensive but buried
- Demo navigation: only in /demo-guide, not persistent

### Navigation Recommendations

**A. Company Workspace — KEEP/IMPROVE**
| Item | Action |
|---|---|
| Executive Cockpit | Keep |
| KORA Index | Keep |
| Activation & Partecipazione | Keep — fix data |
| Budget-to-Human-Impact | Rename from "Financial Governance" |
| Data Room | Keep |
| Decision Pack | Keep — prioritize PDF mock |
| Pillar Analysis | Keep |
| KORA Contribution | Keep |
| Onboarding | Keep |
| Company Profile | Keep — fix scenario binding |
| Shared View | Keep — promote to nav |
| Scoring | Keep as boundary notice |
| UEF Review | Keep |

**B. Worker / My KORA — KEEP AS-IS**
| Item | Action |
|---|---|
| My KORA Home | Keep |
| Dynamic Impact CV | Keep |
| Privacy & Sharing | Keep |
| Opportunities | Keep |
| Bookings | Keep |
| Collective | Keep |

**C. Partner Network — EXPAND**
| Item | Action |
|---|---|
| Partner Home | Split current long page into Home + Services + Evidence |

**D. Advisor — EXPAND**
| Item | Action |
|---|---|
| Advisor Home | Split current long page into Home + Review Queue + Trust Ledger |

**E. KORA Admin — KEEP INTERNAL**
| Item | Action |
|---|---|
| All admin pages | Internal only — do not expose to prospects |

**F. Demo / Handover — PROMOTE**
| Item | Action |
|---|---|
| Demo Guide | Pin to sidebar as first item |
| Future Vision | Promote to sidebar, visible to all roles |

**G. Future Vision — KEEP AND PROMOTE**
Already a distinct section, but should be more prominently linked from company workspace.

### Critical UX Issues

1. **Pages are too long.** Financial page (~800 lines), Reports page (~850 lines), Partner page (~1170 lines), Advisor page (~900 lines). No anchor navigation within pages. Users scroll endlessly.
2. **No persistent scenario indicator in header.** When you switch from S1 to S2, it's not immediately obvious which scenario is active when looking at a deep page.
3. **The demo guide is not in the sidebar.** The most important onboarding page is only accessible by URL.
4. **No breadcrumb navigation.** Deep pages have no context of where you are.
5. **Role switcher UX is unknown** (not audited) — but this is critical for demo flow.

---

## SECTION 8 — PAGE-BY-PAGE AUDIT

### `/demo-guide` — Demo Guide
- **What works:** Complete, honest, excellent briefing. "KORA non è" section is perfectly positioned. Route suggestions for Next are directly actionable. Demo vs Real separation is clearly documented.
- **What is confusing:** Not in sidebar navigation — must know URL.
- **Doctrine risk:** None.
- **Commercial credibility:** High — this page alone would convince a sophisticated stakeholder.
- **Visual quality:** 7/10
- **Copy quality:** 9/10
- **Methodology clarity:** 9/10
- **Recommended action:** Pin to sidebar. Make it the true root URL. Add link from Executive Cockpit.

### `/company` — Executive Cockpit
- **What works:** KORA Index Command Center is strong. Trust Governance Strip with CS, methodology_version_id, calibration_status is correct. Pillar distribution chart. Priority Action Panel.
- **What is confusing:** "Readiness & Output" block shows worker account counts ("3 my_kora_enabled") which is confusing for a C-suite user.
- **Doctrine risk:** None.
- **Commercial credibility:** High — good first impression.
- **Visual quality:** 7/10
- **Copy quality:** 7/10
- **Methodology clarity:** 7/10
- **Recommended action:** Remove worker account count from executive cockpit. Add "vai a Decision Pack →" as primary CTA. Consider dark card for KORA Index (white on dark) for more visual impact.

### `/company/kora-index` — KORA Index Detail
- **What works:** Most complete, most rigorous page. All 10 components shown with correct weights. Macroblock cards with S1→S2 delta. Eligibility Gate, Economic Relief, Blocked by Design, BTI panels all present. Explainability Panel. Methodology Glossary.
- **What is confusing:** Extremely long — no anchor navigation. The "Technical Preview / Methodology Debug" collapsed section is good but its label ("Non sostituisce il KORA Index v3") is confusing — why is it there at all?
- **Doctrine risk:** EQ shown in ComponentBreakdown but without "not Evidence Quality" disambiguation — low risk but worth adding tooltip.
- **Commercial credibility:** High for methodology-literate audience.
- **Visual quality:** 7/10
- **Copy quality:** 8/10
- **Methodology clarity:** 9/10
- **Recommended action:** Add page-level anchor nav. Add tooltip on EQ disambiguation. Remove or relabel Technical Preview section.

### `/company/activation` — Activation & Participation
- **What works:** Activation Debt hero with "silent majority" framing is the best commercial hook in the platform. Safeguard panel. Department activation rates (from service — scenario-reactive). Site/Location gap with privacy suppression.
- **What is confusing:** PILLAR_DEBT coverage rates, DEBT_CONCENTRATION, NEXT_ACTIONS, PARTNER_SUGGESTIONS are hardcoded and don't change in S2 scenario. This looks like a bug in a demo.
- **Doctrine risk:** None.
- **Commercial credibility:** Medium — data integrity issues undermine the "dynamic analysis" narrative.
- **Visual quality:** 6/10
- **Copy quality:** 7/10
- **Methodology clarity:** 7/10
- **Recommended action:** Move 4 hardcoded constants to ExplainabilityService. Create S1/S2 versions of Pillar Debt and Next Actions.

### `/company/financial` — Financial Governance & Budget-to-Human-Impact
- **What works:** BTI Executive Hero (4 cards) is excellent. Pillar budget breakdown with service data. HR KPI correlation table is impressive depth. Scenario interpretation panel. Investment recommendations.
- **What is confusing:** Three major sections crammed into one page: (1) Budget overview + KORA billing, (2) BTI analysis, (3) HR KPI correlation. The KORA Billing section (subscription/setup/advisory fees for Meridiana) is particularly confusing — it suggests Meridiana is paying KORA inside the product UI, which is not what a prospect should see first. The "Foundation Light Preview" badge is correct but insufficient.
- **Doctrine risk:** Low — all disclaimers present. "Correlazione ≠ causalità" appears correctly. But the correlation matrix with 35 cells and "forte/moderata/debole" ratings could look like empirical research to a non-specialist.
- **Commercial credibility:** Medium for CFO/ESG audience. Needs splitting.
- **Visual quality:** 6/10 (too dense)
- **Copy quality:** 7/10
- **Methodology clarity:** 8/10
- **Recommended action:** Remove KORA Billing section from company-facing view (it belongs in admin). Split page into BTI view + HR KPI view (tabs or sub-routes). Make "Dati sintetici" on correlation matrix more visually prominent.

### `/company/reports` — Decision Pack
- **What works:** The dark gradient hero is the most visually polished element in the platform. Version timeline. Semester comparison section. All 8 canonical sections. Methodology boundary footer.
- **What is confusing:** PDF Export is disabled ("In arrivo") — the primary commercial deliverable is a disabled button. The "Stato Decision Pack: Bozza disponibile — revisione advisor richiesta" banner feels like a real workflow status (it is, for demo). The pilot analysis, recommendations, action plan sections are strong.
- **Doctrine risk:** None.
- **Commercial credibility:** High — the Decision Pack is the correct commercial deliverable and the page represents it well.
- **Visual quality:** 8/10 (hero is great)
- **Copy quality:** 8/10
- **Methodology clarity:** 8/10
- **Recommended action:** Priority: create a mock/static PDF Decision Pack that can be "downloaded." The export button is the #1 commercial gap. Even a 2-page PDF screenshot would significantly increase credibility.

### `/partner` — Partner Workspace Light
- **What works:** Correctly frames partners as "activation actors, not marketplace vendors." Evidence protocol status table. Financial preview with clear "Nessun pagamento eseguito" disclaimers. Collective initiative section. KORA Activation Community Future Vision section correctly labeled.
- **What is confusing:** Very long single page (~1170 lines). The financial preview with "€ 4.800 demo" and "Liquidabile — demo" could be misread as actual financial commitments. Daily agenda section shows specific times (09:30, 11:00, etc.) which feels overly operational for Foundation Light.
- **Doctrine risk:** None.
- **Commercial credibility:** Good — partner role is well-defined. No marketplace drift.
- **Visual quality:** 6/10 (too long)
- **Copy quality:** 7/10
- **Methodology clarity:** 7/10
- **Recommended action:** Split into 3 sub-pages: Partner Home, Services & Evidence, Operations Preview. Remove daily agenda (too operational, confusing in demo). Keep financial preview but add stronger "solo demo" visual treatment.

### `/advisor` — Advisor Workspace
- **What works:** Evidence protocol review model is clearly explained. Review queue with priorities. Trust Ledger. Academy section correctly labeled Future Vision. Privacy boundary section ("L'Advisor può vedere / non può vedere") is excellent.
- **What is confusing:** Single long page (~900 lines). The "Advisor Process Audit" model description is written as a paragraph — important content buried in prose. Academy credits (18/24) and course list are in Future Vision but displayed with the same visual weight as current features.
- **Doctrine risk:** None.
- **Commercial credibility:** Good — advisor role is well-defined and credible.
- **Visual quality:** 6/10
- **Copy quality:** 7/10
- **Methodology clarity:** 7/10
- **Recommended action:** Split into Advisor Home + Review Queue + Trust Ledger. Visually demote Academy section (it's Future Vision). Promote the audit model explanation to a pinned callout.

### `/admin` — KORA Operating Console
- **What works:** Excellent internal tool. AI Onboarding Engine featured section. Activation Orchestration lifecycle display. Company Portfolio. KORA Index Registry. GTM pipeline. Gate status. Billing preview with "Nessun Stripe" disclaimer.
- **What is confusing:** The admin page conflates too many things: internal metrics, company management, GTM pipeline, methodology governance. As internal-only this is fine. But if ever shown to investors, it needs a cleaner read.
- **Doctrine risk:** None.
- **Commercial credibility:** Internal tool — not for prospects.
- **Visual quality:** 7/10
- **Copy quality:** 7/10
- **Methodology clarity:** 7/10
- **Recommended action:** Keep. Create a "KORA Ecosystem Overview" page (public-safe version of admin analytics) for investor/advisor meetings.

### `/my-kora` — My KORA Home
- **What works:** Role gate correctly blocks employer. PIB private section with "privato-lavoratore" badge. KORA Link stepper demo is interactive and well-explained. "Company KORA Snapshot" correctly shows only aggregate data. "What the company sees / does not see" section is excellent for trust narrative.
- **What is confusing:** Worker opportunities count shows "preview.opportunities.length + 3" — the +3 is hardcoded. The PILLAR_ENHANCED constant is inline hardcoded.
- **Doctrine risk:** None — PIB is correctly private.
- **Commercial credibility:** Very good for worker trust narrative. Important for GDPR/privacy objection handling.
- **Visual quality:** 6/10
- **Copy quality:** 8/10
- **Methodology clarity:** 7/10
- **Recommended action:** Fix the "+3" hardcoded count. Extract PILLAR_ENHANCED to service.

### `/future-vision` — Future Vision
- **What works:** Clean 4-phase architecture. Dependency logic table. Phase timeline. All correctly labeled "Not Active in Foundation Light." Module cards with correct visual hierarchy (active/upcoming/roadmap/vision).
- **What is confusing:** Not linked from company workspace sidebar — only accessible via demo-guide or direct URL.
- **Doctrine risk:** None.
- **Commercial credibility:** Good for investor/advisor audience.
- **Visual quality:** 7/10
- **Copy quality:** 8/10
- **Methodology clarity:** 8/10
- **Recommended action:** Promote to sidebar. Link from Decision Pack and Executive Cockpit. Consider adding "Current Status" metrics (KORA Index = 34, CS = 60%, etc.) as a "where you are now" anchor before showing the vision.

---

## SECTION 9 — VISUAL / DESIGN SYSTEM AUDIT

### Current State

The product uses Tailwind CSS v4 with custom KORA brand tokens (kora-violet, kora-cosmic-blue, kora-fun-green, pillar-life, pillar-growth, etc.). The typography uses Space Grotesk + Geist.

**Visual DNA today:** Clean, structured, information-dense. Functional. Resembles a well-built internal tool — closer to a Notion database or Airtable than to Palantir, Linear, or Sigma.

**Does it feel like a serious data product?** Partially. The dark Executive Cockpit header and the dark Decision Pack hero are the two strongest moments. The rest is white-card / slate-gray functional UI.

### What Works
- Typography: Space Grotesk gives a product-forward feel
- Pillar color system is consistent across most views
- Badge system (CLEAR/WARNING/FLAGGED, pre_empirical_calibration, synthetic_demo_data) is coherent
- The dark hero in Decision Pack is visually premium
- Methodology boxes (monospace, small print) create credibility

### What Doesn't Work
1. **IMPACT pillar color inconsistency:** Sometimes `kora-fun-green`, sometimes `kora-cosmic-blue`. Executive cockpit uses one, financial page uses another.
2. **Card hierarchy is flat:** All cards look the same regardless of importance. The KORA Index number (34/100) deserves more visual dominance.
3. **Tables dominate the experience:** Financial page, reports page, advisor page, partner page — all table-heavy. No data visualization beyond bar charts and pillar charts.
4. **Empty states are generic:** "Nessun dato disponibile" with no illustration or CTA.
5. **Buttons are disabled without clear explanation:** Multiple "Demo" or "In arrivo" buttons with no visual differentiation from active buttons.
6. **Font size 10px used everywhere:** The `text-[10px]` class appears hundreds of times. Everything important drowns in fine print.

### Visual Score: **5/10**

### Recommendations for Next

1. **Elevate the KORA Index number.** It should be the hero element — large, prominent, impossible to miss.
2. **Design 5 pillar signature colors** with consistent use across every component.
3. **Create 4 macroblock visual blocks** with distinct iconography or color bands.
4. **Design a "score gauge" or "activation dial"** to replace the raw number + percentage display.
5. **Create a component for "pre_empirical_calibration" badge** — it should be visible but not alarming.
6. **Redesign the Decision Pack hero** as a PDF-style document cover.
7. **Add data visualization:** Activation heat map by department, pillar radar chart, BTI funnel.

### Pages that Need Most Visual Work (in order)
1. `/company` — Executive Cockpit (first impression)
2. `/company/kora-index` — most important page, needs hierarchy
3. `/company/activation` — data integrity + visual simplification
4. `/company/financial` — too dense, needs splitting
5. `/company/reports` — almost there; needs PDF mock

### Pages that Work and Should NOT be Redesigned
1. Demo Guide — content is excellent, don't touch
2. Future Vision — clean 4-phase layout
3. My KORA Home — privacy narrative is correct and well-presented
4. Admin Operating Console — internal tool, don't over-invest

---

## SECTION 10 — NAMING / COPY / ITALIAN AUDIT

### Terminology Assessment

| Term | Current Usage | Verdict | Recommended |
|---|---|---|---|
| KORA Index | Everywhere | ✅ Keep | KORA Index v3 |
| Budget-to-Human-Impact | Financial page, KORA Index | ✅ Keep (correct name per recent sprint) | Budget-to-Human-Impact |
| Activation Debt | Activation page, Executive Cockpit | ✅ Keep | Activation Debt |
| KORA Contribution | Contribution page | ✅ Keep | KORA Contribution |
| Confidence Score | All pages | ✅ Keep | Confidence Score (CS) |
| Activation Safeguard | All pages | ✅ Keep | Activation Safeguard |
| Eligible / Limited / Blocked | KORA Index, Demo Guide | ✅ Keep | As-is |
| Personal Impact Balance (PIB) | My KORA | ✅ Keep | PIB / Personal Impact Balance |
| Dynamic Impact CV | My KORA | ✅ Keep | Dynamic Impact CV |
| Impact Units (IU) | Multiple pages | ✅ Keep | Impact Units |
| Foundation Light | Demo Guide, headers | ✅ Keep | Foundation Light v0.1 |
| pre_empirical_calibration | Footer labels | ✅ Keep (critical) | pre_empirical_calibration |
| "welfare" | Multiple pages | ⚠️ Limit | "programmi people" or "iniziative welfare" when necessary — never as product category |
| "governance della spesa" | NOT FOUND ✅ | ✅ Correct — absent | — |
| Correlazione ≠ causalità | Financial page | ✅ Keep — correct | As-is |
| "Financial Governance" | Page title | ⚠️ Rename | "Budget-to-Human-Impact" (simpler, clearer) |
| "Resoconto attività e fatturazione" | Partner page | ⚠️ Clarify | "Registro attività partner — solo demo, nessuna fattura" |
| "KORA Billing" | Financial page section | ⚠️ Remove from company view | Move to admin only |

### Italian/English Mixing Assessment

**Overall:** Correct per doctrine. English for proprietary names (KORA Index, Confidence Score, Dynamic Impact CV, etc.), Italian for descriptions and UX copy.

**Issues found:**
1. "Foundation Light Preview" appears as an English label on Italian pages — this is acceptable (proprietary name) but could be "Foundation Light — Anteprima"
2. "Pilot attivo / Richiesta in review / Interesse ricevuto" (partner page) mixes Italian and Italian-English — consistent within page
3. "scoring_readiness", "calibration_status" appear in English monospace — correct per doctrine

### Top 20 Copy Improvements

1. Rename `/company/financial` title from "Financial Governance & Budget-to-Human-Impact" to "Budget-to-Human-Impact"
2. Remove "KORA Billing" section from company-facing financial page
3. Add "KORA non misura persone — misura l'organizzazione" as a persistent subtitle on Executive Cockpit
4. Add EQ disambiguation tooltip in KORA Index component breakdown: "EQ = Equità distributiva — non qualità evidenza"
5. Replace disabled "Esporta Board Pack" button with "Richiedi Decision Pack — in preparazione"
6. Add "Dati sintetici — nessun dato reale" persistent header banner on all demo pages
7. Rename "Readiness & Output" block on Executive Cockpit to "Stato Onboarding & Pipeline"
8. Remove "Account demo worker: 3" from Executive Cockpit (confusing for employer)
9. Add "Questo prototipo NON è il prodotto finale" label on Demo Guide badges
10. Add "Confronto scenari: cosa cambierebbe con una strategia diversa?" as section title before S1→S2 comparison on KORA Index page
11. Add "Perché il Confidence Score non entra nel KORA Index?" collapsible explainer on KORA Index page
12. Rename "Activation Debt — Maggioranza Silenziosa" to "Activation Gap — La Maggioranza Silenziosa" (cleaner)
13. Add "Questo segnale è direzionale, non predittivo" to each HR KPI row on financial page
14. Add "Iniziative e programmi" instead of "welfare" in pillar descriptions
15. Replace "Partner suggeriti" on activation page with "Opportunità di copertura pillar" (less marketplace-adjacent)
16. Add a "Leggi prima" callout on Executive Cockpit linking to Demo Guide
17. Partner page: Replace "Liquidabile — demo" badge with "Pagamento da definire fuori piattaforma"
18. Add "KORA misura ciò che accade dopo la spesa" as page eyebrow on KORA Index Detail
19. Rename "Metodologia & Gate Status" in admin to "Stato metodologia KORA" 
20. On My KORA home, add "Il datore di lavoro vede l'organizzazione, non te" as a hero tagline

---

## SECTION 11 — ROLE-SPECIFIC AUDIT

### 1. Company CEO / Board
**Value proposition clear?** Yes — KORA Index gives a single organizational number with breakdown.
**What they see?** Executive Cockpit, Decision Pack, KORA Index, Activation summary.
**What do they get from KORA?** Organizational intelligence on activation quality, budget efficiency, workforce engagement — in board-ready format.
**What's missing?** Peer comparison (second demo company). Executive presentation mode (not scrollable UI, but a slide-like view).
**What looks wrong?** "Account demo worker: 3" in Executive Cockpit — irrelevant to CEO.
**What would make them pay?** A real Decision Pack PDF with their company's data. A workshop showing the Activation Debt story.

### 2. HR / People Leader
**Value proposition clear?** Yes — pillar coverage, activation rates, silent majority identification.
**What do they get?** Activation Debt by department and site. Partner suggestions. Pillar Debt. Recommendations.
**What's missing?** Clear "program recommendation" from the system (currently Next Actions are hardcoded, not dynamic).
**What looks wrong?** The hardcoded PILLAR_DEBT on the activation page — if switching to S2, the debt levels don't update.
**What would make them use it?** Real data from their welfare provider + a 90-day action plan from advisor.

### 3. CFO / Finance
**Value proposition clear?** Yes — cost per IU, Activation Debt, economic relief share, BTI macroblock.
**What do they get?** Budget allocation by pillar, cost efficiency analysis, HR KPI correlation.
**What's missing?** A one-pager "Budget-to-Human-Impact Summary" as a printable view.
**What looks wrong?** KORA Billing section (subscription/setup/advisory fees) showing inside the product they're evaluating.
**What would make them pay?** "Your €185K welfare budget: 48% generates zero impact. Here's the €45K opportunity."

### 4. ESG / Sustainability
**Value proposition clear?** Yes — but the ESG positioning needs to be clearer.
**What do they get?** CSR evidence layer, KORA Index as ESG adjacent signal, Eligibility Gate for ESG-eligible programs.
**What's missing?** A dedicated ESG narrative page. The CSR disclaimer ("KORA supporta la rendicontazione CSR/ESG...") is correct but buried in footers.
**What looks wrong?** Nothing doctrinally wrong. But ESG audience might expect a GRI/CSRD alignment statement.
**What would make them recommend KORA?** A clear "KORA and ESG reporting" one-pager.

### 5. Worker
**Value proposition clear?** Yes — "Il dato è mio." Very well stated.
**What do they get?** PIB (private), timeline, Dynamic Impact CV, opportunities, consent controls.
**What's missing?** Real consent flow. Real Dynamic Impact CV with shareable output.
**What looks wrong?** Nothing critical. KORA Link stepper demo is excellent.
**What would make them trust KORA?** Clear explanation of what the employer sees vs. does not see (already present — this is good).

### 6. Partner
**Value proposition clear?** Yes — "activation actors, not marketplace vendors" is well-stated.
**What do they get?** Company scope visibility (aggregated), activation request management, evidence submission status.
**What's missing?** A clear onboarding flow for new partners. A partner network directory.
**What looks wrong?** Financial preview with "€ 4.800 demo" monetary values without enough distance from real financial commitments.
**What would make them join?** A clear "become a KORA partner" process + advisor protocol explained.

### 7. Advisor
**Value proposition clear?** Yes — "Advisor Process Audit, not action-by-action validation" is clearly stated.
**What do they get?** Review queue, trust ledger, portfolio assignments, evidence checklist.
**What's missing?** Academy (Future Vision). Real review workflow. Real certification status.
**What looks wrong?** Nothing critical. The "Advisor-reviewed ≠ KORA Certified" disclaimer is correctly prominent.
**What would make them work with KORA?** Clear compensation model + Academy pathway.

### 8. KORA Internal Admin
**Value proposition clear?** Yes — Operating Console is comprehensive.
**What do they get?** Full ecosystem view: portfolio, GTM pipeline, advisor/partner network, methodology status, billing preview.
**What's missing?** Real GTM CRM integration. Real alert system.
**What looks wrong?** Nothing critical.

### 9. Future Investor
**Value proposition clear?** Partially — the methodology depth is impressive, but there's no market size / TAM / business model page.
**What do they see?** Admin Console (if shown), Future Vision, Demo Guide, KORA Index methodology.
**What's missing?** A dedicated investor-facing summary. Market size. Pilot results (even internal). Revenue model clarity.
**What looks wrong?** pre_empirical_calibration label could raise concerns — needs to be framed as "methodological rigor" not "product immaturity."
**What would make them invest?** One paid pilot. One advisor endorsement. TAM/market analysis.

### 10. Territory / Public Ecosystem Actor
**Value proposition clear?** No — this stakeholder is mentioned in Future Vision (Territorial Activation Maps) but has no current entry point.
**What's missing?** A dedicated territorial/ecosystem landing. This is correctly a Future Vision item.
**Recommended action:** Keep in Future Vision for now.

---

## SECTION 12 — COMMERCIAL READINESS AUDIT

### What Can Be Sold Now?

**Foundation Light Pilot:** A structured 4-6 month engagement including:
1. Data inventory workshop (2-3 sessions)
2. Eligibility Gate classification of existing welfare/people programs
3. Budget-to-Human-Impact preliminary analysis
4. Activation Debt estimate (€X unconverted)
5. Preliminary KORA Index (with pre_empirical_calibration label)
6. Confidence Score assessment
7. Decision Pack PDF report
8. Executive presentation workshop
9. 90-day reallocation roadmap

### To Whom?
- Mid-market companies (200-2000 employees) with existing welfare/people program spend
- HR Directors who feel "welfare spend is a cost, not an investment"
- CFOs who want to connect people spend to business signals
- ESG teams who need structured people evidence for CSR reporting
- Companies with at least one welfare provider or training program

### For What Price?
- Pilot setup + advisory: €8.000–€15.000
- Annual methodology license (post-Gate 2): €15.000–€30.000/year
- Decision Pack delivery workshop: €2.000–€4.000

### Commercial Action Plan

**First Offer:**
"KORA Foundation Light Pilot — Capire come il vostro budget welfare viene trasformato (o non viene trasformato) in attivazione."

**Target Buyer:**
HR Director or CFO of a manufacturing or services company with 150-500 employees and €100K+ welfare/people spend.

**Pilot Price:**
€10.000 setup + 3 months advisory (€3.000/month) = €19.000 total

**Pilot Duration:** 90 days

**Deliverables:**
1. Data inventory assessment
2. Eligibility Gate classification
3. Preliminary KORA Index (S1 scenario equivalent)
4. Activation Debt estimate
5. Decision Pack PDF
6. Executive workshop (2 hours)
7. 90-day reallocation roadmap

**Sales Deck Narrative:**
"Sapete quanto spendete in welfare. Sapete anche dove va? KORA trasforma quel dato in intelligence — non in un tracker HR, non in una piattaforma di benefits, ma in un indice di attivazione organizzativa. Il vostro KORA Index vi dirà se la spesa sta generando impatto o solo compliance."

**Required Demo Route:**
1. `/demo-guide` — briefing (5 min)
2. `/company` — Executive Cockpit (10 min)
3. `/company/kora-index` — methodology depth (15 min)
4. `/company/activation` — Activation Debt story (10 min)
5. `/company/financial` — BTI analysis (10 min)
6. `/company/reports` — Decision Pack deliverable (10 min)
7. `/future-vision` — where we're going (5 min)

**Common Objections and Answers:**
- "È ancora pre-calibrazione empirica" → "Corretto. È per questo che il primo pilot è un'opportunità: volete i dati reali che calibrano la metodologia."
- "Come funziona con i nostri dati?" → "Iniziamo con un data inventory. In Foundation Light gestiamo l'ingestion manualmente — nessuna integrazione immediata."
- "Garantite un ROI?" → "No. KORA misura correlazione direzionale, non causalità. Il Decision Pack vi dice dove concentrare — la decisione è vostra."

**What Next Should Help With:**
1. Visual design system (brand identity, executive-grade cards, data visualization)
2. Decision Pack PDF design (most critical commercial deliverable)
3. Navigation + information architecture refinement
4. Mobile responsiveness assessment

**What a Freelance Dev Should Help With:**
1. Fix activation page hardcoded constants
2. Fix company/profile S2 hardcoding
3. Build second demo company (Nexo Dynamics)
4. Move advisor/partner inline constants to seed files + services

**What Founder Should Do Personally:**
1. First 3 sales conversations
2. Methodology advisory validation (one external expert endorsement)
3. Foundation Light Pilot offer packaging (price, terms, deliverables)
4. Second demo company scenario design

---

## SECTION 13 — ROADMAP RECOMMENDATION

### 5-Day Immediate Plan

| Day | Goal | Owner |
|---|---|---|
| Day 1 | Fix activation page: move PILLAR_DEBT, DEBT_CONCENTRATION, NEXT_ACTIONS, PARTNER_SUGGESTIONS from hardcoded to service calls with S1/S2 variants | Claude Code |
| Day 2 | Fix company/profile S2 hardcoding → useScenario() hook | Claude Code |
| Day 3 | Create `/pilot` Foundation Light Pilot offer page (static, no data) | Claude Code |
| Day 4 | Create mock PDF Decision Pack (Meridiana, S1, 4-page minimum) | Founder / designer |
| Day 5 | Test full demo route end-to-end; update Demo Guide with /pilot link | Claude Code + Founder |

---

### Week 1 — Prototype Hardening

**Goal:** Fix all known data integrity issues. Make the demo route robust.

**Tasks:**
- Fix 4 hardcoded constants on activation page (pull from ExplainabilityService, S1/S2 aware)
- Fix company/profile scenario binding
- Extract advisor/partner inline constants to seed files
- Fix CANONICAL_PILLAR_AGGREGATE on reports page to be scenario-reactive
- Add `synthetic_demo_data: true` persistent demo banner in sidebar/header
- Add anchor navigation to KORA Index Detail page (most important page in demo)

**Pages involved:** activation, profile, reports, advisor, partner, KORA Index

**Expected output:** Demo route is clean, scenario switcher works consistently everywhere, no visible data inconsistencies.

**Risk:** ExplainabilityService might need new methods for pillar debt and next actions.

---

### Week 2 — Sellable Pilot Packaging

**Goal:** Create the commercial layer. The platform currently demos the product but doesn't sell the pilot.

**Tasks:**
- Create `/pilot` page: "KORA Foundation Light Pilot — cosa ottieni"
  - 5 deliverables described
  - 3 phases (data inventory → analysis → Decision Pack)
  - Price signal ("a partire da €10.000")
  - "Richiedi un incontro" CTA (email link)
- Create mock PDF Decision Pack (Meridiana Group, S1 baseline)
  - Page 1: Cover (company, period, KORA Index = 34, CS = 60%, Safeguard = WARNING)
  - Page 2: Macroblock summary
  - Page 3: Activation Debt analysis
  - Page 4: 90-day recommendations
- Add `/pilot` to sidebar as "Scopri Foundation Light Pilot"
- Promote `/future-vision` to sidebar under "Roadmap"
- Add "Vai al Decision Pack →" as primary CTA on Executive Cockpit

**Pages involved:** new /pilot, company, reports, sidebar

**Expected output:** A complete commercial package. Demo route → pilot offer → contact.

**Risk:** PDF creation requires external tool (Canva, Figma, or LaTeX). Plan time.

---

### Week 3 — Real Data Readiness

**Goal:** Add second demo company. Show multi-tenant capability.

**Tasks:**
- Create Nexo Dynamics S.r.l. as second demo tenant:
  - Different sector (professional services / fintech)
  - Higher KORA Index (61/100, scenario CLEAR)
  - Different pillar distribution (GROWTH-heavy vs Meridiana LIFE-heavy)
  - Different BTI profile
- Enable role/company switch to show "Nexo Dynamics" workspace
- Add benchmark comparison: "Meridiana 34 vs cluster avg 47 vs best-in-class 68"
- Explore Admin benchmarks page to surface cross-company comparison
- Update Demo Guide to include Nexo comparison route

**Pages involved:** admin/companies, company workspace (Nexo), admin/benchmarks

**Expected output:** Demos can now show "here's a company before and after KORA-guided reallocations" using S1/S2 of Meridiana, AND "here's a comparison to a peer" using Nexo.

**Risk:** Significant new seed data creation. Budget 2-3 days of data design.

---

### Week 4 — First Sales/Outreach Readiness

**Goal:** Platform is ready for first 3 company calls.

**Tasks:**
- Visual polish round 1: Executive Cockpit hero (KORA Index card upgrade)
- Visual polish round 2: Decision Pack PDF mock downloadable
- Remove KORA Billing section from company financial page
- Add "Leggi prima la guida" to sidebar as pinned item
- Split financial page: BTI summary + HR KPI accordion
- Test demo route on external device (mobile check)
- Record demo walkthrough video (founder + screen)

**Pages involved:** company, financial, reports, sidebar

**Expected output:** Platform is ready for guided demo to qualified prospects.

**Risk:** Visual work may require Next handover before this is complete.

---

### 2-Week Plan Summary
- Week 1: Fix all data bugs + demo banner
- Week 2: Create sellable package (/pilot page + PDF Decision Pack)

### 30-Day Plan Summary
- Week 1–2: As above
- Week 3: Second demo company (Nexo)
- Week 4: Visual polish round 1 + first 3 company calls

### 90-Day Product Roadmap

| Period | Goal | Key Outputs |
|---|---|---|
| Days 1–30 | Prototype hardening + pilot packaging | Fixed demo, /pilot page, PDF Decision Pack, Nexo tenant |
| Days 31–60 | First outreach + Next handover | 3 company conversations, Next begins visual redesign |
| Days 61–90 | First pilot signed (ideally) + Gate 2 preparation | Real data intake with first client, CTO architecture review (Gate 2), Supabase POC |

---

## SECTION 14 — PRIORITIZED IMPROVEMENT BACKLOG

| ID | Title | Area | Page/Module | Severity | Effort | Owner | Commercial Impact | Why It Matters | Action |
|---|---|---|---|---|---|---|---|---|---|
| B-01 | Fix PILLAR_DEBT, NEXT_ACTIONS, PARTNER_SUGGESTIONS hardcoding | Data | activation/page.tsx | P0 blocker | S | Claude Code | High | Looks like bug in demo — scenario switch breaks narrative | Move to ExplainabilityService, create S1/S2 variants |
| B-02 | Fix DEBT_CONCENTRATION scenario-blindness | Data | activation/page.tsx | P0 blocker | XS | Claude Code | High | Top 12% = 64% IU is S1-only — S2 should show improvement | Create S1/S2 concentration records in seed + service |
| B-03 | Create /pilot Foundation Light offer page | Commercial | new route | P1 before Next | M | Claude Code | High | No commercial destination for interested prospects | Static page: deliverables, process, price signal, CTA |
| B-04 | Fix company/profile S2 hardcoding | Data | company/profile | P1 before Next | XS | Claude Code | Medium | Profile shows wrong scenario — undermines switcher trust | Replace `const SCENARIO = 'S2'` with `useScenario()` |
| B-05 | Create mock PDF Decision Pack | Commercial | reports | P1 before Next | M | Founder + designer | High | #1 commercial deliverable is a disabled button | 4-page PDF: cover, macroblock, activation, recommendations |
| B-06 | Add persistent "DEMO MODE" indicator | UX | sidebar/header | P1 before Next | XS | Claude Code | Medium | Cold viewer might think this is production | Add subtle "Demo data — synthetic" banner in sidebar footer |
| B-07 | Add anchor navigation to KORA Index Detail | UX | kora-index | P1 before Next | XS | Claude Code | Medium | 10+ sections on one page — users get lost | Add sticky anchor nav with 6-8 section links |
| B-08 | Remove KORA Billing section from company/financial | Commercial | financial | P1 before Next | XS | Claude Code | High | CFO prospect sees subscription fees in evaluation demo | Move billing to admin workspace only |
| B-09 | Create Nexo Dynamics demo tenant | Data | admin, company | P2 before company demo | L | Claude Code | High | No comparison = no "before/after or peer" story | Create Nexo seed data: S1 scenario, 61 KORA Index, CLEAR safeguard |
| B-10 | Split financial page into BTI + HR KPI | UX | financial | P2 before company demo | M | Claude Code | Medium | Page too dense — CFO loses focus | Add tabs: "Budget-to-Human-Impact" / "People KPI Signals" |
| B-11 | Add EQ disambiguation tooltip | Methodology | kora-index | P2 before company demo | XS | Claude Code | Medium | EQ looks like "Evidence Quality" to many — doctrine says it's Equity | Add inline "(= equità distributiva, non qualità evidenza)" |
| B-12 | Promote /future-vision to sidebar | UX | sidebar | P2 before company demo | XS | Claude Code | Medium | Best investor/advisor page is hidden | Add "Roadmap →" to sidebar under main nav |
| B-13 | Make CANONICAL_PILLAR_AGGREGATE scenario-reactive in reports | Data | reports | P2 before company demo | S | Claude Code | Medium | Pillar breakdown hardcoded to S1 in Decision Pack | Pull from scoringSimulatorService aggregate per scenario |
| B-14 | Extract advisor inline constants to seed + service | Architecture | advisor | P2 before company demo | M | Claude Code | Medium | Advisor profile (Dr. Lombardi) is fully inline — not scalable | Create advisor seed file, read via AdvisorService |
| B-15 | Extract partner inline constants to seed + service | Architecture | partner | P2 before company demo | M | Claude Code | Medium | Partner profile (Città Aperta) is fully inline | Create partner seed file, read via PartnerService |
| B-16 | Add "Leggi prima" link in sidebar header | UX | sidebar | P2 before company demo | XS | Claude Code | Low | Demo Guide is the best entry point but nobody finds it | Add "Guida al Prototipo" as pinned sidebar item |
| B-17 | Visual upgrade: Executive Cockpit KORA Index card | Visual | company | P2 before company demo | M | Next | High | KORA Index 34/100 should be the visual hero of the page | Larger number, stronger visual hierarchy, dark card background |
| B-18 | Visual upgrade: KORA Index Detail macroblock cards | Visual | kora-index | P2 before company demo | M | Next | High | 4 macroblock cards look identical to regular cards | Distinct visual treatment per macroblock, larger scores |
| B-19 | Add "Company KORA vs peer benchmark" to Executive Cockpit | Commercial | company | P2 before company demo | M | Claude Code | High | Peer comparison is the strongest sales signal | Add benchmark strip: "Meridiana 34 vs settore media 47" |
| B-20 | Fix opportunities count "+3" hardcode on My KORA | Data | my-kora | P2 before company demo | XS | Claude Code | Low | Minor but visible hardcode | Pull count from service |
| B-21 | Add data visualization: Activation heat map | Visual | activation | P3 before paid pilot | L | Next | High | Bar charts are weak for department/site comparison | Build heat map: rows=depts, cols=pillars, fill=AR |
| B-22 | Add data visualization: Pillar radar chart | Visual | kora-index | P3 before paid pilot | M | Next | Medium | Pillar bars are functional but not engaging | Replace/supplement with radar/spider chart |
| B-23 | Add 14-stage pipeline visual | Methodology | kora-index or data | P3 before paid pilot | M | Claude Code | Medium | 14-stage algorithm exists in docs but not visible in product | Static visual: 14 boxes with arrows, stage names, current stage indicator |
| B-24 | Create KORA Ecosystem Overview page | Commercial | admin | P3 before paid pilot | M | Claude Code | Medium | Investors should see ecosystem breadth without full admin access | Public-safe version of admin analytics (advisor count, partner count, company count, avg KORA Index) |
| B-25 | Add anchor nav to Decision Pack page | UX | reports | P3 before paid pilot | XS | Claude Code | Low | 8 sections with no navigation | Add sticky section nav |
| B-26 | Split Partner page into sub-pages | UX | partner | P3 before paid pilot | L | Claude Code | Medium | 1170-line single page is hard to navigate | Home / Services & Evidence / Operations |
| B-27 | Split Advisor page into sub-pages | UX | advisor | P3 before paid pilot | L | Claude Code | Medium | 900-line single page — review queue buried | Home / Review Queue / Trust Ledger |
| B-28 | Add "Richiedi Decision Pack" CTA on Executive Cockpit | Commercial | company | P2 before company demo | XS | Claude Code | High | No clear "next step" CTA for interested prospect | Link to /company/reports with scroll anchor |
| B-29 | Create ESG/CSR one-pager section | Commercial | company or reports | P3 before paid pilot | M | Claude Code | Medium | ESG teams need KORA→CSR connection made explicit | Add CSR section to reports or create /company/esg |
| B-30 | Mobile responsiveness audit | Technical | all pages | P3 before paid pilot | M | Next | Medium | Unknown — not tested in this audit | Full Lighthouse + mobile viewport test |
| B-31 | Improve empty state design | UX | multiple | P3 before paid pilot | M | Next | Low | Generic empty states reduce trust | Design branded empty states with clear next steps |
| B-32 | Add persona switcher to My KORA sidebar | UX | my-kora | P3 before paid pilot | XS | Claude Code | Low | Worker persona switching is unclear | Ensure persona switcher affects My KORA data |
| B-33 | Validate TypeScript compilation (tsc --noEmit) | Technical | all | P2 before company demo | XS | Claude Code | High | Required per Definition of Done | Run tsc --noEmit and fix all type errors |
| B-34 | Create data inventory template | Commercial | new | P3 before paid pilot | M | Founder | High | Real pilot needs a data intake checklist | Excel/PDF template: data sources, fields, privacy classification |
| B-35 | Record demo walkthrough video | Commercial | all | P3 before paid pilot | M | Founder | High | Async demos need a video walk-through | 10-minute Loom: full route from Demo Guide to Decision Pack |
| B-36 | Add "Correlazione ≠ causalità" as visual badge on correlation matrix | Methodology | financial | P2 before company demo | XS | Claude Code | Medium | Disclaimer is present but visually weak vs the matrix | Add prominent amber badge above the correlation matrix table |
| B-37 | Create Nexo Dynamics: BTI scenario (more efficient) | Data | admin, company | P3 before paid pilot | M | Claude Code | High | Nexo should show "62% deep activation vs Meridiana 52%" | Different BTI profile: cost per IU €14.2, deep_activation_share 0.62 |
| B-38 | Add "Company X vs Company Y" admin benchmark view | Commercial | admin | P3 before paid pilot | M | Claude Code | High | Multi-tenant comparison is the platform's long-term value prop | Simple benchmark table with 2-3 companies, anonymized if needed |
| B-39 | Fix financial page: remove "KORA Billing" or move to admin | Commercial | financial | P1 before Next | XS | Claude Code | High | Subscription fees in client-facing eval demo is confusing | Move to /admin or remove from /company/financial entirely |
| B-40 | Add "Download Decision Pack (demo)" button | Commercial | reports | P2 before company demo | M | Founder | High | Export is disabled — #1 commercial gap | Static PDF download, even if just 4 pages |
| B-41 | Add "Per saperne di più" / pilot offer link in Decision Pack | Commercial | reports | P2 before company demo | XS | Claude Code | High | Decision Pack should end with pilot CTA | Add link to /pilot at end of report |
| B-42 | Create Nexo Dynamics: Advisor assignment | Data | advisor | P3 before paid pilot | S | Claude Code | Low | Advisor should show 2+ companies for credibility | Add Nexo to advisor assignments list |
| B-43 | Create benchmark: "KORA Index settore manifatturiero" | Data | admin/benchmarks | P3 before paid pilot | M | Claude Code | Medium | Sector benchmark makes Meridiana's 34 meaningful in context | Add synthetic sector avg (47) and top quartile (62) benchmark |
| B-44 | Add "Metodologia in uso" section on Demo Guide | Methodology | demo-guide | P3 before paid pilot | XS | Claude Code | Low | Demo Guide doesn't mention KORA-METHOD-v0.1.0 | Add methodology version info block |
| B-45 | Create Future Vision "request early access" section | Commercial | future-vision | P3 before paid pilot | XS | Claude Code | Medium | Future Vision ends with no CTA | Add "Vuoi essere tra i primi pilot?" with email CTA |
| B-46 | Add worker consent flow simulation | UX | my-kora/privacy | P4 future | L | Claude Code | Medium | Consent Vault is mentioned but not simulated | Add step-by-step consent selection UI |
| B-47 | Create Dynamic Impact CV shareable view | Product | my-kora/dynamic-cv | P4 future | L | Claude Code | Medium | CV portability is a key worker-side differentiator | Add "Condividi CV" simulation with privacy controls |
| B-48 | Build KORA Link QR scanner simulation | Product | my-kora | P4 future | M | Claude Code | Low | KORA Link stepper exists but no visual QR mockup | Add QR code mockup image to stepper demo |
| B-49 | Create real data onboarding simulation | Product | company/ingestion | P4 future | L | Claude Code | Medium | Real pilot needs to simulate data intake from real formats | Multi-step ingestion wizard with CSV upload simulation |
| B-50 | Create Admin GTM to company onboarding bridge | Architecture | admin, company | P4 future | L | Claude Code | Low | GTM pipeline and company onboarding are disconnected | Admin GTM "activate pilot" → creates pending company workspace |

---

## SECTION 15 — WHAT TO DO NEXT

### Should we continue improving internally with Claude Code?
**YES** — 5 more days of targeted Claude Code work would significantly increase commercial readiness.

### Should we send to Next now?
**YES** — send /demo-guide to Next immediately. Let them audit while Claude Code fixes data issues.

### Should we wait and harden for 5 more days first?
**Yes — 5 days of harden before giving Next the "official" handover moment.**

### Should we add second demo company?
**YES — Week 3 priority.** The single-company demo is the biggest commercial limitation.

### Should we prepare a sellable Foundation Light Pilot page/package?
**YES — Week 2 priority.** This is the most immediate commercial unlock.

### Should we start real data/SaaS architecture?
**NO** — not until Gate 2 (CTO review) and at least 1 pilot signed.

### What is the next prompt to run?

```
Sprint 6A: Activation page data fix + scenario binding

Fix all 4 hardcoded non-reactive constants on /company/activation/page.tsx:
1. PILLAR_DEBT coverage rates → pull from ExplainabilityService or create
   pillarDebtService.getPillarCoverageByScenario(companyId, activeScenario)
   with S1 and S2 data in seed.

2. DEBT_CONCENTRATION → pull from company-aggregates.json
   (already has top_12_pct_generates, bottom_50_pct_generates per scenario).
   Use scoringSimulatorService.getCompanyAggregate().

3. NEXT_ACTIONS → pull from explainabilityService.getNextBestActions()
   (already exists and is scenario-reactive).

4. PARTNER_SUGGESTIONS → pull from explainabilityService or create a new
   partnerSuggestionService.getSuggestedPartnersByScenario().

5. Fix company/profile/page.tsx: replace hardcoded SCENARIO='S2' with useScenario().

6. Create /pilot page as static Foundation Light Pilot offer:
   - 5 deliverables
   - 3-phase process
   - Price signal
   - "Richiedi un incontro" CTA

Do not modify any other files.
Verify TypeScript compiles after all changes (tsc --noEmit).
```

---

### Top 10 Immediate Actions

1. Fix activation page: PILLAR_DEBT + DEBT_CONCENTRATION → service calls (scenario-reactive)
2. Fix activation page: NEXT_ACTIONS + PARTNER_SUGGESTIONS → ExplainabilityService
3. Fix company/profile S2 hardcoding → useScenario()
4. Remove KORA Billing section from company/financial page
5. Create `/pilot` Foundation Light Pilot offer page
6. Add anchor navigation to KORA Index Detail page
7. Add persistent "Dati demo sintetici" banner in sidebar footer
8. Add "Download Decision Pack (mock PDF)" — even a static 4-page PDF
9. Add EQ disambiguation to KORA Index component breakdown
10. Send Demo Guide URL to Next immediately

---

### Top 10 Things NOT To Do

1. **Do not build a marketplace.** Not now, not as a demo. Not under any name.
2. **Do not create a second KORA Index component.** The 10-component structure is fixed.
3. **Do not hardcode methodology weights.** All reads go through lib/methodology-config/v0.1.ts.
4. **Do not expose PIB to employer roles.** Not even "as a preview" — this is the central privacy guarantee.
5. **Do not generate SQL, Prisma, or Supabase schema before Gate 2.** Gate 2 is open.
6. **Do not build real payment, wallet, or checkout logic.** Excluded by doctrine.
7. **Do not create worker gamification (XP, badges, leaderboards).** Doctrinal violation.
8. **Do not use the pre_empirical_calibration data to guarantee outcomes.** Always directional.
9. **Do not redesign the Demo Guide page.** It already works.
10. **Do not start building SaaS infrastructure before signing 1 pilot.** Gate 2 first.

---

### The Single Next Best Sprint Prompt

```
Sprint 6A: Activation Data Fix + Pilot Page + Navigation

PART 1 — Data Fix (activation/page.tsx)
1. Move PILLAR_DEBT to ExplainabilityService or ScoringSimulatorService
   with S1/S2 variants. PILLAR_DEBT S2 should show lower debt (improvement).
2. Pull DEBT_CONCENTRATION from company-aggregates.json via getCompanyAggregate()
   — top_12_pct_generates and bottom_50_pct_generates already exist in seed.
3. Pull NEXT_ACTIONS from explainabilityService.getNextBestActions() (already available).
4. Create simple PARTNER_SUGGESTIONS derived from aggregate.pillar_distribution
   — show top 2 underweighted pillars with generic partner type suggestion.

PART 2 — Company Profile fix
Fix app/company/profile/page.tsx: replace const SCENARIO = 'S2' with useScenario() hook.

PART 3 — Financial page cleanup
Remove the "Fatturazione KORA (registro separato)" section from company/financial page.
This section (subscription/setup/advisory fees) belongs in admin, not in company workspace.

PART 4 — Create /pilot page
Static page at app/pilot/page.tsx with:
- Title: "KORA Foundation Light Pilot — Il primo passo verso l'intelligence di attivazione"
- 3 phases: Data Inventory → Analisi → Decision Pack
- 5 deliverables listed
- Timeline: 90 giorni
- Price signal: "A partire da €10.000"
- "Richiedi un incontro" CTA (mailto link to founder email)
- Methodology disclaimer: pre_empirical_calibration, synthetic_demo_data: true

PART 5 — Navigation improvements
5a. Add /pilot to sidebar: "Scopri Foundation Light →" as subtle footer link
5b. Add /future-vision to sidebar: "Roadmap →" as sidebar item
5c. Add page anchor nav to /company/kora-index (6 anchors: macroblocks, eligibility, BTI, safeguard, components, glossary)

PART 6 — EQ disambiguation
In ComponentBreakdown component or in /company/kora-index page,
add inline note next to EQ component: "Equity = equità distributiva — non qualità evidenza"

Verify TypeScript compiles (tsc --noEmit) before marking done.
Do not modify seed files, methodology config, or service interfaces.
```

---

*Generated 2026-05-25 · Read-only strategic audit · No source files modified*
*Pages audited: 30 routes across company / worker / partner / advisor / admin / demo layers*
*Services reviewed: 32 services (interface level)*
*Seed files reviewed: Key synthetic seed files via service calls*
*synthetic_demo_data: true · KORA Foundation Light v0.1 · pre_empirical_calibration*
