# KORA — Platform Status

**Last verified date:** 2026-07-03
**Last verified commit:** `8210247` (main)
**Audience:** CTO, technical advisor, investor, external reviewer, KORA_ADMIN operators

---

## Scope

This is the canonical, current-state entry point for "where does KORA actually stand today." It supersedes `PLATFORM_READINESS_SUMMARY.md` and `PLATFORM_READINESS_CHANGELOG.md` as the primary status reference (moved to `docs/archive/` in PILOT-SAAS-01 as confirmed-historical snapshots — see the note at the top of each). It does not restate operational how-to steps (see `GOLDEN_PATH_RUNBOOK.md`, `PILOT_INTAKE_PROTOCOL.md`) or architecture detail (see `ARCHITECTURE.md`) — it links to those instead.

This document reflects a Professionalization Sprint spanning: PROF-01/PROF-02B-LIGHT (docs cleanup), KORA-INDEX-VERSION-02 (version label unification), GOLDEN-01 through GOLDEN-04-DOCS (golden path audit, E2E fixtures, docs alignment), VERCEL-01 through VERCEL-05 (Production deployment verification), and ROLE-SWITCHER-01 through ROLE-SWITCHER-03 (a client-state auth-view bug found and fixed in Production).

---

## What is proven

**Golden path (service-assisted, KORA_ADMIN-operated), manually verified end-to-end:**
- File upload → UEF generation → approval → scoring → KORA Index → Decision Pack works when walked through manually by a KORA_ADMIN operator, per `GOLDEN_PATH_RUNBOOK.md`.
- `/company/workspace` and `/company/kora-index` are live-only, per-tenant, with no synthetic-data fallback (confirmed by direct code inspection during the GOLDEN-01 audit, correcting an earlier doc that claimed otherwise).

**Authenticated E2E, machine-verified locally:**
- `A01` (KORA_ADMIN login → `/admin`) passes against a local dev server backed by the real staging Supabase project, run by the operator with real credentials (GOLDEN-03B).

**Production deployment, manually verified in the real environment:**
- Vercel project `kora-foundation-light-demo` deploys `main` automatically; Production is confirmed running commit `8210247` (current main).
- Public pages (`/`, `/login`, `/request-access`) load correctly in Production with no 500s, blank renders, or visible runtime errors.
- A Supabase environment misconfiguration (`NEXT_PUBLIC_SUPABASE_URL` was a placeholder/wrong value) was found in Production and corrected; all three required Supabase env var *names* are now confirmed present in the Vercel Production environment (values not inspected, per security practice).
- KORA_ADMIN (`kora-admin@staging.kora.internal`) login succeeds in Production and reaches `/admin`.
- A client-state bug causing a false "access denied" for a real KORA_ADMIN session on first login (stale demo-state role, see `ROLE-SWITCHER-01/02` history) was diagnosed, fixed, deployed, and confirmed resolved in Production.

**RLS negative testing, local direct-Postgres (RLS-03, merged to `main` via PR #26):**
- A direct-Postgres integration test (`tests/integration/rls-two-tenant-negative.test.ts`, no PostgREST/`@supabase/supabase-js` involved) proved on 2026-07-04 that Postgres RLS itself — not application code — rejects cross-tenant reads on `analytics.source_batch`, `kora_index_result`, and `activation_result`: 13/13 tests passed against local Supabase, synthetic fixtures fully cleaned up, no cloud/staging/production/Vercel touched. See `QA_STATUS.md` for full detail.
- This does **not** prove GoTrue sign-in, PostgREST schema-exposure correctness, browser/E2E flows, or report/export privacy suppression. Worker-vs-worker isolation is now proven live separately (RLS-05, merged); app/API-level static enforcement is audited (RLS-04, merged); KORA_ADMIN's legitimate cross-tenant access is proven statically (RLS-06, merged — its live direct-Postgres run is still pending). None of RLS-03/04/05/06 has a live authenticated-request/PostgREST proof yet — see `QA_STATUS.md`.

**Version/label consistency:**
- Public/client-facing label is **KORA Index v1.0**, consistently applied across UI, Decision Pack, API metadata, and (as of GOLDEN-04-DOCS) documentation.
- Internal methodology/architecture generation label is **KORA Methodology Architecture v3** (the 10-component macroblock structure) — a distinct axis from the public version, per CLAUDE.md §5.

---

## What is NOT proven

Be precise about this — overclaiming here defeats the purpose of the document.

- **Real-data end-to-end Production golden path is not proven.** Only public-page smoke and KORA_ADMIN login have been verified in Production. No upload, UEF review, scoring run, or Decision Pack generation has been exercised against Production — only against local dev / staging Supabase directly.
- **COMPANY_A / COMPANY_B Production auth flows are not fully proven.**
  - COMPANY_A (`company-admin@staging.kora.internal`, tenant `STAGE-001`) exists, was verified working in an earlier manual Gate-2 QA pass (2026-06-22), and has a ready E2E fixture (`A02`) — but that fixture has not been run against Production, and COMPANY_A's login has not been manually checked in Production either.
  - **COMPANY_B does not exist.** As of the last check in this sprint, no second company/tenant account exists in staging or Production. This blocks the `A03` (COMPANY_B login) and `A04` (tenant-separation) E2E tests entirely — not a credentials gap, a provisioning gap.
- **RLS negative testing is mostly closed at the DB level, still open at the authenticated-request level.** A direct-Postgres test proves Postgres itself (not just application code) rejects cross-tenant reads on three analytics tables (RLS-03, merged). Worker-vs-worker isolation (`personal.worker_identity`/`worker_pib`) is now also proven live at the direct-Postgres level (RLS-05, merged). App/API-level source code is statically audited (RLS-04, merged). KORA_ADMIN's legitimate cross-tenant/admin access is proven statically (RLS-06, merged); its live direct-Postgres control test is implemented but not yet run. What remains open across all four: PostgREST/API-level enforcement and authenticated browser flows exercised live — see `QA_STATUS.md`.
- **Automated E2E has not been run against Production at all** — only manually (browser) and only against local dev. The `E2E_BASE_URL` mechanism supports pointing Playwright at Production (with a production guard requiring explicit opt-in), but this has not been exercised.
- **Gate 2 status is ambiguous between two current documents.** `CLAUDE.md` (the repo's own operating constitution) states Gate 2 is `OPEN (blocks SQL)`. `docs/GATE2_CTO_CLOSE_REVIEW.md` (2026-06-22) recommends `CLOSE GATE 2 WITH CONDITIONS`. This has not been reconciled by this sprint — treat `CLAUDE.md` as authoritative per its own stated document hierarchy until a founder decision formally updates it.

---

## Current pilot model (do not overclaim beyond this)

- The pilot path is **service-assisted**: every step from upload through Decision Pack generation is performed by KORA_ADMIN, not the client company.
- **COMPANY_ADMIN is mostly view-oriented today** — they can log in and see their own live KORA Index, activation, pillar distribution, and reports, but do not upload data, approve UEF records, or trigger scoring runs themselves.
- **KORA Link is frozen and is not part of the current pilot path.** It has zero code coupling to the golden path (confirmed during the GOLDEN-01 audit — no golden-path file imports anything from a KORA Link path). See `KORA_LINK_STATUS.md`.

---

## Related canonical docs

| Doc | Covers |
|---|---|
| `ARCHITECTURE.md` | Repository structure, engine pipeline, roles/access model, Supabase architecture, off-limits areas |
| `GOLDEN_PATH.md` | Golden path readiness status and E2E checkpoint history (this doc's operational counterpart) |
| `GOLDEN_PATH_RUNBOOK.md` | Step-by-step operator walkthrough (how, not whether it's proven) |
| `PILOT_INTAKE_PROTOCOL.md` | Pilot company onboarding steps |
| `METHODOLOGY.md` | KORA Index v1.0 / Methodology Architecture v3, 10 components, IU formula |
| `QA_STATUS.md` | Test coverage and E2E checkpoint detail |
| `KORA_LINK_STATUS.md` | KORA Link frozen status and future integration design |
| `CHANGELOG.md` | Dated log of consolidation/reconciliation work |
