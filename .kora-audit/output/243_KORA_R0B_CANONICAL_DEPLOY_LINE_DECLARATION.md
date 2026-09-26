# 243 — KORA — `R0-B` CANONICAL DEPLOY-LINE DECLARATION

**Date:** 2026-09-22
**Type:** Release-governance declaration. **No deployment. No Product implementation.**
**Item:** `R0-B` — Canonical Deploy-Line Declaration (Section AI, Registry 219)
**Authority:** Founder authorization `KORA — R0-B CANONICAL DEPLOY-LINE DECLARATION`, 2026-09-22
**State transition:** `R0_OPEN` → **`R0_COMPLETE`**

---

## 1. CURRENT REALITY (read-only, established by evidence)

| Ref | SHA | Relationship |
|---|---|---|
| `origin/main` | `70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc` | **104 commits behind** the integration branch |
| `release/kora-rc-2026-09-20` (frozen RC) | `5f9426974791b6e2ff292aa7634860c4666bd91a` | 87 ahead of main; 17 behind integration |
| `integration/kora-canonical-product-2026-09-22` | `3a383072b96290b44620566a242d22f0cc23b01a` | **canonical Product truth** |
| `refs/pull/172/head` | `5f9426974791b6e2ff292aa7634860c4666bd91a` | == frozen RC, untouched |

**`main` is a strict ancestor of the integration branch** — verified. A fast-forward is therefore
topologically possible, which makes the safety question below decisive rather than academic.

### Deployment source: **UNKNOWN — stated, not guessed**

No artifact in the repository binds any branch to any environment:

- `vercel.json` — **absent**; `vercel.ts` — **absent**; `.vercelignore` — **absent**; no `.vercel/` directory.
- `docs/vercel-env-required.md` configures variables **per Vercel environment (Production / Preview /
  Development)**, never per branch.
- No document in `docs/` references a "production branch", "deploy branch" or "promote to production".
- `.github/workflows/ci.yml` and `security.yml` trigger on `main` only and **explicitly disclaim
  deployment**: *"does not build a deploy artifact against staging/Production."*
- `docs/DEPLOY_CHECKLIST.md` is explicitly **manual**: *"Not automated — walk through it by hand before
  and after every deploy"*, requiring *"Target environment confirmed — local / staging / production.
  State it explicitly in the deploy notes; don't assume"* and *"Who approved the deploy — name and date."*

**Conclusion of fact:** KORA deploys are **manual and human-authorized**. Whether Vercel's project-level
*Production Branch* setting points at `main` (the Vercel default) is **NOT determinable from the
repository**, and Vercel was not contacted. This UNKNOWN is carried forward as a named precondition in
§6, not silently resolved.

## 2. AMBIGUITIES FOUND

1. **`main` is not Product truth** but is named as though it were, and is 104 commits behind.
2. **No branch is declared as any environment's source** — the binding, if it exists, lives only in the
   Vercel dashboard.
3. **CI runs on `main` only**, so the integration branch and the RC receive no CI on push — the branch
   carrying actual Product truth is the one CI does not watch.
4. **A merge to `main` may be a Production deployment** if Vercel's production branch is `main`. With
   **Gate 3 OPEN**, that would be an unauthorized Production release performed by a routine merge.
5. `release/kora-rc-2026-09-20` is both a *frozen artifact* and a *branch name pattern*, inviting reuse.

Ambiguity 4 is the material safety risk and drives the model choice.

## 3. CANONICAL MODEL SELECTED — **MODEL B (release branch; `main` synchronized after release)**

```
  PRODUCT TRUTH        integration/kora-canonical-product-YYYY-MM-DD
        │                  (reviewed WP merge commits; SHAs immutable)
        │  [FA-1] Founder authorizes staging candidacy
        ▼
  STAGING CANDIDATE    the exact integration SHA — no new commit, no rebase
        │  [FA-2] Founder authorizes staging deployment
        ▼
  STAGING VALIDATION   R0-C executes against that SHA on the staging
        │              Supabase project (haqflkurpmeaxpikozjl) only
        │  [FA-3] Founder authorizes promotion on green evidence
        ▼
  RELEASE CANDIDATE    release/kora-rc-YYYY-MM-DD  (new branch, immutable,
        │              same SHA — created, never moved)
        │  [FA-4] Founder authorizes Production deployment
        │          ── requires Gate 3 CLOSED + Registry 219 Production Gate ──
        ▼
  PRODUCTION           deployed FROM the release-candidate SHA
        │
        │  [FA-5] Founder authorizes main synchronization
        ▼
  main                 fast-forwarded to the released SHA — an ARCHIVAL
                       record of the last released Product, never the
                       promotion path
```

### Why Model B, and why Model A was rejected

**Model A** (`integration → staging → RC → Founder approval → main → Production`) makes `main` the
promotion path. Given ambiguity 4 — `main` may be Vercel's production branch, and `main` is a strict
ancestor of integration so the merge would succeed cleanly — Model A means **a routine merge could
deploy to Production while Gate 3 is OPEN**. It fails the "no accidental Production promotion"
criterion outright, and it fails it silently, which is worse.

**Model B** removes `main` from the promotion path entirely. Production is deployed from an immutable
release-candidate SHA; `main` is fast-forwarded **after** release, as a record. If Vercel's production
branch is `main`, that synchronization deploys a SHA that is *already* the released Production SHA —
a no-op rather than an accident. **Model B is safe under the UNKNOWN; Model A is not.** That, not
convention, is the reason.

A third option — leaving `main` permanently stale — was also rejected: it preserves the ambiguity this
item exists to remove, and leaves CI watching a branch that represents nothing.

## 4. ROLES — EXPLICIT

- **Integration branch** — canonical Product truth. Accumulates reviewed WP merge commits with their
  original SHAs. Never rebased, never squashed. Never deployed directly to Production.
- **Staging candidate** — not a branch: a **designated SHA** on the integration branch. Designation adds
  no commit.
- **Release candidate** — a new `release/kora-rc-YYYY-MM-DD` branch created at a staging-validated SHA.
  **Immutable: created, never moved, never force-updated.** A superseded RC is retained, not deleted; a
  new date-stamped branch supersedes it.
- **`main`** — **archival representation of the last released Product.** Not an integration target, not
  the promotion path, not Product truth. Updated **only** by fast-forward after a release, under [FA-5].
- **Frozen RC `release/kora-rc-2026-09-20`** — a historical artifact and PR #172's head. **Frozen: never
  merged into, rebased, force-updated or deleted.** Superseded as *current* RC by any later release
  candidate; preserved as the record of its own release attempt.
- **Production** — deployed from a release-candidate SHA only, under [FA-4], never from `main` or
  integration.

## 5. FOUNDER AUTHORIZATION POINTS

| ID | Authorizes | Technical readiness ≠ authorization |
|---|---|---|
| **FA-1** | Designating an integration SHA as staging candidate | green CI + §7 criteria are *evidence*; designation is a decision |
| **FA-2** | Deploying that SHA to staging | Gate 2 permits staging work; it does not pre-authorize a deploy |
| **FA-3** | Promoting a validated SHA to release candidate | R0-C green is evidence, not promotion |
| **FA-4** | **Deploying to Production** | requires Gate 3 CLOSED **and** the Registry 219 Production Gate |
| **FA-5** | Synchronizing `main` | separate from FA-4, so a release and the archival update are distinct decisions |
| **FA-6** | **Gate 3 integration into the Product line** | see §8 |

No step in this lineage is automatic. Each records **who authorized it and when**, per
`docs/DEPLOY_CHECKLIST.md`.

## 6. NAMED PRECONDITION CARRIED FORWARD

**Before the first `main` synchronization under [FA-5], Vercel's project-level Production Branch
binding MUST be verified.** It is UNKNOWN from repository evidence (§1). If it is `main`, FA-5 must
follow FA-4 so the fast-forward lands a SHA already in Production. If it is unset or points elsewhere,
that must be recorded explicitly before FA-5 executes. **This verification is a Founder/operator action
outside this task — Vercel was not contacted.**

## 7. STAGING-CANDIDATE ACCEPTANCE (consumable by `R0-C`)

A commit qualifies as staging candidate when **all** hold:

1. it is a SHA on the canonical integration branch, identified exactly;
2. required CI is green for that SHA — full Vitest, RLS integration suites, `tsc --noEmit`, ESLint, `next build`;
3. migration integrity is green — no duplicate migration number, deterministic ordering, declared high-water;
4. the worktree producing it is clean and the SHA is fixed (no pending edits);
5. every reviewed WP SHA claimed by the branch is reachable from it;
6. no unresolved integration blocker is open against it;
7. **[FA-1]** and **[FA-2]** are recorded.

Criteria 1–6 are mechanically checkable; 7 is a decision. `R0-C` consumes this definition directly.

## 8. GATE 3 ENTRY POINT

Gate 3 enters **only** at its own authorized integration point, **never by silent merge**. The Gate 3
line (`gate3/prelive-privacy-remediation`) is a separate child of the frozen RC and is **not** on the
integration branch. Its entry requires [FA-6] and, first, resolution of the known collision: **WP-066's
`090_saved_column_mapping_tenant_scoped.sql` versus Gate 3's `090_safe_aggregation_threshold_sql_resolution.sql`**
— resolved **at** Gate 3 integration, **never renumbered pre-emptively**, noting that WP-066's own suite
asserts its ceiling by equality. Until [FA-6], Gate 3 remains outside the deploy line entirely.

## 9. ROLLBACK MODEL

- **Target:** the **previous immutable release-candidate SHA** — never a Git revert on `main`, and never
  a rebuild. Rollback is a redeploy of a known-good SHA.
- **Authority:** Founder, or a named operator holding standing delegated authority recorded in advance.
  Rollback may be executed before notification; it is the one step where speed outranks ceremony.
- **Mechanism:** redeploy the previous RC SHA to the affected environment. Because RCs are immutable and
  retained, a rollback target always exists.
- **Database compatibility — the binding constraint:** application rollback does **not** roll back
  migrations. A release may only be rolled back to an RC whose schema expectations the **current**
  database still satisfies. KORA's migrations are additive/expand-only, which generally preserves
  backward compatibility, but **any release containing a contracting change must declare its rollback
  floor before [FA-4]**. Absent that declaration, the rollback floor is the previous RC.

## 10. ACCEPTANCE EVIDENCE — ALL EIGHT ITEMS PRESENT

| Required evidence | Where |
|---|---|
| Canonical deploy-line document | §3 |
| Exact branch/ref model | §3, §4 |
| Founder authorization points | §5 |
| Environment promotion matrix | §3 diagram + §4 |
| Rollback rule | §9 |
| Explicit treatment of `main` | §4, §6 |
| Explicit treatment of frozen RC | §4 |
| Explicit Gate 3 boundary | §8 |

## 11. STATE TRANSITIONS

**`R0-B`: `R0_OPEN` → `R0_COMPLETE`.** All eight evidence items are present; the lineage is declared,
unambiguous, and safe under the one UNKNOWN, which is carried as a named precondition rather than
resolved by assumption.

**`R0-C`: `R0_BLOCKED` → `R0_OPEN`** — derived, not assigned. Its sole unmet precondition was the
declared canonical deploy line, which now exists and supplies the staging-candidate definition R0-C
consumes (§7). Its other preconditions already held: the integrated branch exists and is published, and
staging access is authorized under Gate 2's conditions. **R0-C was not executed.**

## 12. WHAT THIS TASK DID NOT DO

No deployment of any kind. No merge, no PR, no `main` update, no RC modification, no PR #172 change, no
Gate 3 integration, no migration renumbering. No Product code, test or migration change. No Supabase,
Vercel or staging contact. `R0-A`, `R0-C`, `R0-D` not executed; `KORA-WP-068` not started. WP-126–137
semantics, WP-070/072 acceptance, WP-085 status, the dependency graph, scope triggers, WP-019, WP-117,
WP-120, WP-069 and the commercial deferral are untouched. Registry 102 and 142 unmodified.
`scripts/provision-next-review.mjs` was never addressed.

---

**`R0-B` COMPLETE — RELEASE LINEAGE CANONICALIZED — `R0-C` UNBLOCKED — NO DEPLOYMENT PERFORMED**
