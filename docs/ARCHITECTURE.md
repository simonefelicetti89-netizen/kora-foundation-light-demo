# KORA — Architecture Reference

**Last verified date:** 2026-07-03
**Last verified commit:** `8210247` (main)
**Audience:** CTO, technical advisor, investor, external dev team, solution architect

---

## Scope

This document describes the actual repository structure and runtime architecture — not a target/aspirational design. It reconciles and supersedes the unmerged `docs/consolidation` branch's `ARCHITECTURE.md` (dated 2026-06-30, 58 commits behind this doc's baseline): component names, version labels, and status claims below reflect current `main`, not that snapshot. See `CHANGELOG.md` for what changed in the reconciliation.

## What is proven / What is not proven

This is a structural reference, not a live-status doc — for the proven/not-proven distinction on runtime behavior, see `STATUS.md` and `QA_STATUS.md`. Everything below is verifiable by reading the referenced files directly; it is not a claim about what has been exercised end-to-end in Production.

---

## 1. Executive Technical Summary

KORA is a **Human Impact Intelligence Platform**: it transforms heterogeneous organizational data — welfare, training, volunteering, collective initiatives, partner activity — into explainable, verifiable organizational activation intelligence. The output is the **KORA Index**: a company-level score, never individual.

**What it measures.** The KORA Index has 10 fixed components (`AR`, `MAR`, `EVQ`, `INT`, `CONT`, `EQW`, `EQS`, `PC`, `PB`, plus `CS` external) grouped into 4 macroblocks (REACH 25%, QUALITY 30%, EQUITY 25%, BTI 20%). Public label: **KORA Index v1.0**. Internal methodology/architecture generation label: **KORA Methodology Architecture v3** — a distinct axis, per CLAUDE.md §5 (KORA-INDEX-VERSION-02). Each component derives from Impact Units (IU) computed on verified events — never self-assessment or surveys.

**The base is real.** This is not a demo shell: the scoring engine (`lib/kora-engine/`) runs a real 14-stage pipeline against real data in staging/Production Supabase. Authentication is Supabase with custom claims. RLS is layered across sensitive schemas. The test suite is green — 204 files, 8656 tests, run in ~4s (`npm test`, verified at this doc's commit).

**What remains to consolidate (not rewrite).** The core assets — engine, auth, RLS, API routes, scoring path — are solid. Known gaps: authenticated E2E coverage against Production (not yet run — as distinct from staging), and RLS proof at the live PostgREST/GoTrue-authenticated-request level (direct-Postgres and static proofs exist; see `QA_STATUS.md`). **Company B/tenant-isolation testing status (updated by B174-A2, 2026-07-12):** this line previously stated a second company tenant "does not exist." Repo evidence indicates one was provisioned in staging and tenant-isolation tests (`A03`/`A04`, `T01`/`T02`) passed live on 2026-07-09 — not independently re-verified since; see `docs/PILOT_GOVERNANCE.md` §10/§15a. None of this requires a rewrite.

---

## 2. Repository Map

```
KORA/
├── app/                    ← Next.js App Router — all pages and API routes
├── components/             ← React components (UI, layout, domain-specific)
├── lib/                    ← Business logic, engine, auth, Supabase clients, types
├── services/                ← Service layer — data access, scoring, privacy
├── data/                    ← Synthetic JSON seeds + methodology config + golden path CSVs
├── supabase/                ← Migration SQL, proposed, rollback, seed
├── tests/                   ← Test suite (vitest unit/integration, Playwright e2e)
├── docs/                    ← Architectural and operational documentation
├── public/                  ← Static assets
└── [config files]           ← next.config.ts, tailwind.config.ts, tsconfig.json, playwright.config.ts, ...
```

### `app/`

Routing, layout, page server components, API route handlers.

```
app/
├── admin/          ← KORA_ADMIN workspace (Company Console, UEF Review, Data Intake, ...)
├── company/        ← COMPANY_ADMIN workspace (KORA Index, Activation, Reports, ...)
├── worker/         ← WORKER workspace
├── my-kora/        ← WORKER personal space (PIB, KORA Space, Bookings, Privacy, ...)
├── partner/        ← PARTNER workspace
├── demo/           ← Public demo/preview area (no auth required)
├── auth/           ← Auth flow (callback, forgot-password, reset-password)
├── api/            ← API route handlers (admin/company/worker/commons)
├── login/          ← Unified login (role-specific /admin/login, /company/login, /worker/login are redirect wrappers)
└── request-access/ ← Public informational page
```

**Key files for a CTO:**
- `app/company/kora-index/page.tsx` — KORA Index, live-only, no demo fallback (confirmed GOLDEN-01)
- `app/admin/layout.tsx` — two-layer admin protection: server-side `requireKoraAdmin()` (Layer 1, authoritative) + client-side `AdminDemoGuard` (Layer 2, demo-state preview guard — see ROLE-SWITCHER-01/02 history for a bug found/fixed in Layer 2's state sync)
- `app/api/admin/companies/provision/route.ts` — live tenant provisioning
- `app/api/worker/pib/route.ts` — worker PIB (WORKER-only)

**Risk:** `app/admin/*` uses service-role clients in places — no change without review. `app/my-kora/*` is worker-private — employer access is structurally impossible, not just hidden.

### `components/`

Organized by domain: `admin/`, `auth/`, `badges/`, `cards/`, `charts/`, `demo/` (RoleSwitcher, PersonaSwitcher, ScenarioSwitcher, EnvironmentSwitcher — all demo-only, gated per role, see §4), `kora-index/`, `layout/` (AppShell, Sidebar, Header), `my-kora/`, `privacy/` (AccessDeniedState, PrivacyBoundaryNotice, SuppressionOverlay — an architectural guardrail, use everywhere sensitive data is shown), `reports/`, `ui/`.

### `lib/`

Pure business logic, engine, auth, Supabase, types, methodology config.

```
lib/
├── kora-engine/        ← 14-stage scoring pipeline — primary technical asset
├── auth/                ← kora-session.ts (requireKoraAdmin/requireCompanyUser), role-home.ts
├── supabase/             ← client.ts, server.ts, scoped service-role clients, types.ts
├── methodology-config/   ← v0.1.ts — weight/threshold loader (never hardcoded elsewhere)
├── demo-state/           ← useRole(), useEnvironment() — demo-state hooks (see ROLE-SWITCHER-02)
├── constants/             ← kora.ts (pillar codes, component codes, version labels)
├── types/                 ← TypeScript shapes (NOT Prisma models)
└── [domain libs]          ← data-intake, decision-pack, live, permissions, privacy, ...
```

**Off-limits without review:** `lib/auth/kora-session.ts`, `lib/supabase/*-service-key.ts`, `lib/methodology-config/v0.1.ts` (methodology weights — never modify directly), `lib/kora-engine/*` (scoring pipeline).

### `supabase/`

```
supabase/
├── migrations/   ← approved migrations
├── proposed/     ← under review, not yet promoted
├── rollback/     ← rollback scripts for recent migrations
└── seed/         ← minimal staging seed
```

Migration count and exact numbering were not re-verified in this pass — see `supabase/migrations/` directly for current state rather than trusting a stale count here.

### `tests/`

```
tests/
├── unit/         ← vitest, majority of the 204 files / 8656 tests
├── integration/  ← workspace boundary, route boundary, demo/live gating
└── e2e/          ← Playwright — public smoke (kora-smoke.spec.ts) + authenticated smoke
                     (authenticated-smoke.spec.ts, GOLDEN-02/03B) with helpers/ (env, roles, auth)
```

---

## 3. Runtime Areas

| Area | Path | Role | Data |
|---|---|---|---|
| Admin | `app/admin/`, `app/api/admin/` | `KORA_ADMIN` | Live (staging/Production) + synthetic (preview/founder-validation only) |
| Company | `app/company/`, `app/api/company/` | `COMPANY_ADMIN` | Live, per-tenant, no synthetic fallback on live paths |
| Worker | `app/worker/`, `app/my-kora/`, `app/api/worker/` | `WORKER` | Live (authenticated) / synthetic-labeled (unauthenticated preview) |
| Public/Auth | `app/login/`, `app/auth/`, `app/request-access/` | none | Live |
| Demo/Preview | `app/demo/` | varies | Synthetic, labeled |
| KORA Link (future) | `app/link/[token]/`, `app/admin/kora-link*/`, `app/company/kora-link/`, `app/my-kora/kora-link/`, `app/partner/kora-link/` | `KORA_ADMIN`/`WORKER`/`COMPANY_ADMIN`/`PARTNER` | Flag-gated skeleton (`KORA_LINK_ENABLED`, default off). **Not "not implemented"** — see §8 and `KORA_LINK_ADR.md`/`KORA_LINK_STATUS.md` for what actually exists vs. what's blocked |

For the detailed page-by-page live/demo/mock classification, see `docs/PAGE_INVENTORY.md` — that inventory was not re-verified as part of this reconciliation and may contain stale per-page status; treat it as a starting point, not a current fact sheet, until re-checked.

---

## 4. Roles and Access Model

### Active roles

| Role | Workspace | Claims |
|---|---|---|
| `KORA_ADMIN` | `/admin/*` | `kora_role = KORA_ADMIN` |
| `COMPANY_ADMIN` | `/company/*` | `kora_role = COMPANY_ADMIN`, `kora_tenant_id` |
| `WORKER` | `/worker/*`, `/my-kora/*` | `kora_role = WORKER`, `kora_worker_id`, `kora_tenant_id` |
| `PARTNER` | `/partner/*` | `kora_role = PARTNER`, `kora_partner_id` |
| `DEMO_VIEWER` | limited routes | `kora_role = DEMO_VIEWER` |

Custom claims live exclusively in Supabase JWT `app_metadata` (never `user_metadata`, which is client-writable).

### Tenant isolation

Every multi-tenant table has `tenant_id` with an RLS policy scoping to `auth.jwt()->'app_metadata'->>'kora_tenant_id'`. `tenantId` is always sourced server-side from the session — never trusted from client input, URL parameters, or request body. **This is enforced by Supabase RLS, not only by application code** — though the automated proof of that (a negative test authenticating as one tenant and confirming denial on another's data) does not yet exist; see `QA_STATUS.md`.

### Guard layers (defense in depth)

| Layer | Implementation |
|---|---|
| Middleware | `middleware.ts` — role-based route redirects, session refresh |
| Route level | `requireCompanyUser()`, `requireKoraAdmin()`, worker session helpers in `lib/auth/kora-session.ts` |
| Service level | Permission/visibility services enforcing role and privacy checks |
| DB level | RLS on all sensitive schemas |
| UI level | `PrivacyBoundaryNotice`, `AccessDeniedState` for visible suppression (never silently empty) |

**Note on the demo-state layer:** `/admin` specifically has a second, client-side guard (`AdminDemoGuard`, using `lib/demo-state`'s `useRole()`) layered on top of the real server-side check, intended to let a KORA_ADMIN operator preview other role views. This is demo/preview tooling, not an authorization mechanism — real access control is Layer "Route level" above. A bug where this preview-state layer could show a false access-denied to a real KORA_ADMIN was found and fixed (ROLE-SWITCHER-01/02); see `QA_STATUS.md` for the checkpoint history.

**Off-limits without review:** `middleware.ts`, `lib/auth/`, `lib/supabase/*-service-key.ts`, any RLS policy.

---

## 5. Supabase Architecture

### Client types

```
lib/supabase/
├── server.ts     ← SSR client (anon key + cookie session)
├── client.ts     ← Browser client (anon key)
├── *-service-key.ts  ← Multiple scoped service-role clients, each documented with a narrow purpose
└── types.ts      ← Database types (generated via Supabase CLI)
```

**Principle:** no service-role client is generic. Each has a documented scope in code; RLS bypass is limited to that client's specific operation.

### Schemas

| Schema | Contains | RLS |
|---|---|---|
| `public` | `tenant`, `source_batch`, `uploaded_record`, `partner_*` | ✓ |
| `personal` | `worker_identity`, `worker_pib`, `worker_pseudonym_map`, ... | ✓ (stricter — `auth_user_id = auth.uid()`) |
| `analytics` | `uef_record`, `impact_unit`, `kora_index_result`, `decision_pack_version` | ✓ |
| `commons` | `initiative`, `post`, `contribution_event` | ✓ |
| `gov` | **Excluded** — `kip_records` must never be created (CLAUDE.md red line) | — |

Full schema detail is authoritative in `docs/12-technical-data-model-database-schema.md`, per CLAUDE.md's document authority hierarchy — this file gives structural orientation only, not the canonical schema reference.

### Environment

`.env.local` should always point at staging during development, never Production (`docs/ENVIRONMENT_SAFETY_CHECK.md`). Vercel Production environment variables were verified present (names only) as of this doc's commit — see `STATUS.md` for the deployment checkpoint history, including a Supabase URL misconfiguration that was found and corrected in Production.

---

## 6. KORA Engine Architecture

**Path:** `lib/kora-engine/` — the 14-stage pipeline described in CLAUDE.md §3 and `docs/kora-scoring-kernel-contract.md`.

```
RawUploadedRecord[]
  → Eligibility Gate → Pillar Mapping → Care Economy Mapping → Budget Evidence
  → Reach signals (AR, MAR) → Quality signals (EVQ, INT, CONT) → BTI Engine
  → Activation Engine → Equity Engine (EQW, EQS, PC, PB) → PIB Aggregation
  → KORA Index Engine → Confidence Engine → Explainability Trace
```

Weights are **never hardcoded** — read from `lib/methodology-config/v0.1.ts`, which loads `data/methodology/methodology-config.json`. `getMethodologyVersion()` and the public `KORA_INDEX_VERSION`/`METHODOLOGY_VERSION` constants in `lib/constants/kora.ts` both resolve to **`"KORA Index v1.0"`** — the pre-Sprint-1 component names (`NI`, `VR`, `CO`, `WB`, `EQ`) and the old `"KORA Methodology v0.1"` version string found in some historical docs are superseded; current names are `EVQ`, `INT`, `CONT`, `EQW`, `EQS` (see `METHODOLOGY.md`).

### Scoring path routing

Three adapters behind one canonical hook (`useScoringResult()`): DEMO (synthetic seed), PREVIEW (approximate, non-authoritative), LIVE (`run-kora-pipeline` — authoritative, no synthetic fallback). Components must never import the engine or synthetic seed data directly — always through the service/hook layer.

---

## 7. Data Flow: KORA Index (Golden Path)

```
Company data upload (CSV/XLSX, real tenant)
    ↓ POST /api/admin/data-intake/upload-preview (dry-run)
    ↓ POST /api/admin/data-intake/accept (persists)
Uploaded Records (personal.uploaded_record)
    ↓ POST /api/admin/uef/generate-candidates
UEF Records (analytics.uef_record) — approved_for_scoring: false by default
    ↓ KORA_ADMIN review/approve → POST /api/admin/uef/review
    ↓ POST /api/admin/scoring/run-approved-batch
KORA Pipeline (lib/kora-engine/) — 14 stages
KoraIndexResult
    ↓ persisted to analytics.kora_index_result, analytics.decision_pack_version
    ↓
    ├── /company/kora-index (10 components, CS, Safeguard)
    ├── /company/reports (Decision Pack HTML/PDF)
    └── /api/admin/decision-pack/{preview,pdf}
```

This is entirely KORA_ADMIN-operated today (service-assisted pilot model — see `STATUS.md`). For the step-by-step operator walkthrough, see `GOLDEN_PATH_RUNBOOK.md` and `PILOT_INTAKE_PROTOCOL.md`.

---

## 8. KORA Link — Frozen, Partial Skeleton

`KORA_LINK_ENABLED` is default-off and zero-coupled to the golden path (no golden-path file imports from `kora-link` paths). A runtime skeleton exists (`lib/kora-link/`, a public route page stub) with its own dedicated test coverage — this is more than "not implemented," but far short of usable: further work is blocked on open CTO schema review, DPO/legal, and RLS review gates. See `KORA_LINK_STATUS.md` for the current gate-by-gate status — do not treat KORA Link as either "fully built" or "nonexistent," both overstate it.

---

## 9. Off-Limits Areas

Areas that must not be modified without explicit review:

| Area | Path | Reason |
|---|---|---|
| RLS | `supabase/migrations/` (any policy) | Errors can expose cross-tenant or individual worker data |
| Migrations | `supabase/migrations/`, `supabase/proposed/` | Applying to a real DB is not easily reversible |
| Service-role clients | `lib/supabase/*-service-key.ts` | Bypass RLS — documented scope must not be widened casually |
| Auth session | `lib/auth/kora-session.ts` | Errors break auth for every role |
| Middleware | `middleware.ts` | Errors can block access to the entire platform |
| Scoring engine / methodology | `lib/kora-engine/`, `lib/methodology-config/` | Changes alter scores for every tenant |
| Personal/PII schema | `personal.*` migrations | The most sensitive tables in the system |

---

## 10. Known Technical Debt

The unmerged `docs/consolidation` branch (2026-06-30 snapshot) catalogued specific ESLint error counts, anti-pattern line numbers, and migration-promotion status. Those exact counts were **not re-verified** as part of this reconciliation (58 commits of drift make them unreliable to restate as current fact) — re-run `npm run lint` and inspect `supabase/proposed/` directly rather than trusting a stale number here. The *categories* of debt that branch identified are still a reasonable checklist to re-verify:

- React anti-patterns (`setState` in `useEffect`, components defined during render)
- `no-explicit-any` usage in services/routes
- Whether previously-`proposed/` migrations have since been promoted/applied
- Shell/placeholder pages that could look unfinished to an external reviewer ("prossimamente" labels)
- Golden path E2E coverage (partially addressed since — see `QA_STATUS.md` — KORA_ADMIN smoke now exists and passes; broader coverage is still open)

A full re-audit of this debt list against current main is a reasonable follow-up sprint — see `CHANGELOG.md` for what this reconciliation did and did not attempt.
