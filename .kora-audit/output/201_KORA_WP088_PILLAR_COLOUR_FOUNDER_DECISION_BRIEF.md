# 201 — KORA-WP-088 Pillar-Colour Founder Decision Brief

**DECISION PREP ONLY. No code modified. No tests modified. No tokens created. No commit. No push.**

No option is recommended, ranked, or chosen in this document. No hex value is invented.

---

## 0. Founder decisions recorded (from this task's own instruction, verbatim intent)

1. **Authenticated responsive validation may not be silently waived.** WP-088 COMPLETE requires authenticated multi-viewport verification of the relevant role environments at approximately **375px · 768px · 1440px**. Implementation may begin before credentials/runtime access exist, but if that validation cannot be performed at completion time, **WP-088 remains PARTIAL / VALIDATION-BLOCKED**. Credentials are never to be fabricated.
2. **DAG governance.** Registry 142 mechanical status uses **COMPLETE / READY / BLOCKED** only. `NOT_YET_READY` is retained solely as a **planning/sequencing overlay** used by historical audit reports. Future reporting must state **CANONICAL MECHANICAL STATUS** separately from the **SEQUENCING PRIORITY / NOT_YET_READY overlay**. Historical reports are not rewritten.

---

## 1. The exact conflict

Two documents, both cited as governing for WP-088, give incompatible instructions about the same colour values — and the external asset that would settle them is only partially present in the repository.

**Source A — `docs/30-kora-brand-visual-product-experience-constitution.md`** (Registry 142 names this as WP-088's own Arch Source).

§6.1, verbatim: *"Each pillar requires a distinct visual identity that remains within the cool blue-violet color family defined by the brand palette. **Warm colors (red, orange, gold) must not be assigned to pillars** — they carry urgency and alarm associations incompatible with calm organizational intelligence."* Its own per-pillar table forbids, explicitly: LIFE — "Green (currently wrong), red, **orange**"; IMPACT — "**Orange** (currently wrong), red"; LEGACY — "**Amber** (currently wrong), bright energetic colors". §6.1 closes with: *"⚠️ **OFFICIAL PILLAR HEX VALUES REQUIRED FROM NEXT/DESIGNER.** Exact HEX values must be confirmed from the Figma design system or official brand guidelines **before implementing the pillar token system**."*

§22 header, verbatim: *"This section specifies the token families required for the Premium Design System Overhaul. **No token values are locked here — they must be confirmed from official brand sources.** This is the architecture of the token system."* §22.1 marks all six colour families (`--kora-gray-base`, `--kora-cosmic-blue`, `--kora-violet`, `--kora-fun-green`, `--kora-amber`, `--kora-red`) **"OFFICIAL HEX REQUIRED"**. §22.2 marks all five pillar tokens **"OFFICIAL HEX REQUIRED"**. §22.3 marks five of six status tokens **"OFFICIAL HEX REQUIRED"** (`--status-draft` alone is "PROVISIONAL").

**Source B — `docs/EXPERIENCE_LAYER.md` §2 + `lib/design/kora-design-tokens.ts`.**

`EXPERIENCE_LAYER.md` §2 declares `lib/design/kora-design-tokens.ts` the *"unica sorgente di verità"* (sole source of truth) and tabulates a **warm earth-tone** system as canonical: accent terracotta `#C76F3D`, canvas warm-ivory `#EFEBE2`, surface `#F8F6F1`, taupe `#E3DDD3`, with pillars LIFE `#C76F3D` (terracotta), GROWTH `#2F7D55`, CONNECTION `#D99767` (warm sand), IMPACT `#D99A2B` (amber/gold), LEGACY `#8A7562` (warm taupe). Violet `#6156F5` is demoted to *"Digital micro-accent (sparingly)"*. These values are live in code and used across 20+ files.

**Where they conflict.** Source A forbids warm colours for pillars; Source B assigns warm colours to **four of five** pillars (LIFE terracotta/orange, CONNECTION warm sand, IMPACT amber/gold, LEGACY warm taupe) — LIFE and IMPACT and LEGACY are each *explicitly* named as forbidden directions by Source A's own table. Source A additionally requires a Violet-family-centred token architecture (§22.1) that the current token file does not implement, and states no value may be locked without an official brand source; Source B presents its values as already canonical and locked.

**The conflict concerns: ALL OF THE ABOVE.**
- **Semantic role** — Source A makes Violet the system's identity core and reserves green for IMPACT/activation; Source B makes terracotta the primary accent and assigns green to GROWTH.
- **Number of colours** — Source A's §22 specifies a tint/depth architecture (~20 base+tint colour slots, plus 5 pillar, plus 6 status); Source B implements flat single values with no tint scale.
- **Actual hex values** — four of five pillar values differ in direction, not merely in shade.
- **Ownership/approval** — Source A says values must come from an official brand source and are not yet confirmed; Source B treats the in-repo values as already the source of truth.

**Additional finding — Source A is partly stale.** §6.2 and §22.2 cite "current" values `#22c55e`, `#3b82f6`, `#a855f7`, `#f97316`, `#f59e0b` in `components/charts/PillarChart.tsx`. **That file no longer exists**, and pillar colours are now token-sourced. Source A's *direction* (§6.1) remains live; its *violation list* is out of date. Its stale portion must not be actioned as written.

## 2. Report 60 §11 — the Founder requirement

Verbatim, from the DESIGN-001 requirement text: *"**Resolve the documented pillar-color conflict** (reference HTML `LIFE=#4A7FE0` vs tokens `LIFE=#C76F3D`; `app/page.tsx` note; `docs/30` §6.2) — **FOUNDER DECISION**."*

Corroborated in code: `app/page.tsx` lines 67-72 carry an in-file note recording the same discrepancy and resolving it *provisionally* ("Si usa PILLAR_COLORS dai token come single source of truth (regola 6)"), and `docs/EXPERIENCE_LAYER.md` §2 states *"**Decisione del founder richiesta** prima di sincronizzare landing con token."* The `#4A7FE0` landing blue is still live in code (13 occurrences across 8 files).

## 3. Current colour truth

**Officially sourced (present in the repository's own brand assets — `docs/Documenti grafici KORA/`):** the KORA brandmark and horizontal-logo SVGs, across every variant, contain exactly **two** colours:

| Hex | Token today | Status |
|---|---|---|
| `#06032B` | `TOKENS.ink` · `TOKENS.sidebar` · `KORA_COLORS.COSMIC_BLUE` | **OFFICIALLY SOURCED** — present in official brandmark SVG |
| `#6156F5` | `TOKENS.violet` · `KORA_COLORS.VIOLET` | **OFFICIALLY SOURCED** — present in official brandmark SVG |

No other colour anywhere in the repository has an official brand source. The brand-asset folder contains no colour specification document, no palette file, and no Figma export — only logo artwork in SVG/PNG/PDF/JPG.

**Provisional (in `lib/design/kora-design-tokens.ts`, no official source):**

| Token | Value | Semantic purpose | Where used |
|---|---|---|---|
| `TOKENS.canvas` / `KORA_COLORS.WARM_IVORY` | `#EFEBE2` | page background | app-wide via `bg-kora-canvas`, 30 occurrences as literal |
| `TOKENS.surface` / `PAPER` | `#F8F6F1` | cards, panels, tables | app-wide, **233** literal occurrences |
| `TOKENS.taupe` | `#E3DDD3` | secondary surface, separators | tables, disabled states |
| `TOKENS.accent` / `TERRACOTTA` | `#C76F3D` | **primary accent** — brandmark tint, active states, charts | app-wide, **266** literal occurrences |
| `TOKENS.accentSoft` / `accentHover` | rgba(199,111,61,·) | soft accent backgrounds | app-wide |
| `TOKENS.success` | `#2F7D55` | positive / CLEAR | safeguard, badges, **184** literal occurrences |
| `TOKENS.warning` | `#D99A2B` | WARNING state | safeguard, badges |
| `TOKENS.critical` | `#9E3B2F` | FLAGGED / error | safeguard, badges, **193** literal occurrences |
| `TOKENS.safeguard.{pass,watch,cap}` | derived | Activation Safeguard governance states | KORA Index surfaces |
| `TOKENS.ink{Secondary,Tertiary,Hint,Meta,Border,BorderStrong,Track}` | rgba(6,3,43,·) | text/border opacity scale | app-wide |
| `CHART_COLORS.*` | mixed | chart series/axis/grid/tooltip | charts |
| `STATUS_COLORS.{CLEAR,WARNING,FLAGGED}` | mirrors semantic | Activation Safeguard | KORA Index |
| `BUTTON_TOKENS.*` | incl. `#FFFFFF`, `#B5602E` | button variants | primitives |
| `BADGE_TOKENS.*` | derived | badge families | app-wide |
| `ACTIVATION_SIGNATURE.{cotto,inkWarm,canvas}` | `#B5512E`, `#211F1A`, `#F6F4EF` | KORA Activation Signature / KORA Link card | Link surfaces |

**Pillar-specific colours currently in code** (`PILLAR_COLORS`, all provisional, no official source):

| Pillar | Current value | Character | Source A §6.1 verdict |
|---|---|---|---|
| LIFE | `#C76F3D` | terracotta (warm/orange) | **explicitly forbidden** ("orange") |
| GROWTH | `#2F7D55` | forest green | not forbidden; A wants "warmer Violet tint" |
| CONNECTION | `#D99767` | warm sand | A wants "softer purple-tinted variant"; warm family discouraged |
| IMPACT | `#D99A2B` | amber/gold | **explicitly forbidden** ("orange"); A wants Fun Green |
| LEGACY | `#8A7562` | warm taupe/brown | **explicitly forbidden** ("amber"/warm family) |

Used in 20+ files including `app/page.tsx` (landing), worker/partner/company activity surfaces, admin data-intake, and commons. `components/charts/PillarChart.tsx` — the file Source A §6.2 names — **does not exist**; `MacroblockCard.tsx` does exist and Source A §6.2 flags its teal/amber for audit.

**Incidental hardcoded colours are NOT treated as approved brand colours anywhere in this brief** (§4).

## 4. The 809 unmapped literals — classification

Re-scanned excluding the token source, its CSS mirrors, the decision-pack export template, scoped landing/pilot CSS modules, Living KORAL, and Future Vision. **140 distinct values, 809 occurrences.** Classified:

| Cat | Meaning | Distinct values | Occurrences |
|---|---|---|---|
| **A** | Recurring semantic role → genuinely needs a token | **56** | **488** |
| **B** | Mappable to an **existing** token after cleanup (perceptual near-duplicate of a canonical value, or a neutral grey belonging to the existing ink-opacity scale) | **42** | **251** |
| **C** | Visual drift — one-off (≤3 occurrences, ≤2 files), delete/replace | **42** | **70** |
| **D** | External/brand exception | **0** | **0** |
| **E** | Requires a Founder-approved **new palette** | subset of A — see below | subset of 488 |

**809 literals do NOT require 809 tokens.** Category A's 56 distinct values collapse into just **six semantic colour families**:

| Family | Distinct | Occurrences | Largest members |
|---|---|---|---|
| blue (info/link//accent-blue) | 19 | 196 | `#3B6EBA`(43), `#1E4A8A`(22), `#4A7FE0`(13), `#2563EB`(11) |
| green (success depths/tints) | 10 | 91 | `#166534`(22), `#1A4731`(13), `#15803D`(12), `#22C55E`(12) |
| violet/purple (depths + tints) | 10 | 86 | `#1A1756`(24), `#C7C4F8`(18), `#7C3D8F`(13), `#9333EA`(8) |
| red (error depths) | 9 | 57 | `#DC2626`(14), `#991B1B`(6) |
| amber/orange (warning tints) | 7 | 47 | `#FEF9C3`(11), `#F59E0B`(10), `#CA8A04`(8) |
| neutral/grey | 1 | 11 | `#6B7280`(11) |

**Notable convergence (factual observation, not a recommendation):** these six families map almost one-to-one onto the six token families Source A §22.1 already specifies (`--kora-gray-base`, `--kora-cosmic-blue`, `--kora-violet`, `--kora-fun-green`, `--kora-amber`, `--kora-red`) — the code has organically grown tints and depths in precisely the architecture §22.1 predicted, without those tokens ever being defined. **One gap**: the largest family by volume, the info/link blue (196 occurrences, 19 values), has **no corresponding slot in Source A §22.1** — it is neither cosmic-blue nor violet by usage, and would need either a new slot or a decision to fold it into an existing family.

## 5. Number of genuinely new semantic tokens required

Counting the slots, not the literals:

- **Source A §22.1 colour families**: `--kora-gray-base` (base, 50, 100, 200, 300) = 5 · `--kora-cosmic-blue` (base, 700, 800, 900) = 4 · `--kora-violet` (base, 100, 200, 300, 700, 800) = 6 · `--kora-fun-green` (base, 100, 200) = 3 · `--kora-amber` (base) = 1 · `--kora-red` (base) = 1 → **20 slots**, of which **2 already have an officially-sourced value** (`--kora-cosmic-blue` base = `#06032B`, `--kora-violet` base = `#6156F5`) → **18 requiring a value**.
- **Source A §22.2 pillar tokens**: `--pillar-life`, `--pillar-growth`, `--pillar-connection`, `--pillar-impact`, `--pillar-legacy` → **5 requiring a value**.
- **Source A §22.3 status tokens**: `--status-clear`, `--status-warning`, `--status-flagged`, `--status-ready`, `--status-blocked` marked OFFICIAL HEX REQUIRED; `--status-draft` marked PROVISIONAL → **5 requiring a value** (+1 provisional).
- **Code-evidenced gap not in Source A**: an **info/link blue** family (≥1 slot, likely base + 1-2 tints) → **1-3 requiring a value**.

**Total semantic slots requiring a Founder-approved value: approximately 29-31** — versus 809 literals and 56 distinct unmapped values. No value for any of these slots is invented here.

## 6. Founder questions (minimum set)

### QUESTION 1 — Which colour system is canonical for KORA?

**OPTION A — Ratify the current implemented system.** `lib/design/kora-design-tokens.ts` (warm earth-tone: terracotta primary, warm-ivory canvas, four warm pillars) is confirmed canonical as-is. `docs/30` §6.1/§6.2/§22 are recorded as superseded **on colour specifically** (its typography, accessibility §21, and non-colour sections remain governing).
- *Factual consequence*: 0 existing token values change. No pillar colour changes. The 1,762 already-mappable literals plus the 251 cat-B literals become mechanically remediable immediately (2,013 of 2,571). The 488 cat-A literals still need ~29-31 new tint/depth/info-blue slots defined **within the existing warm system** — still requiring value decisions, but consistent with what is already on screen. `#4A7FE0` landing blue and `MacroblockCard` teal/amber become drift to be normalised. Visual appearance of the shipped product is unchanged.

**OPTION B — `docs/30`'s cool Violet-family direction governs.** The current warm token values are treated as provisional and replaced; official hex values are obtained from the designer/Figma for the ~29-31 slots in §5.
- *Factual consequence*: essentially every colour token changes value. All five pillar colours change direction (four move from warm to cool/violet/green). The primary accent changes from terracotta to a Violet-family colour. Every one of the 2,571 category-A literals plus all token-referencing call sites re-renders differently. The product's entire visual appearance changes. **WP-088 cannot begin its colour half until the external hex values exist** — they are not in the repository today (§3). Consistent with the two officially-sourced brand colours (`#06032B`, `#6156F5`), both of which are Violet-family.

**OPTION C — Defer the colour decision; scope it out of WP-088.** Neither system is ratified now; colour is split into a separate future Product package.
- *Factual consequence*: no token changes. WP-088 proceeds with RESPONSIVE-001 in full plus the non-colour portion of DESIGN-001 (primitive adoption, dialogs/state families, container/breakpoint standard, table overflow, grid remediation) and with the 2,013 mechanically-safe literal substitutions to *existing* tokens. The 488 cat-A literals, all pillar/macroblock colour work, and all new token definition remain untouched and explicitly deferred. `KORA-GAP-DESIGN-001` would close only partially, so **WP-088 could not be marked COMPLETE against its own "site-wide responsive/design closure" Acceptance** unless the Founder also narrows that Acceptance (see Question 2).

### QUESTION 2 — Must WP-088 close the colour half to be COMPLETE?

**OPTION A — Yes, colour closure is required.** WP-088 is not COMPLETE until `KORA-GAP-DESIGN-001` including colour is closed.
- *Factual consequence*: WP-088 is blocked on Question 1 (and, under Q1 Option B, additionally on the external designer/Figma hex values arriving). Its unblocked ~60% could still be implemented first, with WP-088 held at PARTIAL — the same pattern WP-073 followed with OQ-D01.

**OPTION B — No; colour is formally carved out.** `KORA-GAP-DESIGN-001`'s colour dimension is split into a separate future package (numbered or unnumbered per Registry governance); WP-088's Acceptance is narrowed to responsive + non-colour design-system closure.
- *Factual consequence*: WP-088 becomes fully completable without any Founder colour decision. Registry 142's own Primary-Closures field for `088` would no longer be satisfied as literally written, so this requires an explicit Founder scope amendment recorded against the registry — not an implementation-level reinterpretation.

### Semantic slots requiring a value (if Question 1 resolves to B, or to A-with-new-tints)

Using Source A's own terminology, **no values supplied**:

`--kora-gray-base` (base · 50 · 100 · 200 · 300) · `--kora-cosmic-blue` (base ✓ `#06032B` officially sourced · 700 · 800 · 900) · `--kora-violet` (base ✓ `#6156F5` officially sourced · 100 · 200 · 300 · 700 · 800) · `--kora-fun-green` (base · 100 · 200) · `--kora-amber` (base) · `--kora-red` (base) · `--pillar-life` · `--pillar-growth` · `--pillar-connection` · `--pillar-impact` · `--pillar-legacy` · `--status-clear` · `--status-warning` · `--status-flagged` · `--status-ready` · `--status-blocked` (`--status-draft` already marked PROVISIONAL) · **plus an info/link-blue family slot not present in Source A but carrying 196 code occurrences** (§4).

## 7. Implementation impact by decision state

| Decision state | Token definitions changed | Files mechanically remediable | Visual drift risk | WP-088 fully implementable? |
|---|---|---|---|---|
| **Q1-A** (ratify current) | 0 changed; ~29-31 **added** as tints/depths within the warm system | 2,013 / 2,571 literals immediately; remaining 488 once the new tints are defined | **Low** — shipped appearance unchanged; drift risk confined to the 488 substitutions, mitigable with a screenshot baseline | **Yes**, once the ~29-31 tint values are set |
| **Q1-B** (docs/30 Violet family) | Essentially **all** colour tokens change value; ~29-31 slots defined from official source | 0 until the external hex values arrive; then all 2,571 | **High** — the entire product's appearance changes; a screenshot baseline before/after becomes essential | **No**, until designer/Figma supplies the values (external dependency, not in repo) |
| **Q1-C** (defer colour) | 0 | 2,013 / 2,571 (existing-token substitutions only) | **Low** | **No** — DESIGN-001 closes only partially; requires Q2-B to reach COMPLETE |
| **Q2-B** (carve colour out) | as per Q1 | as per Q1 | as per Q1 | **Yes** — WP-088 completable on responsive + non-colour design-system scope, subject to §0.1's authenticated multi-viewport rule |

Under every state, the RESPONSIVE-001 half (chrome responsiveness, 19 table overflows, 14 rigid grids, container/breakpoint standard) is unaffected and unblocked, and §0.1's authenticated 375/768/1440px validation requirement applies to WP-088's completion regardless.

## 8. Git status

Clean. Branch `feature/wp088-responsive-design-system-full-closure` at `4844e27d3da37d865041fba573cf9f39ce5c31c3`, no commits. No application code, test, token, or migration created or modified — this task wrote only this disk-only report.
