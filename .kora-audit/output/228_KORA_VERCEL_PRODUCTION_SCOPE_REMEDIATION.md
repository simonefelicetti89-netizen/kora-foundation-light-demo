# 228 — Vercel Production Scope Remediation: Removal of Staging Supabase Inheritance

**Report-only formalization of a completed, Founder-authorized Vercel environment-scope change.
No further configuration, code, deployment, database or Supabase action was taken while writing it.**

---

## 1. Conclusion (stated first)

- **Vercel Production staging inheritance blocker: CLOSED.**
- **Production → Supabase Production final mapping: NOT YET CONFIGURED.**
- **Overall Production Readiness: NOT YET COMPLETE.**

**Nothing in this report constitutes release authorization.** PR #172 remains OPEN and unmerged, and
Production must not be deployed.

## 2. What was remediated

The pre-check preceding this task established that a single Vercel environment-variable record per
key served **both** `preview` and `production`. Because one record holds one value, Production
necessarily inherited the **staging** Supabase configuration that Preview uses — a structural
conclusion, reached without ever reading a value.

That inheritance is now removed.

## 3. Exact change — three records, target only

| Variable | Env ID | Target before | Target after |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `t57CdjWx9jhafsV3` | `["production","preview"]` | **`["preview"]`** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `znIiFFULdRJ0rqQF` | `["production","preview"]` | **`["preview"]`** |
| `SUPABASE_SERVICE_ROLE_KEY` | `tqajzbfRIuodm060` | `["production","preview"]` | **`["preview"]`** |

Vercel project: `kora-foundation-light-demo` · `prj_eybQKAPKBzP6Jt2oYAOH1BfaBixO` ·
repo `simonefelicetti89-netizen/kora-foundation-light-demo`.

**Only the target/scope was modified.** Each edit was a target-only PATCH carrying no `value` field,
so the stored staging values were preserved untouched. The API responses corroborate this: `type`
remained `sensitive`, `createdAt` was unchanged on all three, and only `updatedAt` advanced.
`SUPABASE_SERVICE_ROLE_KEY` retains `visibility: secret`.

**No value was read, requested, decrypted, printed or stored at any point in this work.**

## 4. Resulting state

| Environment | Supabase runtime configuration |
|---|---|
| **Preview** | retains the existing **STAGING** configuration — `haqflkurpmeaxpikozjl` |
| **Production** | **receives NONE of the three Supabase runtime variables** |

Verified by a full read-only re-read of the project's environment list after the change: all three
records show `target: ["preview"]`, and **`hiddenProductionEnvCount: 0`** confirms no
production-scoped counterpart exists anywhere in the project.

`Production → staging accidental inheritance` is therefore **eliminated**.

### This is an intentional FAIL-CLOSED intermediate state

Production is deliberately left **unconfigured**, not repointed. A Production build made today would
produce an application whose middleware short-circuits on the absent variables
(`if (!supabaseUrl || !supabaseAnon) return NextResponse.next()`) and whose browser Supabase client
throws on use. **Production is not a working application in this state and must not be deployed**
until the authorized prerequisites are satisfied. That failure mode is the point: an application
that cannot start is strictly safer than one that silently serves staging data.

## 5. Status language — the two things this does and does not mean

### CLOSED

The specific blocker **"Vercel Production inheriting STAGING Supabase runtime configuration"** is
**CLOSED**. Production can no longer silently connect to staging through these three variables.

### NOT YET COMPLETE

The final desired mapping **`Vercel Production → existing Supabase Production
(azdnepfmwrmacruykskm)`** is **NOT configured**. No Supabase Production credential was read,
requested or written.

**Overall Production Readiness is NOT complete, and more than one item remains.** Report `227`
records these as separate work, untouched by this remediation:

1. Production migration-state verification
2. `AUDIT_HASH_SALT` configuration
3. Verified Production backup / restore checkpoint
4. Authenticated RC smoke / E2E (5 roles × 3 viewports)
5. Real XLSX Product-path smoke
6. Decision Pack PDF runtime smoke — conditional, only if Chromium/Puppeteer mode is enabled

## 6. Governance constraint — Gate 3

**Gate 3 / Legal-DPO remains OPEN.** Existing KORA governance has been interpreted as blocking
Production provisioning and Production auth while Gate 3 is open. **Production Supabase credentials
were therefore deliberately NOT added** — placing a production service-role key into Vercel would
itself be a production-provisioning act.

This is recorded as the governance constraint currently governing the final Production mapping. **No
further Gate 3 analysis is performed in this report.**

## 7. Out-of-scope variables — confirmed unchanged

| Variable | State |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | unchanged — still `["production","preview"]` |
| `UPSTASH_REDIS_REST_URL` | unchanged — still `["preview","production"]` |
| `UPSTASH_REDIS_REST_TOKEN` | unchanged — still `["preview","production"]` |
| `SECURITY_RATE_LIMIT_PROVIDER` | unchanged — still `["preview","production"]` |
| `AUDIT_HASH_SALT` | **absent from the project, and untouched** |

Verified by their unchanged `updatedAt` timestamps in the post-change read.
**`AUDIT_HASH_SALT` remains a separate Production Readiness item** and was deliberately not addressed.

## 8. What did not happen

- **No Production deployment.** The two most recent deployments remain
  `dpl_8GFdRkQGzqmZkgGoK7cyqn69kMBm` (`5f94269`, READY) and `dpl_41wEAXn1iRhPAKfKzu1c3rM2HS5K`
  (`cdb1aa69`, READY), **both `target: null` (Preview)**. No production deployment has ever existed
  in this project.
- No Preview deployment, no rebuild, no promotion, no trigger.
- No repo, code, test, workflow, migration, package or `.env` change.
- No Supabase or database modification of any kind; no Production DB contact.
- No commit, no push.

## 9. PR #172

**OPEN · NOT MERGED · auto-merge OFF.** Untouched by this work. Successful CI is not merge
authorization, and this report does not confer any.

## 10. Next step (recorded, not performed)

Closing `Vercel Production → Supabase Production` depends on **Gate 3 closure** first. Once that is
resolved, the remaining work is mechanical: create production-scoped `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` pointing at
`azdnepfmwrmacruykskm`, then build a **fresh** Production deployment — the `NEXT_PUBLIC_*` values are
inlined into the client bundle at build time, so they must exist **before** the build, never after.

**Not performed.**

## 11. Boundary attestations

Vercel altered exactly once, as authorized: three target-only scope edits, nothing else. No Production
env variable added. No Production Supabase credential accessed. No Production DB contact, no
migration, no deployment. No code, test or workflow modification. No commit, no push, no merge, no
auto-merge. `scripts/provision-next-review.mjs` never addressed by any command.

---

**Report 228 · staging-inheritance blocker CLOSED · Production fail-closed and unconfigured · Production Readiness NOT complete**
