# KORA Foundation Light — Handoff per Next

**Commit di riferimento:** `043f697` · **Branch:** `main` · **Data:** 2026-06-18
**Stato:** Foundation Light v0.1 · Pre-empirical calibration · Non client-ready

> Questo è il documento principale da leggere prima di toccare il repo.
> Per il contesto prodotto e la narrativa commerciale: `docs/kora-canonical-product-architecture-v1.md`
> Per la spec algoritmo e formula IU: `docs/10-architecture-v3-layer-specification.md`

---

## 0. Defense-in-depth worker individual data (B168.6)

**Commit:** `043f697` · **Data attivazione production:** _[da completare dopo Phase 4 execution]_

KORA implementa una difesa a 3 layer per garantire che KORA_ADMIN non possa accedere ai dati individuali worker:

| Layer | Implementazione | Status |
|---|---|---|
| Layer 1 — Middleware | `middleware.ts`: intercetta `/worker/:path*` e blocca KORA_ADMIN con redirect/error | ✅ Attivo |
| Layer 2 — Server layout | `app/worker/layout.tsx`: hard error esplicito "Worker individual data is not accessible to KORA service team by design" con audit log | ✅ Attivo |
| Layer 3 — RLS database | Migration 027: rimozione policy `kora_admin_*` su `personal.*` e `analytics.impact_unit` | ⏳ Da applicare (Phase 4) |

Garanzia citabile in DPIA, contratti, fundraising **solo dopo Phase 4 execution confermata**.

### Service-role scoping pattern (ADR-002)

Il service-role client non è mai usato direttamente nelle route operative. Pattern: un modulo scoped per ogni use case, con whitelist esplicita dei campi + assertion runtime. Vedere `docs/decisions/ADR-002-service-role-scoping.md`.

Moduli attivi:
- `lib/supabase/storage-service-key.ts` — upload file su bucket privato
- `lib/supabase/worker-provisioning-service-key.ts` — INSERT `personal.worker_identity` con `ALLOWED_IDENTITY_INSERT_FIELDS`
- `lib/supabase/impact-unit-service-key.ts` — SELECT `analytics.impact_unit` con `ALLOWED_IU_SELECT_COLUMNS`

### Security headers e IP protection (B168.6 Phase 1-3)

- `public/robots.txt`: Disallow all di default, Allow / e /landing
- noindex metadata su tutti i layout workspace
- CSP, HSTS, X-Frame-Options: DENY in `next.config.ts`
- `xlsx` v0.18.5 rimosso (CVE-2023-30533, CVE-2024-22363): sostituito con `exceljs` (server) e `read-excel-file/browser` (client)

---

## 1. Che cos'è KORA Foundation Light

KORA è una **Human Impact Intelligence Platform** che misura l'attivazione umana organizzativa — non i singoli lavoratori.

Foundation Light v0.1 è un'applicazione demo controllata su dati sintetici. Implementa il loop di intelligenza KORA completo (ingestion → AI mapping → UEF review → scoring → KORA Index → output). Non è un SaaS deployato su dati reali. Non è empiricamente validata. Non è client-ready.

**Principio canonico non negoziabile:**
> "Company input can create worker-level impact. Company output cannot expose worker-level impact."

Il dato individuale (PIB, IU, Dynamic CV, Activation Signature) è worker-owned/private. La company area vede solo aggregati, stati di processo, qualità dati e output organizzativi.

---

## 2. Stato reale al commit 599a747

| Area | Stato |
|------|-------|
| Scoring engine (`lib/kora-engine/`) | Live — rule-based, deterministico, portable |
| Company workspace (`/company/*`) | Live — Supabase Auth + RLS + company-safe layer (B152) |
| Admin workspace (`/admin/*`) | Live — Supabase Auth + KORA_ADMIN guard |
| Worker workspace (`/worker/*`) | Parzialmente live — auth reale, alcune feature live, alcune preview |
| KORA Space (`/worker/kora-space`, `/company/commons`) | Live — condivisione contenuti tra worker e company |
| KORA Commons (`/company/commons`, `/worker/commons`) | Live — posts, initiatives condivise |
| Partner workspace (`/partner/*`) | Demo — nessun auth live, mock service layer |
| Advisor workspace (`/advisor/*`) | Demo — nessun auth live, mock service layer |
| Future Vision (`/future-vision/*`) | Mockup statico — labeled "Non attivo in Foundation Light", nessuna logica |
| Test suite | 5105 test passanti (122 file, Vitest) |
| TypeScript | Strict, 0 errori |

---

## 3. Architettura ruoli

I ruoli sono gestiti esclusivamente via `app_metadata.kora_role` nel JWT Supabase. Non ci sono ruoli client-side.

| Ruolo | Workspace | Stato |
|-------|-----------|-------|
| `KORA_ADMIN` | `/admin/*` | Live — auth guard server-side in layout |
| `COMPANY_ADMIN` | `/company/*` | Live — `requireCompanyUser()` su ogni route API |
| `WORKER` | `/worker/*` | Live — `requireWorkerUser()` su route API worker |
| `PARTNER` | `/partner/*` | Demo — auth non live |
| `COMPANY_VIEWER` | — | **Rimosso/non attivo** in Foundation Light |

**Chiave tenant canonica:** `app_metadata.kora_tenant_id` (migration 006). Non usare `tenant_id` (legacy, tenuto solo come fallback in `kora.tenant_id()`).

---

## 4. Company workspace — cosa è live

Il company workspace è il core funzionale di Foundation Light. Autenticazione reale, dati da Supabase, company-safe boundary attivo.

**Pagine live:**
- `/company/workspace` — overview workspace
- `/company/status` — stato workers e activation aggregate
- `/company/kora-index` — KORA Index, 10 componenti, Confidence Score
- `/company/data` — archivio evidenze caricate
- `/company/activation` — activation detail
- `/company/pillars` — pillar breakdown
- `/company/financial` — BTI / financial governance
- `/company/reports` — report generation
- `/company/ingestion` — upload dati aziendali

**Boundary di sicurezza (B152 — chiuso):**

Migration 015 crea lo strato company-safe (`analytics` schema). Le route company leggono SOLO da questi 4 oggetti — mai da `personal.*` direttamente:

| Oggetto | Tipo | Fonte | Cosa espone |
|---------|------|-------|-------------|
| `analytics.fn_company_worker_status()` | SECURITY DEFINER fn | `personal.worker_identity` | Conteggi aggregati per status |
| `analytics.fn_company_activation_summary(text)` | SECURITY DEFINER fn | `personal.worker_initiative` + `personal.worker_participation` | Aggregati activation, suppression N<10 in SQL |
| `analytics.v_company_uploaded_record_safe` | VIEW | `personal.uploaded_record` | Campi safe, esclusi `pseudonym_id`/`raw_hash` |
| `analytics.v_company_uef_eligibility_summary` | VIEW | `analytics.uef_record` | Eligibility/review counts per periodo |

**5 route migrate in B152-B** (commit `957daab`):
- `GET /api/company/workers/aggregate` → `fn_company_worker_status()`
- `GET /api/company/workers/activation-aggregate` → `fn_company_activation_summary()`
- `GET /api/company/live-eligibility` → `v_company_uef_eligibility_summary`
- `GET /api/company/evidence-record` → `v_company_uploaded_record_safe`
- `GET /api/company/evidence-archive` → `v_company_uploaded_record_safe`

Smoke test autenticato superato (B152-D) con sessione `COMPANY_ADMIN` reale, tenant `a2b802c9`.

---

## 5. Worker workspace — cosa è live vs preview

| Feature | Stato |
|---------|-------|
| Auth worker (`requireWorkerUser`) | Live |
| Worker provisioning (setup password, onboarding) | Live |
| Worker workspace page (`/worker/workspace`) | Live |
| Worker initiatives + participation | Live |
| Worker history (proprio storico partecipazioni) | Live |
| Worker privacy settings | Live |
| Dynamic CV (`/worker/dynamic-cv`) | Live (strutturale) |
| Worker opportunities | Live (strutturale) |
| PIB individuale | Worker-private, mai esposto a employer |
| My KORA area | Parzialmente live — verificare pagina per pagina |

**Regola invariabile:** nessuna route o pagina company accede a dati worker individuali. Il confine è imposto da RLS + company-safe layer, non da disciplina applicativa.

---

## 6. KORA Space e KORA Commons

**KORA Space** (`/worker/kora-space`, accesso company via `/company/commons`): area di condivisione contenuti. Worker pubblica contenuti; company vede aggregati/contenuti approvati. Testato e funzionale.

**KORA Commons** (`/company/commons`, `/worker/commons`): commons post e initiatives condivise tra workspace. Basato su `commons.post` (migration 013).

---

## 7. DB e migrazioni — stato reale

17 migrazioni in `supabase/migrations/`, tutte presenti nel repo. Stato nel DB live:

| Migration | Cosa fa | Stato DB live |
|-----------|---------|--------------|
| 001 | Schemi + tabelle fondamentali (tenant, source_batch, uef_record, workforce_baseline, uploaded_record) | Applicata |
| 002 | FORCE RLS su `personal.*`, aggiorna policy | Applicata |
| 003 | Prima versione `kora.kora_role()` e `kora.tenant_id()` | Applicata (superseded da 006) |
| 004 | Update funzioni post-Gate 3A | Applicata (superseded da 006) |
| 005 | `analytics.impact_unit` — tabella IU trace | **Schema presente in repo, tabella assente nel DB live** |
| **006** | **`kora.tenant_id()` canonical fix — legge `kora_tenant_id`** | Applicata — **CANONICO** |
| 007 | `personal.worker_identity` + RLS | Applicata |
| 008 | `personal.worker_initiative` + `personal.worker_participation` + RLS | Applicata |
| 009 | Campi onboarding/consent su `personal.worker_profile_private` | Applicata |
| 010 | Schema `network` + `network.partner_profile` | Applicata |
| 011 | `personal.worker_cv_share` — token condivisione Dynamic CV | Applicata |
| 012 | `network.partner_identity` — mapping PARTNER users | Applicata |
| 013 | Schema `commons` + `commons.post` | Applicata |
| 014 | `tenant_kind` su `analytics.tenant` | Applicata |
| **015** | **Company-safe aggregation layer — 4 oggetti analytics** | Applicata (patchata B152-C: `iu_average_ev = NULL::numeric` perché `analytics.impact_unit` assente nel DB live) — **CANONICO** |
| 016–019 | Worker Grado 1 — schema layer (personal.worker_pib, pib_line_item, pib_pillar_summary, worker_profile_private) | **Scritta, NON applicata** — Gate 2 OPEN |
| **027** | **Privacy Guard: rimozione policy kora_admin su personal.* e analytics.impact_unit** | **Scritta, IDEMPOTENTE — da applicare in Phase 4** |
| **028** | **Audit log enrichment: colonne environment/ip_hash/user_agent_hash + ruolo audit_reader** | **Scritta, IDEMPOTENTE — da applicare in Phase 4** |

**Nota migration 005 vs 015:** `analytics.impact_unit` è definita in migration 005 ma assente nel DB live. La migration 015 originalmente dipendeva da essa per `iu_average_ev`; la patch B152-C (commit `599a747`) ha rimosso quella dipendenza restituendo `NULL::numeric` come placeholder. Quando `analytics.impact_unit` sarà presente, ripristinare il CTE `iu_avg` nella view.

---

## 8. Debito tecnico dichiarato

### 8a. 6 route company ancora su `getSupabaseServiceClient` — priorità P1

Queste route usano il service client (bypass RLS, isolamento per filtro applicativo TS). Non toccano `personal.*` direttamente — accedono solo a `analytics.*` e `audit.*`. Rischio privacy basso, ma il pattern è inconsistente con il company-safe layer.

| Route | Tabelle accedute |
|-------|-----------------|
| `GET /POST /api/company/data-submissions` | `analytics.source_batch`, `audit.audit_log` |
| `GET /api/company/data-submissions/[id]` | `analytics.source_batch` |
| `POST /api/company/data-submissions/[id]/files` | `analytics.source_batch`, `audit.audit_log`, Storage |
| `POST /api/company/data-submissions/[id]/submit` | `analytics.source_batch`, `audit.audit_log` |
| `GET /api/company/decision-pack` | `analytics.tenant`, `analytics.kora_index_result`, `analytics.decision_pack_version` |
| `GET /api/company/decision-pack/pdf` | `analytics.tenant`, `analytics.kora_index_result` |

Da migrare a `getSupabaseServerClient()` come fatto per le 5 route di B152-B. La migration richiesta è analoga ma più semplice (nessun nuovo oggetto DB necessario — le tabelle `analytics.*` hanno già RLS company).

### 8b. 12 servizi scaffoldati ma non wired — non cancellare

Questi servizi esistono in `services/` ma non sono referenziati da nessuna pagina o route `app/`. Sono engine pianificati per fasi future o metodologia post-pilot. Non toccarli senza decisione founder.

```
services/access-control/           — AccessControlService (futuro)
services/activation-opportunity/   — ActivationOpportunityService (futuro)
services/booking-request/          — BookingRequestService (futuro)
services/company-setup/            — CompanySetupService (futuro)
services/dynamic-scoring/          — DynamicScoringPreviewService (futuro)
services/ingestion-normalizer/      — IngestionNormalizerService (futuro)
services/ingestion-pipeline/        — IngestionPipelineService (futuro)
services/iu-computation/            — IUComputationService (futuro)
services/pib-aggregation/           — PIBAggregationService (futuro)
services/privacy-visibility/        — PrivacyVisibilityService (futuro)
services/role-permission/           — RolePermissionService (futuro)
services/worker-pillar-adoption/    — WorkerPillarAdoptionService (futuro)
```

### 8c. Altri debiti noti

- **KORA Admin** (`/admin/*`): funzionale ma dispersivo — molte sezioni sono preview/placeholder. Audit pagina-per-pagina non completato.
- **Audit pagina-per-pagina** sulla company area dopo B152: le API sottostanti sono testate, ma la verifica visuale browser di `/company/workspace`, `/company/status`, `/company/data`, `/company/kora-index` è stata delegata al founder (non completata da CLI).
- **`analytics.impact_unit`** non presente nel DB live: la tabella è definita in migration 005 ma non applicata. Quando il ciclo scoring produrrà IU reali, la tabella dovrà essere creata e la view `v_company_uef_eligibility_summary` aggiornata.

---

## 9. Cosa NON toccare senza decisione founder

1. **`lib/methodology-config/v0.1.ts`** — pesi e soglie canonici. Non hardcodare valori in componenti o servizi.
2. **`lib/auth/kora-session.ts`** — session helpers (`requireKoraAdmin`, `requireCompanyUser`, `requireWorkerUser`). Modifiche cambiano il boundary di sicurezza dell'intera app.
3. **Migration 015** e i 4 oggetti company-safe — la struttura dello strato company-safe è decisione architetturale founder (B152/B153).
4. **`supabase/migrations/`** — nessuna nuova migration prima di Gate 2 (CTO review).
5. **`CLAUDE.md`** — operating constitution. Non modificare senza decisione founder.
6. **Perimetro congelato** (non implementare senza decisione founder):
   - Area `/worker/my-kora` (preview parziale — non estendere senza allineamento)
   - `/partner/*` e `/advisor/*` (demo, non operativi)
   - `/future-vision/*` (mockup statici — mai aggiungere logica)
   - Servizi metodologici scaffoldati (lista in §8b)
   - KORA Activation Signature (concept, non implementato)
7. **I test strutturali** (`tests/unit/`) sono vincoli intenzionali, non test fragili da rimuovere. Riflettono boundary di privacy e architettura.

---

## 10. Cosa NON assumere

- Non assumere che l'UI sia il design finale — Foundation Light UI è demo/pilot.
- Non assumere che la metodologia sia validata — tutti gli output sono `pre_empirical_calibration`.
- Non assumere che il worker platform sia completo — è parzialmente preview.
- Non assumere che i servizi scaffoldati in `services/` siano connessi all'app.
- Non assumere che `COMPANY_VIEWER` sia un ruolo attivo — non è operativo in Foundation Light.
- Non assumere che le pagine Partner e Advisor abbiano backend — sono mock.

---

## 11. Cosa manca prima di pilot reale

- Consenso esplicito worker (Gate 3 — legal/privacy aperto)
- Validazione empirica metodologia (Delphi Study post-pilot)
- Test E2E runtime (tutti i test attuali sono strutturali/unit)
- CTO architecture review (Gate 2 — blocca SQL DDL, Prisma, backend production)
- Audit privacy formale (Gate 3 aperto)
- Verifica fiscale output (Gate 5 — tax/fiscal advisor)

---

## 12. Come avviare il progetto

```bash
cp .env.local.example .env.local   # richiede NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev                         # dev server su http://localhost:3000
npm test                            # 5105 test — devono passare tutti prima di qualsiasi commit
npx tsc --noEmit                    # TypeScript check — deve essere pulito
npm run build                       # build production
```

---

## 13. Documenti canonici da leggere (ignora il resto, è storico)

| Documento | Perché leggere |
|-----------|---------------|
| `CLAUDE.md` (root) | Operating constitution — regole non negoziabili per il codice |
| `docs/kora-canonical-product-architecture-v1.md` | Master reference prodotto v1.1 |
| `docs/10-architecture-v3-layer-specification.md` | 14-stage algorithm, formula IU, KORA Index v3 |
| `docs/21-founder-gate-resolution-log.md` | Decisioni D-01—D-21 del founder |
| `docs/21b-methodology-risk-acceptance-and-provisional-score-policy.md` | Regole display: CS, calibration_status, Activation Safeguard |
| `docs/22A-foundation-light-demo-build-cutline.md` | Cosa è in scope / fuori scope / mockup |
| `docs/24-foundation-light-product-functional-spec.md` | Spec completa: ruoli, schermate, flussi |
| `docs/25-demo-dataset-and-scenarios-spec.md` | Blueprint dati sintetici |
| `docs/26-foundation-light-technical-build-handoff.md` | Stack, folder structure |
| `docs/ACCESS_PROVISIONING_DOCTRINE.md` | Doctrine provisioning accesso |

Tutti gli altri documenti in `docs/` sono storici — utili per contesto, non per operatività quotidiana.

---

## 14. Commit rilevanti

| Commit | Descrizione |
|--------|-------------|
| `043f697` | B168.6 P4.0: service-role scoped + idempotency guards (precondizioni Phase 4) |
| `56fba97` | B168.6 Phase 1-3: robots.txt + security headers + xlsx CVE upgrade |
| `ae31e5e` | B168.5 Phase 1: rimozione 5 route DUPLICATO, test aggiornati |
| `599a747` | B152-C: patch migration 015 — rimuove dipendenza `analytics.impact_unit` |
| `957daab` | B152-B: migra 5 route company al company-safe layer |
| `741a1e6` | B153: crea migration 015 — company-safe aggregation layer |

---

## 15. Verifica manuale browser — [SEGNAPOSTO]

**Questo segnaposto deve essere completato dal founder prima che Next inizi a lavorare.**

La verifica delle pagine company e worker in browser con sessione reale non è stata completata da CLI. Le API sottostanti sono operative (smoke test B152-D superato). Le pagine da verificare manualmente:

- `/company/workspace` — [ ] nessun crash, empty state comprensibile, nessun dato worker
- `/company/status` — [ ] workers aggregate, activation aggregate
- `/company/data` — [ ] archivio evidenze
- `/company/kora-index` — [ ] KORA Index, 10 componenti, CS, calibration_status
- `/worker/workspace` — [ ] initiatives, storico, privacy boundary
- `/worker/dynamic-cv` — [ ] Dynamic CV worker

**Non scrivere "verificato" finché il founder non fornisce l'esito con data.**

Data verifica: _[da completare]_
Esito: _[da completare]_
