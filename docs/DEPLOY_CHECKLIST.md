# Deploy Checklist

Manual, practical checklist for any deploy that could be touched by a pilot company. Not automated — walk through it by hand before and after every deploy. See `docs/ENVIRONMENT_SAFETY_CHECK.md`, `docs/vercel-env-required.md`, `docs/QA_STATUS.md`, and `docs/GOLDEN_PATH.md` for the detail behind several items below.

## Before deploy

- [ ] **Target environment confirmed** — local / staging / production. State it explicitly in the deploy notes; don't assume.
- [ ] **No accidental Production E2E** — confirm `test:e2e` / Playwright config points at the intended base URL, not Production. Never run authenticated or destructive E2E against Production.
- [ ] **Staging/production env parity** — required variables (see `docs/vercel-env-required.md`) are present in the target Vercel environment, with the correct Supabase project's values (not copy-pasted from another project).
- [ ] **Supabase project target confirmed** — staging project vs. any future production project. State the project ref explicitly; never infer it from habit.
- [ ] **Migrations-applied status confirmed** — check `supabase migration list --linked` (or equivalent) against `supabase/migrations/` before assuming the target DB is up to date.
- [ ] **Proposed migrations are not treated as applied** — anything in `supabase/proposed/` (if present) is not live; confirm it hasn't been mistaken for an applied migration in this deploy's assumptions.
- [ ] **RLS-related tests/checks status** — confirm `tenant-isolation`, `route-privacy`, and gate2-* test files are green (see `docs/QA_STATUS.md` for the current known-gap list, e.g. RLS negative testing).
- [ ] **Authenticated smoke test status** — confirm the last authenticated smoke run (`tests/e2e/authenticated-smoke.spec.ts` or equivalent) against the target environment, and its result/date.
- [ ] **Golden path staging status** — confirm the golden path (upload → UEF → approve → score → Decision Pack) has been exercised on staging since the last relevant change; see `docs/GOLDEN_PATH.md`.
- [ ] **Role-switcher / authenticated session behavior** — confirm demo-state role switching does not leak into or override real authenticated sessions (see `docs/ARCHITECTURE.md` §4 note on `AdminDemoGuard`).
- [ ] **Demo/live boundary confirmed** — no demo/synthetic data path is reachable from a live/authenticated route, and no live route silently falls back to synthetic data.
- [ ] **Sentry/monitoring status** — if Sentry is configured for the target environment (`sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts`), confirm DSN and environment tag are correct for this target; otherwise note monitoring is not available for this deploy.
- [ ] **Rollback/stop criteria defined** — know in advance what would trigger a rollback (which errors, which test failures) and who has authority to call it before starting.

## Deploy

- [ ] Deploy performed.
- [ ] Immediate post-deploy smoke check (login, one page per role at minimum).

## After deploy

- [ ] **Final git status confirmed** — working tree clean, deployed commit hash recorded, matches what was intended to ship.
- [ ] **Who approved the deploy** — name and date recorded in the deploy notes/PR.
- [ ] Rollback/stop criteria re-confirmed as not triggered, or rollback executed per the pre-defined criteria.

---

**Document version:** v1.0
**Created:** 2026-07-06 (PILOT-CONVERGENCE-01)
