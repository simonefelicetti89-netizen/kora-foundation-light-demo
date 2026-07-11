# Canonical component field naming debt: continuity_rate / verification_rate

**Labels suggested:** `tech-debt`, `types`, `not-copy-only`
**Priority:** Low-medium — no functional bug, but blocks full closure of the LABEL-SWEEP-01 naming cleanup
**Source:** LABEL-SWEEP-01 census, finding #12

## Problem statement

`lib/types/index.ts`, interface `CompanyAggregateExtended`, defines:

```ts
continuity_rate: number;
verification_rate: number;
```

These are the pre-Sprint-1 (pre-v3) field names. The current canonical component names, per `docs/METHODOLOGY.md` and CLAUDE.md §5, are `CONT` (Continuity) and `EVQ` (Evidence Quality) — `verification_rate` in particular is doubly stale, since the *concept* was renamed from "Verification Rate" to "Evidence Quality," not just the short code.

LABEL-SWEEP-01 fixed the **display** layer that reads these fields (`app/company/activation/page.tsx` now shows `code="CONT"`/`label="Continuity"` and `code="EVQ"`/`label="Evidence Quality"`), but the underlying **data contract** the display reads from still carries the old names. The type is the root cause of why the stale display labels existed in the first place — a hardcoded UI string just happened to mirror the field name it was reading.

## Risk

- **Low functional risk today** — the fields still work correctly; LABEL-SWEEP-01 confirmed values are computed correctly and only relabeled the display.
- **Ongoing drift risk** — any future page or export that reads `aggregate.continuity_rate` / `aggregate.verification_rate` and derives a label from the field name (as `activation/page.tsx` originally did) will reintroduce the same stale-naming bug. This is exactly the failure mode LABEL-SWEEP-01 was created to catch, and it can recur as long as the type itself disagrees with the canon.
- **Documentation/onboarding risk** — new engineers reading `CompanyAggregateExtended` will reasonably assume `verification_rate` is the canonical name, since CLAUDE.md's field-naming guidance isn't enforced at the type level.

## Why this is not copy-only

Unlike #1–#6/#9, this requires renaming a field on a shared TypeScript interface consumed across the company workspace, not editing a JSX string literal. That touches:
- every read site of `CompanyAggregateExtended.continuity_rate` / `.verification_rate` (need a full call-site audit, not just the one page LABEL-SWEEP-01 touched),
- any service/mock/fixture that constructs objects of this shape (test fixtures, seed data, mock service layer per CLAUDE.md §14),
- potentially serialized shapes if this type mirrors a DB view/RPC response column naming (needs verification — if the field names originate from a live Postgres view/function, a rename cascades into schema territory, which is explicitly forbidden for a "label sweep" scope).

This is why LABEL-SWEEP-01's invariant #4 ("no scoring, methodology, engine config, routes, or DB schema changes") correctly excluded it — a type rename is not a "company-facing canonical label" fix, it's a data-contract change.

## Suggested technical approach

1. **First, determine whether `continuity_rate`/`verification_rate` are purely a TypeScript-side shape or mirror actual column/RPC names in the live Postgres schema** (check `app/api/company/workers/activation-aggregate/route.ts` or whatever populates `CompanyAggregateExtended` server-side). This determines whether the fix is type-only or crosses into Gate-2-governed schema territory.
2. If type-only: rename the fields to `cont_rate`/`evq_rate` (or similar canonical-aligned names), update all read/write call sites in one pass, and add a lint/test guard (similar to `tests/unit/b100-versioning-consistency.test.ts`) preventing the old field names from reappearing in `lib/types/`.
3. If the names mirror live schema/RPC output: this becomes a Gate-2-governed schema change and must go through the normal migration/CTO-review path — do not rename in the type alone without also handling the data-source mismatch that would create.
4. Either way, keep the *rendered* label logic (`code="CONT"`, `code="EVQ"`) exactly as LABEL-SWEEP-01 left it — this ticket is about the field name feeding that label, not the label itself.

## Files likely involved

- `lib/types/index.ts` (`CompanyAggregateExtended` interface — confirmed location of the two fields)
- `app/company/activation/page.tsx` (current sole known read site of both fields, already updated for display but not for the field name itself)
- Whatever populates `CompanyAggregateExtended` for live data — needs discovery (likely `app/api/company/workers/activation-aggregate/route.ts` or a service in `/services`, not yet confirmed)
- Any test fixtures/mocks constructing `CompanyAggregateExtended` objects (needs discovery)

## Migration/schema risk

**Unknown — needs discovery before scoping.** Yes if the field names mirror a live Postgres view/RPC response shape (in which case this ticket must route through Gate 2 CTO review before any schema-side rename); No if this is purely a TypeScript interface used only in-app with data reshaped before assignment. This must be resolved as the first step of any implementation, not assumed either way.

## Acceptance criteria

- [ ] Confirmed (and documented in the PR) whether the field names are type-only or schema-derived.
- [ ] If type-only: all call sites updated in a single PR, no remaining reference to `continuity_rate`/`verification_rate` in `lib/types/` or `app/company/**`.
- [ ] If schema-derived: this ticket is re-scoped/re-labeled as a Gate-2-governed schema change and split out of "label sweep" tracking entirely.
- [ ] Regression test added asserting the canonical field names are used (mirroring the `LABEL-SWEEP-01` test pattern).
- [ ] `npx tsc --noEmit`, `npm test`, `npm run build` all green.
- [ ] No change to computed values — this is a rename, not a recalculation.

## Do-not-do list

- Do not rename these fields without first confirming whether they originate from a live schema/RPC — doing so blind risks silently breaking the live data path.
- Do not touch scoring, weights, thresholds, or the IU/PIB computation pipeline.
- Do not run any migration or SQL as part of scoping this ticket — discovery only, until Gate 2 status is confirmed if applicable.
- Do not bundle this with the demo/production_ready wording ticket — different risk class, different reviewer (this one needs CTO sign-off if schema-derived; that one doesn't).
