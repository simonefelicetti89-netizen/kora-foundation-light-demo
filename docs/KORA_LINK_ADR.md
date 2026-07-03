# KORA Link — Architecture Decision Record (Pilot Backbone)

**Status:** Accepted (pilot-scope decision; does not close any gate)
**Date:** 2026-07-04
**Sprint:** KORA-LINK-S1
**Audience:** CTO, technical advisor, anyone implementing the next KORA Link increment

---

## 0. Why this document exists

KORA Link's decision history is scattered across `docs/archive/kora-link/` (11 files: threat model, CTO review handoff, RLS draft notes, engineering decision records) plus two live status docs (`KORA_LINK_STATUS.md`, `KORA_LINK_GATE_REPORT.md`) that had each drifted out of sync with the actual code on `main` before this sprint (see §2 corrections). This ADR is the single canonical place that states: what exists today, what the pilot architecture is, and what remains before any gate closes. It supersedes nothing — it consolidates.

**This ADR changes no running behavior.** No migration is applied, no feature flag is flipped, no RLS policy is written to the database, no scoring/methodology logic is touched. It is a decision-and-documentation artifact plus a small set of additive, DB-free code/test foundations (§5).

---

## 1. Current-state map (verified against `main`, 2026-07-04)

### 1.1 Docs
| Doc | State before this sprint | Corrected? |
|---|---|---|
| `KORA_LINK_STATUS.md` | Mostly accurate; one stale line claimed RLS migration 035 "not yet drafted" | Yes — corrected (§2) |
| `KORA_LINK_GATE_REPORT.md` (KL-11) | Same stale 035 claim, in three places | Yes — corrected (§2) |
| `ARCHITECTURE.md` §3 table | Claimed `app/link/[token]/` "not present" — false, self-contradicted by §8 of the same doc | Yes — corrected (§2) |
| `ARCHITECTURE.md` §8 | Accurate and appropriately hedged ("more than not implemented, far short of usable") | No change needed |
| `docs/archive/kora-link/*` | Historical design record (V1 design, 034/035/036 notes, threat model, CTO handoff, KL-02 decision gate, runtime checkpoint) — not rewritten, still the detailed backstory | Left as-is (historical) |

### 1.2 Proposed SQL (`supabase/proposed/`, not applied, Gate 2 blocks application)
- **`034_kora_link_schema.sql`** (1254 lines) — schema `kora_link`, 9 tables: `link_batches`, `links`, `link_assignments`, `link_consents`, `link_events`, `revocations`, `link_replacements`, `audit_log`, `link_delivery_records`. `links.token_digest` is the only token-related column (`text`, 64-char HMAC-SHA256 hex, `CHECK` on length) — explicit constitutional comments prohibit `token_value`/`nfc_url`/`full_token`/`worker_name`/`worker_email` columns, and the file embeds its own verification query (line ~1229) to confirm no such column ever exists. `links.status` lifecycle: `generated → assigned_to_tenant → delivered → activation_pending → active → suspended → revoked/replaced/expired/orphaned` — covers the required active/inactive states (a lost/stolen chip is revoked, not a separate literal status). **8 open CTO TODOs block Gate 2**: FK target ambiguity, `UNIQUE NULLS NOT DISTINCT` Postgres-version compatibility, generated-column compatibility, redundant indexes, audit-log retention policy, schema-naming, and two tables of disputed necessity.
- **`035_kora_link_rls.sql`** (725 lines) — RLS policies, `kl_*_admin_select/insert/update` (KORA_ADMIN-only) across all 9 tables. **Incomplete as drafted**: the worker-self-select policy on `link_assignments` and both `SECURITY DEFINER` lookup functions (`fn_kora_link_public_lookup`, `fn_kora_link_activate`) are commented out. **No company-facing SELECT policy exists in 035 at all** — company access is meant to go entirely through the aggregate RPC in 036, never direct table access.
- **`036_kora_link_rpc_functions.sql`** (879 lines) — 6 `SECURITY DEFINER` RPCs: `fn_is_valid_token_digest`, `fn_public_lookup_link`, `fn_activate_link_for_worker`, `fn_revoke_link`, `fn_replace_link`, `fn_company_link_status_aggregate`. The company-facing one enforces `p_tenant_id = kora.tenant_id()` and returns **only `(status, count)` grouped rows** — comment states it "NEVER returns link_id, token_digest, worker_id, or any per-chip data." No individual-data leak found in any RPC body.

### 1.3 Runtime code (`lib/kora-link/`, all real, tested, zero DB writes at rest, zero coupling to golden path)
`config.ts` (3 layered feature flags, default off, exact-string `'true'`), `token.ts` (token gen/validate/digest/redact — see §3), `rate-limit.ts` (Upstash + in-memory fallback), `public-route.ts` (route-state evaluator), `public-lookup.ts` (calls a not-yet-existing RPC, gated behind `KORA_LINK_DB_LOOKUP_ENABLED`, safe-fails to `'unavailable'`), `activation.ts` (same pattern for `fn_activate_link_for_worker`), `demo-lab.ts` (ephemeral, non-persisted admin token/NFC-URL generator for physical chip writing — no DB record), `ecosystem.ts` (588 lines — the canonical shared model: 6 roles, 9 gates, 13 capabilities, 6 privacy-boundary statements, 7-stage lifecycle; every capability's `impactUnitEligible`/`affectsKoraIndex`/`affectsConfidence` is hardcoded `'no'`/`'future'`, so this layer structurally cannot claim a live KORA Index effect).

### 1.4 Routes (all real, flag-gated, no live DB writes today)
`app/link/[token]/page.tsx` (public entry point), `app/link/[token]/activate/route.ts` (POST, gated behind `KORA_LINK_ACTIVATION_ENABLED`, requires authenticated worker + explicit consent), `app/admin/kora-link/page.tsx` (Control Tower — renders live gate/capability state), `app/admin/kora-link-lab/page.tsx` (demo token/NFC-URL generator UI), `app/company/kora-link/page.tsx` (aggregate-only; explicit "Nessuna visibilità individuale" panel), `app/my-kora/kora-link/page.tsx` (worker wallet/status view), `app/partner/kora-link/page.tsx` (explicitly states no scan endpoint/`partner_scans` table exists today). **KORA Link already appears in the nav** (`components/layout/Sidebar.tsx`, `lib/navigation/admin-nav-groups.ts`) for admin/company/worker/partner — it is not hidden from the UI, only inert behind the flags.

### 1.5 Tests
`tests/unit/kora-link-{ecosystem,config,token,activation,demo-lab,public-lookup,public-route,rate-limit,rate-limit-upstash}.test.ts` — ~4050 lines, genuine logic tests (not just static assertions) of the pure functions above. Plus three cross-cutting tests touch KORA Link incidentally (`b141b-my-kora-pib-ia-and-admin-access`, `b83b-worker-space-visibility`, `worker-experience-consolidation`).

### 1.6 Feature flags
`KORA_LINK_ENABLED` (route visibility) → `KORA_LINK_DB_LOOKUP_ENABLED` (DB-backed lookup vs. safe skeleton) → `KORA_LINK_ACTIVATION_ENABLED` (worker activation). All three: default `false`, exact-string `'true'` check (no truthy coercion), independently gated, test-covered. **This pattern is already correct and mature — nothing to redo here.**

### 1.7 Honest summary
KORA Link is **not** a from-scratch build. It is a paused-but-real, privacy-conscious, well-tested pilot skeleton whose remaining work is concentrated in exactly three places: (a) closing the 8 CTO TODOs in 034, (b) completing the commented-out worker/public-lookup policies in 035 and reviewing it, (c) DPO/legal sign-off on consent and retention. None of that is DB/runtime work this sprint is allowed to touch.

---

## 2. Doc corrections made this sprint

1. `docs/ARCHITECTURE.md` §3 — table row rewritten; no longer claims the public route "is not present."
2. `docs/KORA_LINK_STATUS.md` — Gate 4 row corrected (draft exists, incomplete, not "not yet drafted"); staleness caveat replaced with a note that the table was re-verified 2026-07-04; this ADR added to "Related docs."
3. `docs/KORA_LINK_GATE_REPORT.md` — three occurrences of "035 non ancora redatto" corrected to reflect the actual (incomplete) draft state.
4. `docs/README.md` — this ADR indexed alongside `KORA_LINK_STATUS.md`.

---

## 3. Pilot architecture decisions

These decisions **ratify what the existing design (034/035/036 constitutional comments, `ecosystem.ts`, the role-facing pages) already committed to** — this sprint is not introducing new, competing decisions; it is making them explicit in one place and confirming they're the right call for a pilot.

### 3.1 Pilot model
- **KORA_ADMIN-managed provisioning first.** Token generation, batch assignment to tenant, and physical chip delivery are all KORA_ADMIN-operated (`link_batches`, `link_delivery_records`, `app/admin/kora-link-lab/`). No company self-service provisioning in v1.
- **Partner area is explicitly out of v1 scope (Gate 8).** `app/partner/kora-link/page.tsx` already states no scan endpoint or `partner_scans` table exists — this is correct and should stay deferred; there is no safe, already-implemented partner scan path to build on.
- **Scan points are KORA_ADMIN-managed in pilot.** No dedicated scan-point provisioning UI exists yet and none is added this sprint (would require DB writes).
- **Company sees only aggregate outputs**, via `fn_company_link_status_aggregate` (036) — `(status, count)` grouped rows only, tenant-scoped, never per-chip or per-worker.

### 3.2 NFC content
- **The chip stores only an opaque URL/token** — `kl1_` prefix + 48 base62 chars (~285-bit entropy, rejection-sampled to avoid modulo bias). Confirmed in `lib/kora-link/token.ts`.
- **No name, no worker ID in clear, no company ID in clear, no welfare/health/personal data** — enforced structurally: 034 has no such columns, and embeds a self-verification query confirming it. The token is meaningless without the server-side `token_digest` lookup.
- **Token must be revocable/replaceable.** 034's `links.status` lifecycle includes `revoked` (covers lost/stolen/offboarding) and `replaced` (superseded by a new token, tracked in `link_replacements`). This satisfies the requirement; no new status value is needed.

### 3.3 Identity/binding
- **Worker identity binding lives server-side only**, in `link_assignments` (034) — never on the chip, never in the URL.
- **Status enum already covers active/revoked/replaced** (see §1.2/§3.2). A literal "lost" status was considered and rejected in favor of routing "lost" through `revoked` — one fewer state to reason about, same operational outcome (chip stops working, a replacement can be issued).
- **Scan events must not become individual company-visible behavior.** `link_events` (034) records events for audit/algorithm consumption; the only company-facing read path is the aggregate RPC (036), which cannot return per-event or per-worker rows by construction (SQL `GROUP BY`, no `link_id`/`worker_id` in the `RETURNS TABLE` signature).

### 3.4 Privacy
Already encoded as data, not just prose, in `lib/kora-link/ecosystem.ts`'s `KORA_LINK_PRIVACY_BOUNDARIES` (6 statements, one per role):
- **Worker** may see own Link/status/history (`app/my-kora/kora-link/`) — "worker controls activation and consent, always."
- **Company** sees aggregate signals only (`app/company/kora-link/`) — "azienda non vede mai l'attività individuale."
- **Partner** sees only permitted operational outcome, and today sees nothing at all (Gate 8 not started) — "partner non riceve mai dati identificativi non necessari."
- **KORA_ADMIN** has governance/troubleshooting visibility (`app/admin/kora-link/`, `-lab/`) — "gestisce l'infrastruttura, non lo scoring individuale."
- **Cross-cutting:** "nessun token grezzo viene mai persistito" — applies to every role, no exception.

### 3.5 What this ADR deliberately does not decide
- Does not resolve the 8 CTO TODOs in 034 (technical schema decisions, need CTO sign-off, out of scope for a docs/foundations sprint).
- Does not draft the missing worker-self-select policy or the two commented-out `SECURITY DEFINER` functions in 035 (writing untested RLS policy text with no way to verify it against a running DB in this sprint would be worse than leaving it honestly marked incomplete).
- Does not touch consent copy, retention periods, or DPO/legal language (Gate 3, needs a legal reviewer, not an engineering decision).
- Does not create a `lib/types/kora-link.ts` file. `lib/kora-link/ecosystem.ts` (plus per-module types in `token.ts`/`config.ts`) is already the canonical, single-source type model for roles, gates, capability states, and privacy boundaries. Introducing a second type module would create a competing source of truth for no benefit — the existing structure already satisfies "shared type definitions."

---

## 4. What this sprint adds (safe, DB-free, additive)

- **This ADR** (`docs/KORA_LINK_ADR.md`).
- **Doc corrections** (§2).
- **`tests/unit/kora-link-privacy-invariants.test.ts`** — a new, cross-cutting regression guard that the existing per-module test files don't already cover: static source checks that (a) no forbidden personal-data column/key (`worker_name`, `worker_email`, `token_value`, `nfc_url`, `full_token`) appears as a real definition (not a prohibiting comment) anywhere in 034/035/036; (b) the company-facing RPC signature in 036 never returns `link_id`/`worker_id`/`token_digest`; (c) `app/company/kora-link/page.tsx` and `app/partner/kora-link/page.tsx` source never references a per-worker identifier; (d) `generateToken()`'s actual output matches the opaque `kl1_`+48-base62 shape and nothing else; (e) `KORA_LINK_PRIVACY_BOUNDARIES` has at least the company/partner/worker/admin statements this ADR relies on, so a future edit to `ecosystem.ts` that quietly weakens one is caught.

Nothing else was added. Given how complete the existing `lib/kora-link/` + route + test surface already is, adding more skeleton code this sprint would be scope-padding, not scope-filling — the honest gap is in DB-layer completeness and external review, not application code.

---

## 5. Remaining steps before any gate closes (unchanged by this sprint, restated for clarity)

1. **Gate 2 (CTO):** resolve the 8 TODOs in `034_kora_link_schema.sql` (FK targets, `UNIQUE NULLS NOT DISTINCT` PG-version check, generated-column compatibility, redundant indexes, audit-log retention, schema naming, necessity review of two tables).
2. **Gate 4 (RLS):** write and review the worker-self-select policy on `link_assignments` and the two `SECURITY DEFINER` functions currently commented out in `035_kora_link_rls.sql`; add explicit negative-test coverage (company cannot read `link_assignments`/`link_consents` directly) before this gate can close — the RLS-03 direct-Postgres pattern from PR #26 is directly reusable here once 034/035 are stable enough to apply to a local Supabase instance.
3. **Gate 3 (DPO/legal):** consent copy, retention policy, privacy notice — needs a legal reviewer, not engineering.
4. **Gate 5 (staging):** apply 034/035/036 to a staging project only after Gates 2–4 close.
5. **Gate 6 (public route):** flip `KORA_LINK_ENABLED`/`KORA_LINK_DB_LOOKUP_ENABLED` only after Gate 5.
6. **Gate 7 (worker activation):** flip `KORA_LINK_ACTIVATION_ENABLED` only after Gate 6.
7. **Gate 8 (partner scan):** out of v1 scope entirely — no design work recommended until v1 ships and is stable.
8. **Gate 9 (production):** all prior gates closed.

None of steps 1–8 can happen without applying migrations to a real database — which is exactly why this sprint stops at documentation and DB-free tests.

## Related docs

`KORA_LINK_STATUS.md`, `KORA_LINK_GATE_REPORT.md`, `KORA_LINK_CHANGELOG.md`, `ARCHITECTURE.md` §8, `docs/archive/kora-link/` (historical design detail), `STATUS.md`.
