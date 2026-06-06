# KORA Platform Boundaries — Canonical Map

**Document:** B80-B Platform Boundary Clarity  
**Date:** 2026-06-06  
**Status:** Canonical reference for Foundation Light v0.1

---

## Boundary Mode Definitions

| Mode | Code | Meaning |
|---|---|---|
| **LIVE** | `LIVE` | Real Supabase tenant data. Authenticated company session. Production pipeline active. |
| **DEMO** | `DEMO` | Synthetic Meridiana Group data. No real workers, no real companies. For demonstration only. |
| **PREVIEW** | `PREVIEW` | Architectural shell or worker-layer preview. Functional UI, synthetic persona data. No live backend. |
| **FUTURE VISION** | `FUTURE_VISION` | Intentionally not implemented in Foundation Light. Static mockup screens only. No runtime logic. |

These are defined in `lib/platform-boundaries.ts` and enforced via `BoundaryBadge` and `BoundaryBanner` components.

---

## Route Classification

### LIVE — Real Supabase data (Gate 2 guarded)

These routes connect to live Supabase when an authenticated company session exists.

| Route | Description |
|---|---|
| `/admin/companies/new` | Create live company tenant |
| `/admin/company-workspace` | Admin view of live company workspaces |
| `/admin/company-users` | Provision company user accounts |
| `/admin/company-submissions` | Review incoming live data submissions |
| `/admin/tenants` | Live tenant registry |
| `/admin/data-intake` | Live data ingestion |
| `/admin/uef-review` | UEF™ review and scoring on live data |
| `/admin/impact-units` | Impact Units™ explorer (live) |
| `/admin/data-lifecycle` | Data lifecycle management |
| `/admin/company-evidence-archive` | Evidence archive for live companies |

### DUAL-PATH — LIVE when session exists, DEMO (Meridiana) otherwise

These routes serve real tenant data when `isLive=true` from `useCompanySession()`, and fall back to Meridiana synthetic scenario data.

| Route | Description |
|---|---|
| `/company/kora-index` | KORA Index™ + 10-component breakdown |
| `/company/activation` | Activation Debt™ & participation intelligence |
| `/company/financial` | Budget-to-Human-Impact™ engine |
| `/company/reports` | Decision Pack and report directory |
| `/company/pillars` | Pillar Intelligence distribution |

**Dual-path pages must always display `BoundaryBanner` and `BoundaryBadge` so the operator knows which data source is active.**

### DEMO — Synthetic data, always (no live path)

| Route | Description |
|---|---|
| `/company` | Executive Cockpit™ (Meridiana scenario) |
| `/admin` | Admin dashboard (synthetic overview) |
| `/admin/demo/acme-001` | Guided demo — ACME-001 synthetic company |
| `/admin/companies` | Company console (synthetic) |
| `/admin/network` | Advisor & Partner network (synthetic) |
| `/admin/operator` | Demo scoring (synthetic) |
| `/admin/ai-onboarding` | Classification preview (synthetic) |
| `/admin/gtm` | GTM preview |
| `/admin/benchmarks` | Benchmark preview |
| `/demo-guide` | Demo guide |
| `/partner` | Partner workspace (synthetic) |
| `/advisor` | Advisor workspace (synthetic) |

### PREVIEW — Worker layer (synthetic persona data)

| Route | Description |
|---|---|
| `/my-kora` | My KORA Home — personal worker space |
| `/my-kora/dynamic-cv` | Dynamic Impact CV™ |
| `/my-kora/opportunities` | Recommended opportunities |
| `/my-kora/privacy` | Privacy & sharing settings |
| `/my-kora/collective` | Collective contribution |
| `/my-kora/bookings` | Booking requests (request/confirm only) |

Worker data is persona-specific synthetic data. No real worker identity. Employer roles are blocked at `DynamicCVService` and `MyKoraPreviewService` level.

### FUTURE VISION — Not implemented

| Route | Description |
|---|---|
| `/future-vision` | Future Vision static mockup screens |

These pages must display "Future Vision / Not Active in Foundation Light" and contain no live data or runtime logic.

---

## Deprecated Routes

| Route | Status | Canonical Replacement |
|---|---|---|
| `/company/reports/board-pack` | **REDIRECTS** to `/api/company/decision-pack` | `/api/company/decision-pack` |

The old static board-pack page contained hardcoded Meridiana S1 values. It is replaced by the dynamic Decision Pack API route which is tenant-aware and methodology-versioned.

---

## What Next Should Reuse vs. Ignore

### Reuse (production-ready patterns)
- `lib/platform-boundaries.ts` — boundary constants, carry forward
- `BoundaryBadge` + `BoundaryBanner` — carry forward, apply to all new pages
- `useCompanySession()` — dual-path detection hook, carry forward
- `RolePermissionService` + `PrivacyVisibilityService` — mandatory gatekeepers, carry forward
- `lib/methodology-config/v0.1.ts` — weight loader pattern, carry forward (update config for v1.0)
- All service interfaces — designed to swap mock → production without component change

### Ignore / Replace in production
- `/data/synthetic/` JSON seed files — demo only, replace with real Supabase queries
- All mock services (`/services/*` with `DemoData*`, `Simulator*` prefixes) — replace with production services
- `ScenarioSwitcher`, `PersonaSwitcher`, `RoleSwitcher` — demo-only components, remove in production
- `ProvenanceFooter` with `synthetic_demo_data: true` label — update or remove in production

---

## Dual-Path Warning

When a company workspace loads:
1. `useCompanySession()` detects whether a live Supabase session exists
2. If `isLive=true`, real tenant data flows through production services
3. If `isLive=false`, Meridiana synthetic scenario data is used as fallback

**Never mix live and synthetic data in the same rendering path.** Services enforce this internally; the `BoundaryBanner` surfaces it visually.

---

## Live Infrastructure (Gate 2 / Gate 3 guarded)

Live functionality requires:
- Supabase project provisioned (Gate 2)
- Real company onboarded via `/admin/companies/new`
- Company users provisioned via `/admin/company-users`
- Data submitted via `/admin/data-intake`
- Scoring run executed via `/admin/uef-review`

Gate 2 is currently OPEN. Until it closes, all live routes run against a provisioned Supabase project but no production schema exists. SQL DDL, Prisma models, and migrations remain blocked.

---

*This document is authoritative for boundary classification. Update it whenever a new route is added or a boundary changes.*
