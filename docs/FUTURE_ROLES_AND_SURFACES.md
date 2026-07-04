# KORA — Future Roles & Product Surfaces

**Date:** 2026-07-04
**Sprint:** PILOT-SAAS-01
**Audience:** anyone scoping Partner Platform or Advisor Platform work after the first pilot

Concise, not a manifesto. See `docs/PILOT_SAAS_READINESS.md` for pilot-v1 scope, `docs/access-matrix.md` for the authoritative access rules.

---

## Partner Platform

**What it is:** an organization that delivers services, initiatives, or scan-point infrastructure to KORA's ecosystem — not an employer (Company) and not a worker.

**Current state (more built than "future" implies):**
- Real role: login via `app_metadata.kora_role === 'PARTNER'`, enforced by `requirePartnerUser()` (`lib/auth/kora-session.ts`), same guard pattern as `COMPANY_ADMIN`/`WORKER`.
- Real DB model: `network.partner_profile` (name, description, pillar, category, delivery mode, status) and `network.partner_identity` (auth-linking), both RLS-enabled, both already applied (migrations `010`, `012`).
- Real routes: `app/partner/layout.tsx` (guard, `requirePartnerUser()`), `app/partner/page.tsx` (root — redirects to `/partner/workspace`, PARTNER-01), `app/partner/workspace/page.tsx` (live, fetches own `partner_profile` scoped by `partnerId` — this is home), `app/partner/kora-link/page.tsx` (KORA Link partner page — explicitly no scan endpoint exists).
- ~~Open ambiguity: `/partner` (demo) and `/partner/workspace` (live) sit behind the same login with no visual distinction~~ — **resolved in PARTNER-01** (2026-07-04): `/partner/workspace` is home. `/partner` root is now a thin redirect there (still behind the same real `requirePartnerUser()` gate, so nothing changes for an actual partner session). The synthetic 100%-fake dashboard that used to render at `/partner` root moved to `app/demo/partner/page.tsx`, gated like every other `/demo/*` route (`requireDemoGate()` — DEMO_VIEWER/KORA_ADMIN only, never a real PARTNER session) so it can no longer be mistaken for the live workspace by a real partner. See `tests/unit/partner-01-pilot-surface.test.ts`.

**Should partner be (per this sprint's assessment):** **(A) a full role in the auth/access matrix** — it already is, more than the sprint brief assumed. The remaining work is *feature* completion (what a partner can actually do), not *role* bootstrapping.

**What partners may see/do — pilot-v1-and-beyond boundaries (unchanged from current design):**
- ✅ Own profile management (`partner_profile`/`partner_identity`) — already live.
- ✅ Aggregate-only outcome data, once built (e.g. "N initiatives delivered this period").
- 🔒 Deferred: scan-point management, service-offering catalog, initiative-participation dashboards — no DB model or route exists for these yet.
- ❌ Never: worker-level visibility of any kind, unless explicitly consented per-engagement and legally governed (Gate 3-equivalent for partners, not yet defined).

**Missing foundations for the next increment:**
- A DB model for "initiative participation" linked to `partner_profile` (doesn't exist yet — would need a new migration, out of scope this sprint).
- ~~A decision on whether `/partner` root becomes the real dashboard or is retired in favor of `/partner/workspace`~~ — **decided in PARTNER-01**: retired in favor of `/partner/workspace`; see above.
- Gate 8 (KORA Link partner scan) — explicitly out of v1 per the KORA Link ADR, no change recommended here.
- `app/partner/layout.tsx`'s own header comment references an `/admin/preview/partner/workspace` admin-preview page that does not actually exist (`app/admin/preview/partner/` is an empty directory) — pre-existing gap, not introduced or fixed by PARTNER-01, flagged here so a future sprint doesn't assume it's built.

**Privacy red lines (unchanged, already enforced in code):** no `worker_id`/`workerName` in any partner-facing page or query; aggregate-only company outcomes if ever exposed to partners; no cross-partner visibility (`partner_identity` has a partner-self RLS policy already).

---

## Advisor Platform

**What "Advisor" means in KORA (recommendation, not yet a formal decision):** primarily a **welfare/HR or organizational (HSE) advisor** reviewing a client company's Decision Pack and methodology outputs on KORA's or the client's behalf — not a research reviewer, not a KORA-internal ecosystem expert (that's closer to KORA_ADMIN's own role). This reading is consistent with the one DB artifact that already exists for this role (`fn_advisor_uef_read()`, scoped per-tenant, built for reviewing UEF data, not for cross-tenant research).

**Current state:**
- `ADVISOR` exists as a string in `lib/constants/kora.ts`'s `KORA_ROLES` and routes through `lib/permissions/index.ts` — but has **no session guard** in `lib/auth/kora-session.ts`, **no login**, and **no real route** (`/advisor` permanently redirects to `/demo/advisor`, a static showcase).
- DB-layer work is already done and hardened, proactively, ahead of any UI: migration `001` originally had a direct `advisor_tenant_uef_read` RLS policy on `analytics.uef_record`; migration `030` **replaced it** with `fn_advisor_uef_read()` — a tenant-scoped, `SECURITY DEFINER` function that excludes the raw payload, specifically because the original direct-table policy was a security finding (raw payload exposure). The migration's own comment states no app route currently depends on this.
- `tenant.assigned_advisor` is displayed as an info field on the admin company detail page today — advisory *relationships* are already tracked informally at the data level, even without an advisor login.

**Recommended role model:** **(A) a separate role**, not a KORA_ADMIN sub-permission and not an external read-only collaborator bolted onto an existing role. Reasoning: the DB-layer function was already built as tenant-scoped and payload-excluded specifically because an advisor is *not* KORA_ADMIN (no cross-tenant access, no raw data) and *not* COMPANY_ADMIN (reviews on behalf of / alongside the company, potentially across multiple client engagements). Building it as a genuinely separate role now avoids retrofitting permission carve-outs into KORA_ADMIN later.

**Recommended pilot use case (post-pilot-v1, not now):** read-only Decision Pack review + methodology/action-plan comments for a single assigned tenant — the smallest slice that gives `fn_advisor_uef_read()` an actual consumer.

**What should be deferred:** initiative suggestion, model-assumption validation, multi-tenant advisor dashboards — all plausible later, none needed for a first advisor increment.

**Privacy red lines:** advisor access is always tenant-scoped (never cross-tenant without a separate, explicit KORA_ADMIN-equivalent grant); never raw/individual worker data; anonymized/aggregated views only unless a specific engagement explicitly authorizes more (and that authorization mechanism doesn't exist yet — would need its own design pass, likely mirroring Gate 3's DPO/legal review pattern).

**Missing foundations for the next increment:**
- `requireAdvisorUser()` + a `KoraAdvisorUser` type in `lib/auth/kora-session.ts` (mirrors the existing `require*User()` pattern exactly — low-risk to add when the time comes).
- ~~A row in `docs/access-matrix.md`'s `canAccess()` implementation (`ADVISOR` needs adding to `lib/auth/access-matrix.ts`'s `KoraRole`)~~ — **done in ROLE-01** (2026-07-04): `ADVISOR` now has an explicit `DENY` row on every resource in `MATRIX`, ready to flip to real rules once a real guard exists.
- A real `/advisor` route replacing the permanent redirect to `/demo/advisor`.

---

## Why Partner and Advisor are not the same as Company or Worker

- **Company** = the entity being measured (the KORA Index subject). **Worker** = the individual whose aggregated activity produces that measurement, with an absolute privacy floor.
- **Partner** = an entity delivering services *into* the ecosystem — never measured by the KORA Index itself, never sees individual workers, and its own data model (`network.*`) is intentionally separate from `analytics.*`/`personal.*`.
- **Advisor** = an entity reviewing/supporting a Company's outputs from outside — never a data source, never a scoring input, always read-leaning and tenant-scoped.

Treating either as a "sub-mode" of Company or Worker would blur exactly the privacy/scope boundaries CLAUDE.md treats as constitutional (§13). Keeping them structurally separate — as the existing `PARTNER` role and the existing (unused) advisor DB function both already do — is the right call, not overbuilding.

## Suggested implementation order

1. ~~Reconcile the two `KoraRole` type definitions (prerequisite for both)~~ — **done in ROLE-01** (2026-07-04, see `access-matrix.md`).
2. Partner: decide `/partner` vs. `/partner/workspace` as home, then build initiative-participation read views on the existing `partner_profile` model.
3. Advisor: add `requireAdvisorUser()` + a real `/advisor` route consuming `fn_advisor_uef_read()`, read-only, single-tenant.
4. Only after both are stable: consider scan-point/service-offering (Partner) or comment/suggestion features (Advisor) — genuinely new surfaces, not extensions of what exists.

## What not to build yet

- Partner scan-point infrastructure (Gate 8, explicitly deferred in the KORA Link ADR).
- Any cross-tenant advisor dashboard.
- Any self-service Partner or Advisor onboarding flow (both remain KORA_ADMIN-provisioned for the foreseeable future).
- Any UI implying Partner or Advisor is a paying/self-serve SaaS tier — neither is scoped as a monetized product surface yet.
