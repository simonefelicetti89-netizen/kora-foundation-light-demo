# 282 — KORA-WP-129 Wave 4b Cohort W3B: Founder visual acceptance and publication

Status: PUBLISHED
Date: 2026-09-28
Governing registry: `.kora-audit/output/219_*`
Governing contract: Registry 219 Section A — Founder Review Publication Contract (report `274`)
Executable acceptance authority: Registry 219 `AN.10` (report `277`)

**`KORA-WP-129` remains READY.** W3B is the last planned Worker migration tranche, but its acceptance is
**not** WP129 completion: a separate WP129 OVERALL CLOSURE pass must still review the full Worker
experience across surfaces. **No `AL.2` entry is made. `KORA-WP-131` remains BLOCKED.**

---

## 1. What was published

| | |
|---|---|
| Accepted & proven Product SHA | **`2fd03eab3b1290a8c9e480229b6e35ddadd21e75`** |
| Previous canonical | `e79baf5b1f0bdb1f0f43666c7ff0d1703e7b0be8` (W3A) |
| Surfaces | `/worker/dynamic-cv` · `/worker/dynamic-cv/print` |
| Founder ruling | **W3B VISUAL ACCEPTANCE — GRANTED**, material and exact-SHA bound |

Two commits, fast-forward, 0 behind, no merge/rebase/squash/force:

| SHA | Content |
|---|---|
| `d6ab0630786dcb6dd9dfc6ffaf23b01a25c40c5b` | Dynamic CV + print visual migration |
| `2fd03eab3b1290a8c9e480229b6e35ddadd21e75` | final rail / maturity-language remediation |

Six files: 2 Worker components (1 new, scoped), the print page and its stylesheet, the archetype
declarations, and one test. Zero SQL, migrations, RLS, schema or governance files in the Product delta.

---

## 2. W3B scope

Dynamic CV main surface · Dynamic CV responsive/mobile · Dynamic CV print artifact · final right-rail
remediation · worker-facing maturity-language cleanup · Defect C resolution.

---

## 3. Main Dynamic CV — accepted

The surface was 4104px of cards inside cards with **103 pieces of text below the typographic floor**
(19 at 8px, 40 at 9px, 44 at 10px), and it rendered the same record twice: an "Esperienze" list of 18
cards followed by an "Esperienze badge-ready" list repeating 13 of the same titles. Badge eligibility is
a property of an experience, so it now reads **on** the experience as a chip, and one record reads as
one record. Five near-identical narrative cards became five lines.

Composition is a working column (pillar reading + experiences) plus a rail. Declared **`RECORD_DETAIL`** —
one record and everything true about it. **Subfloor text 103 → 0. Screen 4104 → 2730px. Lint 150 → 5.**

**Pillar treatment — and why it is scoped rather than `KORA-WP-142`.** Both governed encodings were
evaluated and both are semantically wrong here, recorded in the component itself: `ContributionBars`
carries a per-item `assessment`, and the Dynamic CV must never imply one pillar scored better than
another; `DistributionStrip` is a **group** comparison that suppresses below a privacy threshold of ten,
which on a worker's own private record would suppress their data from themselves. What ships is a count
per pillar with a bar scaled to the largest count — no percentage, no normalisation to 100%, no ranking,
no assessment colour. One pillar per row, so the narrow viewport compresses nothing; the legacy
five-column grid squeezed its labels to roughly 7px.

---

## 4. Right rail — final remediation

Five same-weight regions became **three semantic groups**:

1. **Il tuo profilo** — the factual personal reading, with the badge-eligibility count as one line
2. **Esperienze private** — privacy / Product truth, unchanged content
3. **Esporta e condividi** — currently real actions only

Removed, and **not to be reintroduced without separate authorization**: "Badge e credenziali" as a
standalone future/maturity region; "Opzioni di condivisione future"; `In arrivo`; `Pianificato`;
`non attivo in Foundation Light`; `Nessuna condivisione attiva in Foundation Light`; `Pilot+`.

Release maturity is not a fact about a person's CV. One contradiction was closed in passing: the badge
region asserted *"richiedilo su tua iniziativa"* and, three lines later, *"non attivo"* — both could not
be true. The eligibility fact survives; the contradiction does not.

**Every removed string was checked against the test suite before removal.** None was pinned: the only
`In arrivo` references in tests are historical comments about the retired `/my-kora/dynamic-cv` page,
whose live assertions concern it redirecting to the canonical surface. **No test was weakened.**

Mobile 4205 → **3423px**, which also brought the mobile ratio to **1.254**, inside `RECORD_DETAIL`'s
1.35 bound.

---

## 5. Print Dynamic CV — accepted

Before: 77 subfloor elements including **five at 7px**; five compressed pillar boxes; a render-time
"Data stampa" given equal weight to the two real facts; a footer carrying
"KORA Foundation Light · Metodologia v0.1 pre-empirical calibration"; no page margins and no pagination
discipline.

After: masthead → real summary facts → pillar rows → experience table → privacy line. Type 11–32px on
the canonical roles. Real `@page { margin: 16mm }` rather than whatever the printer chose. Table headers
repeat across pages; rows, headings and pillar lines refuse to split. The pillar name is always a word,
never only a hue, so weak colour reproduction loses nothing. Declared **`REPORT_EXPORT`** — an output
that must carry its evidence in full, because shortening it by dropping experiences would be a
falsification. **Subfloor 77 → 0. Lint 38 → 0.**

---

## 6. The three Dynamic CV defects

**Defect A — PUBLISHED / UNCHANGED.** The binding rule stands: **SELECT ONLY WHAT THE CONSUMER READS.**
The print embedded select remains `worker_initiative:initiative_id ( title, pillar )`; nothing was
re-added for convenience. The API route carries **0 diff lines** across the whole W3B chain.

**Defect B — PUBLISHED / UNCHANGED.** One valid document root; no nested `<html>`/`<head>`/`<body>`;
route-scoped print CSS; `dynamic-cv-print-view` present; Worker chrome suppressed only in paged media;
`.px-main` released for printing. The governed composition test passes.

**Defect C — RESOLVED / PUBLISHED.** Resolution, precisely: **the non-semantic render-time `Data stampa`
is removed, and no replacement semantic date was introduced.** It showed the moment the browser
rendered, which is not a fact about the CV — the same unchanged record printed twice showed two
different dates. It reads as data freshness, snapshot date, activity-update date or certification date,
and it is none of them. No test, copy or Product contract required it. **`lastUpdatedAt` was
deliberately NOT introduced**: it would be a new semantic claim, not a visual migration. `Data stampa`
and `new Date().toLocaleDateString('it-IT')` must both remain absent from this surface.

---

## 7. Accepted-surface regression

**0 files** in the canonical→candidate delta touch W1, W2, W3A, the first-access shell, or
`components/layout/`. `/worker/workspace`, `/worker/privacy`, `/worker/bookings`, activity discovery,
commons, opportunities, PIB, KORA Link, onboarding and setup-password are unchanged. No prior Founder
visual acceptance is reopened.

---

## 8. One assertion narrowly superseded

`tests/unit/dynamic-cv-print-document-composition.test.ts` pinned `Profilo Pillar` in title case — an
artifact of a legacy section label uppercased by CSS. Section headings now use the canonical `section`
role, where `meta` is the only uppercase role, so the source reads `Profilo pillar`. The assertion is now
case-insensitive; the Product truth it protects — that the pillar section exists and is named — is
unchanged. Explained at the call site.

---

## 9. Proof CI — exact SHA

| | |
|---|---|
| Branch | `integration/wp129-w3b-proof-2026-09-28` |
| Remote HEAD | `2fd03eab3b1290a8c9e480229b6e35ddadd21e75` — exact, no extra commit |
| Workflow | KORA CI **#362**, run `36477773252`, attempt 1 |
| Event / branch | `push` / the proof branch |
| Tested SHA | `2fd03eab3b1290a8c9e480229b6e35ddadd21e75` |
| Conclusion | **SUCCESS** |

All four mandatory jobs green. Job set **verified identical** to the last accepted canonical run
(`36471953014`, W3A, report `281`) by sorted-name hash `9cd15788df1bf485`.

---

## 10. Canonical integration and canonical CI

Canonical head was **read from the remote, not assumed**, and re-read immediately before the push; both
times `e79baf5`. Fast-forward `e79baf5..2fd03ea`, 2 commits, 0 behind, **0 merge commits**.

| | |
|---|---|
| Canonical branch | `integration/kora-canonical-product-2026-09-22` |
| Previous | `e79baf5b1f0bdb1f0f43666c7ff0d1703e7b0be8` |
| New remote HEAD | `2fd03eab3b1290a8c9e480229b6e35ddadd21e75` |
| Workflow | KORA CI **#363**, run `36478306009`, attempt 1 |
| Event / branch | `push` / canonical |
| Tested SHA | `2fd03eab3b1290a8c9e480229b6e35ddadd21e75` |
| Conclusion | **SUCCESS** — job-set hash `9cd15788df1bf485`, all four green |

Canonical is the exact Founder-accepted candidate. **No additional Product commit was created for
publication** — canonical is 0 commits ahead of the accepted SHA.

---

## 11. Local validation at the accepted candidate

TypeScript exit 0 · Dynamic CV / print / select-contract / privacy / security / tenant-isolation / WP129
**32 files, 1284 passed** · WP073/088/126/139/140/141/142 **10 files, 414 passed** · full suite
**446 files, 14130 passed**, 349 skipped, 5 todo · lint **0 errors** · production build exit 0.

**Governance validation — standing finding preserved unchanged.** `CLAUDE.md` references
`npm run governance:registry-check`; that script is absent from `package.json` and from every ref in this
checkout. No replacement tooling was invented. Validation followed the precedent of reports `279`, `280`
and `281`: local Product validation above, plus mechanical registry assertions — Registry `219` is the
only registry edited, `142` untouched, WP129 status string unchanged, WP namespace unchanged at 144,
AL.2 unchanged at 70.

---

## 12. Residuals carried into the WP129 OVERALL CLOSURE review

Recorded, **not** fixed inside this publication:

1. **One `Foundation Light` occurrence remains in the normal Worker sidebar**, under the `Collettivo`
   item in `components/layout/Sidebar.tsx`. It is **outside W3B**, appears on every Worker surface, and
   `Sidebar.tsx` was explicitly not authorised for modification here. Dynamic CV-owned occurrences are
   **0**. Carried as a **transversal Worker Experience review item**; it was not a publication blocker.
2. Desktop populated Dynamic CV length can exceed the `RECORD_DETAIL` warn threshold — 2730px against
   2500 with 20 real experiences. It is the real length of the record; shortening it would mean hiding
   experiences. Same precedent as W1's accepted `activity-discovery` length WARN.
3. Remaining optical spacing warnings follow the accepted W1/W2 exception precedent.
4. The full Worker experience still requires a final cross-surface closure review before
   `KORA-WP-129 COMPLETE` can be considered.

---

## 13. Registry position — unchanged

`KORA-WP-129` status **READY → READY**. No `AL.2` entry. WP namespace unchanged at `001`–`144`, 144
distinct ids; AL.2 COMPLETE set unchanged at 70. `KORA-WP-131` remains **BLOCKED** — its Hard Deps are
`127`, `128`, `129`, none in AL.2, and this publication changes none of them. **WP129 overall closure has
NOT been performed.** W1, W2 and W3A remain published and accepted. No unrelated package state altered.
Registry `142` untouched.

---

## 14. Safety

`main` unchanged at `70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc`. Production Supabase `azdnepfmwrmacruykskm`
never contacted. No production operations, no staging writes, no schema changes, no migrations, no RLS
changes, no backfills, no migration 090, no Gate-3 publication, no secrets, no PR, no force push. Local
Docker Supabase only, torn down. The local review-fixture commit `1b327c0` remains **unpublished** — not
an ancestor of the accepted SHA, 0 remote refs, 0 fixture files in the published tree. WP117 WIP
preserved exactly on `audit/mega-code-truth-2026-09`, never staged, moved or cleaned, and absent from
both the Product and governance publications.
