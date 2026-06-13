# KORA — Next Handoff & Platform State

**Documento:** `docs/NEXT_HANDOFF_PLATFORM_STATE.md`
**Commit:** `58a9f0c` · **Branch:** `main` · **Data:** 2026-06-13
**Scope:** Post B130–B133
**Status:** Foundation Light v0.1 · Pre-empirical calibration · Not client-ready

> Per l'introduzione al prodotto, la narrativa commerciale e il brief per il team di design, leggere prima `docs/next-handoff-brief.md`. Questo documento è il complemento tecnico e operativo — lo stato della piattaforma, i confini, le lacune, e cosa non toccare.

---

## 1. Executive Summary

KORA Foundation Light v0.1 è un'applicazione demo controllata che implementa il loop di intelligenza KORA su dati sintetici. Non è client-ready. Non è empirically validated. Non è production-ready nel senso di un sistema SaaS deployato su dati reali.

**Cosa è stato fatto:**
- Demo application completa con Next.js 14+ App Router, TypeScript strict, Tailwind
- Loop di intelligenza simulato: ingestion → AI mapping → UEF review → scoring → output → explainability
- Autenticazione live reale (Supabase Auth) per ruoli KORA_ADMIN e COMPANY_ADMIN
- Boundary demo/live separato e testato (B130–B133)
- Company workspace live funzionante (workspace, status, kora-index, activation, pillars, financial, reports)
- Worker space funzionante: PIB privato, Dynamic CV, privacy boundary
- 93 test file, 3840 test strutturali/anti-regression

**Cosa non è ancora pronto:**
- Metodologia non validata empiricamente — tutti gli output sono `pre_empirical_calibration`
- Nessun test di integrazione runtime E2E
- Worker consent esplicito non implementato
- Partner e Advisor non sono priorità operative per il primo pilot
- Nessuna validazione esterna della metodologia
- Nessun claim di compliance o certificazione possibile

**Cosa non va toccato senza approvazione founder:**
Vedere §17 — Frozen Areas.

---

## 2. Current State — Foundation Light v0.1

### Livelli di maturità della piattaforma

| Livello | Descrizione | Esempi |
|---|---|---|
| **Production-like** | Autenticazione reale, sessioni reali, DB reale, routing protetto | Login KORA_ADMIN, Company workspace live, Tenant provisioning |
| **Foundation real** | Logica implementata, funzionante, ma su dati sintetici o senza DB live | Worker PIB, Dynamic CV, KORA Index scoring simulation, Activation Safeguard |
| **Demo-only** | Funziona solo con dati sintetici Meridiana, non esposto a sessioni live | `/demo/company/*`, guided demo ACME-001, scenario switcher |
| **Locked shell** | Route esistente ma mostra stato "non attivo" — nessun dato demo | `/company/opportunities`, `/company/shared`, `/company/contribution`, `/company/profile`, `/company/onboarding` |
| **Foundation skeleton** | UI presente, logica non implementata | Bookings, Collective, partner marketplace |
| **Future Vision** | Mockup statico, dichiarato inattivo | KORA Link, wallet, KORA Certified, KORA Commons avanzato |

### Cosa non esiste ancora in produzione

```
✗ SQL DDL applicata a un database reale
✗ Prisma schema / ORM
✗ Supabase project provisionato per ambiente staging/prod
✗ Worker accounts reali con identità reale
✗ Dati aziendali reali di alcun tipo
✗ Consenso worker esplicito (tutti i toggle sono preview)
✗ Booking engine reale (solo stato request/confirm)
✗ Payment, wallet, checkout
✗ Partner marketplace con prezzi o disponibilità
✗ KORA Link (NFC/QR hardware)
✗ Output fiscali/tax live
✗ PDF export nativo (solo print CSS)
✗ LLM API calls su dati HR o worker (BCM taxonomy classifier rule-based only)
✗ Metodologia certificata o empiricamente validata
```

---

## 3. Architecture Map

### Pipeline a 14 stadi — canonico e non modificabile

```
Raw Source Data
  → Stage 1:  Data Source Ingestion
  → Stage 2:  AI Upload Studio (file parsing, column header detection, BCM classifier)
  → Stage 3:  Privacy Layer (pseudonymization, sensitivity tagging, worker consent check)
  → Stage 4:  Data Quality Engine (completeness, verification tier, source trust)
  → Stage 5:  UEF (Unified Event Frame — primo record strutturato per azione)
  → Stage 6:  NM (Normalized Magnitude — scaling intensità per evento)
  → Stage 7:  BC (Base Contribution Matrix — peso pillar per tipo evento)
  → Stage 8:  Correction Factors (CQ, EV, CF)
  → Stage 9:  AGF (Anti-Gaming Factor — mandatory, range 0.00–1.00, indipendente)
  → Stage 10: IU Engine (Impact Unit per evento per pillar)
  → Stage 11: PIB (Personal Impact Balance — somma IU pillar per worker — INTERMEDIO OBBLIGATORIO)
  → Stage 12: Company Aggregation (rollup PIB worker → livello azienda)
  → Stage 13: Activation Safeguard (CLEAR / WARNING / FLAGGED — non bypassabile)
  → Stage 14: KORA Index Engine + Confidence Score (coppia inseparabile)
```

**Formula IU canonica** (letta da `lib/methodology-config/v0.1.ts` — mai hardcodata):
```
IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
```

### Confine di privacy architetturale

```
Worker data (UEF, IU, PIB)
    ↓ [aggregazione — identità sciolta]
Company aggregate (KORA Index, Activation Rate, Pillar distribution)
    ↑ CONFINE INVALICABILE — employer roles non vedono nulla sopra questa linea
```

Il confine non è una regola UI. È un'architettura. In produzione: grant-absence PostgreSQL + RLS. In Foundation Light: `RolePermissionService` + `PrivacyVisibilityService`.

---

## 4. Routing Map

### Stato per area

| Area | Route prefix | Stato | Note |
|---|---|---|---|
| **Admin** | `/admin/*` | Production-like | Auth Supabase reale, KORA_ADMIN only |
| **Company live** | `/company/*` | Live (autenticato) | COMPANY_ADMIN / COMPANY_VIEWER — vedi §9 |
| **Demo company** | `/demo/company/*` | Demo sintetico | Meridiana data, scenario switcher, nessun auth live |
| **Worker** | `/worker/*` | Foundation real | Auth worker reale — PIB privato, Dynamic CV |
| **My KORA** | `/my-kora/*` | Foundation real | Worker self-view — mai visibile a employer |
| **Partner** | `/partner/*` | Foundation skeleton | Frozen — non priorità P0 |
| **Demo area** | `/demo/*` | Demo sintetico | DEMO_VIEWER confinato qui — nessun `/api` |
| **Future Vision** | `/demo/future-vision` | Mockup inattivo | Dichiarato esplicitamente inattivo |
| **Public** | `/`, `/pilot`, `/demo-guide` | Pubblico | Nessun auth richiesto |
| **Auth** | `/login`, `/auth/*` | Live | Supabase Auth PKCE flow |

### Route company — dettaglio

**Core live company intelligence:**

| Route | Stato | Descrizione |
|---|---|---|
| `/company/workspace` | Live | Workspace autenticato — punto di ingresso operativo |
| `/company/status` | Live | Status pipeline, onboarding, prossimi passi |
| `/company/kora-index` | Live | KORA Index™ 10 componenti, Confidence Score, Activation Safeguard |
| `/company/activation` | Live | Activation Intelligence™ — Debt, distribuzione pillar, segmenti |
| `/company/pillars` | Live | Pillar Analysis — portfolio programmi sui 5 pillar |
| `/company/financial` | Live | Budget-to-Human-Impact™ — BTI Engine, correlazioni KPI |
| `/company/reports` | Live | Decision Pack — report board-ready, period comparison |

**Data / intake company routes:**

| Route | Stato | Descrizione |
|---|---|---|
| `/company/data` | Dual-path guarded | Live: operator boundary; demo: dati sintetici Meridiana |
| `/company/ingestion` | Dual-path guarded | Live: operator boundary; demo: ingestion simulation |
| `/company/uef-review` | Demo-only | Pure demo sintetico — non ha live counterpart |
| `/company/scoring` | Boundary notice | Scoring solo via KORA Admin — pagina avviso |

**Secondary live-shell / locked routes post-B133:**

| Route | Stato | Descrizione |
|---|---|---|
| `/company/opportunities` | Locked shell | Modulo non ancora attivo — prerequisiti elencati |
| `/company/shared` | Locked shell | Spazio condiviso non ancora attivo |
| `/company/contribution` | Locked shell | KORA Contribution™ non disponibile — nota metodologica presente |
| `/company/profile` | Live shell | Mostra dati tenant reali da sessione — nessun dato demo |
| `/company/onboarding` | Locked shell | Gestito da KORA Admin — nessun scenario demo |

---

## 5. Auth & Role Model

### Ruoli canonici

| Ruolo | Dove vive | Accesso | Note |
|---|---|---|---|
| `KORA_ADMIN` | `app_metadata.kora_role` | `/admin/*`, overview cross-tenant | Operatore piattaforma — provisiona tutti gli altri |
| `COMPANY_ADMIN` | `app_metadata.kora_role` | `/company/*`, `/worker/*` (read-limited) | Accesso company live — mai a dati worker individuali |
| `WORKER` | `app_metadata.kora_role` | `/worker/*`, `/my-kora/*` | Spazio privato worker — mai visibile a employer |
| `PARTNER` | `app_metadata.kora_role` | `/partner/*` | Foundation skeleton — frozen |
| `DEMO_VIEWER` | `app_metadata.kora_role` | `/demo/*` only | Nessun accesso a `/api/*` — solo demo sintetico |
| `COMPANY_VIEWER` | `app_metadata.kora_role` | Subset `/company/*` (read-only) | **Legacy / deprecated** — non usare in nuovi provisioning |

### Regole auth non modificabili

- **No self-signup.** Nessun utente si registra autonomamente. Ogni account è provisionato da KORA_ADMIN tramite invite Supabase.
- **`app_metadata` è il modello canonico.** `kora_role`, `tenant_id`, `worker_id`, `partner_id` vivono in `app_metadata` (server-controlled). Non in `user_metadata` (user-writable).
- **`role_hint` in URL non concede autorizzazione.** È solo un hint UI per il login — non altera i permessi derivati da `app_metadata`.
- **`COMPANY_VIEWER` non va creato** in nuovi provisioning. È legacy. Rimane supportato per sessioni esistenti.

**Riferimento:** `docs/ACCESS_PROVISIONING_DOCTRINE.md` — dottrina completa di provisioning.

### Area Advisor

L'area `/advisor` (e `/demo/advisor`) è una **vetrina demo**, non un ruolo operativo implementato. Non esiste un ruolo `ADVISOR` nel modello auth canonico. La validazione metodologica avviene tramite documento e processo — non tramite un portale advisor operativo. Non è priorità per il primo pilot.

---

## 6. Tenant Model

### `tenant_kind` — classificazione canonica

| Valore | Significato | Chi è |
|---|---|---|
| `LIVE` | Tenant live reale | COMPANY_ADMIN onboardati tramite KORA Admin |
| `DEMO` | Demo sintetico | OP-001 (Meridiana Group — dati sintetici) |
| `TEST` | Test automatizzati | Ambienti CI/QA — non appaiono come live customer |
| `SANDBOX` | Sperimentazione isolata | Dev/staging isolati |

### Regole operative

- **Il default per nuovi tenant provisionati da KORA_ADMIN è `LIVE`.**
- **`OP-001` è il tenant demo.** Corrisponde a Meridiana Group S.r.l. nei dati sintetici. Non è un cliente reale. Non deve mai apparire in viste live company.
- **Tenant `TEST` e `SANDBOX` non devono essere filtrabili come LIVE customers** in nessuna vista admin o company.
- **La classificazione `tenant_kind` è nella tabella `analytics.tenant`** (schema SQL definito ma non ancora migrato su DB produzione — Gate 2 aperto).

---

## 7. Demo / Live Boundary

### Separazione canonica post-B130–B133

| Percorso | Dati | Utenti | API |
|---|---|---|---|
| `/company/*` | Live Supabase | COMPANY_ADMIN, COMPANY_VIEWER | `/api/company/*` — auth live |
| `/demo/company/*` | Sintetici Meridiana | KORA_ADMIN (demo review), DEMO_VIEWER | Nessuna API live |
| `/demo/*` | Sintetici | DEMO_VIEWER confinato | Nessun `/api/*` |

### Invarianti garantite e testate

- Nessuna pagina `/company/*` critica contiene più `getCurrentDemoUser`, `meridiana-group`, `Meridiana`, `OP-001`, `demoCompany`, `synthetic_demo_data: true`, `mode="DEMO"` (B133).
- `DEMO_VIEWER` non ha accesso a nessuna route `/api/*`.
- Il banner `SYNTHETIC DEMO` in `app/company/layout.tsx` è visibile **solo quando `!isLive`** — mai a sessioni live reali.
- Pagine dual-path (`/company/data`, `/company/ingestion`) hanno guard `if (isLive)` che restituisce una shell operatore prima di qualsiasi rendering di dati demo.

### Test anti-regressione attivi

| File test | Cosa protegge |
|---|---|
| `b133-company-live-residual-cleanup.test.ts` | 6 pagine critiche B133 pulite — 77 test |
| `b130-live-demo-separation.test.ts` | Separazione `/company/*` vs `/demo/company/*` |
| `b131-tenant-classification.test.ts` | `tenant_kind` model |
| `b106-company-area-live-boundary.test.ts` | Boundary pages dual-path/live/demo |
| `b80b-boundary-clarity.test.ts` | LIVE/DEMO/PREVIEW/FUTURE_VISION badge |

**Questi test non vanno eliminati anche se sembrano "test sul testo".** Proteggono boundary dottrinali che si rompono silenziosamente.

---

## 8. Admin Area

### Struttura

| Gruppo sidebar | Tipo | Note |
|---|---|---|
| **Live Operations** | Production-like | Supabase reale — tenant, provisioning, pipeline, submission queue |
| **Demo · Sintetico** | Demo | Tutti i flussi sintetici — chiaramente etichettati `SYNTHETIC` |
| **Founder Tools** | Internal | Validation Cockpit — solo KORA_ADMIN |
| **Future Vision** | Mockup inattivo | Un solo link — dichiarato `inactive` |

### Regole admin

- KORA_ADMIN è l'unico ruolo che può creare tenant, invitare utenti, avviare scoring run, revisionare UEF, gestire evidence archive.
- Il provisioning avviene tramite invite Supabase — nessun self-signup path esiste.
- Le route admin live (`/admin/uef-review`, `/admin/data-intake`, ecc.) hanno `BoundaryBadge mode="LIVE"`.
- La demo guidance (`/admin/demo/acme-001`) ha `BoundaryBadge mode="DEMO"`.

---

## 9. Company Area

### Core live company intelligence

Le seguenti route sono live-only. Consumano dati da sessione Supabase reale. Non hanno fallback demo. Non mostrano dati Meridiana.

- `/company/workspace` — punto ingresso operativo live
- `/company/status` — stato pipeline, submissions, onboarding
- `/company/kora-index` — KORA Index™ con 10 componenti, Confidence Score, Activation Safeguard, `calibration_status`, `methodology_version_id`
- `/company/activation` — Activation Intelligence™
- `/company/pillars` — Pillar Analysis
- `/company/financial` — Budget-to-Human-Impact™
- `/company/reports` — Decision Pack

### Data / intake company routes

- `/company/data` — dual-path: se `isLive` mostra operator boundary; se `!isLive` mostra dati sintetici Meridiana
- `/company/ingestion` — dual-path: stesso pattern
- `/company/uef-review` — pure demo sintetico (B106 — no live counterpart)
- `/company/scoring` — boundary notice: scoring solo via KORA Admin operator

### Secondary live-shell / locked routes post-B133

Dopo B133 queste pagine sono **locked shells oneste**. Non mostrano dati demo. Dichiarano esplicitamente il proprio stato.

- `/company/opportunities` — "Modulo non ancora attivo"
- `/company/shared` — "Spazio condiviso non ancora attivo"
- `/company/contribution` — "KORA Contribution™ non ancora disponibile" + nota: non è componente KORA Index™
- `/company/profile` — live shell con dati tenant reali da sessione (companyName, tenantId, koraRole)
- `/company/onboarding` — "Gestito da KORA Admin — nessun scenario demo"

### Privacy employer — regola non modificabile

- Nessuna pagina company mostra dati worker individuali (PIB, IU, UEF, nome, pseudonimo).
- I segmenti aggregati per dipartimento/fascia sono mostrati solo se il gruppo ha ≥ 10 lavoratori.
- Gruppi < 10 → `PrivacyBoundaryNotice` obbligatoria — mai silenziosamente vuoto.

---

## 10. Worker Area

### Stato

La worker area è **Foundation real**: logica implementata, auth Supabase reale, PIB privato, Dynamic CV funzionante, privacy boundary attiva.

| Route | Stato | Descrizione |
|---|---|---|
| `/worker/workspace` | Live | Dashboard worker autenticata |
| `/worker/dynamic-cv` | Live | Dynamic Impact CV — view + share/revoca |
| `/worker/privacy` | Live | Privacy & Condivisione — consent toggle preview |
| `/worker/opportunities` | Skeleton | In sviluppo |
| `/my-kora` | Foundation real | Vista personale PIB, pillar, timeline |
| `/my-kora/privacy` | Foundation real | Boundary visibility — cosa vede/non vede il datore |
| `/my-kora/dynamic-cv` | Foundation real | CV con item-level verification |
| `/my-kora/bookings` | Skeleton | In sviluppo |
| `/my-kora/collective` | Skeleton | In sviluppo |

### Cosa manca nel worker space

- Consenso worker esplicito — i toggle sono preview-only, non persistono
- Offboarding / cancellazione account workflow
- Validazione E2E del flusso worker completo (login → PIB → CV → share → revoca)
- Notifiche (nuova iniziativa, evento approvato, CV condiviso)
- Worker onboarding flow

### Regola privacy worker — non modificabile

**Il PIB (Personal Impact Balance) è worker-privato. Mai visibile a employer roles.** In nessun path, nessun workaround. In produzione: grant-absence + RLS. In Foundation Light: `DynamicCVService` callable solo da worker role.

---

## 11. Partner Area

### Stato

**Foundation skeleton — frozen — non priorità per primo pilot.**

- `/partner/workspace` — funzionante ma minimo
- Nessun marketplace con pricing o disponibilità
- Nessuna prenotazione reale
- Nessun payment path
- Non è priorità per P0 o P1

Il modello partner (verified ecosystem actors che erogano iniziative validate da KORA) è architetturalmente definito nei documenti canonici ma non implementato operativamente in Foundation Light.

---

## 12. Advisor Area

### Stato

**Demo / vetrina — non ruolo operativo — non portale reale.**

- `/demo/advisor` — demo sintetico, nessun auth advisor reale
- Non esiste un ruolo `ADVISOR` nel modello `app_metadata` canonico
- La validazione metodologica avviene tramite documento e processo (Delphi study, università, metodologo esterno) — non tramite un portale advisor operativo
- Non è priorità per P0, P1 o P2

---

## 13. Scoring & Methodology Boundary

### KORA Index v3 — 10 componenti fissi

| Codice | Nome |
|---|---|
| AR | Activation Rate |
| MAR | Meaningful Activation Rate |
| NI | Normalized Intensity |
| WB | Worker Balance |
| PC | Pillar Coverage |
| PB | Pillar Balance |
| EQ | Equity |
| VR | Verification Rate |
| CO | Continuity |
| CS | Confidence Score |

**Nessun undicesimo componente può essere aggiunto** senza decisione metodologica formale.

**`EQ` = Equity** (distribuzione equa tra segmenti workforce). Non è Evidence Quality, non è Event Quality. Quelle dimensioni sono coperte da VR, CS, EV e Trust Ledger.

### Regole display obbligatorie

Ogni superficie che mostra il KORA Index deve sempre includere:
- Valore KORA Index
- Confidence Score (CS) — sempre accanto all'Index, mai omesso
- Activation Safeguard status (CLEAR / WARNING / FLAGGED)
- `methodology_version_id` (es. "KORA Methodology v0.1")
- `calibration_status = pre_empirical_calibration` — non sopprimibile
- Breakdown dei 10 componenti con valori e pesi
- Disclaimer / limitazioni

### Activation Safeguard — gate, non etichetta cosmetica

```
CLEAR   = AR ≥ 0.40 AND MAR ≥ 0.30
WARNING = 0.20 ≤ AR < 0.40 OR 0.15 ≤ MAR < 0.30
FLAGGED = AR < 0.20 OR MAR < 0.15
```

Non è configurabile dall'azienda. Non è bypassabile. Non è un colore decorativo.

### KORA Contribution

KORA Contribution™ è un **indicatore companion** — misura il contributo collettivo ed ecosistemico. **Non è una componente del KORA Index™.** Va sempre visualizzato separatamente, mai aggregato nel valore KORA Index.

### Budget-to-Human-Impact (BTI)

Il BTI Engine correla allocazione budget → attivazione umana. Non è una componente del KORA Index. Non implica causalità. Ogni output di correlazione deve includere "correlazione ≠ causalità" esplicitamente.

### Calibration status

**Tutti gli output Foundation Light sono `pre_empirical_calibration`.** La calibrazione empirica avviene post-pilot tramite Delphi Study, collaborazione universitaria, e validazione metodologica esterna. Nessun claim di certificazione, compliance o precisione statistica è possibile in questa fase.

### AI nel loop

- Nessuna chiamata a LLM esterno su dati HR o worker — decisione founder confermata
- Il classificatore AI (BCM taxonomy) è rule-based
- L'AI suggerisce mapping colonne → pillar + tipo evento con confidence score
- La review umana è obbligatoria — nessuna approvazione automatica
- Solo i record approvati da un operatore umano entrano nello scoring

---

## 14. Data Pipeline

### Pseudonymization boundary

I worker sono identificati con `pseudonym_id` (non `worker_id`) in tutti i dati company-facing. L'identità reale del worker è disponibile solo nel personal schema — mai nel company aggregation layer.

**Il `PSEUDONYMIZATION BOUNDARY` è documentato nella migration SQL** (`supabase/migrations/001_live_v1_foundation.sql`) ma la migration non è ancora applicata a nessun database reale.

### Source trust e verification tier

Ogni evento UEF porta:
- `source_type`: HR system, welfare provider, LMS, ESG, manual
- `verification_tier`: verified / partially_verified / declared
- `evidence_level`: impatta il fattore EV nella formula IU

### Safe aggregation threshold

`SAFE_THRESHOLD = 10` — nessun segmento employer-facing mostra dati per gruppi < 10 lavoratori. Sotto soglia → `PrivacyBoundaryNotice` obbligatoria.

---

## 15. Test Strategy

### Cosa sono i test attuali

93 file di test, 3840 test — tutti **structural e anti-regression**. Verificano:

- Che i file sorgente contengano o non contengano specifici token (boundary enforcement)
- Che le dottrine architetturali siano rispettate nel codice
- Che i confini demo/live siano mantenuti
- Che i servizi abbiano le interfacce corrette
- Che i pesi metodologici vengano letti dalla config e non siano hardcoded

### Cosa NON sono

- Non sono test runtime E2E
- Non testano rendering React
- Non testano flussi autenticazione reali
- Non testano integrazione Supabase in staging
- Non sostituiscono smoke test manuali su Vercel

### Come interpretarli

**Non eliminare test che sembrano "test sul testo".** Molti verificano invarianti dottrinali (es. "questa pagina non contiene `getCurrentDemoUser`") che si romperebbero silenziosamente senza alert. Sono guardie architetturali, non test di funzionalità.

**Non interpretare il passaggio dei test come coverage funzionale completa.** I test passano anche se una feature è broken — verificano struttura, non comportamento runtime.

### Priorità test future (P2)

- Test di integrazione runtime con Supabase staging
- E2E con Playwright: flusso login → company workspace → KORA Index
- E2E worker: login → PIB → Dynamic CV → share → revoca
- Test boundary privacy con utenti reali in sessioni parallele

---

## 16. Known Gaps

Lacune note e documentate — oneste, non nascoste.

**Metodologia:**
- Nessuna validazione empirica della metodologia — calibrazione pre-Delphi
- Nessuna validazione esterna da metodologo, università o advisor indipendente
- I pesi KORA Index v3 sono v0.1 pre-empirical — provvisori

**Dati e integrazione:**
- Nessuna integrazione HRIS, LMS o welfare provider reale
- Nessun dato worker reale o company reale
- Nessun normative mapping nella Decision Pack (es. mapping su GRI, ESRS, SDGs)
- Nessun export PDF nativo — solo print CSS

**Worker:**
- Nessun consenso worker esplicito implementato — i toggle sono preview-only
- Nessun worker offboarding / cancellazione account runbook completamente implementato
- Nessuna validazione E2E del flusso worker completo

**Privacy e compliance:**
- Il PII guard deve essere reso esplicito prima di un pilot reale
- DPA (Data Processing Agreement) non finalizzato
- Nessun audit log completo
- Il `PSEUDONYMIZATION BOUNDARY` è documentato ma non applicato su DB reale

**Test:**
- Nessuna suite di test di integrazione runtime
- I test strutturali non sono sufficenti da soli
- Nessun test di load o performance

**Commerciale:**
- Partner e Advisor non sono production-ready
- Commercial layer non pronto
- Pricing, contratti e DPA non finalizzati
- Nessun criterio formale di successo pilot definito

---

## 17. Frozen Areas / Do Not Touch

Le seguenti aree **non devono essere modificate senza approvazione esplicita del founder**. Non sono opinioni di design. Sono invarianti architetturali o dottrinali.

| Area | Perché è frozen |
|---|---|
| **Demo / live boundary** | Garantisce che utenti live non vedano mai dati Meridiana / sintetici |
| **`tenant_kind` model** | Classificazione LIVE/DEMO/TEST/SANDBOX — confonde tutto se alterata |
| **`app_metadata` auth model** | `kora_role`, `tenant_id`, `worker_id` in `app_metadata` — non in `user_metadata` |
| **No self-signup doctrine** | Provisioning controllato — violazione apre exploit di accesso |
| **Worker privacy boundary** | PIB mai visibile a employer — violazione distrugge la trust commerciale |
| **Worker PIB privato** | Intermedio mandatorio mai employer-facing — in nessun path |
| **Confidence Score fuori da KORA Index** | CS è indicatore di affidabilità esterno — non componente dell'indice |
| **Activation Safeguard come gate** | CLEAR/WARNING/FLAGGED sono gate operativi — non etichette cosmetiche |
| **Eligibility Gate** | Controlla l'accesso al scoring — non bypassabile |
| **Blocked compliance-as-impact** | KORA non misura conformità normativa come impatto — distorce la metodologia |
| **Company locked shells B133** | 6 pagine critiche pulite da demo data — non reintrodurre fallback sintetici |
| **Test anti-regressione B129–B133** | Proteggono i boundary dottrinali — non eliminare |
| **No LLM esterno su dati HR/worker** | Decisione founder — BCM taxonomy classifier rule-based only |

---

## 18. Recommended Roadmap

### P0 — Prima di handoff esterno / review tecnica

- Mantenere questo documento aggiornato ad ogni blocco significativo
- Vercel smoke test: verificare che tutte le route critiche rispondano correttamente
- Verifica igiene DB tenant: confermare che tenant demo (OP-001) non appaia in viste live
- Demo script / guided path: percorso navigabile per reviewer esterno (S1 → S2, company → worker)
- Non espandere feature — consolidare e documentare

### P1 — Prima di professor / advisor / prospect

- Methodology snapshot: documento frozen della metodologia v0.1 con tutti i pesi e le formule
- Normative mapping light: indicazione non-vincolante di quali standard ESG/CSR la piattaforma supporta nella rendicontazione (senza claim di compliance)
- Future Vision smoke: verificare che le mockup future vision siano chiaramente inattive e non confondibili
- PII guard design: identificare esplicitamente dove vivono i dati PII e come sono protetti
- Worker trust explanation: documento o UI che spiega al lavoratore cosa vede e non vede il datore di lavoro

### P2 — Prima di pilot reale

- Dry-run live tenant end-to-end: onboarding reale di un tenant LIVE, caricamento dati, scoring, output
- Worker consent / offboarding: implementazione consenso esplicito e cancellazione account
- Supabase staging / runtime integration tests: test di integrazione con DB reale
- PDF / export verification: verificare che il Decision Pack sia effettivamente esportabile
- DPA / privacy pack: Data Processing Agreement e privacy documentation per il pilot

### P3 — Prima di cliente pagante

- Validazione esterna: Delphi Study, università, metodologo indipendente
- Audit logs: sistema di audit completo e tracciabile
- Rate limiting e hardening: protezione API da abuso
- 2FA / admin hardening: autenticazione a due fattori per KORA_ADMIN
- Pricing / contratti: finalizzazione commercial layer
- Pilot success criteria: definizione formale di cosa costituisce un pilot riuscito

---

## 19. Reviewer Checklist

Lista pratica per qualsiasi reviewer tecnico o collaboratore che entra nel progetto.

**Comprensione prodotto:**
- [ ] Letto `docs/next-handoff-brief.md` per introduzione prodotto e narrativa
- [ ] Letto `CLAUDE.md` per regole operative complete del progetto
- [ ] Capisce che KORA misura organizzazioni, non individui
- [ ] Capisce che il PIB è un intermedio privato — mai employer-facing
- [ ] Capisce che Confidence Score è separato dal KORA Index — non ne è componente

**Architettura:**
- [ ] Sa dove vivono i ruoli (`app_metadata`) e perché non in `user_metadata`
- [ ] Sa cosa è `tenant_kind` e perché OP-001 è demo
- [ ] Sa che `/company/*` è live-only e `/demo/company/*` è synthetic-only
- [ ] Sa che le 6 pagine locked shell post-B133 non hanno più dati demo
- [ ] Sa che `COMPANY_VIEWER` è legacy e non va creato in nuovi provisioning

**Test:**
- [ ] Sa che i test strutturali proteggono boundary dottrinali
- [ ] Sa che non costituiscono coverage funzionale E2E
- [ ] Non ha eliminato test "solo perché sembrano test sul testo"

**Frozen areas:**
- [ ] Ha letto §17 — Frozen Areas
- [ ] Non ha modificato demo/live boundary senza approvazione
- [ ] Non ha aggiunto un undicesimo componente al KORA Index
- [ ] Non ha spostato CS dentro il valore KORA Index
- [ ] Non ha reso Activation Safeguard bypassabile

**Cosa non fare:**
- [ ] Non chiamare la piattaforma "production-ready"
- [ ] Non chiamarla "client-ready"
- [ ] Non affermare che la metodologia è "validata" o "certificata"
- [ ] Non introdurre LLM API calls su dati HR o worker
- [ ] Non creare SQL DDL / Prisma schema senza Gate 2 closed

---

## 20. Appendix — Recent Blocks B130–B133

### B130 — Company Live / Demo Extraction

**Commit:** da verificare su `git log` · **Data:** 2026-06

Separazione completa tra `/company/*` (live) e `/demo/company/*` (synthetic). Le pagine intelligence company (kora-index, activation, pillars, financial, reports) sono diventate live-only — nessun `isLive` ternary, solo `forceEnvironment: 'live'`. La demo experience è stata spostata integralmente su `/demo/company/*` con Meridiana data e scenario switcher.

**Impact:** nessuna pagina company intelligence mostra più dati sintetici a utenti live reali.

### B131 — Tenant Classification LIVE / DEMO / TEST / SANDBOX

**Commit:** da verificare · **Data:** 2026-06

Introduzione del modello `tenant_kind` nella tabella `analytics.tenant`. Classificazione formale che distingue tenant live reali da demo (OP-001 / Meridiana), test e sandbox. Le viste admin filtrano i tenant demo dalle metriche live. I tenant TEST non appaiono come live customers in nessuna vista operativa.

**Impact:** il modello di classificazione tenant è canonico e non modificabile senza approvazione.

### B132-A — Demo Area Coherence

**Commit:** incluso in PR #3 (hash `113e17c`) · **Data:** 2026-06

Pulizia e coerenza dell'area `/demo/*`. Tutte le route demo sono chiaramente etichettate sintetiche. Nessun link da `/demo/*` a route live `/company/*`. Il banner `SYNTHETIC DEMO` appare solo quando `!isLive`.

### B132-B — Future Vision Locked Modules

**Commit:** `5854ab9` — PR #2+#3 · **Data:** 2026-06

Aggiunta di 7 moduli futuri nella pagina `/demo/future-vision` con copy corretto:
- AI Transition Readiness (mai AI replacement score)
- KORA Care (caregiver/genitorialità — mai dato clinico)
- Workforce Resilience (segnali aggregati)
- Just Transition (coerente ESG — senza claim conformità)
- Supply Chain Activation (nessun ranking punitivo fornitori)
- Mental Capital (alta sensibilità — mai psicometria individuale)
- KORA Legacy Module (vista pillar LEGACY — non index autonomo)

Disclaimer obbligatorio: "non attivi / non contrattualizzabili / validazione empirica / legal/privacy review". `data-testid="future-modules"` aggiunto.

### B133 — Company Live Residual Demo Extraction

**Commit:** `9ecb1f0` — PR #4 (merge `58a9f0c`) · **Data:** 2026-06-13

6 pagine company critiche riscritte per rimuovere ogni riferimento demo/Meridiana/sintetico:

| Pagina | Da | A |
|---|---|---|
| `app/company/page.tsx` | Demo cockpit con WorkerAdoptionPanel, getCurrentDemoUser | Live nav hub con useCompanySession |
| `app/company/opportunities/page.tsx` | Demo data + synthetic_demo_data | Locked shell: "Modulo non ancora attivo" |
| `app/company/shared/page.tsx` | Demo data + synthetic_demo_data | Locked shell: "Spazio condiviso non ancora attivo" |
| `app/company/contribution/page.tsx` | Demo content | Locked shell + nota metodologica KORA Contribution |
| `app/company/profile/page.tsx` | Tile sintetici (my_kora_enabled_count) | Live shell con companyName/tenantId/koraRole da sessione |
| `app/company/onboarding/page.tsx` | Scenario demo content | Locked shell: "Gestito da KORA Admin" |

Test anti-regressione aggiunto: `tests/unit/b133-company-live-residual-cleanup.test.ts` (77 test).
Test obsoleti aggiornati: b80b, b83b, b106.

**Impact:** nessuna pagina live company critica mostra più dati demo, Meridiana o fallback sintetici a utenti live reali.

---

**Document version:** v1.0
**Maintainer:** aggiornare dopo ogni blocco significativo
**Next update:** dopo Vercel smoke test, DB tenant hygiene e demo script (P0)
