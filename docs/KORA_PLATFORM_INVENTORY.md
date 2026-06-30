# KORA Platform Inventory (CC-02)

**Data:** 2026-06-30
**Branch:** `docs/consolidation`
**Commit:** `f985fe2` (CC-01) / `eaecdad` (value-freeze-v1)
**Ambiente:** staging `haqf****` — nessun dato reale, nessuna connessione DB effettuata per questo documento
**Scopo:** fotografia oggettiva della piattaforma per CTO, investitori, clienti, team esterno.

> **Nota metodologica:** questo inventario è stato costruito leggendo solo codice, commenti e struttura del repository — nessuna connessione a Supabase, nessuna query. Alcune valutazioni "LIVE" si basano su page comments e service imports, non su smoke test in ambiente staging.

---

## Legenda

| Stato | Significato |
|---|---|
| **LIVE** | Supabase-backed, sessione reale richiesta, dati dal DB |
| **PREVIEW** | Parzialmente live, approssimazioni o subset di dati |
| **DEMO-ONLY** | Dati sintetici da `/data/synthetic/`, nessun DB |
| **LOCKED-SHELL** | UI presente, logica non attiva, placeholder esplicito |
| **MOCKUP** | Static screen, nessun backend, Future Vision |

---

## 1. Admin Area

**Path principali:** `app/admin/`, `app/api/admin/`

### Cosa esiste

- **Company Console** (`/admin/companies`) — lista live di tutti i tenant via `requireKoraAdmin()` + Supabase. Vista operativa per KORA_ADMIN: stato pipeline, readiness, next action.
- **Trial Control Center** (`/admin/trial-control-center`) — hub di orchestrazione read-only. Mostra per-tenant: pipeline status, worker state, iniziative, partner catalog, checklist demo.
- **Worker Provisioning** (`/admin/workers/provision`) — live: crea worker_identity via service-role scoped client.
- **Company Provisioning** (`/api/admin/companies/provision`) — live: crea tenant + auth user.
- **UEF Review** (`/admin/uef-review`) — live: KORA_ADMIN rivede eventi UEF proposti prima dell'approvazione.
- **Data Intake** (`/admin/data-intake`) — live: accettazione/rifiuto batch dati caricati da aziende.
- **Data Lifecycle** (`/admin/data-lifecycle`) — live: archivio, eliminazione, governance ciclo dati.
- **Impact Units Explorer** (`/admin/impact-units`) — live: monitoraggio IU approvate per pipeline.
- **Live Spine Diagnostics** (`/admin/live-spine-diagnostics`) — live: verifica integrità spine KORA.
- **Founder Validation** (`/admin/founder-validation`) — demo-only: lista lead di validazione sintetici.
- **Admin Demo Preview** (`/admin/preview`) — demo-only: preview workspace come se fossero worker/company.
- **Operator Console** (`/admin/operator`) — live: console operativa KORA_ADMIN.

### Stato complessivo

**Prevalentemente LIVE** per funzioni operative core. Demo-only solo per preview e founder-validation.

| Area | Stato | Dati |
|---|---|---|
| Company Console | LIVE | Reali (staging) |
| Worker Provisioning | LIVE | Reali (staging) |
| Trial Control Center | LIVE | Reali (staging) |
| UEF Review | LIVE | Reali (staging) |
| Data Intake / Lifecycle | LIVE | Reali (staging) |
| Impact Units Explorer | LIVE | Reali (staging) |
| Founder Validation | DEMO-ONLY | Sintetici |
| Admin Preview | DEMO-ONLY | Sintetici |

**Ruoli:** `KORA_ADMIN`
**Rischio tecnico:** ALTO — area privilegiata, service-role key in uso, errori qui impattano tutti i tenant.
**Rischio privacy:** MEDIO — nessun dato worker individuale (salvo diagnostics, cui si accede con audit log).
**Valore demo:** ALTO — dimostra la pipeline operativa completa.
**Valore CTO/investitore:** ALTO — prova che esiste un layer admin reale, non solo UI.

---

## 2. Company Area

**Path principali:** `app/company/`, `app/api/company/`

### Cosa esiste

- **Workspace** (`/company/workspace`) — LIVE: entry point autenticato per tenant reali. `requireCompanyUser()` + SessionBar.
- **KORA Index** (`/company/kora-index`) — LIVE-only: scomposizione analitica completa del KORA Index. Richiede sessione. Senza sessione → `NoDataState`. **Zero dati sintetici su path live.**
- **Activation** (`/company/activation`) — LIVE: tasso di attivazione e distribuzione pillar reali.
- **Pillars** (`/company/pillars`) — LIVE: breakdown per pillar da scoring live.
- **Financial / BTI** (`/company/financial`) — LIVE (parziale): mostra BTI Score dal KORA Index live. Financial Intelligence dettagliata non ancora disponibile.
- **Reports / Decision Pack** (`/company/reports`) — LIVE: board report con KI, CS, Safeguard, Component Breakdown. PDF generation via `/api/company/decision-pack/pdf`.
- **Status Center** (`/company/status`) — LIVE: readiness + submission tracking.
- **Data** (`/company/data`) — LIVE: qualità dati, stato pipeline.
- **Data Submissions** (`/api/company/data-submissions/*`) — LIVE: upload, review, submit workflow.
- **Contribution** (`/company/contribution`) — LIVE/SHELL: dashboard reale per tenant `production_ready=true`; shell per Foundation Light standard.
- **Commons** (`/company/commons`) — LIVE: KORA Commons company-side, post moderati, privacy-safe.
- **Onboarding** (`/company/onboarding`) — LOCKED-SHELL: il provisioning avviene via Admin, non via demo flow.
- **Opportunities** (`/company/opportunities`) — LOCKED-SHELL: modulo non ancora attivo.
- **Wallboard** (`/company/wallboard`) — LIVE: KORA Wallboard display live.
- **Profile** (`/company/profile`) — LIVE: profilo tenant.

### Stato complessivo

**Prevalentemente LIVE** su path autenticato. Senza sessione → `NoDataState` su tutte le pagine intelligence, mai fallback a dati sintetici.

| Area | Stato | Dati |
|---|---|---|
| Workspace | LIVE | Reali |
| KORA Index | LIVE | Reali |
| Activation / Pillars | LIVE | Reali |
| Financial / BTI | LIVE (parziale) | Reali |
| Reports / Decision Pack | LIVE | Reali |
| Status / Data | LIVE | Reali |
| Contribution | LIVE/SHELL | Reali / — |
| Commons | LIVE | Reali |
| Onboarding | LOCKED-SHELL | — |
| Opportunities | LOCKED-SHELL | — |

**Ruoli:** `COMPANY_ADMIN`
**Rischio tecnico:** MEDIO — path live con scoring reale, nessun fallback sintetico.
**Rischio privacy:** BASSO-MEDIO — nessun dato worker individuale; aggregati N≥10; safe_aggregation_threshold = 10.
**Valore demo:** ALTO — mostra il prodotto reale, non una simulazione.
**Valore CTO/investitore:** MOLTO ALTO — dimostra scoring live su dati reali.

---

## 3. Worker Area

**Path principali:** `app/worker/`, `app/api/worker/`

### Cosa esiste

- **Worker Workspace** (`/worker/workspace`) — LIVE: richiede `getCurrentWorkerUser()`. Carica iniziative, storico partecipazione, activation profile da Supabase service-role.
- **Dynamic CV** (`/worker/dynamic-cv`) — LIVE-AWARE: autenticazione via `/api/worker/dynamic-cv`. 401 → demo mode con label sintetica. 200 → dati live.
- **Opportunities** (`/worker/opportunities`) — PREVIEW/DEMO: partner catalog con messaggio "prossimamente", non attivo.
- **Privacy** (`/worker/privacy`) — LIVE-AWARE: impostazioni privacy worker via `/api/worker/privacy-settings`.
- **Commons** (`/worker/commons`) — LIVE: navigazione iniziative, booking inline.
- **Onboarding** (`/worker/onboarding`) — LIVE: flow onboarding per nuovi worker.

**Path My KORA** (`app/my-kora/`)

- **Personal Impact Balance** (`/my-kora/personal-impact-balance`) — LIVE-AWARE: PIB da `personal.worker_pib` via `getPIBLive()`. Demo label se non autenticato.
- **Dynamic CV** (`/my-kora/dynamic-cv`) — stesso pattern di `/worker/dynamic-cv`.
- **KORA Space** (`/my-kora/kora-space`) — LIVE-AWARE: four-state detection (checking/live/empty/demo). Iniziative, richieste, opportunità.
- **Bookings** (`/my-kora/bookings`) — LIVE-AWARE: bookings worker da Supabase.
- **Collective** (`/my-kora/collective`) — LIVE-AWARE: iniziative collettive.
- **Privacy** (`/my-kora/privacy`) — LIVE-AWARE: consent e sharing settings.

| Area | Stato | Dati |
|---|---|---|
| Worker Workspace | LIVE | Reali |
| Dynamic CV | LIVE-AWARE | Reali / Sintetici (label) |
| PIB | LIVE-AWARE | Reali / Sintetici (label) |
| KORA Space | LIVE-AWARE | Reali / Sintetici (label) |
| Bookings / Collective | LIVE-AWARE | Reali |
| Opportunities | LOCKED-SHELL | — |
| Privacy | LIVE-AWARE | Reali |

**Ruoli:** `WORKER`
**Rischio tecnico:** MEDIO — dual-mode detection richiede test su entrambi i path.
**Rischio privacy:** ALTO — area più sensibile. PIB e CV mai visibili a employer. Enforced a livello service, route, RLS.
**Valore demo:** ALTO — dimostra che il lavoratore ha un proprio spazio privato, non monitorato.

---

## 4. Worker Provisioning

**Path:** `app/api/admin/workers/provision`, `services/worker-provisioning/WorkerProvisioningService.ts`, `lib/supabase/worker-provisioning-service-key.ts`

**Stato:** LIVE — crea `personal.worker_identity` via service-role scoped (solo INSERT + UPDATE non-PII).

**Cosa funziona:**
- Provisioning worker da KORA Admin con email.
- Service-role client con scope limitato: nessuna lettura PIB, nessuna lettura pseudonym_map.
- `WorkerProvisioningService` (classe) → demo-only (roster sintetico). API route `/provision` → live.

**Rischio tecnico:** BASSO (ben separato, invariante enforced in codice).
**Rischio privacy:** BASSO (service-role scoped, no-PII invariant).

---

## 5. Company Onboarding / Setup

**Path:** `app/company/onboarding/`, `app/company/setup/`, `services/company-onboarding/`, `services/company-setup/`

**Stato:** LOCKED-SHELL — il provisioning avviene via Admin (`/api/admin/companies/provision`), non via form company-side.

La pagina `/company/onboarding` mostra un messaggio esplicito: "Il processo di onboarding live è gestito da KORA Admin."

**Setup password** (`/company/setup-password`) — LIVE: flow invite per nuovi COMPANY_ADMIN.

**Cosa manca:** form company-side per auto-onboarding (fuori scope Foundation Light).

---

## 6. Auth e Ruoli

**Path:** `lib/auth/`, `middleware.ts`, `app/auth/`, `app/login/`

### Implementato

- **`lib/auth/kora-session.ts`** — `requireKoraAdmin()`, `requireCompanyUser()`, `getCurrentWorkerUser()`, `requirePartnerUser()`. Basato su JWT Supabase con custom claims.
- **`lib/auth/access-matrix.ts`** — `canAccess(role, resource)` — funzione PURA, nessun async, nessun DB. Fonte di autorità per tutto l'access control.
- **Middleware** (`middleware.ts`) — Session refresh + redirect per role. COMPANY_ADMIN → `/company/workspace`. WORKER → `/worker/workspace`. KORA_ADMIN bloccato da `/worker/*`.
- **Custom claims** (`003_claim_functions_app_metadata.sql`) — `app_metadata.kora_role`, `kora_tenant_id`, `kora_worker_id`.
- **Auth callback** (`/auth/callback`) — PKCE flow per invite e reset password.
- **Forgot password / Reset password** — LIVE.
- **Login unificato** (`/login`) — LIVE.
- **Login company** (`/company/login`), **login worker** (`/worker/login`), **login admin** (`/admin/login`) — LIVE.

### Ruoli attivi

| Ruolo | Workspace | Stato |
|---|---|---|
| `KORA_ADMIN` | `/admin/*` | LIVE |
| `COMPANY_ADMIN` | `/company/*` | LIVE |
| `WORKER` | `/worker/*`, `/my-kora/*` | LIVE |
| `PARTNER` | `/partner/*` | LIVE (parziale) |
| `DEMO_VIEWER` | route limitate | LIVE (demo-only access) |

**Rischio tecnico:** BASSO — auth solidamente strutturata, role enforcement multi-layer.
**Rischio privacy:** BASSO — claims da server, nessun trust lato client.
**Cosa non va toccato:** `middleware.ts`, `lib/auth/kora-session.ts`, `lib/auth/access-matrix.ts` senza review tecnica.

---

## 7. Middleware

**File:** `middleware.ts`

**Stato:** LIVE — attivo su tutti i path.

**Funzioni:**
1. Refresh sessione Supabase SSR via `createServerClient`.
2. Redirect COMPANY_ADMIN fuori da `/company/*` → `/company/workspace`.
3. Redirect WORKER fuori da `/worker/*` → `/worker/workspace`.
4. KORA_ADMIN bloccato da `/worker/*` (defense in depth layer 1).

**`COMPANY_ALLOWED_PREFIXES`** — lista esplicita di path consentiti per COMPANY_ADMIN. Tutto il resto → redirect.

**Rischio tecnico:** ALTO — errori qui impattano tutti gli utenti. Robustness: "never throws — safe for Vercel deploys without env vars configured."

---

## 8. API Routes Principali

**Path:** `app/api/`

**Conteggio:** ~80 route handler (admin: ~45, company: ~12, worker: ~15, commons: ~4, auth: ~1).

### Admin API (selezionate)

| Route | Stato | Funzione |
|---|---|---|
| `POST /api/admin/companies/provision` | LIVE | Crea tenant + auth user |
| `POST /api/admin/workers/provision` | LIVE | Crea worker_identity |
| `GET /api/admin/tenants` | LIVE | Lista tenant |
| `POST /api/admin/uef/review` | LIVE | Approva/rifiuta UEF |
| `POST /api/admin/scoring/run-approved-batch` | LIVE | Lancia scoring run |
| `GET /api/admin/live-spine-diagnostics` | LIVE | Diagnostica spine |
| `GET /api/admin/worker-diagnostics` | LIVE | Diagnostica worker |
| `GET /api/admin/company-console` | LIVE | Company console data |
| `POST /api/admin/decision-pack/pdf` | LIVE | Genera PDF Decision Pack |
| `GET /api/admin/data-lifecycle` | LIVE | Lifecycle audit |

### Company API (selezionate)

| Route | Stato | Funzione |
|---|---|---|
| `GET /api/company/workspace` | LIVE | Dati workspace company |
| `GET /api/company/kora-index/history` | LIVE | Storico KORA Index |
| `GET /api/company/workers/aggregate` | LIVE | Aggregati N≥10 |
| `GET /api/company/contribution/live` | LIVE | KORA Contribution live |
| `POST /api/company/data-submissions` | LIVE | Crea submission dati |
| `GET /api/company/decision-pack` | LIVE | Decision Pack data |
| `GET /api/company/live-eligibility` | LIVE | Eligibility context live |

### Worker API (selezionate)

| Route | Stato | Funzione |
|---|---|---|
| `GET /api/worker/pib` | LIVE | PIB worker (WORKER-only) |
| `GET /api/worker/dynamic-cv` | LIVE | CV worker (WORKER-only) |
| `POST /api/worker/commons/bookings` | LIVE | Booking inline |
| `GET /api/worker/activation-profile` | LIVE | Profilo attivazione |
| `GET /api/worker/initiatives` | LIVE | Iniziative disponibili |
| `POST /api/worker/onboarding` | LIVE | Completa onboarding |
| `PATCH /api/worker/privacy-settings` | LIVE | Privacy settings |

**Rischio tecnico:** MEDIO — tutte le route admin usano service-role o claims-based auth.
**Rischio privacy:** MEDIO — API worker-individual sono WORKER-only, enforced server-side.

---

## 9. KORA Index

**Path:** `app/company/kora-index/`, `lib/scoring-result/`, `services/scoring-simulator/`, `services/scoring/`, `lib/kora-engine/`

### Tre scoring path

| Path | Adapter | Uso | Stato |
|---|---|---|---|
| DEMO | `DemoScoringAdapter` → `ScoringSimulatorService` | Demo tenant (dati sintetici) | DEMO-ONLY |
| PREVIEW | `PreviewScoringAdapter` → `DynamicScoringPreviewService` | Approssimazione proxy per Decision Pack preview | PREVIEW (non authoritative) |
| LIVE | `LiveScoringAdapter` → `run-kora-pipeline.ts` | Tenant reali, Foundation Light Pilot | LIVE / AUTHORITATIVE |

**`useScoringResult()`** — hook canonico. Instrada automaticamente su demo o live in base a `useEnvironment()`.

**Invarianti:**
- `LIVE` path mai fa fallback a seed sintetico.
- Pesi letti da `lib/methodology-config/v0.1.ts` — mai hardcoded.
- CS, `calibration_status`, `methodology_version_id` sempre presenti nell'output.
- Tutti e 10 i componenti sempre nel breakdown.

**Stato UI:**
- `KoraIndexHero`, `ComponentBreakdown`, `ActivationSafeguardPanel` — implementati.
- `ExplainabilityPanel`, `HeroDiagnosis`, `BoardActions` — implementati.
- Senza sessione live → `NoDataState` (mai dati sintetici su path live).

**Ruoli:** `COMPANY_ADMIN`, `KORA_ADMIN` (con audit log).
**Rischio tecnico:** BASSO — pipeline ben separata, tre adapter distinti.
**Valore CTO/investitore:** MOLTO ALTO.

---

## 10. KORA Engine

**Path:** `lib/kora-engine/`

### Moduli presenti (24 file)

| Modulo | Funzione |
|---|---|
| `run-kora-pipeline.ts` | Orchestratore completo 14-stage |
| `activation-engine.ts` | AR, MAR computation |
| `bti-engine.ts` | BTI computation |
| `component-engine.ts` | Calcolo 10 componenti KORA Index |
| `confidence-engine.ts` | Confidence Score |
| `equity-engine.ts` | EQW, EQS, PC, PB |
| `eligibility-gate.ts` | Gate eligibility per record |
| `explainability.ts` | Trace explainability per scoring |
| `kora-index-engine.ts` | KORA Index v3 computation |
| `monte-carlo-engine.ts` | Simulazione Monte Carlo per CS |
| `pillar-mapping.ts` | Classificazione pillar per evento |
| `reach-quality.ts` | EVQ, INT, CONT |
| `contribution-family-detector.ts` | BCM taxonomy per KORA Contribution |
| `budget-evidence.ts` | BTI evidence engine |
| `care-economy-mapping.ts` | Care economy mapping pillar |

**Stato:** LIVE — pipeline v2.0 "Foundation Light Pilot", Sprint 1 IU-centric.
**Test coverage:** `b103-golden-path.test.ts`, `methodology-v1.test.ts`, `monte-carlo.test.ts`, `sprint1-iu-centric.test.ts`, `sprint2-robustness.test.ts`, `scoring-pipeline.test.ts`.
**Invariante:** "Never throws — returns insufficient_data on any unhandled error."

**Rischio tecnico:** BASSO — ben testato, input-validated, nessun hardcoding pesi.
**Valore CTO:** MOLTO ALTO — prova la solidità tecnica del core metodologico.

---

## 11. Worker PIB

**Path:** `services/worker-pib/WorkerPIBService.ts`, `supabase/migrations/018_worker_pib.sql`, `app/my-kora/personal-impact-balance/`

**Stato:** LIVE-AWARE (due path)

| Path | Metodo | Stato |
|---|---|---|
| KORA_ADMIN preview | `getPIB(personaId, scenarioId)` | DEMO-ONLY (sincrono, sintetico) |
| WORKER JWT reale | `getPIBLive(supabase, period?)` | LIVE (da `personal.worker_pib`) |

**Invarianti:**
- `not_employer_visible: true` — mai chiamato da percorsi employer.
- `not_performance_score: true` — PIB è misurazione di attivazione, non valutazione.
- Schema: `personal.worker_pib` — schema separato con RLS per singolo worker.

**Rischio privacy:** ALTO — il dato più sensibile del sistema. Triple protection: service-level, route-level, RLS.
**Rischio tecnico:** BASSO — path ben separati, nessuna confusion possible tra demo e live.

---

## 12. KORA Space (Worker)

**Path:** `app/my-kora/kora-space/`, `app/worker/workspace/`

**Stato:** LIVE-AWARE — four-state detection: `checking / live / empty / demo`

**Cosa fa:**
- Worker vede iniziative disponibili (live da `commons.initiative`).
- Booking inline via `POST /api/worker/commons/bookings`.
- Identità worker risolta server-side via JWT — mai esposta nel componente UI.
- Nessun dato company, nessun ranking, nessun confronto tra lavoratori.

**Privacy invariants (hard-coded nel commento di page):**
- Partecipazione non visibile a azienda in forma individuale.
- Nessun classifica, nessun ranking, nessun confronto tra lavoratori.

**Rischio tecnico:** BASSO.
**Rischio privacy:** BASSO (worker vede solo i propri dati).

---

## 13. KORA Contribution

**Path:** `app/company/contribution/`, `services/kora-contribution/KoraContributionService.ts`, `app/api/company/contribution/live/`

**Stato:** LIVE/SHELL (dual-mode per `production_ready`)
- `production_ready = false` → shell esistente (Foundation Light standard).
- `production_ready = true` → dashboard con due sezioni: Promoter View + Origin Employer View.

**Companion indicator** — mai componente del KORA Index (CLAUDE.md §12.7, commento in service).

**Demo scoring:** legge `data/synthetic/kora-contribution-outputs.json` (5 componenti V2: Activation Depth 30%, Evidence Quality 25%, Ecosystem Contribution 20%, Adoption & Reach 15%, Strategic Breadth 10%).

**Privacy:** sezione origin_employer mostra solo aggregati — mai legame worker↔iniziativa.

**Migration di supporto:** `025_commons_booking_contribution.sql` (READY_FOR_REVIEW), `032_contribution_atomic_attribution.sql` (proposed), `033_initiative_adoption_source_model.sql` (proposed).

**Rischio tecnico:** MEDIO — le tre migration non ancora applicate su staging.
**Rischio privacy:** BASSO (aggregati only).

---

## 14. Initiatives / Participation

**Path:** `supabase/migrations/008_worker_initiatives.sql`, `supabase/migrations/013_kora_commons.sql`, `app/api/commons/`, `app/api/worker/initiatives/`

**Stato:** LIVE

- `commons.initiative` — tabella attiva (mig 013).
- `personal.worker_initiative` — partecipazione worker (mig 008).
- `commons.post` — post KORA Commons (mig 013).
- Worker può esprimere interesse (`POST /api/worker/initiatives/[id]/interest`).
- KORA Space mostra iniziative live con booking inline.
- COMPANY_ADMIN vede post del proprio tenant — nessun analytics di lettura worker.

**Rischio tecnico:** BASSO.
**Rischio privacy:** BASSO — participazione worker non esposta ad employer.

---

## 15. Decision Pack

**Path:** `app/company/reports/`, `app/api/company/decision-pack/`, `app/api/admin/decision-pack/`, `services/report-generator/`

**Stato:** LIVE — board report con KI, CS, Safeguard, ComponentBreakdown, NormativeMappingLight.

**PDF generation:** `POST /api/admin/decision-pack/pdf` e `POST /api/company/decision-pack/pdf` — live.

**Preview path:** `DynamicScoringPreviewService` → approssimazione "stima proxy" (non authoritative), usato solo per preview section.

**Dati sintetici:** `data/synthetic/decision-pack-versions.json` — solo per demo mode.

**Rischio tecnico:** BASSO.
**Valore demo:** ALTO — mostra output board-grade reale.

---

## 16. Financial / BTI / Activation

**Path:** `app/company/financial/`, `services/bti-intelligence/`, `services/budget-to-human-impact/`, `lib/kora-engine/bti-engine.ts`

**Stato:** LIVE (parziale)

- **BTI Score** — live: calcolato da `run-kora-pipeline.ts` e mostrato in `/company/financial`.
- **Financial Intelligence dettagliata** — non ancora disponibile in live ("Financial Intelligence dettagliata non ancora disponibile in live", commento in page).
- **Activation** (`/company/activation`) — LIVE: tasso di attivazione, distribuzione pillar.
- **BTI Doctrine** — `BTI_DOCTRINE` costante; mai hardcoded nella UI.

**Dati sintetici:** `data/synthetic/budget-to-human-impact.json`, `data/synthetic/financial-governance.json`.

**Rischio tecnico:** BASSO.
**Cosa manca:** Financial Intelligence avanzata (BTI breakdown per fonte, forecast).

---

## 17. Supabase Clients

**Path:** `lib/supabase/`

| File | Tipo client | Scope |
|---|---|---|
| `server.ts` | SSR anon + cookie | Server Components, API Routes |
| `client.ts` | Browser anon | Client Components |
| `impact-unit-service-key.ts` | Service role scoped | Pipeline monitoring analytics.impact_unit |
| `worker-provisioning-service-key.ts` | Service role scoped | INSERT worker_identity only |
| `storage-service-key.ts` | Service role scoped | Storage operations |
| `uef-service-key.ts` | Service role scoped | UEF pipeline writes |
| `auth-admin-update-user.ts` | Admin auth API | Reset password, update user metadata |
| `types.ts` | Database types | Generato da Supabase CLI |

**Pattern di sicurezza:**
- Service-role key mai esposta lato client.
- Service-role clients scoped per operazione — non un client generico onnipotente.
- Doctrine in codice: i client service-role non leggono dati individuali oltre il loro scope.

**Rischio tecnico:** BASSO.
**Rischio privacy:** BASSO-MEDIO — service-role scoped clients.
**Cosa non va toccato:** qualsiasi modifica ai client service-role richiede review tecnica.

---

## 18. Service-Role Modules

**Moduli service-role attivi:**

| Modulo | Scope | Operazioni ammesse |
|---|---|---|
| `worker-provisioning-service-key` | `personal.worker_identity` | INSERT + UPDATE (non-PII) |
| `impact-unit-service-key` | `analytics.impact_unit` | SELECT (no worker identity) |
| `storage-service-key` | Storage bucket | Upload / signed URL |
| `uef-service-key` | `analytics.uef_record` | INSERT (via SECURITY DEFINER) |
| `auth-admin-update-user` | Supabase Auth Admin API | `updateUserById` (reset pw, metadata) |

Tutte le write a `contribution_event` (mig 025) passano via `SECURITY DEFINER` — `authenticated` ha SELECT only.

---

## 19. Migrations

**Path:** `supabase/migrations/` (30 file), `supabase/proposed/` (2 file), `supabase/rollback/` (3 file)

### Migration applicate (migrations/)

| Intervallo | Area |
|---|---|
| 001–006 | Foundation v1: schemi, grants, claims, soft-delete, IU trace, tenant key |
| 007–012 | Worker: provisioning, initiatives, onboarding, partner profile, CV share, partner identity |
| 013–016 | Commons, tenant classification, company safe aggregation, worker initiative source |
| 017–020 | Worker pseudonym map, PIB, bridge UEF↔initiative, PIB redistribution RPC |
| 021–024 | Tenant pilot ready, worker RLS gaps, uploaded record attendee, commons initiative fields |
| 025–028 | Contribution source, company route RLS, worker individual RLS refactor, audit log enrichment |
| 030–031 | UEF admin access hardening, revoke public execute UEF DEFINER functions |

**Nota:** mig 029 non presente in `migrations/` — esiste solo come `rollback/029_rollback_027_if_needed.sql`. Probabile rinumerazione.

### Proposed (non applicate)

| File | Contenuto | Stato |
|---|---|---|
| `032_contribution_atomic_attribution.sql` | Atomic attribution function per contribution events | READY_FOR_REVIEW |
| `033_initiative_adoption_source_model.sql` | Source model per adoption events | READY_FOR_REVIEW |

### Rollback disponibili

- `029_rollback_027_if_needed.sql` — rollback mig 027
- `030_rollback_030_if_needed.sql` — rollback mig 030
- `031_rollback_031_if_needed.sql` — rollback mig 031

---

## 20. RLS

**Stato:** LIVE — 20 migration su 30 contengono policy RLS.

### Schema coverage

| Schema | Tables principali | RLS attivo |
|---|---|---|
| `public` | `tenant`, `source_batch`, `uploaded_record` | ✓ |
| `personal` | `worker_identity`, `worker_pib`, `worker_pseudonym_map` | ✓ (più restrittivo) |
| `analytics` | `uef_record`, `impact_unit` | ✓ (SECURITY DEFINER post-030) |
| `commons` | `initiative`, `post`, `contribution_event`, `initiative_adoption` | ✓ |
| `gov` | `kip_records` | ESCLUSO — non creato (CLAUDE.md) |

### Pattern RLS chiave

- `personal.worker_identity`: worker vede solo la propria riga (`auth_user_id = auth.uid()`).
- `personal.worker_pib`: stesso pattern, worker-owned.
- `analytics.impact_unit`: post-030, KORA_ADMIN ha `SELECT` solo via `SECURITY DEFINER`.
- `commons.contribution_event`: authenticated → SELECT only; writes solo via SECURITY DEFINER.
- Aggregati company: RLS via `tenant_id` claim. Safe aggregation N≥10 enforced a livello applicativo.

**Rischio tecnico:** BASSO — RLS ben stratificata, hardening applicato in più sprint.
**Rischio privacy:** BASSO — defense in depth: RLS + service-layer + middleware + access-matrix.

---

## 21. Tests

**Path:** `tests/unit/` (186 file), `tests/integration/` (5 file)

**Totale:** 191 file, 8079 test, 100% passing.

### Distribuzione per area

| Area | File di test (appross.) |
|---|---|
| Auth / login / routing | ~20 (b112, b113, b117*, b119) |
| Worker experience / PIB | ~15 (b109, b110, b111, b113, b115, b122) |
| Privacy / PII / security | ~18 (pii-guard, privacy-boundary, worker-pib-privacy, route-privacy, pii guard) |
| KORA Contribution / Commons | ~12 (kora-contribution*, kora-space*) |
| Scoring / methodology | ~10 (methodology-v1, monte-carlo, sprint1-iu-centric, sprint2-robustness) |
| Provisioning / lifecycle | ~8 (b104, b123, b124, b125, b119b) |
| RLS / isolation | ~5 (tenant-isolation, b101, b102) |
| Handoff / CTO review | ~3 (kora-contribution-hardening) |
| Integration | 5 (workspace boundary, routes boundary, demo gating, company tabs, scoring pipeline) |

**Test runner:** vitest 4.1.8
**Durata:** ~4s
**Caratteristica:** quasi tutti unit test su business logic / services / document integrity — pochissimi test E2E (Playwright non installato).

**Rischio tecnico:** BASSO — suite green, copertura ampia su aree critiche.
**Cosa manca:** test E2E / smoke test UI, test su staging live.

---

## 22. Demo Data

**Path:** `data/synthetic/` (35 file JSON), `data/methodology/`, `data/golden-path/`

### File sintetici principali

| File | Contenuto |
|---|---|
| `companies.json` | Aziende demo (Scenario S1–S4) |
| `workers.json` | Worker sintetici (mai visibili a employer) |
| `kora-index-outputs.json` | KORA Index pre-computati per demo |
| `kora-contribution-outputs.json` | KORA Contribution demo |
| `company-aggregates.json` | Aggregati aziendali demo |
| `confidence-records.json` | Confidence Score demo |
| `commons-initiatives.json` | Iniziative KORA Commons demo |
| `collective-initiatives.json` | Iniziative collettive demo |
| `budget-to-human-impact.json` | BTI data demo |
| `financial-governance.json` | Financial governance demo |
| `worker-roster.json` | Roster demo (solo per KORA_ADMIN preview) |
| `decision-pack-versions.json` | Decision Pack demo |
| `explainability-records.json` | Trace explainability demo |

Tutti i file sintetici contengono `synthetic_demo_data: true` e `not_live_data: true`.

**Golden path:** `data/golden-path/` — 3 CSV upload per test scoring pipeline (golden, average, weak company).

---

## 23. Demo / Preview / Future Vision Surfaces

**Path:** `app/demo/`

| Page | Stato | Contenuto |
|---|---|---|
| `/demo` | DEMO | Hub demo — navigazione per investitori/clienti |
| `/demo/guide` | DEMO | Guida interattiva alla demo |
| `/demo/future-vision` | MOCKUP | Roadmap architetturale statica — label "not active in Foundation Light" |
| `/demo/advisor` | DEMO | Demo area advisor con note annotabili |
| `/demo/benchmarks` | DEMO/MOCKUP | Benchmark settoriali (nessun dato reale) |
| `/demo/portfolio` | DEMO | Portfolio aziende demo |
| `/demo/network` | MOCKUP | KORA Network — roadmap futura |
| `/demo/gtm` | DEMO | Go-to-market materials |
| `/demo/index-registry` | DEMO | Registry KORA Index per aziende demo |
| `/demo/ai-onboarding` | DEMO/MOCKUP | AI Onboarding preview |
| `/app/pilot` | MARKETING | Pagina pilot: costi, modalità, contatto (mailto, zero backend) |
| `/request-access` | MARKETING | Richiesta accesso — informativa pubblica |

**`/demo/future-vision`** — esplicitamente etichettata: "Future Vision · static mockup · not active in Foundation Light · synthetic\_demo\_data: true".

**Rischio:** alcune pagine demo potrebbero sembrare funzionali senza essere backed da dati reali. È necessario che la guida demo spieghi chiaramente lo stato di ogni area.

---

## 24. Partner Area

**Path:** `app/partner/`, `app/partner/workspace/`

**Stato:** LIVE (parziale)

- `requirePartnerUser()` — enforced.
- Partner vede: propria identità, iniziative di propria competenza, sezione "funzionalità future — prossimamente".
- PARTNER non vede: dati individuali worker, KORA Index aziendale, admin, trial.
- Sezione "prossimamente" per funzionalità non attive.

**Rischio tecnico:** BASSO.
**Cosa manca:** gestione catalogo partner, pricing, scheduling — fuori scope Foundation Light.

---

## 25. Pagine o Route Non Pronte per Clienti/Investitori

Le seguenti aree presentano rischi di credibilità o stato incompleto che potrebbero compromettere una presentazione non guidata:

| Area | Path | Problema |
|---|---|---|
| Company Onboarding | `/company/onboarding` | Shell vuota con messaggio admin-only |
| Opportunities (company) | `/company/opportunities` | Shell locked |
| Opportunities (worker) | `/worker/opportunities` | Partner catalog "prossimamente" |
| Partner area funzionalità future | `/partner/workspace` (sezione) | Label "prossimamente" visibile |
| Demo advisor | `/demo/advisor` | Note-taking statico, non backato |
| Demo network | `/demo/network` | Roadmap mockup — potrebbe confondere |
| Demo AI onboarding | `/demo/ai-onboarding` | Preview non funzionale |
| Financial Intelligence avanzata | `/company/financial` (sotto BTI) | "Non ancora disponibile in live" |
| KORA Contribution (standard tenant) | `/company/contribution` | Shell per `production_ready=false` |
| Dynamic CV sharing | `/worker/dynamic-cv` (sezione sharing) | "Planned, not active" |

---

## Sezione: Investor / Client Readiness

### 1. Cosa si può mostrare oggi in demo guidata

- KORA Index live su tenant staging (tutti e 10 i componenti, CS, calibration_status).
- Company workspace autenticato con sessione reale.
- Decision Pack PDF con KI, CS, Safeguard, NormativeMapping.
- KORA Contribution (per tenant `production_ready=true`).
- KORA Space worker con iniziative e booking.
- Worker provisioning da Admin.
- Trial Control Center — stato pipeline tenant.
- Pipeline staging end-to-end (upload → UEF review → scoring → Decision Pack).
- Privacy boundary: dimostrazione che employer non vede dati worker individuali.

### 2. Cosa si può mostrare a un investitore

- KORA Engine: 14-stage pipeline con codice reale (`lib/kora-engine/`).
- Test suite: 8079 test, 191 file, 100% passing — dimostra rigore metodologico.
- Architettura multi-role con RLS, claims, access-matrix pura.
- Decision separati (D-01–D-21) documentati in `docs/21-founder-gate-resolution-log.md`.
- CLAUDE.md: costituzione del prodotto — dimostra governance tecnica.
- Migrations: 30 migration SQL con rollback — dimostra maturità DB.
- Scoring path separati (DEMO/PREVIEW/LIVE) con interface contract IScoringService.
- Service-role clients scoped per operazione — non un bypass RLS generico.
- `pre_empirical_calibration` label su ogni output — onestà metodologica.

### 3. Cosa non va mostrato (rischio reputazionale)

- `/demo/network` — roadmap mockup, potrebbe sembrare feature esistente.
- `/demo/ai-onboarding` — preview non funzionale, non backato.
- `/company/onboarding` — shell con messaggio "contatta admin".
- Worker opportunities — "prossimamente" visibile.
- Financial Intelligence avanzata — messaggio "non disponibile" in prodotto altrimenti live.
- Qualsiasi confronto individuale worker (non esiste — ma va confermato verbalmente).

### 4. Cosa va etichettato come preview/demo

- Tutti i file in `data/synthetic/` — già marcati `synthetic_demo_data: true`.
- Tutti i path `/demo/*` — già con banner `DemoAccessBanner`.
- `/demo/future-vision` — già marcata "static mockup · not active in Foundation Light".
- Score demo aziende (Scenario S1–S4) — già con `not_live_data: true`.
- Preview scoring path — già etichettato "stima proxy, non authoritative".

### 5. Cosa rischia di sembrare "vibecoded"

- ESLint: 118 errori (106 warnings), incluse 8 istanze `setState in useEffect` e 3 `cannot create components during render`. Non causano crash ma sono pattern anti-corretti.
- Pagine "prossimamente" senza timeline chiara.
- `/demo/ai-onboarding` — un titolo "AI" senza backend AI visibile potrebbe essere mal interpretato.
- Mancanza di test E2E — UI untested visualmente.
- `data/synthetic/` molto ricco → qualcuno potrebbe pensare che la platform non abbia dati reali.
- `WorkerProvisioningService` (classe) è demo-only ma esiste anche `API /provision` che è live — può generare confusione.

### 6. Cosa dimostra solidità tecnica

- KORA Engine: 24 moduli con interface contracts, nessun hardcoding pesi.
- `IScoringService` — tre adapter con interfaccia comune, swappabili.
- Access-matrix: funzione PURA senza side effect.
- Service-role clients scoped: no bypass RLS generico.
- 30 migration con rollback per le ultime 3.
- Idempotency hardening su `contribution_event` (uq_contribution_external a 5 colonne).
- Privacy architecture: triple protection (RLS + service-layer + middleware).
- `canAccess()` — decision record con `allowed/denied/audit_required`.
- Test suite: 8079 test, 191 file. `pre_empirical_calibration` ovunque — onestà metodologica.
- CLAUDE.md — costituzione tecnica non-negoziabile per ogni sessione di sviluppo.

### 7. Top 10 interventi per rendere la piattaforma più credibile

1. **Correggere gli 8 `setState in useEffect`** — pattern anti-corretti visibili in ESLint, rischio render loop.
2. **Rimuovere o completare le pagine "prossimamente"** — opportunities, partner features: o toglie o aggiunge un roadmap date.
3. **Aggiungere test E2E (Playwright) sui golden path** — company login → KORA Index, worker login → KORA Space.
4. **Correggere i 3 `cannot create components during render`** in `kora-space/page.tsx`.
5. **Applicare migration 032 e 033 su staging** — chiude il ciclo Contribution v2 e rende la pipeline idempotente.
6. **Smoke test staging post-migration** — verifica pipeline end-to-end su staging reale.
7. **Aggiungere `calibration_status` banner** anche su Decision Pack PDF output (oggi solo in UI).
8. **Documentare esplicitamente in UI** il confine demo/live — banner coerente su tutte le pagine demo.
9. **Chiudere Financial Intelligence avanzata** o rimuovere il gap "non disponibile" — completare o etichettare come roadmap.
10. **Rivedere `WorkerProvisioningService`** — disambiguare service (demo) da API route (live) nella documentazione interna.

### 8. Top 10 rischi da chiudere prima di dati reali (Gate 3)

1. **Migration 025 non ancora applicata su staging** — `contribution_event` non ha ancora la struttura idempotente a 5 colonne.
2. **Migration 032/033 proposed** — non applicate, KORA Contribution v2 non funzionante su staging.
3. **`.env.local` era production** — risolto in CC-00C, ma richiede policy di onboarding per dev futuri.
4. **No rollback plan per migration 025** — 032/033 hanno rollback, 025 no.
5. **PIB live su staging: mock o reale?** — `getPIBLive()` esiste ma richiede dati in `personal.worker_pib` su staging.
6. **Worker con account staging reali** — Gate 3 richiede worker reali con consenso. Processo non ancora documentato.
7. **`setState in useEffect`** — rischio render loop in produzione con dati live reali (volumi maggiori).
8. **No test E2E su staging** — pipeline testata in unit ma non smoke-tested in browser su dati reali.
9. **ESLint 118 errori** — da zero a live, questi dovrebbero essere a zero o near-zero.
10. **Dynamic CV sharing "not active"** — il worker non può condividere il CV. Feature importante per adozione, bloccante per valore percepito.

---

## Sezione: KORA Link Integration Readiness

> KORA Link v1 è controllato da `FEATURE_FLAGS.KORA_LINK_ENABLED = false`. Non è implementato. Le integrazioni descritte sono architettural hooks futuri, non codice esistente.

### 1. Worker Activation

**Path probabile:** `app/worker/workspace/`, `app/api/worker/activation-profile/`
**Integrazione:** KORA Link scan → registra evento di attivazione come UEF record.
**Rischio:** ALTO — richiede nuovo tipo evento UEF e classificazione pillar. Non impatta RLS esistente.
**Dipendenza:** mig 025 applicata (UEF source layer attivo).
**Review tecnica:** SÌ — nuovo event type nel BCM taxonomy.

### 2. Worker Workspace

**Path probabile:** `app/worker/workspace/` (sezione "partecipa con KORA Link")
**Integrazione:** QR scan → redirect autenticato a iniziativa specifica con pre-fill booking.
**Rischio:** MEDIO — richiede gestione deep link autenticato.
**Dipendenza:** booking live funzionante (già presente).
**Review tecnica:** SÌ — auth deep link è nuovo pattern.

### 3. Company Worker Management

**Path probabile:** `app/admin/workers/`, `app/api/admin/workers/`
**Integrazione:** KORA_ADMIN vede stato "KORA Link attivato" per worker (aggregato, no dettaglio).
**Rischio:** BASSO — aggiunta colonna aggregata senza dato individuale.
**Dipendenza:** worker provisioning live (già presente).
**Review tecnica:** NO (se aggregato).

### 4. KORA Space

**Path probabile:** `app/my-kora/kora-space/`, `app/worker/commons/`
**Integrazione:** scan link → apre card iniziativa con CTA booking diretto.
**Rischio:** BASSO — usa booking inline già esistente (`POST /api/worker/commons/bookings`).
**Dipendenza:** nessuna nuova.
**Review tecnica:** NO.

### 5. Initiatives

**Path probabile:** `app/api/commons/initiatives/`, `supabase/migrations/013`
**Integrazione:** QR su iniziativa fisica → worker registra partecipazione via scan.
**Rischio:** MEDIO — attendance verification tramite QR introduce nuovo source di UEF.
**Dipendenza:** `source_class = 'A'` (booking-based) già in mig 025.
**Review tecnica:** SÌ — nuovo attribution path in contribution_event.

### 6. Partner / Accreditation

**Path probabile:** `app/partner/workspace/`, `app/api/admin/partners/`
**Integrazione:** Partner usa KORA Link per accreditare eventi fisici come fonte UEF verificata.
**Rischio:** ALTO — aumenta EV (Evidence Value) delle UEF se partner accreditato. Richiede trust tier.
**Dipendenza:** partner identity (mig 012 attiva).
**Review tecnica:** SÌ — impatta EV nel calcolo IU.

### 7. Contribution

**Path probabile:** `app/company/contribution/`, `app/api/company/contribution/live/`
**Integrazione:** KORA Link scan da lavoratore a iniziativa collettiva → attribution automatica.
**Rischio:** ALTO — cuore della mig 033 (initiative_adoption). Dipende da 032/033 applicate.
**Dipendenza:** mig 032 + 033 applicate su staging.
**Review tecnica:** SÌ — modifica source model contribution.

### 8. Worker PIB / KORA Index

**Path probabile:** `services/worker-pib/WorkerPIBService.ts`, `lib/kora-engine/`
**Integrazione:** eventi KORA Link → IU → PIB → KORA Index. Stessa pipeline, nuovo source.
**Rischio:** BASSO — il pipeline già gestisce diverse sorgenti. KORA Link è un nuovo source_type.
**Dipendenza:** `run-kora-pipeline.ts` già estensibile.
**Review tecnica:** NO (se source_type è solo nuovo valore enum).

### 9. Audit

**Path probabile:** `lib/audit/`, `supabase/migrations/028_audit_log_enrichment.sql`
**Integrazione:** ogni scan KORA Link → audit log entry (device, timestamp, worker_ref pseudonimizzato).
**Rischio:** MEDIO — audit log esiste (mig 028), ma KORA Link aggiunge device identifier.
**Dipendenza:** mig 028 attiva.
**Review tecnica:** SÌ — privacy di device identifier richiede analisi GDPR.

### 10. Privacy Boundary

**Path probabile:** `lib/auth/access-matrix.ts`, `services/privacy-visibility/`
**Integrazione:** KORA Link non deve mai esporre posizione o orario worker a employer.
**Rischio:** ALTO — scan fisico può contenere geolocalizzazione implicita (orario evento).
**Dipendenza:** `PrivacyVisibilityService` già esistente.
**Review tecnica:** SÌ — privacy impact assessment KORA Link obbligatorio prima di Gate 3.

---

## Riepilogo Inventario

| Stato | Aree |
|---|---|
| LIVE | Admin ops, Company workspace, KORA Index (live path), Worker workspace, Auth/RLS, API routes, Scoring engine, PIB (live path), KORA Space (live-aware), Commons, Initiatives, Decision Pack, BTI |
| PREVIEW/LIVE-AWARE | Dynamic CV, PIB (dual-mode), KORA Space (dual-mode), Financial (parziale), Contribution (dual-mode) |
| DEMO-ONLY | Scoring simulator (demo path), WorkerProvisioningService (class), Founder Validation, Admin Preview |
| LOCKED-SHELL | Company Onboarding, Opportunities (company + worker) |
| MOCKUP | Future Vision, Demo Network, Demo AI Onboarding |
| NON APPLICATO | Migration 025 (staging), 032, 033 |

**Aree LIVE:** ~14
**Aree PREVIEW/LIVE-AWARE:** ~5
**Aree DEMO-ONLY o LOCKED-SHELL o MOCKUP:** ~8

---

*Documento prodotto in CC-02 — nessun codice runtime modificato, nessun Supabase client usato, nessun dato reale coinvolto.*
