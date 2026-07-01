# Phase 1I — Full Online Demo Review & Micro-Polish Plan

**Date:** 2026-05-19
**Status:** Complete — awaiting Phase 1J execution
**Reviewer perspective:** founder, skeptical enterprise buyer, UX reviewer, privacy reviewer, investor technical reviewer, product strategist

---

## 1. Executive Verdict

**READY AFTER MICRO-POLISH**

Five issues block external sharing. None require new features or architecture changes. All are copy and rendering fixes that take hours, not days.

**Is the demo now conceptually coherent?**
Mostly yes. Landing page, company workspace, admin operating console and My KORA tell a coherent story when navigated in the intended order. The bridge from "company activation intelligence" to "where the data comes from" is weak without explicitly navigating through the admin AI Onboarding — a path not included in the guided review steps.

**Does it communicate KORA in 60 seconds?**
The landing page hero does it in two sentences: *"KORA shows whether organizational initiatives actually activate people. KORA translates fragmented actions, participation signals and evidence into explainable organizational activation intelligence."* The thesis box — "Companies see aggregate organizational intelligence. Workers keep ownership of their personal layer." — lands well. The scenario comparison (S1 vs S2 before/after) gives it narrative grounding. A first-time viewer can orient in under a minute IF they read the landing page first. If they are dropped into `/company`, they need more context.

**Does it still risk looking like generic SaaS?**
Low risk. The KORA Index Hero (large score, Confidence Score, Safeguard badge, CalibrationBadge) is distinctive and unusual for standard SaaS dashboards. The 5-pillar color system, 10-component breakdown, and explicit `pre_empirical_calibration` label all signal that this is a methodology-first product, not a generic analytics tool.

**Does it still risk looking like HR/welfare/ESG?**
Medium risk, localized to two pages. `/company/pillars` shows program source types as raw strings — "welfare provider", "lms training" — which reads as welfare management if you don't already know KORA's distinction. `/company/financial` title includes "Financial Governance Light" which, combined with the budget allocation section, edges toward welfare budget management optics. These are fixable in 30 minutes each.

**Is KORA Admin now conceptually recovered?**
Yes. The AI Onboarding Engine as Module 00 is prominent, the 7-section pipeline (A through G) is legible, and the Operating Console now reads as KORA's internal intelligence engine rather than a generic backoffice dashboard. The three mandatory AI boundary statements are present throughout.

**Is My KORA convincing enough as a worker-owned preview?**
Yes. The role gate (AccessDeniedState for non-worker roles), the "This space belongs to the worker" banner, the two-column can/cannot-see privacy layout on `/my-kora/privacy`, and the disabled consent toggles labeled "preview only" all make privacy feel architectural rather than aspirational. This section is currently the strongest trust-building piece in the demo.

---

## 2. End-to-End Demo Narrative

### Entry: What is KORA?
Landing page (`/`) delivers this well. Hero headline is clear. Positioning strip ("Not welfare management · Not HR surveillance · ...") does necessary negative-space work. The S1/S2 scenario comparison gives concrete context. Review path with 6 numbered steps is useful.

**Gap:** The 6-step review path does not mention KORA Admin or AI Onboarding Engine. A viewer following the guided path will never discover the data pipeline story unless separately directed.

### Company: How does KORA measure organizational activation?
`/company` (Executive Cockpit) is the strongest page in the demo. The KORA Index Hero with the large score, Confidence Score, Safeguard, and CalibrationBadge is visually distinctive. The 3 insight tiles (weakness / strength / next action) derived from explainability data make it feel intelligent rather than static. The 10-component breakdown and pillar distribution are solid.

`/company/kora-index` is the methodological backbone — 10-component grid, chart, safeguard panel, confidence breakdown, and explainability panel in one page. Thorough.

`/company/activation` is clean and functional with the 4 metric cards (AR, MAR, CO, VR) now including descriptions.

### Data: Where does the data come from?
`/company/data` answers this — source batches, completeness, mapping confidence, evidence attachment. It is the most technically dense page in the company workspace, however. For a non-technical enterprise buyer as step 4 of the guided tour, this may create friction before they have seen KORA Contribution or Pillars.

### AI Onboarding: How does KORA transform messy data?
`/admin/ai-onboarding` tells this story excellently — but it is in the admin workspace, visible only to admin roles, and not referenced in the main demo guide review path. This is the biggest narrative gap. The pipeline story (source intake → taxonomy mapping → privacy filter → UEF draft queue → human review → scoring readiness) is exactly what a technical investor or skeptical buyer needs to see. It needs a path from the landing page.

### Worker: Why does the worker benefit and remain protected?
My KORA tells this story well. Privacy architecture is structural. Dynamic CV is compelling. The consent toggle UI, even though disabled, communicates future control. The "Company KORA Snapshot (aggregate)" section on `/my-kora` neatly shows that the worker can see company-level data but the employer cannot see theirs — the asymmetry is visible in one screen.

### Future: Where is the platform going?
`/future-vision` is currently minimal — 9 feature tiles at 60% opacity. It communicates "not active" correctly but does not communicate ambition. The feature names are correct (KORA Certified, KORA Link, Territorial Activation Maps, etc.) but there is no framing text explaining the strategic direction.

**Strongest part of the story:** The company workspace (Executive Cockpit + KORA Index Detail). The KORA Index Hero combined with the explainability panel and safeguard/confidence machinery creates a credible, methodologically grounded product impression.

**Weakest part of the story:** Partner and Advisor workspaces. Both are bare skeletons with developer placeholder text. Anyone who switches to the Partner or Advisor role will find a one-line skeleton message, which actively damages the credibility of the broader demo.

**Missing bridge:** Between the demo guide 6-step review path and the AI Onboarding / Admin story. A viewer following the guided path will understand company intelligence and worker privacy but will not understand how data enters KORA and gets transformed. The "where does this come from" question will remain unanswered.

**Places where Simone would still need to explain too much verbally:**
- What BCM taxonomy is (used on AI Onboarding page without definition)
- Why the KORA Contribution page shows `is_kora_index_component: false` in visible font-mono text
- What "Semi-Functional Preview" means (it reads as "broken")
- The relationship between /company/data (source batches) and /admin/ai-onboarding (same data, different lens)
- What Partner and Advisor workspaces are supposed to do

---

## 3. Route-by-Route Review

| Route | Current role | Strength | Friction | Recommended micro-polish | Priority |
|---|---|---|---|---|---|
| `/` | All roles | Hero headline lands. Thesis box is clear. S1/S2 comparison is compelling. CTA buttons work. | 6-step review path skips Admin/AI Onboarding entirely. No "KORA Admin" link. | Add step 7: "KORA Operating Console" to review path. | High |
| `/demo-guide` | All roles | Same content as `/` — correct. Accessible from sidebar at all times. | Same omissions as `/`. | Mirror any `/` changes. | High |
| `/company` | Company/Admin | Strongest company page. Insight tiles + KORA Index Hero + 10-component breakdown. | `Role: {activeRole} · Scenario: {activeScenario}` debug footer at bottom reads as developer artifact. H1 "Organizational Activation Snapshot" diverges from sidebar label "Executive Cockpit". | Remove or mask debug role/scenario footer. Align H1 with sidebar label or keep consistent. | Medium |
| `/company/kora-index` | Company/Admin | Best methodology page. CS + Safeguard + Calibration + Explainability all present. Full 10-component breakdown. | None blocking. | Keep as is. | Keep |
| `/company/activation` | Company/Admin | Clean. 4 metric cards with descriptions + pillar bars + department breakdown. | None blocking. | Keep as is. | Keep |
| `/company/contribution` | Company/Admin | Companion indicator notice is excellent. Initiative cards with privacy notice. | `is_kora_index_component: false` displayed as font-mono text — reads as developer JSON to non-technical viewers. "Semi-Functional Preview" badge signals broken rather than in-progress. | Replace `is_kora_index_component: false` with prose. Rename badge to "Foundation Light Preview". | High/Blocking |
| `/company/pillars` | Company/Admin | Good pillar distribution visualization. Program portfolio table is informative. | `source_type.replace(/_/g, ' ')` renders raw strings: "welfare provider", "lms training", "esg initiatives". Reads as welfare/HR management to external viewer. Dense program table may overwhelm. | Map source type strings to display labels ("Welfare Provider" → "Partner Program", "lms training" → "Learning Platform"). Or use existing SOURCE_TYPE_LABELS. | High |
| `/company/data` | Company/Admin (HR) | Full source batch metadata, completeness bars, evidence bars, source notes. | Technically dense for step 4 in the review path. Non-technical viewers may find 9-column table overwhelming before seeing Contribution or Pillars. | Consider reordering review path. Keep page content — it's correct and complete. | Medium (path order) |
| `/company/financial` | Company Admin/Finance | Mandatory disclaimer present. Pillar budget bars. KORA billing section provides commercial context. | Page title "Financial Governance Light" — "Light" suffix reads as incomplete. "Budget Allocated" / "Budget Used" may be mistaken for benefit budget management. | Rename to "Financial Governance" (drop "Light"). Add one-line framing that this is KORA's informational governance view, not a welfare budget management tool. | Medium |
| `/my-kora` | Worker only | Role gate works correctly. Worker-private banner present. PIB Light card compelling. Timeline with category-level display appropriate. Quick links work. | Opportunities section shows only "Preview only" / "Coming soon" labels with no explanatory text about what opportunities will be. | Add 2 sentences explaining what opportunities will be in production. | Low |
| `/my-kora/privacy` | Worker only | Strongest privacy communication in the demo. Two-column can/cannot-see layout is architectural. Consent toggles clearly labeled "preview only". | None blocking. The "preview only" disclaimer on consent toggles is honest and appropriate. | Keep as is. | Keep |
| `/my-kora/dynamic-cv` | Worker only | Worker-ownership notice is clear. CV items with pillar + verification badges are good. Export button correctly disabled. | None blocking. | Keep as is. | Keep |
| `/admin` | Admin only | Operating Console framing clear. Module 00 (AI Onboarding) prominent. 9 additional modules complete. Platform analytics strip is useful. | Not in the demo guide review path — viewers won't discover this unless already directed. | Add reference in demo guide review path. | High |
| `/admin/ai-onboarding` | Admin only | 7 sections complete. All 3 AI boundary notices present. Source intake now shows all required fields. Pipeline story is legible. | "BCM taxonomy" used without definition for non-technical viewers. | Add a brief inline definition of BCM taxonomy on first mention ("BCM — Base Contribution Matrix taxonomy, rule-based classifier mapping events to KORA pillars"). | Low |
| `/admin/portfolio` | Admin only | Cross-company table with CS + Safeguard. Primary demo company labeled. | None blocking. | Keep as is. | Keep |
| `/admin/index-registry` | Admin only | ~ marker for synthetic values is subtle but appropriate. Registry note below is good. | None blocking. | Keep as is. | Keep |
| `/admin/benchmarks` | Admin only | Disclaimer prominent and honest. Three benchmark dimensions with visual bars. | None blocking. | Keep as is. | Keep |
| `/admin/network` | Admin only | Advisor + partner lists with status and pending reviews. | None blocking. | Keep as is. | Keep |
| `/admin/gtm` | Admin only | GTM pipeline + gate status. "Founder / Internal" badge correct. | None blocking. | Keep as is. | Keep |
| `/partner` | PARTNER_ADMIN_LIGHT | — | Bare skeleton: "Partner workspace skeleton — Phase 1". This is developer placeholder text visible to any viewer who switches to Partner role. Actively damages credibility. | Replace skeleton text with a minimum "Light Preview" state: name the workspace, describe its future role, show the role guard or a "coming in pilot phase" notice. | Blocking |
| `/advisor` | ADVISOR_EXTERNAL_LIGHT | — | Bare skeleton: "Advisor review queue skeleton — Phase 1". Same issue as partner. | Same treatment as partner. Minimum Light Preview state. | Blocking |
| `/future-vision` | All roles | "Future Vision / Not Active in Foundation Light" label is correct. 9 feature tiles communicate roadmap. 60% opacity is appropriate. | No framing text. Tiles are feature names only — no strategic narrative. Feels like a feature list, not a vision. | Add 2–3 sentences above the grid explaining the strategic direction of the post-pilot platform. | Low |

---

## 4. Navigation Review

**Is the sidebar too dense?**
No — for the roles it serves, the grouping is clear. Admin has: Demo, KORA Console (7 items), Company Intelligence (5 items), Internal Tools (4 items), Other (1 item). Company roles have: Demo, Company Intelligence (5 items), Data & Governance (2 items), [Internal Tools if ADMIN/HR] (4 items), Other. Worker has: Demo, My KORA (6 items), Other. These are well-separated and not overwhelming.

**Are groups clear?**
Yes. Group headings (Demo, KORA Console, Company Intelligence, Internal Tools, Data & Governance, My KORA, Other) are distinct. The admin "KORA Console" vs company "Company Intelligence" separation is clear and correct.

**Does role switching make sense?**
Yes. The role switcher in the header is functional. The sidebar rebuilds correctly per role. The ScenarioSwitcher tab-style toggle with Safeguard badges is the best current navigation element.

**Are skeleton/placeholder pages still too visible?**
Yes — /partner and /advisor are the only two with bare skeleton text. These must be addressed before external sharing.

**Should Partner/Advisor stay visible?**
They should stay in the sidebar for their respective roles but need minimum content — not developer skeleton text. A "Light Preview / Coming in pilot phase" state with a description of the workspace's purpose is sufficient.

**Is Demo Guide easy to find?**
Yes — it appears in the "Demo" group at the top of every role's sidebar. The "/" root also renders it. Good.

**Is "/" the right entry point?**
Yes. It renders DemoGuideContent which is the correct onboarding context. A viewer who lands at "/" will understand KORA before going anywhere else.

**Exact recommended nav changes:**
1. None to the sidebar structure — it is correct.
2. Update REVIEW_STEPS in DemoGuideContent to add step 7: "KORA Operating Console (admin role)" pointing to `/admin` with description "AI Onboarding Engine · Company portfolio · Index Registry · Platform health — switch to Admin role first."
3. Consider adding a brief italic "Light Preview" label to Partner and Advisor sidebar items for their respective roles to pre-set expectations before the page loads.

---

## 5. Copy and Terminology Polish

| Term/Copy | Current issue | Suggested replacement | Affected route/component |
|---|---|---|---|
| `is_kora_index_component: false` | Developer JSON visible as font-mono text to non-technical viewers. Requires explanation. | "KORA Contribution is a companion indicator — it is measured and displayed separately from the KORA Index and does not contribute to its computation." | `/company/contribution` — blue companion notice box |
| "Semi-Functional Preview" badge | "Semi-Functional" implies the feature is broken or half-built. Erodes confidence. | "Foundation Light Preview" | `/company/contribution`, `/company/financial` |
| "Financial Governance Light" (page H1) | "Light" suffix signals an incomplete version of something. | "Financial Governance" | `/company/financial` |
| `welfare_provider` → "welfare provider" | Raw source_type string rendered via `.replace(/_/g, ' ')`. Reads as welfare management. | "Partner Program" or use existing `SOURCE_TYPE_LABELS` from AdminPreviewService which maps `welfare_provider` → "Welfare Provider Export" — consider a shorter, less welfare-coded label like "Initiative Provider" or retain but add KORA-contextual framing. | `/company/pillars` — program portfolio table source column |
| `lms training`, `esg initiatives`, `manual upload` | Same raw string rendering issue as above. | "Learning Platform", "ESG & Initiatives", "Manual Upload" | `/company/pillars` — program portfolio table source column |
| "Organizational Activation Snapshot" (H1 on /company) | Diverges from sidebar "Executive Cockpit" label. Inconsistent branding across entry points. | Either use "Executive Cockpit" as H1 too, or change sidebar to "Activation Snapshot" — the H1 is actually the stronger label, so consider changing the sidebar item. | `/company/page.tsx`, `Sidebar.tsx` |
| "Role: {activeRole} · Scenario: {activeScenario} · {period}" | Debug/developer footer visible on `/company` to all viewers. "Role: COMPANY_ADMIN" breaks the product illusion. | Remove from external-facing page or move to a collapsible "Demo context" area. The methodology/calibration footer is separately present on other pages and is appropriate. | `/company/page.tsx` — bottom paragraph |
| "Partner workspace skeleton — Phase 1" | Developer placeholder in production-visible page. | Minimum Light Preview state with workspace description and future role framing. | `/partner/page.tsx` |
| "Advisor review queue skeleton — Phase 1" | Same issue. | Minimum Light Preview state. | `/advisor/page.tsx` |
| "BCM taxonomy" | Used without definition on `/admin/ai-onboarding`. | First mention: "BCM taxonomy (Base Contribution Matrix — the rule-based classifier that maps source events to KORA pillars)". Subsequent mentions: "BCM taxonomy". | `/admin/ai-onboarding/page.tsx` section C |
| "UEF Draft Queue" in Review Steps | "UEF" used without definition in DemoGuideContent step 2 description. | Add "(Unified Event Frame)" in the description text of the KORA Index Detail step. | `DemoGuideContent.tsx` REVIEW_STEPS |
| Opportunities section on /my-kora | Items labeled "Preview only" / "Coming soon" with no explanation of what opportunities are. | Add 2 sentences above the opportunities list: "Opportunities are KORA-matched learning, development and wellbeing activities aligned to your personal impact profile. In Foundation Light, these are preview items — availability unlocks post-pilot." | `/my-kora/page.tsx` |
| "employer_privacy_notice" italic text on each InitiativeCard | Same privacy statement repeated on every card creates visual noise. | Show once below the initiative list, not inside each card. | `/company/contribution/page.tsx` InitiativeCard |
| Future Vision page — no framing text | 9 feature tiles with no context. | Add 2–3 introductory sentences explaining the post-pilot strategic direction before the grid. | `/future-vision/page.tsx` |
| "Activation" in sidebar vs "Activation & Participation" as H1 | Minor but inconsistent — sidebar truncates the H1. | Either rename H1 to "Activation" or expand sidebar label to "Activation & Participation". | `/company/activation/page.tsx`, `Sidebar.tsx` |

---

## 6. Visual / UX Friction

**Visual hierarchy:** Strong on `/company` (Executive Cockpit) and `/company/kora-index`. The KoraIndexHero with the large `text-5xl` number, Confidence Score inline, and Safeguard badge on the right is the clearest hierarchy element in the product. Other pages (activation, pillars, contribution) have good but flatter hierarchies.

**Card density:** `/company/kora-index` and `/admin/ai-onboarding` are the densest pages. Both are appropriate for their content depth. `/company/pillars` is borderline — two full tables (programs + initiatives) in sequence is a lot to scan. The programs table with 6 columns is readable but long.

**Readability:** The `text-xs` font size used throughout for secondary information is aggressive. On pages with many `text-xs` rows (Data & Evidence source table, Pillars program table), this creates fatigue. All primary metric values use appropriate bold sizing. Acceptable for now.

**Excessive tables:** `/company/data` has a 9-column wide table (source, rows, mapped, rejected, completeness bar, confidence, evidence, pending, status). On a standard 1280px display this fits but is tight. On 1024px it overflows. `/company/pillars` has two full tables in sequence. These are the only two density risks.

**Chart usefulness:** `/company` has a PillarChart (donut or bar) and ComponentBreakdown side by side — this is the right pairing. The ComponentBreakdownChart on `/company/kora-index` adds visual depth. No charts feel gratuitous.

**Color seriousness:** The color palette (slate base, pillar accent colors, green/yellow/red for Safeguard) is appropriately enterprise. No color feels playful. The amber for Foundation Light preview badges is the right tone — warning without alarm.

**Whether it feels premium enough:** The KoraIndexHero card with shadow-sm is the closest to premium. Other cards use `border-slate-200 bg-white` without shadow, which is clean but minimal. Not a blocker for demo stage.

**Warning/severity states:** The Activation Safeguard states (CLEAR green / WARNING yellow / FLAGGED red) are serious and consistent. WarningCard uses a left-stripe severity indicator instead of emoji — correct. All severity signals are muted, not alarming.

**Spacing / scanability:** Most pages use `space-y-6` which creates comfortable vertical rhythm. The `text-xs font-semibold uppercase tracking-wide text-slate-400` section heading treatment is consistent across all pages — good.

**Responsive risk:** `/company/data` source table and `/company/pillars` program table are the two most likely to overflow on mobile or narrow viewports. `/admin/ai-onboarding` source intake uses a CSS grid (`grid-cols-[2fr_1fr_1fr_1fr_90px]`) that would compress badly below 768px. Not a demo blocker since all demo sessions are on desktop, but worth noting.

---

## 7. Privacy Boundary Review

**Employer cannot see My KORA:** CONFIRMED. `myKoraPreviewService.canAccess(role)` is called at the top of all My KORA routes. Non-worker roles see the Access Restricted red-bordered state with an explicit message. Not just hidden — actively blocked.

**Company pages do not show individual worker data:** CONFIRMED. All company pages consume services that return only company-level aggregates. No `workers.json` import appears in any company-facing page. The `/company` page includes an explicit footer: "The employer sees aggregate organizational intelligence only. Individual My KORA, PIB and Dynamic Impact CV remain worker-owned and employer-invisible."

**Admin pages do not show worker-private data:** CONFIRMED. Admin pages use `adminPreviewService` which derives data from company-level outputs, source batches, and synthetic entries. No workers.json direct import in admin pages.

**My KORA states worker ownership clearly:** Yes. "This space belongs to the worker" banner is non-suppressible. Worker-private badge on PIB Light card. "Only you decide what to export or share" on Dynamic CV. "Your employer cannot see this CV" is explicit.

**Dynamic CV is worker-controlled:** Yes. Disabled export button labeled "Export — Preview only" signals future worker-initiated export. No employer path to this data.

**Privacy is structural, not only disclaimer-based:** Mostly yes. Role gates at the layout level (`app/admin/layout.tsx`, `app/my-kora/layout.tsx`) enforce separation before any component renders. Services enforce access at the data layer. The privacy page's two-column can/cannot-see layout is educational but the underlying enforcement is real.

**Places where privacy might feel like marketing rather than architecture:**
- The `employer_privacy_notice` text repeated in every InitiativeCard on `/company/contribution` — it reads as a legal disclaimer added to appease lawyers, not as a structural guarantee. This is actually fine from a demo perspective but could feel defensive.
- The sentence on `/my-kora/privacy`: "Your privacy is constitutional." — strong framing, but a skeptical lawyer would ask what that means technically. In Foundation Light this is demo-only, but the language is appropriate for the stage.

**Any place where employer could infer too much:**
- None structurally. The one risk would be `/my-kora` being accessible to an employer role, but the role gate blocks this correctly.

**Any text that could cause surveillance concern:**
- The "category-level display" on the My KORA timeline is correctly labeled and shows no health details. The pillar codes on timeline items (LIFE, GROWTH, etc.) are category-level only, not specific event details.
- The "IU: high/medium/low" labels on timeline items are appropriate — they show contribution level without showing the actual IU number.

---

## 8. KORA Admin / AI Onboarding Review

**Does /admin feel like KORA Operating Console?**
Yes, strongly. The H1 "KORA Operating Console" with "Internal Preview" badge, the explicit description distinguishing it from the company workspace, the Module 00 featured card, and the 9 additional module grid all communicate internal operational intelligence rather than user-facing analytics.

**Is AI Onboarding Engine prominent enough?**
Yes. Module 00 spans the full width of the grid (`sm:col-span-2 lg:col-span-3`) and appears above all other modules. The indigo color treatment distinguishes it from the standard white cards. The three AI boundary lines in the footer are visible.

**Is source intake → mapping → privacy filter → UEF draft queue → human review → scoring readiness clear?**
Yes, after the Phase 1H-B patch. Section B now shows all required fields. The 7 sections A through G follow the canonical pipeline order. Each section is clearly labeled with a letter code.

**Is it clear AI does not score workers?**
Yes. "AI assists mapping and review. It does not score workers." appears at the top of the page in AIBoundaryNotice, and again in Section F.

**Is it clear no external LLM is used on HR/worker data?**
Yes. "AI v0.1 is rule-based/taxonomy-based. No external LLM is used on HR or worker data." appears in the top AIBoundaryNotice and is reinforced in Section C's taxonomy basis field.

**Is it clear UEF event records are deferred?**
Yes. The yellow notice in Section E: "UEF event-level records are not generated in the Foundation Light demo phase. Aggregate queue counts only. Individual UEF records available post-Gate 2."

**Is Index Registry distinct from company KORA Index?**
Yes. The Index Registry is in the admin workspace only, shows cross-company outputs, and its framing ("All companies in the KORA demo portfolio") is distinct from the company-facing `/company/kora-index` which is single-company and embedded in the company workspace.

**Remaining polish only:**
- Add inline BCM definition on first use in Section C. "BCM (Base Contribution Matrix)" in parentheses after "BCM taxonomy rules applied" is sufficient.
- The Section A scoring readiness badge says "PARTIAL for scoring" in uppercase — "PARTIAL FOR SCORING" is correct but slightly awkward phrasing. Consider "SCORING: PARTIAL" or "PARTIAL READINESS".

---

## 9. Company Workspace Review

**Does /company show the commercial value?**
Yes, more than any other page. The KoraIndexHero + 3 insight tiles (weakness / strength / next action) is the closest thing to a "what does this give me" answer. Scenario comparison (S1 WARNING vs S2 CLEAR) makes the commercial proposition concrete: "fix these things, your score improves."

**Does the viewer understand what to do next?**
Partially. The "Recommended Actions" section on `/company` shows 3 next actions. But there is no explicit call to action linking back to deeper pages (Pillars, Contribution, or requesting a review from an advisor). This is appropriate for the demo stage but a gap for a sales context.

**Is Activation the main concept or still too buried?**
The landing page puts "activation" in the hero headline and the thesis line, but within the company workspace, Activation lives on `/company/activation` which is not the first page. The Executive Cockpit shows AR and MAR in the Activation Summary section, which is good. Activation is front-and-center on the most-visited page.

**Are Confidence and Safeguard visible enough?**
Yes. Both appear on the KoraIndexHero which is the top element on `/company` and `/company/kora-index`. Non-suppressible by architecture.

**Does Contribution feel like core vision or CSR add-on?**
Currently at risk of feeling like a CSR add-on due to two issues: (1) "Semi-Functional Preview" badge undermines seriousness; (2) the `is_kora_index_component: false` JSON display makes it look like an afterthought rather than an architectural design choice. After those two fixes, the companion indicator notice is actually very good: "KORA Contribution measures verified collective contribution beyond the company perimeter. It complements the KORA Index — it does not replace it."

**Does Financial Governance help or distract?**
It helps by providing commercial framing (KORA billing section shows real ARR numbers). The pillar budget breakdown is informative. The "Informational Only" amber disclaimer is appropriate. The distraction risk comes from the "Financial Governance Light" name and the budget utilization section which could be misread as welfare budget management. Fixable with a title change.

**Does Data & Evidence build credibility?**
Yes, but it's the most technical company page and arrives too early in the guided review path (step 4). Placing it after Contribution or Pillars would give it more context. The page content is correct and appropriate.

**Top 5 company-side micro-polish actions:**
1. Replace `is_kora_index_component: false` with prose on `/company/contribution` — high impact, low effort
2. Map raw source_type strings to readable labels on `/company/pillars` — removes welfare optics
3. Rename "Semi-Functional Preview" → "Foundation Light Preview" across contribution and financial
4. Rename "Financial Governance Light" → "Financial Governance" — remove the "Light" diminutive
5. Remove or clean the debug role/scenario footer on `/company` — removes developer artifact signal

---

## 10. My KORA Review

**Does My KORA feel useful to a worker?**
Yes. The PIB Light card with per-pillar breakdown and trends, the personal timeline, the dynamic CV, the privacy controls, and the quick links to CV and Privacy all compose into a coherent worker personal space. It does not feel empty.

**Does PIB Light feel meaningful but safe?**
Yes. "Personal Impact Balance" is well-named. The pillar breakdown with bars and trends is compelling. The `worker-private` badge on the PIB Light card is reassuring. The disclaimer at the bottom of the PIB card is appropriately brief.

**Does Dynamic CV feel compelling?**
Yes. The three summary stats (Total Items, Verified, Shareable), the CV items with pillar + verification badges, and the disabled export button all make it feel like a real product in preview rather than a placeholder.

**Is Privacy & Sharing too defensive or useful?**
Useful. The two-column can/cannot-see layout is the best communication pattern in the entire demo — clear, honest, and architectural. The consent toggles are correctly labeled "preview only" without overpromising. This page should be shown early to any privacy-concerned audience.

**Are opportunities too vague?**
Yes. Every item shows either "Preview only" or "Coming soon" with no explanation of what opportunities are or what they would show. A worker viewer has no mental model for what this section will become.

**Does it support the thesis that workers need to be onboard for KORA adoption?**
Yes. The worker-private banner ("Your employer cannot access individual My KORA data. Only aggregate, anonymized data contributes to the company KORA Index. Nothing here is visible to your employer.") directly addresses the worker trust requirement that makes KORA adoption possible.

**Top 5 worker-side micro-polish actions:**
1. Add 2 sentences to the Opportunities section explaining what it will show in production
2. Move `employer_privacy_notice` text from individual InitiativeCard to a single block below the initiative list on `/company/contribution`
3. Add a brief intro sentence above the personal timeline on `/my-kora` explaining what the timeline represents ("Your personal impact history — events that KORA has recorded as contributing to your Personal Impact Balance across the 5 pillars.")
4. "Coming soon" labels on `/my-kora` sidebar items (Opportunities, Bookings, Collective) are appropriate but consider adding "Foundation Light" to distinguish from general "coming soon"
5. Add a sentence connecting My KORA PIB to the company KORA Index: currently the link between personal PIB and company KORA Index is stated only in the privacy panel; it would be stronger if visible in the PIB Light card description

---

## 11. Partner / Advisor Review

**Are Partner and Advisor currently too weak?**
Yes. Both are bare skeletons with explicit developer placeholder text:
- `/partner`: "Partner workspace skeleton — Phase 1"
- `/advisor`: "Advisor review queue skeleton — Phase 1"

These texts explicitly name the implementation status. Any viewer who encounters these pages will conclude the demo is unfinished.

**Should they remain visible?**
Yes — removing them from the sidebar would require routing and permission changes and might create gaps in the role demonstration. They should remain visible but with minimum viable content.

**Should they be marked "Light Preview"?**
Yes. Replace skeleton text with a Light Preview state that:
1. Names the workspace (Partner Workspace / Advisor Review Workspace)
2. Describes its role in 2–3 sentences
3. Adds a "Foundation Light Preview — Full workspace available in pilot phase" badge
4. Does NOT add fake functionality or placeholder data

**What minimum polish is needed?**
For `/partner`: Name it, describe its 3 core functions (service catalog management, collective initiative participation, evidence uploads — no marketplace, no pricing), add a Light Preview badge. 10 lines of JSX, no service calls.

For `/advisor`: Name it, describe its 2 core functions (assigned evidence review queue, eligibility confidence assignment), add a Light Preview badge. 10 lines of JSX, no service calls.

**Should they wait until after internal review?**
No — these are blocking for external sharing. They can be fixed in 20 minutes total. They should be included in Phase 1J.

---

## 12. Readiness Assessment by Audience

| Audience | Ready now? | Why | Required before showing |
|---|---|---|---|
| Simone internal founder review | YES | All content is present and conceptually coherent. Debug artifacts are acceptable internally. | None |
| Trusted advisor | YES with caveats | Most content is excellent. Partner/Advisor skeletons are visible if roles are explored. | Fix /partner and /advisor skeletons |
| Next (primary partner) | NO | `is_kora_index_component: false`, Partner/Advisor skeletons, source type raw strings, and "Semi-Functional Preview" badges are all visible and would trigger credibility questions during the review. | Apply all 5 blocking/high micro-polish items (Phase 1J) |
| Early company stakeholder | NO | Same as Next. Raw source type labels and "welfare provider" rendering will confuse or mislead about KORA's positioning. | Apply all 5 blocking/high items |
| Investor | NO | All of the above. In addition, the debug role/scenario footer on `/company` and Partner/Advisor skeletons signal an unfinished product. Technical investor will also want to understand the AI Onboarding story — currently not in the guided review path. | Apply all 5 blocking/high items + add Admin to review path |
| Technical reviewer | MOSTLY YES | Architecture is sound, forbidden artifacts are absent, build is clean. Only blockers are the skeleton pages and JSON-visible `is_kora_index_component`. | Fix /partner, /advisor, and `is_kora_index_component` |
| Privacy/legal reviewer | YES | My KORA privacy architecture is the strongest part of the demo. Role gates are real. Privacy & Sharing page is thorough. The `pre_empirical_calibration` non-suppressible label is present everywhere. | None — this is a strong section |

---

## 13. Top 15 Micro-Polish Actions

### Must do before any external sharing

| # | Action | Affected route/file area | Impact | Effort |
|---|---|---|---|---|
| 1 | Replace `/partner` skeleton text with Light Preview state (name, 2-sentence description, Foundation Light Preview badge) | `/app/partner/page.tsx` | Removes credibility damage | Low |
| 2 | Replace `/advisor` skeleton text with Light Preview state (name, 2-sentence description, Foundation Light Preview badge) | `/app/advisor/page.tsx` | Removes credibility damage | Low |
| 3 | Replace `is_kora_index_component: false` font-mono text with prose statement on KORA Contribution companion notice | `/app/company/contribution/page.tsx` | Removes developer-code impression, reframes Contribution as a deliberate design choice | Low |
| 4 | Map raw source_type strings to KORA-coded display labels on `/company/pillars` program table (eliminate "welfare provider", "lms training" raw strings) | `/app/company/pillars/page.tsx` | Removes welfare management optics | Low |
| 5 | Rename "Semi-Functional Preview" badges to "Foundation Light Preview" on `/company/contribution` and `/company/financial` | Two page files | Removes "broken feature" signal | Low |

### Should do before Next

| # | Action | Affected route/file area | Impact | Effort |
|---|---|---|---|---|
| 6 | Add step 7 "KORA Operating Console" to DemoGuideContent REVIEW_STEPS pointing to `/admin` with role-switch instruction | `DemoGuideContent.tsx` | Closes the biggest narrative gap — AI Onboarding story becomes discoverable | Low |
| 7 | Rename "Financial Governance Light" → "Financial Governance" on H1 and page title | `/app/company/financial/page.tsx` | Removes "incomplete feature" signal | Low |
| 8 | Remove "Role: {activeRole} · Scenario: {activeScenario}" debug footer from `/company` (the calibration footer on `/company/activation` is correct and should be kept) | `/app/company/page.tsx` | Removes developer artifact from the most-visited page | Low |
| 9 | Add inline BCM definition on first mention in `/admin/ai-onboarding` Section C | `/app/admin/ai-onboarding/page.tsx` | Removes acronym confusion for non-technical viewers | Low |
| 10 | Add 2 introductory sentences to Future Vision page above the feature grid | `/app/future-vision/page.tsx` | Transforms feature list into strategic vision statement | Low |

### Should do before corporate stakeholder

| # | Action | Affected route/file area | Impact | Effort |
|---|---|---|---|---|
| 11 | Align H1 on `/company` with sidebar label (either change H1 to "Executive Cockpit" or update sidebar) | `/app/company/page.tsx`, `Sidebar.tsx` | Removes nav/content label mismatch | Low |
| 12 | Add 2 sentences to My KORA Opportunities section explaining what the section will show | `/app/my-kora/page.tsx` | Removes "incomplete section" impression for worker audience | Low |
| 13 | Move `employer_privacy_notice` from inside each InitiativeCard to a single block below the initiative list | `/app/company/contribution/page.tsx` InitiativeCard | Reduces visual noise, makes privacy statement feel structural not defensive | Low |

### Can wait

| # | Action | Affected route/file area | Impact | Effort |
|---|---|---|---|---|
| 14 | Reorder DemoGuideContent review path to place Data & Evidence after Contribution and Pillars (currently step 4, too technical too early) | `DemoGuideContent.tsx` REVIEW_STEPS | Improves narrative flow for non-technical viewers | Low |
| 15 | Add brief intro sentence to My KORA personal timeline explaining what it represents | `/app/my-kora/page.tsx` | Minor UX improvement for worker demo | Low |

---

## 14. What Not To Build Yet

**Production backend, SQL, Supabase, database migrations, Prisma**
Gate 2 (CTO Review) is OPEN. Production SQL is explicitly blocked. The demo is fully functional on synthetic data. Building a real backend now would add infrastructure complexity without improving the demo.

**Real authentication (NextAuth, Auth.js)**
Gate 3 (Legal/Privacy) is OPEN. No real user accounts should exist until legal review of data handling is complete.

**Real worker accounts or HRIS/LMS integrations**
Same gate block as auth. Foundation Light is a demonstration of the methodology and architecture — not a live system.

**UEF event-level seed data (uef-records.json)**
Explicitly excluded from Foundation Light. Aggregate queue counts are sufficient to demonstrate the concept. Creating event-level UEF records would require worker pseudonym IDs and add irreversible complexity.

**Fiscal classification logic or automated guardrail enforcement**
Gate 5 (Tax/Fiscal Advisor) is OPEN. Blocked until tax advisor review.

**Full Partner workspace implementation**
Not needed for demo. Light Preview state is sufficient. A full partner workspace requires marketplace architecture that is explicitly excluded.

**Full Advisor workflow**
Not needed. The advisor role in Foundation Light is illustrated through the admin network preview. A full review queue with evidence management is post-pilot scope.

**Additional demo companies beyond the four**
Four companies (Meridiana, Nexo, Fortis, Communitas) are sufficient for the demo narrative. Adding more creates seed maintenance burden without improving the story.

**Scoring algorithm changes or new KORA Index components**
The 10-component structure is fixed by methodology decision. No additions until formal D-22 decision.

**More complex scenario simulation**
S1 and S2 are sufficient for the before/after demo narrative. Additional scenarios add complexity without improving investor or buyer understanding.

---

## 15. Recommended Next Phase

**Phase 1J — Micro-Polish Patch**

**Exact scope:**
Apply the 13 actions listed as "Must do before any external sharing," "Should do before Next," and "Should do before corporate stakeholder" (items 1–13 in the table above).

**What to patch:**
1. `/partner/page.tsx` — Light Preview state
2. `/advisor/page.tsx` — Light Preview state
3. `/company/contribution/page.tsx` — replace `is_kora_index_component: false` with prose; rename "Semi-Functional Preview"; move employer_privacy_notice from per-card to once at bottom
4. `/company/pillars/page.tsx` — map source_type strings to display labels
5. `/company/financial/page.tsx` — rename H1 and page title; rename "Semi-Functional Preview"
6. `components/demo/DemoGuideContent.tsx` — add step 7 for Admin/AI Onboarding; reorder Data & Evidence to step 5
7. `/company/page.tsx` — remove debug role/scenario footer; align H1 with sidebar
8. `/admin/ai-onboarding/page.tsx` — add BCM inline definition
9. `/future-vision/page.tsx` — add 2–3 intro sentences
10. `/my-kora/page.tsx` — add Opportunities context sentences and timeline intro sentence

**What NOT to patch:**
- Do not add new routes
- Do not add new service methods or seed files
- Do not change methodology, pillar codes, or KORA Index components
- Do not add real functionality to Partner or Advisor workspaces — Light Preview only
- Do not change the privacy architecture — it is correct
- Do not change KoraIndexHero, ComponentBreakdown, ActivationSafeguardPanel — these are solid
- Do not touch the admin pages that are already passing QA

**Expected outcome:**
After Phase 1J, the demo will be externally shareable with:
- No developer skeleton text visible at any role
- No developer JSON (`is_kora_index_component: false`) visible at any audience
- No welfare management optics from raw source type strings
- A discoverable path from the demo guide to the AI Onboarding / Admin story
- Consistent feature framing ("Foundation Light Preview" instead of "Semi-Functional")
- A Future Vision page that communicates strategic ambition, not just a feature list

The demo can then proceed to external review with: trusted advisor, Next, and early company stakeholder audiences. Investor readiness requires one additional pass on narrative cohesion of the AI Onboarding story within the main demo flow.

---

**Document version:** v1.0
**Gate status at review:** Gate 1 CLOSED · Gate 2 OPEN · Gate 3 OPEN · Gate 5 OPEN
**Phase completed:** 1I
**Next phase:** 1J — Micro-Polish Patch
