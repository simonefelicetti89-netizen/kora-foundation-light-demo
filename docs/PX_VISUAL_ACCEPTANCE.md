# Product Experience Visual Acceptance — the documented process

**Owner:** `KORA-WP-126` (Product Experience Visual Acceptance Infrastructure, milestone `PX-C`).
**Authority:** Registry `219` — WP126's Section B entry, its 2026-09-25 DELTA 5 amendment, and Section AN (Benchmark V2), including AN.1's calibrated thresholds and AN.4's migration/lint phases.

`KORA-WP-126` is the **mechanism**. `KORA-WP-131` is the **gate**. This document is the process the mechanism implements; it grants no acceptance by itself.

---

## 1. What may be accepted

| | |
|---|---|
| **Product evidence** | a capture of the running application, authenticated, at a canonical viewport |
| **Design mockup** | a design artefact |

Only **Product evidence** can support a Founder visual acceptance. The distinction is carried in the filename (`__product__` / `__mockup__`), so it survives the file being copied out of the repository.

## 2. Canonical viewport matrix

`lib/px-acceptance/viewport-matrix.ts`. Three viewports, one per shell state, with widths **derived from `PX_BREAKPOINTS`** rather than restated beside them:

| id | width × height | shell state |
|---|---|---|
| `desktop` | 1440 × 900 | `full` |
| `rail` | `PX_BREAKPOINTS.rail` × 900 | `rail` |
| `mobile` | `PX_BREAKPOINTS.mobile` × 812 | `mobile` |

A capture at any other width **is not canonical acceptance evidence**. The guard fails closed and names the allowed widths; it never rounds a near-miss into acceptance.

## 3. Evidence protocol

`lib/px-acceptance/evidence-protocol.ts`.

- **Deterministic naming** — `kora-wp-NNN__<kind>__<route-slug>__<viewport>[__<variant>].png`. No timestamp, run id or random suffix: a name that changes per run can never be compared to a baseline.
- **Archival** — `docs/product/visual-evidence/kora-wp-NNN/`, i.e. with the WP that produced it.
- **Prerequisites, fail-closed** — local loopback base URL (WP126's Privacy/Trust field: synthetic/local fixtures only, never real Worker or Company data), authenticated session, canonical viewport, and every declared nondeterminism source suppressed. All problems are reported at once.
- **Determinism by readiness, not duration** — animations/transitions disabled, caret hidden, the surface's **declared readiness marker** visible, `document.fonts.ready` awaited, network idle, no `aria-busy`/`data-loading` surface remaining. **No arbitrary sleeps.**
- **Landing verification** — after navigation and before a single byte reaches disk, the capture must prove it landed on the intended route and not on an authentication surface.

### 3.1 Two defects this instrument found in itself

Both were found by running the protocol against the real Product, and both had produced a *passing* capture of something that was not the Product:

1. **Silent redirect.** The first real run wrote three admissible-looking PNGs of `/login?role_hint=company`: the session was not accepted, the app redirected, and every prerequisite still passed — viewport canonical, base URL local, session installed. Prerequisites describe a capture's *intent*; they cannot describe its *result*. Hence `assertLanded()`.
2. **Loading state captured as Product.** After that fix, the capture of `/company/kora-index` still showed *"Caricamento in corso…"*. `network-idle` and `document.fonts.ready` were both satisfied — the surface fetches after hydration — and the generic `[aria-busy]`/`[data-loading]` probe matched nothing, because this surface renders neither. A generic probe cannot know when an arbitrary surface is finished, so the surface now **declares** its readiness marker and a capture without one is inadmissible. Hence `assertReadinessDeclared()`.

Neither was found by reading the code.

## 4. Regression-comparison process

`lib/px-acceptance/baseline-store.ts`. Comparison is by **content digest**, not per-pixel tolerance — Registry 219 states that *pixel-perfect automated diffing is explicitly NOT required*, and a brittle pixel gate would recreate the mechanical-ratchet failure mode the registry already discloses.

| verdict | meaning | is it a pass? |
|---|---|---|
| `match` | reproduces the accepted baseline | **yes** |
| `changed` | baseline exists and differs — **review required**; not automatically a regression, not automatically an improvement | no |
| `missing-baseline` | nothing accepted yet | no — and not a failure |
| `invalid-capture` | the capture is not admissible evidence | no |

**Only `match` passes.** An invalid environment or viewport can never produce a false pass.

## 5. Baseline update safety

A verification run **cannot** move a baseline. `compareToBaseline` has no power to write one. The only path is `acceptBaseline`, which requires an explicit `BaselineAcceptanceIntent` — deliberately a structured token rather than a boolean, so a stray `true` cannot bless a new appearance. It refuses: non-Founder authority, an inadmissible capture, a short SHA, an acceptance citing no record, and a no-op re-acceptance. Evidence-name collisions are rejected outright, so unrelated evidence cannot overwrite.

## 6. Founder visual acceptance record

`lib/px-acceptance/acceptance-record.ts`. A visual acceptance is an event bound to **one immutable Product SHA** and is **not inherited by descendants** — whether a descendant changed nothing visual is exactly the claim an acceptance is meant to evidence, not assume.

Live example:

```
KORA Index V2 visual implementation SHA   467893cf8fa0731cab698e1be917eba078dcd4d8   (report 271, CI #339)
canonical Product later moved to          4069072…  (WP116 remediation)
                                          35d54ea…  (governance routing)
```

Those later SHAs carry **no** visual acceptance of their own. `visualAcceptanceCoverage()` says so explicitly and tells the caller to cite the diff rather than infer acceptance.

## 7. What is mechanically enforced, and what is not

`lib/px-acceptance/benchmark-checks.ts`. Every threshold is **delegated** to the COMPLETE package that owns it — `139` (type), `140` (surface/state), `141` (archetype/spacing/ratio), `142` (encoding). WP126 defines no new canonical number.

**Mechanical:** typography role + 11px/12px floors · spacing SPACE steps (with documented ≤3px optical exception) · route archetype declared · surface-role/state constraints · seven-state resolution (`ZERO ≠ NO DATA`, `SUPPRESSED ≠ ERROR`, unknown throws) · page length vs the archetype's `warnHeightPx` · mobile ratio per AN.1 (≤1.35 acceptable · >1.35–1.6 warning · >1.6 fail) · navigation budget against a **declared** budget · no bare threshold metric.

**Review-enforced, never given a fragile automated test:** hierarchy · scanability · actionability · craft.
**Founder judgment:** Logo-Off Test · premium moments · final visual acceptance.

`assertMechanisable()` enforces that boundary at runtime: asking the instrument to mechanise a review or judgment criterion throws.

The mobile ratio is **a detector, never a target** — padding a desktop page to improve the ratio is itself a benchmark violation.

## 8. Lint escalation

AN.4's ladder is `SYSTEM → PRIMITIVES → DEMONSTRATORS → PERSONA MIGRATION → RESIDUAL SWEEP → HARDENING` with lint `OFF → OFF → WARN → WARN → WARN → BLOCK`.

`KORA-WP-139` and `KORA-WP-141` both defer escalation to this package. The programme is currently at **`DEMONSTRATORS` → WARN**. WP126 owns the escalation **mechanism** and deliberately does **not** fire it: AN.4 states that Product-wide drift elimination and lint BLOCK are **programme Definition of Done, not package acceptance**. BLOCK belongs to `HARDENING`, after persona migration (`143`, `127`–`130`) and the residual sweep.

## 9. Running it

```
# unit — the instrument's own self-test, including the PX_BREAKPOINTS guard
npx vitest run tests/unit/kora-wp-126-px-acceptance-infrastructure.test.ts

# capture — the real authenticated Product, local fixtures only
E2E_BASE_URL=http://127.0.0.1:3000 \
E2E_LOCAL_SUPABASE_URL=http://127.0.0.1:54321 \
E2E_LOCAL_SUPABASE_ANON_KEY=… E2E_COMPANY_A_EMAIL=… E2E_COMPANY_A_PASSWORD=… \
npx playwright test tests/e2e/px-acceptance-capture.spec.ts
```

The capture **skips with a clear message** when the local fixtures are not configured. It never silently passes. It additionally requires `SUPABASE_SERVICE_ROLE_KEY` for the server, without which the app redirects to `/login` and the landing check refuses the capture.

## 10. Limitations, stated rather than discovered later

- **No baseline is committed by `KORA-WP-126`.** The golden-path seed creates a tenant with a generated code, so the rendered surface is not byte-stable across seeds and any digest committed now would be a baseline of one particular seed. The capture therefore reports `missing-baseline` — honestly not a pass. Baselines belong to surfaces whose fixtures are deterministic, and registering them is an explicit Founder acceptance, never a side effect of a run.
- **The archived evidence shows the `NOT_YET_AVAILABLE` state.** The seeded tenant has no completed scoring pipeline, so `/company/kora-index` legitimately renders "Dati non ancora disponibili". The page-length and mobile-ratio figures in that evidence are therefore measurements of that state, not of a populated KORA Index. They are real measurements of the real Product; they are not representative of the populated surface, and no conclusion about the populated surface should be drawn from them.
