# 273 — KORA-WP-126 · Product Experience Visual Acceptance Infrastructure — Canonical Completion Report

**Date:** 2026-09-27
**Status:** **COMPLETE** (Registry 219 Section AL.2). Mechanism only — no Product surface changed, no new Founder visual acceptance sought.
**Contract chain:** Registry `219` WP126 Section B entry (with its 2026-09-25 DELTA 5 amendment) → Section AN / AN.1 / AN.4 → reports `210` §23, `231`, `233`, `241`, `266`.

---

## 1. What was contracted, and what was built

| Acceptance clause | Delivered |
|---|---|
| one canonical viewport matrix | `lib/px-acceptance/viewport-matrix.ts` — three viewports, one per shell state, widths **derived** from `PX_BREAKPOINTS` |
| one screenshot evidence protocol producing reproducible authenticated captures of the REAL Product | `lib/px-acceptance/evidence-protocol.ts` + `tests/e2e/px-acceptance-capture.spec.ts` |
| baseline storage and a documented regression-comparison process | `lib/px-acceptance/baseline-store.ts` + `docs/PX_VISUAL_ACCEPTANCE.md` |
| a recorded Founder visual acceptance format | `lib/px-acceptance/acceptance-record.ts` |
| explicit, enforced Product-screenshot vs design-mockup distinction | carried in the evidence filename (`__product__` / `__mockup__`) |
| evidence archived with the WP that produced it | `docs/product/visual-evidence/kora-wp-126/` |
| pixel-perfect diffing explicitly NOT required | comparison is by content digest, never per-pixel tolerance |
| DELTA 5 — the mechanically enforceable Benchmark V2 checks | `lib/px-acceptance/benchmark-checks.ts` |
| Tests: instrument self-test + matrix-vs-`PX_BREAKPOINTS` guard | `tests/unit/kora-wp-126-px-acceptance-infrastructure.test.ts` — **62 cases** |

**Every threshold is delegated** to the COMPLETE package that owns it — `139` (type), `140` (surface/state), `141` (archetype/spacing/ratio), `142` (encoding). WP126 defines no new canonical number: a second copy of a governed threshold is the duplicated-current-truth defect report `257` named as a root cause of registry drift.

## 2. What was deliberately NOT built

- **Lint WARN → BLOCK was not fired.** `KORA-WP-139` and `KORA-WP-141` both defer escalation to this package, and AN.4 is equally explicit that Product-wide drift elimination and lint BLOCK are **programme Definition of Done, not package acceptance**. The mechanism is implemented (`PHASE_LINT_SEVERITY`, `mayEscalateToBlock`) and the programme sits at `DEMONSTRATORS` → **WARN**. BLOCK belongs to `HARDENING`, after persona migration and the residual sweep. Existing lint output is unchanged: **0 errors, 6193 warnings**, identical to the pre-WP126 baseline.
- **Review-enforced and Founder-judgment criteria were not mechanised.** `assertMechanisable()` throws for hierarchy, scanability, actionability, craft (review) and Logo-Off, premium moments, final visual acceptance (Founder). Registry 219's own amendment forbids giving them fragile automated tests.
- **No environment remediation** (`127`–`130`) and **no cross-environment gate** (`131`). `126` is the mechanism; `131` is the gate.
- **No new Founder visual acceptance.** WP126 introduces no Product surface, so KORA Index V2's acceptance stands unchanged at `467893cf8fa0731cab698e1be917eba078dcd4d8`.

## 3. Two defects the instrument found in ITSELF

Both were found by running the protocol against the real Product, not by reading it, and each had produced a **passing** capture of something that was not the Product.

1. **Silent redirect accepted as evidence.** The first real run wrote three admissible-looking PNGs of `/login?role_hint=company`. Every prerequisite passed — canonical viewport, local base URL, session installed — because prerequisites describe a capture's *intent* and cannot describe its *result*. Fixed by `assertLanded()`, which refuses an authentication surface or any redirect **before a byte reaches disk**.
2. **Loading state captured as the Product.** After that fix, `/company/kora-index` was still captured showing *"Caricamento in corso…"*. `network-idle` and `document.fonts.ready` were both satisfied — the surface fetches after hydration — and the generic `[aria-busy]`/`[data-loading]` probe matched nothing because this surface renders neither. A generic probe cannot know when an arbitrary surface is finished, so the surface now **declares** its readiness marker and a capture without one is inadmissible (`assertReadinessDeclared()`).

Both have regression coverage. An instrument that could not catch these would have certified the login page as accepted Product.

## 4. Evidence archived

`docs/product/visual-evidence/kora-wp-126/` — `/company/kora-index` at all three canonical viewports, captured authenticated against local synthetic fixtures (WP126's Privacy/Trust field: synthetic/local only; Production was never contacted and no staging write occurred).

Measured on the real surface: page length **pass** (900px against the 2,500px `EXECUTIVE_JUDGMENT` threshold), mobile ratio **pass** (0.902, acceptable — *a detector, never a target*).

**Stated limitation.** The seeded tenant has no completed scoring pipeline, so the surface legitimately renders the `NOT_YET_AVAILABLE` state ("Dati non ancora disponibili"). Those figures are real measurements of the real Product in that state; they are **not** representative of a populated KORA Index, and no conclusion about the populated surface should be drawn from them. **No baseline is registered**: the golden-path seed generates a tenant code, so the surface is not byte-stable across seeds, and the capture honestly reports `missing-baseline` rather than blessing one run's digest.

## 5. Validation

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | **0 errors**, 6193 warnings — unchanged from baseline |
| `npm test` (full suite) | **439 files, 14047 passed, 0 failed** |
| `npm run build` | success |
| WP126 self-test | **62/62** |
| WP139 regression | **31/31** |
| WP140 regression | **48/48** |
| WP141 regression | **34/34** |
| WP142 regression | **68/68** |
| approved-design + WP047 + WP088 | **135/135** |
| real authenticated capture | 3 viewports captured, landing + readiness verified |

## 6. CI

| Run | Ref | Result |
|---|---|---|
| **KORA CI #344**, run `36277799697` | `integration/wp126-ci-proof-2026-09-27`, head `81d3cf3f9158…` | success, 4/4 |
| **KORA CI #345**, run `36277974910` | `integration/kora-canonical-product-2026-09-22`, head `81d3cf3f9158…` | **success, 4/4 on the exact canonical SHA** |

No rerun was used.

## 7. SHAs

- Canonical Product before: `35d54ea358e25b2971de5e8ca36f59f702b877dc`
- **Canonical Product after: `81d3cf3f9158017659a80429c1c3a522ca769f7d`** — one commit, 11 files, all additive; `CLAUDE.md` byte-identical to canonical (the `next dev` tooling block was re-added locally during capture and reverted before commit, per report `271`'s standing warning)
- KORA Index V2 Founder-approved visual implementation SHA: `467893cf8fa0731cab698e1be917eba078dcd4d8` — **unchanged**

## 8. Registry transition

`KORA-WP-126` **READY → COMPLETE** in Section AL.2 (69 → 70), with its AL.3 evidence row. Derived truth regenerated by `npm run governance:registry-check`, not asserted:

```
derived COMPLETE=70 READY=39 BLOCKED=35 TOTAL=144; declared=70/39/35/144   INV-08 PASS
144 specs · 144 nodes · 225 hard edges · 0 cycles · RESULT: PASS
```

**Mechanical consequence — exactly the one the DAG predicted, and nothing else:**

| WP | Transition | Hard Deps |
|---|---|---|
| `127` KORA_ADMIN Experience Remediation | BLOCKED → **READY** | `126` |
| `128` Company Experience Remediation | BLOCKED → **READY** | `126` |
| `129` Worker Experience Remediation | BLOCKED → **READY** | `126` |
| `130` Partner Experience Remediation | BLOCKED → **READY** | `126` |

`131` (Cross-Environment Visual Acceptance Gate) **remains BLOCKED** — it depends on `127`, `128`, `129`. No other package moved. No status was written by hand; all four were computed from Section C and AL.2.

**None of the newly-READY packages was started.** READY is not authorization.
