# 280 — KORA-WP-129 Dynamic CV Defects A and B: Founder acceptance and bug-fix publication

Status: PUBLISHED
Date: 2026-09-28
Governing registry: `.kora-audit/output/219_*`
Governing contract: Registry 219 Section A — Founder Review Publication Contract (report `274`)
Executable acceptance authority: Registry 219 `AN.10` (report `277`)

**`KORA-WP-129` remains READY.** This is a narrow **bug-fix publication** on the frozen Dynamic CV surfaces.
It is NOT WP129 completion, NOT a migration cohort, NOT Dynamic CV visual acceptance, and NOT the start of W3.
**No `AL.2` entry is made.**

---

## 1. What was published

| | |
|---|---|
| Accepted & proven Product SHA | **`06874e264414d209b0906be3ef562058c7f42f18`** |
| Previous canonical | `e8a408646a32c2515f4c6d739e183242ad543c70` |
| Surfaces | `/api/worker/dynamic-cv` · `/worker/dynamic-cv/print` |
| Founder ruling | **ACCEPT BUG-FIX PUBLICATION**, scope-limited |

Three commits, fast-forward, no merge/rebase/squash/force:

| SHA | Defect |
|---|---|
| `099b5d5ddd93a5b74f462e98beffcd900fdc2900` | A — API route embedded select |
| `753ae420fc3778824d7b52e0844c34f23e7705a8` | A — print route embedded select |
| `06874e264414d209b0906be3ef562058c7f42f18` | B — print document composition |

Eight files: 2 Product runtime files, 1 new route-scoped stylesheet, 2 test files, 3 archived diagnostic captures.
Zero SQL, zero migrations, zero RLS, zero schema, zero governance files in the Product delta.

---

## 2. Defect A — phantom columns in two independent consumers

Two files embedded `personal.worker_initiative` through `personal.worker_participation`, each with its own
hand-written select. Between them they named **four columns that do not exist on that table**:

| column | where it actually lives |
|---|---|
| `delivery_mode` | `network.partner_profile`, migration `010` |
| `action_family` | UEF/ingestion domain, migration `001` |
| `is_mandatory` | **no migration at all** |

PostgREST rejects the **entire embedded resource** when one named column is absent. The API route therefore
returned HTTP 500 for every worker with a participation row; the print route returned HTTP 200 and silently
rendered zero experiences, because it tolerates a null result. The nullish fallbacks in both files were written
to guard a missing **value**, which cannot guard a missing **column** — which is why the defect survived every
review that read the code rather than ran it.

**Correction: removal, not substitution.** Every dropped column was one the consumer never read. Substituting a
real column would have invented a schema dependency neither file has. `is_mandatory` is optional in
`CVClassificationInput` and read at exactly one falsy-guarded site, so omission and `false` are behaviourally
identical. `category` now reads the initiative title, which `dynamic-impact-cv-policy.ts` documents as a
sanctioned source ("action_family **or** initiative title"). `provider` stays unexposed: a bug fix must not
enrich an API.

**Binding principle recorded: SELECT ONLY WHAT THE CONSUMER READS.** `delivery_mode`, `mode`, `action_family`
and `is_mandatory` must not be re-added to either consumer without separate authorization.

Published selects:

```
app/api/worker/dynamic-cv/route.ts   worker_initiative:initiative_id ( title, pillar, mode, eligibility_class )
app/worker/dynamic-cv/print/page.tsx worker_initiative:initiative_id ( title, pillar )
```

---

## 3. Defect B — the print page owned a second document

`app/worker/dynamic-cv/print/page.tsx` declared its own `<html>`, `<head>` and `<body>` while already rendering
inside the root layout's document and the Worker shell. A document root nested inside `<body>` is invalid, so the
browser's parser discarded it and everything it contained.

The consequence that broke the feature outright is easy to miss: **the `@media print` rules lived inside that
discarded `<head>`**, so they never reached the CSSOM. Cmd+P printed the application shell over a blank sheet —
the one thing the route exists to do was the one thing it could not do.

Server output was never the problem. It carried the complete artifact both before and after. Only the browser's
view of it was destroyed, which is why the defect survived every server-side check.

**Remediation:** the page contributes ordinary page markup; print rules moved to `print.module.css`, a
route-scoped CSS module — the mechanism this repo already uses for page-owned styling
(`app/landing.module.css`, `app/pilot/pilot.module.css`) and the smallest one that actually ships. Three of the
six published rules exist because the page now prints **inside a flex shell with a scrollport** and could not
have been written before, when it printed against a bare document.

---

## 4. Runtime proof — local, synthetic fixture, production build, three canonical viewports

| | before | after |
|---|---|---|
| nested `<html>`/`<head>`/`<body>` in DOM | 2 / 2 / 2 (server) → discarded | **1 / 1 / 1** |
| React pageerrors | 1 — hydration `#418` `args[]=HTML` | **0** |
| console errors | 0 | **0** |
| `dynamic-cv-print-view` in DOM | absent | **present** |
| experience rows in DOM | 0 | **2 + header** |
| Attività tracciate | not rendered | **2** |
| Pillar attivi | not rendered | **2** |
| `@media print` in CSSOM | 0 blocks | **1 block, 6 rules** |
| `.px-top` / `.px-nav` in paged media | printed | **`display:none`** |
| `.px-main` overflow-y in paged media | `auto` (clips to one page) | **`visible`** |
| worker layout min-height in paged media | `900px` | **`0px`** |
| body background in paged media | `rgb(239,235,226)` | **`rgb(255,255,255)`** |

HTTP 200, final URL `/worker/dynamic-cv/print`, no redirect, at 1440×900, 1200×900 and 767×812.

Defect A was isolated by a same-fixture A/B across a rebuild: server render carried **0** initiative titles and
"Attività tracciate 0" before, **2** and "2" after, while the nested-document counts and the `Data stampa` value
were byte-identical on both sides — proving A and B are independent.

**Method stated precisely:** deterministic `print` media emulation in the browser, the same CSS state Cmd+P
applies. A physical printer and the OS print-preview dialog were **not** tested.

---

## 5. Founder ruling — scope of acceptance

Founder accepted exact candidate `06874e2` for **BUG-FIX PUBLICATION ONLY**.

This acceptance means the Defect B remediation is visually safe to publish and introduced no blocking visual
defect, and that the print route may be published in its current **legacy** visual state.

This acceptance explicitly does **NOT** mean: final Dynamic CV visual acceptance; final print design acceptance;
WP129 completion; W3B completion; typography, spacing, archetype or responsive acceptance; or approval of the
current legacy visual debt.

---

## 6. Legacy visual debt — carried forward to W3B, NOT resolved here

The remediation made the surface visible for the first time. What it exposed is the unmigrated legacy styling,
none of which this publication introduced or touched:

- inline type at 7–10px, below both the `KORA-WP-139` 11px `meta` floor and the 12px reading floor
- ad-hoc spacing outside the `KORA-WP-141` scale
- no archetype composition declared for either Dynamic CV surface
- compressed five-column pillar grid at 767px, labels at roughly 7px
- final hierarchy not migrated

---

## 7. Defect C — remains open

`Data stampa` is untouched. Implementation remains `new Date().toLocaleDateString('it-IT')`.

Evidence narrowed it but did not close it: no independent hydration mismatch reproduces; the value is computed in
a **server component on a dynamic route** with no client counterpart, so a client/server divergence is impossible
by construction; five repeated server renders were byte-identical. It is now observable in the DOM for the first
time. What remains is a **contract** question — should a printed Dynamic CV carry a render-time date at all,
given it makes the artifact non-reproducible.

**Status: C6 / CONTRACT AMBIGUOUS — OPEN, deferred to W3B.**

---

## 8. Proof CI — exact SHA

| | |
|---|---|
| Branch | `integration/wp129-dynamic-cv-defect-b-proof-2026-09-28` |
| Remote HEAD | `06874e264414d209b0906be3ef562058c7f42f18` — exact, no extra commit |
| Workflow | KORA CI **#358**, run `36458167612`, attempt 1 |
| Event / branch | `push` / the proof branch |
| Tested SHA | `06874e264414d209b0906be3ef562058c7f42f18` |
| Conclusion | **SUCCESS** |

All four mandatory jobs green: TypeScript/tests/build/lint (blocking) · E2E golden path · E2E smoke ·
DB-backed gate (RLS-03/05/06 + KORA Link behavioral suite).

The mandatory job set was **verified identical** to the set used by the accepted W2 canonical publication
(run `36347479906`) by sorted-name hash `9cd15788df1bf485` — no new acceptance standard was invented.

---

## 9. Canonical integration and canonical CI

Canonical head was **read, not assumed**, immediately before the push and again confirmed as `e8a4086`.
Fast-forward `e8a4086..06874e2`, 3 commits, no merge, rebase, squash, cherry-pick or force.

| | |
|---|---|
| Canonical branch | `integration/kora-canonical-product-2026-09-22` |
| Previous | `e8a408646a32c2515f4c6d739e183242ad543c70` |
| New remote HEAD | `06874e264414d209b0906be3ef562058c7f42f18` |
| Workflow | KORA CI **#359**, run `36458662354`, attempt 1 |
| Event / branch | `push` / canonical |
| Tested SHA | `06874e264414d209b0906be3ef562058c7f42f18` |
| Conclusion | **SUCCESS** — job-set hash `9cd15788df1bf485`, all four green |

Canonical is the exact Founder-reviewed candidate. No additional Product commit was created for publication.

---

## 10. Local validation at the accepted candidate

TypeScript `tsc --noEmit` exit 0 · targeted Dynamic CV / policy / privacy / security / tenant-isolation suites
**27 files, 1159 passed** · full suite **445 files, 14116 passed**, 349 skipped, 5 todo · lint **0 errors**
(warnings are the repo-wide legacy baseline; the print file's count was unchanged at 40 before and after) ·
production build exit 0.

**Zero existing test files were modified.**

Two regression tests were added, both structural and database-free (no new `*_ALLOW_RUN` gate, so the R0-A
invariant is untouched):

- `tests/unit/dynamic-cv-embedded-select-contract.test.ts` — runs over a **list of consumers**, parsing each
  embedded select and cross-checking every column against the maintained `WorkerInitiativeRow` contract, and
  asserting no consumer selects a column it does not read. The list exists because correcting one consumer while
  an identical stale select survived in another is exactly how Defect A reached a second file.
- `tests/unit/dynamic-cv-print-document-composition.test.ts` — asserts the page declares no `<html>`/`<head>`/
  `<body>` and ships no inline `<style>`, that the printable content and readiness selector survive, that the
  stylesheet suppresses `.px-top`/`.px-nav`/controls in paged media and releases the `.px-main` scrollport, and —
  brace-matching the `@media print` block — that **every `:global()` selector sits inside it**, so this route can
  never restyle the Product on screen.

**Governance validation — recorded limitation.** `CLAUDE.md` references `npm run governance:registry-check`.
That script is **absent from `package.json` and from every ref in this checkout** (`scripts/governance/` does not
exist on any branch). No replacement checker was invented, per the governing authorization. Validation of this
record was therefore performed as report `279` did: local Product validation above, plus mechanical registry
assertions — Registry `219` is the only registry edited, `142` untouched, WP129 status string unchanged, WP
namespace count unchanged at 144. The absence of the checker is reported here as a standing finding, not resolved.

---

## 11. Review fixture excluded from Product publication

The local review-fixture commit `1b327c084e8702ffb1b2676c6914e93425dad220` remains **unpublished**: not an
ancestor of the accepted SHA, 0 remote refs, 0 fixture files in the published tree. It was restored as untracked
local infrastructure for the runtime proof and deleted before each candidate commit.

---

## 12. Registry position — unchanged

`KORA-WP-129` status **READY → READY**. No `AL.2` entry. WP namespace unchanged at `001`–`144`, 144 distinct ids.
`KORA-WP-131` is **not** unblocked by this remediation. No unrelated package state altered. Registry `142`
untouched.

---

## 13. W3 remains frozen

**W3A not started** — `/worker/onboarding`, `/worker/setup-password` unmigrated.
**W3B not started** — `/worker/dynamic-cv`, `/worker/dynamic-cv/print` remain unmigrated legacy surfaces. This
publication corrected two defects on them; it did not begin their migration.

W1 and W2 Founder-accepted surfaces are unchanged — 0 files in this delta touch `workspace`, `privacy`,
`activity-discovery`, `activity-discovery/detail`, `kora-link/activate`, `bookings`, `commons`, `opportunities`
or `personal-impact-balance`. `DynamicCVClient` unchanged. `components/`, `lib/`, `globals.css`,
`app/layout.tsx` and `app/worker/layout.tsx` unchanged.

---

## 14. Safety

`main` unchanged at `70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc`. Production Supabase `azdnepfmwrmacruykskm`
never contacted. No production operations, no staging writes, no schema changes, no migrations, no RLS changes,
no backfills, no migration 090, no Gate-3 publication, no secrets, no PR, no force push. Local Docker Supabase
only, torn down. WP117 WIP preserved exactly on `audit/mega-code-truth-2026-09`, never staged, moved or cleaned,
and absent from both the Product and governance publications.
