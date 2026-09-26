# 249 — KORA · PLAYWRIGHT GOLDEN-PATH — WP-125 SUPERSESSION TEST REMEDIATION

**Date:** 2026-09-22
**Mode:** AUTHORIZED TEST-SIDE IMPLEMENTATION + LOCAL VERIFICATION — NO PRODUCT CHANGE, NO COMMIT, NO PUSH
**Classification source:** `248_KORA_PLAYWRIGHT_GOLDEN_PATH_LOCAL_REPRODUCTION_AND_CLASSIFICATION.md`
**Parent commit (unchanged):** `d578c1d029b52301e9931a0076a305e92f4a30fb`
**Outcome:** **IMPLEMENTED AND VERIFIED LOCALLY — 4/4 GREEN — AWAITING FOUNDER REVIEW**

This is an implementation/evidence report. **It does not satisfy the R0-C
remote-CI requirement.**

---

## §1 — CLASSIFICATION CARRIED FORWARD (report 248)

> STALE TEST ASSERTION — UNPROPAGATED INTENTIONAL SUPERSESSION
> TEST-SIDE DEFECT · NOT PRODUCT-SIDE · DETERMINISTIC · NOT A PRODUCT REGRESSION

KORA-WP-125 (`0bc14f6`, 2026-09-21) deleted `components/auth/SessionBar.tsx` and
consolidated the authenticated account surface into a single `<AccountMenu />`.
The golden-path E2E spec — last modified 2026-07-27 (`63d7d4a`) — was never
propagated. The Product behaviour established by WP-125 is canonical and is
**left completely untouched** by this remediation.

---

## §2 — CURRENT PRODUCT CONTRACT, VERIFIED FROM COMMITTED SOURCE

Read at `d578c1d` before editing the spec. Report 248's observations were treated
as evidence inputs and independently re-verified here.

| # | Question | Answer, with source |
|---|---|---|
| A | How is session/account presence proven now? | `AccountMenu` returns `null` unless `realRole` is truthy (`AccountMenu.tsx:80`) — it renders **only** for a real Supabase session with a resolved `kora_role`. Rendered exactly once, in `components/layout/Header.tsx:129`, inside `<header>` (role `banner`). Its presence therefore *is* the session proof. |
| B | How is account identity exposed? | Trigger button renders `{email}` (`AccountMenu.tsx:144`) plus initials avatar; the open dropdown renders `{email}` again (`:179`) and the role badge `{badge.label}` (`:195`). |
| C | How does the menu open? | Click the trigger — `aria-label="Menu account"`, `aria-haspopup`, `aria-expanded={open}` (`:94-98`). The dropdown is **conditionally rendered** (`{open && …}`, `:149`) — genuinely absent from the DOM when closed, not merely hidden. This is exactly why the old locator found nothing. |
| D | How is logout invoked? | `<LogoutButton label="Esci dall'account" />` (`AccountMenu.tsx:239`) → `<form action="/api/auth/logout" method="POST"><button type="submit">{label}</button></form>` (`LogoutButton.tsx:16-43`). |
| E | What happens after logout? | `app/api/auth/logout/route.ts:31-35` — role-aware redirect: `WORKER → /worker/login`, `COMPANY_ADMIN → /company/login`, `KORA_ADMIN → /admin/login`. Both wrappers `redirect()` to the unified `/login?role_hint=…` (`app/worker/login/page.tsx:13`, `app/company/login/page.tsx:9`). |

**Consequence of (E):** the spec's existing post-logout predicate
`url.pathname.startsWith('/login')` **remains correct** — the final pathname is
`/login`. It was verified, not assumed, and deliberately left unchanged.

**Seeded roles verified** (`scripts/e2e/seed-local-golden-path.ts:110,120,149`):
`KORA_ADMIN`, `COMPANY_ADMIN`, `WORKER` — so the badge labels asserted below
(`Worker`, `Company Admin`) are the correct canonical values from `ROLE_BADGE`.

---

## §3 — OBSOLETE ASSERTIONS REMOVED

| Location | Obsolete assertion | Why obsolete |
|---|---|---|
| line 79 (WORKER) | `getByTestId('session-bar')` | test id retired with `SessionBar.tsx` by WP-125 |
| line 80 (WORKER) | `getByText(workerCreds!.email).first()` | page-wide, unanchored — replaced by an identity assertion bound to the account surface itself |
| line 88 (WORKER) | `getByRole('button', { name: 'Esci' })` | logout moved inside the conditionally-rendered dropdown; never in the DOM while closed |
| line 106 (COMPANY_ADMIN) | `getByTestId('session-bar')` | as above |
| line 118 (COMPANY_ADMIN) | `getByRole('button', { name: 'Esci' })` | as above |

`session-bar` occurrences in the repository after remediation: **0**.

**No assertion was deleted without replacement.** Each obsolete check was
re-expressed against the current Product contract.

---

## §4 — NEW WORKER ACCOUNT/SESSION ASSERTION

```ts
const workerAccount = page.getByRole('button', { name: 'Menu account' });
await expect(workerAccount).toBeVisible();
await expect(workerAccount).toContainText(workerCreds!.email);
```

Accessible role + accessible name; identity asserted **on the account surface
itself**, which is strictly stronger than the previous page-wide `getByText`.

## §5 — NEW COMPANY_ADMIN ACCOUNT/SESSION ASSERTION

```ts
const companyAccount = page.getByRole('button', { name: 'Menu account' });
await expect(companyAccount).toBeVisible();
await expect(companyAccount).toContainText(companyCreds!.email);
```

Note this is a **net increase in coverage**: the original COMPANY_ADMIN path
asserted no identity at all, only `session-bar`'s presence.
`company-tenant-code` is unchanged and still asserted.

## §6 — REVISED LOGOUT INTERACTION (both personas)

```ts
const workerTrigger = page.getByRole('button', { name: 'Menu account' });
await workerTrigger.click();
await expect(workerTrigger).toHaveAttribute('aria-expanded', 'true');

const workerMenu = page.getByTestId('account-menu-dropdown');
await expect(workerMenu).toBeVisible();
await expect(workerMenu).toContainText(workerCreds!.email);
await expect(workerMenu.getByTestId('account-menu-role-badge')).toHaveText('Worker');

const workerLogout = workerMenu.getByRole('button', { name: "Esci dall'account" });
await expect(workerLogout).toBeVisible();
await workerLogout.click();
await page.waitForURL((url) => url.pathname.startsWith('/login') || url.pathname === '/', { timeout: 15_000 });
```

COMPANY_ADMIN is identical with `'Company Admin'` as the badge.

The full authorised chain is proven: **workspace visible → account control
available → menu opens (`aria-expanded` flips) → identity and role present →
logout available → logout invoked → login boundary reached.**

Interactive controls are located by **accessible role/name**; test ids are used
only to *scope* to the opened dropdown, and every assertion inside that scope is
on user-visible content. No source-text assertion, no file-existence assertion,
no sleep, no raised timeout, no force click, no `|| true`, no per-persona skip,
no failure downgraded to a warning.

---

## §7 — PROOF PRODUCT CODE IS UNCHANGED

```
$ git diff --name-only
tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts

$ git diff --name-only | grep -E '^(app|components|services|lib|supabase|\.github)/'
NONE — no app/, components/, services/, lib/, supabase/, .github/ path touched

$ git diff --name-only | grep -E '^tests/unit/'
NONE — no unit test touched
```

Exactly one file changed. No Product component, route, service, auth logic,
navigation, fixture, migration, RLS policy, CI workflow, unit test or WP-125
implementation was modified. No shared Playwright helper required changing —
`tests/e2e/helpers/local-session.ts` is untouched.

---

## §8 — CI-EQUIVALENT LOCAL ENVIRONMENT AND COMMAND

Node 24.15.0 (`.nvmrc` = 24) · local Docker Supabase · 83/83 migrations, highest
`090` · Playwright 1.60.0 / Chromium · `CI=true` · canonical seed script ·
**full CI env block including `SUPABASE_SERVICE_ROLE_KEY`**.

```bash
# seed (canonical)
SUPABASE_URL=$API_URL SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
E2E_LOCAL_SEED_CONFIRM=YES npx tsx scripts/e2e/seed-local-golden-path.ts

# run (canonical CI step semantics)
export NEXT_PUBLIC_SUPABASE_URL=$API_URL NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY \
       SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
       E2E_LOCAL_SUPABASE_URL=$API_URL E2E_LOCAL_SUPABASE_ANON_KEY=$ANON_KEY
set -a; source .env.e2e-local-golden-path.local; set +a
unset E2E_GOLDEN_DATA_BEARING_ALLOW_RUN; unset E2E_BASE_URL
CI=true npx playwright test tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts
```

The invalid first reproduction from report 248 (which omitted
`SUPABASE_SERVICE_ROLE_KEY`) was **not** repeated.

---

## §9 — RESULT

```
Running 4 tests using 1 worker

  ✓ 1 … health endpoint returns 200 and reports the database reachable (119ms)
  ✓ 2 … WORKER: … worker workspace … cannot reach /company/*, logs out  (2.4s)
  ✓ 3 … COMPANY_ADMIN: … company workspace … cannot reach /worker/*, logs out (2.0s)
  ✓ 4 … KORA_ADMIN: real local session reaches the admin home          (807ms)

  4 passed (8.8s)          exit code 0
```

| Scenario | Result |
|---|---|
| health | **GREEN** |
| WORKER | **GREEN** (incl. logout through the account menu) |
| COMPANY_ADMIN | **GREEN** (incl. logout through the account menu) |
| KORA_ADMIN | **GREEN** |
| Skips | **NONE** |
| New failure discovered | **NONE** — no separate classification required |

Logout specifically: both personas open the menu, `aria-expanded` flips to
`true`, the canonical logout control is found and clicked, and the login boundary
is reached. Previously this path had never executed at all — it was blocked
behind the `session-bar` failure.

---

## §10 — NEGATIVE PROOF (assertions are meaningful)

Performed on a **disposable copy** (`tests/e2e/zz-negative-proof-disposable.spec.ts`),
never on Product source, and deleted immediately afterwards.

| Mutation | Result |
|---|---|
| **A** — invalid account control name: `'Menu account'` → `'Menu account inesistente'` | **FAILED as required**, exit 1: `Locator: getByRole('button', { name: 'Menu account inesistente' })` → `element(s) not found` |
| **B** — wrong seeded identity: `workerCreds!.email` → `'identita-sbagliata@e2e-local.test'` | **FAILED as required**, exit 1: `toContainText` → `Received string: "E2e2e-worker-3b186ff8@e2e-local.test"` |

Both repaired assertions therefore genuinely discriminate. The disposable file was
removed (`rm -f`) and its absence verified; `test-results/` was cleared.

---

## §11 — REGRESSION EVIDENCE

| Suite | Result |
|---|---|
| Targeted golden-path Playwright suite | **4 passed**, exit 0 |
| **WP-125 unit suite** (`kora-wp-125-shared-product-experience-foundation.test.ts`) | **53/53 passed** — the supersession contract is preserved, `SessionBar` stays absent |
| `tsc --noEmit` | **exit 0**, no diagnostics |
| `eslint` on the changed file | **exit 0**, no findings |
| Playwright helper tests | none exist; `helpers/local-session.ts` unchanged |
| Full Vitest | not mandatory — a single E2E spec changed, no shared helper or test infrastructure touched |

---

## §12 — CLAUDE.md AUTO-MUTATION HANDLING

`CLAUDE.md` baseline recorded before any execution, without altering it:

```
SHA-256 752bc2bf0109628a891078c795eba74e437a84d7a143f7449822cac5f255599c
35 609 bytes · git blob 4cfe210cfc8ce3c16dbdbf2cafaf3448efc74a8b
```

As predicted in report 248 §8, Next.js 16.3.3's `next dev` — started by
Playwright's own `webServer`, i.e. by the CI contract itself — appended its
`nextjs-agent-rules` block on **every** run. Checked after each Next-dev-starting
command and restored immediately each time via `git checkout -- CLAUDE.md`.

Final state: SHA-256 back to `752bc2bf…`, `git diff HEAD -- CLAUDE.md` empty.
**Zero CLAUDE.md change in the final diff.** No intentional edit was ever made.

---

## §13 — EXACT CHANGED FILES

```
$ git diff --stat
 .../pilot-trust-01-golden-path-local-smoke.spec.ts | 50 +++++++++++++++++++---
 1 file changed, 43 insertions(+), 7 deletions(-)

$ git diff --name-only
tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts

$ git status --porcelain
 M tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts
```

Nothing staged. No commit. No push. HEAD remains `d578c1d029…`.

---

## §14 — GOVERNANCE STATE (UNCHANGED BY THIS TASK)

| Item | State |
|---|---|
| R0-A | `R0_COMPLETE` — untouched; `ec0ff45` and `d578c1d` semantics not modified |
| R0-B | `R0_COMPLETE` |
| R0-C | `R0_OPEN` |
| R0-D | `R0_OPEN` |
| R0-C remote-CI precondition | **NOT SATISFIED** — requires a genuine fully-green GitHub run |
| CI workflow | **UNCHANGED** — no workflow change was needed or made |

No roadmap execution occurred: R0-C, R0-D, WP-068, WP-132, PX-C, Gate 3, WP-117,
WP-019, WP-120, WP-069 all untouched. No scope trigger activated. No contact with
remote Supabase, Vercel, staging or Production.
`scripts/provision-next-review.mjs` was never opened, read, searched, hashed,
copied, modified, staged, moved, renamed, deleted, archived or targeted.

---

## §15 — RECOMMENDATION FOR REMOTE CI RERUN

**READY FOR FOUNDER TEST-REMEDIATION REVIEW.**

On approval: commit the single-file change with parent
`d578c1d029b52301e9931a0076a305e92f4a30fb`, then advance the temporary proof ref
`integration/r0a-ci-proof-2026-09-22` to obtain a genuine remote run. Only a
fully-green GitHub run may move R0-C's precondition to SATISFIED — this local
evidence does not.

The residual local/CI difference is unchanged from report 248 §2: CI starts
Supabase fresh, whereas the local stack was long-running but schema-identical
(83/83, highest `090`). Nothing in the repaired assertions depends on stack age.
