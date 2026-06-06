# KORA Foundation Light — Technical Reference

> **SYNTHETIC DEMO DATA — NOT LIVE DATA**
> All demo seed data in `/data/synthetic/` is entirely fabricated. No real company data, no real worker identities, no real personal information of any kind. `synthetic_demo_data: true` on all seed records.

---

## What this is

KORA Foundation Light is the demo and pilot build of the **KORA Human Impact Intelligence Platform** — a rule-based scoring engine that measures organizational human activation, not individual workers.

KORA measures organizations. The KORA Index is a company-level output. Individual intermediate data (PIB, IU, UEF) exists only to produce that aggregate — never to rate, rank, or surveil workers.

**Methodology:** KORA Methodology v0.1
**Calibration status:** `pre_empirical_calibration` — not empirically validated, not regulatory-grade
**Purpose:** Pilot-grade diagnostic intelligence for organizational activation measurement

---

## Technical stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ App Router, TypeScript strict mode |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Auth | Supabase Auth with `app_metadata.kora_role` — roles are server-controlled |
| ORM | None — raw SQL migrations only (Gate 2 open, no Prisma/ORM) |
| AI/ML | None — KORA Classification Engine is fully rule-based (no external LLM calls on HR/worker data) |

---

## Supabase backend

The repository includes a live Supabase backend with:

**SQL migrations 001–005** in `supabase/migrations/`:
- `001_live_v1_foundation.sql` — core tables: tenants, company sessions, UEF batches, company_uef_records
- `002_grants_and_softdelete.sql` — role grants, soft-delete support
- `003_claim_functions_app_metadata.sql` — JWT claim helpers for app_metadata roles
- `004_gate3a_claims_and_grants.sql` — Gate 3a RLS grants
- `005_impact_unit_trace_layer.sql` — IU trace storage layer

**Row-Level Security (RLS)** is enabled on all production tables.

**Supabase Auth** uses `app_metadata.kora_role` for server-side role enforcement:
- `KORA_ADMIN` — platform operator (admin workspace, full access)
- `COMPANY_ADMIN` — company-scoped read/manage (company workspace)
- `COMPANY_VIEWER` — company-scoped read-only (company workspace)

Tenant isolation: `kora_tenant_id` is read from `app_metadata` only — never trusted from client input. Server-side session validation uses `requireKoraAdmin()` and `requireCompanyUser()` from `lib/auth/kora-session.ts`. Admin workspace has server-side auth guard at layout level (`app/admin/layout.tsx`).

---

## KORA Scoring Engine

The scoring engine lives in `lib/kora-engine/` and is **portable and decoupled from the UI**. It has no Next.js or Supabase dependencies and can be extracted and run standalone.

### Canonical 14-stage algorithm

```
Stage 1:  Data Source Ingestion
Stage 2:  AI Upload Studio (file parsing, column detection)
Stage 3:  Privacy Layer (pseudonymization, sensitivity tagging)
Stage 4:  Data Quality Engine (completeness, verification tier)
Stage 5:  UEF (Unified Event Frame — first structured record)
Stage 6:  NM (Normalized Magnitude — intensity scaling)
Stage 7:  BC (Base Contribution Matrix — pillar weight per event)
Stage 8:  Correction Factors (CQ, EV, CF)
Stage 9:  AGF (Anti-Gaming Factor — mandatory, 0.00–1.00)
Stage 10: IU Engine (Impact Unit computation)
Stage 11: PIB (Personal Impact Balance — mandatory intermediate)
Stage 12: Company Aggregation (PIB rollup to company level)
Stage 13: Activation Safeguard (CLEAR / WARNING / FLAGGED)
Stage 14: KORA Index Engine + Confidence Score (inseparable output pair)
```

### IU formula

```
IU = NM × BC × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
```

Weights and thresholds are read from `lib/methodology-config/v0.1.ts`. Never hardcoded.

### KORA Index v1.0 — 4 macroblocks, 10 components

| Macroblock | Weight | Components |
|---|---|---|
| Activation Reach | 25% | AR (12.5%) + MAR (12.5%) |
| Activation Quality | 30% | NI (~10%) + VR (~10%) + CO (~10%) |
| Distribution & Equity | 25% | WB (6.25%) + PC (6.25%) + PB (6.25%) + EQ (6.25%) |
| Budget-to-Human-Impact | 20% | BTI Engine |

Confidence Score (CS) is **external to the KORA Index** (weight = 0). Always displayed alongside KORA Index — never omitted.

### Eligibility classifiers — two files, different purposes

| File | Role |
|---|---|
| `lib/kora-engine/eligibility-gate.ts` | **CANONICAL** — controls live scoring, IU, KORA Index |
| `services/eligibility-gate/EligibilityGateService.ts` | **TAXONOMY/PREPROCESSING** — admin BCM mapping UI only |

The canonical engine is the only classifier that determines whether a record generates IU or contributes to the KORA Index. See headers in both files for full documentation.

### Entry point

```typescript
import { runKoraPipeline } from '@/lib/kora-engine/run-kora-pipeline';
const result = runKoraPipeline({ tenantId, records, workforcePopulation });
```

---

## Privacy architecture

- **N≥10 threshold**: employer-visible segments suppressed below 10 workers (re-identification risk)
- **No employer access to individual PIB**: `PIBAggregationService.getWorkerPIBSummary()` blocks employer roles unconditionally
- **Tenant isolation**: all company data access uses `tenantId` from server session — never from client input
- **My KORA worker layer**: worker-private, inaccessible to employer roles. Worker platform is preview state — no live worker identity, no real `worker_kora_id` mapping
- **RLS policies**: enforce tenant isolation and role boundaries at the database layer

---

## Application state

| Area | Status |
|---|---|
| KORA Index scoring engine | Functional — rule-based, deterministic |
| Company workspace (KORA Index, BTI, reports) | Live — Supabase-backed, company sessions active |
| Admin workspace | Live — Supabase auth + server-side KORA_ADMIN guard |
| My KORA worker platform | Preview — synthetic per-persona data, no live worker identity |
| Partner / Advisor workspaces | Demo — mock service layer |
| Future Vision screens | Static mockups — labeled inactive, no backend logic |

---

## Gate status

| Gate | Status | Blocks |
|---|---|---|
| Gate 1 — Founder decisions | CLOSED | — |
| Gate 2 — CTO architecture review | OPEN | Prisma/ORM, production backend expansion |
| Gate 3 — Legal/privacy counsel | OPEN | Live worker data, real HRIS/LMS integrations |
| Gate 5 — Tax/fiscal advisor | OPEN | Live fiscal/tax outputs |

---

## Running locally

```bash
cp .env.local.example .env.local   # add Supabase URL + anon key
npm install
npm run dev                        # development server
npx tsc --noEmit                   # TypeScript check
npm run lint                       # ESLint check
npm run test                       # Vitest unit + integration tests
npm run build                      # Next.js production build
```

---

## Project structure

```
/app                  Next.js App Router (admin / company / my-kora / partner / advisor / future-vision)
/lib/kora-engine      Canonical scoring engine — portable, no UI/DB dependencies
/lib/methodology-config  Versioned weights and thresholds (v0.1.ts)
/lib/auth             Server-side session helpers (requireKoraAdmin, requireCompanyUser)
/lib/supabase         Supabase client initialization (browser + server)
/services             Mock service layer — mirrors future production service boundaries
/data/synthetic       Synthetic JSON seed files (demo data only)
/supabase/migrations  SQL DDL 001–005 (production schema, Gate 2 reference)
/tests                Vitest unit + integration tests
/docs                 Canonical architecture documents
```

---

## What is not final

- **UI**: Foundation Light UI is demo/pilot state — not the production interface
- **Worker platform (My KORA)**: preview — no live worker identity, no `worker_kora_id` mapping
- **Methodology weights**: pre-empirical calibration — Delphi Study calibration is post-pilot
- **Demo pages**: role switcher, scenario switcher, synthetic data labels
- **Future Vision screens**: static mockups, no runtime logic, labeled "Non attivo in Foundation Light"

---

## Handoff reference

- `docs/kora-scoring-kernel-contract.md` — scoring kernel input/output contract, canonical flow, privacy invariants, what to reuse
- `docs/10-architecture-v3-layer-specification.md` — 14-stage algorithm specification
- `docs/26-foundation-light-technical-build-handoff.md` — tech stack, folder structure, build priorities
- `CLAUDE.md` — operating constitution for this codebase
