# KORA Visual & Experience Doctrine — Company Platform Repositioning

**Document:** `docs/kora-visual-experience-doctrine.md`
**Version:** v1.0
**Status:** Active — Operational
**Date:** 2026-05-31
**Author:** Founder session — pre-implementation doctrine phase
**Derives from:**
- `docs/30-kora-brand-visual-product-experience-constitution.md` — constitutional reference
- `docs/17-kora-language-visual-system.md` — visual identity foundation
- `docs/16-kora-future-platform-ux-architecture.md` — experiential architecture

**Governs:**
Company Experience visual rebuild — Phase 1 target pages:
`/company` · `/company/kora-index` · `/company/reports` · `/admin/operator` · `/admin/data-intake`

**Purpose of this document:**
This document is not a Tailwind config, not a component spec, not a design system.
It is a **visual direction and experience discipline document** — written before implementation to prevent wrong-direction execution. It exists because building before this alignment costs more than the time it takes to write it.

---

## A. Purpose

### Why this document exists before implementation

KORA's technical foundation is now solid: Supabase, Auth, tenant isolation, RLS, N≥10 enforcement, PII Guard, Operator Flow, Admin Console, Data Intake, Decision Pack. The engine works.

The gap is not technical. The gap is that the product does not yet look, feel or behave at the level of its own ambition.

The risk of visual implementation without doctrine is not that the result is ugly. The risk is that it looks polished but wrong — a premium-looking welfare dashboard, an executive-feeling SaaS panel, a sophisticated HR tool — none of which KORA should ever be.

This document defines what "right" means before the first component is touched.

### What this document does

1. Defines the visual and experiential identity of KORA's Company Experience
2. Distinguishes Company from Worker experience at the design level
3. Defines how the KORA Index must be presented (not as a number — as an intelligence system)
4. Proposes three genuinely distinct visual directions
5. Recommends one direction with explicit rationale
6. Provides implementation guardrails so engineers and designers share one reference

### What this document does not do

It does not specify Tailwind classes, CSS variables, React components, or Figma tokens. Those artifacts are downstream of this document. This defines the **intent**. Implementation documents derive from it.

---

## B. Company Experience Positioning

### The problem statement

KORA's current Company-facing pages communicate intelligence through the visual grammar of a dashboard: numbers in cards, colored KPI chips, progress bars, dark containers with white text, section after section of equal-weight information. The structure is technically correct. The visual hierarchy is not wrong. The data is real and meaningful.

But it reads as a **sophisticated SaaS product**, not as **impact intelligence infrastructure**.

The difference is not cosmetic. A CFO looking at a welfare dashboard asks: "What do these numbers mean for compliance?" A CFO looking at intelligence infrastructure asks: "What decision should I take differently because of this?" The product's visual grammar shapes which question gets asked.

KORA must reliably produce the second question.

### What the Company Experience must communicate

Before a word of copy is read, the visual language of KORA Company must communicate:

- **Rigor.** This platform has a methodology. It has versions. It has boundaries. It has been thought through.
- **Governance.** This is a platform that CFOs, ESG leads, and boards can present to external advisors without embarrassment.
- **Intelligence.** The system knows what matters. It surfaces signal, not noise.
- **Privacy as architecture.** The employer never sees individuals. This is built into the structure — visible in the interface — not hidden in a privacy policy.
- **Economic weight.** What KORA measures has budget consequences. The visual grammar must reflect this.
- **Time.** KORA's value is longitudinal. The organization's activation intelligence compounds over time. The visual language must feel like it is built for years, not quarterly reports.

### What the Company Experience must never communicate

- That this is a welfare management tool
- That employees are being ranked, surveilled, or scored individually
- That the system makes decisions rather than informing them
- That ESG compliance is automated
- That AI is doing the work instead of the organization
- That the platform is generic — that it could be any HR/people analytics tool rebranded

### The single positioning sentence for Company design decisions

> "An executive intelligence system for human impact, activation and ESG-readiness."

Every layout decision, color choice, component design, and copy line must be evaluated against this sentence. If it contradicts it — even subtly — it must be changed.

---

## C. Stakeholder Hierarchy

The primary audience for the Company Experience, in order of decision weight:

| Rank | Stakeholder | Primary need | Failure mode to avoid |
|---|---|---|---|
| 1 | CEO / Managing Director | Strategic signal: is the organization activating its people effectively? | Making them read five sections before the answer |
| 2 | CFO / Finance Director | Economic signal: what is the return on people/welfare spend? Is this governed? | Looking like an HR cost center tool |
| 3 | HR Director / People Director | Operational signal: where is activation weak? What needs rebalancing? | Looking like a generic HR KPI dashboard |
| 4 | ESG / Sustainability Lead | Evidence signal: what structured people evidence supports ESG reporting? | Making unwarranted compliance claims |
| 5 | Welfare / Total Reward Manager | Initiative signal: which programs are generating verified activation? | Looking like a booking/benefits platform |
| 6 | Board / External Advisor | Governance signal: is this trustworthy? Can it be presented externally? | Looking like an internal admin panel |

### Design implications by stakeholder

**For ranks 1–2 (CEO, CFO):** The primary view must deliver its answer in under 10 seconds. One principal signal, one direction, one implication. They will not scroll to find the point.

**For ranks 3–4 (HR, ESG):** The secondary layer provides analytical depth — but only on deliberate navigation. They should find the granularity they need without it dominating the first-impression experience.

**For rank 6 (Board):** The interface must look credible when projected in a boardroom. This is a hard constraint on visual quality, not an aspiration.

---

## D. Visual Personality

### Guide adjectives

These six words are the design brief. Every component, every layout choice, every interaction should be evaluated against them:

1. **Executive** — Built for senior decision-makers, not analysts or administrators
2. **Measured** — Nothing excessive; every element earns its presence
3. **Authoritative** — Conveys institutional credibility without arrogance
4. **Precise** — Data is exact, legible, unambiguous
5. **Calm** — Reduces cognitive load; does not create alarm without cause
6. **Proprietary** — Looks like KORA, not like any other platform

### Anti-pattern list (constitutional)

These are failure modes. Any design element that produces one of these must be removed:

| Anti-pattern | Description | Common form |
|---|---|---|
| **Dashboard AI** | Looks like it was assembled from a dark-mode template | Full dark surfaces, glowing violet, giant isolated score |
| **Welfare platform** | Communicates employee health/wellbeing tracking | Progress rings, wellbeing cards, calming pastels |
| **Admin panel** | Looks like a back-office management tool | Table-heavy, dense sidebar, CRUD-style layout |
| **HR analytics** | Looks like conventional people analytics | Waterfall charts, demographic breakdowns, attrition metrics |
| **SaaS generic** | Could be any product in any category | White cards on gray, blue accent, generic grid layout |
| **Crypto/web3 aesthetic** | Dark, neon, speculative visual grammar | Glowing elements, animated gradients, dramatic dark |
| **Gamified employer tool** | Communicates employee competition or scoring | Leaderboards, XP bars, achievement badges, star ratings |
| **ESG compliance tool** | Looks like a regulatory reporting dashboard | Green everywhere, certification icons, checklist interfaces |
| **Surveillance system** | Gives impression of individual monitoring | Any individual-level data appearing in employer views |

---

## E. Color Usage Doctrine

### The proportion rule (from doc 30 §5.1)

The official palette proportions for the KORA platform:

| Color | Role | Proportion |
|---|---|---|
| **Gray Base** `#F5F6FA` | Surface / neutral ground | ~40% |
| **Cosmic Blue** `#06032B` | Structure / depth / authority | ~30% |
| **Violet** `#6156F5` | Signal / intelligence / interaction | ~20% |
| **Fun Green** `#C8FF47` | Activation / energy / confirmation | ~10% |

**For the Company Experience specifically,** the proportions should be weighted even more conservatively:

| Color | Company Experience proportion | Rationale |
|---|---|---|
| Off-white / Gray Base | 75–85% | Executive surfaces are primarily light. Darkness is used selectively, not as atmosphere. |
| Cosmic Blue | 10–15% | Structural anchors: section headers, hero blocks, editorial moments. Not wallpaper. |
| Violet | 3–6% | Precision signals: data highlights, active states, CTA buttons, score markers. Not dominant. |
| Fun Green | 1–2% | Confirmation only: CLEAR safeguard, verified activation, milestone crossed. Used sparingly so it retains surprise value. |

### Color by surface type

**Primary content surfaces:** Off-white (`#F5F6FA`) or white (`#FFFFFF`). These are where the intelligence lives. Light, clean, breathable.

**Editorial anchors / executive headers:** Cosmic Blue (`#06032B`) used as full-bleed section backgrounds for high-hierarchy moments — company hero, KORA Index primary surface, report cover. Maximum 2–3 instances per page.

**Structural navigation (sidebar):** Cosmic Blue. The sidebar is the one permanent dark surface. It provides the contrast that makes the content area feel premium and open — not dark for dark's sake.

**Data highlights / interaction signals:** Violet on light backgrounds. Never violet as a background for body text. Never violet overused to the point of visual fatigue.

**Confirmation states only:** Fun Green for Safeguard CLEAR, verified event count, crossed thresholds. Never decorative. Never as a heading color.

### What never happens with color

- Full-dark dashboard aesthetic (dark background covering > 30% of the viewport at once)
- Violet as dominant hue on any primary surface
- Fun Green used decoratively (borders, hover states, icons, section dividers)
- Gradient backgrounds covering entire pages (a single editorial hero is acceptable; not the whole layout)
- Alert colors (red, amber) used for non-alert purposes
- Color used to substitute for hierarchy — if you need color to explain priority, the hierarchy is broken

---

## F. Typography and Layout Principles

### Typeface system

Two KORA typefaces are in use (implemented as Space Grotesk and DM Sans as substitute fonts):

- **`font-kora-editorial`** (Space Grotesk substitute) — Headlines, primary scores, dominant labels, decisive statements. Used sparingly. Reserved for moments of maximum hierarchy.
- **`font-kora-interface`** (DM Sans substitute) — Body copy, supporting labels, data, interpretations, navigation. The workhorse.
- **`font-mono`** (Geist Mono) — Methodology identifiers, version IDs, machine-precision values (calibration_status, methodology_version_id). Signals verifiability.

### Typographic scale for Company Experience

| Level | Use case | Guideline |
|---|---|---|
| Display | KORA Index score, company name in hero | Very large, `font-kora-editorial`, tight tracking, Cosmic Blue or white |
| H1 / Section title | Page primary heading | Large, `font-kora-editorial`, Cosmic Blue |
| H2 / Module title | Section or card heading | Medium, `font-kora-interface` semibold |
| H3 / Data label | Subsection or metric name | Small, `font-kora-interface` semibold, uppercase tracking |
| Body | Interpretation text, explanations | Regular, `font-kora-interface`, relaxed line height |
| Caption / Meta | Methodology version, calibration, timestamps | Small, `font-mono`, muted — always present, never dominant |

### Layout principles

**Hierarchy before density.** The primary signal should resolve in 3 seconds without scanning. Everything else is secondary.

**Horizontal rhythm.** The consistent horizontal grid creates the feeling of a publication, not a dashboard. Sections should line up. Columns should be intentional.

**Breathing space as information.** Empty space is not waste — it is the signal that what follows is important. Dense layouts communicate noise. Spacious layouts communicate confidence.

**No uniform card grid.** A page of identically-sized cards communicates that all information has equal weight. KORA's intelligence has clear hierarchy. Layout must reflect it. Vary card sizes, section treatments, and column widths to express analytical priority.

**Section separation by role, not by border.** Sections are separated by whitespace, typeface change, or background shift — not by uniform gray borders on identical cards.

**Editorial sections for executive moments.** The highest-priority intelligence surfaces (KORA Index, Decision Pack, Executive Cockpit hero) use full editorial treatment: editorial header, typographic hierarchy, deliberate spacing. They do not use card containers.

---

## G. KORA Index Treatment

### The fundamental error to avoid

The KORA Index is not a score to display. It is an intelligence system to navigate.

Displaying `54 / 100` in a large font communicates: "Here is a number." That is a dashboard. KORA's value is not the number — it is the interpretation, the drivers, the risk, the confidence, and the decision direction that the number represents.

### The canonical KORA Index presentation unit

Every surface that shows the KORA Index must present a coherent intelligence unit — not a score card. This unit has seven required elements:

| Element | Content | Visual treatment |
|---|---|---|
| **Score** | The KORA Index value | Large, typographic, dominant — but never the only element |
| **Confidence** | Confidence Score (always external to KORA Index) | Immediately adjacent, clearly labeled as "external indicator" |
| **Safeguard status** | CLEAR / WARNING / FLAGGED with threshold context | Badge + brief threshold explanation |
| **Primary driver** | The main factor pushing the score in its current direction | 1–2 sentence interpretation, directly visible |
| **Main constraint** | The primary limitation on improving the score | 1 sentence, directly visible |
| **Next decision** | The single most actionable direction | 1 sentence, linked to deeper analysis |
| **Methodology marker** | Version ID + calibration status | Monospace, small, always present |

**Example of correct presentation:**

```
KORA Index                                    Confidence Score
54.0 / 100                                    72%
                                              Indicatore esterno · peso 0

Activation Safeguard: CLEAR
AR 40% ≥ soglia · MAR 32% ≥ soglia

Primary driver: Meaningful activation improved by 12pp vs S1
Main constraint: Pillar imbalance — LEGACY coverage at 6%
Next decision: Rebalance initiatives toward CONNECTION and LEGACY pillars

KORA Methodology v0.1 · pre_empirical_calibration
```

**What this is NOT:**

```
KORA Index
54
```

### Progressive disclosure

The canonical KORA Index unit (above) is the level-0 presentation — immediately visible on first load. Deeper analysis is always available through deliberate navigation:

- Level 0: Score + 7 required elements (always visible)
- Level 1: 4 macroblock breakdown (one click or scroll)
- Level 2: 10-component breakdown with individual scores
- Level 3: Explainability trace per component
- Level 4: UEF / event-level lineage (Operator view only)

Never start at level 2. Never require level 3 to understand the basic signal.

### KORA Index is never used alone

The KORA Index must never appear:
- Without the Confidence Score immediately adjacent
- Without the Safeguard status
- Without `methodology_version_id` and `calibration_status`
- Without at least a one-line interpretation of the primary driver
- Without the `synthetic_demo_data: true` label in Foundation Light

These are non-suppressible per doc 21b. They are also UX requirements — a number without context is not intelligence.

---

## H. UX Principles

These principles govern every interaction design decision in the Company Experience. They extend and operationalize doc 30 §3.

### H-01: Decision before data

The primary view answers the most important question first. For the Company, that question is: **"What should I decide differently because of this?"**

This means the Executive Cockpit opens with KORA Index + safeguard + one priority action — not with a data overview requiring analysis. Data comes second, on deliberate navigation.

### H-02: Explainability as first-class architecture

Every score, every metric, every status has its explanation immediately visible or one interaction away — not buried in documentation, not behind a "?" tooltip that requires hover, not missing.

This is not a nice-to-have. It is what makes KORA different from a black-box score. The explanation IS the intelligence.

### H-03: Confidence is always present

No output is shown without its confidence and boundary markers. This includes:
- KORA Index → always with CS, always with methodology version, always with calibration status
- Any metric derived from data → always with data quality signal
- Any interpretation → always with the caveat that distinguishes it from a causal claim

The confidence layer is never suppressed for visual cleanliness. If showing confidence makes the design "cluttered," the design is wrong — not the confidence display.

### H-04: No individual lens, ever

No employer-facing surface should create the visual impression that individual workers are being observed. This means:
- No individual worker rows in employer-facing tables
- No "view worker profile" paths from employer spaces
- No metrics that imply individual-level resolution (e.g., "worker X contributed Y")
- The Privacy Boundary Notice appears whenever aggregation is approaching the N<10 threshold
- The visual design of employer pages reinforces organizational-level framing at every moment

This is not just a data constraint — it must be a **visual design constraint**. The layout, the labels, the interaction patterns must make it visually obvious that KORA measures the organization, not its people.

### H-05: Board-readiness as design bar

Every major view (Executive Cockpit, KORA Index, Reports) must pass the "boardroom test": can a Company Admin project this on a screen in a board meeting and feel confident, not embarrassed?

The boardroom test fails when:
- The interface looks like a startup demo
- Synthetic/demo labels are absent (in Foundation Light)
- The visual quality is inconsistent or template-like
- The terminology is jargon-heavy or undefined
- Colors are garish or distracting in projection context

### H-06: The spend-to-activation mental model

The Company Experience must consistently reinforce the analytical flow:

> **Budget → Initiative → Activation → Evidence → Decision**

This is KORA's unique value proposition: it closes the loop between people spend and verified organizational impact. The visual architecture should reflect this flow — not present it as a collection of separate metrics.

The Budget-to-Human-Impact module, the Activation analysis, the Decision Pack — these should feel like stages in a continuous analytical journey, not separate dashboards.

### H-07: Less, but sharper

A Company view with fewer, more meaningful metrics is superior to a view with comprehensive coverage. If a metric cannot be explained in one sentence, it should not appear in the primary view. If a chart cannot be read in 5 seconds, it should not appear in the executive surface.

This is discipline, not simplicity. KORA handles complex, multi-dimensional data. The discipline is in deciding what earns primary display.

### H-08: Calm intelligence

The platform's emotional register is calm confidence. No alerts without cause. No amber/red without specific, actionable meaning. No motion or animation without clear information purpose. No visual drama without analytical justification.

The platform should feel like a trusted advisor who is well-prepared — not an alert system that keeps you anxious.

### H-09: Proprietary vocabulary

KORA has its own language: KORA Index, Activation Safeguard, Confidence Score, Impact Units, UEF, PIB, CLEAR/WARNING/FLAGGED, Activation Debt, Evidence Debt, Budget-to-Human-Impact, pillar codes.

This language should appear consistently in the UI — not replaced by generic terms ("score," "rating," "health index") that make KORA look like any other platform. The vocabulary is part of the product's intellectual identity.

### H-10: Boundary clarity as feature

KORA's limitations — what it measures, what it does not measure, what is excluded, what is pre-empirical — are not embarrassments to hide. They are trust signals to display.

A platform that is transparent about its limitations is more credible than one that overclaims. The "Confini Metodologici" section is not a legal disclaimer. It is evidence of rigor.

---

## I. IX (Interaction Experience) Principles

### I-01: Progressive disclosure, not progressive loading

Information is organized in layers — users navigate to depth deliberately. No surface "loads more" because there was too much to show at first — layers exist because different stakeholders need different depths.

### I-02: Drill-down by intent, not accident

Key interactions in the Company Experience:
- Click on KORA Index → expands primary driver analysis + macroblock breakdown
- Click on Confidence Score → data quality explanation + evidence limitations
- Click on Safeguard badge → threshold context (AR, MAR values vs. thresholds)
- Click on a Pillar segment → pillar activation + signal + risk + next action
- Click on Decision Pack CTA → routes to `/company/reports`, never a modal
- Click on Boundary → what is excluded and why

All drill-downs increase understanding. None are for entertainment.

### I-03: States must be explicit

Every view that has conditional content (no KORA data yet, advisory review required, confidence low, data incomplete) must show an explicit, informative state — never a blank area, never a spinner that leads nowhere, never an error code without context.

Explicit state = label + explanation + next available action.

### I-04: Interaction symmetry

What can be expanded can also be collapsed. What can be drilled can be returned from cleanly. The navigation model is depth-first, not branching — the user always has a clear path back to the primary signal.

### I-05: Micro-feedback without theatrics

Interaction feedback (hover states, active states, loading) should be present but quiet — a slight border change, a subtle background shift, a brief opacity transition. Never bounce, never glow, never slide in from unexpected directions.

### I-06: No mandatory onboarding interruptions

For executive stakeholders, the experience should begin with intelligence — not a guided tour, not a checklist, not a "get started" panel dominating the primary view. Onboarding state is surfaced in a peripheral status indicator, not as the primary experience.

---

## J. Company vs. Worker Visual Split

These are two fundamentally different design problems. They must never contaminate each other.

### Company Experience

| Dimension | Character |
|---|---|
| Audience | Senior executives, governance decision-makers |
| Emotional register | Calm, authoritative, precise, institutional |
| Primary color surface | Light/editorial (75–85% Gray Base / white) |
| Depth of dark | Selective — sidebar, editorial headers, hero moments only |
| Data density | Controlled — primary signal first, depth on demand |
| Interaction style | Deliberate, drill-down, no unnecessary animation |
| Vocabulary | KORA institutional: Activation Safeguard, Confidence Score, BTI |
| Gamification | None. Ever. |
| Individual visibility | Zero. Employer sees only organization-level aggregates. |
| Time horizon | Longitudinal — period-over-period comparison, compound intelligence |
| Chart tolerance | Low — only when the chart adds information a table cannot |
| Copy tone | Advisory, measured, explanatory, rigorous |

### Worker Experience (contrast reference)

| Dimension | Character |
|---|---|
| Audience | Individual workers, personal growth journey |
| Emotional register | Dynamic, personal, energetic, motivating |
| Primary color surface | More varied — can use brand colors more expressively |
| Depth of dark | Can be higher — personal/ambient contexts allow more immersion |
| Data density | Personal and milestone-oriented — progressive, achievement-focused |
| Interaction style | More fluid, can use motion to signal personal impact |
| Vocabulary | Personal: My KORA, Dynamic CV, Impact Journey |
| Gamification | Not gamification, but achievement: milestones, verified growth |
| Individual visibility | High — worker sees their own data with full granularity |
| Time horizon | Active journey — current period, upcoming opportunities |
| Chart tolerance | Higher — personal progress visualization is appropriate |
| Copy tone | Encouraging, personal, clear, non-clinical |

### The contamination rule

Company views must never import Worker visual grammar:
- No progress rings in employer views (visual grammar of individual progress)
- No milestone badges or achievement notifications in employer views
- No "Your activation is improving!" copy in employer views
- No individual timeline visualizations in employer views

Worker views must never import Company visual grammar:
- No aggregate metrics in worker personal views (re-identification risk)
- No corporate governance language in worker personal copy
- No board-room-style data tables in the worker personal experience

---

## K. Component Principles

### Cards

**When to use:** When information is genuinely self-contained and parallel with other cards.

**When not to use:** When cards are being used as page structure (sections of a page should not all be cards — that creates undifferentiated weight).

**Card types:**

| Type | Character | Use case |
|---|---|---|
| **Intelligence card** | Light surface, subtle border, strong typographic hierarchy | Primary metric with interpretation (e.g., macroblock score) |
| **Editorial anchor** | Dark (Cosmic Blue) background, white text, prominent | KORA Index hero, company hero block |
| **Status card** | Colored border indicating state (amber, green, muted red) | Pipeline status, data readiness, advisory review |
| **Ghost card** | Dashed border or very light fill | Future capability, inactive state, coming-soon module |

**What cards never have:**
- Drop shadows that are heavy or dark
- Thick colored borders as decorative choice (border = state signal, not decoration)
- Icons as primary content anchors (icons support; they do not lead)
- Gradient fills on regular content cards (reserve for editorial anchors)

### Tables

Tables are preferred over charts when:
- Precision matters (exact values, not trends)
- Multiple dimensions must be compared simultaneously
- The audience needs to reference specific values

Tables are never:
- Paginated without explicit user need
- Sortable by default on first load in executive views
- Used to display individual worker data in employer context

### Charts

Specific guidance in Section L below.

### Sidebars

The sidebar is a dark (Cosmic Blue) navigation surface. Its character is:
- Compact, quiet, subordinate to content
- Typography is small, restrained — it does not compete
- Active state is a light left border or subtle highlight, not a heavy filled background
- The sidebar does not contain intelligence — it contains navigation
- Section headings are uppercase, small, muted
- No icons required (label clarity is sufficient for a professional audience)

### CTAs

| Level | Character | Use |
|---|---|---|
| Primary CTA | Cosmic Blue fill, white text | Decision Pack, Board Pack open, primary navigation actions |
| Secondary CTA | Violet outline, violet text | KORA Index detail, supporting navigation |
| Tertiary CTA | No fill, muted text, subtle underline | Supporting links, supplementary navigation |

CTA principles:
- Maximum 2 primary CTAs per view
- No violet-filled buttons on dark (Cosmic Blue) backgrounds — white or outline only
- CTA copy is action-first: "Apri Decision Pack" not "Decision Pack →" alone
- Disabled states are explicit (not invisible opacity-50 without explanation)

### Empty states

Every empty or not-yet-available state must:
- Explain why it is empty (data not yet loaded, onboarding incomplete, etc.)
- State what is needed to resolve it
- Provide a path to next action

Empty states are never: a blank area, a raw error code, or a generic "No data" text.

### Status badges

Status badges communicate state, not decoration. Strict rules:

| Status | Color | Use |
|---|---|---|
| CLEAR | Fun Green background/border, Cosmic Blue text | Activation Safeguard passed |
| WARNING | Muted amber | Activation below threshold, review recommended |
| FLAGGED | Muted red/rose | Activation critically insufficient |
| Pre-empirical | Amber mono outline | methodology calibration state |
| Synthetic demo | Muted slate outline | synthetic_demo_data: true |
| Blocked | Rose | Pipeline blocked, action required |

Badges never flash, pulse, or animate.

---

## L. Chart Principles

### When to use charts

Charts earn their place in Company Experience only when:
1. The chart shows something a table or text cannot (trend direction, distribution shape, comparative magnitude)
2. The chart resolves in 5 seconds without a legend
3. The chart does not require training to interpret

### Approved chart types for Company Experience

| Chart type | When appropriate | Never |
|---|---|---|
| **Horizontal bar** | Pillar distribution, macroblock comparison, component breakdown | On circular/donut/radar form |
| **Small multiples (bar)** | Period-over-period comparison, S1 vs. S2 | As area charts or line charts with decoration |
| **Diverging bar** | Symmetric comparisons (e.g., budget allocation vs. activation return) | Decoratively |
| **Single-value display** | Primary metric with interpretation (not a gauge/speedometer) | As circular progress or radial gauge |
| **Inline sparkline** | Trend signal within a data row (if temporal data exists) | As primary visualization |

### Prohibited chart types for Company Experience

- **Donut / pie charts** — proportions are better shown as horizontal bars with explicit labels
- **Radar / spider charts** — difficult to read precisely, visually generic
- **Line charts with decorative fills (area charts)** — tolerated only for longitudinal trend data, never decorative
- **3D charts** — never
- **Animated charts** — never in primary views; chart entry animation on load is prohibited
- **Gauge / speedometer** — the KORA Index is not a gauge
- **Bubble charts** — not appropriate for Company executive surfaces

### How to make charts proprietary

Charts look like KORA when:
- Colors are drawn from the KORA palette only (no default Recharts/Chart.js blue/green/orange)
- Each bar has an explicit value label (no legend required)
- The chart title is a statement, not a description ("LIFE drives 44% of verified activation" not "Pillar Distribution")
- A one-line interpretation appears below the chart
- The methodology caption appears below ("Distribuzione IU aggregati · dati sintetici demo")

---

## M. Copy Principles

### Tone

**Executive advisory.** KORA copy talks to decision-makers, not data consumers. It surfaces insight, not data. It recommends action, not observation.

**Measured confidence.** KORA has a clear methodology and clear limitations. Copy reflects both — confident about what is measured, explicit about what is not.

**Institutionally rigorous.** No startup breathlessness. No AI-hype language. No speculative claims. Every statement is defensible.

**Italian-first for platform copy.** UI text, warnings, recommendations, labels, and report copy are in Italian per CLAUDE.md §12 rule 15. Proprietary names remain in English.

### Approved KORA claim phrases

These phrases are aligned with KORA's methodology and positioning:

- "KORA misura ciò che accade dopo la spesa."
- "La conformità legale è una baseline, non impatto."
- "Non è spesa sbagliata. È spesa che può diventare più intelligente."
- "Organization-level intelligence. No individual surveillance."
- "From people spend to verified activation intelligence."
- "L'attivazione organizzativa è misurabile, spiegabile e migliorabile."
- "KORA non misura gli individui. Misura l'organizzazione come sistema."
- "Il valore umano aggregato diventa leggibile."
- "Governance, non sorveglianza."
- "Evidenza strutturata, non compliance automatica."

### Forbidden copy patterns

| Forbidden | Why | Use instead |
|---|---|---|
| "Punteggio benessere dei dipendenti" | Surveillance framing | "Indice di attivazione organizzativa" |
| "I tuoi dipendenti stanno..." | Individual surveillance implication | "L'organizzazione mostra..." |
| "KORA certifica che..." | Unwarranted certification claim | "KORA supporta la rendicontazione con evidenze strutturate" |
| "AI-powered insights" | Overstating AI role, generic | "Intelligence metodologica" |
| "Gestione welfare" | Welfare platform framing | "Intelligenza sull'attivazione" |
| "Performance team" | HR performance tool framing | "Attivazione organizzativa" |
| "Felicità dei dipendenti" | Wellbeing tracker framing | Remove entirely |
| "Compliance ESG automatica" | Unwarranted claim | "Supporto alla rendicontazione CSR/ESG" |
| "Traccia i tuoi lavoratori" | Surveillance language | Remove entirely |
| "Come va il tuo team?" | Gamified / casual | Not used in Company context |

### Mandatory disclaimer copy

This text appears wherever CSR/ESG is referenced:

> "KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio."

This text appears wherever HR KPI correlation is shown:

> "Correlazione ≠ causalità — tutti i segnali KORA sono associativi, non predittivi."

---

## N. Do / Don't

| ✓ Do | ✗ Don't |
|---|---|
| Light editorial surfaces dominate (75–85%) | Cover the platform in dark backgrounds |
| Use Cosmic Blue for structural anchors (sidebar, editorial headers, hero moments) | Use dark as atmosphere or decoration |
| Show the KORA Index with its 7-element intelligence unit | Show a large isolated score number |
| Always display CS, methodology_version_id, calibration_status | Hide governance markers for visual cleanliness |
| Use Fun Green exclusively for CLEAR state and verified activation | Use lime as a decorative color or hover state |
| One primary CTA per major action (Cosmic Blue fill) | Fill the interface with violet buttons |
| Use horizontal bars for distribution data | Use donut/radar/gauge charts |
| Copy that surfaces the analytical implication | Copy that describes the data |
| Explicit empty states with explanation and next action | Blank areas or "No data" text |
| Italian-first UI copy, English for proprietary KORA names | Full English UI (not Italian market ready) |
| Distinguish sections by whitespace and typographic hierarchy | Use identical cards for all sections |
| Show Safeguard status prominently with threshold context | Hide safeguard or show without explanation |
| Separate Company and Worker visual grammar | Let Worker design patterns appear in employer views |
| Show Privacy Boundary Notice for N<10 suppression | Silently hide data below threshold |
| Progressive disclosure: summary first, detail on demand | Force executives to scroll to the primary signal |
| Monospace methodology identifiers (small, always present) | Remove methodology markers to "clean up" the design |

---

## O. Application to First Target Pages

### `/company` — Executive Cockpit

**Primary question this view answers:** "What is the state of my organization's activation, and what should I do next?"

**Information hierarchy:**
1. Company identity + context (name, period, status) — immediate
2. KORA Index intelligence unit (score + CS + safeguard + primary driver + next decision) — 5 seconds in
3. Strategic snapshot: 3 modules at different visual weights (Activation, BTI, Readiness)
4. Human Impact Map: 5-pillar editorial visualization (not a generic radar)
5. Decision Pack CTA: strong editorial block connecting analysis to action
6. Methodology boundaries footer: always visible, never dominant

**What must change from current state:**
- The 3 `ExecutiveIntelligenceBlock` cards currently have identical visual weight — need differentiation
- The pillar section is a gray box containing a generic chart — needs editorial treatment with explicit pillar labels
- No clear Decision Pack CTA moment — users must know where to go
- The "Methodology boundary footer" is important but visually undifferentiated

**What stays:**
- `ExecutiveCockpitHero` — already executive grade
- `KoraIndexCommandCenter` — already strong
- `PriorityActionPanel` — already KORA-branded

---

### `/company/kora-index` — KORA Index Detail

**Primary question this view answers:** "Why is the KORA Index this value, what drives it, and what constrains it?"

**Information hierarchy:**
1. Editorial header: KORA name + period + single-sentence positioning claim
2. KORA Index intelligence unit (full 7-element display, KORA-branded — not slate/generic)
3. S1→S2 comparison panel (clear, editorial, not a generic card)
4. Composition layer: 4 macroblocks as architectural diagram, not just scored cards
5. Component analysis: 10 components with visual weight proportional to analytical importance
6. Pillar intelligence: 5 pillars with state, contribution, signal
7. Explainability section: primary drivers narrative
8. Boundary section: what is excluded, why
9. Technical detail: collapsed by default (available for analysts, not primary for executives)

**What must change from current state:**
- Plain `<h1>KORA Index Detail</h1>` header — needs editorial KORA-branded hero
- `KoraIndexHero` dark variant uses `bg-slate-900` (generic) — must use `#06032B` (KORA)
- "Dettaglio Tecnico" section is currently primary-level weight — should be collapsed/secondary
- No clear narrative flow — components appear in mechanical order without analytical story

**What stays:**
- All data, all service calls, all props passed to sub-components
- All scoring values
- `MacroblockCard`, `ComponentBreakdown`, `ExplainabilityPanel` logic

---

### `/company/reports` — Decision Pack

**Primary question this view answers:** "What is the board-ready output of KORA's analysis for this period?"

**Information hierarchy:**
1. Decision Pack hero: KORA brand colors (Cosmic Blue/navy, not generic slate/indigo)
2. Version status: current + history (KORA-branded, not generic indigo)
3. Governance strip: methodology version, calibration, readiness
4. Export CTA: strong, primary-level Board Pack link
5. Section navigation: KORA-branded pill chips
6. 8 canonical sections: unchanged content, improved visual rhythm

**What must change from current state:**
- Hero gradient uses generic `from-slate-900 via-slate-800 to-indigo-900` — must use KORA navy palette
- Version cards use `bg-indigo-50 border-indigo-200` (generic) — must use KORA violet/navy palette
- Section navigation hover uses `indigo` — must use `kora-violet`
- Confini Metodologici footer uses `bg-indigo-50` (generic) — must use KORA palette
- The Board Pack CTA could be more prominent as primary action

**What stays:**
- All sections, all section content, all sub-components
- All data, all service calls
- The 8-section structure

---

### `/admin/operator` (reference — not in Phase 1 visual rebuild)

Character: Operational precision. More data-dense than Company. Suitable for KORA Operators who need lineage and pipeline visibility. Visual grammar is similar to Company but slightly more compact and analytically detailed. Tables are primary. Charts are supporting. Navigation state is more prominent.

### `/admin/data-intake` (reference — not in Phase 1 visual rebuild)

Character: Intake workflow. Clear stage-by-stage state machine. Progress is explicit. Each stage has clear status, blocking reasons, and next action. Operator-grade density, not executive-grade simplicity.

---

## P. Implementation Guardrails

These rules govern the visual rebuild that follows this doctrine. They are non-negotiable.

### What the rebuild touches

- Layout, hierarchy, spacing, and visual rhythm of pages
- Color of containers, headers, cards (moving from generic slate/indigo → KORA palette)
- Typographic hierarchy and scale
- Component visual treatment (borders, backgrounds, typography within components)
- Addition of editorial structural elements (section dividers, anchor moments)
- Copy on labels, section headings, and interpretation text
- New lightweight wrapper components (e.g., editorial header blocks, CTA strips)

### What the rebuild never touches

| Category | Files / Systems | Reason |
|---|---|---|
| Scoring engine | `lib/kora-engine/**` | Engine is correct and tested |
| Methodology config | `lib/methodology-config/**` | Weights are never hardcoded |
| Seed data | `data/synthetic/**` | Demo data is fixed and validated |
| Services | `services/**` | Service layer is correct |
| Supabase / RLS | All Supabase configuration | Gate 2 open |
| Auth | All authentication | Gate 3 open |
| N≥10 enforcement | PII guard, privacy visibility | Security boundary final |
| Routing structure | `app/**` route structure | No new routes in Phase 1 |
| Types | `lib/types/**` | Data contracts are stable |
| Props contracts | Component interfaces | Components receive same props |

### Demo regression invariance

The visual rebuild must preserve these values at every stage:

| Scenario | KORA Index | Confidence Score | Safeguard |
|---|---|---|---|
| S1 | 34 | 60% | WARNING |
| S2 | 54 | 72% | CLEAR |

Any build/lint/type check failure is a blocker before the next phase.

### The "boardroom test" as acceptance criterion

Before any page is considered done, apply this test:

> "Can a Company Admin open this page, project it in a board meeting, and feel confident in what is shown?"

If the answer is uncertain, the page is not done.

### The anti-patterns checklist (run before commit)

Before committing any visual change, verify:

- [ ] No full-dark background covering > 30% of the primary content viewport
- [ ] KORA Index appears with all 7 required elements (score, CS, safeguard, driver, constraint, next decision, methodology marker)
- [ ] Fun Green appears only for CLEAR state, verified activation, and crossed thresholds
- [ ] No individual worker data visible in any employer-facing component
- [ ] Synthetic demo labels present where required
- [ ] No chart type from the prohibited list
- [ ] `methodology_version_id` and `calibration_status` always visible on KORA Index surfaces
- [ ] No copy from the forbidden phrases list
- [ ] CSR/ESG disclaimer present wherever ESG is referenced

---

## Q. Three Visual Directions for Company Experience

### Direction 1: Executive Editorial System

**Philosophy:**
The interface reads like a premium decision-support publication — not a product, not a dashboard. Information is organized editorially: headlines carry meaning, white space is intentional, the hierarchy is resolved by type scale before color. The visual grammar is closer to the Economist's data journalism, a McKinsey Quarterly layout, or a Bloomberg Businessweek spread than to any SaaS product. The dashboard disappears; the intelligence remains.

**Layout composition:**
- Primary surface: off-white / Gray Base, predominantly light
- A single full-bleed Cosmic Blue editorial header anchors each major page (company name, period, single-sentence claim)
- Below the header: editorial two-column or asymmetric grid — primary intelligence left or center-large, interpretation right
- Sections separated by generous whitespace and typographic shifts, not card borders
- KORA Index as an editorial "article" — typographic hierarchy, not a card
- Charts minimal and intentional — used only when a visual comparison cannot be expressed as text or a table
- Sidebar: Cosmic Blue, compact, minimal

**Color treatment:**
- 80% off-white / Gray Base
- 12% Cosmic Blue (header anchors, sidebar, select structural elements)
- 5% Violet (data signals, metric highlights, CTA buttons)
- 3% Fun Green (CLEAR state, verified activation only)

**KORA Index treatment:**
Not a card. An editorial block with a large typographic score, a CS value immediately adjacent, the safeguard interpretation below, the primary driver as a subtitle, and the methodology footer in monospace. The whole unit reads like a structured intelligence brief.

**Sidebar / topbar:**
Sidebar: Cosmic Blue, compact typography, no icons. Topbar: minimal — breadcrumb + period indicator + role chip. No header dominance.

**Chart / card treatment:**
Charts avoided except for pillar distribution (horizontal bar, no legend) and macroblock comparison (horizontal bar). Cards used sparingly — the macroblock layer appears as a structured data table with inline bars, not as four identical cards.

**Tone perceived:**
Advisory. Board-grade. Institutional without being cold. The platform feels like it has been designed by people who understand both data and executive communication.

**Pro:**
- Maximally differentiated from any existing HR/ESG/welfare SaaS
- Ages best — editorial aesthetics do not follow UI trend cycles
- Best alignment with the Decision Pack PDF (coherent document-to-interface experience)
- Passes the boardroom test reliably
- Naturally enforces "less, but sharper"
- Best alignment with doc 30 40% Gray Base rule

**Con:**
- Requires typographic precision that is harder to implement correctly than card-based layouts
- May initially feel "understated" to users expecting a powerful-looking dashboard
- Higher design risk in execution — an editorial layout done poorly looks like an unfinished wireframe

**Risk:**
If executed without sufficient typographic rigor, it looks like a bare HTML page. The "executive editorial" aesthetic requires careful implementation of type scale, spacing, and hierarchy.

**When to choose:**
When KORA's primary differentiator is the quality of its intelligence — not the quantity of its visualization. When the platform must earn trust from CFOs and board members. When the Decision Pack PDF and the platform UI must feel coherent as one system.

---

### Direction 2: Intelligence Command Surface

**Philosophy:**
The interface reads like a precision analytical instrument — a control surface for organizational intelligence. It is not a dark dashboard. It is a precisely structured system where light content areas are organized by an invisible grid, signals are surfaced through controlled use of color, and the interaction model reveals depth without demanding it. The reference is less "editorial publication" and more "Bloomberg Terminal meets Stripe": analytically dense, visually calm, interaction-rich, and proprietary in feel.

**Layout composition:**
- Sidebar: Cosmic Blue, dark — the single persistent dark element
- Content area: predominantly light (off-white), but slightly cooler and more structured than Direction 1
- Strong horizontal grid — sections align to an invisible column system
- The KORA Index appears as a "command center" block — large number, but immediately surrounded by four companion indicators in a compact grid
- Data-dense sections use structured data tables with inline visualization (sparklines, inline bars)
- Color signals are precise — Violet marks active states, Fun Green marks confirmed thresholds
- More interaction affordances visible — subtle hover states, expandable sections, precision focus on click

**Color treatment:**
- 65% off-white / Gray Base content area
- 20% Cosmic Blue (sidebar + structural section headers)
- 10% Violet (data signals, active states, metric highlights, borders)
- 5% Fun Green (CLEAR, confirmed activation, threshold markers)

**KORA Index treatment:**
A command center block with the score large but surrounded by a precisely structured grid of companion indicators. The block is visually distinct — slightly darker ground (`#F0F1F8`), strong left border in Violet — but not dark. The 7-element intelligence unit is presented as a structured mini-layout within the block.

**Sidebar / topbar:**
Sidebar: Cosmic Blue, compact typography, subtle active indicator (left border in Violet or Fun Green). Topbar: medium presence — company name, period selector, scenario switcher, role chip visible.

**Chart / card treatment:**
Charts more present than Direction 1, but still controlled. Horizontal bars primary. Small multiples used for S1→S2 comparison. Component breakdown shown as a structured horizontal bar chart with explicit value labels. Cards used for the intelligence blocks — but with clear visual hierarchy between primary (full-width) and secondary (grid) cards.

**Tone perceived:**
Analytical precision. Expert. Controlled. The platform feels like it was built for people who understand what they are looking at and want the tools to go deeper.

**Pro:**
- Strong visual presence — immediately looks premium and purpose-built
- Better for users who want analytical depth accessible without many clicks
- Natural for the Operator/Admin side of the platform
- The sidebar/content contrast is visually powerful and well-understood by professional software users
- Better for multi-scenario comparison and drill-down workflows

**Con:**
- Harder to differentiate from sophisticated SaaS analytics products if not executed with KORA-specific vocabulary and visual identity
- Risk of the sidebar/dark contrast reading as an "admin panel" aesthetic
- If Violet is overused in this direction, it reverts to generic SaaS

**Risk:**
Drifts toward "intelligence platform built by engineers for analysts" rather than "executive decision support." The Violet presence risk: if overused, the interface reads as a generic analytics tool. Requires discipline to stay above the "admin panel" line.

**When to choose:**
When the primary user of the Company workspace is an HR Director or People Analyst who will spend hours in the platform — not a CFO who checks monthly. When analytical depth is more important than boardroom-projection aesthetics.

---

### Direction 3: Institutional Impact OS

**Philosophy:**
The interface reads like a governance-grade institutional system — the visual equivalent of a regulatory report or a board audit document, made digital and navigable. It is systematic, dense-but-organized, and communicates permanence and institutional seriousness. The reference is less "startup intelligence tool" and more "a major consulting firm's proprietary advisory platform" or "a regulatory agency's public dashboard." Every element communicates: this platform has been thought through, validated, and built to last.

**Layout composition:**
- Heavy structure: strong section demarcation with navy header bands and clear section titles
- Systematic table-of-contents navigation at the top of major pages (like a long-form document)
- Content sections are document-like: one section at a time, no competing visual elements
- Tables dominate — tabular data is the primary visualization language
- Typography is precise and hierarchical — section headings are prominent, body text is very legible
- Color is used systematically (not for atmosphere) — navy headers, violet for KORA-specific outputs, green for confirmed states only
- Very little whitespace used decoratively — space is structured, not ambient

**Color treatment:**
- 60% light surfaces (off-white / white)
- 25% Cosmic Blue (section header bands, structural dividers, primary text)
- 10% Violet (KORA-specific output markers, data signals)
- 5% Fun Green (CLEAR, confirmation only)

**KORA Index treatment:**
Presented as a "rating record" — structured output document format. Score in a defined section. All 7 elements listed explicitly in a structured metadata block (not visual hierarchy, but explicit labeled fields). Feels like a certification document or a rating agency output.

**Sidebar / topbar:**
Sidebar: medium weight, slightly dark gray. Navigation is primarily document-based (table of contents). Topbar: minimal, period and company visible.

**Chart / card treatment:**
Tables are primary. Charts rare — only horizontal bars when visual comparison genuinely helps. Cards used only for summary blocks. Everything else is tabular, labeled, precise.

**Tone perceived:**
Institutional. Regulatory-grade. Serious. The platform feels like it belongs in a sustainability audit or a formal advisory review.

**Pro:**
- Maximum trust signal for ESG leads, financial directors, and board members
- Natural alignment with regulatory and compliance contexts
- High information density that analytical users appreciate
- Aging-proof — systematic, structured aesthetics do not become dated

**Con:**
- Can feel heavy, slow, and bureaucratic for frequent users
- Least visually distinctive — could resemble a corporate intranet or an ERP export
- Harder to communicate KORA's innovative intelligence through this aesthetic
- Less differentiated from traditional consulting portal aesthetics

**Risk:**
If executed without strong typographic quality, it looks like a government portal or a static report export. The visual excitement that would attract early adopters is largely absent.

**When to choose:**
When KORA is selling primarily to ESG / Sustainability leads, CFOs in regulated industries, or organizations where formal governance credibility is the primary adoption driver.

---

## R. Recommended Direction

### Recommendation: Direction 1 — Executive Editorial System

With one strategic integration from Direction 2: **a Cosmic Blue dark sidebar** that creates the content-area contrast that makes editorial light surfaces feel premium rather than plain.

### Why Direction 1

**It best represents KORA's identity as described in this document.**
KORA is not an analytics tool. It is not a command center. It is an intelligence infrastructure that transforms people spend into organizational decision intelligence. The editorial visual grammar — calm, type-led, white-space-aware — is the correct form for an intelligence system that serves decision-makers, not analysts.

**It is the most anti-dashboard.**
The fundamental brief is: KORA must not look like a dashboard. Direction 1 is the furthest from any existing SaaS dashboard aesthetic. It achieves this through editorial grammar, not through darkness or density.

**It is the most differentiated.**
No existing HR, ESG, welfare, or people analytics product has adopted an executive editorial aesthetic. Palantir is dark. Lattice is friendly SaaS. Workday is heavy enterprise. Leapsome is consumer-grade. The editorial direction has no comparable product in the space — it is distinctively KORA.

**It ages best.**
Editorial aesthetics do not age. The Economist has been using the same visual grammar for decades. Bloomberg's core information architecture is decades old. Direction 1, executed correctly, will look credible in 5 years without a redesign.

**It aligns with the Decision Pack PDF.**
The Decision Pack PDF is a premium document — editorial, white-surface-heavy, typography-led. When the platform and the PDF share the same visual grammar, the experience is coherent. Opening KORA and reading the Decision Pack feel like the same platform.

**It most respects the 40% Gray Base rule** from doc 30 — the constitutional color proportion that requires the majority of the surface to be the calm neutral ground.

**It passes the boardroom test reliably.**
An editorial interface projected in a board meeting looks intentional, credible, and institutional — not like a "data dashboard" or a "startup demo."

### Why not Direction 2

Direction 2 is the strongest alternative and should heavily inform the implementation of Direction 1. The strategic borrowings are:
- Cosmic Blue dark sidebar (Direction 2 contributes this)
- Precision interaction model: hover states, drill-down affordances, active state clarity
- The KORA Index command block composition (Direction 2's KORA Index treatment is close to correct)

But Direction 2 without extreme discipline drifts toward SaaS analytics. The Violet overuse risk is real. The sidebar/content contrast reads "admin panel" if not executed with restraint.

### Why not Direction 3

Direction 3 has the right trust signal for regulatory contexts but is not differentiated enough. It risks looking like a compliance tool or an ERP portal. It does not communicate KORA's intelligence positioning — only its governance credentials.

### The synthesis

**Direction 1 + Direction 2 sidebar + Direction 2 interaction model:**

| Element | Source |
|---|---|
| Primary surfaces | Direction 1: editorial, off-white, type-led |
| Editorial headers | Direction 1: full-bleed Cosmic Blue anchors for high-hierarchy moments |
| Sidebar | Direction 2: Cosmic Blue, compact, persistent dark navigation |
| KORA Index unit | Direction 1 framing (editorial brief format) + Direction 2 precision (7-element structured block) |
| Charts | Direction 1: minimal, horizontal bar only |
| Tables | Direction 1: preferred over charts where precision matters |
| Interaction model | Direction 2: deliberate drill-down, precise hover states, clear active states |
| Density | Direction 1 for executive views, Direction 2 for operator/analyst views |

### Implementation sequence

1. First: align all KORA-specific colors (replace generic slate/indigo → KORA palette)
2. Second: establish the editorial header pattern (dark Cosmic Blue anchor → white content)
3. Third: rebuild KORA Index unit to 7-element editorial brief format
4. Fourth: apply editorial section treatment to `/company`, `/company/kora-index`, `/company/reports`
5. Fifth: add the Human Impact Map (editorial pillar visualization)
6. Sixth: add Decision Pack CTA strip as strong editorial moment

---

*This document governs all Company Experience visual work. Refer to it before opening any component file. If an implementation decision is not addressed here, escalate to the founder before proceeding.*

*Constitutional authority: `docs/30-kora-brand-visual-product-experience-constitution.md` governs on brand identity. This document governs on Company Experience application. They do not conflict.*

---

**Document version:** v1.0
**Date:** 2026-05-31
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN · Gate 3 OPEN · Gate 5 OPEN
**Next step:** Await founder approval of recommended direction before beginning visual rebuild implementation
