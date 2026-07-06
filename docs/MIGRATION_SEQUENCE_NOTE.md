# Migration Sequence Note — Gap at 029

**Status:** Explained by repo evidence. No action taken. Documentation only.

## The gap

`supabase/migrations/` runs 001–028, then 030, 031. There is no `029_*.sql` in that directory.

## Why

`029_rollback_027_if_needed.sql` was created on 2026-06-21 as an emergency rollback for migration 027 (`027_worker_individual_rls_refactor.sql`) — see its header comment for full preconditions. It was never applied to any environment.

On 2026-06-22, once 027 had been applied to staging and verified (Gate 2.2 hardening sprint, see `docs/archive/gate2/GATE2_2_PRIVACY_HARDENING_027_STAGING.md` §13 "Rollback 029 Quarantine"), the file was deliberately moved out of the forward migration pipeline:

```
git mv supabase/migrations/029_rollback_027_if_needed.sql \
       supabase/rollback/029_rollback_027_if_needed.sql
```

Reason for the move: `supabase migration up` applies all pending migrations in forward numeric order. Leaving 029 in `supabase/migrations/` meant any future `migration up` run would apply it automatically — silently re-adding the six `KORA_ADMIN` policies on `personal.*`/`analytics.impact_unit` that 027 had just removed, undoing the privacy hardening without warning. Moving it to `supabase/rollback/` (a directory the Supabase CLI does not scan for migrations) removes that risk entirely while keeping the file available as a manual, explicitly-approved emergency artifact.

The same quarantine pattern was later applied to migration 030's rollback (`supabase/rollback/030_rollback_030_if_needed.sql`) — see `supabase/rollback/README.md`.

## Current state

- `029_rollback_027_if_needed.sql` lives in `supabase/rollback/`, not `supabase/migrations/`.
- It has **not** been applied to any environment (staging or production).
- It is documented as an emergency-only, technical-owner-approved rollback for migration 027 — see `supabase/rollback/README.md` for the full execution rules.
- The gap at 029 in `supabase/migrations/` is intentional and expected; it does not indicate a missing or lost migration.

## Confirmation

No database changes, migration creation, renaming, or edits were made as part of writing this note. This is a documentation-only clarification of an already-documented and already-executed decision.

**Document version:** v1.0
**Created:** 2026-07-06 (PILOT-CONVERGENCE-01)
