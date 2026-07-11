# Company-facing demo/production_ready wording decisions

**Labels suggested:** `copy`, `product-decision`, `pilot-readiness`
**Priority:** Medium — cosmetic/trust risk, not a functional blocker
**Source:** LABEL-SWEEP-01 census, findings #7, #8, #10, #11 (deliberately left open — require a product decision, not a mechanical rename)

## Problem statement

Four company-facing surfaces currently show wording that mixes live/demo framing or exposes a raw internal config flag, and none of them can be safely auto-corrected the way #1–#6/#9 were, because the "correct" text depends on a product decision, not just a canonical-name substitution:

1. **`app/company/activation/page.tsx`** (~line 274) — the live "Note metodologiche" section tells a real, authenticated company user: *"I grafici di dettaglio per sede e per pillar sono disponibili nella versione demo sintetica."* On a page a real pilot company is looking at, this reads as "the detailed version of what you want exists, but only in the demo" — which is either an honest forward-looking note or an accidental leftover from before this page went live-only. We don't know which without a decision.
2. **`app/company/financial/page.tsx`** (~lines 150–167) — a persistent, un-suppressible link labeled **"Demo Guide →"** pointing to `/demo/guide` sits next to the live "Vai al KORA Index →" link. A real company admin can click through to demo content from a live financial page.
3. **`app/company/reports/page.tsx`** (line 141) and **`app/company/data/upload/page.tsx`** (lines 2705, 3211) — render the raw flag `production_ready: false` verbatim, in monospace, to company users. This is an internal boolean gate name, not user-facing product language.
4. **`app/api/company/contribution/live/route.ts`** (lines 28, 30) — the human-readable error string returned to the company UI includes `(production_ready = true)` verbatim inside otherwise natural-language Italian copy.

## Why it matters before pilot

- Real pilot companies will read every word on these screens closely — that's the nature of a paid diagnostic product being evaluated for trust. "Demo" language or raw internal flags on a live surface directly undermines the "governance-grade, explainable" positioning in CLAUDE.md §1–2.
- Per CLAUDE.md's canon (and the LABEL-SWEEP-01 canon proposal), demo references must never be visible on live company surfaces, and raw snake_case flags are only sanctioned where explicitly mandated (`calibration_status`, `methodology_version_id`) — `production_ready` is not on that list.
- This is a narrow, well-scoped fix once the product intent is settled — it's blocked purely on a decision, not on effort.

## Decision needed

For each of the four items, a founder/product call on:
- **#7**: Is a more detailed per-site/per-pillar chart view actually planned for this pilot, or was this note written before `/company/activation` went live-only and simply never updated? If planned → keep as a "not yet available" note in plain language. If not planned → remove the line entirely.
- **#8**: Should real company users ever be able to reach `/demo/guide`? If the content there is generically useful methodology/onboarding material, rename the link and drop "Demo" from the label. If it's synthetic-scenario-specific, remove the link from this live surface entirely.
- **#10/#11**: Is showing the raw `production_ready` flag intentional radical-transparency design (consistent with `calibration_status`), or an unreviewed internal leak? If intentional, document it as a deliberate exception in CLAUDE.md-style governance and keep as-is. If not, replace with plain-language Italian copy.

## Recommended product direction

Default to the canon already established in LABEL-SWEEP-01 unless overridden: no "demo" wording on live company surfaces, no raw snake_case flags outside the two CLAUDE.md-mandated fields. Apply this uniformly across #7/#8/#10/#11 rather than deciding each in isolation, so the four don't end up with inconsistent treatment.

## Acceptance criteria

- [ ] Decision recorded (in this ticket or a linked doc) for each of #7, #8, #10, #11 individually.
- [ ] `app/company/activation/page.tsx`: line updated or removed per decision.
- [ ] `app/company/financial/page.tsx`: "Demo Guide" link relabeled, redirected to non-demo content, or removed per decision.
- [ ] `app/company/reports/page.tsx` and `app/company/data/upload/page.tsx`: `production_ready: false` either kept with documented rationale, or replaced with plain-language status text.
- [ ] `app/api/company/contribution/live/route.ts`: human-facing `error` string reviewed; `gate` field (programmatic) may keep the raw name regardless of the prose decision.
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` all green after changes.
- [ ] No scoring/methodology/RLS/schema/route changes introduced.

## Do-not-do list

- Do not change what `production_ready` gates or how it's computed — copy/display only.
- Do not remove the `/demo/guide` route itself or its content — only the exposure of it (or its labeling) on live company surfaces is in scope.
- Do not touch `#12` (type-field naming) as part of this ticket — tracked separately.
- Do not weaken or remove any privacy/aggregation boundary while touching these pages.
- Do not add new `as any` or `eslint-disable`.

## Suggested implementation constraints

- Copy-only changes, same pattern as LABEL-SWEEP-01 #1–#6/#9 (string literal edits, no logic changes).
- Add or extend a regression test (e.g. in `tests/unit/b100-versioning-consistency.test.ts`) asserting the decided-upon behavior, mirroring the `LABEL-SWEEP-01 — company-facing component code consistency` block already there.
- Keep the four items in one PR only if the decisions land the same way; otherwise split by decision outcome to keep diffs reviewable.
