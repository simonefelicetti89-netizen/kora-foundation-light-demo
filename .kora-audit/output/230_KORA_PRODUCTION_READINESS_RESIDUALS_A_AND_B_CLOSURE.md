# 230 — Production Readiness Residuals A & B: Closure

**Filed because Residual B changed an item's status from OPEN to CLOSED, which report `229` left
open — not for pre-check findings alone. Residual A required no change.**

---

## Residual A — `AUDIT_HASH_SALT` fallback: **INTENTIONAL, not a defect**

**Canonical requirement, established from the three sources required:**

| Source | Evidence |
|---|---|
| Code | `lib/audit/log-access.ts:14` — `const HASH_SALT = process.env.AUDIT_HASH_SALT ?? 'kora-audit-salt';` |
| **Tests** | `tests/unit/b168-7-audit-enrichment.test.ts:21-23` — *"reads AUDIT_HASH_SALT from process.env **with fallback**"*, asserting `expect(src).toContain("'kora-audit-salt'")`. The fallback, including its literal value, is **asserted as required structure**. |
| **Tests** | same file, Group 3 — asserts `.env.local.example` contains `AUDIT_HASH_SALT=cambia-questo-valore-in-produzione` |
| Config | `.env.local.example:55` — the placeholder literally instructs *"change this value in production"* |

**Verdict: the static fallback is INTENTIONAL and acceptable.** The canonical contract is a
two-part design: a fallback so local development runs without configuration, plus an explicit,
test-enforced instruction that a real salt is set **in production**. The unconfigured state is a
*deployment-configuration* gap, not a code defect.

**Remediation required: NO.** Removing the fallback would:

1. **contradict two existing tests** that assert its presence by value — they would have to be
   rewritten, which is changing the spec, not implementing it;
2. violate the instruction to prefer fail-closed **only if coherent with existing specifications** —
   here it is demonstrably incoherent with them;
3. constitute a redesign of the audit subsystem's configuration contract, explicitly out of scope.

**Files changed: NONE.**

**Security observation, recorded and not acted on:** when the variable is unset, the salt is a
string visible in the repository, so `ip_hash` / `user_agent_hash` are reversible by dictionary
attack. That is real, but it is *by design* under the current spec, and the mitigation the spec
chose is configuration, not code. Hardening it (fail closed, or warn when unset outside local) is a
legitimate **future WP candidate** requiring a spec change plus test updates — **not** release
remediation. The production configuration itself remains **Gate-3 blocked**.

## Residual B — XLSX Product-path smoke: **CLOSED**

**Exact exit condition, verbatim from report `222` §8 (the originating statement):**

> *"Recommended as an RC smoke item: one real `.xlsx` upload through the **ingestion UI** on the RC
> Preview."*

Report `225` §9 later paraphrased this as "ingestion/file-parser Product path", which is looser. The
**originating, stricter wording governs**.

**Parser-only sufficiency: NO.** Report `229`'s parser-level evidence was real and remains valid,
but it does not satisfy a UI-level exit condition.

### Executed

A real `.xlsx` (3 data rows × 5 columns, built with the repo's own `exceljs`) uploaded through the
**actual ingestion UI** at `/company/data/upload`, as an authenticated **COMPANY_ADMIN**, against the
**RC Preview** (`dpl_8GFdRkQGzqmZkgGoK7cyqn69kMBm`, commit `5f9426974791b6e2ff292aa7634860c4666bd91a`,
Preview target, staging-backed).

**Result: PASS (4.7s).** Asserted against the real rendered DOM:

- summary line `XLSX · 3 righe · 5 colonne · Programmi Welfare` — parse **and** record-type detection
  surfaced in the UI;
- the uploaded filename rendered;
- the *"2 — Anteprima dati raw"* accordion expanded, showing the parser-normalised headers
  `nome iniziativa` and `partecipanti`.

This closes the `read-excel-file` 9.2.0 → 9.3.10 transitive-parser risk (`@xmldom/xmldom` → `saxen`)
at the UI level, not just the module level.

**Two earlier assertion failures were mine, not the Product's.** The first run asserted a
title-cased header; the second, a header that sits inside a collapsed accordion. In both runs the
**primary assertion passed** — the Product path worked on the first attempt. Rather than guess a
third time, the rendered accessibility snapshot was read and the assertions corrected to match
reality. **No Product defect was found and no Product code was changed.**

### Cleanliness

The spec was temporary (`tests/e2e/tmp-xlsx-ui-smoke.spec.ts`), **deleted immediately after the run**
along with its `test-results/` artifacts — no permanent test infrastructure added. `git status` is
clean; HEAD unchanged at `5f94269…`.

**No staging state changed:** the upload page is browser-local by construction
(*"Anteprima locale … Nessun dato viene salvato"*, `page.tsx:719`), and neither **"Run KORA Preview"**
nor **"Conferma e Salva"** was clicked. No ephemeral fixture was needed — `COMPANY_A` is a persistent
staging account — so no provision/cleanup cycle was required.

## Production Readiness status after this pass

| Item | Status |
|---|---|
| Authenticated RC smoke / E2E | CLOSED (report 229) |
| XLSX Product-path smoke | **CLOSED (this report, UI level)** |
| `AUDIT_HASH_SALT` — repo-side | **NO ACTION REQUIRED — fallback is canonical** |
| `AUDIT_HASH_SALT` — production configuration | **BLOCKED BY GATE 3** |
| Production migration-state verification | BLOCKED BY GATE 3 |
| Production backup / restore checkpoint | BLOCKED BY GATE 3 |
| Final Production → Supabase Production mapping | BLOCKED BY GATE 3 |
| Decision Pack PDF runtime smoke | CONDITIONAL / NOT APPLICABLE |

**No non-Gate-3 work remains.** Report `229`'s conclusion is now ratifiable: the two residuals that
might have been executable without Gate 3 have been resolved — one by evidence (A: no change
warranted), one by execution (B: closed).

**Overall Production Readiness: NOT COMPLETE** — four items remain, all gated on **Gate 3 /
Legal-DPO closure**, which is their single shared prerequisite.

## Boundaries

No Production contact of any kind. No Gate-3-blocked work attempted. No repo file changed — nothing
committed, nothing pushed. No Vercel or Supabase configuration change. No Product code modified. No
already-accepted evidence re-run. PR #172 **OPEN · NOT MERGED · auto-merge OFF**.
`scripts/provision-next-review.mjs` never addressed by any command.

---

**Report 230 · Residual A: no defect, no change · Residual B: CLOSED via real UI smoke · maximum safe closure confirmed**
