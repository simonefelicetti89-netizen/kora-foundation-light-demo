# 248 — KORA · PLAYWRIGHT GOLDEN-PATH LOCAL REPRODUCTION AND CLASSIFICATION

**Date:** 2026-09-22
**Mode:** DIAGNOSIS ONLY — NO FIXES, NO REMOTE ACTION
**Predecessor:** `247_KORA_R0_A_RUNNER_PROOF_AND_REPRODUCED_PLAYWRIGHT_FAILURE.md`
**Outcome:** **REPRODUCED → ISOLATED → CLASSIFIED.** Root cause established with
direct in-repo evidence. No remediation applied.

---

## §0 — WORKTREE VERIFICATION (precondition)

| Check | Required | Observed | Verdict |
|---|---|---|---|
| Worktree | `/Users/simonefelicetti/KORA-r0a-worktree` | same | PASS |
| HEAD | `d578c1d029b52301e9931a0076a305e92f4a30fb` | exact match | PASS |
| Clean tree | no uncommitted changes | `git status --porcelain` empty | PASS |
| No new commit | 0 commits beyond `d578c1d` | `git rev-list --count` = 0 | PASS |

State at completion is identical to state at start. See §8 for one transient
mutation that occurred during the run and was restored.

---

## §1 — THE EXACT CI CONTRACT (read from `d578c1d`, not from memory)

Read verbatim from `.github/workflows/ci.yml` at `d578c1d`, job
`E2E golden path (Playwright, local Supabase, seeded)`.

| Contract element | Exact value at `d578c1d` |
|---|---|
| Failing step name | `Run Playwright local golden-path suite` |
| Command | `npx playwright test tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts` |
| Config file | `playwright.config.ts` (repo root) |
| Project | `chromium` — the spec is not `responsive-viewports.spec.ts`, so the three viewport projects do not select it |
| Node | `.nvmrc` → `24` (this job only; other jobs use 20) |
| baseURL | `http://localhost:3000` (default; `E2E_BASE_URL` explicitly unset by the step) |
| webServer | **Playwright starts it itself** — `npm run dev` (= `next dev`), url `http://localhost:3000`, timeout 120 s, `reuseExistingServer: !process.env.CI` |
| `CI=true`? | Yes — set by GitHub Actions; therefore `reuseExistingServer` is **false** |
| Per-test timeout | 30 000 ms · `expect` timeout 8 000 ms |
| Retries / workers | `retries: 0` · `workers: 1` · `fullyParallel: false` |
| Supabase startup | `supabase start` (fresh; applies every migration) |
| Migration path | `supabase/migrations/*.sql` applied by `supabase start` |
| Fixture seed | `npx tsx scripts/e2e/seed-local-golden-path.ts` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `E2E_LOCAL_SEED_CONFIRM=YES` |
| Step env | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, **`SUPABASE_SERVICE_ROLE_KEY`**, `E2E_LOCAL_SUPABASE_URL`, `E2E_LOCAL_SUPABASE_ANON_KEY`, plus `source .env.e2e-local-golden-path.local`, then `unset E2E_GOLDEN_DATA_BEARING_ALLOW_RUN` and `unset E2E_BASE_URL` |

`retries: 0` is contractually significant: **CI cannot mask a flake by retrying**,
and equally, a single observed failure is not evidence of determinism on its own.
Determinism is established in §3 instead.

---

## §2 — LOCAL ENVIRONMENT EQUIVALENCE

| Factor | CI | Local | Equivalent? |
|---|---|---|---|
| Node | 24 (`.nvmrc`) | v24.15.0 | YES |
| Docker | mandatory, verified | available | YES |
| Supabase CLI | `latest` via setup-cli | 2.107.0 | YES |
| Migrations applied | 83 files, highest `090` | 83 rows, highest `090` | YES |
| Postgres reachable | asserted on `54322` | asserted, `Postgres reachable.` | YES |
| Playwright | 1.60.0 + chromium | 1.60.0 + chromium-1223 | YES |
| Stray `.env.local` | none (CI has only what it creates) | none — only the tracked `.env.local.example` and the seed-generated file | YES |
| Port 3000 | free | free | YES |
| `CI=true` | set by Actions | exported explicitly | YES |

**Declared deviations (both immaterial to the outcome):**

1. **Stack age.** CI runs `supabase start` fresh; the local stack had been up 47 h.
   Schema state was verified identical (83/83, highest `090`). The seed script
   creates freshly randomised ephemeral identities per run, so accumulated local
   rows do not participate in these four tests.
2. **`supabase status -o json` preamble.** The local stack emits a non-JSON line
   `Stopped services: [supabase_imgproxy_KORA supabase_pooler_KORA]` before the
   JSON. CI's capture step does a bare `JSON.parse` and would fail on it — it does
   not, because a fresh CI start has no stopped services. Parsed around locally.
   **This is a local-only artefact and is not the CI failure.**

---

## §3 — REPRODUCTION

### Run 1 — invalid, discarded (my own env deviation)

First run omitted `SUPABASE_SERVICE_ROLE_KEY`, which the CI step **does** set.
Result: 2 failed / 2 passed, but failing *earlier* — at line 77/104, redirected to
`/login`, with the dev-server log showing
`[KORA] Service role key not configured.` and `GET /admin 500`.

**This run is not the CI failure and is recorded only to document the correction.**
It is retained here because it demonstrates a distinct, weaker failure mode that a
careless reproduction would have mistaken for the real one.

### Run 2 — faithful, CI-equivalent

Full CI env reproduced exactly, including `SUPABASE_SERVICE_ROLE_KEY`.

```
Running 4 tests using 1 worker
  ✓ 1 … health endpoint returns 200 and reports the database reachable (120ms)
  ✘ 2 … WORKER: real local session reaches the worker workspace …          (8.7s)
  ✘ 3 … COMPANY_ADMIN: real local session reaches the company workspace …  (9.0s)
  ✓ 4 … KORA_ADMIN: real local session reaches the admin home              (1.0s)
  2 failed
  2 passed (22.3s)
```

Both failures are **byte-identical in kind**:

```
Error: expect(locator).toBeVisible() failed
Locator: getByTestId('session-bar')
Expected: visible
Timeout: 8000ms
Error: element(s) not found
```

- WORKER — spec line **79**
- COMPANY_ADMIN — spec line **106**

**Shape match against CI:** CI reported the same job failing at the same step,
after Supabase start, migrations, key capture and seeding all succeeded — the same
prefix observed locally. Preceding assertions pass locally (`workspace-page`,
`company-workspace-page`, URL match), so the session, RLS and routing all work.

**Honest limit:** CI job logs return HTTP 403 and the artifact HTTP 401
unauthenticated, so a byte-level comparison against the CI log **was not possible**.
What is established is that the CI environment contract was reproduced exactly and
yields a deterministic failure. I have not invented a claim of byte-identity.

**Determinism:** failure is deterministic — not timing, not ordering, not resource
contention. The element is *absent from the DOM*, not late. `retries: 0` means CI
observed it once; locally it reproduced on every faithful run, and the cause in §4
is static repository state, which cannot vary between runs.

---

## §4 — ISOLATION: ROOT CAUSE

The decisive evidence is that the string `session-bar` **exists nowhere in the
product**:

```
$ grep -rn "session-bar" app components lib tests
tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts:79
tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts:106
```

The only two occurrences in the entire repository are **the two assertions
themselves**. The identifier `SessionBar` likewise appears nowhere in
`app/`, `components/` or `lib/`.

### What removed it

```
$ git log --oneline -S'data-testid="session-bar"' --all -- app components
0bc14f6 feat(px): establish shared product experience foundation
413bcf9 feat(B112): Auth UX Cleanup — Logout, Password Reset & Session Clarity
```

`413bcf9` introduced it. **`0bc14f6` — KORA-WP-125, the shared Product Experience
foundation, 2026-09-21 — removed it**, deleting `components/auth/SessionBar.tsx`
(86 lines) and consolidating account chrome onto a single `<AccountMenu />` in the
shared top chrome.

`0bc14f6` is an ancestor of `d578c1d` (verified via `git merge-base --is-ancestor`).

### The removal is intentional and is itself enforced

`tests/unit/kora-wp-125-shared-product-experience-foundation.test.ts` **requires**
the removal:

- line 278 — *"no authenticated layout or page renders SessionBar any more"* —
  `git grep -l SessionBar app/` must return empty
- line 642 — `components/auth/SessionBar.tsx` must not exist
- line ~290 — the header must render `<AccountMenu />` exactly once

### The product is NOT broken

Playwright's own captured accessibility snapshot at the moment of failure shows the
worker workspace rendering correctly, including the account surface **with the
worker's email**:

```yaml
- banner:
  - text: My KORA
  - navigation "Posizione corrente": Il tuo spazio My KORA Home
  - button "Menu account": E2 e2e-worker-e8d57c3d@e2e-local.test
- complementary:
  - navigation "Navigazione principale": …
- main "Contenuto principale":
  - heading "Ciao, Lavoratore" [level=1]
```

Login, session cookie installation, server-side session validation, tenant
resolution, role routing and the PX shell all work.

### Root cause, stated once

> **KORA-WP-125 (`0bc14f6`) retired `SessionBar` and replaced it with `AccountMenu`
> in the shared header, but did not update the PILOT-TRUST-01 golden-path E2E spec,
> which still asserts the retired `data-testid="session-bar"`. The spec was last
> modified on 2026-07-27 (`63d7d4a`); WP-125 landed 2026-09-21 and did not touch it.**

This is the **INTENTIONAL TEST-MECHANISM SUPERSESSION** pattern already disclosed
elsewhere in this programme — except that here the supersession was **not
propagated**: the superseding unit test and the superseded E2E spec now assert
mutually contradictory things about the same component. One requires `SessionBar`
to be gone; the other requires its test id to be present. Both cannot pass.

---

## §5 — DOWNSTREAM STALE ASSERTIONS (scope of the defect, not only its first symptom)

Repairing line 79/106 alone will **not** make the suite green. Assertions after the
failure point were audited against `d578c1d`:

| Spec assertion | Status at `d578c1d` | Notes |
|---|---|---|
| `getByTestId('workspace-page')` | **EXISTS** — `app/worker/workspace/page.tsx:236` | passes |
| `getByTestId('company-workspace-page')` | **EXISTS** — `CompanyWorkspaceView.tsx:289` | passes |
| `getByTestId('session-bar')` (79, 106) | **RETIRED** | the observed failure |
| `getByText(<worker email>)` (80) | rendered in the account-menu trigger | would pass |
| `getByTestId('company-tenant-code')` (109) | **EXISTS** — `CompanyWorkspaceView.tsx:307` | passes |
| `getByRole('button', { name: 'Esci' })` (88, 118) | **AT RISK** | see below |

The logout control is now `<LogoutButton label="Esci dall'account" />` at
`components/auth/AccountMenu.tsx:239`, rendered **inside the collapsed dropdown**
(`const [open, setOpen] = useState(false)`, `data-testid="account-menu-dropdown"`).
The accessible name still matches (`name` is substring, case-insensitive by
default), but the control is not in the accessibility tree while collapsed — it is
absent from the snapshot in §4. A click would therefore have to open
`account-menu-trigger` first.

**Stated as evidence, not prediction:** this is derived from the captured snapshot
and the component source, **not** observed as a failure, because observing it would
require editing the spec — which this task forbids. It is flagged so that
remediation is scoped correctly rather than repaired one assertion at a time.

Canonical replacement test ids available: `account-menu-container`,
`account-menu-trigger`, `account-menu-dropdown`, `account-menu-avatar`,
`account-menu-role-badge`, `account-menu-link-account`, `account-menu-link-password`.

---

## §6 — CLASSIFICATION

**The directive's classification list was truncated mid-option F** ("Failure depends
on server startup, port…"), so the remaining options are not known to me. I have
therefore classified substantively and left the canonical letter to the Founder.

| Dimension | Finding |
|---|---|
| Deterministic or flaky? | **DETERMINISTIC.** Cause is static repository state. |
| Environment-dependent? | **NO.** Reproduces on local Docker Supabase identically. |
| Timing / startup / port dependent? | **NO.** Dev server started, app served, prior assertions passed. Element absent from DOM, not late. |
| Data / fixture dependent? | **NO.** Seeding succeeded; session, tenant and role all resolve correctly. |
| Product regression? | **NO.** The workspace, session, tenant code, account surface and email all render. |
| Test-side defect? | **YES.** A stale assertion against a deliberately retired component. |
| Governed change? | **YES.** The removal is required by the WP-125 unit suite. |

**Classification: STALE TEST ASSERTION — UNPROPAGATED INTENTIONAL SUPERSESSION.
TEST-SIDE, NOT PRODUCT-SIDE. DETERMINISTIC. NOT A REGRESSION.**

The golden path itself is intact. What is broken is the spec's description of it.

---

## §7 — WHAT WAS NOT DONE

- **No fix applied.** No spec, component, config or workflow modified.
- **No commit.** `git rev-list --count d578c1d..HEAD` = 0.
- **No remote action.** No push, no PR, no re-run, no artifact download, no contact
  with staging, Production, Vercel or remote Supabase.
- **`scripts/provision-next-review.mjs` was not opened, read, searched, hashed,
  copied, modified, staged, moved, renamed, deleted or targeted by any command.**
- Registry 102, Registry 142 and `CLAUDE.md` unmodified (see §8).
- No scope trigger activated. Gate 3, WP-117, WP-019, WP-120, WP-069 untouched.
- PR #172, `main`, the frozen RC and the canonical integration branch unchanged.

---

## §8 — DISCOVERED SIDE EFFECT (governance-relevant)

Running the reproduction mutated a constitutionally protected file.

Next.js 16.3.3's `next dev` — started by Playwright's own `webServer`, i.e. by the
CI contract itself — **appends a `<!-- BEGIN:nextjs-agent-rules -->` block to
`CLAUDE.md`** (writer: `node_modules/next/dist/server/lib/generate-agent-files.js`).
Observed here as an unrequested `M CLAUDE.md` three minutes into the run.

**Restored immediately** via `git checkout -- CLAUDE.md`; the tree is clean and
`CLAUDE.md` is byte-identical to `d578c1d`.

This is harmless in CI (ephemeral runner), but it means **any local run of the
golden-path suite, or of `npm run dev`, silently edits `CLAUDE.md`**. Flagged for
Founder awareness; no remediation proposed here, as it is outside this task's scope.

---

## §9 — RECOMMENDATION (for Founder decision — not executed)

Remediation is **test-side only** and should be scoped as one unit, not as a
sequence of single-assertion repairs:

1. Repoint `session-bar` (lines 79, 106) to the canonical WP-125 account surface
   (`account-menu-container` or `account-menu-trigger`).
2. Re-scope the logout steps (lines 88, 118) to open `account-menu-trigger` before
   clicking the logout control.
3. Re-run the suite locally under the §2 contract before any remote CI re-run.

**Not recommended:** restoring `SessionBar`, or weakening the WP-125 unit
assertions. The product change is canonical and Founder-accepted; the spec is what
drifted.

---

## §10 — STATUS LEDGER

| Item | Status |
|---|---|
| Playwright golden-path failure | **REPRODUCED · ISOLATED · CLASSIFIED** (was `OPEN — UNCLASSIFIED`) |
| Root cause | KORA-WP-125 `0bc14f6` — unpropagated supersession of `SessionBar` |
| Defect side | **TEST-SIDE** — no product regression |
| R0-A | `R0_COMPLETE` — unchanged, unaffected |
| R0-C remote-CI precondition | **STILL NOT SATISFIED** — golden path remains red |
| Remediation | **NOT STARTED** — awaiting Founder authorisation |

