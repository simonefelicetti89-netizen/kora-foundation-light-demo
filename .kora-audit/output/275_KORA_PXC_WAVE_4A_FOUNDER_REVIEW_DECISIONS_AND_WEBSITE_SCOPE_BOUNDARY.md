# 275 — PX-C WAVE 4a — FOUNDER REVIEW DECISIONS, `/pilot` SCOPE RULING, AND THE WEBSITE-SURFACE BOUNDARY

**Date:** 2026-09-27 · **Type:** Founder Review decisions (recorded) + scope determination + boundary report
**Authority:** Founder ruling 2026-09-27 · **Contract:** Registry 219 § Section A, *Founder Review Publication Contract* (report `274`)
**Reviewed candidate:** `87fbdfa9621462f3d82e727726520fa590d2d4aa` · **Baseline:** `81d3cf3f9158017659a80429c1c3a522ca769f7d`

**No package is COMPLETE. `KORA-WP-127`, `KORA-WP-128` and `KORA-WP-129` all remain READY.**

---

## 1. `KORA-WP-127` — ACCEPTED AS PUBLISHED, STRICTLY SCOPE-LIMITED

**Reviewed change:** `Founder Validation` separated from the operational `Pilot Lifecycle` group into the final
`Founder Tooling` group carrying the `FOUNDER` badge; Pilot Lifecycle left operational; the destination moved,
never retired.

**Decision: ACCEPT AS PUBLISHED**, limited strictly to that change.

**What this decision is NOT.** It is a *publication* decision under the Founder Review Publication Contract. It
is **not** a Formal Founder Visual Acceptance, and **not** general visual acceptance of the Admin experience,
which remains un-accepted. It creates no acceptance record, binds to no future Admin surface, and contributes
nothing toward `KORA-WP-131`.

**Still outstanding for `KORA-WP-127`:** Wave 4b system migration (77 files, 1,674 inline decisions) · Admin
home operator-state remediation · queue-first composition on Decision/Review surfaces · redirect/stub reduction
· the unresolved **"36 canonical Admin surfaces"** contract/evidence discrepancy, which remains separate,
unmodified, and still blocks eventual COMPLETE · the recorded `/admin/data-intake` 3181px vs 3000px warning.

## 2. `KORA-WP-128` — PARTIAL RULING

**Accepted and remaining published:** the technical removal of the dead `/demo/guide` references. The route was
deleted by the CC-00 demo retirement (2026-09-05); three live references outlived it and are now gone.

**NOT accepted, and explicitly not inferred:**
- **`/pilot` carries NO Founder Visual Acceptance.** The current `/pilot` implementation is **explicitly not
  Founder-accepted visual quality** and **must not be used as a KORA Product visual benchmark**.
- **`/company/financial` carries no visual approval.** Its review capture showed an unresolved / non-populated
  state, which is insufficient evidence for any visual judgment. No approval is inferred from it.

## 3. GOVERNANCE DETERMINATION — IS `/pilot` REQUIRED BY THE BINDING `KORA-WP-128` CONTRACT?

**Answer: NO.** Determined from the entry's own binding text, quoted rather than paraphrased:

| Field | Text | `/pilot` present? |
|---|---|---|
| `Existing Paths` | `app/company/**`, `app/company/advisor/page.tsx` | **no** |
| `UI` | Company navigation coherence, WP-125-native page bodies, locked-shell clarity, `/company/advisor` | **no** |
| `Acceptance` | "…**no dead navigation target remains, `/demo/guide` included**…" | **no** |
| Whole entry | — | **0 occurrences** of `/pilot`, marketing, landing, website |

The decisive clause is a requirement **on the target**: *"no dead navigation `target` remains"*. It is satisfied
when `/demo/guide` no longer exists and nothing references it. It is **not** a requirement to remediate whichever
surface happened to host a reference. `app/pilot/page.tsx` was edited solely under an explicit Founder rider,
for those references alone.

**Recorded outcome:** `/pilot` is **outside `KORA-WP-128`'s Product Experience remediation scope** and is
**FOUNDER-DEFERRED / STAND-BY**, belonging to the separate public/commercial website workstream. **No acceptance
clause was added, removed or rewritten.** The Registry annotation states the determination; it does not change
the contract, which already excluded `/pilot` on its own terms.

## 4. `KORA-WP-129`

Unchanged from report `274`: Wave 4a produced **no user-visible Worker change**, is classified **NON-VISUAL**,
and no visual approval was sought or granted. **READY.**

## 5. WEBSITE / MARKETING SURFACE BOUNDARY — FULL SWEEP

**Public / marketing surfaces in the repository:** `app/page.tsx` (root landing) · `components/landing/**` (3
files) · `app/pilot` · `app/demo` (incl. `/demo/future-vision`) · `app/cv` (public share) · `app/request-access`
· `app/login` · `app/privacy` · `app/legal`.

### 5.1 Are any inside `KORA-WP-127` / `128` / `129` declared paths? **NO.**

| WP | Declared paths | Marketing surfaces included |
|---|---|---|
| `127` | `app/admin/**`, `components/layout/Sidebar.tsx`, `lib/navigation/admin-nav-groups.ts` | **none** |
| `128` | `app/company/**`, `app/company/advisor/page.tsx` | **none** |
| `129` | `app/worker/**`, `app/my-kora/**` | **none** |

### 5.2 Are any inside the Wave 4b migration inventories? **NO.**
The inventories were computed strictly over `app/admin` (1,674), `app/company` (1,315) and `app/worker` (985).
`app/page.tsx`, `components/landing/**`, `app/pilot`, `app/demo`, `app/cv`, `app/legal` and `app/privacy` are in
**none** of them. The Product Experience migration cannot reach a website surface through its own inventory.

### 5.3 Three real boundary contacts — disclosed, not hidden

1. **`tests/unit/kora-wp-128-company-experience.test.ts` reads `app/pilot/page.tsx`.** One assertion, that the
   dead `/demo/guide` reference has not returned. This is **dead-target enforcement, not remediation and not a
   visual claim** — the acceptance clause is global to the target, so the guard legitimately checks everywhere it
   appeared. **Disclosed so the website workstream knows a Product test reads that file**; it constrains only the
   absence of one dead href and nothing about `/pilot`'s design.
2. **`/demo/future-vision` is a destination in the Worker, Partner AND Advisor rails.** A demo surface reachable
   from three Product rails, parked `inactive`. `KORA-WP-129`'s guard **pins** it rather than changing it. The
   file lives in `app/demo`, outside every declared path, so it is not in migration scope — but it is the most
   likely accidental entry point for a future "navigation" change and is flagged as such.
3. **`/legal/privacy` already declares a `DISCLOSURE_STATIC` archetype** in `KORA-WP-141`'s `ROUTE_ARCHETYPE`.
   A public legal surface already carries Product Experience grammar. Owned by `141` (COMPLETE), not by this
   batch, and not in any Wave 4b inventory — recorded so the boundary is known rather than discovered later.

### 5.4 Recommended boundary control — **proposed, NOT applied**
Before Wave 4b begins, add a single mechanical guard asserting that no Wave 4b migration target resolves to
`app/page.tsx`, `components/landing/**`, `app/pilot`, `app/demo`, `app/cv`, `app/request-access`, `app/login`,
`app/privacy` or `app/legal`. That makes the website boundary fail-closed instead of relying on discipline. It
needs its own authorization and is not implemented here.

## 6. WHAT THIS REPORT DOES NOT DO

No package COMPLETE. No status change — Registry 219 continues to derive **COMPLETE 70 · READY 39 · BLOCKED 35 ·
TOTAL 144**, with `127`/`128`/`129` READY and `131` BLOCKED. No Wave 4b authorization. No Formal Founder Visual
Acceptance recorded for any surface. The "36 canonical Admin surfaces" discrepancy remains open and uncoupled
from these decisions.
