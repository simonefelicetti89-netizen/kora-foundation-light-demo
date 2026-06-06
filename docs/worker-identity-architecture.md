# KORA Worker Identity Architecture

**Document:** B81-B Worker Identity Foundation  
**Date:** 2026-06-07  
**Status:** Canonical reference for Foundation Light → Pilot evolution of the worker layer.

> **Foundation Light implements PREVIEW mode only.** No real worker identities exist. All My KORA data is synthetic persona data. This document defines the canonical target architecture for future implementation.

---

## Architecture Diagram

```
KoraTenant (company)
    │
    ├── worker_space_status: NOT_ENABLED | ENABLED | PILOT_READY
    │
    └── Worker Space
            │
            ├── Worker Identity
            │       │
            │       ├── worker_kora_id    ← KORA-issued, portable, permanent
            │       ├── worker_id         ← tenant-scoped HR identifier (company-owned)
            │       └── worker_pseudonym_id ← pipeline-safe, one-way hash of kora_id
            │
            ├── Worker PIB (Personal Impact Balance)
            │       │
            │       ├── Derived from per-worker UEF records (Pilot+)
            │       ├── Tagged by worker_pseudonym_id in pipeline
            │       ├── Aggregated to company-level by PIBAggregationService
            │       └── Worker-private: never employer-visible
            │
            ├── Dynamic CV
            │       │
            │       ├── Sourced from verified UEF records (Pilot+)
            │       ├── Worker controls sharing flags per item
            │       ├── Export requires explicit worker intent
            │       └── Employer has zero access (DynamicCVService hard-blocks)
            │
            └── My KORA (worker portal)
                    │
                    ├── /my-kora         — PIB overview, timeline, KORA Link walkthrough
                    ├── /my-kora/dynamic-cv — verifiable impact portfolio
                    ├── /my-kora/opportunities — matched partner/internal opportunities
                    ├── /my-kora/privacy      — consent toggles and boundary explanation
                    ├── /my-kora/collective   — collective contribution (KORA Contribution™)
                    └── /my-kora/bookings     — service booking requests (request/confirm only)
```

---

## 1. Worker Space

The Worker Space is the tenant-level capability that enables the worker layer. It is distinct from the company workspace.

**Definition:** The bounded product context owned by the worker — not a database table, not a route prefix. It is the set of all data, services, and UI surfaces for which the worker is the sole authorized consumer.

**Enablement states (`WorkerSpaceStatus`):**

| State | Meaning |
|---|---|
| `NOT_ENABLED` | Company has not opted into My KORA. No worker data flows. |
| `ENABLED` | Company opted in. Workers can be invited. My KORA accessible. PIB still aggregate-estimate. |
| `PILOT_READY` | Per-worker UEF records active. Individual PIB attribution enabled. |

**Foundation Light:** `WorkerSpaceCapabilityService` determines capability from roster state. No tenant is `PILOT_READY` — typed constraint (`production_ready: false` on `KoraTenant`).

---

## 2. Worker KORA ID

The **Worker KORA ID** (`WorkerKoraId`) is the canonical, portable, permanent identifier for a worker across multiple tenant relationships.

**Properties:**
- KORA-issued (not company-issued) — the worker owns it, not the employer
- Portable — travels with the worker when they change employer
- Typed as a branded string: `type WorkerKoraId = string & { readonly _brand: 'WorkerKoraId' }`
- Never exposed to company-facing APIs or screens
- Stored in Supabase `app_metadata.kora_worker_kora_id` on the worker's auth user

**Distinction from `worker_id`:**
- `worker_id` (e.g., `WRK-MERD-001`) is the tenant-scoped HR identifier — company-owned, disappears when worker leaves
- `WorkerKoraId` is KORA-owned, persists across tenants, forms the basis for PIB portability

**Foundation Light status:** `WorkerKoraId` type is defined. No real issuance service. No real IDs exist in the system.

---

## 3. Worker Pseudonym ID

The **Worker Pseudonym ID** (`WorkerPseudonymId`) is the privacy-safe identifier used inside the pipeline and in company-facing aggregate data.

**Properties:**
- Derived from `WorkerKoraId` via a one-way keyed hash (KORA privacy layer only)
- `UEFRecord`, `ImpactUnit`, and `PIBRecord` carry `worker_pseudonym_id` — never `worker_kora_id`
- The mapping `kora_id → pseudonym_id` is held only by the KORA pseudonymization service
- Company-facing data contains only `pseudonym_id` — cannot be de-anonymized without the mapping
- Typed: `type WorkerPseudonymId = string & { readonly _brand: 'WorkerPseudonymId' }`

**Foundation Light status:** `WorkerPseudonymId` type is defined. Demo seed data uses hard-coded string pseudonym IDs. The pseudonymization service (map `worker_kora_id → pseudonym_id`) is not implemented.

---

## 4. Worker Context

**Definition:** The resolved information about the current worker session — who the worker is, which mode is active, and what data is accessible.

**Implementation:** `lib/worker-identity/worker-context.ts` — `getWorkerContext(input)` returns a `WorkerSession`.

**Contract:**
```typescript
getWorkerContext({ liveSession?, previewPersonaName?, accessPermitted? }): WorkerSession
```

Components consume `WorkerSession` via `useWorkerSession()` and never need to know whether the data source is synthetic or live. The context is the abstraction boundary.

**Helpers:**
- `workerSessionLabel(session)` — human-readable mode label for UI
- `isWorkerDataAccessible(session)` — guard helper (returns true for PREVIEW and LIVE)

---

## 5. Worker Session

**Definition:** The runtime state of the worker's authenticated presence in My KORA.

**Shape (`WorkerSession`):**
```typescript
{
  workerMode:        'PREVIEW' | 'LIVE' | 'DISABLED';
  workerKoraId:      WorkerKoraId | null;   // null in PREVIEW
  workerDisplayName: string | null;
  tenantId:          string | null;         // null in PREVIEW
  isPreview:         boolean;
  isLive:            boolean;
  sessionLoading:    boolean;
}
```

**Provider:** `app/my-kora/_providers/WorkerSessionProvider.tsx`  
**Hook:** `useWorkerSession()` — available to all `/my-kora/*` pages

**Foundation Light:** provider reads from `demo-state` (role switcher + persona switcher). Always resolves to `PREVIEW` mode.

**Pilot+ migration:** Provider adds async Supabase session detection before falling back to PREVIEW. No consumer changes required — only the provider changes.

---

## 6. Preview Mode

**What it is:** My KORA running on synthetic persona data with no real worker identity.

**Data source:** `MyKoraPreviewService` — 4 synthetic personas (Elena M., Marco T., Sofia R., Giovanni B.) with pre-computed IU values using the canonical formula.

**Identity:** Demo-state persona switcher — no JWT, no authentication.

**Constraints in preview:**
- `export_available: false` — no real CV export
- `editable_in_preview: false` on all consent toggles
- `pib_derivation_basis: 'synthetic_iu_pre_computed'` — not derived from real pipeline
- `synthetic_demo_data: true` on all data structures

**Who can access preview:** `WORKER` role and `KORA_ADMIN` role (demo review only).  
**Who is blocked:** `COMPANY_ADMIN`, `COMPANY_VIEWER`, `PARTNER`, `ADVISOR` — hard-blocked at layout level.

---

## 7. Future Live Mode

**What it requires:**

1. Gate 2 closed → Supabase schema, worker auth tables, RLS policies
2. Gate 3 closed → real worker email invitations, consent collection
3. `WorkerKoraId` issuance service (generates UUID, writes to auth `app_metadata`)
4. Pseudonymization service (`worker_kora_id → pseudonym_id` mapping)
5. Pipeline model change: program-level UEF rows → per-worker UEF rows
6. `PIBAggregationService.aggregateForBatch()` producing real `PIBSnapshot[]`
7. `DynamicCVService.getProfile()` reading from Supabase (not `MyKoraPreviewService`)

**Migration path — zero component changes:**
- `WorkerSessionProvider` adds async Supabase detection → LIVE session resolved
- `DynamicCVService` interface (`IDynamicCVService`) already designed for swap
- `MyKoraPreviewService` becomes fallback for workers without activated accounts
- All My KORA pages continue working — they read from `useWorkerSession()` which is already the abstraction

---

## 8. Privacy Boundary

See `docs/privacy-escalation-model.md` for full detail.

**Summary:**

| Layer | Employer can see | Worker owns |
|---|---|---|
| Company aggregate | KORA Index, activation rates, pillar distribution | — |
| Department/cohort | Trends ≥ N=10 | — |
| Worker identity | Roster metadata (dept, site, consent status) only | `worker_kora_id`, email, name |
| Worker PIB | Never | Full PIB, all pillar scores |
| Event timeline | Never | Full timeline at category level |
| Dynamic CV | Never | All items, sharing flags, export decisions |
| Consent | Only status (granted/pending/revoked) | Full consent content |
| Health data | Never | Own health-related activities |

**Hard enforcement points:**
- `DynamicCVService.getProfile()` — throws on non-worker roles
- `PIBAggregationService.getWorkerPIBSummary()` — blocks employer roles
- `WorkerRosterRecord.employer_can_view_individual_pib: false` — typed constraint
- `PrivacyVisibilityService.isSuppressed()` — N<10 suppression
- `RolePermissionService.canAccess()` — resource-level gate

---

## File Index

| File | Purpose |
|---|---|
| `lib/worker-identity/types.ts` | Canonical types: `WorkerKoraId`, `WorkerPseudonymId`, `WorkerMode`, `WorkerSpaceStatus`, `WorkerSession`, `WorkerSpaceCapability` |
| `lib/worker-identity/worker-context.ts` | `getWorkerContext()` — stable contract for session resolution |
| `app/my-kora/_providers/WorkerSessionProvider.tsx` | React context provider + `useWorkerSession()` hook |
| `app/my-kora/layout.tsx` | Layout gate + WorkerSessionProvider wrapper |
| `services/worker-space/WorkerSpaceCapabilityService.ts` | Tenant-level worker space capability |
| `services/worker-provisioning/WorkerProvisioningService.ts` | Roster management |
| `services/pib-aggregation/PIBAggregationService.ts` | PIB: company aggregate (live) + worker private (blocked in FL) |
| `services/dynamic-cv/DynamicCVService.ts` | Dynamic CV: worker-only, employer hard-blocked |
| `services/my-kora-preview/MyKoraPreviewService.ts` | PREVIEW mode data source (synthetic personas) |
| `docs/privacy-escalation-model.md` | Canonical privacy access rules and escalation model |
| `docs/platform-boundaries.md` | Route boundary classification |
