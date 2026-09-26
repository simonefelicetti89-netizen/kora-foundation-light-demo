# 250 — KORA · PLAYWRIGHT GOLDEN-PATH TEST REMEDIATION — FOUNDER APPROVAL AND COMMIT

**Date:** 2026-09-22
**Mode:** FOUNDER APPROVAL RECORDED · LOCAL COMMIT CREATED · REMOTE PROOF PENDING
**Predecessors:** `248` (classification) · `249` (implementation + local verification)

---

## §1 — FOUNDER APPROVAL

The test-side remediation documented in report 249 is **APPROVED**.

Classification carried forward unchanged:

> STALE TEST ASSERTION · UNPROPAGATED INTENTIONAL WP-125 SUPERSESSION ·
> TEST-SIDE ONLY · NOT A PRODUCT REGRESSION

---

## §2 — CLASSIFICATION (report 248)

KORA-WP-125 (`0bc14f6`, 2026-09-21) deleted `components/auth/SessionBar.tsx` and
consolidated the authenticated account surface into a single `<AccountMenu />` in
the shared header. The WP-125 unit suite **requires** that removal. The golden-path
E2E spec — last modified 2026-07-27 (`63d7d4a`) — still asserted
`data-testid="session-bar"`. The two mechanisms had become mutually unsatisfiable.
The deterministic CI failure (run `35765864071`, head `d578c1d029…`) was therefore
test-side. The product renders correctly.

---

## §3 — IMPLEMENTATION EVIDENCE (report 249)

| Evidence | Result |
|---|---|
| WORKER | GREEN |
| COMPANY_ADMIN | GREEN |
| KORA_ADMIN | GREEN |
| health | GREEN |
| Playwright total | **4 passed / 0 failed / 0 skipped**, exit 0 |
| WP-125 unit suite | **53/53** — supersession contract preserved |
| `tsc --noEmit` | exit 0 |
| ESLint (changed file) | exit 0 |
| Negative proof | Both mutations failed as required (invalid control name; wrong seeded identity) |
| Product code changed | **NONE** |

Local Playwright was **not** re-run for this task: the diff is byte-identical to the
one verified in report 249 (`git diff --name-only` = the single spec; working tree
clean apart from it immediately before staging).

---

## §4 — PRE-COMMIT SCOPE VERIFICATION

```
$ git diff --name-only
tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts

$ git status --porcelain --untracked-files=all
 M tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts
```

| Path | State |
|---|---|
| `CLAUDE.md` | IDENTICAL TO HEAD (SHA-256 `752bc2bf…`) |
| `.github/workflows/**` | UNCHANGED |
| Product code (`app/ components/ services/ lib/`) | UNCHANGED |
| `tests/unit/**` | UNCHANGED |
| `supabase/migrations/**` | UNCHANGED |
| `scripts/e2e/**` (fixtures/seed) | UNCHANGED |
| `tests/e2e/helpers/local-session.ts` | UNCHANGED |

No unexpected tracked or untracked path existed.

---

## §5 — THE COMMIT

| Field | Value |
|---|---|
| **New SHA** | `cac13b218ff99c3373f92439994aa4749934a2b1` |
| **Parent** | `d578c1d029b52301e9931a0076a305e92f4a30fb` |
| Branch | `r0/ci-real-db-enforcement-2026-09-22` |
| Subject | `test: align golden path with WP125 account menu` |
| Files changed | **exactly 1** |
| Diffstat | `1 file changed, 43 insertions(+), 7 deletions(-)` |

Committed file — the only one:

```
tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts
```

`d578c1d` and `ec0ff454` were **not** amended, rebased or altered in any way.

---

## §6 — PRODUCT UNCHANGED · SUPERSESSION PRESERVED

No product component, route, service, auth logic, navigation, fixture, migration,
RLS policy, CI workflow, unit test or WP-125 implementation is modified by
`cac13b2`. `SessionBar` was **not** restored, no compatibility markup was added,
and no WP-125 assertion was weakened — the WP-125 suite's 53/53 pass is the
mechanical proof that the supersession contract still holds.

---

## §7 — GOVERNANCE STATE (UNCHANGED BY THIS REPORT)

| Item | State |
|---|---|
| R0-A | `R0_COMPLETE` |
| R0-B | `R0_COMPLETE` |
| R0-C | `R0_OPEN` |
| R0-D | `R0_OPEN` |
| R0-C remote-CI precondition | **NOT SATISFIED** |

R0 states are deliberately **not** changed here. Only a genuine, fully-green
GitHub Actions run on the exact tested SHA `cac13b218ff99c3373f92439994aa4749934a2b1`
may move the remote-CI precondition, and that evidence belongs in the next report.

**Remote proof: PENDING at the time of this record.**
