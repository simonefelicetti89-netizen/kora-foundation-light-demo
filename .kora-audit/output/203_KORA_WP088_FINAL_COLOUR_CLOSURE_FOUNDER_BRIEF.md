# 203 — KORA-WP-088 Final Colour Closure — Founder Decision Brief

**Decision prep only. No code modified, no tests modified, no commit, no push.**

WP-088 state unchanged: PARTIAL / VALIDATION-BLOCKED at `acead70e8d120d0fccfa43eafc3494a01edb8e20`.

---

## 0. Headline correction to report 202

Report 202 stated that "~488 occurrences belong to six semantic colour families requiring Founder-approved canonical values." **That figure was too pessimistic and is corrected here.** A full per-occurrence audit of all 1,967 literals shows:

- **1,279 occurrences (65%) are already exactly a canonical token value** (`#C76F3D`, `#06032B`, `#F8F6F1`, `#9E3B2F`, `#8A5A00`, `#2F7D55`, `#D99A2B`, `#FFFFFF`, `#B5512E`, `#211F1A`, `#6156F5`, …). They are literals of colours the system has already ratified. **Zero Founder decisions.** Report 202 undercounted this because it measured only inline-style JS values; 1,088 of these live in Tailwind arbitrary-value class strings (`bg-[#06032B]`), which `app/globals.css` already mirrors as CSS custom properties (`var(--kora-ink)`), so they are mechanically convertible too.
- Only **174 occurrences (8.8%)** across **73 files** genuinely depend on a Founder decision.
- Only **5 semantic slots** are actually undecided — not six families needing invented values, and **none requires a hex that does not already exist in the repository.**

Two further corrections to 202 are recorded in §6.

---

## 1. TASK 1 — The unresolved semantic families

Five slots. Each is a real semantic role with no canonical token, and each already has a dominant in-repo value.

### SLOT 1 — INFORMATIONAL / IN-PROCESS state (and inline links)

| | |
|---|---|
| **Purpose** | The fourth badge state beside success / warning / critical: *in lavorazione, in attesa, iscritto, demo, preview, non applicabile, contesto reporting*. Also the colour of inline text links. |
| **Occurrences** | **109** as hex, across **48 files** — plus **157 further occurrences** in `rgba()` form (`rgba(43,92,230,…)` ×54, `rgba(59,110,186,…)` ×36, `rgba(74,127,224,…)` ×67) that the hex ratchet does not count. True footprint ≈ **266**. |
| **Representative values** | `#3B6EBA` (35) · `#1E4A8A` (22) · `#4A7FE0` (11) · `#3B5A8A` (8) · `#1B2A4A` (7) · `#1E4DA0` (6) · `#3B82F6` (6) · `#2563EB` (4) · `#0C4A6E` (4) · `#1D4ED8` (3) · `#2B5CE6` (2) · plus 7 more |
| **Variation** | 18 distinct values, H 202–224°, L 11–97%. Three sub-roles at three depths: a mid base (L≈48%), an on-tint text depth (L≈33%), a surface tint (L≈93–97%). |
| **Where** | All five environments. `worker/workspace` (8), `company/contribution` (7), `company/workspace/DataSubmissionSection` (7), `company/data/upload` (5), `worker/bookings` (5), `commons/AdminBookingModerationSection` (5), `admin/trial-control-center` (4), `worker/dynamic-cv` (4), `lib/commons/types.ts`, `lib/live/contribution-lineage.ts`, … |
| **Nature** | **Interactive + informational status.** Both. |

### SLOT 2 — Solid dark-button hover

| | |
|---|---|
| **Purpose** | Hover state of the primary *ink* button (`background #06032B`), used for every "conferma / invia / crea" action in the admin and company consoles. |
| **Occurrences** | **24**, across **12 files** |
| **Representative values** | `#1A1756` — **the only value in use** |
| **Variation** | None. 24/24. |
| **Where** | `company/workspace/DataSubmissionSection` (6), `admin/companies/new` (3), `admin/data-intake` (3), `admin/uef-review` (3), `admin/tenants` (2), + 7 files ×1 |
| **Nature** | **Interactive.** |

### SLOT 3 — Soft warm inset panel

| | |
|---|---|
| **Purpose** | The recessed "explanatory / placeholder / methodology note" panel inside a card — always drawn as `background X` + `1px dashed TOKENS.inkBorder` + `TOKENS.cardRadiusSm`. Distinct from `canvas` (the page) and `surface` (the card). |
| **Occurrences** | **30**, across **18 files** |
| **Representative values** | `#FFFAF5` — **the only value in use** |
| **Variation** | None. 30/30. |
| **Where** | Admin intelligence surfaces (`activation-signal-pipeline`, `kora-activation-layer`, …) and company explainer panels |
| **Nature** | **Structural / surface.** |

### SLOT 4 — KORA Index macroblock categorical series

| | |
|---|---|
| **Purpose** | The four KORA Index v3 macroblocks (REACH 25% / QUALITY 30% / EQUITY 25% / BTI 20%) rendered as four mutually distinguishable series. |
| **Occurrences** | **5** hex, **1 file** (`app/company/wallboard/_components/WallboardClient.tsx`) — but it is a *methodology-level* identity, so it will propagate to every KORA Index surface |
| **Representative values** | REACH `#3B6EBA` · QUALITY `TOKENS.success` (already canonical) · EQUITY `#7C3D8F` · BTI `#C07D2A` |
| **Variation** | One mapping in use; 3 of its 4 values are non-canonical |
| **Where** | Company wallboard; by design, wherever the 10-component breakdown is shown |
| **Nature** | **Informational / data visualisation.** |

### SLOT 5 — KORA lime `#C8FF47`

| | |
|---|---|
| **Purpose** | The "KORA lime" accent. `lib/decision-pack/html-template.ts` (an exempt file) documents it in its own header as a KORA brand colour — *"#C8FF47 — KORA lime (single dot, cover only)"* — and uses it for the Decision Pack cover dot and the KORA Contribution score. It has leaked into two in-app badges. |
| **Occurrences** | **6**, across **2 files** (`admin/data-intake/DataIntakeStudio`, `admin/CompanyEvidenceArchivePanel`) — both the same badge pattern |
| **Representative values** | `#C8FF47` (4) · `#D4FF6B` (2, its text shade) |
| **Variation** | 2 values, one role |
| **Where** | "Synthetic data only" / "No operational actions" badges |
| **Nature** | **Decorative / labelling.** |

**Not collapsed:** Slot 1 and Slot 4 both currently use `#3B6EBA`, and Slot 1's surface tint and Slot 3's panel are both near-white. They are kept apart because their roles differ (status vs. series; cool inset vs. warm inset). Slot 2 is kept apart from `BUTTON_TOKENS.primary.hover` because that token is the *terracotta* button's hover, not the ink button's.

---

## 2. TASK 2 — Current code consensus

| Slot | DOMINANT_VALUE_EXISTS | Dominant hex | Share | Nearest secondary | Ratification or redesign? |
|---|---|---|---|---|---|
| 1 — Info / link | **YES** (as a 3-depth family) | base `#3B6EBA`, on-tint text `#1E4A8A`, tint base `rgb(43,92,230)` | 35/109 = 32% base · 22/109 = 20% text · the `rgba(43,92,230,0.08)` badge tint is the single most repeated *pattern* (54 uses) | `#4A7FE0` (11), `#3B5A8A` (8), `#1B2A4A` (7) — all the same hue ±8° | **Ratification.** No value is invented; the family already behaves like the existing `warning`+`safeguard.watch.text` pair (a base plus a darker on-tint text). |
| 2 — Ink button hover | **YES** | `#1A1756` | **24/24 = 100%** | none | **Pure ratification.** |
| 3 — Warm inset panel | **YES** | `#FFFAF5` | **30/30 = 100%** | none | **Pure ratification.** |
| 4 — Macroblock series | **YES (one mapping)** | `#3B6EBA` / `success` / `#7C3D8F` / `#C07D2A` | 1 mapping, 100% of sites | none | Ratifying it **imports two non-warm hues** (`#3B6EBA` blue, `#7C3D8F` purple) into the methodology identity. That is a product decision, not a mechanical one. |
| 5 — KORA lime | **YES** | `#C8FF47` | 4/6 (its text shade `#D4FF6B` the other 2) | none | **Ratification of an already-documented KORA brand colour** — but it currently lives only in an exempt export template, never in the token source. |

No slot returns NO.

---

## 3. TASK 3 — Existing-token reuse test

Tested against `TOKENS`, `KORA_COLORS`, `PILLAR_COLORS`, `PILLAR_SURFACE`, `STATUS_COLORS`, `BUTTON_TOKENS`, `BADGE_TOKENS`, `CHART_COLORS`, `ACTIVATION_SIGNATURE`.

| Family | Verdict | Reason |
|---|---|---|
| Success/green tints (97 occ, 33 files) | **REUSE_EXISTING_TOKEN** | `BADGE_TOKENS.eligible` already is the exact triad (`rgba(47,125,85,0.10)` / `#2F7D55` / `rgba(47,125,85,0.25)`). The literals are Tailwind's green scale doing the same job. |
| Critical/red tints (42 occ, 17 files) | **REUSE_EXISTING_TOKEN** | `BADGE_TOKENS.blocked` + `TOKENS.critical` + `safeguard.cap`. |
| Warning/amber tints (108 occ, 37 files) | **REUSE_EXISTING_TOKEN** | `BADGE_TOKENS.limited` + `TOKENS.warning` + `safeguard.watch` (`#8A5A00` is already the canonical on-amber text). |
| Neutral slate/grey (61 occ, 26 files) | **REUSE_EXISTING_TOKEN** | The ink opacity scale (`inkSecondary/Tertiary/Hint/Border`) plus `surface`/`taupe` cover every use. |
| Violet interaction residue (107 occ, 25 files) | **REUSE_EXISTING_TOKEN** | See §6.2 — these are rebrand leftovers with canonical answers already in the file. |
| Non-canonical pillar maps (19 occ, 2 files) | **REUSE_EXISTING_TOKEN** | `PILLAR_COLORS` / `PILLAR_SURFACE`. |
| **Slot 1 — info/link** | **NEW_SEMANTIC_SLOT_REQUIRED** | No token carries "informational / in-process". `BADGE_TOKENS.draft` is the grey *draft* state — forcing reuse would make "in lavorazione" and "bozza" visually identical, which is a semantic loss, not a cleanup. `TOKENS.violet` is a brand micro-accent explicitly scoped "sparingly only", not a status colour. |
| **Slot 2 — ink button hover** | **NEW_SEMANTIC_SLOT_REQUIRED** | `BUTTON_TOKENS.secondary.hover` is `rgba(6,3,43,0.04)` — a tint for a *transparent* button, invisible on a solid `#06032B` fill. `BUTTON_TOKENS.primary.hover` is terracotta. Neither fits. |
| **Slot 3 — warm inset panel** | **NEW_SEMANTIC_SLOT_REQUIRED (weakest case)** | `surface` `#F8F6F1` is the card itself; an inset drawn in the card's own colour loses the recess. `ACTIVATION_SIGNATURE.canvas` `#F6F4EF` is reserved for the Signature/Link negative variant. Reuse is *possible* — see Option B — at the cost of the visual distinction. |
| **Slot 4 — macroblock series** | **NEW_SEMANTIC_SLOT_REQUIRED** | `CHART_COLORS` has `primary`/`secondary` and three *semantic* series (positive/warning/critical). There is no 4-way *categorical* set, and reusing the semantic three would say "QUALITY is good, BTI is a warning", which is false. |
| **Slot 5 — KORA lime** | **REUSE_EXISTING_TOKEN available** | `BADGE_TOKENS.synthetic` is literally the "synthetic data" badge and covers both sites exactly. The only question is whether the Founder wants lime to *become* a token instead. |

---

## 4. TASK 4 — Founder decisions

Five. No option below uses a hex that is not already in the repository.

---

### SLOT 1 — INFORMATIONAL / IN-PROCESS STATE (+ inline links)

**What it means.** The fourth status colour. Today the product says "in lavorazione", "iscritto", "in attesa di revisione", "preview", "demo" in blue, and draws inline links in the same blue. The ratified warm system has no such role.

**Current product truth.** Base `#3B6EBA` (35). On-tint text `#1E4A8A` (22). Badge tint `rgba(43,92,230,0.08)` with `rgba(43,92,230,0.20)` border (54 uses). 18 distinct values, one hue band.

**OPTION A — ratify the existing blue as a canonical fourth status family.**
Exact hexes: base `#3B6EBA`, on-tint text `#1E4A8A`, tint/border derived at the alpha levels the token file already uses (`rgba(59,110,186,0.08)` / `rgba(59,110,186,0.22)`).
*Factual consequence:* 109 hex + ~157 rgba occurrences collapse to one token group. A cool blue is formally admitted into the canonical palette alongside the warm system — the first non-warm semantic colour. 16 blue variants disappear; the visual result is near-identical to today because `#3B6EBA` is already the most common of them. Links stay blue.

**OPTION B — use `TOKENS.violet` `#6156F5` as the informational colour.**
Exact hex: `#6156F5` (base), with `#3B30C9` (already in repo, 4 uses) as the on-tint text depth.
*Factual consequence:* no new colour enters the system — violet is already an official brand colour. But it is currently scoped "secondary digital micro-accent — sparingly only"; applying it to ~266 status/link sites makes it a high-frequency UI colour, which is a change to violet's stated role. It would also sit adjacent to the terracotta accent on many screens.

**OPTION C — collapse the role into `BADGE_TOKENS.draft` (grey) and make links `TOKENS.accent`.**
Exact hexes: `rgba(6,3,43,0.06)` / `rgba(6,3,43,0.62)` / `rgba(6,3,43,0.12)` for the badge; `#C76F3D` for links.
*Factual consequence:* the palette becomes fully warm, with zero blue anywhere. Cost: "in lavorazione" and "bozza" render identically, so the UI loses a distinction it currently makes in ~266 places; users cannot tell an in-flight batch from an unsubmitted one by colour alone.

---

### SLOT 2 — SOLID DARK-BUTTON HOVER

**What it means.** What the `#06032B` primary-ink button turns into on hover. 24 sites, all the same value today.

**Current product truth.** `#1A1756`, 100%.

**OPTION A — ratify `#1A1756`.**
*Factual consequence:* zero visual change; one token added; 24 literals removed. The value is `#06032B` lightened, consistent with how `BUTTON_TOKENS.primary.hover` `#B5602E` relates to `#C76F3D`.

**OPTION B — reuse `TOKENS.accent` `#C76F3D` as the ink button's hover.**
*Factual consequence:* ink buttons would flip to terracotta on hover. No new value. Visually louder, and it would make the ink button and the terracotta primary button hard to tell apart mid-interaction.

---

### SLOT 3 — SOFT WARM INSET PANEL

**What it means.** The recessed explanatory panel inside a card. 30 sites, all the same value.

**Current product truth.** `#FFFAF5`, 100%.

**OPTION A — ratify `#FFFAF5`.**
*Factual consequence:* zero visual change; one token; 30 literals removed. It is a warm off-white already consistent with `canvas`/`surface`/`F6F4EF`.

**OPTION B — reuse `TOKENS.surface` `#F8F6F1`.**
*Factual consequence:* no new token at all; the 30 sites become the same colour as the card that contains them, so the inset reads only by its dashed border. Cheapest option; a small, real loss of depth.

**OPTION C — reuse `ACTIVATION_SIGNATURE.canvas` `#F6F4EF`.**
*Factual consequence:* no new value, keeps a visible step from `surface`. Cost: that token is currently reserved to the Activation Signature / KORA Link system, so reusing it widens its meaning.

---

### SLOT 4 — KORA INDEX MACROBLOCK SERIES

**What it means.** The four macroblocks of KORA Index v3 need four distinguishable colours wherever the breakdown is drawn.

**Current product truth.** REACH `#3B6EBA` · QUALITY `#2F7D55` (canonical) · EQUITY `#7C3D8F` · BTI `#C07D2A`.

**OPTION A — ratify the current four.**
Exact hexes: `#3B6EBA`, `#2F7D55`, `#7C3D8F`, `#C07D2A`.
*Factual consequence:* zero visual change. Admits a blue and a purple into the methodology's visual identity. `#7C3D8F` is the only purple in the product and has no other role.

**OPTION B — map the four onto existing canonical KORA colours.**
Exact hexes: REACH `#C76F3D` (accent) · QUALITY `#2F7D55` (success) · EQUITY `#D99767` (CONNECTION) · BTI `#D99A2B` (IMPACT).
*Factual consequence:* fully warm, no new value. Two costs, both real: (a) `#D99767` and `#D99A2B` are adjacent warm ambers and are harder to separate side by side than blue/purple are; (b) it reuses two **pillar** colours for **macroblocks**, so the same colour would mean CONNECTION in one chart and EQUITY in the next — a semantic collision in a product whose pillars are constitutional.

**OPTION C — REACH `#C76F3D` (accent) · QUALITY `#2F7D55` (success) · EQUITY `#8A7562` (LEGACY taupe) · BTI `#D99A2B` (IMPACT).**
*Factual consequence:* better separation than Option B (taupe vs amber), still fully warm, still no new value, but it carries the same pillar/macroblock collision for two of the four.

---

### SLOT 5 — KORA LIME `#C8FF47`

**What it means.** Whether "KORA lime" is a real brand token or an artefact of the Decision Pack export template.

**Current product truth.** Declared a KORA brand colour in `lib/decision-pack/html-template.ts`; used there for the cover dot and the KORA Contribution score; leaked to 2 in-app badges (6 occurrences).

**OPTION A — promote `#C8FF47` into `lib/design/kora-design-tokens.ts` as a named brand accent.**
*Factual consequence:* the Decision Pack and the app finally share one source for it. The token file gains a high-chroma lime, which is the most visually distant value in the KORA system.

**OPTION B — reuse `BADGE_TOKENS.synthetic`, leaving lime only in the export template.**
Exact hexes: `rgba(199,111,61,0.10)` / `#C76F3D` / `rgba(199,111,61,0.28)`.
*Factual consequence:* 6 literals removed, no token added, the two badges become the existing synthetic-data badge — which is exactly what they label. Lime stays confined to the exempt Decision Pack artefact, unchanged.

---

**NEW HEX DESIGN DECISION REQUIRED: none.** Every slot has at least one option built entirely from values already present in the repository.

---

## 5. TASK 5 — All 1,967 occurrences classified

| | Category | Occurrences | Files |
|---|---|---|---|
| **A** | Mechanically remediable with **existing** tokens — no Founder input | **1,695** | 172 |
| **B** | Mechanically remediable **after** a Founder slot decision | **174** | 73 |
| **C** | Valid exception | **16** | 9 |
| **D** | Out-of-scope / deferred | **6** | 1 |
| **E** | True unresolved visual-design debt | **76** | 2 |
| | **TOTAL** | **1,967** | |

**A — 1,695** breaks down as:

| Sub-group | Occ | Files | Target |
|---|---|---|---|
| Already exactly a canonical token value | 1,261 | 128 | `TOKENS` / `KORA_COLORS` / `PILLAR_COLORS` / `ACTIVATION_SIGNATURE`, or `var(--kora-*)` for the 1,088 in Tailwind class strings |
| Warning/amber tint scale | 108 | 37 | `BADGE_TOKENS.limited`, `TOKENS.warning`, `safeguard.watch` |
| Violet/indigo interaction residue | 107 | 25 | `TOKENS.accentSoft`, `BUTTON_TOKENS.primary.hover`, ink scale |
| Success/green tint scale | 97 | 33 | `BADGE_TOKENS.eligible`, `TOKENS.success` |
| Neutral slate/grey scale | 61 | 26 | ink opacity scale, `surface`, `taupe` |
| Critical/red tint scale | 42 | 17 | `BADGE_TOKENS.blocked`, `TOKENS.critical` |
| Non-canonical pillar maps still present | 19 | 2 | `PILLAR_COLORS` / `PILLAR_SURFACE` |

**B — 174:** Slot 1 info/link 109 · Slot 3 warm inset 30 · Slot 2 ink hover 24 · Slot 5 lime 6 · Slot 4 macroblock 5.

**C — 16:**
- **4** are not colours at all — HTML numeric character entities (`&#128274;` 🔒, `&#128279;` 🔗) matched by the `#[0-9A-Fa-f]{6}` ratchet regex in `app/worker/privacy/…`, `app/worker/commons/page.tsx`, `app/cv/share/[token]/page.tsx`, `app/admin/preview/worker/privacy/page.tsx`. A permanent false positive in the ratchet's own count.
- **12** are in the five error boundaries (`app/error.tsx`, `app/global-error.tsx`, `app/{admin,worker,company}/error.tsx`). `global-error.tsx` replaces the root layout when the app has failed; it cannot rely on the app's CSS variables or module graph, so self-contained literals are correct there. The sibling boundaries follow the same pattern.

**D — 6:** `components/brand/KoraLogo.tsx`. Brand-mark geometry and fill. Founder instruction for WP-088 excludes brand-asset regeneration.

**E — 76:** `app/admin/impact-units/_components/ImpactUnitsExplorer.tsx` (**75**) plus one stray in `components/auth/PrivilegedAccessBanner.tsx`. The Impact Units Explorer is rendered as a **dark slate developer console** — `background #1e293b`, `color #e2e8f0`, `border #334155`, slate KPI accents — a complete alternate theme, not a set of stray literals. Bringing it into the KORA system is a screen redesign decision (does an internal diagnostic surface keep a console look?), not a token mapping. It is the only true visual-design debt left, and it is one screen.

**What this answers.** Yes — WP-088 can reach DESIGN-001 CLOSED **without another aesthetic design exercise.** 1,695 of 1,967 need no decision at all; 174 need five ratifications of values the product already uses; 22 are legitimate exceptions or out of scope. Only 76 occurrences on one internal admin screen constitute genuine open visual-design debt, and that screen can be scoped out explicitly or redesigned as its own small item.

---

## 6. Corrections to report 202 found during this audit

**6.1 — Pillar closure is not 100%.** Report 202 §7 said 24 local pillar maps were resolved and "0 remain." **Two files still carry a non-canonical pillar palette** and were missed because the guard's regex matches the object-literal shape, not these forms:

- `app/admin/preview/worker/dynamic-cv/page.tsx` — `GROWTH '#3B6EBA'`, `CONNECTION '#7C3D8F'`, `IMPACT '#C07D2A'`, `LEGACY '#5A4A3F'`, and `LIFE` bound to `TOKENS.success` (green, where canonical LIFE is terracotta)
- `app/worker/onboarding/_flow.tsx` — `LIFE '#16a34a'`, `GROWTH '#2563eb'`, `CONNECTION '#9333ea'`, `LEGACY '#ca8a04'`

19 occurrences, category A, no Founder decision needed — but report 202's pillar claim should be read as "24 of 26", not "all". The guard should also be widened in the same pass.

**6.2 — The violet residue is a defect, not a design question.** 107 occurrences are leftovers from the violet→terracotta rebrand, and each has a canonical answer already in the token file:
- `bg-[#C76F3D] … hover:bg-[#4f44e0|#4d48d0|#4a41d4|#4b40c8|#4d43d4|#a55a2e]` — **10 terracotta buttons that turn violet on hover.** `BUTTON_TOKENS.primary.hover` = `#B5602E` already exists and is the correct value.
- `border-[#C76F3D] bg-[#f5f4ff]` — **12 selected cards with a terracotta border on a violet-tinted surface.** `TOKENS.accentSoft` = `rgba(199,111,61,0.12)` is the correct surface.

These are visible inconsistencies in the shipped product today, not open decisions.

---

## 7. TASK 6 — Post-decision implementation size

Assuming all five slots resolved:

| | |
|---|---|
| Files still needing edits | **175** (172 in A + 73 in B, overlapping) |
| Literal occurrences removable | **1,869** of 1,967 (A 1,695 + B 174) → ratchet would fall to ~**98** occurrences across ~11 files |
| Tokens to add | **0 to 5**, depending on the options chosen. Maximum: `TOKENS.info` (a base/text/bg/border group), `BUTTON_TOKENS.ink.hover`, `TOKENS.inset`, `MACROBLOCK_COLORS` (a 4-entry map), `KORA_COLORS.LIME`. Choosing the reuse option in Slots 3 and 5 and Option B/C in Slot 4 reduces this to 2. |
| DESIGN-001 then mechanically closable? | **YES**, provided the residual 76 on `ImpactUnitsExplorer.tsx` are either redesigned in the same pass or explicitly scope-excluded by Founder decision the way Living KORAL and Future Vision already are. Without one of those two, the gap stays OPEN on one screen. |
| Expected effort | **LARGE by volume, TINY by design.** 175 files and ~1,869 substitutions — but every one is a mechanical value→token mapping with no aesthetic judgement, using the technique already proven in commit `3a3ca9a`. The one genuinely new mechanic is converting Tailwind arbitrary values (`bg-[#06032B]` → `bg-[var(--kora-ink)]`), which works because `app/globals.css` already mirrors 22 tokens as CSS custom properties. Best executed as 4–6 bounded batches with the ratchet tightened after each. |

---

## 8. TASK 7 — Responsive validation path

**No runtime was modified.** The infrastructure needed is mostly already built.

**Already in place:**
- Playwright 1.60 with `playwright.config.ts` and a working `tests/e2e/` suite.
- `tests/e2e/authenticated-smoke.spec.ts` already performs authenticated login and workspace reachability for **KORA_ADMIN**, **COMPANY_A** and **COMPANY_B**, skipping cleanly (never failing) when credentials are absent.
- `tests/e2e/helpers/env.ts` reads credentials only from `process.env`, never logs values, and returns `null` when unset.
- **`E2E_BASE_URL` is wired to Playwright's actual navigation target** (GOLDEN-03B), and the config deliberately skips starting a local dev server when it is set. A deployed URL is therefore already a supported target — this is the decisive fact.

**Missing — the smallest possible closure path, in order:**

1. **Credentials (Founder / authorized environment — the only true blocker).** `E2E_KORA_ADMIN_*` and `E2E_COMPANY_A_*` must be supplied in the authorized environment. **Not fabricable, and nothing in this brief works around that.**
2. **Three role getters.** `env.ts` has no Worker / Partner / Advisor credentials. Three more readers (`E2E_WORKER_*`, `E2E_PARTNER_*`, `E2E_ADVISOR_*`) plus their smoke cases — ~40 lines, same pattern as the existing three.
3. **Three viewport projects.** `playwright.config.ts` defines one project (Desktop Chrome). Add `mobile-375` / `tablet-768` / `desktop-1440` via `use: { viewport: … }`. ~15 lines. This is what actually turns the existing smoke suite into the Founder's 375 / 768 / 1440 evidence.
4. **Preview-URL guard.** `guardBaseUrl()` conservatively treats any non-localhost host as production-like and blocks unless `E2E_ALLOW_PRODUCTION=true`. A Vercel Preview URL is not production, so either set that flag deliberately for the run, or teach the guard to recognise `*.vercel.app` preview hosts. Prefer the flag for a one-off validation; prefer the guard change if this becomes routine.
5. **Deployment Protection bypass.** A protected Vercel Preview needs a bypass token (`x-vercel-protection-bypass`) supplied as an extra HTTP header, or protection disabled for that deployment.

**Answer to the question asked:** **YES — authenticated 375/768/1440 validation across all five role environments can be performed after push against a Vercel Preview deployment, provided the five sets of credentials are supplied through the normal authorized environment.** Items 2–5 are small, bounded code/config changes; item 1 is the only thing that cannot be solved from inside the repository. No attempt was made to repair the Claude Vercel MCP.

---

## 9. Confirmations

Code modified: **NO.** Tests modified: **NO.** Commit: **NO.** Push: **NO.** Staging and production untouched. Original dirty worktree never accessed. Deferred Living KORAL renderer untouched. WP-118 / WP-119 / Package B not started.
