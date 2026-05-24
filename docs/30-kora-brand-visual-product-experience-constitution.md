# KORA Brand, Visual & Product Experience Constitution

**Document:** `docs/30-kora-brand-visual-product-experience-constitution.md`
**Version:** v0.1
**Status:** Active — Constitutional. Governs all design, visual, UX, copy, and product experience decisions.
**Date:** 2026-05-24
**Derives from:**
- `docs/17-kora-language-visual-system.md` — primary visual and language constitution (819 lines, v0.1)
- `docs/16-kora-future-platform-ux-architecture.md` — experiential constitution (849 lines, v0.1)
- `docs/24-foundation-light-product-functional-spec.md` — product functional spec (v1.0)
- `docs/26-foundation-light-technical-build-handoff.md` — technical build handoff (v1.0)
- `docs/Documenti grafici KORA/` — 16 official logo/brandmark files + 7 brand guide screenshots

**Governs:**
Foundation Light demo · Core Screen Polish · Report Factory visual · PDF Export design · Landing page premium · Pitch deck visual direction · NEXT handoff · All future platform tiers

**This document is not:** a component library, a CSS implementation, a Tailwind config, or a Figma file.
Those artifacts must emerge from this document. This defines what KORA must feel like and why.

**Authority hierarchy:** When this document conflicts with the CLAUDE.md operating constitution, CLAUDE.md governs on methodology, product logic, and build gates. This document governs on brand, visual, language, tone, and product experience. They do not conflict by design.

---

## 1. Purpose and Authority

### 1.1 Why this document exists

KORA's visual and product experience is not a design preference. It is strategic infrastructure. Every time a CHRO opens the dashboard, an investor reviews the demo, an advisor evaluates a certified evidence package, or a worker consults their personal impact record, the product experience is doing strategic work. It either reinforces KORA's claim to institutional credibility — or it undermines it.

This document is the single authoritative reference for every design, visual, language, and UX decision made on the KORA platform. It does not exist alongside individual designers' judgment. It governs above it.

### 1.2 What requires reference to this document

Every work item that touches:
- Visual design (colors, typography, layout, spacing, component style)
- Brand usage (logo, brandmark, wordmark, color application)
- Copy and language (UI text, labels, status messages, report copy, onboarding)
- Product experience (view structure, role experience, information hierarchy)
- Data visualization (chart types, colors, confidence displays)
- Report and export design (Decision Pack, PDF direction, board exports)
- Landing page and pitch materials
- Any Figma file, mockup, or design token

…must be evaluated against this document before implementation.

### 1.3 What this document is not

This document does not define Tailwind configuration, CSS variables, React component implementation, or Figma token structures. Those are downstream implementations of this document. This defines the principles and requirements. Implementation documents derive from it.

### 1.4 Authority hierarchy of source documents

| Source | Authority scope |
|---|---|
| `docs/17-kora-language-visual-system.md` | Primary — visual identity, color, typography, brand DNA, anti-patterns, emotional experience |
| `docs/16-kora-future-platform-ux-architecture.md` | Primary — UX architecture, actor experiences, platform evolution, intelligence layer requirements |
| `docs/24-foundation-light-product-functional-spec.md` | Product specification — roles, screens, permission matrix, Italian-first language policy |
| `docs/26-foundation-light-technical-build-handoff.md` | Build implementation guidance — what is functional, mock, or future |
| `docs/Documenti grafici KORA/` | Visual asset evidence — official logo variants, brand swatches, form vocabulary, typography specimen |
| This document | Constitutional synthesis — the single operational reference for all design work |

---

## 2. KORA Brand Essence

### 2.1 What KORA is

KORA is **Human Impact Intelligence infrastructure**. Not a tool. An infrastructure.

The canonical product positioning statement, confirmed in the official typography specimen:
> *"Non un semplice tool. Un'infrastruttura."*

This claim is not marketing copy. It is a design instruction. Every visual decision must ask: does this feel like infrastructure, or does it feel like a tool?

**KORA measures organizations, not individuals.** The KORA Index is a company-level output. Individual intermediate data (PIB, IU, UEF) exists only to produce that aggregate — never to rate, rank, or surveil individual workers.

**KORA is the human layer.** It transforms heterogeneous organizational data — welfare events, training completions, volunteering, collective initiatives, ESG contributions, HR records — into structured, explainable, privacy-safe organizational activation intelligence. It makes the invisible visible. Before KORA, that intelligence did not exist in structured form. After KORA, it is navigable, verifiable, and actionable.

### 2.2 What KORA is not (constitutional)

These are not marketing disclaimers. They are design constraints.

| KORA is | KORA is not |
|---|---|
| Human Impact Intelligence Platform | A generic HR dashboard |
| Organizational activation intelligence | A welfare or benefits platform |
| Privacy-first governance layer | An employee wellbeing tracker |
| Methodology-versioned scoring | An ESG report generator |
| Multi-sided ecosystem intelligence | A benefits marketplace |
| Explainable, auditable intelligence | A black-box AI system |
| Pilot-grade diagnostic intelligence | An employee surveillance system |
| Governance-grade audit trail | A worker ranking or gamification platform |
| Decision support layer | A productivity monitoring system |
| Longitudinal intelligence infrastructure | A point-in-time reporting tool |

Any screen, component, service, or route that begins to look like welfare management, HR tracking, employee ranking, benefits booking, productivity surveillance, or a marketplace has drifted out of KORA's identity. It must be corrected before shipping.

### 2.3 Emotional qualities of the brand

These are design requirements, not aspirations.

**Calm.** The dominant experience of KORA is calm. Not boring — calm. Executives arrive carrying organizational pressure. The platform reduces cognitive load, not amplifies it.

**Intelligent.** Complexity is organized, navigable, and explained. The platform knows what the user needs to see first.

**Institutional.** Credentialed, policy-grade, durable. Not a startup product — a platform an organization commits to for years.

**Human.** The data has moral weight. It records real people making real choices. The interface must reflect that.

**Rigorous.** Every score is explainable. Every output carries its methodology version. Transparency is a feature, not a footnote.

**Premium.** Visual restraint is the luxury signal. Not decoration — confidence.

**Infrastructural.** The visual language communicates permanence, scale, and structural integrity. A 10-year commitment, not a Series A launch.

**Trustworthy.** Trust is built through visual language before a word is read. The platform must communicate: I am in control of this complexity. You can rely on what I tell you.

**Non-gamified.** No points, no streaks, no leaderboards, no variable reward mechanics. Measurement, not manipulation.

**Non-hype.** No breathless AI language, no speculative futures, no startup-energy copy. Calm authority.

### 2.4 Visual metaphors for the platform

These metaphors guide how KORA visualizes its intelligence. They are not literal decorative choices — they are conceptual anchors.

**Primary:** Signal — a single precise reading from a complex environment.
**Primary:** Layer — invisible until needed, then indispensable.
**Secondary:** Orbit — continuous, longitudinal, surrounding and containing.
**Secondary:** Ring — connection between boundaries, continuity, no beginning and no end.
**Secondary:** Field — distributed activation across organizational territory.
**Secondary:** Evidence trail — verified, sequential, auditable history.
**Secondary:** Map — structured representation of previously invisible landscape.
**Supporting:** Human activation — energy that was always there, now made measurable.
**Supporting:** Organizational intelligence — collective sense-making, not individual surveillance.

---

## 3. Product Experience Principles

These are the twelve foundational UX principles governing every interface decision on KORA. They are derived from `docs/16-kora-future-platform-ux-architecture.md §2` and `docs/17-kora-language-visual-system.md §2–3`.

| # | Principle | Operational meaning |
|---|---|---|
| UX-01 | **Intelligence before interface** | Every visual element must serve the intelligence it carries. Decorative elements, animation for its own sake, visual complexity without analytical content — all excluded. |
| UX-02 | **Evidence before narrative** | Every conclusion must be accompanied by its evidential basis. No score without a drill-down path. No insight without the data behind it. |
| UX-03 | **Explainability as architecture** | The primary explanation of any score is immediately visible — not behind a tooltip, not in a modal, not in documentation. The explanation IS the intelligence. |
| UX-04 | **Trust as permanent infrastructure** | Methodology version, Confidence Score, calibration status, and verification markers are permanent elements of the interface — not supplementary details. |
| UX-05 | **Layered complexity** | Every view defaults to its highest-value, lowest-complexity presentation. Depth is always available through deliberate navigation. Starting deep is never required. |
| UX-06 | **One primary signal per view** | Each view answers one primary question. Competing primary signals create analysis paralysis and signal product incoherence. |
| UX-07 | **Temporal visibility always** | KORA's value is longitudinal. Every intelligence surface that can show time must show time. Current state alone is always incomplete. |
| UX-08 | **Privacy by architecture, not policy** | Privacy boundaries are visible in the interface. Employer roles cannot access individual worker data architecturally. The boundary is never assumed — it is shown. |
| UX-09 | **Human dignity as design requirement** | The platform refers to people, not data points. Aggregation is presented respectfully. Anonymization is communicated as a feature, not a limitation. |
| UX-10 | **Actionable intelligence, not passive reporting** | Every intelligence module has a "what this means" layer and a "recommended direction" layer. Data that cannot be acted on has no primary display position. |
| UX-11 | **Minimal friction for executives** | The executive entry point delivers its highest-value intelligence within seconds. One primary indicator, one direction signal, one key insight, one priority implication. |
| UX-12 | **Cross-stakeholder coherence** | Company, worker, partner, advisor experiences share one intelligence truth. Visual language, interaction patterns, and trust infrastructure are recognizable across all actor views. |

---

## 4. Logo and Brandmark Usage

### 4.1 Asset inventory

The official KORA brand assets are located in `docs/Documenti grafici KORA/`:
- `01_Horizontal/01_DIGITAL/` — Horizontal logo (brandmark + wordmark) in 4 variants: DARK, CLEAR, BLACK, WHITE
- `02_Brandmark/01_DIGITAL/` — Brandmark alone in 4 variants: DARK, CLEAR, BLACK, WHITE

**Horizontal logo:** Brandmark ring + lowercase "kora™" wordmark. Confirmed in SVG source files — Violet brandmark ring + Cosmic Blue "kora™" text in the DARK variant (dark-colored elements, for use on light backgrounds); white brandmark + white "kora™" in the CLEAR variant (clear/light elements, for use on dark backgrounds). The variant name refers to the color of the logo elements, not the background color.

**Brandmark alone:** The organic ring form without the wordmark. Used at small sizes, as app icon/favicon, and as a standalone signal element.

### 4.2 Logo variants and when to use each

| Variant | When to use |
|---|---|
| **DARK** (Violet brandmark + Cosmic Blue text) | Light backgrounds — app shell header (desktop), report documents, landing page on white, PDF body |
| **CLEAR** (white brandmark + white text) | Dark backgrounds — PDF cover hero, landing hero (dark), investor deck dark slides, dark card contexts |
| **BLACK** (black brandmark + black text) | Print, monochrome contexts, grayscale documents |
| **WHITE** (white brandmark + white text) | Dark backgrounds where full-white is the only option (e.g., dark print) |

### 4.3 Logo usage by platform surface

| Surface | Logo usage | Variant |
|---|---|---|
| App shell sidebar header | Horizontal logo, small-to-medium | DARK on light sidebar |
| App shell top bar (if used) | Horizontal logo or brandmark alone | DARK |
| Browser favicon | Brandmark in Violet on light square | DARK brandmark |
| Report cover (PDF) | Horizontal logo, prominent | CLEAR on dark hero section |
| Decision Pack export header | Horizontal logo | DARK on white document |
| Shared View (company viewer) | Horizontal logo | DARK |
| Landing page hero | Horizontal logo, large | CLEAR on dark/cosmic hero |
| Investor pitch | Horizontal logo | Appropriate to slide background |
| Email notifications | Horizontal logo | DARK on white |
| Loading / splash screen | Brandmark alone, animated ring | DARK or CLEAR |

### 4.4 Logo safe area

The safe area rule is confirmed in the official brand guide (screenshot `09.33.44.png`):

*"Lo spazio minimo da rispettare tra il logo ed eventuali altri elementi (testi, foto, illustrazioni) è definito dal modulo base X, come riportato in figura. Questo spazio è da considerarsi minimo: pertanto, quando è possibile, deve essere aumentato."*

**Rule:** The minimum clear space on all sides of the horizontal logo equals one brandmark-ring height (the X module). When possible, increase beyond the minimum. The X module is the fundamental spacing unit of the KORA visual system — see Section 9.

> ⚠️ **OFFICIAL VALUE REQUIRED FROM NEXT/DESIGNER:** Exact pixel measurement of the X module at standard logo display size.

### 4.5 Minimum size

> ⚠️ **OFFICIAL VALUE REQUIRED FROM NEXT/DESIGNER:** Minimum display size for horizontal logo (below which wordmark becomes illegible) and minimum display size for brandmark alone (below which five-node interior becomes indistinct).

### 4.6 Forbidden logo usage

The following are absolutely prohibited:

- **Do not stretch or compress.** The aspect ratio is fixed. Never deform the brandmark or wordmark.
- **Do not recolor arbitrarily.** Use only the four approved variants. Never apply brand, pillar, or alert colors to the logo.
- **Do not use the brandmark as decorative wallpaper.** A large, tiled, or faded brandmark as a page background is prohibited.
- **Do not overuse the logo within the app UI.** The logo appears in the app shell header once. It does not repeat on every card, section heading, or component.
- **Do not modify the letterforms.** "kora" is lowercase. The wordmark typeface is fixed. Never substitute another typeface for the wordmark.
- **Do not add drop shadows, glows, or effects** to the logo or brandmark.
- **Do not crop the brandmark** to show only part of the ring.
- **Do not combine the KORA logo with other logos** at the same visual weight (co-branding must follow a separate protocol).
- **Do not use the brandmark as a bullet point or decorative icon** in body copy.
- **Do not place the logo on busy, photographic backgrounds** that reduce legibility.

---

## 5. Color System

### 5.1 The four-color palette

This is the official palette, confirmed visually in brand guide screenshot `09.33.03.png`. The color proportions are architectural — they govern the visual weight of the entire platform.

| Color | Role | Proportion | Visual character | Semantic meaning |
|---|---|---|---|---|
| **Gray Base** | Surface / neutral ground | 40% | Very light cool gray, near-white, slightly blue-tinted | Resting state — calm, open, available, receptive |
| **Cosmic Blue** | Structure / depth / authority | 30% | Deep dark navy, approaching near-black | Institution — structure, text, depth, authority |
| **Violet** | Signal / intelligence / interaction | 20% | Medium-bright periwinkle blue-violet | KORA intelligence — active state, CTA, signal |
| **Fun Green** | Activation / energy / confirmation | 10% | Bright chartreuse-lime | Validated achievement — activation confirmed, threshold crossed |

**The 40% Gray Base rule:** When in doubt, use more Gray Base and less of everything else. The majority of every surface should be the calm neutral ground. Signal colors earn their presence.

> ⚠️ **OFFICIAL HEX VALUES REQUIRED FROM NEXT/DESIGNER** for all four colors. Provisional estimates below are derived from the brand guide screenshots for implementation guidance only — they must be replaced with official values before the token system is locked.

| Color | Provisional estimate (non-binding) | Status |
|---|---|---|
| Gray Base | ~`#F3F4F9` (very light cool gray) | PROVISIONAL — confirm with NEXT |
| Cosmic Blue | ~`#0D1033` (deep dark navy) | PROVISIONAL — confirm with NEXT |
| Violet | ~`#6C63F6` (periwinkle blue-violet) | PROVISIONAL — confirm with NEXT |
| Fun Green | ~`#C8FF47` (bright chartreuse) | PROVISIONAL — confirm with NEXT |

### 5.2 Semantic color rules (non-negotiable)

These semantic assignments are fixed. Any implementation that reassigns them is in violation of the color constitution.

- **Violet** = KORA intelligence signal, active state, primary interaction, links, selected states, score highlights, CTA buttons
- **Fun Green** = Validated achievement, activation confirmation, positive threshold crossed, pilot milestones. Used with discipline — surprise value must be preserved
- **Cosmic Blue** = Structural elements, primary text, deep container backgrounds, section headers, institutional voice
- **Gray Base** = Neutral surface, inactive elements, content ground, breathing space

### 5.3 Alert and system state colors

These are a separate semantic layer for system states. They must not conflict with the four brand colors.

| State | Color direction | Rationale |
|---|---|---|
| Information | Violet family (tint) | Consistent with KORA intelligence signal |
| Warning | Muted amber (restrained) | Present but not alarming. Never panic-orange |
| Error / Risk | Deep muted red (serious, non-aggressive) | Serious without being alarming |
| Success / Confirmed | Fun Green (discipline use) | Activation confirmed |
| Inactive / Disabled | Gray Base variants | Not competing for attention |

> ⚠️ **OFFICIAL HEX VALUES REQUIRED FROM NEXT/DESIGNER** for amber warning, muted red error, and their dark/light variants.

### 5.4 Confidence visualization language

Confidence is a first-class visual output in KORA. The Confidence Score must never be hidden. The visual language for confidence is a saturation/intensity gradient within the Violet family:

| Confidence level | Visual treatment | CSS approach |
|---|---|---|
| LOW | Light Violet tint | Low opacity or highly desaturated Violet |
| MEDIUM | Mid-Violet | Standard opacity, reduced saturation |
| HIGH | Full Violet | Full saturation, full opacity |
| VERIFIED | Full Violet + Fun Green accent mark | Small Fun Green indicator alongside full Violet |

This gradient communicates confidence as a journey toward certainty, not as a binary pass/fail.

### 5.5 Color must reduce anxiety

The dominant emotional effect of KORA's color system is: **calm**. Not boring — calm. The color system's primary job is to signal that the platform is organized, structured, and reliable. Overuse of signal colors destroys this.

**Rule:** Alert colors appear only when the system has something genuinely alert-worthy to communicate. Violet appears on elements that are genuinely primary interactions. Fun Green appears only when something worth marking has occurred. Never use color as decoration.

---

## 6. Pillar Color System

### 6.1 Canonical pillar color direction

Each pillar requires a distinct visual identity that remains within the cool blue-violet color family defined by the brand palette. Warm colors (red, orange, gold) must not be assigned to pillars — they carry urgency and alarm associations incompatible with calm organizational intelligence.

| Pillar | Canonical direction | Emotional archetype | Forbidden directions |
|---|---|---|---|
| **LIFE** | Cool blue-teal tint within Violet family | Warmth, continuity, groundedness | Green (currently wrong), red, orange |
| **GROWTH** | Slightly warmer tint within Violet family | Upward movement, potential, expansion | Dark navy alone, yellow |
| **CONNECTION** | Softer purple-tinted variant, relational | Relational warmth, network density | Cold teal, orange |
| **IMPACT** | **Fun Green** activation signal — use with discipline | Purposeful extension beyond self | Orange (currently wrong), red |
| **LEGACY** | Deep desaturated Violet-to-Cosmic-Blue transition | Depth, permanence, accumulated wisdom | Amber (currently wrong), bright energetic colors |

> ⚠️ **OFFICIAL PILLAR HEX VALUES REQUIRED FROM NEXT/DESIGNER.** Exact HEX values must be confirmed from the Figma design system or official brand guidelines before implementing the pillar token system.

### 6.2 Current implementation conflicts

The following hardcoded colors in `components/charts/PillarChart.tsx` are **in violation of the canonical pillar system** and must be replaced when the Premium Design System Overhaul is executed:

| Pillar | Current (wrong) | Canonical direction | Violation type |
|---|---|---|---|
| LIFE | `#22c55e` (green) | Cool blue-teal / Violet family | Major — green is reserved for IMPACT/activation |
| GROWTH | `#3b82f6` (blue) | Warmer Violet tint | Minor — generic blue, not the warm Violet tint |
| CONNECTION | `#a855f7` (purple) | Softer purple-violet, relational | Closest to correct — but should be confirmed |
| IMPACT | `#f97316` (orange) | Fun Green | Major — orange is outside the brand palette |
| LEGACY | `#f59e0b` (amber) | Deep desaturated Violet-Cosmic Blue | Major — amber is outside the brand palette |

The macroblock colors in `components/kora-index/MacroblockCard.tsx` also require audit: teal (EQUITY) and amber (BTI) are outside the brand palette and must be aligned to the KORA color system when tokens are defined.

### 6.3 Pillar color as a family

The five pillar colors must feel like five members of the same intelligent system. They are not five unrelated hues — they are five facets of a single Violet-family identity. When shown together, they should feel coherent and calm, not like a rainbow or a generic chart palette.

---

## 7. Typography System

### 7.1 The three-register system

KORA uses three distinct typographic registers, confirmed in the official typography specimen (`09.33.36.png`).

**Register 1 — Wordmark / Brand Voice**
- Geometric rounded sans-serif — the specific font used in the "kora™" wordmark
- Used: logo/wordmark only
- Never used as a UI typeface in the app
- Characteristics: all lowercase, open apertures, circular bowls, consistent stroke weight, soft terminal rounding
- Signal: approachable, modern, humanist, accessibility-first

**Register 2 — Editorial / Institutional Headline**
- High-contrast serif italic — confirmed in the typography specimen: *"Un'infrastruttura."* appears in serif italic
- Used: primary conceptual claims, report cover headlines, landing hero, major narrative moments, key Decision Pack section introductions
- Used sparingly — never in dashboard tables, data labels, or operational interface
- Characteristics: editorial, literary, institutional authority
- Signal: intelligence that has considered its communication deeply
- Appears at: H1 level only for key concept elevation

**Register 3 — Interface / Data Voice**
- Clean geometric sans-serif
- Used: all operational interface — labels, values, metadata, body text, data tables, filters, navigation, dashboard components, cards, status indicators
- Highly legible at small sizes
- Variants: Regular (body, labels), Medium (sub-headings, card titles), Bold/Semibold (KPIs, primary values)
- Never decorative

> ⚠️ **OFFICIAL FONT NAMES AND LICENSES REQUIRED FROM NEXT/DESIGNER.** Current implementation uses Geist Sans and Geist Mono as placeholder fonts. Geist is acceptable as a temporary interface placeholder for Register 3 only, but must be replaced when official fonts are confirmed.

### 7.2 Typography hierarchy — four levels

| Level | Role | Register | Size guidance |
|---|---|---|---|
| **H1 — Structural claim** | Primary section statement, report titles, landing hero | Register 2 (serif italic for concept elevation) or Register 3 Bold for operational pages | Large, breathing line-height 1.2–1.3 |
| **H2/H3 — Section header** | Dashboard section titles, card headings | Register 3, Medium or Semibold | Medium, line-height 1.3–1.4 |
| **Body — Contextual intelligence** | Explanations, descriptions, recommendation text | Register 3, Regular | 15–17px equivalent minimum, line-height 1.5–1.6 |
| **Detail — Supporting metadata** | Confidence scores, methodology version, source labels, footnotes, calibration status | Register 3, Regular or Light | Small, visible but not competing |
| **Data values — Numerical intelligence** | KPI numbers, KORA Index, component scores | Register 3, Medium to Bold with tabular figures variant | Large for primary KPIs, consistent decimal alignment |

### 7.3 Executive readability standards

These are hard requirements, not guidelines:

- Minimum body text size: 15–17px equivalent (never smaller)
- Maximum line length for body copy: 70–75 characters
- Line height: 1.5–1.6 for body, 1.2–1.3 for headlines
- Letter spacing: slightly open for headlines, normal for body
- Alignment: **ragged right only** — never justified text
- KPI numbers: consistent decimal precision within any view, vertical alignment in tables
- Contrast ratio: body text must meet WCAG AA minimum (4.5:1) — see Section 21

### 7.4 Typography rules — absolute prohibitions

- **Never** use gradient or color-fill text effects
- **Never** use all-caps except for controlled technical abbreviations: KORA Index, PIB, IU, UEF, AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS
- **Never** use decorative display fonts in operational interfaces
- **Never** drop below the minimum legibility size for data labels
- **Never** mix number and text alignment within data tables
- **Never** use typefaces associated with gaming, crypto, or entertainment categories
- **Never** use the serif italic Register 2 for body text, labels, or operational interface elements — it is reserved for conceptual elevation moments

---

## 8. Voice and Tone System

### 8.1 The KORA voice

KORA speaks as a trusted institutional advisor. Precise, calm, evidence-based, decision-oriented. It does not motivate, celebrate, warn, or entertain. It informs and enables.

**KORA sounds like:**
- Precise and specific — never vague or approximative
- Calm — never urgent unless urgency is genuinely warranted by data
- Institutional — not cold or bureaucratic, but authoritative
- Explanatory without being verbose — one sentence of context, not three paragraphs
- Privacy-conscious — actively reassuring about data protection
- Decision-oriented — every output points toward an action or decision
- Evidence-based — claims are grounded, scores are explained
- Non-judgmental — "the CONNECTION pillar is below threshold" not "your CONNECTION performance is poor"
- Non-paternalistic — the platform trusts the user to handle the truth

**KORA does not sound like:**
- HR motivational copy ("Celebrate your team's amazing journey!")
- Welfare marketplace ("Explore thousands of benefits for your people!")
- ESG marketing ("Together we can build a better world!")
- Startup hype ("Supercharge your human capital with AI!")
- AI chatbot ("Great question! Based on your data, here's what I found...")
- Surveillance software ("Monitoring complete. 47 workers tracked.")
- Gamified productivity ("You're 80% toward your activation goal! Keep going!")
- Therapy/wellbeing app ("How are your people feeling today?")

### 8.2 Italian-first language policy

All UI text, warnings, recommendations, next best actions, report text, privacy explanations, demo copy, onboarding, microcopy, and evidence descriptions **must be in Italian**.

The following proprietary names remain in English in all contexts:
KORA Index, KORA Contribution, My KORA, Dynamic Impact CV, Activation Safeguard, Confidence Score, UEF, Impact Units, Activation Debt, Evidence Debt, Trust Ledger, Board Pack, KORA Activation Network, KORA Evolution, Public KORA Snapshot.

When a proprietary English term is introduced for the first time on any screen, it must be accompanied by an Italian explanation or subtitle.

### 8.3 Voice by platform surface

**KORA Admin — Mission Control voice:**
- Operational, concise, action-oriented
- Readiness/risk language: "3 aziende in attesa di review", "Pipeline: 2 scoring in coda"
- Never anthropomorphic, never celebratory
- Status language: ready, pending, blocked, flagged — not good/bad

**Company Admin — Executive Cockpit voice:**
- Executive, clear, decision-oriented
- No methodology overload in primary view
- Leads with the signal: "KORA Index: 62.8 | Confidence: 72%"
- Context follows the signal: "Crescita rispetto all'H1: +5.4 punti"
- Recommendations are framed as options: "Considerare riallocazione budget verso pillar Growth"

**Company Viewer / Board — Shared View voice:**
- Board-readable, safe for external sharing
- No operational backstage language
- Clean declarative statements: "L'organizzazione presenta un KORA Index di 62.8..."
- No pending action language — viewer-only, no operational context

**Worker / My KORA voice:**
- Private, empowering, non-patronizing
- Ownership and consent focused: "Il tuo record di impatto personale"
- Non-evaluative: not "your score is X" — "le tue azioni verificate nel periodo: N"
- Invitational, never pressuring: "Puoi scegliere cosa condividere"

**Partner workspace voice:**
- Operational, evidence-oriented
- Activation language: requests, confirmations, service status
- Quality indicators without judgment

**Advisor workspace voice:**
- Rigorous, review/validation language
- Professional responsibility register: "Revisione in corso", "Validazione richiesta"
- Audit trail language: every action is logged

**Decision Pack voice:**
- Board-report tone
- Clear recommendations with cautious claims
- Calibration boundary always present: "Dati sintetici demo — non rappresentano la situazione reale dell'azienda."
- No certification overclaim: never "KORA certifica che..." — always "KORA misura e documenta..."

### 8.4 Canonical copywriting principles

1. **Lead with the signal.** The most important number or status comes first. Context and explanation follow.
2. **Explain every score.** Never show a number without at least a one-line explanation of what it means.
3. **Never omit the confidence qualifier.** "KORA Index: 62.8" must always be accompanied by "Confidence Score: 72%".
4. **Calibration status is non-suppressible.** "KORA Methodology v0.1 — pre-calibrazione empirica" must appear wherever a KORA Index is displayed.
5. **Privacy explanations are reassuring, not defensive.** "Visualizzi solo dati aggregati anonimi — la protezione dei singoli lavoratori è garantita per struttura." Not a warning — a feature.
6. **Recommendations use conditional language.** "Sulla base dei dati disponibili, potrebbe essere utile..." — not "You must..." or "KORA recommends that you...".
7. **Methodology disclaimers use standard canonical copy.** CSR/ESG outputs always include: *"KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio."*
8. **Correlation statements always include the canonical caveat.** HR KPI comparisons always include: *"correlazione ≠ causalità"*.

---

## 9. Layout and Composition System

### 9.1 The X module — canonical spacing unit

The X module is the fundamental spacing unit of the KORA visual system. It derives from the brandmark geometry: the minimum safe area around the logo equals one brandmark-ring height (confirmed in the Logo Safe Area brand guide).

This modular logic extends throughout the interface:
- Base spacing unit: X (the brandmark height at standard display size)
- All spacing values are multiples of X: X/2, X, 2X, 4X, 8X
- Section separation: 4X minimum
- Card internal padding: 2X
- Component gap: X

> ⚠️ **OFFICIAL X VALUE REQUIRED FROM NEXT/DESIGNER.** In current implementation, use Tailwind's default 4px base unit (spacing-4 = 16px as practical equivalent until X is confirmed).

### 9.2 Page rhythm — canonical structure

Every KORA page follows a structured vertical rhythm. Not all sections are present on every page — the rhythm defines the order when sections do appear.

```
1. IDENTITY LAYER        ← Logo, page title, breadcrumb, role indicator
2. TRUST / STATUS STRIP  ← Calibration status, methodology version, demo banner if applicable
3. PRIMARY SIGNAL        ← The one most important intelligence output for this view
4. SUPPORTING CONTEXT    ← Secondary intelligence, pillar breakdown, period comparison
5. DRILL-DOWN / DETAIL   ← Component analysis, evidence, source data
6. ACTIONS               ← Primary action (one), secondary actions (accessible but not competing)
7. METHODOLOGY FOOTER    ← Limitations, calibration status, version, disclaimer
```

The methodology footer is **mandatory** on every view that shows a KORA Index or computed score. It is never omitted.

### 9.3 Information hierarchy rules

- **One primary signal per view.** Never give two elements equal top-level visual weight.
- **Hierarchy drives size, weight, and position** — not decoration.
- **The KORA Index is always visually dominant** on any view where it appears.
- **Confidence Score is always adjacent to the KORA Index** — never below the fold, never in a modal.
- **Recommendations come after intelligence** — never lead with advice before showing the evidence.
- **Methodology information is accessible but not prominent** — visible, not intrusive.

### 9.4 Visual density rules — what to avoid

- **No first screen full of small cards.** The primary view must have breathing space, not a card grid.
- **No navigation grids as primary content.** A grid of feature-access tiles as the landing view communicates administration, not intelligence.
- **No raw tables as first impression.** Tables are detail layer — never lead with a table.
- **No repeated equal-priority CTA buttons.** Each view has one primary action.
- **No wall of methodology text above the fold.** Methodology information belongs in the footer, in expandable sections, and in detail layers — not as the introduction.
- **No competing chart elements at equal visual weight.** One primary visualization per section.
- **No more than three levels of visual hierarchy on a single screen.** If a fourth level is needed, a new page or drill-down modal is the right pattern.

### 9.5 Visual breathing space

The dominant visual experience of KORA is space. Not empty space — intentional space. The Gray Base (40%) rule applies to every surface: the majority of each view should be calm neutral ground.

The KORA Index should sit in visual breathing space that communicates its singular importance. Dashboard layouts should have a center of calm from which intelligence radiates. Reports should not fill every margin.

---

## 10. Card / Surface / Container System

### 10.1 The squircle vocabulary

The canonical container form for KORA is the **squircle** — a rectangle with heavily rounded corners approaching but never reaching a circle. This is confirmed in the official "Forme" brand guide (screenshot `09.33.51.png`).

The squircle communicates: structured and alive. Not mechanically perfect. Not chaotic.

**Border radius guide:**
- Large containers (feature sections, report chapters): large radius (≥16px, approaching squircle)
- Cards and panels: medium-large radius (12–16px)
- Sub-components, tags, status badges: small-medium radius (6–8px)
- Input fields, search: medium radius (8–10px)
- Buttons: pill form (full radius) for primary CTA; medium radius for secondary

> ⚠️ **OFFICIAL RADIUS VALUES REQUIRED FROM NEXT/DESIGNER** — especially the large container squircle value.

### 10.2 Surface hierarchy

| Surface type | Background | Border | Shadow | Use |
|---|---|---|---|---|
| **Page ground** | Gray Base | None | None | The base surface of every view |
| **Standard card** | White | Subtle border (Gray Base +10%) | Very light soft shadow | Metric cards, info cards, standard panels |
| **Elevated card** | White | Minimal | Slightly stronger soft shadow | Featured metric, primary intelligence card |
| **Deep container / Inverse** | Cosmic Blue | None | None | Report hero, Decision Pack cover section, landing hero |
| **Status card / Warning** | Tinted (amber or muted red at very low opacity) | Colored border | None | System alerts, blocking conditions |
| **Privacy boundary card** | Gray Base | Subtle | None | Suppression overlays, access-denied states |
| **Future Vision card** | Gray Base, slightly desaturated | Dashed border | None | Mockup screens labeled "Future Vision" |

### 10.3 Shadow philosophy

KORA uses **soft, diffuse, low-elevation shadows** — not the aggressive shadows of flat-to-depth transitions common in generic SaaS. The shadow communicates: this element is slightly above the surface, not floating above it.

- Shadow color: Cosmic Blue at 5–8% opacity (never black)
- Shadow spread: wide and diffuse (not tight and hard)
- Never use: drop shadows on text, glowing shadows, colored shadows as decoration
- Never create **glassmorphism** — blurred translucent panels with colored glow are prohibited

### 10.4 Image containers

When photography or illustrations appear in cards (confirmed in the Layout card screenshot `09.34.01.png`), they use the **squircle crop** — the same border-radius logic as the container, applied to the image. Images never have harsh rectangular crops.

The globe wireframe form (also confirmed in brand guide screenshots) is an acceptable illustrative element in cards when representing KORA's ecosystem intelligence or platform metaphor — used sparingly, not as decoration.

---

## 11. Data Visualization System

### 11.1 KORA Index visualization

The KORA Index is the primary intelligence signal of the platform. Its visualization must communicate:
- A single value (0–100 scale)
- Direction of change (trend from previous period)
- Confidence qualification (CS always adjacent)
- Calibration status (always visible)

**Canonical form:** Ring chart / radial display — the ring form echoes the brandmark and reinforces the methodological connection. The KORA Index value is the arc completion of a ring. Five pillar arcs can nest within or alongside this primary ring.

**What the KORA Index visualization must always show:**
1. KORA Index value (prominent)
2. Confidence Score (immediately adjacent, same card)
3. `methodology_version_id` (detail level)
4. `calibration_status: "pre_empirical_calibration"` (non-suppressible)
5. Activation Safeguard status (CLEAR / WARNING / FLAGGED)
6. All 10 KORA Index components with values and weights

### 11.2 Macroblock visualization

The four KORA Index macroblocks (REACH 25%, QUALITY 30%, EQUITY 25%, BTI 20%) are visualized as structured cards with:
- Macroblock title and weight
- Component breakdown (within the macroblock)
- Score bar
- Period comparison delta

Macroblock colors must align with the KORA color system. The current amber (BTI) and teal (EQUITY) in `MacroblockCard.tsx` are provisional and must be replaced with brand-aligned tokens.

### 11.3 Pillar visualization

Each of the five pillars requires a visualization appropriate to its emotional archetype (see Section 6):
- **Not pie charts** — five-part pie charts are confusing for balanced distributions
- **Preferred:** Radar/spider chart (five-axis radial), segmented ring, or horizontal bar distribution
- Each pillar uses its canonical color (see Section 6)
- Always labeled in plain language — never pillar code alone (LIFE not just "LF")
- Pillar balance is shown as a family — the five pillars are visualized together to communicate organizational balance

### 11.4 Confidence visualization rules

- Full saturation = high confidence (verified data)
- Progressively lighter/more desaturated = lower confidence
- Confidence bands around trend lines: wider = lower confidence
- Confidence score badge always accompanies the KORA Index — same card, same visual level
- Never hide uncertainty. Communicate it clearly but calmly.

### 11.5 Activation Safeguard visualization

The Activation Safeguard (CLEAR / WARNING / FLAGGED) is a **gate indicator**, not a trend chart. It uses:
- CLEAR: Green (Fun Green) indicator — this is a canonical use of Fun Green for activation confirmation
- WARNING: Muted amber indicator
- FLAGGED: Muted red indicator
- The status is labeled in plain language: "Activation Safeguard: CLEAR" with the Italian explanation
- Always shown alongside the KORA Index

### 11.6 Data readiness visualization

Data readiness (HIGH / MEDIUM / LOW) is shown as a visual strip or matrix:
- Horizontal strips by data source or dimension
- Color coding matches status — green/amber/red-muted
- Readable without a legend

### 11.7 Temporal / versioning visualization

All trend visualizations must:
- Show at least two comparable periods
- Mark methodology version changes on the timeline axis
- Display baseline clearly
- Allow the user to distinguish "score improved" from "formula changed"
- Trend lines use smooth curves, not jagged point-to-point connections

### 11.8 Absolutely prohibited chart patterns

| Pattern | Why prohibited |
|---|---|
| Generic pie charts for pillar balance | Cannot communicate five-way balance with clarity |
| Leaderboard / ranking tables (workers) | Violates privacy architecture and anti-gamification |
| Individual worker heatmaps | Individual data is forbidden in employer contexts |
| Progress-bar-to-target with gamification language | Manipulative, inconsistent with dignity principle |
| Trading terminal density (20+ simultaneous metrics) | Overload, contradicts intelligence hierarchy |
| Animated/looping background visualizations | Distract from data |
| Funnel charts | Generic SaaS pattern, not KORA intelligence vocabulary |

---

## 12. Iconography and Symbolic Language

### 12.1 Icon vocabulary

All icons in the KORA platform must derive from the brandmark vocabulary:
- Rounded forms, never sharp corners
- Organic curves, consistent stroke weight
- Soft terminal rounding — never mechanical sharp endpoints
- Forms should feel like simplified extracts from the brandmark geometry

> ⚠️ **OFFICIAL ICON SET REQUIRED FROM NEXT/DESIGNER.** The Lucide React icon library currently in use is a functional placeholder. A KORA-specific icon set or a curated Lucide subset must be confirmed.

### 12.2 Symbolic language from the brandmark

The three canonical forms confirmed in the "Forme" brand guide (`09.33.51.png`) are:

**Squircle:** Structure, containment, institutional integrity. Use for containers, cards, UI elements.

**Globe wireframe:** Ecosystem, interconnection, organizational intelligence at scale. Use for ecosystem/network concept moments (not as decoration).

**Organic blob:** Human dimension, living organization, activation energy. Use rarely — reserved for hero/metaphor moments.

### 12.3 The five-node pillar symbolism

The five indentations in the brandmark's inner geometry map to the five pillars. This connection is canonical and should guide:
- Pillar section icons (five distinct but family-consistent forms)
- Navigation indicators for pillar views
- Dashboard pillar segment icons

Each pillar has its own symbolic geometry derived from the brandmark (see doc 17 §8 for detail):
- LIFE: soft open circular form — stable, breathing
- GROWTH: ascending arc form — upward, open-topped
- CONNECTION: two arcs meeting — bilateral, relational
- IMPACT: radiating form — outward, expanding
- LEGACY: layered form — depth, accumulated rings

### 12.4 What iconography must never use

- Leaf, tree, or nature iconography (ESG marketing anti-pattern)
- Trophy, medal, star, badge iconography (gamification anti-pattern)
- Lock/unlock iconography for privacy (clinical, surveillance feel — use privacy-specific neutral language instead)
- Arrow-up/down for score changes (use directional indicators with color, not generic arrow icons)
- Person/people silhouettes for worker counts (dehumanizing at aggregate scale)
- Generic dashboard icons (chart-bar, pie-chart as decorative) — icons should be specific to their meaning

---

## 13. Dashboard and Cockpit Rules

### 13.1 The executive entry point

Every dashboard designed for Company Admin, Company HR/People, and Company Finance must answer the executive's primary question within the first view, without scrolling:

> *"What is our current KORA Index? How does it compare to last period? What is driving the movement? What requires my attention?"*

The primary view must contain: KORA Index value, Confidence Score, Activation Safeguard status, period comparison, and one priority implication. Everything else is one layer deeper.

### 13.2 Trust indicators as permanent elements

The following elements are **architecturally permanent** — they appear on every view that shows a KORA Index or computed score. They are never "below the fold" on primary intelligence views:

1. KORA Index value
2. Confidence Score (CS) — always beside KORA Index, never omitted
3. Activation Safeguard status (CLEAR / WARNING / FLAGGED)
4. `methodology_version_id` ("KORA Methodology v0.1")
5. `calibration_status` ("pre-calibrazione empirica") — non-suppressible
6. 10-component breakdown (all 10 components with values and weights)

### 13.3 One primary action per dashboard view

Each dashboard view has exactly one primary action. Primary action button is Violet, pill-shaped, prominent. Secondary actions are accessible but not visually competing. Tertiary actions (export, share, settings) are in menu or overflow.

**Never show simultaneously at equal visual weight:** explore + export + share + alert-dismiss + filter + edit + compare + annotate + navigate. These actions exist — they are organized into a clear hierarchy.

### 13.4 Admin Command-Center rules (KORA Admin)

The KORA Admin experience is **Mission Control** — a portfolio intelligence and risk/readiness operations center.

Visual characteristics:
- Denser than company-facing views — admin users are operators, not executives-in-a-meeting
- Status orientation: every company shows its readiness state at a glance
- Risk language: blocked, pending, ready, flagged — clear operational states
- No decorative elements — pure operational clarity
- Queue orientation: action queues are primary intelligence, not secondary menus

Admin must never feel like: a consumer dashboard, a customer management CRM, or an individual worker surveillance interface. It is a **portfolio intelligence command center**.

---

## 14. Report / Decision Pack Visual Rules

### 14.1 Decision Pack as executive report console

The Decision Pack is not a dashboard printout. It is a versioned executive report — the visual expression of KORA's intelligence formalized for board-level consumption.

The visual register shifts for Decision Pack surfaces:
- Register 2 (serif italic) is appropriate for Decision Pack section headlines and cover statements
- Generous margins — board documents breathe
- Section chapter structure is visible and navigable
- Version identity is prominent: period, version_id, generated date, methodology version
- Calibration and limitations footer is mandatory on every section

### 14.2 Semester comparison visual rules

When a Decision Pack shows semester-over-semester comparison:
- Current period and previous period are visually parallel
- Delta is shown with directional color (Fun Green for improvement, muted amber/red for decline) using the canonical canonical comparative disclaimer: *"Variazione rispetto al semestre precedente. Il confronto misura evoluzione direzionale, non causalità statistica."*
- Methodology comparability gate is shown: if versions differ, comparison is labeled "non comparabile"
- The comparison never implies statistical causality

### 14.3 Decision Pack sections — visual hierarchy

Required sections in this visual order:
1. **Cover** — Inverse/dark hero (Cosmic Blue), horizontal logo CLEAR variant, company name, period, version
2. **Calibration and limitations** — always on page 2 or as persistent banner, non-suppressible
3. **Executive summary** — Register 2 headline + body summary
4. **KORA Index v3** — Full ring visualization, all 10 components, Confidence Score, Safeguard status
5. **Macroblock analysis** — Four macroblocks, weights, components
6. **Pillar analysis** — Five pillars, balance visualization
7. **Comparison section** (if available) — Semester-over-semester delta table
8. **Recommendations** — Framed as options, not prescriptions, with evidence anchors
9. **90-day action plan** — Structured, named actions with pillar tagging
10. **Methodology boundaries** — Full disclaimer, formula reference, calibration status

### 14.4 PDF future direction

When PDF export is implemented (future build, blocked until confirmed), the visual target is:
- **Board document, not dashboard printout.** A KORA Decision Pack PDF should feel like it was prepared by a senior analyst at an institutional advisory firm.
- Institutional typography (Register 2 for major section titles, Register 3 for all body/data)
- KORA color palette, not generic report gray
- Generous white space, not compressed data density
- Company logo alongside KORA logo on cover (co-branding rules TBD)
- Horizontal logo CLEAR variant on dark cover section
- Print-safe colors (confirm Cosmic Blue and Violet CMYK values with NEXT/designer)

> ⚠️ PDF is currently excluded from Foundation Light build scope. This section governs the design brief when PDF is implemented.

---

## 15. Worker Privacy Experience Rules

### 15.1 Privacy as a visible product feature

The worker experience must make the privacy boundary **explicitly visible** — not buried in a policy statement. Workers must be able to see:
- What data is visible to their employer (always: aggregated, anonymized, above N≥10 threshold)
- What data is private to them (PIB, timeline, bookings, Dynamic CV)
- That no individual is identifiable in employer views

The privacy communication tone: **reassuring and empowering**, not defensive or legal-register.

Canonical copy: *"Il tuo KORA personale è privato. Il tuo datore di lavoro vede solo dati aggregati anonimi. Nessuna informazione individuale è mai identificabile."*

### 15.2 My KORA — personal impact space

The My KORA experience is the worker's personal record of verified human impact. It must feel like:
- A personal achievement portfolio, not a performance management tool
- A private timeline of real things done, not a monitored activity log
- A space the worker controls, not a space the employer assigned

**The PIB card in My KORA:**
- Shows the worker's personal pillar distribution
- Never shows a comparative ranking against other workers
- Never shows an "employer view" of their data in the personal space
- The language is first-person: "Le tue azioni verificate", "Il tuo contributo a CONNECTION"

### 15.3 Non-gamification rules for worker experience

Workers must never see:
- Points, score totals, or achievement counters as primary motivation
- Leaderboard or ranking relative to other workers
- Streak indicators ("Day 12 of consecutive engagement!")
- Progress-to-target bars with gamification framing
- Notifications designed to create FOMO or loss aversion

Recognition in My KORA is: *"Questa azione è stata verificata e aggiunta al tuo record personale di impatto."* — documentation, not reward.

### 15.4 Voluntariness as interface principle

The My KORA interface must never create pressure to participate. No required fields, no default enrollment, no social proof pressure mechanics. Every action is an open invitation. The language: *"Puoi scegliere se e cosa condividere."*

---

## 16. KORA Admin Command-Center Rules

### 16.1 The Admin experience is Mission Control

KORA Admin is a **portfolio intelligence and operations center** for the KORA platform operator — not a company-facing product. Its primary intelligence concerns:
- Company readiness states across the portfolio
- Ingestion pipeline status
- Scoring queue and run history
- Report factory status and Decision Pack versions
- Data quality flags
- Advisor review queue

### 16.2 Admin visual language

Admin screens are operationally denser than company-facing screens. The Admin user is an operator who needs status at a glance across many companies. Appropriate density, not executive-minimalist layout.

But the visual language is still KORA — not a generic admin panel. The squircle container vocabulary, the Violet for active states, the Cosmic Blue for structural elements, the calibration badges — all apply.

### 16.3 Admin must never feel like worker surveillance

KORA Admin may access pseudonymized operational records where necessary for platform operations. It must never be designed in a way that:
- Resembles individual performance monitoring
- Creates visual patterns that look like employee tracking
- Shows worker-level data in an employer-readable format

The Admin abstraction layer is: company portfolios, pipeline runs, scoring outputs, report generations, data quality indicators. Never named workers.

---

## 17. Company Experience Rules

### 17.1 The Company workspace is the Executive Cockpit

The company-facing experience is organized around a single governing metaphor: the **Executive Cockpit**. The CHRO or CFO arrives to find a curated, calm, intelligence brief — not a feature menu.

### 17.2 Aggregate-only architecture

Every company-facing view operates on aggregated, anonymized data only. The visual design must reinforce this:
- Workforce statistics show percentages, not absolute person-counts that could enable re-identification
- Department/cohort views only appear above the N≥10 threshold — below this, a `PrivacyBoundaryNotice` replaces the data
- No drill-down paths in employer views that approach individual-level data

### 17.3 Section-by-section primary purpose

| Company section | Visual primary signal | Secondary intelligence |
|---|---|---|
| Executive Cockpit | KORA Index + Confidence Score + Safeguard + trend | Macroblock highlights, next actions |
| KORA Index Detail | Full 10-component breakdown | Weights, explanations, period comparison |
| Pillar Analysis | Five-pillar balance (radar or ring) | Pillar-level drill-down, period trends |
| Activation | Activation rate, distribution | Segment breakdown (above privacy threshold) |
| Reports / Decision Pack | Version timeline, current report status | Export, comparison, chapter navigation |
| Financial Governance | Budget-to-impact ratio | Pillar allocation, cost per IU |
| Data / Ingestion | Data readiness status | Pipeline history, source summary |

---

## 18. Shared View Rules

### 18.1 The Shared View is a public intelligence snapshot

The KORA Shared View (`/company/shared`) is the experience accessed by the **Company Viewer / Board** role — read-only, privacy-safe, designed for board presentation or internal intranet sharing.

### 18.2 Shared View visual constraints

The Shared View must:
- Show only what a board member or external viewer needs: KORA Index, Confidence Score, Safeguard status, pillar distribution summary
- Use the same KORA visual language as all other surfaces — not a simplified or degraded view
- Be visually self-contained and printable/shareable without loss of information
- Never show operational data: pipeline status, scoring run details, data quality flags, admin workflows

The Shared View must not:
- Allow any navigation to non-shared data
- Show any admin interface elements
- Show individual worker data (this is architecturally enforced)

### 18.3 Shared View tone

Board-readable, declarative, no operational backstage:
*"L'organizzazione presenta un KORA Index di 62.8, calcolato su dati H2 2025 con un Confidence Score del 72%."*

---

## 19. Partner / Advisor Workspace Rules

### 19.1 Partner workspace — evidence and activation

The partner workspace is **operationally oriented**. Partners need to see:
- Their service catalog and activation metrics
- Incoming requests from workers
- Evidence quality of their service delivery data
- Their contribution to company pillar scores (aggregate only)

Visual register: operational density, clear status labels, action queue orientation. The aesthetic premium of the executive experience yields to operational precision — but the KORA institutional visual language remains constant.

### 19.2 Advisor workspace — review studio

The advisor experience is organized around **evidence review, not intelligence consumption**. The advisor sees:
- The evidence assigned to their review scope
- Data quality flags and classification questions
- Their verification workflow
- Audit trail of their actions

The evidence comes first. The conclusion (KORA Index) is not the primary display for advisors — they are verifying the methodology, not reading the output.

### 19.3 Professional register for both

Both partner and advisor workspaces communicate: this is a professional responsibility, not a consumer experience. The visual language supports this:
- No celebratory design moments
- No gamification of review tasks
- Dense but organized — not cluttered
- Action status is always clear: pending, in review, approved, rejected, flagged

---

## 20. Anti-Patterns and Prohibited Aesthetics

These are absolutely prohibited in any KORA-branded interface. No exception, no "just for demo" bypass.

### 20.1 ESG marketing aesthetics
Green color everywhere. Leaf and tree iconography. Circular economy diagrams. Nature photography with inspirational copy. Large vague quantitative claims. KORA produces rigorous evidence — ESG marketing aesthetics signal the exact opposite.

### 20.2 Gamified engagement systems
Progress bars to arbitrary targets. Point scores. Streak counters. Achievement badges. Leaderboards. Celebration animations. Level-up mechanics. Gamification is a manipulation pattern. It corrupts KORA's data by creating performative participation and communicates disrespect for adult professionals.

### 20.3 Startup dashboard clutter
20+ metrics visible simultaneously. Competing charts without hierarchy. Dense typography with no breathing space. Every section at equal visual weight. A cluttered dashboard signals inexperience and lack of product conviction — the opposite of what KORA claims.

### 20.4 Crypto visual language
Dark mode as default and only option. Neon accent colors (electric green, bright cyan, hot pink). Hexagonal grid patterns. Abstract particle systems. These aesthetics communicate speculative, volatile, unregulated — the exact opposite of KORA's institutional proposition.

### 20.5 Neon futurism
Glowing elements. Gradient-fill hero text. Animated particle backgrounds. Science fiction interface inspiration. These date immediately and signal technology spectacle over substance.

### 20.6 Social media interaction logic
Like/reaction mechanics. Comment threads on data. Feed-style chronological content. Notification badges on non-critical updates. Infinite scroll. These patterns are incompatible with deliberate, purposeful, session-based institutional intelligence use.

### 20.7 Manipulative dopamine mechanics
Variable reward schedules. Notifications designed to create anxiety. Streak mechanics with loss aversion. These are ethically incompatible with a platform that holds sensitive organizational data. Any discovery of behavioral manipulation would be commercially and reputationally catastrophic.

### 20.8 Productivity surveillance design
Individual-level performance dashboards visible to managers. Activity tracking displays. Employee comparison tables. Individual score rankings. Time-on-task analytics. Any interface that looks like individual performance monitoring — even if it does not technically expose individual data — destroys worker trust.

### 20.9 Shallow AI assistant everywhere
Chatbot widget on every screen. AI-generated summaries without methodology grounding. Conversational interfaces replacing structured data. This contradicts KORA's core epistemic principle: scores must be explainable, outputs must be versioned. Overuse of visible AI makes KORA feel like a technology experiment, not institutional infrastructure.

### 20.10 Generic SaaS blue/green
Undifferentiated "trustworthy blue" primary color. Generic SaaS green for positive states. Default Material Design or Bootstrap-style palette. KORA must be immediately recognizable as itself — not as "another B2B software product."

---

## 21. Accessibility and Readability Rules

### 21.1 Contrast requirements

- Body text (Cosmic Blue on Gray Base): WCAG AA minimum 4.5:1 — must meet
- Large text (H1/H2): WCAG AA minimum 3:1 — must meet
- Interactive elements (Violet on Gray Base): WCAG AA for interactive — must confirm with NEXT
- Detail text: must be legible at minimum size — never sacrifice readability for visual quietness

> ⚠️ Exact contrast ratios must be verified once official HEX values are confirmed.

### 21.2 Minimum touch and click targets

Interactive elements must have minimum touch targets of 44×44px (WCAG 2.1 success criterion 2.5.5). This is particularly important for:
- Confidence Score info icons
- Methodology version expand links
- Component-level drill-down affordances

### 21.3 Motion and vestibular accessibility

All animations must respect the `prefers-reduced-motion` media query. When reduced motion is preferred:
- Transitions reduce to instant or near-instant (100ms max)
- Loading animations stop
- No autoplay animations

### 21.4 Language and reading level

Platform copy in Italian must be:
- Clear and specific — executive-readable without ambiguity
- Free of unnecessary jargon — technical terms are always accompanied by a plain-language explanation on first use
- Not excessively formal — institutional but approachable

---

## 22. Implementation Token Map

This section specifies the token families required for the Premium Design System Overhaul. No token values are locked here — they must be confirmed from official brand sources. This is the architecture of the token system.

### 22.1 Color tokens

| Token family | Tokens required | Status |
|---|---|---|
| `--kora-gray-base` | base, 50, 100, 200, 300 (tints) | OFFICIAL HEX REQUIRED |
| `--kora-cosmic-blue` | base, 700, 800, 900 (depths) | OFFICIAL HEX REQUIRED |
| `--kora-violet` | base, 100, 200, 300, 700, 800 (tints + depths) | OFFICIAL HEX REQUIRED |
| `--kora-fun-green` | base, 100, 200 | OFFICIAL HEX REQUIRED |
| `--kora-amber` | base (warning state) | OFFICIAL HEX REQUIRED |
| `--kora-red` | base (error/risk state) | OFFICIAL HEX REQUIRED |

### 22.2 Pillar color tokens

| Token | Status |
|---|---|
| `--pillar-life` | OFFICIAL HEX REQUIRED — current `#22c55e` is wrong |
| `--pillar-growth` | OFFICIAL HEX REQUIRED — current `#3b82f6` is provisional |
| `--pillar-connection` | OFFICIAL HEX REQUIRED — current `#a855f7` is closest to correct |
| `--pillar-impact` | OFFICIAL HEX REQUIRED — current `#f97316` is wrong |
| `--pillar-legacy` | OFFICIAL HEX REQUIRED — current `#f59e0b` is wrong |

### 22.3 Status / semantic tokens

| Token | Value direction | Status |
|---|---|---|
| `--status-clear` | Fun Green | OFFICIAL HEX REQUIRED |
| `--status-warning` | Muted amber | OFFICIAL HEX REQUIRED |
| `--status-flagged` | Muted red | OFFICIAL HEX REQUIRED |
| `--status-ready` | Violet tint | OFFICIAL HEX REQUIRED |
| `--status-draft` | Gray Base variant | PROVISIONAL |
| `--status-blocked` | Muted red tint | OFFICIAL HEX REQUIRED |

### 22.4 Confidence visualization tokens

| Token | Description | Status |
|---|---|---|
| `--confidence-high` | Full Violet | OFFICIAL HEX REQUIRED |
| `--confidence-medium` | Mid-saturation Violet | OFFICIAL HEX REQUIRED |
| `--confidence-low` | Light Violet tint | OFFICIAL HEX REQUIRED |
| `--confidence-verified` | Violet + Fun Green accent | OFFICIAL HEX REQUIRED |

### 22.5 Typography tokens

| Token | Value | Status |
|---|---|---|
| `--font-interface` | Register 3 — geometric sans | OFFICIAL FONT REQUIRED (Geist: placeholder) |
| `--font-editorial` | Register 2 — high-contrast serif italic | OFFICIAL FONT REQUIRED — missing |
| `--font-wordmark` | Register 1 — rounded geometric sans | OFFICIAL FONT REQUIRED — not used in UI |
| `--font-mono` | Tabular figures / code | Geist Mono: placeholder |

### 22.6 Spacing / radius / shadow tokens

| Token family | Basis | Status |
|---|---|---|
| `--kora-space-x` | X module (brandmark height) | OFFICIAL VALUE REQUIRED |
| `--kora-radius-large` | Squircle radius for containers | OFFICIAL VALUE REQUIRED |
| `--kora-radius-card` | Card border-radius | OFFICIAL VALUE REQUIRED |
| `--kora-radius-component` | Sub-component radius | OFFICIAL VALUE REQUIRED |
| `--kora-shadow-card` | Soft card shadow | OFFICIAL VALUE REQUIRED |
| `--kora-shadow-elevated` | Elevated surface shadow | OFFICIAL VALUE REQUIRED |

---

## 23. Open Decisions — NEXT / Designer Confirmation Checklist

The following values, decisions, and assets must be confirmed with the NEXT designer or official brand owner before the Premium Design System Overhaul proceeds to implementation.

### Hex values (blocker for token system)

- [ ] Gray Base — exact HEX
- [ ] Cosmic Blue — exact HEX + CMYK for print
- [ ] Violet — exact HEX + CMYK for print
- [ ] Fun Green — exact HEX + CMYK for print
- [ ] Muted amber (warning state) — exact HEX
- [ ] Muted red (error/risk state) — exact HEX
- [ ] All five pillar colors — exact HEX
- [ ] All tints and shades for each brand color

### Typography (blocker for font implementation)

- [ ] Register 2 font name, foundry, license (serif italic for editorial moments) — **currently missing**
- [ ] Register 3 font name, foundry, license (geometric sans for interface) — Geist is placeholder
- [ ] Register 1 wordmark font — name and license (for reference only, not UI use)
- [ ] Tabular figures availability in Register 3 font
- [ ] Web font format and loading strategy

### Logo usage

- [ ] Exact X module measurement at standard display sizes
- [ ] Minimum display sizes for horizontal logo and brandmark
- [ ] Co-branding rules with company logos (relevant for report covers)
- [ ] Animated brandmark specification (if any) — for loading/splash
- [ ] Dark mode logo rules — is the CLEAR variant used in the app when OS dark mode is active?

### Platform-specific decisions

- [ ] Whether the platform supports a dark mode at all (current implementation has dark mode CSS in globals.css that conflicts with the Gray Base light-dominant approach)
- [ ] Official icon set or approved Lucide subset — what icons are canonical?
- [ ] Border radius exact values: large container, card, component, button, input
- [ ] Shadow values: card shadow, elevated shadow
- [ ] Whether the globe wireframe and organic blob forms are available as SVG assets for use in cards
- [ ] Figma design system availability — is a Figma file in progress? What token naming convention should the code implementation match?

### Chart and visualization

- [ ] Chart color confirmations for all five pillars
- [ ] Recharts or alternative charting library — is Recharts acceptable or is a different library preferred?
- [ ] Ring chart specification for KORA Index (arc percentage, stroke weight, inner radius)
- [ ] Radar/spider chart specification for pillar balance

### Doc 17 status

- [ ] Is `docs/17-kora-language-visual-system.md` now approved by the founder? Status is "v0.1 — Pending Founder Review" — confirm if approved or still pending.
- [ ] Are there any corrections to the principles in Doc 17 after founder review?

---

## 24. Implementation Roadmap

The Premium Design System Overhaul follows this sequence. Each phase is a prerequisite for the next.

### Phase 0 — Designer Confirmation (prerequisite for all phases)
Receive confirmed hex values, font names, and official values from NEXT/designer. Lock the token system.
**Blocker:** Official values from NEXT.

### Phase 1 — Token System
Implement `lib/kora-tokens/` with all color, typography, spacing, radius, and shadow tokens. Update `app/globals.css` with KORA CSS custom properties. Update Tailwind configuration with KORA token extensions.
**Output:** Centralized, designer-confirmed token system. Zero hardcoded hex values in components.

### Phase 2 — Typography Implementation
Replace Geist placeholder with official fonts. Implement three-register system. Define typography scale in Tailwind. Apply to all existing components.
**Output:** KORA typographic identity in the interface.

### Phase 3 — Pillar and Macroblock Color Alignment
Replace hardcoded pillar colors in `PillarChart.tsx`. Replace macroblock colors in `MacroblockCard.tsx`. Apply canonical pillar token system throughout.
**Output:** No pillar color violations. No colors outside the brand palette.

### Phase 4 — Core Screen Polish
Apply KORA visual language to all primary company and admin screens. Audit for anti-patterns. Enforce card radius, shadow, spacing, and typography hierarchy on every view.
**Output:** Foundation Light demo reflects the KORA brand experience.

### Phase 5 — Report Factory Visual Polish
Apply board-document visual language to Decision Pack screens. Implement cover/hero (inverse Cosmic Blue), chapter structure, comparison section visual style, methodology footer.
**Output:** Decision Pack surfaces feel like board-ready intelligence, not dashboard sections.

### Phase 6 — Landing Page Premium
Apply dark/cosmic aesthetic (Cosmic Blue + orbital visual metaphor), CLEAR logo variant, Register 2 typography for hero claim, editorial rhythm.
**Output:** Landing page earns the "Non un semplice tool. Un'infrastruttura." positioning visually.

### Phase 7 — PDF Export Direction (post-Foundation Light)
When PDF export is implemented, apply board-document design: cover page, chapter structure, print-safe colors, co-branding rules, disclaimer formatting.
**Output:** Decision Pack PDF indistinguishable from institutional advisory output.

---

## 25. Acceptance Criteria for Future UI Work

A screen, component, or output is **KORA-compliant** only when ALL of the following are true:

### Brand and visual
- [ ] Uses only KORA token colors — no arbitrary hex values or off-palette Tailwind classes
- [ ] Typography uses the KORA three-register system — no placeholder fonts in shipped work
- [ ] Container radius follows the squircle vocabulary
- [ ] Logo and brandmark usage follows Section 4 rules
- [ ] No prohibited aesthetics from Section 20 are present

### Intelligence hierarchy
- [ ] One primary signal per view — visual hierarchy is unambiguous
- [ ] KORA Index always shows Confidence Score, methodology_version_id, calibration_status
- [ ] Activation Safeguard status always visible on KORA Index surfaces
- [ ] All 10 KORA Index components shown with values and weights
- [ ] Trust indicators (methodology version, confidence) are in permanent position, not behind drill-down

### Privacy and role compliance
- [ ] Employer-facing views contain only aggregated data (no individual worker data)
- [ ] Privacy boundary visible and labeled wherever data is suppressed
- [ ] Suppression renders `PrivacyBoundaryNotice` — never silently empty
- [ ] Worker personal layer is inaccessible to employer roles — architecturally enforced in service layer

### Product view personality
- [ ] Screen respects the canonical view personality (Section 8.3 and Section 16–20)
- [ ] Admin = Mission Control orientation
- [ ] Company = Executive Cockpit orientation (decision-room, not admin backstage)
- [ ] Shared View = Board snapshot orientation (read-only, clean, no operations)
- [ ] My KORA = Personal impact space (dignity, non-gamified, private)

### Copy and language
- [ ] All UI copy is in Italian (except canonical English proprietary names)
- [ ] Every score has a plain-language explanation visible without drilling down
- [ ] Calibration status copy uses the canonical non-suppressible language
- [ ] No HR motivational, ESG marketing, welfare marketplace, or gamification copy

### Methodology compliance
- [ ] KORA Contribution is displayed separately from KORA Index — never merged
- [ ] PIB is not visible in any employer-facing view
- [ ] No new KORA Index components (10 fixed)
- [ ] Methodology weights read from `lib/methodology-config/v0.1.ts` — never hardcoded
- [ ] "correlazione ≠ causalità" present on all HR KPI comparison outputs
- [ ] CSR/ESG disclaimer present on all CSR/ESG-referencing outputs
- [ ] `synthetic_demo_data: true` labeled wherever surfaced in demo UI

### Anti-patterns check
- [ ] No gamification mechanics (progress bars with achievement framing, badges, streaks)
- [ ] No individual worker heatmaps or ranking
- [ ] No crypto/neon/dark-mode-only aesthetics
- [ ] No ESG marketing aesthetics (green palette, nature imagery, aspirational copy)
- [ ] No social feed mechanics
- [ ] No AI chatbot widget or unsolicited AI narration replacing structured data
- [ ] No generic SaaS dashboard clutter (20+ equal-weight metrics)

### Technical
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] ESLint passes with zero warnings
- [ ] `npm run build` 43/43 pages compile
- [ ] No production artifacts (SQL, Prisma, Supabase, real auth) created

---

## Appendix A — Source Audit Summary

| Source | What it defines | What it does NOT define | Authority level |
|---|---|---|---|
| `docs/17-kora-language-visual-system.md` | Color system, typography 3 registers, brandmark DNA, visual philosophy (10 principles), pillar visualization archetypes, motion philosophy, anti-patterns (10 categories), executive/worker/advisor experience principles | Exact HEX values, font names, component implementations, Tailwind config | Constitutional — primary visual authority |
| `docs/16-kora-future-platform-ux-architecture.md` | UX architecture (12 principles), 6 actor types, 5 platform evolution layers, worker value loop, intelligence vs. dashboard distinction, trust as interface infrastructure | Screen layouts, visual design, copy, component patterns | Constitutional — primary UX authority |
| `docs/24-foundation-light-product-functional-spec.md` | Platform roles and permissions, product principles (22), Italian-first language policy, worker adoption as commercial dependency, privacy rules | Visual design, typography, color | Product specification — governs roles, flows, scope |
| `docs/26-foundation-light-technical-build-handoff.md` | Build philosophy, functional vs mock vs future distinction, service architecture, explainability everywhere | Visual design, brand, copy | Technical build reference |
| Brand screenshots (7 PNG) | Color palette proportions and visual character, typography specimen confirming 3 registers, logo safe area (X module), three canonical forms (squircle/globe/blob), card layout vocabulary | Exact HEX values, font names, pixel measurements | Visual evidence — confirms Doc 17 principles |
| `components/charts/PillarChart.tsx` | Current pillar color implementation (hardcoded) | Canonical pillar colors | Current implementation — all colors are in violation |
| `components/kora-index/MacroblockCard.tsx` | Current macroblock color implementation (hardcoded) | Canonical macroblock colors | Current implementation — teal and amber are off-palette |
| `app/globals.css` | Current CSS: minimal, only `--background`/`--foreground`, Geist fonts, dark mode that conflicts with Gray Base approach | KORA design tokens — none exist yet | Current implementation — requires full replacement |

---

## Appendix B — Confirmed Visual Evidence from Brand Screenshots

The following facts are confirmed by direct visual inspection of the brand guide screenshots in `docs/Documenti grafici KORA/`:

1. **Color palette** (`09.33.03.png`): Gray Base (near-white cool gray, 40%) · Cosmic Blue (very deep dark navy, 30%) · Violet (medium periwinkle blue-violet, 20%) · Fun Green (bright chartreuse-lime, 10%). Tints and shades of each are visible below the primary swatches.

2. **Logo on dark** (`09.32.44.png`): CLEAR variant shows white horizontal logo (white brandmark ring + white "kora™") on a very dark teal-cosmic background with orbital ring texture. Confirms the orbital/cosmic visual metaphor for dark hero contexts.

3. **Brandmark in Violet** (`09.33.15.png`): DARK variant brandmark shown alone on white background in Violet color. Also shows browser favicon: small brandmark in white on a Violet/blue square app icon. Confirms favicon usage.

4. **Typography specimen** (`09.33.36.png`): Confirms the serif italic Register 2 in action — *"Un'infrastruttura."* is in serif italic. The rest of the H1 headline is in geometric sans (Register 3 Bold). Body and Detail text in Register 3. CTA button "Scopri Kora" in Violet, pill-shaped with white text. Labeled hierarchy: H1, Body, Detail, Button, Link.

5. **Logo safe area** (`09.33.44.png`): Horizontal DARK logo (Violet brandmark + Cosmic Blue "kora™" text). Four cyan corner markers showing X module spacing. Confirms X module = brandmark height as minimum safe area.

6. **Three canonical forms** (`09.33.51.png`): Squircle (large rounded rectangle), Globe wireframe (sphere with lat/long grid lines), Organic blob (irregular organic form). All in light gray on white background — neutral and structural.

7. **Card layout** (`09.34.01.png`): Two cards on Gray Base background. Left card: deep (Cosmic Blue) background with globe visual, Violet CTA button. Right card: white background with squircle-cropped photo, body text. Confirms squircle card vocabulary, soft shadow, and image crop treatment.

---

**Document version:** v0.1
**Date:** 2026-05-24
**Status:** Active — Constitutional
**Gate dependency:** No gate dependency for documentation. Token implementation requires Phase 0 designer confirmation.
**Must be read before:** Any Figma work, any component style update, any dashboard design, any report design, any copy creation, any investor deck visual work, any NEXT handoff session.
**Next update trigger:** Receipt of official HEX values, font names, and NEXT designer confirmation → update token map in Section 22 and mark items confirmed.
