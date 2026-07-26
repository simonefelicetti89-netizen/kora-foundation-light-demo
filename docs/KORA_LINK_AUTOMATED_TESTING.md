# KORA Link — Automated Behavioral Testing

**Sprint:** KORA-LINK-HARDENING-AUTOMATION-13C

Transforms the C1–C10 Gate 4 scenario matrix
(`docs/KORA_LINK_GATE_4_FINAL_REPORT.md`) — originally validated manually
during KORA-LINK-RLS-LIVE-VALIDATION-11 (KL11) — into a repeatable,
maintainable, repo-committed automated suite.

---

## 1. Architecture — three levels

KORA Link test coverage is split across three distinct levels, each with a
different purpose, trust boundary, and execution trigger. Do not blur them.

| Level | What | Where | When it runs |
|---|---|---|---|
| **A. Unit / static** | Parses `supabase/migrations/*.sql` as text; asserts structural properties (policy inventory, grants, signatures, response shape, feature flags, migration numbering, no-raw-token invariants, documentation consistency). No database involved. | `tests/unit/kora-link-*.test.ts` (vitest) | Every PR/push — part of `npm test` in `.github/workflows/ci.yml`. |
| **B. Local database integration** | Real Postgres, real RLS, real `SECURITY DEFINER` function execution, real two-connection concurrency — against an ephemeral **local** Supabase CLI stack (Docker). | `scripts/kora-link/run-behavioral-suite.ts` | Every PR/push, in a dedicated CI job — **only if Docker is available** (always true on GitHub-hosted runners; the job self-skips gracefully otherwise). Also runnable locally on demand. |
| **C. Live staging** | A deliberately narrower, representative subset of the same contracts, re-confirmed against real staging infrastructure (real Supabase Auth/RLS/Postgres, real network latency) — most importantly the C10 concurrency races, which behave differently under real network conditions than against loopback. | `scripts/kora-link/run-live-staging-suite.ts` | **Never automatically.** Manual `workflow_dispatch` only (`.github/workflows/kora-link-live-staging.yml`), or run locally by a human with the right secrets. |

Level A proves the SQL text says what we intend. Level B proves the SQL
*executes correctly* against a real database. Level C proves the same holds
against the real target environment. Each level is necessary; none of them
substitutes for another.

---

## 2. Local commands

```bash
# Full C1-C10 behavioral suite (starts nothing — see prerequisites below)
npm run test:kora-link:behavioral

# C10 concurrency only
npm run test:kora-link:concurrency

# Live staging (manual, requires explicit env vars — see §6)
npm run test:kora-link:live-staging
```

Direct invocation (equivalent, useful for `--only=` filtering):

```bash
npx tsx scripts/kora-link/run-behavioral-suite.ts
npx tsx scripts/kora-link/run-behavioral-suite.ts --only=c9
```

`--only=` accepts any of `c1` through `c10`.

---

## 3. Prerequisites (local suite)

1. Docker running.
2. Supabase CLI installed (`supabase --version`).
3. `supabase start` already run in this repo — the runner does **not** start
   the stack itself, so a stale or half-started stack is always visible to
   whoever runs it, rather than silently masked.

By default the runner then runs `supabase db reset` itself, to guarantee a
clean, fully-migrated (001–042) database before every run. Set
`KORA_LINK_SKIP_DB_RESET=1` to skip this — e.g. to run the suite repeatedly
without re-seeding each time, or when a CI step already reset the database.

The runner refuses to run against anything other than `127.0.0.1`/`localhost`
(see `assertLocalOnly()` in the script) — it cannot accidentally target
staging or production, regardless of environment variables.

---

## 4. Scenario coverage (C1–C10)

All scenarios below are exercised by `run-behavioral-suite.ts` against a real
local database (Level B). Each has an `id` (e.g. `C5.3`) matching the JSON
report's `results[].id`.

| # | Scenario | Sub-scenarios covered |
|---|---|---|
| **C1** | ANON | Deny-by-default on all 9 `kora_link.*` tables; the two documented public exceptions (`fn_public_lookup_link`, `fn_is_valid_token_digest`); no execution grant on admin/company RPCs. |
| **C2** | WORKER IDENTITY | Valid mapping; missing mapping; disabled mapping; tenant mismatch; forged claim (no backing row); own-row `SELECT` access. |
| **C3** | ACTIVATION LIFECYCLE | Valid; invalid/nonexistent token; expired TTL; revoked; duplicate (`already_active`); cross-tenant; disabled worker; missing mapping; no raw token persisted in `link_events`/acknowledgements. |
| **C4** | REVOCATION | `KORA_ADMIN`-only (`WORKER`/`COMPANY_ADMIN` denied); success + `039` audit write; duplicate (`already_terminal`, idempotent audit); revoked-not-reactivatable; acknowledgement survives (append-only); explicit expired→revoked transition. |
| **C5** | COMPANY ADMIN/VIEWER | `company_identity` valid/missing/disabled/tenant-mismatch/role-mismatch/claim-only; `COMPANY_ADMIN` allowed; `COMPANY_VIEWER` denied (pre-existing contract, unaffected by provisioning). |
| **C6** | PARTNER | `is_provisioned_partner()` valid/missing/disabled; deny-by-default preserved on activate/revoke/aggregate; no direct table access. |
| **C7** | KORA_ADMIN | Cross-tenant by design; revoke/replace in any tenant; `UPDATE` rejected on append-only tables; `DELETE` rejected everywhere; no raw token in admin-visible audit rows. |
| **C8** | SERVICE ROLE | `BYPASSRLS` ≠ blanket grant (no `DELETE`); constraints still enforced; internal `KORA_ADMIN` role-check still gates revoke/replace; no `EXECUTE` grant on the two provisioning helpers. |
| **C9** | SAFE AGGREGATION | 9 suppressed, 10 visible, 11 visible (no off-by-one); per-bucket independence; tenant scope (no cross-tenant bleed); result shape is exactly `(status, count, suppressed)`. |
| **C10** | CONCURRENCY | Two real PostgreSQL connections. A1 vs A2, A1 vs A1, A1 vs B1 (cross-tenant — asymmetric eligibility, see note below); rollback recovery (an explicitly rolled-back attempt leaves no residue). |

**Note on C10.3 (A1 vs B1):** unlike the symmetric races (C10.1/C10.2), this
race is *asymmetric* — worker B does not belong to the link's tenant. The row
lock (`FOR UPDATE NOWAIT`) is acquired before the tenant check runs, so it is
legitimate for **either** outcome to occur depending on which request wins
the lock: (a) worker A wins the lock and activates, worker B loses the lock
(`concurrent_request`); or (b) worker B wins the lock but then fails the
tenant check (`unavailable`), and worker A loses the lock
(`concurrent_request`) — meaning **zero** activations that iteration, which
is correct, not a bug. The only invariant that must always hold is: worker B
(wrong tenant) never reaches `activated`, and never more than one active
assignment row exists. The suite asserts exactly that, not "exactly one
winner" (which only holds for the symmetric races).

---

## 5. Local vs. live — what differs

| | Local (Level B) | Live staging (Level C) |
|---|---|---|
| Target | Ephemeral Docker Postgres, wiped every run | Real staging project (`haqf****jl`) |
| Coverage | Exhaustive — all C1–C10 sub-scenarios (85 assertions) | Representative subset — one or a few assertions per C1–C10, plus a full C10 race |
| Trigger | Every PR/push (CI), or on demand | Manual only — `workflow_dispatch` with explicit confirmation, or run by hand |
| Fixture prefix | `KORA_LINK_AUTOMATION_` | `KL11_AUTOMATION_` |
| Auth/network | Simulated JWT claims via `set_config`, loopback network | Same claim-simulation technique, but real Supabase infrastructure and real network latency |
| Safety gates | Refuses any non-`127.0.0.1`/`localhost` connection | Requires `KORA_LINK_LIVE_TESTS_CONFIRM=YES`, verifies the project ref, rejects Transaction-pooler (6543), rejects a service-role key used as a password, rejects anything matching `prod` |

The live suite exists specifically because concurrency behavior (C10) and
real Supabase Auth/RLS integration can differ under real network conditions
in ways a loopback database cannot fully reproduce. It is not meant to
duplicate the local suite's exhaustive coverage — that would just make an
opt-in, human-gated action slower and riskier for no added confidence.

---

## 6. Secrets and environment variables

**Local suite:** no secrets. `KORA_LINK_LOCAL_DB_URL` may override the
default local Supabase CLI connection string
(`postgresql://postgres:postgres@127.0.0.1:54322/postgres` — Supabase CLI's
own well-known, non-secret local development default), but the script refuses
to use it against anything other than `127.0.0.1`/`localhost`.

**Live staging suite** requires three environment variables, none of them
committed to this repository:

| Variable | Source | Notes |
|---|---|---|
| `KORA_LINK_LIVE_TESTS_CONFIRM` | Set explicitly at invocation time | Must be exactly `YES`. Anything else (including unset) aborts before any connection is attempted. |
| `KORA_LINK_STAGING_DB_URL` | Local `.env.*.local` file, or a GitHub Actions repository/environment secret | Supavisor **Session pooler**, port 5432, only. The script rejects port 6543 (Transaction pooler) and rejects a password string that looks like a service-role JWT (`eyJ...`). |
| `KORA_LINK_STAGING_PROJECT_REF` | Same as above | The expected project ref the script verifies the connection against before running anything; also used for a defense-in-depth check that neither the ref nor the connection string contains the substring `prod`. |

CI's `kora-link-live-staging.yml` workflow reads these from
`secrets.KORA_LINK_STAGING_DB_URL` / `secrets.KORA_LINK_STAGING_PROJECT_REF`
— they must be configured as GitHub Actions secrets before that workflow can
be run; the workflow does not create them and never prints their values.

---

## 7. Cleanup

Both runners track every fixture they create (tenants, batches, links,
worker/company/partner identities) and remove them in a `finally` block —
cleanup always runs, whether the suite passed or failed, and whether it
crashed with an unhandled exception or not. The local runner additionally
throws a loud, explicit error if it ever finds a residual fixture row
matching its own prefix after cleanup, rather than silently reporting
"0 residual" when that isn't actually true.

Neither runner ever deletes or modifies the pre-existing KL11 base fixtures
(`KL11_ADMIN`, `KL11_COMPANY_ADMIN_A`, `KL11_COMPANY_VIEWER_A`,
`KL11_PARTNER_P1`, `KL11_TENANT_A`, `KL11_TENANT_B`) — only rows the runner
itself created, under its own fixture prefix, are ever removed.

---

## 8. Interpreting results

Both runners print progress to `stderr` as they run (`[PASS]`/`[FAIL]` per
scenario, for readability) and print a single JSON report to `stdout` at the
end:

```json
{
  "timestamp": "2026-07-26T...",
  "total": 85,
  "passed": 85,
  "failed": 0,
  "results": [
    { "id": "C1.1", "scenario": "C1", "description": "...", "passed": true }
  ]
}
```

Exit code is `0` if every scenario passed, `1` otherwise — safe to use
directly as a CI gate. The CI job in `ci.yml` uploads this JSON as a build
artifact (`kora-link-behavioral-report`) so a failure can be triaged without
re-running the suite.

Neither runner ever prints a full UUID, token, digest, or credential — see
`mask()` in each script. Where a value must be shown for context (e.g. the
staging project ref in a log line), it is always masked to
`first-4-chars****last-2-chars`.

---

## 9. Anti-production policy

- The local runner structurally cannot target anything but
  `127.0.0.1`/`localhost` (`assertLocalOnly()` — checked before any query,
  not just documented).
- The live staging runner requires an explicit, human-provided
  `KORA_LINK_STAGING_PROJECT_REF` and verifies the actual connection against
  it before running anything; it additionally refuses to run if either the
  expected ref or the connection string contains the substring `prod`,
  independent of the ref-match check.
- Neither runner is ever invoked automatically against anything beyond the
  local Docker stack. The live staging workflow is `workflow_dispatch`-only
  and additionally gated behind a manual `confirm: YES` input at trigger
  time, on top of the script's own `KORA_LINK_LIVE_TESTS_CONFIRM` gate — two
  independent human confirmations are required, not one.
- No migration is ever applied by either runner. Schema state is a
  precondition the runner verifies (`verifySchemaReady()` / the
  `is_provisioned_company_role` existence check) and refuses to proceed past
  if migrations are missing — it never runs `supabase migration up`,
  `supabase db push`, or any DDL of its own beyond the fixture tables it is
  explicitly scoped to (tenants, workers, batches, links, identities).

---

## 10. BEHAVIORAL-MISSING reduction (`it.todo` reclassification)

Before this sprint, 24 `it.todo()` markers across
`tests/unit/kora-link-audit-hardening-13a.test.ts`,
`tests/unit/kora-link-company-partner-provisioning-13b.test.ts`, and
`tests/unit/kora-link-security-foundation-08.test.ts` documented scenarios
that needed a live database and were explicitly deferred to this sprint. This
sprint reclassified all 24:

- **16 implemented** — now covered by `run-behavioral-suite.ts` and removed
  as `it.todo()`, replaced with a comment pointing at the exact scenario
  `id`(s) that cover them.
- **3 removed as obsolete** — the original item's own text already said "N/A"
  (two cases), or the "behavioral" version would add no evidence beyond an
  already-complete static check (the token_value column-absence case).
- **5 kept**, each with an explicit, specific reason:
  - 2 — a genuine fault-injection harness (forcing an `audit_log` `INSERT` to
    fail mid-transaction) is not yet built; approximating it risked leaving
    the database in a broken state if a restore step were ever skipped.
  - 1 — a revoke-vs-activate race is a broader scenario than the original
    Gate 4 C10 matrix (activate-vs-activate only); whether to expand C10's
    scope is a genuine open design question, not a coverage gap in the
    current scope.
  - 1 — HMAC entropy/collision resistance under a production secret is a
    cryptographic research question, not something a repeatable CI scenario
    can meaningfully assert.
  - 1 — the DPO break-glass read procedure has no design yet at all; there
    is nothing to automate until that design exists.

No `it.todo()` was converted into a fake `it()` pass — every removed todo
corresponds to a real, runnable scenario in `run-behavioral-suite.ts` that
was executed and observed to pass against a real local database as part of
this sprint's own validation.
