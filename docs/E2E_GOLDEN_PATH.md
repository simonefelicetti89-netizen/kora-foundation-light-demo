# E2E Golden Path — Authenticated Staging Data-Bearing Proof

**Test file:** `tests/e2e/golden-data-bearing.spec.ts` (test `GD01`)
**Related:** `tests/e2e/golden-admin-company.spec.ts` (`G01`/`G02` — reachability-only, no data pipeline), `tests/e2e/authenticated-smoke.spec.ts` (`A01`–`A04` — login/routing fixtures)
**Introduced:** GOLDEN-E2E-02/03 (2026-07-04); extended GOLDEN-E2E-04 (PILOT-E2E-GOLDEN-PATH-01, 2026-07-06)

## What this proves

`GD01` drives the real commercial golden path through the actual UI, against a real (non-Production) staging environment, as one authenticated KORA_ADMIN session followed by a separate COMPANY_ADMIN session:

1. KORA_ADMIN authenticates via the real `/login` form.
2. KORA_ADMIN reaches `/admin/data-intake` for an explicit tenant — the page is asserted to show *this run's* `tenantCode`, not merely "not a synthetic demo tenant."
3. The golden-path fixture CSV (`data/golden-path/kora_golden_path_upload.csv`) is uploaded, dry-run validated, pseudonymization-confirmed, and accepted as a real `source_batch`.
4. The batch reaches `/admin/uef-review`; UEF candidates are generated and bulk-approved.
5. Scoring is run from the approved UEF records.
6. A non-empty KORA Index value and Activation Safeguard status (CLEAR/WARNING/FLAGGED) are asserted — proof of a real scored result, not just an `ok:true` response.
7. The Decision Pack HTML preview is opened and asserted to show the canonical, non-suppressible labels: `KORA Foundation Light`, `KORA Index v1.0`, `pre_empirical_calibration`.
8. Decision Pack PDF generation is checked directly against `/api/admin/decision-pack/pdf` (there is no button wired to this route from the live tenant flow — only the unrelated OP-001 synthetic operator-flow section has one) — the test accepts *either* a real PDF (`200`, `application/pdf`, non-trivial byte size) *or* the route's own documented `501` fallback pointing back at the HTML preview, whichever this environment actually supports. It does not assume one outcome.
9. COMPANY_ADMIN, in a separate browser context (a genuinely separate session, not the same page continuing), reaches `/company/workspace` and `/company/kora-index` and is asserted not to see any worker-level identifier in the rendered markup.

## What this does not cover

- **Exact numeric equality** between this run's KORA Index value and what COMPANY_ADMIN sees — the company workspace shows the latest `kora_index_result` row for the tenant by `created_at`, which this run should produce, but the assertion is structural/reachability, not a value-equality check against this specific run.
- **RLS/DB-level tenant isolation** — that is `tests/integration/rls-two-tenant-negative.test.ts`'s job (RLS-03). This file proves application-level behavior through the UI, not Postgres-level enforcement. Two-tenant isolation via an authenticated E2E is implemented as a skip-safe scaffold in `tests/e2e/two-tenant-isolation.spec.ts` (`PILOT-TWO-TENANT-ISOLATION-01`) — see `docs/E2E_TWO_TENANT_ISOLATION.md`; not yet run live pending COMPANY_B provisioning.
- **Anything in Production.** Same base-URL guard as every other authenticated E2E file in this repo (see below).
- The privacy check (`helpers/privacy.ts`) is a markup smoke check for a short list of forbidden identifier patterns — not proof of RLS enforcement.

## Required environment variables

All read from `process.env` only, never logged, never committed. See `.env.local.example` for the full annotated list.

| Variable | Purpose |
|---|---|
| `E2E_BASE_URL` | Staging base URL. Must not be a Production-looking host without an explicit opt-in (see guard below). |
| `E2E_ALLOW_PRODUCTION` | Must be `true` to run against any non-local `E2E_BASE_URL` at all — including staging. |
| `E2E_KORA_ADMIN_EMAIL` / `E2E_KORA_ADMIN_PASSWORD` | Test-only KORA_ADMIN account. |
| `E2E_COMPANY_A_EMAIL` / `E2E_COMPANY_A_PASSWORD` / `E2E_COMPANY_A_TENANT_CODE` | Test-only COMPANY_ADMIN account. `TENANT_CODE` is **required** here (unlike the read-only smoke fixtures) since the upload step needs an explicit tenant to target. |
| `E2E_GOLDEN_DATA_BEARING_ALLOW_RUN` | Must be `true`. A second, explicit gate on top of credentials — this test **mutates real data** on whatever tenant `E2E_COMPANY_A_TENANT_CODE` points at (new `source_batch`, UEF records, `kora_index_result`, Decision Pack, on every run). Mirrors the `RLS03_ALLOW_RUN`/`RLS05_ALLOW_RUN` convention already used for other mutating/higher-risk test tiers. |

If any of these is unset, the test skips cleanly with zero network calls — it does not fail, and it does not silently no-op without saying so (Playwright reports it as `skipped` with a clear reason string).

## How to run it locally against staging

```bash
export E2E_BASE_URL="https://<staging-host>"
export E2E_ALLOW_PRODUCTION=true          # required for any non-local host, including staging
export E2E_KORA_ADMIN_EMAIL="..."
export E2E_KORA_ADMIN_PASSWORD="..."
export E2E_COMPANY_A_EMAIL="..."
export E2E_COMPANY_A_PASSWORD="..."
export E2E_COMPANY_A_TENANT_CODE="..."     # must be a disposable/synthetic staging tenant
export E2E_GOLDEN_DATA_BEARING_ALLOW_RUN=true
npm run test:e2e -- --grep "GD01"
```

Set values yourself, in your own shell, from a secret store you control. Never paste real credential values into chat, an issue, a PR, or a commit. `.env.local.example` documents variable *names* only — never fill it in with real values.

**Use a disposable/synthetic staging tenant, never a real client's.** Every run of `GD01` creates a new batch/UEF/scoring/Decision Pack trail on whatever tenant `E2E_COMPANY_A_TENANT_CODE` points at; repeated runs are expected to accumulate data on that tenant over time, the same way repeated manual runbook walkthroughs would.

## Skip-safe behavior

Every authenticated E2E file in this repo (`authenticated-smoke.spec.ts`, `golden-admin-company.spec.ts`, `golden-data-bearing.spec.ts`) follows the same pattern: read credentials via `tests/e2e/helpers/env.ts`, and call `test.skip(condition, reason)` before any network activity if anything required is missing. Missing/absent env vars are never treated as failures — they are reported as skipped tests with an explicit reason, so CI/local runs never show a false red or a false green for infrastructure that was never exercised.

## Staging-only rule / Production guard

`tests/e2e/helpers/env.ts#guardBaseUrl()` treats any `E2E_BASE_URL` host other than `localhost`/`127.0.0.1`/`0.0.0.0`/`::1`/`*.local` as production-like and blocks the test (skip, with a clear reason) unless `E2E_ALLOW_PRODUCTION=true` is explicitly set. This is a safety guard, not an access-control mechanism, and this sprint did not change it. There is no separate "staging" allowlist — the guard cannot distinguish staging from Production by hostname alone, so the same explicit opt-in covers both. Running this test is therefore always a deliberate, explicit action, never an accident of an unset variable.

## Known gaps

- **Never yet executed against real staging with real credentials.** This is the central finding of this sprint: `GD01` is fully implemented and has been statically verified (`npx tsc --noEmit` clean; `npx playwright test --list` correctly registers the one test with no execution) — see `docs/GOLDEN_PATH.md`'s checkpoint log, still marked "Not run via fixture." It has not been run because no `E2E_*` credentials or staging environment access were available in the environment this sprint was executed in. This is disclosed here rather than glossed over — no execution result is claimed.
- COMPANY_B tenant does not exist in staging (a provisioning gap tracked separately), so no two-tenant isolation proof exists yet via an authenticated E2E — see the recommended next sprint below.
- Decision Pack PDF: since no live-flow UI button links to `/api/admin/decision-pack/pdf`, this test calls it directly via API rather than a UI click. If the PDF runtime is unavailable in the target staging environment (expected on constrained hosts, see `lib/decision-pack/pdf-strategy.ts`), the test accepts the documented `501` fallback as a pass — this is intentional, not a lowered bar; the alternative would be inventing a UI interaction that doesn't exist in the golden path today.
- `tests/unit/b103-golden-path.test.ts` — despite its name — only asserts static files exist; it does not call the real API or drive the UI and must not be cited as functional golden-path coverage (see `docs/QA_STATUS.md`).

## Relation to the pilot-readiness roadmap

This closes the gap `docs/GOLDEN_PATH.md` and `docs/QA_STATUS.md` both flagged as "implemented but not yet run live" going into this sprint. The remaining pilot-readiness gaps this doc does **not** close: running `GD01` live at least once against staging (requires credentials/access not available to this sprint), and proving two-tenant isolation through an authenticated E2E once a `COMPANY_B` tenant is provisioned (`PILOT-TWO-TENANT-ISOLATION-01`, recommended next).

**Document version:** v1.0
**Created:** 2026-07-06 (PILOT-E2E-GOLDEN-PATH-01)
