# KORA — Architecture Reference

**Versione:** 1.0
**Data:** 2026-06-30
**Branch:** `docs/consolidation` @ `1034a0d`
**Ambiente di riferimento:** staging `haqf****` (Supabase)
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN (blocks SQL apply to production) · Gate 3 OPEN · Gate 5 OPEN
**Audience:** CTO, tech investor, external dev team, solution architect

> Questo documento descrive lo stato reale del codebase — non un'architettura target teorica.
> Ogni affermazione è verificabile leggendo il codice in questo repository.

---

## Migration Numbering Clarification

Prima di procedere, chiarimento richiesto da CC-03 su migration 032/033:

| Numero | File | Posizione | Stato |
|---|---|---|---|
| 031 | `031_revoke_public_execute_uef_definer_functions.sql` | `supabase/migrations/` | ultima migration "approvata" |
| 032 | `032_contribution_atomic_attribution.sql` | `supabase/proposed/` | READY_FOR_REVIEW — non ancora promossa |
| 033 | `033_initiative_adoption_source_model.sql` | `supabase/proposed/` | READY_FOR_REVIEW — non ancora promossa |

**032 e 033 sono occupati.** Non sono numeri liberi — contengono la logica KORA Contribution atomica e il source model adoption.

**La distinzione nel progetto:**
- `supabase/migrations/` = migration approvate (la convenzione KORA le promuove qui quando sono READY)
- `supabase/proposed/` = migration sotto review, non ancora promosse

**Precisione su CC-02:** il report CC-02 diceva "migration 025 non ancora applicata su staging". Corretto — tutte le migration, incluse quelle in `migrations/`, devono ancora essere applicate a staging tramite CLI. Il fatto di essere in `migrations/` non implica apply al DB. L'apply su staging richiede `supabase db push` con `.env.staging.local` e Gate 2 open.

**Prossimo numero libero per KORA Link:** `034`.

---

## 1. Executive Technical Summary

KORA è una **Human Impact Intelligence Platform**: trasforma dati organizzativi eterogenei — welfare, formazione, volontariato, iniziative collettive, attività partner — in intelligence di attivazione organizzativa verificabile e spiegabile. L'output è il **KORA Index**: un punteggio a livello aziendale, mai individuale.

**Cosa misura.** Il KORA Index v3 ha 10 componenti fissi (AR, MAR, EVQ, INT, CONT, EQW, EQS, PC, PB, BTI) raggruppati in 4 macroblocchi (REACH 25%, QUALITY 30%, EQUITY 25%, BTI 20%). Ogni componente deriva da Impact Units (IU) calcolate su eventi verificati — mai da autovalutazione o sondaggi.

**La base è reale.** L'architettura non è una demo: il motore di scoring (`lib/kora-engine/`, 24 moduli, pipeline 14 stage) gira su dati reali in staging. L'autenticazione è Supabase con custom claims. Le RLS sono stratificate su tutti gli schemi sensibili. 30 migration SQL sono in coda con pattern rollback. La test suite conta 8.079 test verdi su 191 file.

**Cosa resta da consolidare (non da riscrivere).** Gli asset core — engine, auth, RLS, API routes, scoring path — sono solidi. I debiti sono: (1) ESLint 118 errori, di cui 8 `setState in useEffect` e 3 `cannot create components during render`; (2) zero test E2E browser; (3) 2 migration in `proposed/` non ancora promosse né applicate; (4) alcune route company hanno shell locked ("prossimamente") visibili. Niente di questo richiede un rewrite — richiede consolidation mirata.

**Cosa non è ancora production-ready.** Live data su tenant reali richiede Gate 3 (consent, GDPR, DPIA). Le migration 032/033 non sono ancora su staging. Il Dynamic CV sharing è UI-only. La Financial Intelligence avanzata è parziale. KORA Link v1 è flaggato OFF e non implementato.

**Percorso corretto: consolidation, non rewrite.** La pipeline algoritmica è l'asset principale — rifatta da zero perderebbe la metodologia accumulata, le 30 migration di schema e 8.079 test di validazione. Il percorso è: applica le migration su staging, chiudi ESLint critico, aggiungi E2E, poi procedi con dati reali (Gate 3).

---

## 2. Repository Map

```
KORA/
├── app/                    ← Next.js 16 App Router — tutte le pagine e API route
├── components/             ← React components (UI, layout, domain-specific)
├── lib/                    ← Business logic, engine, auth, Supabase clients, types
├── services/               ← Service layer — data access, scoring, privacy
├── data/                   ← Dati sintetici JSON + metodologia + golden path CSV
├── supabase/               ← Migration SQL, proposed, rollback, seed
├── tests/                  ← Test suite (vitest)
├── docs/                   ← Documentazione architetturale e operativa
├── public/                 ← Asset statici
└── [config files]          ← next.config.ts, tailwind.config.ts, tsconfig.json, ...
```

### `app/`

**Responsabilità:** routing, layout, page server components, API route handlers.

```
app/
├── admin/          ← KORA_ADMIN workspace (Company Console, Trial Center, UEF Review, ...)
├── company/        ← COMPANY_ADMIN workspace (KORA Index, Activation, Reports, ...)
├── worker/         ← WORKER workspace (Workspace, Dynamic CV, Onboarding, ...)
├── my-kora/        ← WORKER personal space (PIB, KORA Space, Bookings, Privacy, ...)
├── partner/        ← PARTNER workspace
├── demo/           ← Demo/preview area pubblica (non richiede auth)
├── auth/           ← Auth flow (callback, forgot-password, reset-password)
├── api/            ← ~80 API route handlers (admin ~45, company ~12, worker ~15, commons ~4)
├── account/        ← Account profile
├── cv/             ← Public CV share view
├── pilot/          ← Marketing page (prezzi, FAQ, contatto)
├── login/          ← Login unificato
└── request-access/ ← Informativa pubblica
```

**File chiave per CTO:**
- `app/company/kora-index/page.tsx` — KORA Index live, no demo fallback
- `app/company/workspace/page.tsx` — entry point company autenticato
- `app/worker/workspace/page.tsx` — entry point worker autenticato
- `app/api/admin/companies/provision/route.ts` — provisioning tenant live
- `app/api/worker/pib/route.ts` — PIB worker (WORKER-only)

**Rischio:** `app/admin/*` usa service-role — nessuna modifica senza review. `app/my-kora/*` è area privata worker — employer access strutturalmente impossibile.

### `components/`

**Responsabilità:** UI components React. Organizzati per dominio.

```
components/
├── admin/              ← Company console panels, workforce panels
├── auth/               ← SessionBar, PrivilegedAccessBanner
├── badges/             ← StatusBadge, CalibrationBadge, SafeguardBadge
├── cards/              ← KoraIndexCard, ConfidenceCard, NextActionCard
├── charts/             ← PillarChart, ComponentBreakdown
├── commons/            ← Commons booking, moderation sections
├── company/            ← Cockpit components (ProvenanceFooter, ExplainabilityHint)
├── demo/               ← DemoAccessBanner, RoleSwitcher
├── executive-intelligence/ ← ExecutiveIntelligencePanel
├── hooks/              ← useCountUp e altri custom hooks
├── kora-index/         ← KoraIndexHero, ComponentBreakdown, ActivationSafeguardPanel, HeroDiagnosis
├── landing/            ← MarketingNav, MarketingFooter
├── layout/             ← AppShell, Sidebar, Header
├── my-kora/            ← PIBCard, PillarTimeline, CVItem
├── privacy/            ← PrivacyBoundaryNotice, AccessDeniedState, SuppressionOverlay
├── reports/            ← ReportTemplate, PrivacyBoundaryNote, NormativeMappingLightSection
└── ui/                 ← Design system base (PageMasthead, SectionLabel, NoDataState, TM, ...)
```

**Note:** `components/privacy/` è un guardrail architetturale — va usato ovunque si mostrano dati potenzialmente sensibili. Non bypassare con CSS o conditional rendering diretto.

### `lib/`

**Responsabilità:** business logic pura, engine, auth, Supabase, tipi, config metodologia.

```
lib/
├── kora-engine/        ← Pipeline 14-stage (24 moduli) — asset tecnico principale
├── auth/               ← access-matrix.ts, kora-session.ts, role-home.ts, demo-guard.tsx
├── supabase/           ← client.ts, server.ts, 4× service-role scoped, types.ts
├── methodology-config/ ← v0.1.ts — loader pesi/soglie da JSON (mai hardcoded)
├── scoring-result/     ← useScoringResult() hook — canale canonico scoring
├── live/               ← scoring-mapper, live-recommendations, live-board-actions, ...
├── audit/              ← log-access.ts — audit log per accessi privilegiati
├── constants/          ← kora.ts (pillar codes, component codes, soglie), feature-flags.ts
├── types/              ← TypeScript shapes (NOT Prisma models)
├── demo-state/         ← useRole(), useEnvironment() — demo state hooks
├── design/             ← kora-design-tokens.ts
├── privacy/            ← Privacy boundary helpers
├── permissions/        ← Permission resolution helpers
├── normative-mapping/  ← NormativeMappingLight (CSR/ESG mapping)
├── formatters/         ← Score, percentage, date formatters
└── [domain libs]       ← data-intake, dynamic-cv, ingestion, reporting, ...
```

**File off-limits senza review:**
- `lib/auth/access-matrix.ts` — funzione PURA, fonte di autorità access control
- `lib/auth/kora-session.ts` — session extraction e role enforcement
- `lib/supabase/*-service-key.ts` — service-role clients scoped
- `lib/methodology-config/v0.1.ts` — pesi metodologici, mai modificare direttamente

### `services/`

**Responsabilità:** service layer. Ogni service ha una responsabilità singola. Components chiamano services, mai seed files direttamente.

57 service files. Chiave:

| Service | Tipo | Note |
|---|---|---|
| `ScoringSimulatorService` | DEMO | Legge seed sintetici |
| `LiveScoringAdapter` | LIVE | Wraps `run-kora-pipeline.ts` |
| `PreviewScoringAdapter` | PREVIEW | Proxy approssimato, non authoritative |
| `RolePermissionService` | INFRA | Gatekeeper accessi |
| `PrivacyVisibilityService` | INFRA | Soppressione dati (<10) |
| `WorkerPIBService` | WORKER | Due path: demo (sincrono) / live (async JWT) |
| `ActivationSafeguardService` | ENGINE | CLEAR/WARNING/FLAGGED thresholds |
| `KoraContributionService` | CONTRIBUTION | Companion indicator, mai KORA Index |
| `CommonsService` | COMMONS | Demo + live published initiatives |
| `WorkerProvisioningService` | DEMO | Roster sintetico (admin panel) |

### `supabase/`

```
supabase/
├── migrations/   ← 30 migration approvate (001–031, senza 029)
├── proposed/     ← 032, 033 — READY_FOR_REVIEW, non promosse
├── rollback/     ← Rollback per 027, 030, 031
└── seed/         ← Seed staging minimale (gate2_phase1_minimal_staging_seed.sql)
```

### `data/`

```
data/
├── synthetic/    ← 35 JSON seed files (synthetic_demo_data: true, not_live_data: true)
├── methodology/  ← methodology-config.json (pesi, calibration_status, versione)
└── golden-path/  ← 3 CSV upload per test scoring pipeline (golden/average/weak)
```

### `tests/`

```
tests/
├── unit/         ← 186 file vitest (8.047 test circa)
└── integration/  ← 5 file (workspace boundary, routes boundary, demo gating, ...)
```

**Nota:** non esiste una cartella `spec/` — tutta la specifica è in `docs/` e nei file di test stessi.

### `docs/`

Documentazione canonica. I file primari per un CTO:

| File | Contenuto |
|---|---|
| `CLAUDE.md` | Costituzione tecnica — regole non negoziabili per ogni sessione di sviluppo |
| `docs/kora-canonical-product-architecture-v1.md` | Architettura prodotto canonico |
| `docs/10-architecture-v3-layer-specification.md` | 14-stage algorithm, IU formula, KORA Index v3 |
| `docs/21-founder-gate-resolution-log.md` | D-01–D-21 founder decisions — registro decisioni |
| `docs/21b-methodology-risk-acceptance-and-provisional-score-policy.md` | Output positioning e calibration_status |
| `docs/22A-foundation-light-demo-build-cutline.md` | Confine build: Functional/Semi-Functional/Mockup/Excluded |
| `docs/KORA_PLATFORM_INVENTORY.md` | Inventario 25 aree (CC-02) |
| `docs/BASELINE_STATUS.md` | Baseline tecnica (CC-00) |
| `docs/ENVIRONMENT_SAFETY_CHECK.md` | Ambiente Supabase (CC-00B/CC-00C) |
| `CTO_REVIEW_KORA_CONTRIBUTION_SOURCE_LAYER.md` | CTO review migration 025/032/033 |
| `HANDOFF_KORA_CONTRIBUTION_SOURCE_LAYER.md` | Handoff contribution source layer |

---

## 3. Runtime Areas

### 3.1 Admin Area

**Path:** `app/admin/`, `app/api/admin/`
**Ruolo:** `KORA_ADMIN`
**Dati:** Reali (staging) + sintetici (preview/founder-validation)

| Sezione | Path | Stato | Note |
|---|---|---|---|
| Company Console | `/admin/companies` | LIVE | Lista tenant real DB |
| Worker Provisioning | `/admin/workers/provision` | LIVE | Service-role scoped |
| Trial Control Center | `/admin/trial-control-center` | LIVE | Hub orchestrazione |
| UEF Review | `/admin/uef-review` | LIVE | Approvazione eventi |
| Data Intake | `/admin/data-intake` | LIVE | Accettazione batch |
| Data Lifecycle | `/admin/data-lifecycle` | LIVE | Archive/delete |
| Impact Units Explorer | `/admin/impact-units` | LIVE | Monitoring pipeline |
| Live Spine Diagnostics | `/admin/live-spine-diagnostics` | LIVE | Integrità infrastruttura |
| Founder Validation | `/admin/founder-validation` | DEMO-ONLY | Lead sintetici |
| Admin Preview | `/admin/preview` | DEMO-ONLY | Preview as worker/company |
| Operator Console | `/admin/operator` | LIVE | Console operativa |

**Readiness:** ALTA per funzioni operative. Non mostrare Founder Validation come feature live.

### 3.2 Company Area

**Path:** `app/company/`, `app/api/company/`
**Ruolo:** `COMPANY_ADMIN`
**Dati:** Reali (scoring live) — zero fallback sintetici su path live

| Sezione | Path | Stato | Note |
|---|---|---|---|
| Workspace | `/company/workspace` | LIVE | Entry point autenticato |
| KORA Index | `/company/kora-index` | LIVE | Senza sessione → NoDataState |
| Activation | `/company/activation` | LIVE | AR, MAR reali |
| Pillars | `/company/pillars` | LIVE | Distribuzione pillar reale |
| Financial / BTI | `/company/financial` | LIVE (parziale) | BTI Score OK, Financial Intelligence avanzata TBD |
| Decision Pack | `/company/reports` | LIVE | PDF board-grade |
| Status Center | `/company/status` | LIVE | Submission tracking |
| Data Quality | `/company/data` | LIVE | Pipeline status |
| Contribution | `/company/contribution` | LIVE/SHELL | Shell per tenant standard, live per `production_ready=true` |
| Commons | `/company/commons` | LIVE | Post moderati |
| Onboarding | `/company/onboarding` | LOCKED-SHELL | Avviene via Admin |
| Opportunities | `/company/opportunities` | LOCKED-SHELL | Non attivo |

**Readiness:** ALTA per intelligence pages. Comunicare chiaramente la shell Onboarding.

### 3.3 Worker Area

**Path:** `app/worker/`, `app/my-kora/`, `app/api/worker/`
**Ruolo:** `WORKER`
**Dati:** Reali (live JWT) / sintetici con label (senza sessione)

| Sezione | Path | Stato | Note |
|---|---|---|---|
| Workspace | `/worker/workspace` | LIVE | Iniziative, storico, activation |
| Dynamic CV | `/worker/dynamic-cv` | LIVE-AWARE | 401→demo, 200→live |
| PIB | `/my-kora/personal-impact-balance` | LIVE-AWARE | `getPIBLive()` da `personal.worker_pib` |
| KORA Space | `/my-kora/kora-space` | LIVE-AWARE | four-state: checking/live/empty/demo |
| Bookings | `/my-kora/bookings` | LIVE-AWARE | Bookings da Supabase |
| Privacy | `/my-kora/privacy` | LIVE-AWARE | Consent + sharing settings |
| Opportunities | `/worker/opportunities` | LOCKED-SHELL | Partner catalog "prossimamente" |

**Privacy invariant hardcoded:** PIB e CV mai visibili a employer — enforced a tre livelli (service, route, RLS).

**Readiness:** ALTA per worker autenticati. Opportunities è l'unico gap visibile.

### 3.4 Public / Auth Area

**Path:** `app/login/`, `app/auth/`, `app/company/login`, `app/worker/login`, `app/admin/login`

**Stato:** LIVE
- Login unificato + login specifici per ruolo
- PKCE flow per invite e reset password
- Auth callback per sessioni post-invite
- `app/pilot/` — marketing page statica (mailto, zero backend)
- `app/request-access/` — informativa pubblica

### 3.5 Demo / Preview Area

**Path:** `app/demo/`

| Page | Stato | Mostrabile |
|---|---|---|
| `/demo` | DEMO | Sì — hub navigazione |
| `/demo/guide` | DEMO | Sì — guida interattiva |
| `/demo/future-vision` | MOCKUP | Solo con disclaimer |
| `/demo/advisor` | DEMO | Sì — con note |
| `/demo/benchmarks` | DEMO/MOCKUP | Con cautela |
| `/demo/portfolio` | DEMO | Sì |
| `/demo/network` | MOCKUP | Solo con disclaimer "roadmap" |
| `/demo/ai-onboarding` | MOCKUP | No — può confondere |
| `/demo/gtm` | DEMO | Interno |
| `/demo/index-registry` | DEMO | Sì |

Tutte le demo pages hanno `DemoAccessBanner`. `/demo/future-vision` ha label esplicita "not active in Foundation Light".

### 3.6 Future: KORA Link Public Area

**Path futuro:** `/link/[token]`
**Stato:** NON IMPLEMENTATO — `FEATURE_FLAGS.KORA_LINK_ENABLED = false`

Questa sarà la landing pubblica per scansione NFC/QR. Il worker apre il link, viene autenticato, registra la partecipazione all'iniziativa. Nessuna identità esposta nel token. Dettagli in §13.

---

## 4. Roles and Access Model

### Ruoli attivi

| Ruolo | Workspace | Claims |
|---|---|---|
| `KORA_ADMIN` | `/admin/*` | `kora_role = KORA_ADMIN` |
| `COMPANY_ADMIN` | `/company/*` | `kora_role = COMPANY_ADMIN`, `kora_tenant_id` |
| `WORKER` | `/worker/*`, `/my-kora/*` | `kora_role = WORKER`, `kora_worker_id`, `kora_tenant_id` |
| `PARTNER` | `/partner/*` | `kora_role = PARTNER`, `kora_partner_id` |
| `DEMO_VIEWER` | Route limitate | `kora_role = DEMO_VIEWER` |

> `COMPANY_VIEWER` era un ruolo pianificato, rimosso in B143 — non esiste nel codebase attuale.

### Claims e Tenant Isolation

Custom claims in `app_metadata` (Supabase JWT):

```json
{
  "kora_role": "COMPANY_ADMIN",
  "kora_tenant_id": "uuid-del-tenant",
  "kora_worker_id": null
}
```

Claims impostati da `003_claim_functions_app_metadata.sql` via trigger o funzione SQL. RLS legge `auth.jwt()->'app_metadata'->>'kora_tenant_id'` per tenant isolation automatica.

**Tenant isolation:** ogni tabella multi-tenant ha `tenant_id` con policy RLS `tenant_id = auth.jwt()->'app_metadata'->>'kora_tenant_id'`. Un COMPANY_ADMIN non può mai vedere dati di un altro tenant — enforced da Supabase, non solo da applicativo.

**Worker isolation:** schema `personal.*` ha RLS `auth_user_id = auth.uid()`. Un worker vede solo i propri dati — enforced a livello DB.

### Access Matrix

**File:** `lib/auth/access-matrix.ts`

`canAccess(role, resource)` — funzione PURA:
- Nessun async, nessun DB call, nessun side effect
- Restituisce `AccessDecision { allowed, reason, variant? }`
- Fonte di autorità per tutto l'access control applicativo

Risorse canoniche:

| Resource | Descrizione |
|---|---|
| `company_kpi_kora_index` | KORA Index, activation, pillars, financial, reports |
| `aggregates_n_ge_10` | Aggregati anonimizzati N≥10 |
| `worker_individual_pib` | PIB per singolo worker — DENY per employer |
| `worker_individual_uef` | UEF per singolo worker — DENY per employer |
| `personal_pseudonym_map` | Tabella più sensibile — DENY anche per KORA_ADMIN via route |
| `hq_operator_console` | Pannello operativo KORA |

### Confini Privacy

**Employer roles MAY see:**
- KORA Index e 10 componenti (company level)
- Pillar distribution (company level)
- Activation rates (company level)
- Aggregati N≥10 per dipartimento/sede

**Employer roles MUST NEVER see:**
- PIB individuale, UEF individuale, dynamic CV
- worker_id, nome, identità in forma non pseudonimizzata
- Aggregati con N < 10 (safe_aggregation_threshold = 10)
- My KORA content (timeline, bookings, consent)

### Guard Implementation

| Layer | Implementazione |
|---|---|
| Middleware | `middleware.ts` — redirect per role, session refresh |
| Route level | `requireCompanyUser()`, `requireKoraAdmin()`, `getCurrentWorkerUser()` |
| Service level | `RolePermissionService.canAccess()`, `PrivacyVisibilityService.isSuppressed()` |
| DB level | RLS su tutti gli schemi sensibili |
| UI level | `PrivacyBoundaryNotice`, `AccessDeniedState` per soppressione visibile |

**Off-limits senza review:** `middleware.ts`, `lib/auth/`, `lib/supabase/*-service-key.ts`, qualsiasi RLS policy.

---

## 5. Supabase Architecture

### Client Types

```
lib/supabase/
├── server.ts                       ← SSR client (anon key + cookie session)
├── client.ts                       ← Browser client (anon key)
├── worker-provisioning-service-key.ts  ← Service-role: INSERT worker_identity only
├── impact-unit-service-key.ts          ← Service-role: SELECT analytics.impact_unit (no worker identity)
├── storage-service-key.ts              ← Service-role: storage operations
├── uef-service-key.ts                  ← Service-role: UEF pipeline writes
├── auth-admin-update-user.ts           ← Auth Admin API: updateUserById
└── types.ts                        ← Database types (generato da Supabase CLI)
```

**Principio:** nessun service-role client è "generico". Ogni client ha scope documentato in codice e bypass RLS limitato alla propria operazione. La doctrine è applicata in codice, non solo via Supabase dashboard.

### Schemi DB

| Schema | Contenuto | RLS |
|---|---|---|
| `public` | `tenant`, `source_batch`, `uploaded_record`, `partner_*` | ✓ |
| `personal` | `worker_identity`, `worker_pib`, `worker_pseudonym_map`, `worker_initiative`, ... | ✓ (più restrittivo — `auth_user_id = auth.uid()`) |
| `analytics` | `uef_record`, `impact_unit` | ✓ (SECURITY DEFINER post-mig 030/031) |
| `commons` | `initiative`, `post`, `contribution_event`, `initiative_adoption` | ✓ |
| `gov` | **ESCLUSO** — `kip_records` non va mai creato (CLAUDE.md red line) | — |

### Migration Status

| Numero | Area | Posizione | Note |
|---|---|---|---|
| 001–006 | Foundation, grants, claims, IU trace, tenant key | `migrations/` | Base infrastruttura |
| 007–012 | Worker provisioning/initiatives/onboarding, partner | `migrations/` | Worker + partner layer |
| 013–016 | Commons, tenant classification, safe aggregation, initiative source | `migrations/` | Commons + aggregation |
| 017–020 | Pseudonym map, PIB, bridge UEF↔initiative, PIB RPC | `migrations/` | Privacy layer |
| 021–028 | Pilot ready, RLS gaps ×2, audit log, onboarding, commons fields, contribution source | `migrations/` | Hardening + contribution |
| 030–031 | UEF admin hardening, revoke DEFINER execute | `migrations/` | Security hardening |
| 032 | Contribution atomic attribution | `proposed/` | READY_FOR_REVIEW |
| 033 | Initiative adoption source model | `proposed/` | READY_FOR_REVIEW |

**Nota:** mig 029 esiste solo come `rollback/029_rollback_027_if_needed.sql` — rinumerazione nel processo di review.

### Staging vs Production

| Variabile | `.env.local` | `.env.staging.local` |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `haqf****` (staging — dopo CC-00C) | `haqf****` (staging) |
| `SUPABASE_SERVICE_ROLE_KEY` | staging key (dopo CC-00C) | staging key |

**Regola:** `.env.local` deve sempre puntare a staging durante sviluppo. Il backup production (`azdn****`) è in `.env.production.local.backup` (gitignored). **Non usare mai `azdn****` per sviluppo, test o CLI.** Vedere `docs/ENVIRONMENT_SAFETY_CHECK.md`.

---

## 6. KORA Engine Architecture

**Path:** `lib/kora-engine/` — 24 moduli TypeScript

### Pipeline 14-Stage (da `run-kora-pipeline.ts`)

```
RawUploadedRecord[]
  → [1] Eligibility Gate        (eligibility-gate.ts)
  → [2] Pillar Mapping           (pillar-mapping.ts)
  → [3] Care Economy Mapping     (care-economy-mapping.ts)
  → [4] Budget Evidence          (budget-evidence.ts)
  → [5] Reach Signals            (reach-quality.ts → AR, MAR)
  → [6] Quality Signals          (reach-quality.ts → EVQ, INT, CONT)
  → [7] BTI Engine               (bti-engine.ts)
  → [8] Activation Engine        (activation-engine.ts)
  → [9] Equity Engine            (equity-engine.ts → EQW, EQS, PC, PB)
  → [10] PIB Aggregation         (lib/kora-engine/types.ts)
  → [11] KORA Index              (kora-index-engine.ts → component-engine.ts)
  → [12] Confidence              (confidence-engine.ts → monte-carlo-engine.ts)
  → [13] Explainability          (explainability.ts)
  → KoraIndexResult + ConfidenceResult + ExplainabilityTrace
```

### Moduli principali

| Modulo | Funzione |
|---|---|
| `run-kora-pipeline.ts` | Orchestratore — entry point per `LiveScoringAdapter` |
| `kora-index-engine.ts` | Calcolo KORA Index v3 (10 componenti, 4 macroblocchi) |
| `component-engine.ts` | Singolo componente: valore, peso, macroblocco |
| `activation-engine.ts` | AR, MAR — share lavoratori con IU approvati |
| `equity-engine.ts` | EQW (Gini-based), EQS (segmenti), PC, PB |
| `reach-quality.ts` | EVQ, INT, CONT |
| `bti-engine.ts` | BTI — Budget-to-Human-Impact ratio |
| `confidence-engine.ts` + `monte-carlo-engine.ts` | CS — Confidence Score con simulazione |
| `eligibility-gate.ts` | Filtra record non eligibili dalla pipeline |
| `pillar-mapping.ts` | Assegna pillar (LIFE/GROWTH/CONNECTION/IMPACT/LEGACY) |
| `contribution-family-detector.ts` | BCM taxonomy per KORA Contribution |
| `explainability.ts` | Trace spiegabile per ogni IU |

### Pesi Metodologici

**Mai hardcoded.** Letti da `lib/methodology-config/v0.1.ts` che carica `data/methodology/methodology-config.json`:

```typescript
getMacroblockWeights()            // REACH 25%, QUALITY 30%, EQUITY 25%, BTI 20%
getAllComponentEffectiveWeights()  // pesi effettivi per i 10 componenti
getMethodologyVersion()           // "KORA Methodology v0.1"
getCalibrationStatus()            // "pre_empirical_calibration"
```

`getComponentWeights()` (vecchio metodo equal-weight 10×10%) è **deprecated e throws** — impedisce uso accidentale di pesi provvisori.

### Scoring Path

```
useScoringResult()              ← canale canonico (lib/scoring-result/index.ts)
    ↓
    ├── DEMO   → DemoScoringAdapter    → ScoringSimulatorService (seed sintetici)
    ├── PREVIEW→ PreviewScoringAdapter → DynamicScoringPreviewService (proxy, non authoritative)
    └── LIVE   → LiveScoringAdapter   → run-kora-pipeline (authoritative)
```

Routing automatico via `useEnvironment()`. **Mai importare ScoringSimulatorService o run-kora-pipeline direttamente nei componenti** — bypasserebbe il boundary demo/live.

### Asset tecnico

- 8.079 test verdi su 191 file — rigore metodologico verificabile
- "Never throws" invariant — `insufficient_data` invece di crash
- Real tenants mai fallback a seed sintetico
- Input validation pipeline (eligibility gate)
- Monte Carlo su Confidence Score — stima intervallo di confidenza, non solo valore puntuale

---

## 7. Data Flow: KORA Index

```
Company uploads CSV/Excel
    ↓ POST /api/company/data-submissions
    ↓ POST /api/admin/data-intake/accept
Uploaded Records (public.uploaded_record)
    ↓ admin/uef-review → POST /api/admin/uef/review
UEF Records (analytics.uef_record)
    ↓ POST /api/admin/scoring/run-approved-batch
KORA Pipeline (lib/kora-engine/run-kora-pipeline.ts)
    ↓ LiveScoringAdapter
    ↓ 14 stage: eligibility → pillar → reach → quality → equity → BTI → activation → PIB agg → KORA Index → confidence → explainability
KoraIndexResult (lib/types)
    ↓ lib/live/scoring-mapper.ts → mapping DB row → ScoringResult
    ↓ useScoringResult() → company pages
    ↓
    ├── /company/kora-index (10 componenti, CS, Safeguard)
    ├── /company/activation (AR, MAR)
    ├── /company/pillars (distribuzione pillar)
    ├── /company/financial (BTI Score)
    └── /company/reports (Decision Pack PDF)
```

**Input:** `RawUploadedRecord[]` — record da upload azienda
**Output:** `KoraIndexOutput` (index + 10 componenti + CS + Safeguard) + `CompanyAggregateExtended` + `ConfidenceRecord`
**Live path:** `LiveScoringAdapter → run-kora-pipeline` — authoritative, no fallback sintetico
**Demo path:** `DemoScoringAdapter → ScoringSimulatorService` — legge `data/synthetic/kora-index-outputs.json`
**Rischio:** pipeline è live su staging — errori nel UEF Review step possono impattare tutti i record approvati

---

## 8. Data Flow: Worker PIB

```
Worker attivazione (iniziative, eventi, partecipazioni)
    ↓ analytics.uef_record (per-event UEF)
    ↓ lib/kora-engine/ → IU computation per evento per pillar
    ↓ IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
    ↓
personal.worker_pib (per-worker aggregato — schema separato)
    ↓ WorkerPIBService.getPIBLive(supabase, period)
    ↓ /api/worker/pib (WORKER-only)
    ↓
    ├── /my-kora/personal-impact-balance (worker self-only)
    └── /worker/dynamic-cv (worker self-only)
```

**Privacy boundary hardcoded:**
- `not_employer_visible: true` in `WorkerPIBService`
- Route `/api/worker/pib` → `requireWorkerUser()` — WORKER JWT only
- RLS su `personal.worker_pib` → `auth_user_id = auth.uid()`
- KORA_ADMIN preview usa solo dati sintetici (`getPIB()` sincrono)

**Stato staging:** `personal.worker_pib` deve essere popolato da scoring run su staging per avere dati PIB live. Lo stato effettivo non è verificabile senza connessione DB.

**KORA Link Modalità A (futuro):** scan NFC/QR da lavoratore a evento accreditato L4 → nuovo UEF record → entra nella stessa pipeline → aggiorna PIB e KORA Index.

---

## 9. Data Flow: KORA Space → Contribution

```
KORA Commons (commons.initiative, commons.post)
    ↓ CommonsService.getInitiatives() / getPublishedInitiatives()
    ↓ Worker vede iniziative disponibili (KORA Space)
    ↓
Worker booking inline
    ↓ POST /api/worker/commons/bookings { post_id } (JWT — identità risolta server-side)
    ↓ commons.contribution_event (mig 025)
    ↓ [post 032] atomic attribution function
    ↓ [post 033] initiative_adoption source model
    ↓
KORA Contribution Service (KoraContributionService)
    ↓ getContributionPromoterView / getContributionOriginEmployerView
    ↓
/company/contribution (COMPANY_ADMIN — aggregati ONLY)
    ↓ Promoter view: iniziative che il tenant ha promosso
    ↓ Origin employer view: partecipazioni aggregate dal proprio tenant
```

**Invarianti architetturali:**
- KORA Contribution è companion indicator — **mai** componente del KORA Index
- Output employer = solo aggregati (mai legame worker↔iniziativa)
- `is_kora_index_component: false` marcato nel seed e nel service
- Nessun ranking individuale, nessun confronto tra lavoratori

**KORA Link Modalità B (futuro):** scan QR a evento collettivo/mentorship → attribution in `contribution_event` (mig 025) via source model adoption (mig 033) → KORA Contribution score.

---

## 10. Decision Pack and Reporting

**Path:** `app/company/reports/`, `app/api/company/decision-pack/`, `services/report-generator/`, `services/report-factory/`

**Cosa esiste:**

| Componente | Stato | Note |
|---|---|---|
| Decision Pack UI | LIVE | KI + CS + Safeguard + ComponentBreakdown + NormativeMapping |
| PDF generation | LIVE | `POST /api/company/decision-pack/pdf` + admin variant |
| Preview scoring | PREVIEW | `DynamicScoringPreviewService` — proxy non authoritative, labellato "stima proxy" |
| ReportGeneratorService | LIVE | Genera sezioni report da scoring live |
| NormativeMappingLight | LIVE | Mapping CSR/ESG — con disclaimer obbligatorio |

**Input:** `ScoringResult` (via `useScoringResult()`) — live per tenant autenticati.

**Output:** board-grade report con KORA Index value, 10 componenti, CS, Safeguard status, explainability, normative mapping.

**Invariante display (CLAUDE.md §6):** ogni superficie KORA Index deve mostrare:
- KORA Index value
- Confidence Score (CS)
- Activation Safeguard (CLEAR/WARNING/FLAGGED)
- `methodology_version_id`
- `calibration_status = "pre_empirical_calibration"` — non sopprimibile
- 10-component breakdown

**Readiness demo:** ALTA — Decision Pack PDF è il documento più presentabile a investitori/board.

**Cosa manca:** disclaimer `calibration_status` nel PDF export (presente in UI, da verificare nel template PDF).

---

## 11. Demo / Live / Mock Boundary

| Area | Path principale | Stato | Dati | Mostrabile clienti | Mostrabile investitori | Azione |
|---|---|---|---|---|---|---|
| Company Workspace | `/company/workspace` | LIVE | Reali | ✓ | ✓ | — |
| KORA Index | `/company/kora-index` | LIVE | Reali | ✓ | ✓ | — |
| Activation / Pillars | `/company/activation` | LIVE | Reali | ✓ | ✓ | — |
| Financial / BTI | `/company/financial` | LIVE (parziale) | Reali | ✓ (BTI) | ✓ (BTI) | Completare Financial Intelligence |
| Decision Pack | `/company/reports` | LIVE | Reali | ✓ | ✓ | — |
| Worker Workspace | `/worker/workspace` | LIVE | Reali | ✓ | ✓ | — |
| Worker PIB | `/my-kora/personal-impact-balance` | LIVE-AWARE | Reali/Sintetici | ✓ (guidata) | ✓ | Verificare dati staging |
| KORA Space | `/my-kora/kora-space` | LIVE-AWARE | Reali/Sintetici | ✓ (guidata) | ✓ | — |
| Dynamic CV | `/worker/dynamic-cv` | LIVE-AWARE | Reali/Sintetici | ✓ (guidata) | ✓ | — |
| Admin Company Console | `/admin/companies` | LIVE | Reali | ✓ (KORA staff) | ✓ | — |
| Trial Control Center | `/admin/trial-control-center` | LIVE | Reali | ✓ (KORA staff) | ✓ | — |
| Contribution | `/company/contribution` | LIVE/SHELL | Reali/— | ✓ (tenant pronto) | ✓ | Applicare 032/033 |
| Company Onboarding | `/company/onboarding` | LOCKED-SHELL | — | ✗ | ✗ | Rimuovere o completare |
| Opportunities | `/company/opportunities` `/worker/opportunities` | LOCKED-SHELL | — | ✗ | ✗ | Rimuovere o roadmap date |
| Future Vision | `/demo/future-vision` | MOCKUP | — | Solo con disclaimer | Solo come roadmap | Mantenere label chiara |
| Demo Network | `/demo/network` | MOCKUP | — | No | Solo roadmap | Aggiungere disclaimer esplicito |
| Demo AI Onboarding | `/demo/ai-onboarding` | MOCKUP | — | No | No | Non mostrare |
| Partner Workspace | `/partner/workspace` | LIVE (parziale) | Reali | ✓ (limitato) | ✓ | Comunicare "prossimamente" |
| KORA Link | (non implementato) | OFF (`FEATURE_FLAGS`) | — | No | Come roadmap | Implementare in `feat/kora-link-v1` |

---

## 12. Technical Quality and Guardrails

### Asset di qualità

| Check | Stato | Dettaglio |
|---|---|---|
| TypeScript strict | ✓ VERDE | `tsc --noEmit` clean, zero errori |
| Test suite | ✓ VERDE | 8.079/8.079, 191 file, ~4s |
| Build Next.js | ✓ VERDE | 161 route, 7.3s, nessun errore TS |
| Service-role scoped | ✓ VERDE | 5 client specializzati, scope documentato in codice |
| Feature flags | ✓ VERDE | `KORA_LINK_ENABLED=false` — default OFF |
| Pesi metodologici | ✓ VERDE | Mai hardcoded — `lib/methodology-config/v0.1.ts` |
| Privacy triple protection | ✓ VERDE | RLS + service layer + middleware |

### Debiti tecnici (non bloccanti oggi, bloccanti per Gate 3)

| Debito | Severità | File principali | Azione |
|---|---|---|---|
| ESLint 118 errori (88 warning) | MEDIA | 107 file, 66 runtime | Target: <20 errori pre-pilot |
| 8× `setState in useEffect` | MEDIA | `Sidebar.tsx:306`, `kora-space/page.tsx`, 6 altri | Rischio render loop con dati live reali |
| 3× `cannot create components during render` | MEDIA | `kora-space/page.tsx:340,524,565` | Violazione React Compiler |
| Zero test E2E | ALTA | — nessun Playwright — | Aggiungere golden path E2E prima di pilot |
| `no-explicit-any` ×70 | BASSA | Servizi e API route | Debito qualità, non funzionale |
| Migration 032/033 non promosse | ALTA | `supabase/proposed/` | Promuovere e applicare su staging |
| Dynamic CV sharing non attivo | MEDIA | `/worker/dynamic-cv` | Feature importante per adozione |

### Pattern da non copiare

- `as any` — diffuso in servizi. Aggiungendo nuovi servizi, tipizzare correttamente.
- `setState` in `useEffect` senza `cleanup` — porta a setState su componente smontato.
- Component definition dentro render — `const MyComp = () => ...` dentro un altro component.
- Import diretto di seed files in components — usare sempre il service layer.

---

## 13. KORA Link v1 Integration Architecture

> `FEATURE_FLAGS.KORA_LINK_ENABLED = false` — non implementato. Questo paragrafo è architettura futura.
> Branch di sviluppo: `feat/kora-link-v1`. Prossimo numero migration libero: **034**.

### Principi architetturali KORA Link

1. **Chip anonimi:** ogni chip/QR/NFC porta un token casuale — non contiene worker_id, nome, ruolo, o dati personali.
2. **Token lifecycle:** generato da KORA Admin, associato a iniziativa + periodo temporale, non riutilizzabile oltre la finestra.
3. **Nessuna identità nel URL:** `/link/[token]` — il token è opaco, risolto server-side.
4. **Consenso esplicito:** prima attivazione richiede consenso worker (Gate 3 prerequisito).
5. **Audit:** ogni scan produce un audit log entry con device-class pseudonimizzato (no geolocalizzazione individuale).
6. **Asimmetria ruoli:** worker vede la propria attivazione; company vede solo aggregati.

### Due Modalità

**Modalità A — Evento Accreditato (Partner L4)**
```
Scan NFC/QR → /link/[token] → risoluzione server-side token
    → verifica partner accreditato (EV Level 4)
    → crea UEF record (analytics.uef_record) con source_type = 'kora_link'
    → pipeline IU → Worker PIB → KORA Index
```
- Partner accreditation a tempo (scadenza configurabile da Admin)
- EV = 0.90–1.00 (massima evidenza fisica verificata)
- No double counting: `uq_contribution_external` a 5 colonne (mig 025 M025-7) previene duplicati

**Modalità B — Collettivo / Mentorship / Cross-company**
```
Scan NFC/QR → /link/[token] → risoluzione server-side token
    → verifica iniziativa collettiva (commons.initiative)
    → crea contribution_event (commons.contribution_event) via mig 025 SECURITY DEFINER
    → initiative_adoption (commons.initiative_adoption) via mig 033
    → KORA Contribution score (companion indicator — mai KORA Index)
```

### Integration Points

| Integrazione | Path probabile | Dipendenza | Rischio | Review |
|---|---|---|---|---|
| Worker activation (Modalità A) | `app/api/worker/activation-profile/`, `analytics.uef_record` | Mig 025 applicata | ALTO — nuovo UEF source_type | SÌ |
| Public link handler | `app/link/[token]/` (nuovo) | Token service (034+) | MEDIO — deep link autenticato | SÌ |
| KORA Space booking | `POST /api/worker/commons/bookings` | Nessuna nuova | BASSO | NO |
| Partner accreditation | `app/api/admin/partners/[id]/status/` | Mig 012 (partner_identity) | MEDIO — nuovo trust tier | SÌ |
| Contribution (Modalità B) | `commons.contribution_event` | Mig 032+033 applicati | ALTO — source model adoption | SÌ |
| Audit log | `lib/audit/log-access.ts` | Mig 028 | MEDIO — device identifier GDPR | SÌ |
| Privacy boundary | `lib/auth/access-matrix.ts`, `PrivacyVisibilityService` | Esistente | ALTO — DPIA obbligatoria | SÌ |
| Worker PIB (Modalità A) | `services/worker-pib/WorkerPIBService` | `personal.worker_pib` | BASSO — pipeline già estensibile | NO |
| Company KORA Index | `lib/kora-engine/run-kora-pipeline.ts` | LiveScoringAdapter | BASSO — nuovo source_type enum | NO |
| Advisor audit | `services/advisor-evidence-review/` | Esistente | MEDIO — nuova fonte UEF | SÌ |

### Migration Plan KORA Link

```
034_kora_link_token_registry.sql      ← token lifecycle, partner accreditation tier
035_kora_link_audit_events.sql        ← scan events pseudonimizzati
036_kora_link_consent_layer.sql       ← worker consent per scan (Gate 3 prerequisito)
```

> I numeri 032 e 033 sono già occupati da Contribution source layer. KORA Link parte da 034.

---

## 14. Off-Limits Areas

Le seguenti aree **non devono essere modificate** da un dev junior o da Claude Code senza review tecnica esplicita del CTO o del team di sicurezza:

| Area | Path | Motivo |
|---|---|---|
| **RLS** | `supabase/migrations/` (qualsiasi policy) | Errori RLS espongono dati cross-tenant o worker individuali |
| **Migration production** | `supabase/migrations/` + `supabase/proposed/` | Apply su DB reale è irreversibile senza rollback |
| **Service-role clients** | `lib/supabase/*-service-key.ts` | Bypass RLS — scope documentato non va alterato |
| **Auth session** | `lib/auth/kora-session.ts` | Errori rompono auth per tutti i ruoli |
| **Middleware auth** | `middleware.ts` | Errori bloccano accesso a tutta la piattaforma |
| **Access matrix** | `lib/auth/access-matrix.ts` | Fonte di autorità — modifica non testata rompe privacy boundary |
| **Personal / PII schema** | `supabase/migrations/017-018` (pseudonym_map, pib) | Tabelle più sensibili del sistema |
| **Worker provisioning** | `lib/supabase/worker-provisioning-service-key.ts` | Service-role su worker_identity |
| **KORA Index scoring** | `lib/kora-engine/`, `lib/methodology-config/` | Modifiche ai pesi o alla pipeline alterano i punteggi per tutti i tenant |
| **Partner EV resolver** | `services/advisor-evidence-review/`, `lib/kora-engine/eligibility-gate.ts` | Impatta Evidence Value nelle IU — effetto cascata su KORA Index |
| **Audit log** | `lib/audit/log-access.ts`, `supabase/migrations/028` | Audit log deve essere append-only e integro |

---

## 15. Investor / CTO Technical Narrative

### Cosa dimostra maturità tecnica

- **KORA Engine** — 24 moduli TypeScript, pipeline 14-stage, zero hardcoding metodologico. Un revisore tecnico può aprire `lib/kora-engine/run-kora-pipeline.ts` e tracciare ogni fase dell'algoritmo.
- **Test suite** — 8.079 test verdi su 191 file, eseguibili in 4 secondi. Non sono test di facciata: coprono privacy boundaries, PII guard, scoring pipeline, tenant isolation, route boundaries, worker PIB privacy.
- **Access matrix pura** — `canAccess()` è una funzione senza side effect. È auditabile, testabile, swappabile. Non dipende da Supabase in produzione.
- **Service-role scoped** — cinque client service-role, ciascuno con scope documentato in codice. Non esiste un "bypass RLS generico".
- **30 migration SQL** — con rollback per le ultime tre. Mostra un processo di sviluppo DB rigoroso, non SQL sparso.
- **`calibration_status = pre_empirical_calibration`** su ogni output — onestà metodologica che protegge l'azienda da claim non supportati.
- **CLAUDE.md** — costituzione tecnica del progetto, non negoziabile. Mostra governance tecnica — raro in un early-stage.
- **`IScoringService`** — tre adapter (DEMO/PREVIEW/LIVE) con interfaccia comune. Il motore è testabile in isolamento, mockabile, sostituibile senza toccare i componenti UI.

### Cosa va ammesso come debito tecnico

- ESLint 118 errori — non causano crash, ma indicano un periodo di sviluppo veloce. I pattern anti-React (`setState in useEffect`) devono essere corretti prima di dati reali ad alto volume.
- Zero test E2E — la UI non è smoke-testata in browser. Ogni release è validata solo con unit test e build check.
- Dynamic CV sharing non attivo — feature di valore per l'utente worker, incompleta.
- Migration 032/033 non ancora su staging — KORA Contribution v2 non è end-to-end verificata.
- Financial Intelligence avanzata parziale — mostra BTI score ma non il breakdown completo.

### Perché non serve un rewrite

- Il core algoritmico (KORA Engine) è il prodotto. Riscriverlo significa riperdere 30+ settimane di lavoro metodologico, perder la copertura di 8.000 test, e ricominciare da zero sulla gestione dei casi edge (eligibility, AGF=0, insufficient_data).
- L'architettura di sicurezza (RLS, claims, service-role scoped) è matura e può essere estesa senza demolire.
- Il pattern DEMO/LIVE è corretto — demo e live path sono separati, non mescolati. Aggiungere un tenant live non richiede modifiche architetturali.
- I debiti sono localizzati (ESLint, E2E, shell pages) — non sono debiti strutturali.

### Perché serve consolidation

- Chiudere le migration 032/033 su staging e verificare la pipeline Contribution end-to-end.
- Correggere gli 8 anti-pattern React prima di dati live ad alto volume.
- Aggiungere test E2E sui golden path prima del pilot reale.
- Rimuovere o completare le shell pages che danneggiano la credibilità in demo non guidata.
- Privacy impact assessment per KORA Link prima di Gate 3.

---

## 16. Next 90-Day Architecture Roadmap

### P0 — Environment & Foundation (Settimane 1–3)

| Azione | Area | Priorità |
|---|---|---|
| Verificare che `.env.local` → staging per tutto il team | `docs/ENVIRONMENT_SAFETY_CHECK.md` | BLOCCANTE |
| Promuovere mig 032 da `proposed/` a `migrations/` | `supabase/proposed/ → migrations/` | ALTA |
| Applicare mig 025, 032, 033 su staging | `supabase db push` (.env.staging.local) | ALTA |
| Smoke test post-migration staging | Tests manuali + vitest | ALTA |
| Verificare PIB live su staging (dati in `personal.worker_pib`) | Staging console | ALTA |
| Route auth matrix review — nessun path worker accessibile da employer | `lib/auth/access-matrix.ts` | BLOCCANTE |

### P1 — Quality & Hardening (Settimane 4–8)

| Azione | Area | Priorità |
|---|---|---|
| Correggere 8 `setState in useEffect` | `Sidebar.tsx`, `kora-space/page.tsx`, 6 altri | ALTA |
| Correggere 3 `cannot create components during render` | `kora-space/page.tsx:340,524,565` | ALTA |
| ESLint: target <20 errori (da 118) | Tutti i file runtime | MEDIA |
| Aggiungere test E2E Playwright: company login → KORA Index | `tests/e2e/` (nuovo) | ALTA |
| Aggiungere test E2E Playwright: worker login → KORA Space + booking | `tests/e2e/` (nuovo) | ALTA |
| Rimuovere o completare shell pages (Opportunities, Onboarding) | `app/company/`, `app/worker/` | MEDIA |
| Completare Financial Intelligence avanzata | `app/company/financial/` | MEDIA |
| KORA Link: design token table e consent schema (mig 034, 035, 036) | `supabase/proposed/` | MEDIA |
| Partner accreditation tier design | `services/advisor-evidence-review/` | MEDIA |

### P2 — Real Data Readiness (Settimane 9–13+)

| Azione | Area | Prerequisito |
|---|---|---|
| DPIA (Data Protection Impact Assessment) | Legal + privacy | Gate 3 |
| Privacy impact assessment KORA Link | Legal + arch | DPIA |
| Pen-test su staging | External security | P0+P1 |
| CTO / security architecture review | External | P0+P1 |
| Client pilot — primi tenant reali | Produzione | Gate 3 chiuso |
| Gate 3 close checklist | `docs/21-founder-gate-resolution-log.md` | DPIA + pen-test |
| Migrazione `.env.local` production (`azdn****`) verso env separato CTO | Governance | P0 |

---

*Documento operativo — non teorico. Ogni sezione è verificabile leggendo il codice.*
*Vedere anche: `docs/KORA_PLATFORM_INVENTORY.md` (CC-02), `docs/BASELINE_STATUS.md` (CC-00), `docs/ENVIRONMENT_SAFETY_CHECK.md` (CC-00B/CC-00C), `CTO_REVIEW_KORA_CONTRIBUTION_SOURCE_LAYER.md`.*
