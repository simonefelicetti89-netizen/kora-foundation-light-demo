# KORA — SIGNAL · Product Experience Specification & Implementation Handoff

**Package:** KORA-WP-124 · Product Experience North Star & Visual Language
**Status:** **FOUNDER VISUAL ACCEPTANCE GRANTED — 2026-09-20 · WP124 COMPLETE**
**Direction:** KORA SIGNAL — approved as the Product Experience North Star and Visual Language for KORA.
**Normative source:** `kora-signal.css` in this folder, together with this document. Where prose and CSS disagree, raise it as a defect — both are now ratified.

### Gate I — explicit Founder Visual Acceptance

**GRANTED — 2026-09-20.** The Founder accepted, explicitly and as a whole:

- the **KORA SIGNAL** visual direction;
- the **final exemplar set** — Company Intelligence, Dense Operations, Worker / My KORA,
  Admin / Control Plane, Partner, Advisor, States / Form system;
- the **responsive direction** at 375 / 768 / 1440;
- the **interaction and state language**;
- **environment differentiation**;
- this **implementation handoff**.

Also within the approved direction: the SIGNAL shell and Product chrome, typography, the
density system, surface hierarchy, the two-register colour architecture, tables, data
visualisation, forms and states, the accessibility rules, the three proprietary grammars
(A Intelligence Composition · B Qualification / Evidence · C Five-Pillar Balance), and
the IU Trace as the qualification/provenance grammar for operational workflows.

No further visual redesign is authorised under WP124.

This document exists so that later UI-bearing packages do **not** silently make new
visual Product decisions. Anything not specified here is an open decision and must be
escalated, not invented.

---

## 0. Scope and authority

Governs: how KORA looks and behaves as software.
Does **not** govern: domain semantics, information architecture, permissions, features,
data meaning, or mandatory trust requirements. Those are owned by CLAUDE.md, Registry 219
and the frozen canonical docs. A visual decision may never change a Product meaning.

**Canonical mathematics is not a design variable.** Verified in repository:
`insufficient_data contribuisce 0 senza redistribuzione (tetto, non gonfiaggio)` —
`lib/kora-engine/kora-index-engine.ts:14`, `lib/constants/kora.ts:110`,
`lib/live/persistence.ts:52`, `lib/kora-engine/run-kora-pipeline.ts:14`.
Unavailable weight produces a **ceiling**, never a rescale. Terminology to use verbatim:
`senza redistribuzione`, `tetto`. Do not invent alternatives.

---

## 1. Product canvas and surface hierarchy

| Level | Token | Use |
|---|---|---|
| L0 canvas | `--l0 #EAECF4` | the application ground; cool, with a deliberate Cosmic/Violet bias |
| L1 working surface | `--l1 #FFFFFF` + `--line` border + `--sh-1` | a panel that is a meaningful Product object |
| L2 analytical panel | `--l2 #F4F6FC` + `--l2-edge` | a region *inside* L1: sub-analysis, trace, inline note |
| L3 elevated object | `--l3` + `--sh-2` | a floating/interactive object (attachment card, option row) |
| L4 overlay | `--l4` + `--sh-3` | modal, command palette, popover |

The canvas is never beige and never pure grey. A panel exists because the information is
a meaningful autonomous object — not because a rectangle was needed. Two adjacent signals
of the same kind belong in **one** surface with two labelled regions, not two cards
(see `Segnali adiacenti` on Company).

## 2. Workspace shell

- Expanded sidebar **248px**, `linear-gradient(180deg,#0A0636,#06032B 62%,#05021F)`.
- Contains, in order: five-node mark + wordmark + collapse; workspace switcher (name,
  scale, period); ⌘K command entry; grouped navigation with counts; **pipeline state
  widget**; environment tag; account.
- Active item: Violet-tinted fill, 1px Violet inset ring, and a 3px Violet edge marker
  bleeding left with a soft glow. Never a plain filled block.
- Group labels: `rgba(255,255,255,.62)` — this is real text and must clear AA.
- Collapsed rail **68px** at ≤1200 (icons + count badges only).
- Phone: becomes a horizontal top bar with a horizontally scrollable nav strip. It is a
  different component, not a narrower sidebar.

## 3. Top chrome

Sticky, 56px, translucent L0 with blur, 1px bottom rule. Carries breadcrumbs (last
segment bold), search with ⌘K, period segmented control, notifications, one primary
action. Do not remove product chrome to look minimal.

## 4. Typography

Plus Jakarta Sans only. **No serif in Product UI.** Playfair Display and Hanken Grotesk
are not part of the direction.

| Class | Size / weight | Use |
|---|---|---|
| `.d1` | 66/800, -.045em | the single hero metric |
| `.d2` | 34/750 | secondary metric |
| `.d3` | 22/700 | drawer/record title |
| `.h1` | 19/700 · `.h2` 14.5/700 | section and row titles |
| `.lbl` | 11/800, .07em, uppercase | section label |
| `.p` | 13/1.6 | body |
| `.sm` 12 · `.xs` 11.5 | | metadata |
| `.mono` | tabular-nums, `tnum`+`zero` | **every** numeric column |

`font-variant-numeric: tabular-nums` is set on `body`: analytical by default.
**Minimum persistent Product text is 11px** and only for uppercase labels; body
metadata floors at 11.5px. Density is never bought with smaller type.

## 5. Grid, spacing, density

12 columns, `minmax(0,1fr)`, gap 20 (16 ≤1200, 14 ≤720). Content padding 22/24.
Spacing scale 4/8/12/16/24/32/48/64/88. Table rows 42px, headers 11px uppercase.
Row density is a user control (compact / comfortable segmented toggle).

### 5.1 Ratified density defaults per environment

| Environment | Default | Notes |
|---|---|---|
| Company Intelligence | **Standard** | analytical reading, not queue work |
| Company Operations / dense review | **Compact-professional** | the working default for queues |
| Admin / Control plane | **Compact** | cross-tenant scanning |
| Partner | **Standard** | |
| Advisor | **Standard**, with **compact** for dense review queues | the queue and `Concluse oggi` tables run compact; the drawer stays standard |
| Worker / My KORA | **Standard**, deliberately more comfortable than operational environments | |

The user toggle may always override the default; the default is what ships.

## 6. Radius, borders, elevation

Radius: panel 14 · inner 10 · control 8 · chip 6 · pill 999 (status/tag only).
Content regions get no radius merely for existing. Primary CTA is **not** a pill.
Borders: `--line rgba(6,3,43,.09)`, `--line-2 rgba(6,3,43,.14)`. Borders are permitted
and purposeful — control edges, panel edges, table rows, focus, selection, error.
Elevation: two levels only, cool, Cosmic-Blue-derived. **No coloured shadow, no glow.**

## 7. Colour — two registers that never swap

**Product register** (chrome, navigation, interaction, selection):
Cosmic Blue `#06032B`, Violet `#6156F5` / `#4A3DE0`, warm-free cool neutrals,
informational `#3B6EBA`, analytical accent Cyan `#2BB7D9` (KORA layer only).

**Data register** (pillars, analysis, meaning):
LIFE `#C76F3D` · GROWTH `#2F7D55` · CONNECTION `#D99767` · IMPACT `#D99A2B` · LEGACY `#8A7562`.
Macroblocks: REACH `#3B6EBA` · QUALITY `#2F7D55` · EQUITY `#7C3D8F` · BTI `#C07D2A`.

An earth tone on a button, nav item or focus ring is a defect. Four of the five pillar
fills fail AA as text, so **pillar labels are ink or a darkened per-pillar ink**
(`#8A4A22`, `#2F7D55`, `#8A5A00`, `#6B5A49`), never the fill.
Semantic state has separate fill and text tokens: `--warn #D99A2B` fill, `--warn-text #8A5A00`.

## 8. The three proprietary grammars

A KORA surface uses the grammar that belongs to its Product meaning. Identity is
systemic — do not place every signature object on every screen.

### A · Intelligence Composition
The Index is *assembled*. Render as a 0→100 track of macroblock contribution points,
a hatched remaining margin, a hatched unavailable zone, and a **ceiling marker** at
`100 − unavailable weight`. The console repeats the grammar with a shared contribution
scale across all rows and a dark total row that closes back to the hero value.
Use on: Company Intelligence, any Index-bearing analytical surface.

### B · Qualification / Evidence
Trust is a **path**, not metadata cells: Evidenza → Confidence → Safeguard → Calibrazione
→ evidence gateway, connected by a rule with pass/hold node markers. Confidence uses a
10-tick meter, not a donut.
The row-level form is the **IU trace**: six nodes `NM · BC · CQ · EV · CF · AGF` drawn as
a profile. Flat at the top = clean. A dip = discount. A hollow amber EV node = self-declared
evidence. A broken line with a red × = `AGF = 0`, disqualified. A legend is permitted
during early adoption; the shape must carry the meaning after one learning.
Use on: Company, Operations, Advisor, Partner, Admin.

### C · Five-Pillar Balance
Five pillars are one system read against a **20% equilibrium reference**, as signed
deviation (+11 / +4 / −3 / −4 / −8). Deviations sum to zero by construction; their spread
*is* Pillar Balance. Never five cards, never a radar chart, never plain percentage bars.
Use on: Company; in personal register on My KORA.

## 9. Tables

No outer border, no vertical rules. Sticky 11px uppercase header over a `--line-2` rule;
rows separated by `--line`. Hover raises to `#FAFBFF`; selection tints Violet 9% with a
3px Violet left edge. Contextual row actions fade in at 90ms. Numbers right-aligned and
tabular. `table-layout: fixed`, one description column truncating with ellipsis.
Below 720px a table becomes a **record list**, never a horizontal scroll of the page.

## 10. Data visualisation

Direct labelling; no legend boxes, no axis boxes, no chart chrome. Reference lines at 8%
ink with inline values. Emphasised current point with a ring. Annotations are allowed when
they mark a real event (`Safeguard → CLEAR`). Every chart answers one Product question;
two adjacent charts must answer two different questions (state vs change).

## 11. Forms

Bordered, elevated inputs on L1 (36px, radius 8, `--sh-1`). Focus is Violet border +
3px Violet tint ring. Invalid is a Violet-free red border + tint plus an icon + text
message. Disabled drops to L0 with no shadow. Labels 12.5/700, hints 11.5.

## 12. State language

empty · loading · error · success · warning · pending · disabled · selected · hover · focus.
Loading uses skeletons at 7% ink; a spinner only inline, never full-page. System messages
are a 3px left bar + icon + text — **colour is never the only signal**. No gamification,
no confetti.

## 13. Motion

90ms feedback (hover, focus, row actions) · 160ms state change · 280ms surface entry.
`cubic-bezier(.2,.6,.25,1)`. Motion never decorates. `prefers-reduced-motion: reduce`
collapses all durations to 0.01ms — already implemented globally.

## 14. Responsive

Breakpoints 1200 / 900 / 720. Acceptance widths **1440 · 768 · 375**.
- ≤1200 sidebar collapses to a 68px rail; drawer stops being a column; c3–c9 span 12.
- ≤900 hero stacks; qualification path wraps to two nodes per row; console drops the
  distribution bars and keeps value + points; header search hides.
- ≤720 nav becomes a top bar; tables become record lists; pillar columns abbreviate;
  console becomes compact rows; the drawer becomes a stacked sheet.
No horizontal page overflow at any width — enforced by an automated sweep.
Known trap, do not repeat: a bare `1fr` grid track takes a min-content minimum; use
`minmax(0,1fr)`. `flex:none` defeats `min-width:0`.

## 15. Accessibility

All persistent text pairings clear WCAG AA 4.5:1 (measured, see §Accessibility evidence).
One focus ring everywhere: 2px Violet, 2px offset, never removed. Status is always
dot + word. Earth-tone fills are data marks, never text. Reduced motion respected.
Keyboard model published on operational surfaces (J/K, A, E, ⌘K).

## 16. Environment differentiation

Environments differ by **navigation content, workspace identity, density and which
grammar is present** — never by palette. Company is dense and analytical; Operations is
dense and operational; My KORA is calmer, narrower, privacy-forward; Admin is
cross-tenant and control-plane; Partner is aggregate-only; Advisor is judgement-oriented
with a structured outcome. They are recognisably one Product.

## 17. Resolved Product decisions — closed, do not reopen silently

These five were open at first draft and were resolved by Founder ruling (2026-09-20).
They are settled inputs for every later package.

| # | Decision | Ruling |
|---|---|---|
| 1 | **Dark mode** | **NOT OPEN. Light-only is the canonical direction.** No dark tokens exist and none are to be authored. A future dark mode requires a separate explicit Product decision. |
| 2 | **Iconography** | **`lucide-react` is the canonical system.** Which specific glyph expresses a given action is implementation detail. The binding rules are in §19. |
| 3 | **Chart library** | **Implementation choice.** Any library adopted must faithfully implement the §10 data-visualisation grammar; the grammar governs the library, never the reverse. Not a Product blocker. |
| 4 | **Empty / error copy library** | **A complete string library is not required for WP124 closure.** WP124 fixes tone, structure, severity, action language and prohibited patterns (§20). Individual strings belong to implementation packages. |
| 5 | **Density defaults** | **Ratified per environment** — see §5.1. |

## 18. Composition pattern for secondary environments (added after the Partner/Advisor correction)

Partner and Advisor originally used a single stacked column and left large inactive
regions at 1440. Both now use the canonical pattern:

**working column (c8 / `minmax(0,1fr)`) + contextual rail (c4 / 336–368px).**

Rules that follow from that correction:

1. The rail carries *actionable* items first (open requests, the selected record,
   outcome controls), then reference (linked entities, upcoming activity, criteria,
   shortcuts). It is never a decorative sidebar.
2. **The working column and the rail must end at approximately the same height.** If the
   rail is longer, move a reference panel into the working column as a two-up row — do
   not add filler to the working column. Partner does exactly this with
   `Aziende collegate` + `Prossime attività`.
3. Where the queue states a count (`14 da valutare`), the exemplar must render that many
   rows. A short sample beside a large blank canvas is not acceptable evidence.
4. Stacked panels inside the working column belong to **one** nested column, not to
   separate grid rows — separate rows get stretched by a taller rail and open a gap.
5. Density target: at 1440 the last content pixel should fall within roughly 10% of the
   document height. Measured: Partner 1097/1205, Advisor 1460/1568.


## 19. Iconography

Canonical system: **`lucide-react`**. Which glyph expresses a given action is
implementation detail; the following are binding.

- **Sizing.** 16px in navigation and body context · 15px inside buttons · 14px in row
  actions and inline affordances · 13px in breadcrumb separators and chip carets ·
  20px only in empty-state illustration slots. No other sizes.
- **Stroke.** 2px at 16px, 2.2px at 14–15px, 2.4px at 13–14px where optical weight
  requires it. `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`,
  `stroke="currentColor"` always — an icon inherits its context's colour and never
  carries a hard-coded hex.
- **Label pairing.** An icon may stand alone only where the control is either
  universally understood (close, chevron, overflow) or already labelled by an adjacent
  visible string. Every icon-only control carries an `aria-label`. Row-action icons are
  icon-only by design and always labelled for assistive technology.
- **Functional vs decorative.** Decorative icons take `aria-hidden="true"` and never
  receive focus. Functional icons live inside a real button or link — never a clickable
  `span`.
- **One family only.** Mixing icon families is prohibited. Emoji are never UI icons.
  Inline hand-drawn SVG is permitted **only** for the proprietary grammars in §8
  (composition track, qualification path, IU trace, pillar deviation), which are data
  marks, not icons.
- **The five-node mark** is brand geometry, not an icon: it appears once per surface, in
  the shell, and is never reused as an inline glyph.

## 20. Content and copy principles

WP124 fixes the language system; implementation packages write the strings.

- **Tone.** Precise, calm, professional. Italian-first per CLAUDE.md §15, with the
  ratified proprietary names left in English (KORA Index, Confidence Score, Activation
  Safeguard, Impact Units, My KORA, Dynamic Impact CV, Trust Ledger, Board Pack …).
- **Structure.** A system message is *what happened* → *what it means* → *what to do*.
  The consequence is never left implicit: "AGF = 0. L'evento è squalificato: IU = 0.
  L'esito non è modificabile in revisione."
- **Severity.** Four levels only, matching the notice tokens: `ok` · `info` · `warn` ·
  `risk`. Severity is carried by bar, icon and wording together — never colour alone.
- **Action language.** Buttons are a verb in the imperative ("Approva", "Allega
  evidenza", "Apri coda evidenze"), never a noun ("Approvazione") and never vague
  ("OK", "Continua"). An empty state ends in exactly one action.
- **Numbers in prose** are written the same way as in the UI (§21.4).
- **Prohibited.** Exclamation marks; congratulatory or gamified phrasing; marketing
  language inside operational UI; apologies ("Ops!"); anthropomorphised system voice;
  blame directed at the user; any wording that implies certification, regulatory
  compliance or empirical validation; any wording that implies an individual worker is
  being scored, ranked or compared.

## 21. Canonical value rendering

Presentation rules derived from canonical semantics. These are **not** style choices —
rendering them differently would misstate a Product meaning.

1. **Suppressed below threshold.** A cohort under the safe-aggregation threshold renders
   as a status chip `Soppresso N<10`. Never `0`, never `—` alone, never an empty cell,
   never a partial count. Dependent numeric cells in the same row render `—`.
2. **`insufficient_data`.** The component remains visible with its declared weight, a
   hatched (not empty) distribution bar, the chip `insufficient_data`, and a contribution
   of `0,00`. It is never hidden, never substituted, never redistributed.
3. **The ceiling.** Wherever a KORA Index is displayed and unavailable weight exists, the
   attainable maximum must be displayed with it — as the `tetto` marker on a composition
   track, or as a `Tetto` column in a list. An Index shown without its ceiling overstates
   what the period could have reached.
4. **Number formatting.** Italian convention: comma decimal separator, dot thousands
   separator (`50,4` · `9.200` · `+11,4%` · `0,85`). One decimal for index and IU values,
   two for formula factors and point contributions. All numeric cells and all metrics use
   `tabular-nums`. A delta always carries its sign.
5. **Environment identity.** The workspace avatar gradient is the only element that
   varies by environment (Company terracotta, Partner green, Advisor violet, Admin cyan,
   Worker/system brand violet). Everything else in the shell is identical across
   environments. A new environment inherits the shell and chooses a gradient from the
   existing palette — it does not introduce a new accent colour.
6. **Data-visualisation motion.** Charts do not animate on entry. Motion in a chart is
   permitted only for a state transition the user caused (period change, series toggle).

## 22. Escalate, never invent

Nothing in this specification may be extended by silent inference. One item remains that
implementation must escalate rather than decide:

- **CLAUDE.md §6 applied to multi-record views.** §6 requires every surface showing a
  KORA Index to display Index + Confidence Score + Activation Safeguard +
  `methodology_version_id` + `calibration_status` + the 10-component breakdown +
  limitations. A full Index surface (Company Intelligence) satisfies this. A
  **cross-tenant list** (Admin) shows an Index value per row and cannot carry a
  ten-component breakdown per row. The WP124 exemplar shows Index · Δ · CS · Safeguard ·
  Tetto per row, with methodology and calibration stated once at surface level.
  **Whether that satisfies §6, or whether list views require a different treatment, is a
  governance interpretation and is not WP124's to make.** Until it is ruled on,
  implementation must adopt the exemplar's treatment and escalate any deviation.
