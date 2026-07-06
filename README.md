# KORA Foundation Light — Technical Reference

> **SYNTHETIC DEMO DATA — NOT LIVE DATA**
> All demo seed data in `/data/synthetic/` is entirely fabricated. No real company data, no real worker identities, no real personal information of any kind. `synthetic_demo_data: true` on all seed records.

---

## What this is

KORA Foundation Light is the demo and pilot build of the **KORA Human Impact Intelligence Platform** — a rule-based scoring engine that measures organizational human activation, not individual workers.

KORA measures organizations. The KORA Index is a company-level output. Individual intermediate data (PIB, IU, UEF) exists only to produce that aggregate — never to rate, rank, or surveil workers.

**Methodology:** KORA Index v1.0 (public label) · KORA Methodology Architecture v3 (internal 10-component structure)
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
| ORM | None — raw SQL migrations only (Gate 2 closed with conditions, no Prisma/ORM; see `docs/GATE2_STATUS.md`) |
| AI/ML | None — KORA Classification Engine is fully rule-based (no external LLM calls on HR/worker data) |

---

## Supabase backend

The repository includes a live Supabase backend with:

**SQL migrations** in `supabase/migrations/` — 29 files total, numbered `001`–`028` plus `030`–`031` (there is no `029`; do not add a gap-filling migration at that number — see `docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md` for how this was verified). Earliest/most architecturally significant:
- `001_live_v1_foundation.sql` — core schemas and tables (tenant, source_batch, uef_record, workforce_baseline, uploaded_record)
- `002_grants_and_softdelete.sql` — FORCE RLS on personal.*, role grants
- `003_claim_functions_app_metadata.sql` — first version of kora.kora_role() and kora.tenant_id()
- `004_gate3a_claims_and_grants.sql` — updated claim functions post-Gate 3A
- `005_impact_unit_trace_layer.sql` — analytics.impact_unit schema (defined in repo; absent in live DB)
- `006_canonical_tenant_key.sql` — **CANONICAL**: fixes kora.tenant_id() to read kora_tenant_id
- `007_worker_provisioning.sql` — personal.worker_identity + RLS
- `008_worker_initiatives.sql` — personal.worker_initiative + personal.worker_participation + RLS
- `009_worker_onboarding.sql` — onboarding/consent fields on personal.worker_profile_private
- `010_partner_profile.sql` — network schema + network.partner_profile
- `011_worker_cv_share.sql` — personal.worker_cv_share (Dynamic CV share tokens)
- `012_partner_identity.sql` — network.partner_identity (PARTNER auth users)
- `013_kora_commons.sql` — commons schema + commons.post
- `014_tenant_classification.sql` — tenant_kind on analytics.tenant
- `015_company_safe_aggregation_layer.sql` — **CANONICAL**: 4 analytics objects for company-safe data access (B152/B153)
- `016`–`028`, `030`–`031` — worker/company/commons RLS hardening, audit log enrichment, UEF admin access hardening, and related follow-on fixes; see each file's own header comment for specifics rather than a restated list here (this section is a starting orientation, not a substitute for reading the migration files).

**Row-Level Security (RLS)** is enabled on all production tables.

**Supabase Auth** uses `app_metadata.kora_role` for server-side role enforcement:
- `KORA_ADMIN` — platform operator (admin workspace, full access)
- `COMPANY_ADMIN` — company-scoped read/manage (company workspace)
- `WORKER` — worker-scoped (worker workspace)
- `PARTNER` — partner workspace (demo only in Foundation Light)

Tenant isolation: `kora_tenant_id` is read from `app_metadata` only — never trusted from client input. Server-side session validation uses `requireKoraAdmin()`, `requireCompanyUser()`, and `requireWorkerUser()` from `lib/auth/kora-session.ts`.

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
| Activation Quality | 30% | EVQ (~10%) + INT (~10%) + CONT (~10%) |
| Distribution & Equity | 25% | EQW (~7.5%) + EQS (~5%) + PC (~6.25%) + PB (~6.25%) |
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
| Gate 2 — CTO architecture review | CLOSED WITH CONDITIONS | Production Supabase provisioning, production backend expansion — staging-only work is authorized (see `docs/GATE2_STATUS.md`) |
| Gate 3 — Legal/privacy counsel | OPEN | Live worker data, real HRIS/LMS integrations |
| Gate 5 — Tax/fiscal advisor | OPEN | Live fiscal/tax outputs |

See `docs/GATE2_STATUS.md` for the full canonical Gate 2 status and conditions.

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

> **Modalità demo (nessun DB richiesto):** se vuoi solo esplorare l'UI con dati sintetici, i
> placeholder di `.env.local.example` sono sufficienti — `npm install && npm run dev` è tutto
> ciò che serve. I 29 file JSON in `/data/synthetic/` sono caricati in-memory dai mock service;
> nessuna azione sul DB è necessaria.

---

## Setup completo con DB locale

Per sviluppo con autenticazione reale, API live e RLS attivo.

### Prerequisiti aggiuntivi

| Strumento | Versione minima | Installazione |
|---|---|---|
| Node.js | ≥ 20 | https://nodejs.org |
| Docker Desktop | 4.x | https://www.docker.com/products/docker-desktop |
| Supabase CLI | 2.x | `brew install supabase/tap/supabase` |

### Sequenza di avvio

```bash
# 1. Avvia il backend Supabase locale (richiede Docker in esecuzione)
supabase start
# → stampa API URL, anon key e service role key (validi solo in locale)

# 2. Applica tutte le migration su un DB pulito
supabase db reset
# → applica tutti i file in supabase/migrations/ in ordine (001–028, 030–031; non esiste 029)

# 3. Compila .env.local con le credenziali locali
cp .env.local.example .env.local
# Sostituisci NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
# con i valori stampati da `supabase status`

# 4. Crea gli utenti locali (vedi sezione sotto)

# 5. Avvia il dev server
npm install
npm run dev   # http://localhost:3000
```

### Creare gli utenti locali

Senza utenti con `app_metadata.kora_role` il login fallisce silenziosamente.
Apri Supabase Studio (`http://localhost:54323` → SQL Editor) e incolla:

```sql
-- Utente KORA_ADMIN locale
-- Email: admin@kora.local  Password: KoraLocal2024!
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated', 'authenticated',
  'admin@kora.local',
  crypt('KoraLocal2024!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"kora_role":"KORA_ADMIN"}',
  '{}',
  now(), now(), '', '', '', ''
);
```

Con questo utente puoi accedere all'admin workspace e usare il role switcher (VISTA)
per esplorare le viste COMPANY_ADMIN e WORKER in modalità demo.

**Per COMPANY_ADMIN live** occorre prima un tenant in `analytics.tenant` e poi:
```sql
-- Sostituisci <tenant-uuid> con l'id del tenant creato
INSERT INTO auth.users ( instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated', 'company@kora.local',
  crypt('KoraLocal2024!', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"],"kora_role":"COMPANY_ADMIN","kora_tenant_id":"<tenant-uuid>"}',
  '{}', now(), now(), '', '', '', ''
);
```

Usa lo script `scripts/worker-trial-seed.ts` per creare tenant e workforce completi:
```bash
npx tsx scripts/worker-trial-seed.ts --tenantCode ACME --apply
```

### Porta Studio locale

`supabase status` stampa la URL di Studio (tipicamente `http://localhost:54323`).
Da Studio puoi ispezionare le tabelle, eseguire SQL, e verificare gli utenti Auth.

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
/supabase/migrations  SQL DDL 001–028, 030–031 (production schema, staging-applied under Gate 2 closed-with-conditions; no 029)
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

**Evaluating KORA as a reviewer, advisor, or pilot partner?** Start with `docs/PILOT_REVIEW_PACKAGE.md` instead of this file.

**Start here (engineering handoff):** `docs/archive/handoffs/HANDOFF_NEXT.md` — historical platform state snapshot (2026-06-18), migration status, privacy architecture, technical debt at that point in time. Archived docs may not reflect current runtime state — see `docs/README.md`.

Additional canonical documents:
- `CLAUDE.md` — operating constitution for this codebase (read before any code change)
- `docs/kora-canonical-product-architecture-v1.md` — master product reference v1.1
- `docs/10-architecture-v3-layer-specification.md` — 14-stage algorithm specification
- `docs/26-foundation-light-technical-build-handoff.md` — tech stack, folder structure, build priorities
