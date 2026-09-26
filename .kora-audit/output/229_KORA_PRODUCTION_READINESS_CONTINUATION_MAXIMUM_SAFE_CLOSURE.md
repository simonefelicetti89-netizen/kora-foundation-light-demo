# 229 — Production Readiness Continuation: Maximum Safe Closure Pass

**Continuation of the Production Readiness work from reports `220`, `227`, `228`. Two mandatory items
CLOSED with real executed evidence, one CONDITIONAL, four BLOCKED BY GATE 3. Production never
contacted. PR #172 untouched.**

> **Overall Production Readiness: NOT COMPLETE.** Stop condition B reached — every remaining
> mandatory item is genuinely blocked by Gate 3 or by an external prerequisite that cannot be
> resolved in this session.

---

## 1. Item-by-item outcome

| # | Item | Result |
|---|---|---|
| 1 | Production migration-state verification | **BLOCKED BY GATE 3** |
| 2 | `AUDIT_HASH_SALT` | **BLOCKED BY GATE 3** (Production scope) — with a substantive new finding, §4 |
| 3 | Verified Production backup / restore checkpoint | **BLOCKED BY GATE 3** |
| 4 | Authenticated RC smoke / E2E | **CLOSED** — 15/15 on the actual RC SHA, §2 |
| 5 | Real XLSX Product-path smoke | **CLOSED** at the parser level, §3 — UI wiring noted as residual |
| 6 | Decision Pack PDF runtime smoke | **CONDITIONAL / NOT APPLICABLE**, §5 |
| 7 | Final Vercel Production → Supabase Production mapping | **BLOCKED BY GATE 3** |

## 2. Authenticated RC smoke / E2E — **CLOSED**

**This is new evidence, not a restatement.** The previously recorded 15/15 ran against `d6a1817`,
before the dependency remediation and the Node 24 change. This run targets the **actual Release
Candidate**.

- Target: `kora-foundation-light-demo-59th4uldg-…vercel.app` — deployment
  `dpl_8GFdRkQGzqmZkgGoK7cyqn69kMBm`, commit **`5f9426974791b6e2ff292aa7634860c4666bd91a`**,
  **Preview** (`target: null`), staging-backed. The production ref was never used.
- Canonical matrix, unchanged and not invented: `tests/e2e/responsive-viewports.spec.ts`,
  5 roles × 3 viewports as Playwright projects (`mobile-375`, `tablet-768`, `desktop-1440`).

**Result: 15 passed (51.4s)** — R01 KORA Admin · R02 Company · R03 Worker · R04 Partner ·
R05 Advisor, each at all three viewports.

### First run failed 12/15 — diagnosed, not worked around

The initial run failed all three **R04 · Partner** cases at login. Root cause established by
read-only `verify` before any action: **the ephemeral Partner auth user was absent**, removed by the
authorized cleanup earlier in this session. This is the documented fixture lifecycle
(`provision → run the matrix → cleanup → verify`) — the matrix had been run without its provision
step. **Not a Product defect.**

The full lifecycle was then executed properly on staging (Gate 2 authorizes staging work), and
**staging was restored to exactly its prior state**:

```
provision → PARTNER auth user + partner_identity created (EPHEMERAL); ADVISOR reconciled (PERSISTENT)
matrix    → 15/15
cleanup   → PARTNER auth user removed; anchor partner_profile retained; ADVISOR untouched by design
verify    → PARTNER auth user absent, 0 identity rows; anchor present (draft, kora-e2e-fixture);
            ADVISOR present, exactly 1 fixture row, active — verify: OK
```

Incidental confirmation: a mis-passed environment caused the cleanup to **refuse** with
`E2E_STAGING_FIXTURE_CONFIRM must be exactly "YES"` — the WP-016 fail-closed gate working in
production conditions, exactly as designed.

## 3. XLSX Product-path smoke — **CLOSED at the parser level**

Required because the previous dependency remediation moved `read-excel-file` 9.2.0 → 9.3.10, which
**replaced its XML parser (`@xmldom/xmldom` → `saxen`)**.

Executed: a **real `.xlsx`** (6,659 bytes, built with the repo's own `exceljs`) passed through the
**real Product module** `lib/upload/file-parser.ts` — the same module
`app/company/data/upload/page.tsx` calls.

```
fileType         : xlsx
rowCount         : 3   columnCount: 5
headers          : ['nome iniziativa','categoria','importo','partecipanti','data']
rows parsed      : 3      previewRows: 3
detectedTypes    : ["welfare_program"]
validationIssues : []     parsingWarnings: []
row[0].raw       : { importo: 24000, partecipanti: 128, ... }   ← numeric coercion intact
XLSX SMOKE: PASS
```

Header normalisation, numeric coercion, sheet attribution, batch/record id generation and
record-type detection all behave correctly on the new parser. **No Product change was required.**

**Method note, stated plainly:** the harness lived only in the session scratchpad and was **never
added to the repository** — no new test infrastructure was created, per instruction. It imported the
real module by absolute path, with `node_modules` symlinked into the scratchpad so the repo tree was
never written to. `git status` is clean.

**Residual, disclosed:** this exercised the parser module under Node, not a browser file-input
upload through the UI. The parsing code path is the real one and is now proven; what remains
unexercised is the **UI wiring** in `app/company/data/upload/page.tsx` (input → `parseUploadedFile`
→ render). That is a UI smoke item, materially smaller than the original open risk.

## 4. `AUDIT_HASH_SALT` — **BLOCKED BY GATE 3**, and the finding is different from expected

Canonical requirement established from source: `lib/audit/log-access.ts:14`

```ts
const HASH_SALT = process.env.AUDIT_HASH_SALT ?? 'kora-audit-salt';
```

It salts one-way SHA-256 hashes of `ip_address` and `user_agent` in the privileged-access audit log
(B168.7).

**Two corrections to the earlier framing:**

1. **Its absence is not a crash risk.** A hardcoded fallback exists, so nothing breaks — which is
   why Preview works today despite the variable being absent everywhere.
2. **The real defect is the fallback itself.** When the variable is unset, the salt is the literal
   string `'kora-audit-salt'`, **visible in the repository source**. IP and user-agent hashes
   computed with a publicly known salt are trivially reversible by dictionary attack over the IPv4
   space. That is a privacy weakness in an audit log whose purpose is privacy-preserving provenance.

**Why it is Gate-3 blocked:** the scope that matters is **Production**, and creating a
production-scoped secret is a production-provisioning act, which Gate 3 forbids.

**Why the Preview half was deliberately not done either:** it is technically permitted (staging), but
it requires *choosing a durable secret value*. Introducing a salt changes every subsequent hash, so
existing staging audit rows stop being comparable with new ones. That is a data-continuity decision
with a rotation policy attached — a Founder decision, not an implementation detail. **No value was
invented or written.**

**Recommended when Gate 3 closes:** set it on both scopes at once, and treat the hardcoded fallback
as a separate hardening item (fail closed, or at minimum warn, when the variable is unset in a
non-local environment).

## 5. Decision Pack PDF runtime smoke — **CONDITIONAL / NOT APPLICABLE**

Evidence, not assumption: `NEXT_PUBLIC_KORA_PDF_ENABLED` is **absent from the Vercel project**
(confirmed in the post-remediation env read, `hiddenProductionEnvCount: 0`). `lib/decision-pack/pdf-strategy.ts`
returns `'api_render'` only when that variable equals `'true'`, otherwise `'browser_print'`, in which
the PDF buttons point at the HTML preview and **no Chromium binary is loaded**. The file's own header
records the reason: `@sparticuz/chromium` is 67 MB against Vercel Hobby's 50 MB function limit.

**The Chromium/Puppeteer path is therefore dormant in the current RC configuration.** Per
instruction it was **not enabled in order to test it**. The requirement becomes live only if that
flag is ever set before Production.

## 6. Gate-3 blocked items (1, 3, 7)

| Item | Why blocked |
|---|---|
| **Production migration-state verification** | Requires reading the Production database. `CLAUDE.md` §9 blocks production database access while Gate 3 is OPEN. **Production was not contacted to close a checklist.** |
| **Verified Production backup / restore checkpoint** | Requires operating on the Production project. Same prohibition. |
| **Final `Production → azdnepfmwrmacruykskm` mapping** | Requires creating production-scoped Supabase credentials — production provisioning/auth, forbidden while Gate 3 is OPEN. The fail-closed state from report `228` is intentional and **must remain**. |

**No permission was inferred.** No read-only exception was assumed to exist, because none is
documented; where governance is silent, the restriction was applied, not interpreted away.

## 7. Changes made in this pass

| Category | Change |
|---|---|
| Repository files | **NONE** — `git status` clean, HEAD unchanged at `5f94269…` |
| Product code / tests / migrations / workflows / packages / `.env` | **NONE** |
| Vercel configuration | **NONE** (read-only reads only) |
| Supabase **staging** | ephemeral Partner fixture provisioned then removed — **net zero**, `verify: OK` |
| Supabase **Production** | **NEVER CONTACTED** |
| Deployments | **NONE** — no deploy, rebuild, promotion or trigger |
| Commits / pushes / merges | **NONE** |

## 8. Status summary

**CLOSED (this pass):** authenticated RC smoke/E2E · XLSX Product-path smoke (parser level)
**CLOSED (previously):** Node runtime alignment · dependency security · fresh migration-chain CI
evidence · accidental Vercel Production → staging inheritance
**CONDITIONAL / NOT APPLICABLE:** Decision Pack PDF runtime smoke
**BLOCKED BY GATE 3:** Production migration-state verification · `AUDIT_HASH_SALT` (Production scope)
· Production backup/restore checkpoint · final Production → Supabase Production mapping
**STILL OPEN (other reason):** XLSX **UI-wiring** smoke — small residual from §3

**Single remaining prerequisite for everything still blocked: Gate 3 / Legal-DPO closure.** All four
blocked items become executable the moment it closes; none of them has any other dependency.

## 9. PR #172

**OPEN · NOT MERGED · auto-merge OFF.** Untouched. Passing checks confer no merge authorization.

## 10. Boundary attestations

No new WP started. No general audit performed. No lateral refactor or unrelated cleanup. No Product
behaviour changed. Production never contacted — no DB, no auth, no provisioning, no deployment. No
Supabase Production credential read, requested or written. Staging returned to its exact prior
state, verified. No secret value printed at any point. `scripts/provision-next-review.mjs` never
addressed by any command.

---

**Report 229 · 2 items CLOSED with executed evidence · 1 conditional · 4 Gate-3 blocked · Production Readiness NOT complete**
